import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { closeDb, pool } from '../src/db/pool.js';
import { registerUser, resetDb, testApp } from './helpers.js';

type SyncResponse = {
  cursor: string;
  nextCursor: string;
  hasMore: boolean;
  ops: Array<{ id: string; op: { type: string; payload: Record<string, unknown> } }>;
};

describe('sync integration', () => {
  beforeEach(resetDb);
  after(closeDb);

  it('returns an initial visible snapshot with recent messages only', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'sync-bruce');
      const alfred = await registerUser(app, 'sync-alfred');
      const headers = { authorization: `Bearer ${bruce.accessToken}` };

      const dm = await app.inject({
        method: 'POST',
        url: '/api/v1/chats/dm',
        headers,
        payload: { memberId: alfred.user.id }
      });
      assert.equal(dm.statusCode, 200, dm.body);
      const chatId = (dm.json() as { chatId: string }).chatId;

      for (let index = 0; index < 55; index += 1) {
        const send = await app.inject({
          method: 'POST',
          url: `/api/v1/chats/${chatId}/messages`,
          headers,
          payload: {
            chatId,
            content: `Sync message ${index}`,
            type: 'text',
            clientMessageId: `sync-message-${index}`
          }
        });
        assert.equal(send.statusCode, 200, send.body);
      }

      const sync = await app.inject({ method: 'GET', url: '/api/v1/sync?cursor=0', headers });
      assert.equal(sync.statusCode, 200, sync.body);
      const body = sync.json() as SyncResponse;
      const dmMessages = body.ops.filter((event) =>
        event.op.type === 'message.upsert' && event.op.payload.chatId === chatId
      );

      assert.equal(dmMessages.length, 50);
      assert.ok(body.ops.some((event) => event.op.type === 'chat.upsert'));
      assert.ok(body.ops.some((event) => event.op.type === 'user.upsert'));
    } finally {
      await app.close();
    }
  });

  it('replays message upserts and delete tombstones after a cursor', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'sync-delete-bruce');
      const headers = { authorization: `Bearer ${bruce.accessToken}` };
      const initial = await app.inject({ method: 'GET', url: '/api/v1/sync?cursor=0', headers });
      const cursor = (initial.json() as SyncResponse).nextCursor;

      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers });
      const chatId = (list.json() as { chats: Array<{ id: string }> }).chats[0].id;
      const sent = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chatId}/messages`,
        headers,
        payload: {
          chatId,
          content: 'Delete me after sync.',
          type: 'text',
          clientMessageId: 'sync-delete-message'
        }
      });
      assert.equal(sent.statusCode, 200, sent.body);
      const messageId = (sent.json() as { message: { id: string } }).message.id;

      const deleted = await app.inject({
        method: 'DELETE',
        url: `/api/v1/messages/${messageId}`,
        headers
      });
      assert.equal(deleted.statusCode, 200, deleted.body);

      const sync = await app.inject({ method: 'GET', url: `/api/v1/sync?cursor=${cursor}`, headers });
      assert.equal(sync.statusCode, 200, sync.body);
      const ops = (sync.json() as SyncResponse).ops;

      assert.ok(ops.some((event) => event.op.type === 'message.upsert' && event.op.payload.id === messageId));
      assert.ok(ops.some((event) => event.op.type === 'message.delete' && event.op.payload.messageId === messageId));
    } finally {
      await app.close();
    }
  });

  it('does not replay private chat events to non-members', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'sync-private-bruce');
      const alfred = await registerUser(app, 'sync-private-alfred');
      const selina = await registerUser(app, 'sync-private-selina');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };
      const selinaHeaders = { authorization: `Bearer ${selina.accessToken}` };

      const dm = await app.inject({
        method: 'POST',
        url: '/api/v1/chats/dm',
        headers: bruceHeaders,
        payload: { memberId: alfred.user.id }
      });
      const chatId = (dm.json() as { chatId: string }).chatId;

      const initial = await app.inject({ method: 'GET', url: '/api/v1/sync?cursor=0', headers: selinaHeaders });
      const cursor = (initial.json() as SyncResponse).nextCursor;

      const sent = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chatId}/messages`,
        headers: bruceHeaders,
        payload: {
          chatId,
          content: 'Private sync note.',
          type: 'text',
          clientMessageId: 'private-sync-note'
        }
      });
      assert.equal(sent.statusCode, 200, sent.body);

      const sync = await app.inject({ method: 'GET', url: `/api/v1/sync?cursor=${cursor}`, headers: selinaHeaders });
      assert.equal(sync.statusCode, 200, sync.body);
      const ops = (sync.json() as SyncResponse).ops;

      assert.equal(ops.some((event) => event.op.payload.chatId === chatId), false);
    } finally {
      await app.close();
    }
  });

  it('does not include users from chats outside the viewer snapshot', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'sync-users-bruce');
      const alfred = await registerUser(app, 'sync-users-alfred');
      const selina = await registerUser(app, 'sync-users-selina');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };
      const selinaHeaders = { authorization: `Bearer ${selina.accessToken}` };

      await pool.query('DELETE FROM chat_members WHERE user_id = $1', [selina.user.id]);

      const dm = await app.inject({
        method: 'POST',
        url: '/api/v1/chats/dm',
        headers: bruceHeaders,
        payload: { memberId: alfred.user.id }
      });
      assert.equal(dm.statusCode, 200, dm.body);

      const sync = await app.inject({ method: 'GET', url: '/api/v1/sync?cursor=0', headers: selinaHeaders });
      assert.equal(sync.statusCode, 200, sync.body);
      const userIds = (sync.json() as SyncResponse).ops
        .filter((event) => event.op.type === 'user.upsert')
        .map((event) => event.op.payload.id);

      assert.deepEqual(userIds, [selina.user.id]);
    } finally {
      await app.close();
    }
  });

  it('does not replay user profile events to non-members after a cursor', async () => {
    const app = await testApp();
    try {
      const selina = await registerUser(app, 'sync-profile-selina');
      const selinaHeaders = { authorization: `Bearer ${selina.accessToken}` };
      await pool.query('DELETE FROM chat_members WHERE user_id = $1', [selina.user.id]);

      const initial = await app.inject({ method: 'GET', url: '/api/v1/sync?cursor=0', headers: selinaHeaders });
      assert.equal(initial.statusCode, 200, initial.body);
      const cursor = (initial.json() as SyncResponse).nextCursor;

      const bruce = await registerUser(app, 'sync-profile-bruce');

      const sync = await app.inject({ method: 'GET', url: `/api/v1/sync?cursor=${cursor}`, headers: selinaHeaders });
      assert.equal(sync.statusCode, 200, sync.body);
      const leaked = (sync.json() as SyncResponse).ops.some((event) =>
        event.op.type === 'user.upsert' && event.op.payload.id === bruce.user.id
      );

      assert.equal(leaked, false);
    } finally {
      await app.close();
    }
  });

  it('replays folder delete tombstones after a cursor', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'sync-folder-bruce');
      const headers = { authorization: `Bearer ${bruce.accessToken}` };

      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/folders',
        headers,
        payload: { name: 'Later gone' }
      });
      assert.equal(created.statusCode, 200, created.body);
      const folderId = (created.json() as { folder: { id: string } }).folder.id;

      const initial = await app.inject({ method: 'GET', url: '/api/v1/sync?cursor=0', headers });
      assert.equal(initial.statusCode, 200, initial.body);
      const cursor = (initial.json() as SyncResponse).nextCursor;

      const deleted = await app.inject({
        method: 'DELETE',
        url: `/api/v1/folders/${folderId}`,
        headers
      });
      assert.equal(deleted.statusCode, 200, deleted.body);

      const sync = await app.inject({ method: 'GET', url: `/api/v1/sync?cursor=${cursor}`, headers });
      assert.equal(sync.statusCode, 200, sync.body);
      const ops = (sync.json() as SyncResponse).ops;

      assert.ok(ops.some((event) =>
        event.op.type === 'folder.delete' && event.op.payload.folderId === folderId
      ));
    } finally {
      await app.close();
    }
  });

  it('replays group membership add and remove tombstones to affected users', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'sync-group-bruce');
      const selina = await registerUser(app, 'sync-group-selina');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };
      const selinaHeaders = { authorization: `Bearer ${selina.accessToken}` };

      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/chats/group',
        headers: bruceHeaders,
        payload: { name: 'Private Sync Group', memberIds: [] }
      });
      assert.equal(created.statusCode, 200, created.body);
      const groupId = (created.json() as { chat: { id: string } }).chat.id;

      const channel = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${groupId}/channels`,
        headers: bruceHeaders,
        payload: { name: 'briefing' }
      });
      assert.equal(channel.statusCode, 200, channel.body);
      const channelId = (channel.json() as { channel: { id: string } }).channel.id;

      const initial = await app.inject({ method: 'GET', url: '/api/v1/sync?cursor=0', headers: selinaHeaders });
      assert.equal(initial.statusCode, 200, initial.body);
      const initialBody = initial.json() as SyncResponse;
      assert.equal(initialBody.ops.some((event) => event.op.payload.chatId === groupId || event.op.payload.id === groupId), false);
      const cursor = initialBody.nextCursor;

      const added = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${groupId}/members`,
        headers: bruceHeaders,
        payload: { memberId: selina.user.id }
      });
      assert.equal(added.statusCode, 200, added.body);

      const afterAdd = await app.inject({ method: 'GET', url: `/api/v1/sync?cursor=${cursor}`, headers: selinaHeaders });
      assert.equal(afterAdd.statusCode, 200, afterAdd.body);
      const addBody = afterAdd.json() as SyncResponse;
      assert.ok(addBody.ops.some((event) => event.op.type === 'chat.upsert' && event.op.payload.id === groupId));
      assert.ok(addBody.ops.some((event) => event.op.type === 'channel.upsert' && event.op.payload.id === channelId));

      const removed = await app.inject({
        method: 'DELETE',
        url: `/api/v1/chats/${groupId}/members/${selina.user.id}`,
        headers: bruceHeaders
      });
      assert.equal(removed.statusCode, 200, removed.body);

      const afterRemove = await app.inject({ method: 'GET', url: `/api/v1/sync?cursor=${addBody.nextCursor}`, headers: selinaHeaders });
      assert.equal(afterRemove.statusCode, 200, afterRemove.body);
      const removeOps = (afterRemove.json() as SyncResponse).ops;
      assert.ok(removeOps.some((event) => event.op.type === 'channel.delete' && event.op.payload.channelId === channelId));
      assert.ok(removeOps.some((event) => event.op.type === 'chat.delete' && event.op.payload.chatId === groupId));
    } finally {
      await app.close();
    }
  });

  it('rejects invalid cursors', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'sync-cursor-bruce');
      const headers = { authorization: `Bearer ${bruce.accessToken}` };

      const sync = await app.inject({ method: 'GET', url: '/api/v1/sync?cursor=wat', headers });
      assert.equal(sync.statusCode, 400, sync.body);
    } finally {
      await app.close();
    }
  });
});
