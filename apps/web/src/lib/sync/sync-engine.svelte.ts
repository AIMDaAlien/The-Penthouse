import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import type { Message, ServerMessageAckEvent, ServerSyncBatchEvent } from '@penthouse/contracts';
import { syncApi } from '$services/sync';
import { socketStore } from '$stores/socket.svelte';
import { localSyncDb } from './db-client';
import type { LocalTextMessageOutboxPayload } from './outbox';

type LocalSyncState = 'disabled' | 'idle' | 'initializing' | 'syncing' | 'ready' | 'failed';
type LocalSendTextMessageInput = LocalTextMessageOutboxPayload & {
	createdAt?: string;
	senderUsername?: string;
	senderDisplayName?: string;
	senderAvatarUrl?: string | null;
	replyTo?: Message['replyTo'];
};
type RawOutboxRow = {
	id: number;
	operation_type: string;
	payload: string;
	retry_count: number;
};

const SYNC_CURSOR_KEY = 'sync.cursor';
const FEATURE_FLAG = env.PUBLIC_LOCAL_FIRST_SYNC ?? 'shadow';
const MAX_OUTBOX_ITEMS = 1000;

function isEnabled() {
	return browser && FEATURE_FLAG !== 'off' && FEATURE_FLAG !== 'false';
}

function createSyncEngine() {
	let state = $state<LocalSyncState>(isEnabled() ? 'idle' : 'disabled');
	let error = $state<string | null>(null);
	let activeUserId = $state<string | null>(null);
	let lastSyncedAt = $state<string | null>(null);
	let syncing = false;
	let socketUnsubscribe: (() => void) | null = null;
	let realtimeUnsubscribers: Array<() => void> = [];
	let scheduledSocketSync: ReturnType<typeof setTimeout> | null = null;

	function canUseLocalDb() {
		return isEnabled() && !!activeUserId && (state === 'ready' || state === 'syncing');
	}

	async function start(userId: string) {
		if (!isEnabled()) {
			state = 'disabled';
			return;
		}

		if (activeUserId && activeUserId !== userId) {
			await stop({ clear: true });
		}

		activeUserId = userId;
		state = 'initializing';
		error = null;

		try {
			await localSyncDb.init(userId);
			state = 'ready';
			await pull();
			if (socketStore.isConnected) {
				await drainOutbox();
				scheduleSocketSync();
			}
		} catch (err) {
			state = 'failed';
			error = err instanceof Error ? err.message : 'Local sync failed to initialize';
			await resetAndResync(userId);
		}
	}

	async function stop(options: { clear?: boolean } = {}) {
		detachSocketHandlers();
		const previousUserId = activeUserId;
		activeUserId = null;
		lastSyncedAt = null;
		error = null;
		state = isEnabled() ? 'idle' : 'disabled';

		if (options.clear && previousUserId) {
			await localSyncDb.reset(previousUserId);
		}
	}

	async function pull() {
		if (!isEnabled() || !activeUserId || syncing) return;
		syncing = true;
		state = 'syncing';
		error = null;

		try {
			let cursor = (await localSyncDb.getMeta(SYNC_CURSOR_KEY)) ?? '0';
			let hasMore = true;
			while (hasMore) {
				const batch = await syncApi.pull(cursor);
				await localSyncDb.applyEvents(batch.ops);
				await localSyncDb.setMeta(SYNC_CURSOR_KEY, batch.nextCursor);
				cursor = batch.nextCursor;
				hasMore = batch.hasMore;
			}
			lastSyncedAt = new Date().toISOString();
			state = 'ready';
		} catch (err) {
			state = 'failed';
			error = err instanceof Error ? err.message : 'Local sync failed';
		} finally {
			syncing = false;
		}
	}

	function attachSocket() {
		detachSocketHandlers();
		socketUnsubscribe = socketStore.on<ServerSyncBatchEvent>('sync.batch', async (event) => {
			if (!canUseLocalDb()) return;
			try {
				await localSyncDb.applyEvents(event.payload.ops);
				await localSyncDb.setMeta(SYNC_CURSOR_KEY, event.payload.nextCursor);
				lastSyncedAt = new Date().toISOString();
				state = 'ready';
			} catch (err) {
				state = 'failed';
				error = err instanceof Error ? err.message : 'Socket sync batch failed';
			}
		});

		const handleAck = (event: ServerMessageAckEvent) => {
			void handleMessageAck(event);
		};
		const schedule = () => scheduleSocketSync();
		const syncAndDrain = () => {
			void drainOutbox();
			scheduleSocketSync();
		};
		realtimeUnsubscribers = [
			socketStore.on<ServerMessageAckEvent>('message.ack', handleAck),
			socketStore.on('connect', syncAndDrain),
			socketStore.on('message.new', schedule),
			socketStore.on('message.edited', schedule),
			socketStore.on('message.deleted', schedule),
			socketStore.on('reaction.add', schedule),
			socketStore.on('reaction.remove', schedule),
			socketStore.on('message.pinned', schedule),
			socketStore.on('message.unpinned', schedule),
			socketStore.on('message.read', schedule),
			socketStore.on('chat.sync_required', schedule)
		];

		return detachSocketHandlers;
	}

	async function requestSocketSync() {
		if (!canUseLocalDb() || !socketStore.isConnected) return;
		const cursor = (await localSyncDb.getMeta(SYNC_CURSOR_KEY)) ?? '0';
		socketStore.emit('sync.request', { cursor });
	}

	function scheduleSocketSync() {
		if (!canUseLocalDb() || !socketStore.isConnected || scheduledSocketSync) return;
		scheduledSocketSync = setTimeout(() => {
			scheduledSocketSync = null;
			void requestSocketSync();
		}, 75);
	}

	async function sendMessage(input: LocalSendTextMessageInput) {
		if (!canUseLocalDb()) throw new Error('Local sync is not active');
		const createdAt = input.createdAt ?? new Date().toISOString();
		const payload: LocalTextMessageOutboxPayload = {
			chatId: input.chatId,
			content: input.content,
			clientMessageId: input.clientMessageId,
			...(input.replyToMessageId ? { replyToMessageId: input.replyToMessageId } : {})
		};

		await localSyncDb.run(
			`INSERT INTO messages (
				id, chat_id, sender_id, sender_username, sender_display_name, sender_avatar_url,
				content, type, metadata, created_at, client_message_id, read_receipts, reactions, reply_to,
				starred, hidden
			) VALUES (?, ?, ?, ?, ?, ?, ?, 'text', NULL, ?, ?, '[]', '[]', ?, 0, 0)
			ON CONFLICT(id) DO UPDATE SET
				content = excluded.content,
				created_at = excluded.created_at,
				client_message_id = excluded.client_message_id,
				reply_to = excluded.reply_to`,
			[
				input.clientMessageId,
				input.chatId,
				activeUserId,
				input.senderUsername ?? null,
				input.senderDisplayName ?? null,
				input.senderAvatarUrl ?? null,
				input.content,
				createdAt,
				input.clientMessageId,
				JSON.stringify(input.replyTo ?? (
					input.replyToMessageId ? { id: input.replyToMessageId, content: '', senderDisplayName: null } : null
				))
			]
		);

		await localSyncDb.run(
			`INSERT INTO outbox (operation_type, payload, created_at, retry_count)
			VALUES ('message.send', ?, datetime('now'), 0)`,
			[JSON.stringify(payload)]
		);
		await trimOutbox();
		await drainOutbox();
	}

	async function drainOutbox() {
		if (!canUseLocalDb() || !socketStore.isConnected) return;
		const rows = await localSyncDb.query<RawOutboxRow>(
			`SELECT id, operation_type, payload, retry_count
			FROM outbox
			WHERE next_retry_at IS NULL OR next_retry_at <= datetime('now')
			ORDER BY created_at ASC
			LIMIT 25`
		);

		for (const row of rows) {
			if (row.operation_type !== 'message.send') continue;
			try {
				const payload = JSON.parse(row.payload) as LocalTextMessageOutboxPayload;
				socketStore.emit('message.send', {
					chatId: payload.chatId,
					content: payload.content,
					clientMessageId: payload.clientMessageId,
					messageType: 'text',
					...(payload.replyToMessageId ? { replyToMessageId: payload.replyToMessageId } : {})
				});
				await markOutboxAttempt(row.id);
			} catch (err) {
				await markOutboxAttempt(row.id, err instanceof Error ? err.message : 'Outbox payload failed');
			}
		}
	}

	async function handleMessageAck(event: ServerMessageAckEvent) {
		if (!canUseLocalDb()) return;
		await removeOutboxItemsByClientMessageId(event.payload.clientMessageId);
		await localSyncDb.run(
			`UPDATE OR IGNORE messages
			SET id = ?
			WHERE id = ?
				AND chat_id = ?
				AND client_message_id = ?`,
			[
				event.payload.messageId,
				event.payload.clientMessageId,
				event.payload.chatId,
				event.payload.clientMessageId
			]
		);
		scheduleSocketSync();
	}

	async function markOutboxAttempt(id: number, error?: string) {
		await localSyncDb.run(
			`UPDATE outbox
			SET retry_count = retry_count + 1,
				next_retry_at = datetime('now', '+30 seconds'),
				error = ?
			WHERE id = ?`,
			[error ?? null, id]
		);
	}

	async function removeOutboxItemsByClientMessageId(clientMessageId: string) {
		const rows = await localSyncDb.query<{ id: number; payload: string }>(
			`SELECT id, payload FROM outbox WHERE operation_type = 'message.send'`
		);
		for (const row of rows) {
			try {
				const payload = JSON.parse(row.payload) as LocalTextMessageOutboxPayload;
				if (payload.clientMessageId === clientMessageId) {
					await localSyncDb.run('DELETE FROM outbox WHERE id = ?', [row.id]);
				}
			} catch {
				continue;
			}
		}
	}

	async function trimOutbox() {
		await localSyncDb.run(
			`DELETE FROM outbox
			WHERE id IN (
				SELECT id FROM outbox
				ORDER BY created_at ASC
				LIMIT max((SELECT count(*) FROM outbox) - ?, 0)
			)`,
			[MAX_OUTBOX_ITEMS]
		);
	}

	function detachSocketHandlers() {
		socketUnsubscribe?.();
		socketUnsubscribe = null;
		realtimeUnsubscribers.forEach((unsubscribe) => unsubscribe());
		realtimeUnsubscribers = [];
		if (scheduledSocketSync) {
			clearTimeout(scheduledSocketSync);
			scheduledSocketSync = null;
		}
	}

	async function resetAndResync(userId = activeUserId) {
		if (!isEnabled() || !userId) return;
		try {
			await localSyncDb.reset(userId);
			await localSyncDb.init(userId);
			await localSyncDb.setMeta(SYNC_CURSOR_KEY, '0');
			state = 'ready';
			await pull();
		} catch (err) {
			state = 'failed';
			error = err instanceof Error ? err.message : 'Local sync reset failed';
		}
	}

	return {
		get state() { return state; },
		get error() { return error; },
		get activeUserId() { return activeUserId; },
		get lastSyncedAt() { return lastSyncedAt; },
		get enabled() { return isEnabled(); },
		start,
		stop,
		pull,
		attachSocket,
		requestSocketSync,
		sendMessage,
		drainOutbox,
		resetAndResync
	};
}

export const syncEngine = createSyncEngine();
