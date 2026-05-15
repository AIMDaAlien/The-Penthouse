import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, beforeEach, describe, it } from 'node:test';
import { io as connect } from 'socket.io-client';
import { closeDb } from '../src/db/pool.js';
import { env } from '../src/config/env.js';
import { registerUser, resetDb, testApp } from './helpers.js';

describe('media signaling integration', () => {
  beforeEach(resetDb);
  after(closeDb);

  it('rejects an invalid mediasoup port range at startup', async () => {
    const previousMin = env.MEDIASOUP_MIN_PORT;
    const previousMax = env.MEDIASOUP_MAX_PORT;
    try {
      env.MEDIASOUP_MIN_PORT = 20_000;
      env.MEDIASOUP_MAX_PORT = 10_000;
      await assert.rejects(testApp(), { name: 'MEDIA_PORT_RANGE_INVALID' });
    } finally {
      env.MEDIASOUP_MIN_PORT = previousMin;
      env.MEDIASOUP_MAX_PORT = previousMax;
    }
  });

  it('joins a media room and creates a mediasoup WebRTC transport', async () => {
    const app = await testApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    try {
      const session = await registerUser(app, 'mediauser');
      const headers = { authorization: `Bearer ${session.accessToken}` };
      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers });
      assert.equal(list.statusCode, 200, list.body);
      const chat = (list.json() as { chats: Array<{ id: string }> }).chats[0];

      const address = app.server.address() as AddressInfo;
      const socket = connect(`http://127.0.0.1:${address.port}`, {
        auth: { token: session.accessToken },
        transports: ['websocket']
      });

      const joined = await new Promise<{
        payload: {
          chatId: string;
          routerRtpCapabilities: { codecs?: unknown[] };
          participants: unknown[];
          producers: unknown[];
        };
      }>((resolve, reject) => {
        socket.on('connect', () => {
          socket.emit('media.join', { chatId: chat.id });
        });
        socket.on('media.joined', resolve);
        socket.on('media.error', reject);
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('media.join timeout')), 3000);
      });

      assert.equal(joined.payload.chatId, chat.id);
      assert.ok(Array.isArray(joined.payload.routerRtpCapabilities.codecs));
      assert.deepEqual(joined.payload.participants, []);
      assert.deepEqual(joined.payload.producers, []);

      const transport = await new Promise<{
        payload: {
          chatId: string;
          transportId: string;
          direction: string;
          iceParameters: { usernameFragment?: string };
          iceCandidates: unknown[];
          dtlsParameters: { fingerprints?: unknown[] };
        };
      }>((resolve, reject) => {
        socket.on('media.transportCreated', resolve);
        socket.on('media.error', reject);
        socket.emit('media.createTransport', { chatId: chat.id, direction: 'send' });
        setTimeout(() => reject(new Error('media.createTransport timeout')), 3000);
      });

      assert.equal(transport.payload.chatId, chat.id);
      assert.equal(transport.payload.direction, 'send');
      assert.ok(transport.payload.transportId.length > 0);
      assert.ok(transport.payload.iceParameters.usernameFragment);
      assert.ok(Array.isArray(transport.payload.iceCandidates));
      assert.ok(Array.isArray(transport.payload.dtlsParameters.fingerprints));

      socket.close();
    } finally {
      await app.close();
    }
  });

  it('rejects media room joins when the user cannot see the chat', async () => {
    const app = await testApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    try {
      const session = await registerUser(app, 'outsider');
      const address = app.server.address() as AddressInfo;
      const socket = connect(`http://127.0.0.1:${address.port}`, {
        auth: { token: session.accessToken },
        transports: ['websocket']
      });

      const error = await new Promise<{ payload: { code: string; requestType?: string } }>((resolve, reject) => {
        socket.on('connect', () => {
          socket.emit('media.join', { chatId: '550e8400-e29b-41d4-a716-446655440000' });
        });
        socket.on('media.error', resolve);
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('media.error timeout')), 2000);
      });

      assert.equal(error.payload.code, 'CHAT_FORBIDDEN');
      assert.equal(error.payload.requestType, 'media.join');

      socket.close();
    } finally {
      await app.close();
    }
  });
});
