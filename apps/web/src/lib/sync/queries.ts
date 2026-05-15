import type { ChatFolder, ChatFolderItem, ChatSummary, Channel, Message } from '@penthouse/contracts';
import type { LocalSyncDbClient } from './db-client';

export async function getLocalChats(client: LocalSyncDbClient): Promise<ChatSummary[]> {
	const rows = await client.query<ChatRow>(
		`SELECT * FROM chats ORDER BY updated_at DESC`
	);
	return rows.map((row) => ({
		id: row.id,
		type: row.type,
		name: row.name,
		updatedAt: row.updated_at,
		archivedAt: row.archived_at,
		unreadCount: row.unread_count,
		counterpartMemberId: row.counterpart_member_id ?? undefined,
		counterpartAvatarUrl: row.counterpart_avatar_url,
		notificationsMuted: Boolean(row.notifications_muted)
	}));
}

export async function getLocalChannels(client: LocalSyncDbClient, parentChatId: string): Promise<Channel[]> {
	const rows = await client.query<ChannelRow>(
		`SELECT * FROM channels WHERE parent_chat_id = ? ORDER BY created_at ASC`,
		[parentChatId]
	);
	return rows.map((row) => ({
		id: row.id,
		parentChatId: row.parent_chat_id,
		name: row.name,
		createdAt: row.created_at
	}));
}

export async function getLocalFolders(client: LocalSyncDbClient) {
	const folders = await client.query<FolderRow>(
		`SELECT * FROM folders ORDER BY sort_order ASC, created_at ASC`
	);
	const items = await client.query<FolderItemRow>(
		`SELECT * FROM folder_items ORDER BY sort_order ASC, created_at ASC`
	);
	const itemsByFolder = new Map<string, ChatFolderItem[]>();

	for (const item of items) {
		const list = itemsByFolder.get(item.folder_id) ?? [];
		list.push({
			folderId: item.folder_id,
			chatId: item.chat_id,
			sortOrder: item.sort_order,
			createdAt: item.created_at
		});
		itemsByFolder.set(item.folder_id, list);
	}

	return folders.map((folder) => ({
		id: folder.id,
		userId: folder.user_id,
		name: folder.name,
		icon: folder.icon,
		color: folder.color,
		sortOrder: folder.sort_order,
		createdAt: folder.created_at,
		updatedAt: folder.updated_at,
		items: itemsByFolder.get(folder.id) ?? []
	})) satisfies Array<ChatFolder & { items: ChatFolderItem[] }>;
}

export async function getLocalMessages(client: LocalSyncDbClient, chatId: string): Promise<Message[]> {
	const rows = await client.query<MessageRow>(
		`SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC`,
		[chatId]
	);
	return rows.map(rowToMessage);
}

type ChatRow = {
	id: string;
	type: 'dm' | 'channel';
	name: string;
	updated_at: string;
	archived_at: string | null;
	unread_count: number;
	counterpart_member_id: string | null;
	counterpart_avatar_url: string | null;
	notifications_muted: number;
};

type ChannelRow = {
	id: string;
	parent_chat_id: string;
	name: string;
	created_at: string;
};

type FolderRow = {
	id: string;
	user_id: string;
	name: string;
	icon: string | null;
	color: string | null;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

type FolderItemRow = {
	folder_id: string;
	chat_id: string;
	sort_order: number;
	created_at: string;
};

type MessageRow = {
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

function rowToMessage(row: MessageRow): Message {
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
