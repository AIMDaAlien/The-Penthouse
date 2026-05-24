import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { closeDb } from '../src/db/pool.js';
import { registerUser, resetDb, testApp } from './helpers.js';

describe('message security integration', () => {
  beforeEach(resetDb);
  after(closeDb);

  it('rejects search queries over 100 characters', async () => {
    const app = await testApp();
    try {
      const session = await registerUser(app, 'searcher');
      const headers = { authorization: `Bearer ${session.accessToken}` };
      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers });
      const chat = (list.json() as { chats: Array<{ id: string }> }).chats[0];

      const search = await app.inject({
        method: 'GET',
        url: `/api/v1/chats/${chat.id}/messages/search`,
        headers,
        query: { q: 'a'.repeat(101) }
      });
      assert.equal(search.statusCode, 400, search.body);
      const body = search.json() as { code: string; message: string };
      assert.equal(body.code, 'VALIDATION_ERROR');
      assert.ok(body.message.includes('too long'));
    } finally {
      await app.close();
    }
  });

  it('sanitizes script tags from message content on creation', async () => {
    const app = await testApp();
    try {
      const session = await registerUser(app, 'sender');
      const headers = { authorization: `Bearer ${session.accessToken}` };
      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers });
      const chat = (list.json() as { chats: Array<{ id: string }> }).chats[0];

      const send = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chat.id}/messages`,
        headers,
        payload: {
          chatId: chat.id,
          content: '<script>alert(1)</script>hello',
          type: 'text',
          clientMessageId: 'client-xss-1'
        }
      });
      assert.equal(send.statusCode, 200, send.body);
      const message = (send.json() as { message: { content: string } }).message;
      assert.ok(!message.content.includes('<script>'), `expected script tag to be stripped, got: ${message.content}`);
      assert.ok(message.content.includes('hello'), `expected safe text to remain, got: ${message.content}`);
    } finally {
      await app.close();
    }
  });

  it('sanitizes script tags from message content on edit', async () => {
    const app = await testApp();
    try {
      const session = await registerUser(app, 'editor');
      const headers = { authorization: `Bearer ${session.accessToken}` };
      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers });
      const chat = (list.json() as { chats: Array<{ id: string }> }).chats[0];

      const send = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chat.id}/messages`,
        headers,
        payload: {
          chatId: chat.id,
          content: 'original',
          type: 'text',
          clientMessageId: 'client-xss-2'
        }
      });
      assert.equal(send.statusCode, 200, send.body);
      const messageId = (send.json() as { message: { id: string } }).message.id;

      const edit = await app.inject({
        method: 'PATCH',
        url: `/api/v1/messages/${messageId}`,
        headers,
        payload: { content: '<script>alert(1)</script>edited' }
      });
      assert.equal(edit.statusCode, 200, edit.body);
      const edited = (edit.json() as { message: { content: string } }).message;
      assert.ok(!edited.content.includes('<script>'), `expected script tag to be stripped on edit, got: ${edited.content}`);
      assert.ok(edited.content.includes('edited'), `expected safe text to remain after edit, got: ${edited.content}`);
    } finally {
      await app.close();
    }
  });
});
