import { db } from '../../db/pool.js';
import { chatMembers, chats } from '../../db/schema.js';
import { serializeChannel } from '../../utils/chat-management.js';
import { appendSyncEvent, buildChatSummaryForUser } from '../sync/service.js';

type Chat = typeof chats.$inferSelect;
type ChatMember = typeof chatMembers.$inferSelect;
type SyncWriter = Pick<typeof db, 'insert'>;

function readStatePayload(member: ChatMember) {
  return {
    chatId: member.chatId,
    userId: member.userId,
    lastReadAt: member.lastReadAt?.toISOString() ?? null,
    lastReadMessageId: member.lastReadMessageId ?? null,
    notificationsMuted: member.notificationsMuted,
    archivedAt: member.archivedAt?.toISOString() ?? null
  };
}

async function appendChatSummaryForMember(
  chat: Chat,
  member: ChatMember,
  actorUserId: string,
  writer: SyncWriter = db
) {
  await appendSyncEvent({
    scope: 'user',
    userId: member.userId,
    actorUserId,
    entityId: chat.id,
    op: { type: 'chat.upsert', payload: await buildChatSummaryForUser(chat, member, member.userId) }
  }, writer);
}

export async function appendChatSummaryForMembers(
  chat: Chat,
  members: ChatMember[],
  actorUserId: string,
  writer: SyncWriter = db
) {
  for (const member of members) {
    await appendChatSummaryForMember(chat, member, actorUserId, writer);
  }
}

export async function appendReadStateForMember(
  member: ChatMember,
  actorUserId: string,
  writer: SyncWriter = db
) {
  await appendSyncEvent({
    scope: 'user',
    userId: member.userId,
    actorUserId,
    entityId: `${member.chatId}:${member.userId}`,
    op: { type: 'read.upsert', payload: readStatePayload(member) }
  }, writer);
}

async function appendChannelUpsertForUser(
  channel: Chat,
  userId: string,
  actorUserId: string,
  writer: SyncWriter = db
) {
  await appendSyncEvent({
    scope: 'user',
    userId,
    actorUserId,
    entityId: channel.id,
    op: { type: 'channel.upsert', payload: serializeChannel(channel) }
  }, writer);
}

export async function appendChannelUpsertForChat(
  channel: Chat,
  actorUserId: string,
  writer: SyncWriter = db
) {
  await appendSyncEvent({
    scope: 'chat',
    chatId: channel.id,
    actorUserId,
    entityId: channel.id,
    op: { type: 'channel.upsert', payload: serializeChannel(channel) }
  }, writer);
}

export async function appendMemberAddedSync(
  rootChat: Chat,
  rootMember: ChatMember,
  channels: Chat[],
  actorUserId: string,
  writer: SyncWriter = db
) {
  await appendChatSummaryForMember(rootChat, rootMember, actorUserId, writer);
  for (const channel of channels) {
    await appendChannelUpsertForUser(channel, rootMember.userId, actorUserId, writer);
  }
}

async function appendChannelDeleteForUser(
  channelId: string,
  parentChatId: string,
  userId: string,
  actorUserId: string,
  writer: SyncWriter = db
) {
  await appendSyncEvent({
    scope: 'user',
    userId,
    actorUserId,
    entityId: channelId,
    op: { type: 'channel.delete', payload: { channelId, parentChatId } }
  }, writer);
}

export async function appendChannelDeleteForMembers(
  channelId: string,
  parentChatId: string,
  members: Array<Pick<ChatMember, 'userId'>>,
  actorUserId: string,
  writer: SyncWriter = db
) {
  for (const member of members) {
    await appendChannelDeleteForUser(channelId, parentChatId, member.userId, actorUserId, writer);
  }
}

async function appendChatDeleteForUser(
  chatId: string,
  userId: string,
  actorUserId: string,
  writer: SyncWriter = db
) {
  await appendSyncEvent({
    scope: 'user',
    userId,
    actorUserId,
    entityId: chatId,
    op: { type: 'chat.delete', payload: { chatId } }
  }, writer);
}

export async function appendChatDeleteForMemberWithChannels(
  rootChatId: string,
  channels: Chat[],
  member: Pick<ChatMember, 'userId'>,
  actorUserId: string,
  writer: SyncWriter = db
) {
  for (const channel of channels) {
    await appendChannelDeleteForUser(channel.id, rootChatId, member.userId, actorUserId, writer);
  }
  await appendChatDeleteForUser(rootChatId, member.userId, actorUserId, writer);
}
