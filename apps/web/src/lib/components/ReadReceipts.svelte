<script lang="ts">
	import { readReceiptsStore } from '$stores/readReceipts.svelte';
	import { sessionStore } from '$stores/session.svelte';
	import Avatar from '$components/Avatar.svelte';

	interface Props {
		messageId: string;
		chatId: string;
		isSentByMe: boolean;
		isPending: boolean;
		chatType: 'dm' | 'channel';
		deliveredAt?: string | null;
		clientSendTime?: string | null;
		usersMap: Map<string, { displayName: string; avatarUrl?: string | null }>;
		orderedMessageIds: string[];
	}

	let {
		messageId,
		chatId,
		isSentByMe,
		isPending,
		chatType,
		deliveredAt = null,
		clientSendTime = null,
		usersMap,
		orderedMessageIds
	}: Props = $props();

	const myId = $derived(sessionStore.user?.id);
	const isAcked = $derived(!clientSendTime || messageId !== clientSendTime);

	const dmStatus = $derived.by(() => {
		if (!isSentByMe || chatType !== 'dm') return null;

		const readers = readReceiptsStore.getReadersForMessage(chatId, messageId, orderedMessageIds);
		const otherReader = readers.find((r) => r.userId !== myId);

		if (otherReader) return 'read';
		if (deliveredAt || isAcked) return 'delivered';
		return 'sent';
	});

	const groupReaders = $derived.by(() => {
		if (!isSentByMe || chatType !== 'channel') return [];

		const readers = readReceiptsStore.getReadersForMessage(chatId, messageId, orderedMessageIds);
		return readers.filter((r) => r.userId !== myId).slice(0, 5);
	});
</script>

{#if isSentByMe}
	{#if chatType === 'dm' && dmStatus}
		<span class="dm-glyphs" class:read={dmStatus === 'read'} aria-live="polite">
			<span class="sr-only">
				{#if dmStatus === 'read'}
					Read
				{:else if dmStatus === 'delivered'}
					Delivered
				{:else}
					Sent
				{/if}
			</span>
			<span aria-hidden="true">
				{#if dmStatus === 'sent'}
					/
				{:else}
					//
				{/if}
			</span>
		</span>
	{:else if chatType === 'channel' && groupReaders.length > 0}
		<div class="avatar-rail" aria-live="polite">
			<span class="sr-only">
				Read by {groupReaders.map((r) => usersMap.get(r.userId)?.displayName ?? 'Unknown').join(', ')}
			</span>
			{#each groupReaders as reader, index (reader.userId)}
				{@const user = usersMap.get(reader.userId)}
				<div class="avatar-wrap" style:--index={index} aria-hidden="true">
					<Avatar
						url={user?.avatarUrl ?? null}
						name={user?.displayName ?? 'Unknown'}
						size={20}
					/>
				</div>
			{/each}
		</div>
	{/if}
{/if}

<style>
	.dm-glyphs {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--p-text-2);
		letter-spacing: -0.1em;
		margin-left: auto;
	}

	.dm-glyphs.read {
		color: var(--p-accent);
	}

	.avatar-rail {
		display: flex;
		flex-direction: row-reverse;
		justify-content: flex-end;
		margin-left: auto;
		padding-left: var(--space-2);
	}

	.avatar-wrap {
		width: 20px;
		height: 20px;
		margin-left: -8px;
		border-radius: 50%;
		border: 2px solid var(--p-bg);
		overflow: hidden;
		animation: slideIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
		animation-delay: calc(var(--index, 0) * 40ms);
	}

	.avatar-wrap:first-child {
		margin-left: 0;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(6px) scale(0.8);
		}
		to {
			opacity: 1;
			transform: translateX(0) scale(1);
		}
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.avatar-wrap {
			animation: none;
		}
	}
</style>
