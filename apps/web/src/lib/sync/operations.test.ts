import { describe, expect, it, beforeEach } from 'vitest';
import path from 'node:path';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import schemaSql from './schema.sql?raw';
import { applySyncEvents, type SqlParam } from './operations';
import { enqueueTextMessage, listDueOutboxItems, removeOutboxItem } from './outbox';
import { searchLocalMessages } from './search';
import type { SyncEvent } from '@penthouse/contracts';

let SQL: SqlJsStatic;
let db: Database;

const CHAT_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const MESSAGE_ID = '550e8400-e29b-41d4-a716-446655440002';

beforeEach(async () => {
	SQL ??= await initSqlJs({
		locateFile: (file: string) => path.resolve(process.cwd(), '../../node_modules/sql.js/dist', file)
	});
	db = new SQL.Database();
	db.run(schemaSql);
});

describe('local sync operation appliers', () => {
	it('applies upserts, tombstones, reactions, pins, and local search', async () => {
		applySyncEvents(db, [
			event({
				type: 'chat.upsert',
				payload: {
					id: CHAT_ID,
					type: 'group',
					name: 'General',
					updatedAt: '2026-05-12T00:00:00.000Z',
					archivedAt: null,
					unreadCount: 0,
					notificationsMuted: false
				}
			}),
			event({
				type: 'user.upsert',
				payload: {
					id: USER_ID,
					username: 'bruce',
					displayName: 'Bruce',
					avatarUrl: null,
					bio: null,
					timezone: null,
					lastSeenAt: null,
					profileStyle: 'editorial',
					bannerUrl: null
				}
			}),
			event({
				type: 'message.upsert',
				payload: {
					id: MESSAGE_ID,
					chatId: CHAT_ID,
					senderId: USER_ID,
					senderUsername: 'bruce',
					senderDisplayName: 'Bruce',
					senderAvatarUrl: null,
					content: 'Local search finds this message',
					type: 'text',
					metadata: null,
					createdAt: '2026-05-12T00:00:01.000Z',
					reactions: []
				}
			})
		]);

		const client = { query: async <T extends Record<string, unknown>>(sql: string, params?: SqlParam[]) => rows<T>(sql, params) };
		const results = await searchLocalMessages(client, CHAT_ID, 'search');
		expect(results).toHaveLength(1);
		expect(results[0].id).toBe(MESSAGE_ID);

		applySyncEvents(db, [
			event({
				type: 'reaction.add',
				payload: {
					chatId: CHAT_ID,
					messageId: MESSAGE_ID,
					userId: USER_ID,
					emoji: '+1',
					createdAt: '2026-05-12T00:00:02.000Z'
				}
			}),
			event({
				type: 'message.pin',
				payload: {
					chatId: CHAT_ID,
					messageId: MESSAGE_ID,
					pinnedByUserId: USER_ID,
					pinnedAt: '2026-05-12T00:00:03.000Z',
					content: 'Local search finds this message',
					senderDisplayName: 'Bruce'
				}
			}),
			event({
				type: 'message.delete',
				payload: {
					chatId: CHAT_ID,
					messageId: MESSAGE_ID,
					deletedAt: '2026-05-12T00:00:04.000Z',
					deletedByUserId: USER_ID
				}
			})
		]);

		const messageRows = rows<{ content: string; deleted_at: string | null; reactions: string }>(
			'SELECT content, deleted_at, reactions FROM messages WHERE id = ?',
			[MESSAGE_ID]
		);
		expect(messageRows[0].deleted_at).toBe('2026-05-12T00:00:04.000Z');
		expect(JSON.parse(messageRows[0].reactions)).toEqual([{ emoji: '+1', userIds: [USER_ID] }]);

		const pinRows = rows<{ message_id: string }>('SELECT message_id FROM pinned_messages');
		expect(pinRows[0].message_id).toBe(MESSAGE_ID);

		await expect(searchLocalMessages(client, CHAT_ID, 'search')).resolves.toHaveLength(0);
	});

	it('queues, lists, and removes text-message outbox items', () => {
		enqueueTextMessage(db, {
			chatId: CHAT_ID,
			content: 'Queued offline.',
			clientMessageId: 'client-offline-1'
		});

		const items = listDueOutboxItems(db);
		expect(items).toHaveLength(1);
		expect(items[0].payload.content).toBe('Queued offline.');

		removeOutboxItem(db, items[0].id);
		expect(listDueOutboxItems(db)).toHaveLength(0);
	});

	it('applies chat and channel delete tombstones', () => {
		const channelId = '550e8400-e29b-41d4-a716-446655440004';
		applySyncEvents(db, [
			event({
				type: 'chat.upsert',
				payload: {
					id: CHAT_ID,
					type: 'group',
					name: 'General',
					updatedAt: '2026-05-12T00:00:00.000Z',
					archivedAt: null,
					unreadCount: 0,
					notificationsMuted: false
				}
			}),
			event({
				type: 'channel.upsert',
				payload: {
					id: channelId,
					parentChatId: CHAT_ID,
					name: 'briefing',
					createdAt: '2026-05-12T00:00:01.000Z'
				}
			})
		]);

		expect(rows<{ id: string }>('SELECT id FROM channels WHERE id = ?', [channelId])).toHaveLength(1);
		applySyncEvents(db, [event({
			type: 'channel.delete',
			payload: { channelId, parentChatId: CHAT_ID }
		})]);
		expect(rows<{ id: string }>('SELECT id FROM channels WHERE id = ?', [channelId])).toHaveLength(0);

		applySyncEvents(db, [event({
			type: 'chat.delete',
			payload: { chatId: CHAT_ID }
		})]);
		expect(rows<{ id: string }>('SELECT id FROM chats WHERE id = ?', [CHAT_ID])).toHaveLength(0);
	});

	it('replaces optimistic local messages when the server upsert arrives', () => {
		db.run(
			`INSERT INTO messages (
				id, chat_id, sender_id, content, type, created_at, client_message_id, read_receipts, reactions
			) VALUES (?, ?, ?, ?, 'text', ?, ?, '[]', '[]')`,
			['client-msg-1', CHAT_ID, USER_ID, 'Queued offline.', '2026-05-12T00:00:01.000Z', 'client-msg-1']
		);

		applySyncEvents(db, [
			event({
				type: 'message.upsert',
				payload: {
					id: MESSAGE_ID,
					chatId: CHAT_ID,
					senderId: USER_ID,
					senderUsername: 'bruce',
					senderDisplayName: 'Bruce',
					senderAvatarUrl: null,
					content: 'Queued offline.',
					type: 'text',
					metadata: null,
					createdAt: '2026-05-12T00:00:01.000Z',
					clientMessageId: 'client-msg-1',
					reactions: []
				}
			})
		]);

		const messageRows = rows<{ id: string; client_message_id: string }>(
			'SELECT id, client_message_id FROM messages WHERE client_message_id = ?',
			['client-msg-1']
		);
		expect(messageRows).toEqual([{ id: MESSAGE_ID, client_message_id: 'client-msg-1' }]);
	});
});

function event(op: SyncEvent['op']): SyncEvent {
	return {
		id: '1',
		createdAt: '2026-05-12T00:00:00.000Z',
		op
	};
}

function rows<T extends Record<string, unknown>>(sql: string, params?: SqlParam[]): T[] {
	const result = db.exec(sql, params);
	const first = result[0];
	if (!first) return [];
	return first.values.map((values) => Object.fromEntries(
		first.columns.map((column, index) => [column, values[index]])
	) as T);
}
