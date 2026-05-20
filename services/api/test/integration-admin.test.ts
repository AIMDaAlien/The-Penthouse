import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import {
  AdminInviteResponseSchema,
  AdminMemberSummarySchema,
  AdminOperatorSummarySchema
} from '@penthouse/contracts';
import { closeDb } from '../src/db/pool.js';
import { registerUser, resetDb, testApp } from './helpers.js';

describe('admin integration', () => {
  beforeEach(resetDb);
  after(closeDb);

  it('guards admin routes and returns contract-shaped summary, members, and invites', async () => {
    const app = await testApp();
    try {
      const admin = await registerUser(app, 'adminuser');
      const member = await registerUser(app, 'memberuser');

      const denied = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/summary',
        headers: { authorization: `Bearer ${member.accessToken}` }
      });
      assert.equal(denied.statusCode, 403, denied.body);

      const adminHeaders = { authorization: `Bearer ${admin.accessToken}` };
      const summary = await app.inject({ method: 'GET', url: '/api/v1/admin/summary', headers: adminHeaders });
      assert.equal(summary.statusCode, 200, summary.body);
      assert.equal(AdminOperatorSummarySchema.safeParse(summary.json()).success, true);

      const members = await app.inject({ method: 'GET', url: '/api/v1/admin/members', headers: adminHeaders });
      assert.equal(members.statusCode, 200, members.body);
      const memberBody = members.json() as { members: unknown[] };
      assert.equal(memberBody.members.length, 2);
      assert.equal(AdminMemberSummarySchema.safeParse(memberBody.members[0]).success, true);

      const invite = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/invites',
        headers: adminHeaders,
        payload: { label: 'QA invite', maxUses: 5 }
      });
      assert.equal(invite.statusCode, 200, invite.body);
      assert.equal(AdminInviteResponseSchema.safeParse(invite.json()).success, true);

      const invites = await app.inject({ method: 'GET', url: '/api/v1/admin/invites', headers: adminHeaders });
      assert.equal(invites.statusCode, 200, invites.body);
      assert.ok((invites.json() as { invites: unknown[] }).invites.length >= 2);
    } finally {
      await app.close();
    }
  });

  it('records hide and unhide moderation events for messages', async () => {
    const app = await testApp();
    try {
      const admin = await registerUser(app, 'moderator');
      const headers = { authorization: `Bearer ${admin.accessToken}` };
      const chatList = await app.inject({ method: 'GET', url: '/api/v1/chats', headers });
      const chatId = (chatList.json() as { chats: Array<{ id: string }> }).chats[0].id;

      const sent = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chatId}/messages`,
        headers,
        payload: {
          chatId,
          content: 'Moderate this',
          type: 'text',
          clientMessageId: 'moderation-message-1'
        }
      });
      assert.equal(sent.statusCode, 200, sent.body);
      const messageId = (sent.json() as { message: { id: string } }).message.id;

      const hide = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/moderate/${messageId}`,
        headers,
        payload: { reason: 'Test hide' }
      });
      assert.equal(hide.statusCode, 200, hide.body);
      assert.equal(hide.json().action, 'hide');

      const unhide = await app.inject({
        method: 'POST',
        url: `/api/v1/admin/moderate/${messageId}?action=unhide`,
        headers,
        payload: { reason: 'Test unhide' }
      });
      assert.equal(unhide.statusCode, 200, unhide.body);
      assert.equal(unhide.json().action, 'unhide');
    } finally {
      await app.close();
    }
  });
});
