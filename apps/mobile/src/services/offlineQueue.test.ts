import { test, expect } from 'vitest';
import { enqueueMessage, flushQueue, getQueued } from './offlineQueue';
import { installLocalStorageMock } from '../test/localStorageMock';

test('flushQueue continues after one item fails and keeps failed item queued', async () => {
  installLocalStorageMock();

  enqueueMessage({
    chatId: 'chat-1',
    content: 'first',
    type: 'text',
    clientMessageId: 'm-1',
    enqueuedAt: new Date().toISOString(),
    attempts: 0
  });

  enqueueMessage({
    chatId: 'chat-1',
    content: 'second',
    type: 'text',
    clientMessageId: 'm-2',
    enqueuedAt: new Date().toISOString(),
    attempts: 0
  });

  const attempted: string[] = [];

  await flushQueue(async (item) => {
    attempted.push(item.clientMessageId);
    if (item.clientMessageId === 'm-1') {
      throw new Error('transient send failure');
    }
  });

  expect(attempted).toEqual(['m-1', 'm-2']);
  const remaining = getQueued();
  expect(remaining.length).toBe(1);
  expect(remaining[0].clientMessageId).toBe('m-1');
});
