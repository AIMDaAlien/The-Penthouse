import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ClientMediaConsumeEventSchema,
  ClientMediaCreateTransportEventSchema,
  ClientMediaProduceEventSchema,
  ServerMediaJoinedEventSchema,
  ServerMediaTransportCreatedEventSchema
} from '../src/media.js';

describe('media signaling contracts', () => {
  it('accepts joining and transport creation requests', () => {
    assert.equal(ClientMediaCreateTransportEventSchema.safeParse({
      type: 'media.createTransport',
      chatId: 'chat-1',
      direction: 'send'
    }).success, true);
  });

  it('accepts producer and consumer payloads with mediasoup objects', () => {
    assert.equal(ClientMediaProduceEventSchema.safeParse({
      type: 'media.produce',
      chatId: 'chat-1',
      transportId: 'transport-1',
      kind: 'video',
      source: 'camera',
      rtpParameters: { codecs: [], encodings: [] }
    }).success, true);

    assert.equal(ClientMediaConsumeEventSchema.safeParse({
      type: 'media.consume',
      chatId: 'chat-1',
      transportId: 'transport-2',
      producerId: 'producer-1',
      rtpCapabilities: { codecs: [], headerExtensions: [] }
    }).success, true);
  });

  it('validates server join and transport envelopes', () => {
    assert.equal(ServerMediaJoinedEventSchema.safeParse({
      type: 'media.joined',
      payload: {
        chatId: 'chat-1',
        routerRtpCapabilities: { codecs: [] },
        participants: [],
        producers: []
      }
    }).success, true);

    assert.equal(ServerMediaTransportCreatedEventSchema.safeParse({
      type: 'media.transportCreated',
      payload: {
        chatId: 'chat-1',
        transportId: 'transport-1',
        direction: 'recv',
        iceParameters: { usernameFragment: 'ufrag', password: 'pwd' },
        iceCandidates: [{ protocol: 'udp', ip: '127.0.0.1' }],
        dtlsParameters: { role: 'auto', fingerprints: [] }
      }
    }).success, true);
  });
});
