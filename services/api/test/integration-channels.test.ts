import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { closeDb } from '../src/db/pool.js';
import { registerUser, resetDb, testApp } from './helpers.js';

describe('channel integration', () => {
  beforeEach(resetDb);
  after(closeDb);

  it('creates a channel under a parent and inherits members', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'bruce');
      const alfred = await registerUser(app, 'alfred');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };
      const alfredHeaders = { authorization: `Bearer ${alfred.accessToken}` };

      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers: bruceHeaders });
      assert.equal(list.statusCode, 200, list.body);
      const general = (list.json() as { chats: Array<{ id: string; name: string }> }).chats[0];
      assert.equal(general.name, 'General');

      const create = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${general.id}/channels`,
        headers: bruceHeaders,
        payload: { name: 'random' }
      });
      assert.equal(create.statusCode, 200, create.body);
      const channel = (create.json() as { channel: { id: string; parentChatId: string; name: string } }).channel;
      assert.ok(channel.id);
      assert.equal(channel.parentChatId, general.id);
      assert.equal(channel.name, 'random');

      const channels = await app.inject({
        method: 'GET',
        url: `/api/v1/chats/${general.id}/channels`,
        headers: bruceHeaders
      });
      assert.equal(channels.statusCode, 200, channels.body);
      const rows = (channels.json() as { channels: Array<{ id: string; name: string }> }).channels;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].name, 'random');

      const alfredChannels = await app.inject({
        method: 'GET',
        url: `/api/v1/chats/${general.id}/channels`,
        headers: alfredHeaders
      });
      assert.equal(alfredChannels.statusCode, 200, alfredChannels.body);
      assert.equal((alfredChannels.json() as { channels: Array<{ id: string }> }).channels.length, 1);
    } finally {
      await app.close();
    }
  });

  it('does not show child chats in the flat chat list', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'bruce');
      const headers = { authorization: `Bearer ${bruce.accessToken}` };

      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers });
      assert.equal(list.statusCode, 200, list.body);
      const general = (list.json() as { chats: Array<{ id: string; name: string }> }).chats[0];

      const create = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${general.id}/channels`,
        headers,
        payload: { name: 'random' }
      });
      assert.equal(create.statusCode, 200, create.body);

      const flat = await app.inject({ method: 'GET', url: '/api/v1/chats', headers });
      assert.equal(flat.statusCode, 200, flat.body);
      const chats = (flat.json() as { chats: Array<{ name: string }> }).chats;
      const names = chats.map((c) => c.name);
      assert.ok(names.includes('General'), 'flat list should include General');
      assert.ok(!names.includes('random'), 'flat list should not include channel');
    } finally {
      await app.close();
    }
  });

  it('sends and lists messages in a channel', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'bruce');
      const headers = { authorization: `Bearer ${bruce.accessToken}` };

      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers });
      assert.equal(list.statusCode, 200, list.body);
      const general = (list.json() as { chats: Array<{ id: string }> }).chats[0];

      const create = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${general.id}/channels`,
        headers,
        payload: { name: 'random' }
      });
      assert.equal(create.statusCode, 200, create.body);
      const channelId = (create.json() as { channel: { id: string } }).channel.id;

      const send = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${channelId}/messages`,
        headers,
        payload: {
          chatId: channelId,
          content: 'Hello channel',
          type: 'text',
          clientMessageId: 'client-msg-1'
        }
      });
      assert.equal(send.statusCode, 200, send.body);

      const messages = await app.inject({
        method: 'GET',
        url: `/api/v1/chats/${channelId}/messages`,
        headers
      });
      assert.equal(messages.statusCode, 200, messages.body);
      const rows = (messages.json() as { messages: Array<{ content: string }> }).messages;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].content, 'Hello channel');
    } finally {
      await app.close();
    }
  });

  it('lists siblings and creates sibling channels from a child channel route', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'bruce');
      const headers = { authorization: `Bearer ${bruce.accessToken}` };

      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers });
      assert.equal(list.statusCode, 200, list.body);
      const general = (list.json() as { chats: Array<{ id: string }> }).chats[0];

      const firstCreate = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${general.id}/channels`,
        headers,
        payload: { name: 'random' }
      });
      assert.equal(firstCreate.statusCode, 200, firstCreate.body);
      const first = (firstCreate.json() as { channel: { id: string; parentChatId: string } }).channel;

      const secondCreate = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${first.id}/channels`,
        headers,
        payload: { name: 'support' }
      });
      assert.equal(secondCreate.statusCode, 200, secondCreate.body);
      const second = (secondCreate.json() as { channel: { id: string; parentChatId: string } }).channel;
      assert.equal(second.parentChatId, general.id);

      const childList = await app.inject({
        method: 'GET',
        url: `/api/v1/chats/${first.id}/channels`,
        headers
      });
      assert.equal(childList.statusCode, 200, childList.body);
      const names = (childList.json() as { channels: Array<{ name: string }> }).channels.map((c) => c.name);
      assert.deepEqual(names, ['random', 'support']);
    } finally {
      await app.close();
    }
  });

  it('forbids non-members from creating channels', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'bruce');
      const alfred = await registerUser(app, 'alfred');
      const selina = await registerUser(app, 'selina');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };
      const selinaHeaders = { authorization: `Bearer ${selina.accessToken}` };

      const dm = await app.inject({
        method: 'POST',
        url: '/api/v1/chats/dm',
        headers: bruceHeaders,
        payload: { memberId: alfred.user.id }
      });
      assert.equal(dm.statusCode, 200, dm.body);
      const dmChatId = (dm.json() as { chatId: string }).chatId;

      const create = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${dmChatId}/channels`,
        headers: selinaHeaders,
        payload: { name: 'random' }
      });
      assert.equal(create.statusCode, 403, create.body);
    } finally {
      await app.close();
    }
  });

  it('forbids non-members from listing channels', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'bruce');
      const alfred = await registerUser(app, 'alfred');
      const selina = await registerUser(app, 'selina');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };
      const selinaHeaders = { authorization: `Bearer ${selina.accessToken}` };

      const dm = await app.inject({
        method: 'POST',
        url: '/api/v1/chats/dm',
        headers: bruceHeaders,
        payload: { memberId: alfred.user.id }
      });
      assert.equal(dm.statusCode, 200, dm.body);
      const dmChatId = (dm.json() as { chatId: string }).chatId;

      const channels = await app.inject({
        method: 'GET',
        url: `/api/v1/chats/${dmChatId}/channels`,
        headers: selinaHeaders
      });
      assert.equal(channels.statusCode, 403, channels.body);
    } finally {
      await app.close();
    }
  });

  it('lets late joiners access channels created before they joined', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'bruce');
      const alfred = await registerUser(app, 'alfred');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };
      const alfredHeaders = { authorization: `Bearer ${alfred.accessToken}` };

      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers: bruceHeaders });
      assert.equal(list.statusCode, 200, list.body);
      const general = (list.json() as { chats: Array<{ id: string }> }).chats[0];

      // Bruce creates a channel while Alfred is already in General
      const create = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${general.id}/channels`,
        headers: bruceHeaders,
        payload: { name: 'late-joiner-test' }
      });
      assert.equal(create.statusCode, 200, create.body);
      const channelId = (create.json() as { channel: { id: string } }).channel.id;

      // Alfred (already in General) can list and message
      const alfredList = await app.inject({
        method: 'GET',
        url: `/api/v1/chats/${general.id}/channels`,
        headers: alfredHeaders
      });
      assert.equal(alfredList.statusCode, 200, alfredList.body);

      // Now Selina registers (joins General after channel was created)
      const selina = await registerUser(app, 'selina');
      const selinaHeaders = { authorization: `Bearer ${selina.accessToken}` };

      // Selina should be able to list channels under General
      const selinaList = await app.inject({
        method: 'GET',
        url: `/api/v1/chats/${general.id}/channels`,
        headers: selinaHeaders
      });
      assert.equal(selinaList.statusCode, 200, selinaList.body);
      const selinaChannels = (selinaList.json() as { channels: Array<{ id: string }> }).channels;
      assert.equal(selinaChannels.length, 1);
      assert.equal(selinaChannels[0].id, channelId);

      // Selina should be able to send a message in the channel
      const send = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${channelId}/messages`,
        headers: selinaHeaders,
        payload: {
          chatId: channelId,
          content: 'Hello from late joiner',
          type: 'text',
          clientMessageId: 'late-joiner-msg-1'
        }
      });
      assert.equal(send.statusCode, 200, send.body);
    } finally {
      await app.close();
    }
  });
});
