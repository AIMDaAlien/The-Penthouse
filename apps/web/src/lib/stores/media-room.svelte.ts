import { browser } from '$app/environment';
import type { types as mediaClientTypes } from 'mediasoup-client';
import type {
	MediaParticipantSummary,
	MediaProducerSummary,
	ServerMediaErrorEvent,
	ServerMediaJoinedEvent,
	ServerMediaParticipantLeftEvent,
	ServerMediaProducerAddedEvent,
	ServerMediaProducerClosedEvent
} from '@penthouse/contracts';
import { socketStore } from './socket.svelte';

type MediaRoomState = 'idle' | 'joining' | 'joined' | 'failed';

function createMediaRoomStore() {
	let state = $state<MediaRoomState>('idle');
	let error = $state<string | null>(null);
	let chatId = $state<string | null>(null);
	let device = $state<mediaClientTypes.Device | null>(null);
	let participants = $state<MediaParticipantSummary[]>([]);
	let producers = $state<MediaProducerSummary[]>([]);
	let unsubscribers: (() => void)[] = [];

	async function join(nextChatId: string) {
		if (!browser || state === 'joining') return;
		if (chatId && chatId !== nextChatId) await leave();

		chatId = nextChatId;
		state = 'joining';
		error = null;
		setupListeners();
		socketStore.emit('media.join', { chatId: nextChatId });
	}

	async function leave() {
		if (chatId) {
			socketStore.emit('media.leave', { chatId });
		}
		reset();
	}

	function setupListeners() {
		if (unsubscribers.length > 0) return;

		unsubscribers = [
			socketStore.on<ServerMediaJoinedEvent>('media.joined', (event) => {
				void handleJoined(event);
			}),
			socketStore.on<ServerMediaProducerAddedEvent>('media.producerAdded', (event) => {
				if (event.payload.chatId !== chatId) return;
				producers = upsertProducer(producers, event.payload);
				participants = upsertParticipantProducer(participants, event.payload);
			}),
			socketStore.on<ServerMediaProducerClosedEvent>('media.producerClosed', (event) => {
				if (event.payload.chatId !== chatId) return;
				producers = producers.filter((producer) => producer.producerId !== event.payload.producerId);
				participants = participants.map((participant) => ({
					...participant,
					producers: participant.producers.filter((producer) => producer.producerId !== event.payload.producerId)
				}));
			}),
			socketStore.on<ServerMediaParticipantLeftEvent>('media.participantLeft', (event) => {
				if (event.payload.chatId !== chatId) return;
				participants = participants.filter((participant) => participant.userId !== event.payload.userId);
				producers = producers.filter((producer) => producer.userId !== event.payload.userId);
			}),
			socketStore.on<ServerMediaErrorEvent>('media.error', (event) => {
				error = event.payload.message;
				state = 'failed';
			})
		];
	}

	async function handleJoined(event: ServerMediaJoinedEvent) {
		if (!chatId || event.payload.chatId !== chatId) return;

		try {
			const { Device } = await import('mediasoup-client');
			const nextDevice = new Device();
			await nextDevice.load({
				routerRtpCapabilities: event.payload.routerRtpCapabilities as mediaClientTypes.RtpCapabilities
			});

			device = nextDevice;
			participants = event.payload.participants;
			producers = event.payload.producers;
			state = 'joined';
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Failed to initialize media device';
			state = 'failed';
		}
	}

	function reset() {
		for (const unsubscribe of unsubscribers) unsubscribe();
		unsubscribers = [];
		state = 'idle';
		error = null;
		chatId = null;
		device = null;
		participants = [];
		producers = [];
	}

	return {
		get state() { return state; },
		get error() { return error; },
		get chatId() { return chatId; },
		get device() { return device; },
		get participants() { return participants; },
		get producers() { return producers; },
		get joined() { return state === 'joined'; },
		join,
		leave,
		reset
	};
}

function upsertProducer(producers: MediaProducerSummary[], producer: MediaProducerSummary) {
	return [
		...producers.filter((existing) => existing.producerId !== producer.producerId),
		producer
	];
}

function upsertParticipantProducer(participants: MediaParticipantSummary[], producer: MediaProducerSummary) {
	const existing = participants.find((participant) => participant.userId === producer.userId);
	if (!existing) {
		return [
			...participants,
			{
				userId: producer.userId,
				displayName: producer.userId,
				producers: [producer]
			}
		];
	}

	return participants.map((participant) => participant.userId === producer.userId
		? { ...participant, producers: upsertProducer(participant.producers, producer) }
		: participant);
}

export const mediaRoomStore = createMediaRoomStore();
