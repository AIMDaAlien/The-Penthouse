import type { FastifyInstance } from 'fastify';
import type { Server, Socket } from 'socket.io';
import {
  ClientMediaCloseProducerEventSchema,
  ClientMediaConnectTransportEventSchema,
  ClientMediaConsumeEventSchema,
  ClientMediaCreateTransportEventSchema,
  ClientMediaJoinEventSchema,
  ClientMediaLeaveEventSchema,
  ClientMediaProduceEventSchema,
  ClientMediaResumeConsumerEventSchema
} from '@penthouse/contracts';
import { assertChatMember } from '../utils/messages.js';
import { MediaRoomError, mediasoupRooms } from './mediasoup.js';

function mediaRoomKey(chatId: string) {
  return `media:${chatId}`;
}

function emitMediaError(socket: Socket, requestType: string | undefined, error: unknown) {
  const structuredCode = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : null;
  const code = error instanceof MediaRoomError ? error.code : structuredCode ?? (error instanceof Error ? error.name : 'MEDIA_ERROR');
  const message = error instanceof Error ? error.message : 'Media signaling failed';
  socket.emit('media.error', {
    type: 'media.error',
    payload: {
      code,
      message,
      ...(requestType ? { requestType } : {})
    }
  });
}

function broadcastLeaveResult(socket: Socket, result: ReturnType<typeof mediasoupRooms.leaveAllForSocket>) {
  for (const producer of result.closedProducers) {
    socket.to(mediaRoomKey(producer.chatId)).emit('media.producerClosed', {
      type: 'media.producerClosed',
      payload: producer
    });
  }

  for (const room of result.leftRooms) {
    socket.to(mediaRoomKey(room.chatId)).emit('media.participantLeft', {
      type: 'media.participantLeft',
      payload: room
    });
  }
}

async function guardedMedia(socket: Socket, requestType: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    emitMediaError(socket, requestType, error);
  }
}

export function registerMediaSignaling(socket: Socket, io: Server, fastify: FastifyInstance) {
  socket.on('media.join', (payload) => guardedMedia(socket, 'media.join', async () => {
    const parsed = ClientMediaJoinEventSchema.parse({ type: 'media.join', ...payload });
    const { chatId } = await assertChatMember(parsed.chatId, socket.data.userId);
    socket.join(mediaRoomKey(chatId));

    const joined = await mediasoupRooms.joinRoom({
      chatId,
      socketId: socket.id,
      userId: socket.data.userId,
      displayName: socket.data.username
    });

    socket.emit('media.joined', {
      type: 'media.joined',
      payload: joined
    });
  }));

  socket.on('media.leave', (payload) => guardedMedia(socket, 'media.leave', async () => {
    const parsed = ClientMediaLeaveEventSchema.parse({ type: 'media.leave', ...payload });
    const { chatId } = await assertChatMember(parsed.chatId, socket.data.userId);
    const result = mediasoupRooms.leaveRoom(chatId, socket.id);
    socket.leave(mediaRoomKey(chatId));
    broadcastLeaveResult(socket, result);
  }));

  socket.on('media.createTransport', (payload) => guardedMedia(socket, 'media.createTransport', async () => {
    const parsed = ClientMediaCreateTransportEventSchema.parse({ type: 'media.createTransport', ...payload });
    const { chatId } = await assertChatMember(parsed.chatId, socket.data.userId);
    const transport = await mediasoupRooms.createTransport({
      chatId,
      socketId: socket.id,
      userId: socket.data.userId,
      direction: parsed.direction
    });
    socket.emit('media.transportCreated', {
      type: 'media.transportCreated',
      payload: transport
    });
  }));

  socket.on('media.connectTransport', (payload) => guardedMedia(socket, 'media.connectTransport', async () => {
    const parsed = ClientMediaConnectTransportEventSchema.parse({ type: 'media.connectTransport', ...payload });
    const { chatId } = await assertChatMember(parsed.chatId, socket.data.userId);
    await mediasoupRooms.connectTransport({
      chatId,
      socketId: socket.id,
      transportId: parsed.transportId,
      dtlsParameters: parsed.dtlsParameters
    });
    socket.emit('media.transportConnected', {
      type: 'media.transportConnected',
      payload: {
        chatId,
        transportId: parsed.transportId
      }
    });
  }));

  socket.on('media.produce', (payload) => guardedMedia(socket, 'media.produce', async () => {
    const parsed = ClientMediaProduceEventSchema.parse({ type: 'media.produce', ...payload });
    const { chatId } = await assertChatMember(parsed.chatId, socket.data.userId);
    const producer = await mediasoupRooms.produce({
      chatId,
      socketId: socket.id,
      transportId: parsed.transportId,
      kind: parsed.kind,
      source: parsed.source,
      rtpParameters: parsed.rtpParameters
    });
    socket.emit('media.produced', {
      type: 'media.produced',
      payload: producer
    });
    socket.to(mediaRoomKey(chatId)).emit('media.producerAdded', {
      type: 'media.producerAdded',
      payload: producer
    });
  }));

  socket.on('media.consume', (payload) => guardedMedia(socket, 'media.consume', async () => {
    const parsed = ClientMediaConsumeEventSchema.parse({ type: 'media.consume', ...payload });
    const { chatId } = await assertChatMember(parsed.chatId, socket.data.userId);
    const consumer = await mediasoupRooms.consume({
      chatId,
      socketId: socket.id,
      userId: socket.data.userId,
      transportId: parsed.transportId,
      producerId: parsed.producerId,
      rtpCapabilities: parsed.rtpCapabilities
    });
    socket.emit('media.consumerReady', {
      type: 'media.consumerReady',
      payload: consumer
    });
  }));

  socket.on('media.resumeConsumer', (payload) => guardedMedia(socket, 'media.resumeConsumer', async () => {
    const parsed = ClientMediaResumeConsumerEventSchema.parse({ type: 'media.resumeConsumer', ...payload });
    const { chatId } = await assertChatMember(parsed.chatId, socket.data.userId);
    await mediasoupRooms.resumeConsumer({
      chatId,
      socketId: socket.id,
      consumerId: parsed.consumerId
    });
    socket.emit('media.consumerResumed', {
      type: 'media.consumerResumed',
      payload: {
        chatId,
        consumerId: parsed.consumerId
      }
    });
  }));

  socket.on('media.closeProducer', (payload) => guardedMedia(socket, 'media.closeProducer', async () => {
    const parsed = ClientMediaCloseProducerEventSchema.parse({ type: 'media.closeProducer', ...payload });
    const { chatId } = await assertChatMember(parsed.chatId, socket.data.userId);
    const producer = mediasoupRooms.closeProducer({
      chatId,
      socketId: socket.id,
      producerId: parsed.producerId
    });
    io.to(mediaRoomKey(chatId)).emit('media.producerClosed', {
      type: 'media.producerClosed',
      payload: producer
    });
  }));

  fastify.log.trace({ userId: socket.data.userId }, 'registered media signaling handlers');
}

export function closeSocketMediaSessions(socket: Socket) {
  const result = mediasoupRooms.leaveAllForSocket(socket.id);
  broadcastLeaveResult(socket, result);
}
