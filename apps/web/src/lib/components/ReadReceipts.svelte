<script lang="ts">
	import { readReceiptsStore } from '$stores/readReceipts.svelte';

	interface Props {
		messageId: string;
		chatId: string;
		isSentByMe: boolean;
		isPending: boolean;
		deliveredAt?: string | null;
		clientSendTime?: number;
		isLastOwnMessage?: boolean;
	}

	let {
		messageId,
		chatId,
		isSentByMe,
		isPending,
		deliveredAt = null,
		clientSendTime,
		isLastOwnMessage = true
	}: Props = $props();

	const receipts = $derived(isSentByMe ? readReceiptsStore.getReadReceipts(chatId, messageId) : []);
	const isRead = $derived(receipts.length > 0);

	const latencyMs = $derived(
		deliveredAt && clientSendTime != null
			? new Date(deliveredAt).getTime() - clientSendTime
			: null
	);

	function formatLatency(ms: number): string {
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
		return ''; // unusually slow — just show "Received"
	}

	const readAt = $derived(receipts[0]?.readAt ?? null);

	function formatElapsed(iso: string): string {
		const elapsed = Date.now() - new Date(iso).getTime();
		const m = Math.floor(elapsed / 60_000);
		if (m < 1) return 'just now';
		if (m < 60) return `${m}m`;
		const h = Math.floor(m / 60);
		const rem = m % 60;
		if (h < 24) return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
		return `${Math.floor(h / 24)}d`;
	}

	const state = $derived(
		!isSentByMe
			? null
			: isRead
				? 'read'
				: deliveredAt
					? 'received'
					: 'sent'
	);

	const label = $derived(
		state === 'read' && readAt
			? `Read after ${formatElapsed(readAt)}`
			: state === 'received' && latencyMs !== null
				? `Received${formatLatency(latencyMs) ? ` in ${formatLatency(latencyMs)}` : ''}`
				: state === 'sent'
					? 'Sent'
					: ''
	);
</script>

{#if label && isLastOwnMessage}
	<span class="receipt-label">{label}</span>
{/if}

<style>
	.receipt-label {
		display: block;
		text-align: right;
		font-size: var(--text-xs);
		color: var(--color-accent);
		opacity: 0.75;
		margin-top: var(--space-1);
	}
</style>
