import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import type { Message } from '@penthouse/contracts';
import { closeDb } from '../src/db/pool.js';
import { shouldNotifyByScope } from '../src/push/send.js';
import { authHeader, resetDb, testApp } from './helpers.js';

describe('push integration', () => {
  beforeEach(resetDb);
  after(closeDb);

  it('supports vapid lookup, subscribe, and frontend unsubscribe alias', async () => {
    const app = await testApp();
    try {
      const headers = await authHeader(app, 'lucius');

      const key = await app.inject({ method: 'GET', url: '/api/v1/push/vapid-key' });
      assert.equal(key.statusCode, 200, key.body);

      const payload = {
        endpoint: 'https://example.com/push/1',
        keys: { p256dh: 'p256dh', auth: 'auth' }
      };

      const subscribe = await app.inject({ method: 'POST', url: '/api/v1/push/subscribe', headers, payload });
      assert.equal(subscribe.statusCode, 204, subscribe.body);

      const unsubscribe = await app.inject({ method: 'POST', url: '/api/v1/push/unsubscribe', headers, payload });
      assert.equal(unsubscribe.statusCode, 204, unsubscribe.body);
    } finally {
      await app.close();
    }
  });

  it('routes mention-only scopes from message metadata', () => {
    const message: Message = {
      id: 'message-id',
      chatId: 'chat-id',
      senderId: 'sender-id',
      content: '@alfred hello',
      type: 'text',
      createdAt: new Date().toISOString(),
      metadata: { mentionedUserIds: ['user-1'] }
    };

    assert.equal(shouldNotifyByScope('mentions_only', 'channel', message, 'user-1'), true);
    assert.equal(shouldNotifyByScope('mentions_only', 'channel', message, 'user-2'), false);
    assert.equal(shouldNotifyByScope('dm_and_mention', 'channel', message, 'user-1'), true);
    assert.equal(shouldNotifyByScope('dm_and_mention', 'channel', message, 'user-2'), false);
    assert.equal(shouldNotifyByScope('dm_and_mention', 'dm', message, 'user-2'), true);
  });
});
