<script lang="ts">
	import { readReceiptsStore } from '$stores/readReceipts.svelte';
	import Avatar from './Avatar.svelte';

	interface Props {
		chatId: string;
		messageId: string;
		isSentByMe: boolean;
		chatType?: 'dm' | 'channel';
		// Optional: pass user map for getting display names
		userMap?: Map<string, { displayName: string; avatarUrl?: string | null }>;
	}

	let { chatId, messageId, isSentByMe, chatType = 'dm', userMap = undefined } = $props();

	// Only show read receipts for messages sent by current user
	const receipts = $derived(isSentByMe ? readReceiptsStore.getReadReceipts(chatId, messageId) : []);

	// Sort by most recent read first
	const sortedReceipts = $derived([...receipts].sort((a, b) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime()));

	// For DMs, show "Seen" if any receipts
	const seenTime = $derived(sortedReceipts.length > 0 ? sortedReceipts[0].readAt : null);
	const seenAt = $derived(seenTime ? new Date(seenTime) : null);

	function formatSeenTime(date: Date | null): string {
		if (!date) return '';
		
		const now = new Date();
		const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

		if (isToday) {
			return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
		}

		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}
</script>

{#if isSentByMe && sortedReceipts.length > 0}
	{#if chatType === 'dm'}
		<!-- DM: Show "Seen" text with timestamp -->
		<div class="read-receipt dm-receipt">
			<span class="seen-label">Seen {formatSeenTime(seenAt)}</span>
		</div>
	{:else if chatType === 'channel'}
		<!-- Group Chat: Show avatar stack (up to 3) with "+N others" -->
		<div class="read-receipt channel-receipt">
			<div class="avatar-stack">
				{#each sortedReceipts.slice(0, 3) as receipt (receipt.userId)}
					{@const user = userMap?.get(receipt.userId)}
					{#if user}
						<Avatar
							userId={receipt.userId}
							displayName={user.displayName}
							avatarUrl={user.avatarUrl}
							size="sm"
							showPresence={false}
						/>
					{/if}
				{/each}

				{#if sortedReceipts.length > 3}
					<div class="more-count">+{sortedReceipts.length - 3}</div>
				{/if}
			</div>
		</div>
	{/if}
{/if}

<style>
	.read-receipt {
		margin-top: var(--space-2);
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
	}

	.dm-receipt .seen-label {
		display: inline-block;
		padding: 2px 8px;
		background: rgba(119, 119, 194, 0.1);
		border-radius: var(--radius-full);
		border: 1px solid var(--color-border);
	}

	.channel-receipt {
		padding: var(--space-2) 0;
	}

	.avatar-stack {
		display: flex;
		align-items: center;
		gap: -6px;
		flex-wrap: wrap;
	}

	:global(.avatar-stack .avatar-container) {
		margin-left: -6px;
		border: 2px solid var(--color-bg);
		flex-shrink: 0;
	}

	:global(.avatar-stack .avatar-container:first-child) {
		margin-left: 0;
	}

	.more-count {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-text-secondary);
		margin-left: -6px;
	}
</style>
