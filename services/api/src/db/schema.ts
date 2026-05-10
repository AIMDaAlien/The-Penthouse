// Barrel file: re-exports all schema definitions from feature modules.
// This preserves backward compatibility for existing imports.

export * from '../features/auth/schema.js';
export * from '../features/chats/schema.js';
export * from '../features/push/schema.js';
export * from '../features/media/schema.js';
export * from '../features/pins/schema.js';
export * from '../features/chatFolders/schema.js';
export * from '../features/wallpapers/schema.js';
export * from '../features/customEmotes/schema.js';

// Relations that cross feature boundaries live here
import { relations } from 'drizzle-orm';
import { users, sessionDevices } from '../features/auth/schema.js';
import { chatMembers, messages } from '../features/chats/schema.js';

export const usersRelations = relations(users, ({ many }) => ({
  chatMembers: many(chatMembers),
  messages: many(messages),
  sessions: many(sessionDevices)
}));
