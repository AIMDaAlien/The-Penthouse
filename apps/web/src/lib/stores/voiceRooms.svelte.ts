import { socketStore } from './socket.svelte';

interface VoiceRoomSummary {
	participantCount: number;
	speakingUserIds: string[];
}

function createVoiceRoomsStore() {
	let rooms = $state<Record<string, VoiceRoomSummary>>({});

	function onSummary(data: { payload: { chatId: string; participantCount: number; speakingUserIds: string[] } }) {
		const { chatId, participantCount, speakingUserIds } = data.payload;
		if (participantCount === 0) {
			const next = { ...rooms };
			delete next[chatId];
			rooms = next;
		} else {
			rooms = { ...rooms, [chatId]: { participantCount, speakingUserIds } };
		}
	}

	function init() {
		const unsub = socketStore.on<{ payload: { chatId: string; participantCount: number; speakingUserIds: string[] } }>(
			'voice.room_summary',
			onSummary
		);
		return unsub;
	}

	function get(chatId: string): VoiceRoomSummary | undefined {
		return rooms[chatId];
	}

	function isActive(chatId: string): boolean {
		return (rooms[chatId]?.participantCount ?? 0) > 0;
	}

	function isSpeaking(chatId: string): boolean {
		return (rooms[chatId]?.speakingUserIds.length ?? 0) > 0;
	}

	return {
		init,
		get,
		isActive,
		isSpeaking
	};
}

export const voiceRoomsStore = createVoiceRoomsStore();
