import { test, expect } from 'vitest';
import { enqueueMessage, flushQueue, getQueued } from './offlineQueue';
import { installLocalStorageMock } from '../test/localStorageMock';

test('flushQueue continues after one item fails and keeps failed item queued', async () => {
  installLocalStorageMock();
  const scopeKey = 'user-a';

  enqueueMessage({
    chatId: 'chat-1',
    content: 'first',
    type: 'text',
    clientMessageId: 'm-1',
    enqueuedAt: new Date().toISOString(),
    attempts: 0
  }, scopeKey);

  enqueueMessage({
    chatId: 'chat-1',
    content: 'second',
    type: 'text',
    clientMessageId: 'm-2',
    enqueuedAt: new Date().toISOString(),
    attempts: 0
  }, scopeKey);

  const attempted: string[] = [];

  await flushQueue(async (item) => {
    attempted.push(item.clientMessageId);
    if (item.clientMessageId === 'm-1') {
      throw new Error('transient send failure');
    }
    return 'delivered';
  }, scopeKey);

  expect(attempted).toEqual(['m-1', 'm-2']);
  const remaining = getQueued(scopeKey);
  expect(remaining.length).toBe(1);
  expect(remaining[0].clientMessageId).toBe('m-1');
});

test('stores queues separately per user scope', () => {
  installLocalStorageMock();

  enqueueMessage(
    {
      chatId: 'chat-1',
      content: 'user a',
      type: 'text',
      clientMessageId: 'a-1',
      enqueuedAt: new Date().toISOString(),
      attempts: 0
    },
    'user-a'
  );

  enqueueMessage(
    {
      chatId: 'chat-2',
      content: 'user b',
      type: 'text',
      clientMessageId: 'b-1',
      enqueuedAt: new Date().toISOString(),
      attempts: 0
    },
    'user-b'
  );

  expect(getQueued('user-a').map((item) => item.clientMessageId)).toEqual(['a-1']);
  expect(getQueued('user-b').map((item) => item.clientMessageId)).toEqual(['b-1']);
});
