import type { FastifyBaseLogger } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { Message, MessageType } from '@penthouse/contracts';
import { SendMessageResponseSchema } from '@penthouse/contracts';
import { pool } from '../db/pool.js';
import { sendPushForNewMessage } from '../push/fcm.js';
import { buildReplySnapshot } from './messageHydration.js';
import { toMemberMessage } from './messages.js';
import type { Queryable } from './users.js';

type MessageEmitter = {
  to: (room: string) => {
    emit: (event: string, data: unknown) => void;
  };
};

type SendChatMessageOptions = {
  io: MessageEmitter;
  log: Pick<FastifyBaseLogger, 'error' | 'info' | 'warn'>;
  chatId: string;
  senderUserId: string;
  content: string;
  clientMessageId: string;
  messageType?: MessageType;
  metadata?: Message['metadata'];
  replyToMessageId?: string;
  beforeBroadcast?: () => void;
};

export const REPLY_TARGET_NOT_FOUND_ERROR = 'Reply target not found';

type PersistedMessageRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_username: string;
  sender_display_name: string;
  avatar_storage_key: string | null;
  sender_status: 'active' | 'removed' | 'banned';
  content: string;
  message_type: MessageType | null;
  metadata: Message['metadata'];
  reply_to_snapshot: Message['replyTo'];
  created_at: string;
  client_message_id: string;
  seen_at: null;
};

async function loadPersistedMessage(
  db: Queryable,
  chatId: string,
  senderUserId: string,
  clientMessageId: string
): Promise<PersistedMessageRow | null> {
  const result = await db.query(
    `SELECT m.id,
            m.chat_id,
            m.sender_id,
            u.username AS sender_username,
            u.display_name AS sender_display_name,
            media.storage_key AS avatar_storage_key,
            u.status AS sender_status,
            m.content,
            m.message_type,
            m.metadata,
            m.reply_to_snapshot,
            m.created_at,
            m.client_message_id,
            NULL::timestamptz AS seen_at
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN media_uploads media ON media.id = u.avatar_media_id
      WHERE m.chat_id = $1
        AND m.sender_id = $2
        AND m.client_message_id = $3`,
    [chatId, senderUserId, clientMessageId]
  );

  return (result.rows[0] as PersistedMessageRow | undefined) ?? null;
}

export async function loadPersistedMessageById(
  db: Queryable,
  messageId: string
): Promise<PersistedMessageRow | null> {
  const result = await db.query(
    `SELECT m.id,
            m.chat_id,
            m.sender_id,
            u.username AS sender_username,
            u.display_name AS sender_display_name,
            media.storage_key AS avatar_storage_key,
            u.status AS sender_status,
            m.content,
            m.message_type,
            m.metadata,
            m.reply_to_snapshot,
            m.created_at,
            m.client_message_id,
            NULL::timestamptz AS seen_at
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN media_uploads media ON media.id = u.avatar_media_id
      WHERE m.id = $1`,
    [messageId]
  );

  return (result.rows[0] as PersistedMessageRow | undefined) ?? null;
}

export async function sendChatMessage(options: SendChatMessageOptions) {
  const client = await pool.connect();

  let deduped = false;
  let persistedMessage: PersistedMessageRow | null = null;

  try {
    await client.query('BEGIN');

    persistedMessage = await loadPersistedMessage(
      client,
      options.chatId,
      options.senderUserId,
      options.clientMessageId
    );
    deduped = Boolean(persistedMessage);

    if (!persistedMessage) {
      let replyToMessageId: string | null = null;
      let replyToSnapshot: Message['replyTo'] = null;

      if (options.replyToMessageId) {
        const replyTarget = await buildReplySnapshot(client, options.chatId, options.replyToMessageId);
        if (!replyTarget) {
          throw new Error(REPLY_TARGET_NOT_FOUND_ERROR);
        }
        replyToMessageId = replyTarget.replyToMessageId;
        replyToSnapshot = replyTarget.replyToSnapshot;
      }

      const inserted = await client.query(
        `INSERT INTO messages(
           id,
           chat_id,
           sender_id,
           content,
           message_type,
           metadata,
           client_message_id,
           reply_to_message_id,
           reply_to_snapshot
         )
         VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (chat_id, sender_id, client_message_id) DO NOTHING
         RETURNING id`,
        [
          randomUUID(),
          options.chatId,
          options.senderUserId,
          options.content,
          options.messageType ?? 'text',
          options.metadata ?? null,
          options.clientMessageId,
          replyToMessageId,
          replyToSnapshot
        ]
      );

      deduped = inserted.rowCount === 0;
      persistedMessage = await loadPersistedMessage(
        client,
        options.chatId,
        options.senderUserId,
        options.clientMessageId
      );

      if (!persistedMessage) {
        options.log.error(
          {
            chatId: options.chatId,
            senderUserId: options.senderUserId,
            clientMessageId: options.clientMessageId
          },
          'message missing after insert/dedup lookup'
        );
        throw new Error('Failed to send message');
      }

      if (!deduped) {
        await client.query('UPDATE chats SET updated_at = NOW() WHERE id = $1', [options.chatId]);
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const message = toMemberMessage(persistedMessage);
  if (!deduped) {
    options.beforeBroadcast?.();

    try {
      options.io.to(`chat:${options.chatId}`).emit('message.new', {
        type: 'message.new',
        payload: message
      });
    } catch (error) {
      options.log.error(
        {
          error,
          chatId: options.chatId,
          senderUserId: options.senderUserId,
          clientMessageId: options.clientMessageId
        },
        'message persisted but realtime broadcast failed'
      );
    }

    void sendPushForNewMessage(options.log, options.chatId, options.senderUserId, message);
  }

  options.io.to(`user:${options.senderUserId}`).emit('message.ack', {
    type: 'message.ack',
    payload: {
      clientMessageId: options.clientMessageId,
      messageId: message.id,
      chatId: options.chatId,
      deliveredAt: new Date().toISOString()
    }
  });

  return SendMessageResponseSchema.parse({
    message,
    deduped
  });
}
