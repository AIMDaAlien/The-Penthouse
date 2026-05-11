import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'member']);
export const userStatusEnum = pgEnum('user_status', ['active', 'removed', 'banned']);
export const chatTypeEnum = pgEnum('chat_type', ['dm', 'channel']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'video', 'gif', 'file', 'poll', 'audio', 'sticker']);
export const mediaKindEnum = pgEnum('media_kind', ['image', 'video', 'file']);
export const moderationActionEnum = pgEnum('moderation_action', ['hide', 'unhide']);
export const notificationScopeEnum = pgEnum('notification_scope', ['off', 'dm_only', 'dm_and_mention', 'all']);
export const chatOverrideScopeEnum = pgEnum('chat_override_scope', ['off', 'mentions_only', 'all']);
export const payloadPrivacyEnum = pgEnum('payload_privacy', ['private', 'metadata', 'full']);
export const presenceStateEnum = pgEnum('presence_state', ['available', 'busy', 'dnd', 'afk', 'offline']);
