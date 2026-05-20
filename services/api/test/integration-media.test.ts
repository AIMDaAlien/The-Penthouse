import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/pool.js';
import { closeDb } from '../src/db/pool.js';
import { env } from '../src/config/env.js';
import { mediaUploads } from '../src/db/schema.js';
import { registerUser, resetDb, testApp } from './helpers.js';

describe('media integration', () => {
  const originalUploadDir = env.UPLOAD_DIR;
  const testUploadDir = path.join(process.cwd(), '.tmp-test-uploads');

  beforeEach(async () => {
    env.UPLOAD_DIR = testUploadDir;
    await rm(testUploadDir, { recursive: true, force: true });
    await resetDb();
  });

  after(async () => {
    await rm(testUploadDir, { recursive: true, force: true });
    env.UPLOAD_DIR = originalUploadDir;
    await closeDb();
  });

  it('keeps private uploads owner-gated while public media remains renderable', async () => {
    const app = await testApp();
    try {
      const owner = await registerUser(app, 'media-owner');
      const other = await registerUser(app, 'media-other');
      await mkdir(env.UPLOAD_DIR, { recursive: true });
      await writeFile(path.join(env.UPLOAD_DIR, 'private-note.txt'), 'private');

      const [privateUpload] = await db.insert(mediaUploads).values({
        uploaderId: owner.user.id,
        fileName: 'private-note.txt',
        originalFileName: 'private-note.txt',
        storageKey: 'private-note.txt',
        sizeBytes: 7,
        contentType: 'text/plain',
        mediaKind: 'file',
        scope: 'private'
      }).returning();

      const publicFetch = await app.inject({ method: 'GET', url: `/api/v1/media/public/${privateUpload.id}` });
      assert.equal(publicFetch.statusCode, 404, publicFetch.body);

      const ownerFetch = await app.inject({
        method: 'GET',
        url: `/api/v1/media/${privateUpload.id}`,
        headers: { authorization: `Bearer ${owner.accessToken}` }
      });
      assert.equal(ownerFetch.statusCode, 200, ownerFetch.body);
      assert.equal(ownerFetch.body, 'private');

      const otherFetch = await app.inject({
        method: 'GET',
        url: `/api/v1/media/${privateUpload.id}`,
        headers: { authorization: `Bearer ${other.accessToken}` }
      });
      assert.equal(otherFetch.statusCode, 403, otherFetch.body);

      await db.update(mediaUploads).set({ scope: 'public' }).where(eq(mediaUploads.id, privateUpload.id));
      const publicAfterScopeChange = await app.inject({ method: 'GET', url: `/api/v1/media/public/${privateUpload.id}` });
      assert.equal(publicAfterScopeChange.statusCode, 200, publicAfterScopeChange.body);
      assert.equal(publicAfterScopeChange.body, 'private');
    } finally {
      await app.close();
    }
  });

  it('rejects profile media IDs that belong to another user', async () => {
    const app = await testApp();
    try {
      const owner = await registerUser(app, 'profile-owner');
      const other = await registerUser(app, 'profile-other');

      const [upload] = await db.insert(mediaUploads).values({
        uploaderId: owner.user.id,
        fileName: 'avatar.png',
        originalFileName: 'avatar.png',
        storageKey: 'avatar.png',
        sizeBytes: 12,
        contentType: 'image/png',
        mediaKind: 'image',
        scope: 'private'
      }).returning();

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${other.accessToken}` },
        payload: { avatarUploadId: upload.id }
      });
      assert.equal(response.statusCode, 403, response.body);
    } finally {
      await app.close();
    }
  });

  it('rewrites private message media to short-lived signed URLs for render-only clients', async () => {
    const app = await testApp();
    try {
      const owner = await registerUser(app, 'signed-owner');
      const recipient = await registerUser(app, 'signed-recipient');
      const ownerHeaders = { authorization: `Bearer ${owner.accessToken}` };
      const recipientHeaders = { authorization: `Bearer ${recipient.accessToken}` };

      await mkdir(env.UPLOAD_DIR, { recursive: true });
      await writeFile(path.join(env.UPLOAD_DIR, 'voice-note.txt'), 'signed-media');
      const [upload] = await db.insert(mediaUploads).values({
        uploaderId: owner.user.id,
        fileName: 'voice-note.txt',
        originalFileName: 'voice-note.txt',
        storageKey: 'voice-note.txt',
        sizeBytes: 12,
        contentType: 'text/plain',
        mediaKind: 'file',
        scope: 'private'
      }).returning();

      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers: ownerHeaders });
      const chat = (list.json() as { chats: Array<{ id: string }> }).chats[0];
      const send = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chat.id}/messages`,
        headers: ownerHeaders,
        payload: {
          chatId: chat.id,
          content: 'Voice note',
          type: 'file',
          metadata: { url: `/api/v1/media/${upload.id}` },
          clientMessageId: 'client-message-signed-media'
        }
      });
      assert.equal(send.statusCode, 200, send.body);

      const messages = await app.inject({ method: 'GET', url: `/api/v1/chats/${chat.id}/messages`, headers: recipientHeaders });
      assert.equal(messages.statusCode, 200, messages.body);
      const [message] = (messages.json() as { messages: Array<{ metadata: { url: string } }> }).messages;
      assert.match(message.metadata.url, /\/api\/v1\/media\/signed\//);

      const signedPath = new URL(message.metadata.url, 'http://localhost').pathname;
      const signedFetch = await app.inject({ method: 'GET', url: signedPath });
      assert.equal(signedFetch.statusCode, 200, signedFetch.body);
      assert.equal(signedFetch.body, 'signed-media');
    } finally {
      await app.close();
    }
  });

  it('rejects message media references the sender cannot access', async () => {
    const app = await testApp();
    try {
      const owner = await registerUser(app, 'forbidden-media-owner');
      const other = await registerUser(app, 'forbidden-media-other');
      const otherHeaders = { authorization: `Bearer ${other.accessToken}` };

      const [upload] = await db.insert(mediaUploads).values({
        uploaderId: owner.user.id,
        fileName: 'private.bin',
        originalFileName: 'private.bin',
        storageKey: 'private.bin',
        sizeBytes: 4,
        contentType: 'application/octet-stream',
        mediaKind: 'file',
        scope: 'private'
      }).returning();

      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers: otherHeaders });
      const chat = (list.json() as { chats: Array<{ id: string }> }).chats[0];
      const send = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chat.id}/messages`,
        headers: otherHeaders,
        payload: {
          chatId: chat.id,
          content: 'Nope',
          type: 'file',
          metadata: { url: `/api/v1/media/${upload.id}` },
          clientMessageId: 'client-message-forbidden-media'
        }
      });
      assert.equal(send.statusCode, 403, send.body);
    } finally {
      await app.close();
    }
  });
});
