import * as mediasoup from 'mediasoup';
import type { types as mediasoupTypes } from 'mediasoup';
import { env } from '../config/env.js';

export class MediaRoomError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = code;
  }
}

type MediaKind = 'audio' | 'video';
type MediaSource = 'microphone' | 'camera' | 'screen';
type TransportDirection = 'send' | 'recv';

export interface ProducerSummary {
  chatId: string;
  userId: string;
  producerId: string;
  kind: MediaKind;
  source: MediaSource;
}

export interface ParticipantSummary {
  userId: string;
  displayName: string;
  producers: ProducerSummary[];
}

interface ParticipantState {
  socketId: string;
  userId: string;
  displayName: string;
  transports: Set<string>;
  producers: Set<string>;
  consumers: Set<string>;
}

interface TransportState {
  chatId: string;
  socketId: string;
  userId: string;
  direction: TransportDirection;
  transport: mediasoupTypes.WebRtcTransport;
}

interface ProducerState extends ProducerSummary {
  socketId: string;
  producer: mediasoupTypes.Producer;
}

interface ConsumerState {
  chatId: string;
  socketId: string;
  userId: string;
  consumer: mediasoupTypes.Consumer;
  producerId: string;
}

interface RoomState {
  chatId: string;
  router: mediasoupTypes.Router;
  participants: Map<string, ParticipantState>;
  transports: Map<string, TransportState>;
  producers: Map<string, ProducerState>;
  consumers: Map<string, ConsumerState>;
}

export interface JoinRoomResult {
  chatId: string;
  routerRtpCapabilities: Record<string, unknown>;
  participants: ParticipantSummary[];
  producers: ProducerSummary[];
}

export interface CreateTransportResult {
  chatId: string;
  transportId: string;
  direction: TransportDirection;
  iceParameters: Record<string, unknown>;
  iceCandidates: Record<string, unknown>[];
  dtlsParameters: Record<string, unknown>;
}

export interface ConsumeResult {
  chatId: string;
  consumerId: string;
  producerId: string;
  userId: string;
  kind: MediaKind;
  source: MediaSource;
  rtpParameters: Record<string, unknown>;
  producerPaused: boolean;
}

export interface LeaveRoomResult {
  leftRooms: Array<{ chatId: string; userId: string }>;
  closedProducers: Array<{ chatId: string; userId: string; producerId: string }>;
}

const MEDIA_CODECS: mediasoupTypes.RouterRtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000
    }
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'level-asymmetry-allowed': 1
    }
  }
];

export function validateMediasoupConfig() {
  if (!env.MEDIASOUP_ENABLED) return;
  if (env.MEDIASOUP_MIN_PORT > env.MEDIASOUP_MAX_PORT) {
    throw new MediaRoomError('MEDIA_PORT_RANGE_INVALID', 'MEDIASOUP_MIN_PORT must be <= MEDIASOUP_MAX_PORT');
  }
}

class MediasoupRoomService {
  private worker: mediasoupTypes.Worker | null = null;
  private rooms = new Map<string, RoomState>();

  async joinRoom(input: { chatId: string; socketId: string; userId: string; displayName: string }): Promise<JoinRoomResult> {
    const room = await this.getOrCreateRoom(input.chatId);
    let participant = room.participants.get(input.socketId);

    if (!participant) {
      participant = {
        socketId: input.socketId,
        userId: input.userId,
        displayName: input.displayName,
        transports: new Set(),
        producers: new Set(),
        consumers: new Set()
      };
      room.participants.set(input.socketId, participant);
    } else {
      participant.displayName = input.displayName;
    }

    const producers = this.producerSummaries(room).filter((producer) => {
      const producerState = room.producers.get(producer.producerId);
      return producerState?.socketId !== input.socketId;
    });

    return {
      chatId: input.chatId,
      routerRtpCapabilities: room.router.rtpCapabilities as unknown as Record<string, unknown>,
      participants: this.participantSummaries(room, input.socketId),
      producers
    };
  }

  async createTransport(input: {
    chatId: string;
    socketId: string;
    userId: string;
    direction: TransportDirection;
  }): Promise<CreateTransportResult> {
    const room = this.requireRoom(input.chatId);
    const participant = this.requireParticipant(room, input.socketId);

    const announcedIp = env.MEDIASOUP_ANNOUNCED_IP.trim();
    const transport = await room.router.createWebRtcTransport({
      listenIps: [{
        ip: env.MEDIASOUP_LISTEN_IP,
        ...(announcedIp ? { announcedIp } : {})
      }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: env.MEDIASOUP_INITIAL_OUTGOING_BITRATE,
      appData: {
        chatId: input.chatId,
        socketId: input.socketId,
        userId: input.userId,
        direction: input.direction
      }
    });

    const entry: TransportState = {
      chatId: input.chatId,
      socketId: input.socketId,
      userId: input.userId,
      direction: input.direction,
      transport
    };
    room.transports.set(transport.id, entry);
    participant.transports.add(transport.id);

    transport.observer.on('close', () => {
      room.transports.delete(transport.id);
      participant?.transports.delete(transport.id);
    });

    return {
      chatId: input.chatId,
      transportId: transport.id,
      direction: input.direction,
      iceParameters: transport.iceParameters as unknown as Record<string, unknown>,
      iceCandidates: transport.iceCandidates as unknown as Record<string, unknown>[],
      dtlsParameters: transport.dtlsParameters as unknown as Record<string, unknown>
    };
  }

  async connectTransport(input: {
    chatId: string;
    socketId: string;
    transportId: string;
    dtlsParameters: Record<string, unknown>;
  }) {
    const room = this.requireRoom(input.chatId);
    const entry = this.requireTransport(room, input.transportId, input.socketId);
    await entry.transport.connect({
      dtlsParameters: input.dtlsParameters as unknown as mediasoupTypes.DtlsParameters
    });
  }

  async produce(input: {
    chatId: string;
    socketId: string;
    transportId: string;
    kind: MediaKind;
    source: MediaSource;
    rtpParameters: Record<string, unknown>;
  }): Promise<ProducerSummary> {
    const room = this.requireRoom(input.chatId);
    const transportEntry = this.requireTransport(room, input.transportId, input.socketId);
    const participant = this.requireParticipant(room, input.socketId);

    if (transportEntry.direction !== 'send') {
      throw new MediaRoomError('MEDIA_WRONG_TRANSPORT_DIRECTION', 'Producer requires a send transport');
    }

    const producer = await transportEntry.transport.produce({
      kind: input.kind,
      rtpParameters: input.rtpParameters as unknown as mediasoupTypes.RtpParameters,
      appData: {
        chatId: input.chatId,
        socketId: input.socketId,
        userId: transportEntry.userId,
        source: input.source
      }
    });

    const summary: ProducerSummary = {
      chatId: input.chatId,
      userId: transportEntry.userId,
      producerId: producer.id,
      kind: input.kind,
      source: input.source
    };

    room.producers.set(producer.id, {
      ...summary,
      socketId: input.socketId,
      producer
    });
    participant.producers.add(producer.id);

    producer.observer.on('close', () => {
      room.producers.delete(producer.id);
      participant?.producers.delete(producer.id);
    });

    return summary;
  }

  async consume(input: {
    chatId: string;
    socketId: string;
    userId: string;
    transportId: string;
    producerId: string;
    rtpCapabilities: Record<string, unknown>;
  }): Promise<ConsumeResult> {
    const room = this.requireRoom(input.chatId);
    const transportEntry = this.requireTransport(room, input.transportId, input.socketId);
    const participant = this.requireParticipant(room, input.socketId);
    const producerEntry = room.producers.get(input.producerId);

    if (!producerEntry) {
      throw new MediaRoomError('MEDIA_PRODUCER_NOT_FOUND', 'Producer not found');
    }

    if (transportEntry.direction !== 'recv') {
      throw new MediaRoomError('MEDIA_WRONG_TRANSPORT_DIRECTION', 'Consumer requires a receive transport');
    }

    const rtpCapabilities = input.rtpCapabilities as unknown as mediasoupTypes.RtpCapabilities;
    if (!room.router.canConsume({ producerId: input.producerId, rtpCapabilities })) {
      throw new MediaRoomError('MEDIA_CANNOT_CONSUME', 'Client cannot consume this producer');
    }

    const consumer = await transportEntry.transport.consume({
      producerId: input.producerId,
      rtpCapabilities,
      paused: true,
      appData: {
        chatId: input.chatId,
        socketId: input.socketId,
        userId: input.userId
      }
    });

    room.consumers.set(consumer.id, {
      chatId: input.chatId,
      socketId: input.socketId,
      userId: input.userId,
      consumer,
      producerId: input.producerId
    });
    participant.consumers.add(consumer.id);

    consumer.observer.on('close', () => {
      room.consumers.delete(consumer.id);
      participant?.consumers.delete(consumer.id);
    });

    return {
      chatId: input.chatId,
      consumerId: consumer.id,
      producerId: input.producerId,
      userId: producerEntry.userId,
      kind: consumer.kind as MediaKind,
      source: producerEntry.source,
      rtpParameters: consumer.rtpParameters as unknown as Record<string, unknown>,
      producerPaused: consumer.producerPaused
    };
  }

  async resumeConsumer(input: { chatId: string; socketId: string; consumerId: string }) {
    const room = this.requireRoom(input.chatId);
    const consumerEntry = room.consumers.get(input.consumerId);
    if (!consumerEntry || consumerEntry.socketId !== input.socketId) {
      throw new MediaRoomError('MEDIA_CONSUMER_NOT_FOUND', 'Consumer not found');
    }
    await consumerEntry.consumer.resume();
  }

  closeProducer(input: { chatId: string; socketId: string; producerId: string }) {
    const room = this.requireRoom(input.chatId);
    const producerEntry = room.producers.get(input.producerId);
    if (!producerEntry || producerEntry.socketId !== input.socketId) {
      throw new MediaRoomError('MEDIA_PRODUCER_NOT_FOUND', 'Producer not found');
    }

    const closed = {
      chatId: input.chatId,
      userId: producerEntry.userId,
      producerId: producerEntry.producerId
    };
    producerEntry.producer.close();
    return closed;
  }

  leaveRoom(chatId: string, socketId: string): LeaveRoomResult {
    const room = this.rooms.get(chatId);
    if (!room || !room.participants.has(socketId)) {
      return { leftRooms: [], closedProducers: [] };
    }
    return this.removeParticipant(room, socketId);
  }

  leaveAllForSocket(socketId: string): LeaveRoomResult {
    const result: LeaveRoomResult = { leftRooms: [], closedProducers: [] };

    for (const room of [...this.rooms.values()]) {
      if (!room.participants.has(socketId)) continue;
      const removed = this.removeParticipant(room, socketId);
      result.leftRooms.push(...removed.leftRooms);
      result.closedProducers.push(...removed.closedProducers);
    }

    return result;
  }

  async close() {
    for (const room of this.rooms.values()) {
      room.router.close();
    }
    this.rooms.clear();
    this.worker?.close();
    this.worker = null;
  }

  private async getOrCreateRoom(chatId: string): Promise<RoomState> {
    const existing = this.rooms.get(chatId);
    if (existing) return existing;

    const worker = await this.getOrCreateWorker();
    const router = await worker.createRouter({ mediaCodecs: MEDIA_CODECS });
    const room: RoomState = {
      chatId,
      router,
      participants: new Map(),
      transports: new Map(),
      producers: new Map(),
      consumers: new Map()
    };
    this.rooms.set(chatId, room);

    router.observer.on('close', () => {
      this.rooms.delete(chatId);
    });

    return room;
  }

  private async getOrCreateWorker(): Promise<mediasoupTypes.Worker> {
    if (!env.MEDIASOUP_ENABLED) {
      throw new MediaRoomError('MEDIA_SFU_DISABLED', 'Media SFU is disabled');
    }

    if (this.worker && !this.worker.closed) return this.worker;

    this.worker = await mediasoup.createWorker({
      logLevel: env.MEDIASOUP_LOG_LEVEL,
      rtcMinPort: env.MEDIASOUP_MIN_PORT,
      rtcMaxPort: env.MEDIASOUP_MAX_PORT
    });

    this.worker.on('died', () => {
      this.worker = null;
      this.rooms.clear();
    });

    return this.worker;
  }

  private requireRoom(chatId: string): RoomState {
    const room = this.rooms.get(chatId);
    if (!room) {
      throw new MediaRoomError('MEDIA_ROOM_NOT_JOINED', 'Join the media room before signaling');
    }
    return room;
  }

  private requireParticipant(room: RoomState, socketId: string): ParticipantState {
    const participant = room.participants.get(socketId);
    if (!participant) {
      throw new MediaRoomError('MEDIA_ROOM_NOT_JOINED', 'Join the media room before signaling');
    }
    return participant;
  }

  private requireTransport(room: RoomState, transportId: string, socketId: string): TransportState {
    const transportEntry = room.transports.get(transportId);
    if (!transportEntry || transportEntry.socketId !== socketId) {
      throw new MediaRoomError('MEDIA_TRANSPORT_NOT_FOUND', 'Transport not found');
    }
    return transportEntry;
  }

  private removeParticipant(room: RoomState, socketId: string): LeaveRoomResult {
    const participant = room.participants.get(socketId);
    if (!participant) return { leftRooms: [], closedProducers: [] };

    const closedProducers = [...participant.producers]
      .map((producerId) => room.producers.get(producerId))
      .filter((entry): entry is ProducerState => Boolean(entry))
      .map((entry) => ({
        chatId: entry.chatId,
        userId: entry.userId,
        producerId: entry.producerId
      }));

    for (const consumerId of [...participant.consumers]) {
      room.consumers.get(consumerId)?.consumer.close();
      room.consumers.delete(consumerId);
    }
    for (const producerId of [...participant.producers]) {
      room.producers.get(producerId)?.producer.close();
      room.producers.delete(producerId);
    }
    for (const transportId of [...participant.transports]) {
      room.transports.get(transportId)?.transport.close();
      room.transports.delete(transportId);
    }

    room.participants.delete(socketId);
    const leftRooms = [{ chatId: room.chatId, userId: participant.userId }];

    if (room.participants.size === 0) {
      room.router.close();
      this.rooms.delete(room.chatId);
    }

    return { leftRooms, closedProducers };
  }

  private producerSummaries(room: RoomState): ProducerSummary[] {
    return [...room.producers.values()].map((entry) => ({
      chatId: entry.chatId,
      userId: entry.userId,
      producerId: entry.producerId,
      kind: entry.kind,
      source: entry.source
    }));
  }

  private participantSummaries(room: RoomState, excludeSocketId?: string): ParticipantSummary[] {
    return [...room.participants.values()]
      .filter((participant) => participant.socketId !== excludeSocketId)
      .map((participant) => ({
        userId: participant.userId,
        displayName: participant.displayName,
        producers: [...participant.producers]
          .map((producerId) => room.producers.get(producerId))
          .filter((entry): entry is ProducerState => Boolean(entry))
          .map((entry) => ({
            chatId: entry.chatId,
            userId: entry.userId,
            producerId: entry.producerId,
            kind: entry.kind,
            source: entry.source
          }))
      }));
  }
}

export const mediasoupRooms = new MediasoupRoomService();
