/**
 * Read Receipts Store — tracks who has read which messages in each chat.
 * OWNED BY: Claude (apps/web)
 * - Receives message.read socket events from backend
 * - Stores read state: { chatId: { messageId: [{ userId, readAt }] } }
 * - Cleaned up when leaving a chat (socket event cleanup in chat page)
 */

import { socketStore } from './socket.svelte';

function createReadReceiptsStore() {
	// Map<chatId, Map<messageId, Array<{ userId: string; readAt: string }>>>
	let readReceiptsMap = $state<Map<string, Map<string, Array<{ userId: string; readAt: string }>>>>(
		new Map()
	);

	function initializeSocketListeners() {
		const socket = socketStore.instance;
		if (!socket) return;

		// Backend wraps realtime events: { type: 'message.read', payload: {...} }
		socket.on('message.read', (envelope: { type: string; payload: { chatId: string; readerUserId: string; seenAt: string; seenThroughMessageId: string | null } }) => {
			const { chatId, readerUserId, seenAt, seenThroughMessageId } = envelope.payload;

			// Ensure chat exists in map
			if (!readReceiptsMap.has(chatId)) {
				readReceiptsMap.set(chatId, new Map());
			}

			const chatReceipts = readReceiptsMap.get(chatId)!;

			// If we have a seenThroughMessageId, that's the marker
			// In a real implementation, we might track all messages up to that point
			// For Wave A, we just mark that specific message (sender will need to handle rendering all up-to)
			if (seenThroughMessageId) {
				if (!chatReceipts.has(seenThroughMessageId)) {
					chatReceipts.set(seenThroughMessageId, []);
				}

				const receipts = chatReceipts.get(seenThroughMessageId)!;

				// Check if this user already has a read receipt for this message
				const existingIndex = receipts.findIndex((r) => r.userId === readerUserId);
				if (existingIndex !== -1) {
					// Update existing (in case of re-read)
					receipts[existingIndex] = { userId: readerUserId, readAt: seenAt };
				} else {
					// Add new receipt
					receipts.push({ userId: readerUserId, readAt: seenAt });
				}
			}

			// Trigger reactivity
			readReceiptsMap = readReceiptsMap;
		});
	}

	function clearChatReadReceipts(chatId: string) {
		readReceiptsMap.delete(chatId);
		readReceiptsMap = readReceiptsMap;
	}

	function getReadReceipts(chatId: string, messageId: string): Array<{ userId: string; readAt: string }> {
		return readReceiptsMap.get(chatId)?.get(messageId) ?? [];
	}

	return {
		get readReceiptsMap() {
			return readReceiptsMap;
		},
		initializeSocketListeners,
		clearChatReadReceipts,
		getReadReceipts
	};
}

export const readReceiptsStore = createReadReceiptsStore();
