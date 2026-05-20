import type { Message } from '@penthouse/contracts';
import type { LocalSyncDbClient } from './db-client';

export async function listLocalMessages(
	client: Pick<LocalSyncDbClient, 'query'>,
	chatId: string,
	limit = 50
) {
	const rows = await client.query<LocalMessageRow>(
		`SELECT *
		FROM (
			SELECT m.*
			FROM messages m
			WHERE m.chat_id = ?
			ORDER BY m.created_at DESC
			LIMIT ?
		) m
		ORDER BY m.created_at ASC`,
		[chatId, limit]
	);

	return rows.map(rowToMessage);
}

export async function searchLocalMessages(client: Pick<LocalSyncDbClient, 'query'>, chatId: string, query: string) {
	const terms = toSearchTerms(query);
	if (terms.length === 0) return [];

	const clauses = terms.map(() => "LOWER(m.content) LIKE ? ESCAPE '\\'").join(' AND ');
	const params = [
		chatId,
		...terms.map((term) => `%${escapeLike(term.toLowerCase())}%`)
	];

	const rows = await client.query<LocalMessageRow>(
		`SELECT m.*
		FROM messages m
		WHERE m.chat_id = ?
			AND m.deleted_at IS NULL
			AND m.hidden = 0
			AND ${clauses}
		ORDER BY m.created_at DESC
		LIMIT 50`,
		params
	);

	return rows.map(rowToMessage);
}

function toSearchTerms(value: string) {
	return value
		.trim()
		.split(/\s+/)
		.map((term) => term.replace(/[%_\\]/g, '').trim())
		.filter(Boolean);
}

function escapeLike(value: string) {
	return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

type LocalMessageRow = {
	id: string;
	chat_id: string;
	sender_id: string;
	sender_username: string | null;
	sender_display_name: string | null;
	sender_avatar_url: string | null;
	content: string;
	type: Message['type'];
	metadata: string | null;
	created_at: string;
	edited_at: string | null;
	edit_count: number | null;
	deleted_at: string | null;
	deleted_by_user_id: string | null;
	client_message_id: string | null;
	seen_at: string | null;
	read_receipts: string | null;
	reactions: string | null;
	reply_to: string | null;
	starred: number;
	hidden: number;
};

export function rowToMessage(row: LocalMessageRow): Message {
	return {
		id: row.id,
		chatId: row.chat_id,
		senderId: row.sender_id,
		senderUsername: row.sender_username ?? undefined,
		senderDisplayName: row.sender_display_name ?? undefined,
		senderAvatarUrl: row.sender_avatar_url,
		content: row.content,
		type: row.type,
		metadata: parseJson(row.metadata, null),
		createdAt: row.created_at,
		editedAt: row.edited_at,
		editCount: row.edit_count ?? undefined,
		deletedAt: row.deleted_at,
		deletedByUserId: row.deleted_by_user_id,
		clientMessageId: row.client_message_id ?? undefined,
		seenAt: row.seen_at,
		readReceipts: parseJson(row.read_receipts, []),
		reactions: parseJson(row.reactions, []),
		replyTo: parseJson(row.reply_to, null),
		starred: Boolean(row.starred),
		hidden: Boolean(row.hidden)
	};
}

function parseJson<T>(value: string | null, fallback: T): T {
	if (!value) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}
