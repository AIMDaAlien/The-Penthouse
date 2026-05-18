import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { closeDb } from '../src/db/pool.js';
import { registerUser, resetDb, testApp } from './helpers.js';

describe('group chat integration', () => {
  beforeEach(resetDb);
  after(closeDb);

  it('lists seeded General as a group and manages group members', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'group-bruce');
      const alfred = await registerUser(app, 'group-alfred');
      const selina = await registerUser(app, 'group-selina');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };
      const alfredHeaders = { authorization: `Bearer ${alfred.accessToken}` };
      const selinaHeaders = { authorization: `Bearer ${selina.accessToken}` };

      const initialList = await app.inject({ method: 'GET', url: '/api/v1/chats', headers: bruceHeaders });
      assert.equal(initialList.statusCode, 200, initialList.body);
      const general = (initialList.json() as { chats: Array<{ name: string; type: string }> }).chats
        .find((chat) => chat.name === 'General');
      assert.equal(general?.type, 'group');

      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/chats/group',
        headers: bruceHeaders,
        payload: { name: 'Wayne Ops', memberIds: [alfred.user.id] }
      });
      assert.equal(created.statusCode, 200, created.body);
      const group = (created.json() as { chat: { id: string; name: string; type: string } }).chat;
      assert.equal(group.name, 'Wayne Ops');
      assert.equal(group.type, 'group');

      const members = await app.inject({ method: 'GET', url: `/api/v1/chats/${group.id}/members`, headers: bruceHeaders });
      assert.equal(members.statusCode, 200, members.body);
      const memberRows = (members.json() as { members: Array<{ id: string; role: string }> }).members;
      assert.equal(memberRows.find((member) => member.id === bruce.user.id)?.role, 'owner');
      assert.equal(memberRows.find((member) => member.id === alfred.user.id)?.role, 'member');

      const selinaBefore = await app.inject({ method: 'GET', url: '/api/v1/chats', headers: selinaHeaders });
      assert.equal((selinaBefore.json() as { chats: Array<{ id: string }> }).chats.some((chat) => chat.id === group.id), false);

      const addSelina = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${group.id}/members`,
        headers: bruceHeaders,
        payload: { memberId: selina.user.id, role: 'admin' }
      });
      assert.equal(addSelina.statusCode, 200, addSelina.body);

      const selinaAfter = await app.inject({ method: 'GET', url: '/api/v1/chats', headers: selinaHeaders });
      assert.equal((selinaAfter.json() as { chats: Array<{ id: string }> }).chats.some((chat) => chat.id === group.id), true);

      const promoteAlfred = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${group.id}/members`,
        headers: bruceHeaders,
        payload: { memberId: alfred.user.id, role: 'admin' }
      });
      assert.equal(promoteAlfred.statusCode, 200, promoteAlfred.body);

      const removeLastOwner = await app.inject({
        method: 'DELETE',
        url: `/api/v1/chats/${group.id}/members/${bruce.user.id}`,
        headers: alfredHeaders
      });
      assert.equal(removeLastOwner.statusCode, 400, removeLastOwner.body);

      const removeSelina = await app.inject({
        method: 'DELETE',
        url: `/api/v1/chats/${group.id}/members/${selina.user.id}`,
        headers: bruceHeaders
      });
      assert.equal(removeSelina.statusCode, 200, removeSelina.body);

      const selinaFinal = await app.inject({ method: 'GET', url: '/api/v1/chats', headers: selinaHeaders });
      assert.equal((selinaFinal.json() as { chats: Array<{ id: string }> }).chats.some((chat) => chat.id === group.id), false);
    } finally {
      await app.close();
    }
  });

  it('renames and deletes channels and groups through manager permissions', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'manage-bruce');
      const alfred = await registerUser(app, 'manage-alfred');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };
      const alfredHeaders = { authorization: `Bearer ${alfred.accessToken}` };

      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/chats/group',
        headers: bruceHeaders,
        payload: { name: 'Belfry', memberIds: [alfred.user.id] }
      });
      assert.equal(created.statusCode, 200, created.body);
      const group = (created.json() as { chat: { id: string } }).chat;

      const createChannel = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${group.id}/channels`,
        headers: bruceHeaders,
        payload: { name: 'ops' }
      });
      assert.equal(createChannel.statusCode, 200, createChannel.body);
      const channel = (createChannel.json() as { channel: { id: string; parentChatId: string } }).channel;
      assert.equal(channel.parentChatId, group.id);

      const memberRename = await app.inject({
        method: 'PATCH',
        url: `/api/v1/chats/${channel.id}`,
        headers: alfredHeaders,
        payload: { name: 'briefing' }
      });
      assert.equal(memberRename.statusCode, 403, memberRename.body);

      const rename = await app.inject({
        method: 'PATCH',
        url: `/api/v1/chats/${channel.id}`,
        headers: bruceHeaders,
        payload: { name: 'briefing' }
      });
      assert.equal(rename.statusCode, 200, rename.body);
      assert.equal((rename.json() as { channel: { name: string } }).channel.name, 'briefing');

      const deleteChannel = await app.inject({
        method: 'DELETE',
        url: `/api/v1/chats/${channel.id}`,
        headers: bruceHeaders
      });
      assert.equal(deleteChannel.statusCode, 200, deleteChannel.body);

      const channels = await app.inject({ method: 'GET', url: `/api/v1/chats/${group.id}/channels`, headers: bruceHeaders });
      assert.equal((channels.json() as { channels: unknown[] }).channels.length, 0);

      const deleteGroup = await app.inject({
        method: 'DELETE',
        url: `/api/v1/chats/${group.id}`,
        headers: bruceHeaders
      });
      assert.equal(deleteGroup.statusCode, 200, deleteGroup.body);

      const bruceList = await app.inject({ method: 'GET', url: '/api/v1/chats', headers: bruceHeaders });
      assert.equal((bruceList.json() as { chats: Array<{ id: string }> }).chats.some((chat) => chat.id === group.id), false);
    } finally {
      await app.close();
    }
  });

  it('archives and unarchives chats without hard deleting DMs', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'archive-bruce');
      const alfred = await registerUser(app, 'archive-alfred');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };
      const alfredHeaders = { authorization: `Bearer ${alfred.accessToken}` };

      const dm = await app.inject({
        method: 'POST',
        url: '/api/v1/chats/dm',
        headers: bruceHeaders,
        payload: { memberId: alfred.user.id }
      });
      assert.equal(dm.statusCode, 200, dm.body);
      const chatId = (dm.json() as { chatId: string }).chatId;

      const archive = await app.inject({ method: 'POST', url: `/api/v1/chats/${chatId}/archive`, headers: bruceHeaders });
      assert.equal(archive.statusCode, 200, archive.body);
      assert.ok((archive.json() as { archivedAt: string | null }).archivedAt);

      const unarchive = await app.inject({ method: 'POST', url: `/api/v1/chats/${chatId}/unarchive`, headers: bruceHeaders });
      assert.equal(unarchive.statusCode, 200, unarchive.body);
      assert.equal((unarchive.json() as { archivedAt: string | null }).archivedAt, null);

      const deleteDm = await app.inject({ method: 'DELETE', url: `/api/v1/chats/${chatId}`, headers: bruceHeaders });
      assert.equal(deleteDm.statusCode, 200, deleteDm.body);
      assert.ok((deleteDm.json() as { archivedAt: string | null }).archivedAt);

      const recreate = await app.inject({
        method: 'POST',
        url: '/api/v1/chats/dm',
        headers: alfredHeaders,
        payload: { memberId: bruce.user.id }
      });
      assert.equal(recreate.statusCode, 200, recreate.body);
      assert.equal((recreate.json() as { chatId: string }).chatId, chatId);
    } finally {
      await app.close();
    }
  });
});
