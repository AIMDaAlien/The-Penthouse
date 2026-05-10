import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { closeDb } from '../src/db/pool.js';
import { registerUser, resetDb, testApp } from './helpers.js';

describe('folder integration', () => {
  beforeEach(resetDb);
  after(closeDb);

  it('creates, lists, updates, and deletes a folder', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'bruce');
      const headers = { authorization: `Bearer ${bruce.accessToken}` };

      const create = await app.inject({
        method: 'POST',
        url: '/api/v1/folders',
        headers,
        payload: { name: 'Work' }
      });
      assert.equal(create.statusCode, 200, create.body);
      const folder = (create.json() as { folder: { id: string; name: string } }).folder;
      assert.ok(folder.id, 'folder should have an id');
      assert.equal(folder.name, 'Work');

      const list = await app.inject({ method: 'GET', url: '/api/v1/folders', headers });
      assert.equal(list.statusCode, 200, list.body);
      const folders = (list.json() as { folders: Array<{ id: string; name: string; items: unknown[] }> }).folders;
      assert.equal(folders.length, 1);
      assert.equal(folders[0].name, 'Work');
      assert.equal(folders[0].items.length, 0);

      const update = await app.inject({
        method: 'PATCH',
        url: `/api/v1/folders/${folder.id}`,
        headers,
        payload: { name: 'Personal' }
      });
      assert.equal(update.statusCode, 200, update.body);
      assert.equal((update.json() as { folder: { name: string } }).folder.name, 'Personal');

      const del = await app.inject({
        method: 'DELETE',
        url: `/api/v1/folders/${folder.id}`,
        headers
      });
      assert.equal(del.statusCode, 200, del.body);

      const afterDelete = await app.inject({ method: 'GET', url: '/api/v1/folders', headers });
      assert.equal(afterDelete.statusCode, 200, afterDelete.body);
      assert.equal((afterDelete.json() as { folders: unknown[] }).folders.length, 0);
    } finally {
      await app.close();
    }
  });

  it('adds and removes a chat from a folder', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'bruce');
      const alfred = await registerUser(app, 'alfred');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };

      const dm = await app.inject({
        method: 'POST',
        url: '/api/v1/chats/dm',
        headers: bruceHeaders,
        payload: { memberId: alfred.user.id }
      });
      assert.equal(dm.statusCode, 200, dm.body);
      const dmChatId = (dm.json() as { chatId: string }).chatId;

      const folderCreate = await app.inject({
        method: 'POST',
        url: '/api/v1/folders',
        headers: bruceHeaders,
        payload: { name: 'DMs' }
      });
      assert.equal(folderCreate.statusCode, 200, folderCreate.body);
      const folderId = (folderCreate.json() as { folder: { id: string } }).folder.id;

      const add = await app.inject({
        method: 'POST',
        url: `/api/v1/folders/${folderId}/items`,
        headers: bruceHeaders,
        payload: { chatId: dmChatId }
      });
      assert.equal(add.statusCode, 200, add.body);

      const list = await app.inject({ method: 'GET', url: '/api/v1/folders', headers: bruceHeaders });
      assert.equal(list.statusCode, 200, list.body);
      const folders = (list.json() as { folders: Array<{ items: Array<{ chatId: string }> }> }).folders;
      assert.equal(folders.length, 1);
      assert.equal(folders[0].items.length, 1);
      assert.equal(folders[0].items[0].chatId, dmChatId);

      const remove = await app.inject({
        method: 'DELETE',
        url: `/api/v1/folders/${folderId}/items/${dmChatId}`,
        headers: bruceHeaders
      });
      assert.equal(remove.statusCode, 200, remove.body);

      const afterRemove = await app.inject({ method: 'GET', url: '/api/v1/folders', headers: bruceHeaders });
      assert.equal((afterRemove.json() as { folders: Array<{ items: unknown[] }> }).folders[0].items.length, 0);
    } finally {
      await app.close();
    }
  });

  it('keeps adding the same chat to a folder idempotent', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'bruce');
      const alfred = await registerUser(app, 'alfred');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };

      const dm = await app.inject({
        method: 'POST',
        url: '/api/v1/chats/dm',
        headers: bruceHeaders,
        payload: { memberId: alfred.user.id }
      });
      assert.equal(dm.statusCode, 200, dm.body);
      const dmChatId = (dm.json() as { chatId: string }).chatId;

      const folderCreate = await app.inject({
        method: 'POST',
        url: '/api/v1/folders',
        headers: bruceHeaders,
        payload: { name: 'DMs' }
      });
      assert.equal(folderCreate.statusCode, 200, folderCreate.body);
      const folderId = (folderCreate.json() as { folder: { id: string } }).folder.id;

      for (let i = 0; i < 2; i += 1) {
        const add = await app.inject({
          method: 'POST',
          url: `/api/v1/folders/${folderId}/items`,
          headers: bruceHeaders,
          payload: { chatId: dmChatId }
        });
        assert.equal(add.statusCode, 200, add.body);
      }

      const list = await app.inject({ method: 'GET', url: '/api/v1/folders', headers: bruceHeaders });
      assert.equal(list.statusCode, 200, list.body);
      const folders = (list.json() as { folders: Array<{ items: Array<{ chatId: string }> }> }).folders;
      assert.equal(folders[0].items.length, 1);
      assert.equal(folders[0].items[0].chatId, dmChatId);
    } finally {
      await app.close();
    }
  });

  it('returns 404 for cross-user folder access', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'bruce');
      const selina = await registerUser(app, 'selina');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };
      const selinaHeaders = { authorization: `Bearer ${selina.accessToken}` };

      const folderCreate = await app.inject({
        method: 'POST',
        url: '/api/v1/folders',
        headers: bruceHeaders,
        payload: { name: 'Secret' }
      });
      assert.equal(folderCreate.statusCode, 200, folderCreate.body);
      const folderId = (folderCreate.json() as { folder: { id: string } }).folder.id;

      const patch = await app.inject({
        method: 'PATCH',
        url: `/api/v1/folders/${folderId}`,
        headers: selinaHeaders,
        payload: { name: 'Hacked' }
      });
      assert.equal(patch.statusCode, 404, patch.body);

      const del = await app.inject({
        method: 'DELETE',
        url: `/api/v1/folders/${folderId}`,
        headers: selinaHeaders
      });
      assert.equal(del.statusCode, 404, del.body);

      const addItem = await app.inject({
        method: 'POST',
        url: `/api/v1/folders/${folderId}/items`,
        headers: selinaHeaders,
        payload: { chatId: '00000000-0000-0000-0000-000000000000' }
      });
      assert.equal(addItem.statusCode, 404, addItem.body);
    } finally {
      await app.close();
    }
  });

  it('forbids adding a non-member chat to a folder', async () => {
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

      const folderCreate = await app.inject({
        method: 'POST',
        url: '/api/v1/folders',
        headers: selinaHeaders,
        payload: { name: 'My Folder' }
      });
      assert.equal(folderCreate.statusCode, 200, folderCreate.body);
      const folderId = (folderCreate.json() as { folder: { id: string } }).folder.id;

      const add = await app.inject({
        method: 'POST',
        url: `/api/v1/folders/${folderId}/items`,
        headers: selinaHeaders,
        payload: { chatId: dmChatId }
      });
      assert.equal(add.statusCode, 403, add.body);
    } finally {
      await app.close();
    }
  });

  it('reorders folders', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'bruce');
      const selina = await registerUser(app, 'selina');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };
      const selinaHeaders = { authorization: `Bearer ${selina.accessToken}` };

      const names = ['A', 'B', 'C'];
      const folderIds: string[] = [];
      for (const name of names) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/folders',
          headers: bruceHeaders,
          payload: { name }
        });
        assert.equal(res.statusCode, 200, res.body);
        folderIds.push((res.json() as { folder: { id: string } }).folder.id);
      }

      const reorder = await app.inject({
        method: 'PATCH',
        url: '/api/v1/folders/reorder',
        headers: bruceHeaders,
        payload: {
          folders: [
            { id: folderIds[0], sortOrder: 3 },
            { id: folderIds[1], sortOrder: 1 },
            { id: folderIds[2], sortOrder: 2 }
          ]
        }
      });
      assert.equal(reorder.statusCode, 200, reorder.body);

      const list = await app.inject({ method: 'GET', url: '/api/v1/folders', headers: bruceHeaders });
      assert.equal(list.statusCode, 200, list.body);
      const ordered = (list.json() as { folders: Array<{ name: string }> }).folders;
      assert.deepEqual(ordered.map((f) => f.name), ['B', 'C', 'A']);

      const stealReorder = await app.inject({
        method: 'PATCH',
        url: '/api/v1/folders/reorder',
        headers: selinaHeaders,
        payload: {
          folders: [
            { id: folderIds[0], sortOrder: 1 }
          ]
        }
      });
      assert.equal(stealReorder.statusCode, 404, stealReorder.body);
    } finally {
      await app.close();
    }
  });
});
