import type { SyncEvent, SyncOperation } from '@penthouse/contracts';

export type SqlParam = string | number | null | Uint8Array;

export interface SyncSqlDatabase {
	run(sql: string, params?: SqlParam[]): unknown;
}

export function applySyncEvents(db: SyncSqlDatabase, events: SyncEvent[]) {
	for (const event of events) {
		applySyncOperation(db, event.op);
	}
}

export function applySyncOperation(db: SyncSqlDatabase, op: SyncOperation) {
	switch (op.type) {
		case 'chat.upsert':
			db.run(
				`INSERT INTO chats (
					id, type, name, updated_at, archived_at, unread_count,
					counterpart_member_id, counterpart_avatar_url, notifications_muted
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					type = excluded.type,
					name = excluded.name,
					updated_at = excluded.updated_at,
					archived_at = excluded.archived_at,
					unread_count = excluded.unread_count,
					counterpart_member_id = excluded.counterpart_member_id,
					counterpart_avatar_url = excluded.counterpart_avatar_url,
					notifications_muted = excluded.notifications_muted`,
				[
					op.payload.id,
					op.payload.type,
					op.payload.name,
					op.payload.updatedAt,
					op.payload.archivedAt ?? null,
					op.payload.unreadCount,
					op.payload.counterpartMemberId ?? null,
					op.payload.counterpartAvatarUrl ?? null,
					op.payload.notificationsMuted ? 1 : 0
				]
			);
			return;

		case 'chat.delete':
			for (const channel of execRows<{ id: string }>(db, 'SELECT id FROM channels WHERE parent_chat_id = ?', [op.payload.chatId])) {
				db.run('DELETE FROM read_states WHERE chat_id = ?', [channel.id]);
				db.run('DELETE FROM pinned_messages WHERE chat_id = ?', [channel.id]);
				db.run('DELETE FROM messages WHERE chat_id = ?', [channel.id]);
			}
			db.run('DELETE FROM folder_items WHERE chat_id = ?', [op.payload.chatId]);
			db.run('DELETE FROM read_states WHERE chat_id = ?', [op.payload.chatId]);
			db.run('DELETE FROM pinned_messages WHERE chat_id = ?', [op.payload.chatId]);
			db.run('DELETE FROM messages WHERE chat_id = ?', [op.payload.chatId]);
			db.run('DELETE FROM channels WHERE parent_chat_id = ?', [op.payload.chatId]);
			db.run('DELETE FROM chats WHERE id = ?', [op.payload.chatId]);
			return;

		case 'channel.upsert':
			db.run(
				`INSERT INTO channels (id, parent_chat_id, name, created_at)
				VALUES (?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					parent_chat_id = excluded.parent_chat_id,
					name = excluded.name,
					created_at = excluded.created_at`,
				[op.payload.id, op.payload.parentChatId, op.payload.name, op.payload.createdAt]
			);
			return;

		case 'channel.delete':
			db.run('DELETE FROM read_states WHERE chat_id = ?', [op.payload.channelId]);
			db.run('DELETE FROM pinned_messages WHERE chat_id = ?', [op.payload.channelId]);
			db.run('DELETE FROM messages WHERE chat_id = ?', [op.payload.channelId]);
			db.run('DELETE FROM channels WHERE id = ?', [op.payload.channelId]);
			return;

		case 'folder.upsert':
			db.run(
				`INSERT INTO folders (id, user_id, name, icon, color, sort_order, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					user_id = excluded.user_id,
					name = excluded.name,
					icon = excluded.icon,
					color = excluded.color,
					sort_order = excluded.sort_order,
					created_at = excluded.created_at,
					updated_at = excluded.updated_at`,
				[
					op.payload.id,
					op.payload.userId,
					op.payload.name,
					op.payload.icon ?? null,
					op.payload.color ?? null,
					op.payload.sortOrder,
					op.payload.createdAt,
					op.payload.updatedAt
				]
			);
			return;

		case 'folder.delete':
			db.run('DELETE FROM folder_items WHERE folder_id = ?', [op.payload.folderId]);
			db.run('DELETE FROM folders WHERE id = ?', [op.payload.folderId]);
			return;

		case 'folder_item.upsert':
			db.run(
				`INSERT INTO folder_items (folder_id, chat_id, sort_order, created_at)
				VALUES (?, ?, ?, ?)
				ON CONFLICT(folder_id, chat_id) DO UPDATE SET
					sort_order = excluded.sort_order,
					created_at = excluded.created_at`,
				[op.payload.folderId, op.payload.chatId, op.payload.sortOrder, op.payload.createdAt]
			);
			return;

		case 'folder_item.delete':
			db.run('DELETE FROM folder_items WHERE folder_id = ? AND chat_id = ?', [
				op.payload.folderId,
				op.payload.chatId
			]);
			return;

		case 'user.upsert':
			db.run(
				`INSERT INTO users (id, username, display_name, avatar_url, bio, timezone, last_seen_at, profile_style, banner_url, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
				ON CONFLICT(id) DO UPDATE SET
					username = excluded.username,
					display_name = excluded.display_name,
					avatar_url = excluded.avatar_url,
					bio = excluded.bio,
					timezone = excluded.timezone,
					last_seen_at = excluded.last_seen_at,
					profile_style = excluded.profile_style,
					banner_url = excluded.banner_url,
					updated_at = excluded.updated_at`,
				[
					op.payload.id,
					op.payload.username,
					op.payload.displayName,
					op.payload.avatarUrl,
					op.payload.bio,
					op.payload.timezone ?? null,
					op.payload.lastSeenAt ?? null,
					op.payload.profileStyle ?? 'editorial',
					op.payload.bannerUrl ?? null
				]
			);
			return;

		case 'message.upsert':
			if (op.payload.clientMessageId) {
				db.run(
					`DELETE FROM messages
					WHERE chat_id = ?
						AND sender_id = ?
						AND client_message_id = ?
						AND id <> ?`,
					[
						op.payload.chatId,
						op.payload.senderId,
						op.payload.clientMessageId,
						op.payload.id
					]
				);
			}
			db.run(
				`INSERT INTO messages (
					id, chat_id, sender_id, sender_username, sender_display_name, sender_avatar_url,
					content, type, metadata, created_at, edited_at, edit_count, deleted_at,
					deleted_by_user_id, client_message_id, seen_at, read_receipts, reactions,
					reply_to, starred, hidden
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					chat_id = excluded.chat_id,
					sender_id = excluded.sender_id,
					sender_username = excluded.sender_username,
					sender_display_name = excluded.sender_display_name,
					sender_avatar_url = excluded.sender_avatar_url,
					content = excluded.content,
					type = excluded.type,
					metadata = excluded.metadata,
					created_at = excluded.created_at,
					edited_at = excluded.edited_at,
					edit_count = excluded.edit_count,
					deleted_at = excluded.deleted_at,
					deleted_by_user_id = excluded.deleted_by_user_id,
					client_message_id = excluded.client_message_id,
					seen_at = excluded.seen_at,
					read_receipts = excluded.read_receipts,
					reactions = excluded.reactions,
					reply_to = excluded.reply_to,
					starred = excluded.starred,
					hidden = excluded.hidden`,
				[
					op.payload.id,
					op.payload.chatId,
					op.payload.senderId,
					op.payload.senderUsername ?? null,
					op.payload.senderDisplayName ?? null,
					op.payload.senderAvatarUrl ?? null,
					op.payload.content,
					op.payload.type,
					json(op.payload.metadata ?? null),
					op.payload.createdAt,
					op.payload.editedAt ?? null,
					op.payload.editCount ?? null,
					op.payload.deletedAt ?? null,
					op.payload.deletedByUserId ?? null,
					op.payload.clientMessageId ?? null,
					op.payload.seenAt ?? null,
					json(op.payload.readReceipts ?? []),
					json(op.payload.reactions ?? []),
					json(op.payload.replyTo ?? null),
					op.payload.starred ? 1 : 0,
					op.payload.hidden ? 1 : 0
				]
			);
			return;

		case 'message.delete':
			db.run(
				`UPDATE messages
				SET deleted_at = ?, deleted_by_user_id = ?
				WHERE id = ? AND chat_id = ?`,
				[
					op.payload.deletedAt,
					op.payload.deletedByUserId,
					op.payload.messageId,
					op.payload.chatId
				]
			);
			return;

		case 'reaction.add':
			updateReaction(db, op.payload.messageId, op.payload.emoji, op.payload.userId, 'add');
			return;

		case 'reaction.remove':
			updateReaction(db, op.payload.messageId, op.payload.emoji, op.payload.userId, 'remove');
			return;

		case 'message.pin':
			db.run(
				`INSERT INTO pinned_messages (
					chat_id, message_id, pinned_by_user_id, pinned_at, content, sender_display_name
				) VALUES (?, ?, ?, ?, ?, ?)
				ON CONFLICT(chat_id, message_id) DO UPDATE SET
					pinned_by_user_id = excluded.pinned_by_user_id,
					pinned_at = excluded.pinned_at,
					content = excluded.content,
					sender_display_name = excluded.sender_display_name`,
				[
					op.payload.chatId,
					op.payload.messageId,
					op.payload.pinnedByUserId,
					op.payload.pinnedAt,
					op.payload.content,
					op.payload.senderDisplayName ?? null
				]
			);
			return;

		case 'message.unpin':
			db.run('DELETE FROM pinned_messages WHERE chat_id = ? AND message_id = ?', [
				op.payload.chatId,
				op.payload.messageId
			]);
			return;

		case 'read.upsert':
			db.run(
				`INSERT INTO read_states (
					chat_id, user_id, last_read_at, last_read_message_id, notifications_muted, archived_at
				) VALUES (?, ?, ?, ?, ?, ?)
				ON CONFLICT(chat_id, user_id) DO UPDATE SET
					last_read_at = excluded.last_read_at,
					last_read_message_id = excluded.last_read_message_id,
					notifications_muted = excluded.notifications_muted,
					archived_at = excluded.archived_at`,
				[
					op.payload.chatId,
					op.payload.userId,
					op.payload.lastReadAt,
					op.payload.lastReadMessageId ?? null,
					op.payload.notificationsMuted ? 1 : 0,
					op.payload.archivedAt ?? null
				]
			);
			return;
	}
}

function updateReaction(
	db: SyncSqlDatabase,
	messageId: string,
	emoji: string,
	userId: string,
	action: 'add' | 'remove'
) {
	const rows = execRows<{ reactions: string | null }>(db, 'SELECT reactions FROM messages WHERE id = ?', [messageId]);
	if (rows.length === 0) return;

	const reactions = parseJson<Array<{ emoji: string; userIds: string[] }>>(rows[0].reactions, []);
	const existing = reactions.find((reaction) => reaction.emoji === emoji);

	if (action === 'add') {
		if (existing) {
			if (!existing.userIds.includes(userId)) existing.userIds.push(userId);
		} else {
			reactions.push({ emoji, userIds: [userId] });
		}
	} else if (existing) {
		existing.userIds = existing.userIds.filter((id) => id !== userId);
	}

	const next = reactions.filter((reaction) => reaction.userIds.length > 0);
	db.run('UPDATE messages SET reactions = ? WHERE id = ?', [json(next), messageId]);
}

function execRows<T extends Record<string, unknown>>(
	db: SyncSqlDatabase,
	sql: string,
	params: SqlParam[]
): T[] {
	const maybeExec = db as SyncSqlDatabase & {
		exec?: (sql: string, params?: SqlParam[]) => Array<{ columns: string[]; values: unknown[][] }>;
	};
	const result = maybeExec.exec?.(sql, params) ?? [];
	const first = result[0];
	if (!first) return [];
	return first.values.map((values) => Object.fromEntries(
		first.columns.map((column, index) => [column, values[index]])
	) as T);
}

function json(value: unknown) {
	return JSON.stringify(value);
}

function parseJson<T>(value: string | null, fallback: T): T {
	if (!value) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}
