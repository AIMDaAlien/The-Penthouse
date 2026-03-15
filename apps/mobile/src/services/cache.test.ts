import { test, expect } from 'vitest';
import { cacheChats, cacheMessages, readCachedChats, readCachedMessages } from './cache';
import { installLocalStorageMock } from '../test/localStorageMock';

test('readCachedMessages returns [] when cache payload is corrupted', () => {
  installLocalStorageMock();
  localStorage.setItem('penthouse.cache.messages.user-1.chat-1', '{bad-json');

  const result = readCachedMessages('user-1', 'chat-1');
  expect(result).toEqual([]);
});

test('cacheMessages and readCachedMessages round trip message arrays', () => {
  installLocalStorageMock();
  cacheMessages('user-1', 'chat-2', [
    {
      id: 'msg-1',
      chatId: 'chat-2',
      senderId: 'user-1',
      content: 'hello',
      type: 'text',
      createdAt: new Date().toISOString(),
      clientMessageId: 'cm-1'
    }
  ]);

  const result = readCachedMessages('user-1', 'chat-2');
  expect(result.length).toBe(1);
  expect(result[0].id).toBe('msg-1');
});

test('cached chats and messages are scoped per user', () => {
  installLocalStorageMock();

  cacheChats('user-1', [
    { id: 'chat-1', name: 'General', type: 'channel', updatedAt: new Date().toISOString(), unreadCount: 0 }
  ]);
  cacheMessages('user-1', 'chat-1', [
    {
      id: 'msg-1',
      chatId: 'chat-1',
      senderId: 'user-1',
      content: 'hello from user 1',
      type: 'text',
      createdAt: new Date().toISOString(),
      clientMessageId: 'cm-user-1'
    }
  ]);

  expect(readCachedChats('user-2')).toEqual([]);
  expect(readCachedMessages('user-2', 'chat-1')).toEqual([]);
});
