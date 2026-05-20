import { socketStore } from './socket.svelte';
import type { ServerMessageReadEvent } from '@penthouse/contracts';

function createReadReceiptsStore() {
	// Marker model: chatId → readerUserId → { seenThroughMessageId, seenAt }
	// seenThroughMessageId is a read-through marker — the reader has seen everything at or before that message.
	let markersMap = $state<Map<string, Map<string, { seenThroughMessageId: string; seenAt: string }>>>(
		new Map()
	);

	function setMarker(
		chatId: string,
		readerUserId: string,
		seenThroughMessageId: string,
		seenAt: string
	) {
		const outerCopy = new Map(markersMap);
		const innerCopy = new Map(outerCopy.get(chatId) ?? []);
		innerCopy.set(readerUserId, { seenThroughMessageId, seenAt });
		outerCopy.set(chatId, innerCopy);
		markersMap = outerCopy;
	}

	function initializeSocketListeners() {
		const socket = socketStore.instance;
		if (!socket) return;

		socket.off('message.read');

		socket.on('message.read', (envelope: ServerMessageReadEvent) => {
			const { chatId, readerUserId, seenAt, seenThroughMessageId } = envelope.payload;
			if (seenThroughMessageId) {
				setMarker(chatId, readerUserId, seenThroughMessageId, seenAt);
			}
		});
	}

	// Seed markers from REST-loaded messages so hard reloads show correct read state immediately.
	// Messages must be in chronological order (oldest first). Each message's readReceipts means
	// that reader has seen AT LEAST through that message — the last occurrence per reader wins.
	function seedFromMessages(
		chatId: string,
		messages: Array<{ id: string; readReceipts?: Array<{ userId: string; readAt: string }> | null }>
	) {
		const outerCopy = new Map(markersMap);
		const innerCopy = new Map(outerCopy.get(chatId) ?? []);
		let changed = false;

		for (const msg of messages) {
			if (!msg.readReceipts?.length) continue;
			for (const receipt of msg.readReceipts) {
				innerCopy.set(receipt.userId, {
					seenThroughMessageId: msg.id,
					seenAt: receipt.readAt
				});
				changed = true;
			}
		}

		if (changed) {
			outerCopy.set(chatId, innerCopy);
			markersMap = outerCopy;
		}
	}

	function clearChatReadReceipts(chatId: string) {
		const outerCopy = new Map(markersMap);
		outerCopy.delete(chatId);
		markersMap = outerCopy;
	}

	// Returns readers whose read-through marker covers messageId (i.e. they've seen at or past it).
	// orderedIds is the full ordered message ID list for the chat (used for position comparison).
	function getReadersForMessage(
		chatId: string,
		messageId: string,
		orderedIds: string[]
	): Array<{ userId: string; readAt: string }> {
		const msgIdx = orderedIds.indexOf(messageId);
		if (msgIdx === -1) return [];

		const chatMarkers = markersMap.get(chatId);
		if (!chatMarkers) return [];

		const readers: Array<{ userId: string; readAt: string }> = [];
		for (const [userId, marker] of chatMarkers) {
			const markerIdx = orderedIds.indexOf(marker.seenThroughMessageId);
			if (markerIdx >= msgIdx) {
				readers.push({ userId, readAt: marker.seenAt });
			}
		}
		return readers;
	}

	return {
		get markersMap() {
			return markersMap;
		},
		initializeSocketListeners,
		seedFromMessages,
		clearChatReadReceipts,
		getReadersForMessage
	};
}

export const readReceiptsStore = createReadReceiptsStore();
