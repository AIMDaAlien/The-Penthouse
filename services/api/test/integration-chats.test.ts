import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, beforeEach, describe, it } from 'node:test';
import { io as connect } from 'socket.io-client';
import { closeDb } from '../src/db/pool.js';
import { registerUser, resetDb, testApp } from './helpers.js';

describe('chat integration', () => {
  beforeEach(resetDb);
  after(closeDb);

  it('lists seeded general chat and sends messages over REST', async () => {
    const app = await testApp();
    try {
      const session = await registerUser(app, 'bruce');
      const alfred = await registerUser(app, 'alfred');
      const headers = { authorization: `Bearer ${session.accessToken}` };

      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers });
      assert.equal(list.statusCode, 200, list.body);
      const chat = (list.json() as { chats: Array<{ id: string; name: string }> }).chats[0];
      assert.equal(chat.name, 'General');

      const send = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chat.id}/messages`,
        headers,
        payload: {
          chatId: chat.id,
          content: 'Evening.',
          type: 'text',
          clientMessageId: 'client-message-1'
        }
      });
      assert.equal(send.statusCode, 200, send.body);

      const messages = await app.inject({ method: 'GET', url: `/api/v1/chats/${chat.id}/messages`, headers });
      assert.equal(messages.statusCode, 200, messages.body);
      assert.equal((messages.json() as { messages: Array<{ content: string }> }).messages[0].content, 'Evening.');

      const members = await app.inject({ method: 'GET', url: `/api/v1/chats/${chat.id}/members`, headers });
      assert.equal(members.statusCode, 200, members.body);
      const memberRows = (members.json() as { members: Array<{ username: string }> }).members;
      assert.equal(memberRows.length, 2);
      assert.deepEqual(memberRows.map((member) => member.username).sort(), ['alfred', 'bruce']);

      const mention = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chat.id}/messages`,
        headers,
        payload: {
          chatId: chat.id,
          content: 'Looping in @alfred.',
          type: 'text',
          clientMessageId: 'client-message-mention'
        }
      });
      assert.equal(mention.statusCode, 200, mention.body);
      const metadata = (mention.json() as { message: { metadata?: { mentionedUserIds?: string[] } } }).message.metadata;
      assert.deepEqual(metadata?.mentionedUserIds, [alfred.user.id]);
    } finally {
      await app.close();
    }
  });

  it('pins, lists, and unpins messages over REST', async () => {
    const app = await testApp();
    try {
      const session = await registerUser(app, 'dick');
      const headers = { authorization: `Bearer ${session.accessToken}` };
      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers });
      const chat = (list.json() as { chats: Array<{ id: string }> }).chats[0];

      const sent = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chat.id}/messages`,
        headers,
        payload: {
          chatId: chat.id,
          content: 'Pin this briefing.',
          type: 'text',
          clientMessageId: 'client-message-pin-rest'
        }
      });
      assert.equal(sent.statusCode, 200, sent.body);
      const message = (sent.json() as { message: { id: string } }).message;

      const pin = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chat.id}/pins`,
        headers,
        payload: { messageId: message.id }
      });
      assert.equal(pin.statusCode, 200, pin.body);
      assert.deepEqual(
        (pin.json() as { pin: { messageId: string; content: string; senderDisplayName: string | null } }).pin,
        {
          messageId: message.id,
          content: 'Pin this briefing.',
          senderDisplayName: 'dick',
          chatId: chat.id,
          pinnedByUserId: session.user.id,
          pinnedAt: (pin.json() as { pin: { pinnedAt: string } }).pin.pinnedAt
        }
      );

      const duplicate = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chat.id}/pins`,
        headers,
        payload: { messageId: message.id }
      });
      assert.equal(duplicate.statusCode, 200, duplicate.body);
      assert.equal((duplicate.json() as { pin: { messageId: string } }).pin.messageId, message.id);

      const pins = await app.inject({ method: 'GET', url: `/api/v1/chats/${chat.id}/pins`, headers });
      assert.equal(pins.statusCode, 200, pins.body);
      const pinRows = (pins.json() as { pins: Array<{ messageId: string; content: string; message: { content: string } }> }).pins;
      assert.equal(pinRows.length, 1);
      assert.equal(pinRows[0].messageId, message.id);
      assert.equal(pinRows[0].content, 'Pin this briefing.');
      assert.equal(pinRows[0].message.content, 'Pin this briefing.');

      const unpin = await app.inject({
        method: 'DELETE',
        url: `/api/v1/chats/${chat.id}/pins/${message.id}`,
        headers
      });
      assert.equal(unpin.statusCode, 200, unpin.body);

      const afterUnpin = await app.inject({ method: 'GET', url: `/api/v1/chats/${chat.id}/pins`, headers });
      assert.equal((afterUnpin.json() as { pins: unknown[] }).pins.length, 0);
    } finally {
      await app.close();
    }
  });

  it('acks socket message.send', async () => {
    const app = await testApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    try {
      const session = await registerUser(app, 'selina');
      const headers = { authorization: `Bearer ${session.accessToken}` };
      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers });
      const chat = (list.json() as { chats: Array<{ id: string }> }).chats[0];

      const address = app.server.address() as AddressInfo;
      const socket = connect(`http://127.0.0.1:${address.port}`, {
        auth: { token: session.accessToken },
        transports: ['websocket']
      });

      const ack = await new Promise<{ payload: { clientMessageId: string; messageId: string } }>((resolve, reject) => {
        socket.on('connect', () => {
          socket.emit('chat.join', { chatId: chat.id });
          socket.emit('message.send', {
            chatId: chat.id,
            content: 'Socket hello',
            messageType: 'text',
            clientMessageId: 'client-message-2'
          });
        });
        socket.on('message.ack', resolve);
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('socket ack timeout')), 2000);
      });

      assert.equal(ack.payload.clientMessageId, 'client-message-2');

      const pinned = await new Promise<{ payload: { messageId: string; content: string; senderDisplayName: string | null } }>((resolve, reject) => {
        socket.on('message.pinned', resolve);
        socket.emit('message.pin', { messageId: ack.payload.messageId });
        setTimeout(() => reject(new Error('socket pin timeout')), 2000);
      });
      assert.equal(pinned.payload.messageId, ack.payload.messageId);
      assert.equal(pinned.payload.content, 'Socket hello');
      assert.equal(pinned.payload.senderDisplayName, 'selina');

      socket.close();
    } finally {
      await app.close();
    }
  });

  it('broadcasts message.read via socket when marking read via REST', async () => {
    const app = await testApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    try {
      const sender = await registerUser(app, 'sender');
      const reader = await registerUser(app, 'reader');
      const senderHeaders = { authorization: `Bearer ${sender.accessToken}` };
      const readerHeaders = { authorization: `Bearer ${reader.accessToken}` };

      const list = await app.inject({ method: 'GET', url: '/api/v1/chats', headers: senderHeaders });
      const chat = (list.json() as { chats: Array<{ id: string }> }).chats[0];

      const address = app.server.address() as AddressInfo;
      const senderSocket = connect(`http://127.0.0.1:${address.port}`, {
        auth: { token: sender.accessToken },
        transports: ['websocket']
      });

      // Wait for sender socket to connect and join chat
      await new Promise<void>((resolve, reject) => {
        senderSocket.on('connect', () => {
          senderSocket.emit('chat.join', { chatId: chat.id });
          resolve();
        });
        senderSocket.on('connect_error', reject);
        setTimeout(() => reject(new Error('sender socket connect timeout')), 2000);
      });

      // Send a message from sender
      const ack = await new Promise<{ payload: { messageId: string } }>((resolve, reject) => {
        senderSocket.on('message.ack', resolve);
        senderSocket.emit('message.send', {
          chatId: chat.id,
          content: 'Read me please',
          messageType: 'text',
          clientMessageId: 'client-read-test'
        });
        setTimeout(() => reject(new Error('message send timeout')), 2000);
      });

      // Set up listener for message.read on sender socket BEFORE marking read
      const readPromise = new Promise<{ payload: { chatId: string; readerUserId: string; seenThroughMessageId: string | null } }>((resolve, reject) => {
        senderSocket.on('message.read', (event: { payload: { chatId: string; readerUserId: string; seenThroughMessageId: string | null } }) => {
          resolve(event);
        });
        setTimeout(() => reject(new Error('message.read timeout')), 2000);
      });

      // Reader marks message as read via REST
      const markRead = await app.inject({
        method: 'POST',
        url: `/api/v1/chats/${chat.id}/read`,
        headers: readerHeaders,
        payload: { throughMessageId: ack.payload.messageId }
      });
      assert.equal(markRead.statusCode, 200, markRead.body);

      // Verify sender received the read receipt
      const readEvent = await readPromise;
      assert.equal(readEvent.payload.chatId, chat.id);
      assert.equal(readEvent.payload.readerUserId, reader.user.id);
      assert.equal(readEvent.payload.seenThroughMessageId, ack.payload.messageId);

      senderSocket.close();
    } finally {
      await app.close();
    }
  });
});
