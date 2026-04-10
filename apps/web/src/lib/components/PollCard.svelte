<script lang="ts">
	import Icon from './Icon.svelte';
	import type { PollData } from '@penthouse/contracts';

	interface Props {
		poll: PollData;
		currentUserId: string;
		onVote: (optionIndex: number) => void;
		isPending?: boolean;
	}

	let { poll, currentUserId, onVote, isPending = false }: Props = $props();

	const totalVotes = $derived(poll.options.reduce((sum, o) => sum + o.voterIds.length, 0));
	const myVoteIndex = $derived(poll.options.findIndex((o) => o.voterIds.includes(currentUserId)));
	const hasVoted = $derived(myVoteIndex !== -1);
	const isExpired = $derived(poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false);
	const showResults = $derived(hasVoted || isExpired);

	function getPercent(voterCount: number): number {
		if (totalVotes === 0) return 0;
		return Math.round((voterCount / totalVotes) * 100);
	}

	function formatExpiry(iso: string): string {
		const d = new Date(iso);
		const now = new Date();
		if (d < now) return 'Closed';
		const diffMs = d.getTime() - now.getTime();
		const diffH = Math.floor(diffMs / 3600000);
		if (diffH < 24) return `Closes in ${diffH}h`;
		const diffD = Math.floor(diffH / 24);
		return `Closes in ${diffD}d`;
	}
</script>

<div class="poll-card" class:pending={isPending}>
	<div class="poll-header">
		<Icon name="bar-chart" size={14} />
		<span class="poll-label">Poll</span>
	</div>

	<p class="poll-question">{poll.question}</p>

	<div class="poll-options">
		{#each poll.options as opt, i}
			{@const pct = getPercent(opt.voterIds.length)}
			{@const isMyVote = myVoteIndex === i}
			{@const disabled = isExpired || isPending || hasVoted}
			<button
				class="poll-option"
				class:voted={isMyVote}
				class:show-results={showResults}
				class:clickable={!disabled}
				onclick={() => !disabled && onVote(i)}
				disabled={isPending}
				aria-label="{opt.text}{showResults ? `, ${pct}%` : ''}"
				aria-pressed={isMyVote}
			>
				{#if showResults}
					<div class="option-fill" style="width: {pct}%"></div>
				{/if}
				<span class="option-text">{opt.text}</span>
				{#if showResults}
					<span class="option-pct">{pct}%</span>
				{/if}
				{#if isMyVote}
					<span class="option-check" aria-hidden="true">
						<Icon name="check" size={12} />
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<p class="poll-meta">
		{totalVotes}{totalVotes === 1 ? ' vote' : ' votes'}
		{#if poll.expiresAt}
			· {formatExpiry(poll.expiresAt)}
		{/if}
	</p>
</div>

<style>
	.poll-card {
		min-width: 200px;
		max-width: 280px;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
	}

	.poll-card.pending {
		opacity: 0.6;
		pointer-events: none;
	}

	.poll-header {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--color-accent);
	}

	.poll-label {
		font-size: var(--text-xs);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
	}

	.poll-question {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
		line-height: 1.4;
	}

	.poll-options {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.poll-option {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		color: var(--color-text-primary);
		font-size: var(--text-sm);
		font-family: var(--font-sans);
		text-align: left;
		cursor: default;
		overflow: hidden;
		transition: border-color 0.15s, background 0.15s;
		text-shadow: none;
		width: 100%;
	}

	.poll-option.clickable {
		cursor: pointer;
	}

	.poll-option.clickable:hover {
		border-color: var(--color-accent);
		background: var(--color-accent-dim);
	}

	.poll-option.voted {
		border-color: var(--color-accent);
	}

	.option-fill {
		position: absolute;
		inset: 0;
		background: var(--color-accent-dim);
		border-radius: inherit;
		transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.poll-option.voted .option-fill {
		background: rgba(119, 119, 194, 0.2);
	}

	.option-text {
		position: relative;
		flex: 1;
		font-weight: 500;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.option-pct {
		position: relative;
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--color-text-secondary);
		flex-shrink: 0;
	}

	.poll-option.voted .option-pct {
		color: var(--color-accent);
	}

	.option-check {
		position: relative;
		color: var(--color-accent);
		flex-shrink: 0;
		display: flex;
	}

	.poll-meta {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		margin: 0;
	}
</style>
