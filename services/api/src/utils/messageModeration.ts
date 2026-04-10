import { randomUUID } from 'node:crypto';
import type { AdminMessage, Message, ModerationAction } from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import { loadGroupedReactionsForMessageIds } from './messageHydration.js';
import { toAdminMessage, toMemberMessage } from './messages.js';

export async function loadAdminMessageById(messageId: string): Promise<AdminMessage | null> {
  const result = await pool.query(
    `SELECT m.id, m.chat_id, m.sender_id, u.username AS sender_username, u.display_name AS sender_display_name,
            u.status AS sender_status, media.storage_key AS avatar_storage_key, m.content, m.message_type, m.metadata,
            m.reply_to_snapshot, m.created_at, m.client_message_id, m.hidden_by_moderation, m.moderation_action,
            m.moderation_reason, m.moderation_updated_at, m.moderation_actor_user_id, actor.username AS moderation_actor_username,
            actor.display_name AS moderation_actor_display_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     LEFT JOIN media_uploads media ON media.id = u.avatar_media_id
     LEFT JOIN users actor ON actor.id = m.moderation_actor_user_id
     WHERE m.id = $1`,
    [messageId]
  );

  const row = result.rows[0];
  if (!row) return null;

  const message = toAdminMessage(row as any);
  const reactions = await loadGroupedReactionsForMessageIds(pool, [messageId]);
  return reactions.has(messageId)
    ? {
        ...message,
        reactions: reactions.get(messageId)
      }
    : message;
}

export async function loadMemberMessageById(messageId: string): Promise<Message | null> {
  const result = await pool.query(
    `SELECT m.id, m.chat_id, m.sender_id, u.username AS sender_username, u.display_name AS sender_display_name,
            u.status AS sender_status, media.storage_key AS avatar_storage_key, m.content, m.message_type, m.metadata,
            m.reply_to_snapshot, m.created_at, m.client_message_id, m.hidden_by_moderation,
            seen.seen_at
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     LEFT JOIN media_uploads media ON media.id = u.avatar_media_id
     LEFT JOIN LATERAL (
       SELECT MAX(cm_seen.last_read_at) AS seen_at
       FROM chat_members cm_seen
       JOIN users u_seen ON u_seen.id = cm_seen.user_id
       JOIN messages m_seen ON m_seen.id = cm_seen.last_read_message_id
       WHERE cm_seen.chat_id = m.chat_id
         AND cm_seen.user_id <> m.sender_id
         AND u_seen.status = 'active'
         AND m_seen.created_at >= m.created_at
     ) seen ON TRUE
     WHERE m.id = $1`,
    [messageId]
  );

  return result.rows[0] ? toMemberMessage(result.rows[0] as any) : null;
}

export async function setMessageModerationState(
  messageId: string,
  actorUserId: string,
  action: ModerationAction,
  reason: string,
  options: {
    clearContent?: boolean;
    allowNoopHide?: boolean;
  } = {}
): Promise<
  | { chatId: string; senderId: string; changed: boolean }
  | { error: 'Message not found' | 'Message is already hidden' | 'Message is already visible' }
> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id, chat_id, sender_id, hidden_by_moderation
       FROM messages
       WHERE id = $1
       FOR UPDATE`,
      [messageId]
    );

    const row = existing.rows[0] as
      | { id: string; chat_id: string; sender_id: string; hidden_by_moderation: boolean }
      | undefined;
    if (!row) {
      await client.query('ROLLBACK');
      return { error: 'Message not found' };
    }

    const alreadyHidden = Boolean(row.hidden_by_moderation);
    if (action === 'hide' && alreadyHidden && !options.allowNoopHide) {
      await client.query('ROLLBACK');
      return { error: 'Message is already hidden' };
    }

    if (action === 'unhide' && !alreadyHidden) {
      await client.query('ROLLBACK');
      return { error: 'Message is already visible' };
    }

    const changed = action === 'hide' ? !alreadyHidden : alreadyHidden;
    if (changed) {
      await client.query(
        `UPDATE messages
         SET hidden_by_moderation = $1,
             moderation_action = $2,
             moderation_reason = $3,
             moderation_actor_user_id = $4,
             moderation_updated_at = NOW(),
             content = CASE
               WHEN $2 = 'hide' AND $6 THEN ''
               ELSE content
             END
         WHERE id = $5`,
        [action === 'hide', action, reason, actorUserId, messageId, Boolean(options.clearContent)]
      );

      await client.query(
        `INSERT INTO message_moderation_events(id, message_id, action, actor_user_id, reason)
         VALUES($1, $2, $3, $4, $5)`,
        [randomUUID(), messageId, action, actorUserId, reason]
      );
    }

    await client.query('COMMIT');
    return {
      chatId: row.chat_id,
      senderId: row.sender_id,
      changed
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
