import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import {
  SyncOperationSchema,
  type ChatSummary,
  type SyncEvent,
  type SyncOperation,
  type SyncResponse
} from '@penthouse/contracts';
import { db } from '../../db/pool.js';
import {
  chatFolderItems,
  chatFolders,
  chatMembers,
  chats,
  messageDeletions,
  messages,
  pinnedMessages,
  syncEvents,
  users
} from '../../db/schema.js';
import { hydrateMessage, unreadCount } from '../../utils/messages.js';
import { avatarUrlFromMediaId, toMemberDetail } from '../../utils/users.js';

const INITIAL_MESSAGES_PER_CHAT = 50;
const DEFAULT_SYNC_LIMIT = 100;

type SyncScope = 'chat' | 'user' | 'global';
type SyncEventWriter = Pick<typeof db, 'insert'>;

type AppendSyncEventInput = {
  op: SyncOperation;
  scope: SyncScope;
  entityId: string;
  chatId?: string | null;
  userId?: string | null;
  actorUserId?: string | null;
};

export async function appendSyncEvent(input: AppendSyncEventInput, writer: SyncEventWriter = db) {
  const op = SyncOperationSchema.parse(input.op);
  const [event] = await writer.insert(syncEvents).values({
    scope: input.scope,
    opType: op.type,
    entityId: input.entityId,
    chatId: input.chatId ?? null,
    userId: input.userId ?? null,
    actorUserId: input.actorUserId ?? null,
    payload: op
  }).returning();

  return serializeSyncEvent(event);
}

export async function getSyncResponse(userId: string, cursor = '0', limit = DEFAULT_SYNC_LIMIT): Promise<SyncResponse> {
  const cursorNumber = Number(cursor);
  if (!Number.isSafeInteger(cursorNumber) || cursorNumber < 0) {
    throw new Error('Invalid sync cursor');
  }

  if (cursorNumber === 0) {
    const nextCursor = await currentSyncCursor();
    return {
      cursor,
      nextCursor,
      hasMore: false,
      ops: await buildInitialSnapshot(userId, nextCursor)
    };
  }

  const maxCursor = await currentSyncCursor();
  const visibleChatIds = await getVisibleChatIds(userId);
  const visibility = visibleChatIds.length > 0
    ? or(
      eq(syncEvents.scope, 'global'),
      and(eq(syncEvents.scope, 'user'), eq(syncEvents.userId, userId)),
      and(eq(syncEvents.scope, 'chat'), inArray(syncEvents.chatId, visibleChatIds))
    )
    : or(
      eq(syncEvents.scope, 'global'),
      and(eq(syncEvents.scope, 'user'), eq(syncEvents.userId, userId))
    );

  const rows = await db.select()
    .from(syncEvents)
    .where(and(sql`${syncEvents.id} > ${cursorNumber}`, visibility))
    .orderBy(asc(syncEvents.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const nextCursor = hasMore
    ? String(page.at(-1)?.id ?? cursorNumber)
    : maxCursor;

  return {
    cursor,
    nextCursor,
    hasMore,
    ops: page.map(serializeSyncEvent)
  };
}

export function syncCursorFromQuery(value: unknown) {
  if (value === undefined || value === null || value === '') return '0';
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new Error('Invalid sync cursor');
  }
  return value;
}

export function syncLimitFromQuery(value: unknown) {
  if (value === undefined || value === null || value === '') return DEFAULT_SYNC_LIMIT;
  const parsed = typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 500) {
    throw new Error('Invalid sync limit');
  }
  return parsed;
}

async function currentSyncCursor() {
  const [row] = await db.select({ id: sql<number>`coalesce(max(${syncEvents.id}), 0)` }).from(syncEvents);
  return String(row?.id ?? 0);
}

async function getVisibleChatIds(userId: string) {
  const rows = await db.select({ chatId: chatMembers.chatId })
    .from(chatMembers)
    .where(eq(chatMembers.userId, userId));
  return rows.map((row) => row.chatId);
}

async function buildInitialSnapshot(userId: string, eventId: string): Promise<SyncEvent[]> {
  const createdAt = new Date().toISOString();
  const ops: SyncEvent[] = [];
  const push = (op: SyncOperation) => {
    ops.push({ id: eventId, createdAt, op });
  };

  const visibleChatIds = await getVisibleChatIds(userId);
  const visibleUserIds = new Set<string>([userId]);
  const chatRows = await db.select({ chat: chats, member: chatMembers })
    .from(chatMembers)
    .innerJoin(chats, eq(chatMembers.chatId, chats.id))
    .where(and(eq(chatMembers.userId, userId), isNull(chats.parentChatId)))
    .orderBy(sql`${chats.updatedAt} DESC`);

  for (const row of chatRows) {
    push({ type: 'chat.upsert', payload: await buildChatSummaryForUser(row.chat, row.member, userId) });
  }

  if (visibleChatIds.length > 0) {
    const channelRows = await db.select()
      .from(chats)
      .where(inArray(chats.id, visibleChatIds))
      .orderBy(asc(chats.createdAt));

    for (const channel of channelRows.filter((chat) => chat.parentChatId)) {
      push({
        type: 'channel.upsert',
        payload: {
          id: channel.id,
          parentChatId: channel.parentChatId!,
          name: channel.name,
          createdAt: channel.createdAt.toISOString()
        }
      });
    }

    const readRows = await db.select()
      .from(chatMembers)
      .where(inArray(chatMembers.chatId, visibleChatIds));

    for (const read of readRows) {
      visibleUserIds.add(read.userId);
      push({
        type: 'read.upsert',
        payload: {
          chatId: read.chatId,
          userId: read.userId,
          lastReadAt: read.lastReadAt?.toISOString() ?? null,
          lastReadMessageId: read.lastReadMessageId ?? null,
          notificationsMuted: read.notificationsMuted,
          archivedAt: read.archivedAt?.toISOString() ?? null
        }
      });
    }

    const pinRows = await db.select({ pin: pinnedMessages, message: messages, sender: users })
      .from(pinnedMessages)
      .innerJoin(messages, eq(pinnedMessages.messageId, messages.id))
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(inArray(pinnedMessages.chatId, visibleChatIds));

    for (const { pin } of pinRows) {
      push({
        type: 'message.pin',
        payload: {
          chatId: pin.chatId,
          messageId: pin.messageId,
          pinnedByUserId: pin.pinnedBy,
          pinnedAt: pin.pinnedAt.toISOString(),
          content: pin.contentSnapshot,
          senderDisplayName: pin.senderDisplayNameSnapshot
        }
      });
    }

    for (const chatId of visibleChatIds) {
      const messageRows = await db.select({ id: messages.id })
        .from(messages)
        .where(eq(messages.chatId, chatId))
        .orderBy(desc(messages.createdAt))
        .limit(INITIAL_MESSAGES_PER_CHAT);

      for (const row of messageRows.reverse()) {
        push({ type: 'message.upsert', payload: await hydrateMessage(row.id, userId) });
      }
    }
  }

  const folderRows = await db.select().from(chatFolders)
    .where(eq(chatFolders.userId, userId))
    .orderBy(asc(chatFolders.sortOrder), asc(chatFolders.createdAt));
  const folderIds = folderRows.map((folder) => folder.id);

  for (const folder of folderRows) {
    push({
      type: 'folder.upsert',
      payload: {
        id: folder.id,
        userId: folder.userId,
        name: folder.name,
        icon: folder.icon,
        color: folder.color,
        sortOrder: folder.sortOrder,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString()
      }
    });
  }

  if (folderIds.length > 0) {
    const itemRows = await db.select().from(chatFolderItems)
      .where(inArray(chatFolderItems.folderId, folderIds))
      .orderBy(asc(chatFolderItems.sortOrder), asc(chatFolderItems.createdAt));

    for (const item of itemRows) {
      push({
        type: 'folder_item.upsert',
        payload: {
          folderId: item.folderId,
          chatId: item.chatId,
          sortOrder: item.sortOrder,
          createdAt: item.createdAt.toISOString()
        }
      });
    }
  }

  const userRows = await db.select().from(users)
    .where(and(eq(users.status, 'active'), inArray(users.id, [...visibleUserIds])))
    .orderBy(asc(users.displayName));

  for (const user of userRows) {
    push({ type: 'user.upsert', payload: toMemberDetail(user) });
  }

  return ops;
}

export async function buildChatSummaryForUser(
  chat: typeof chats.$inferSelect,
  member: typeof chatMembers.$inferSelect,
  viewerUserId: string
): Promise<ChatSummary> {
  let name = chat.name;
  let counterpartMemberId: string | undefined;
  let counterpartAvatarUrl: string | null | undefined;

  if (chat.type === 'dm') {
    const [other] = await db.select({ user: users })
      .from(chatMembers)
      .innerJoin(users, eq(chatMembers.userId, users.id))
      .where(and(eq(chatMembers.chatId, chat.id), sql`${chatMembers.userId} <> ${viewerUserId}`))
      .limit(1);

    if (other) {
      name = other.user.displayName;
      counterpartMemberId = other.user.id;
      counterpartAvatarUrl = avatarUrlFromMediaId(other.user.avatarMediaId);
    }
  }

  return {
    id: chat.id,
    type: chat.type,
    name,
    updatedAt: chat.updatedAt.toISOString(),
    archivedAt: member.archivedAt?.toISOString() ?? null,
    unreadCount: await unreadCount(chat.id, viewerUserId),
    counterpartMemberId,
    counterpartAvatarUrl,
    notificationsMuted: member.notificationsMuted
  };
}

function serializeSyncEvent(row: typeof syncEvents.$inferSelect): SyncEvent {
  return {
    id: String(row.id),
    createdAt: row.createdAt.toISOString(),
    op: SyncOperationSchema.parse(row.payload)
  };
}
