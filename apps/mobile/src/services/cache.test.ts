import { test, expect } from 'vitest';
import { cacheMessages, readCachedMessages } from './cache';
import { installLocalStorageMock } from '../test/localStorageMock';

test('readCachedMessages returns [] when cache payload is corrupted', () => {
  installLocalStorageMock();
  localStorage.setItem('penthouse.cache.messages.chat-1', '{bad-json');

  const result = readCachedMessages('chat-1');
  expect(result).toEqual([]);
});

test('cacheMessages and readCachedMessages round trip message arrays', () => {
  installLocalStorageMock();
  cacheMessages('chat-2', [
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

  const result = readCachedMessages('chat-2');
  expect(result.length).toBe(1);
  expect(result[0].id).toBe('msg-1');
});
