<script lang="ts">
	import Icon from './Icon.svelte';

	export interface SlashCommand {
		name: string;
		description: string;
		icon: 'bar-chart';
	}

	interface Props {
		commands: SlashCommand[];
		selectedIndex: number;
		onSelect: (name: string) => void;
		onHover: (index: number) => void;
	}

	let { commands, selectedIndex, onSelect, onHover }: Props = $props();
</script>

{#if commands.length > 0}
	<div class="command-picker" role="listbox" aria-label="Slash commands">
		{#each commands as cmd, i}
			<button
				class="command-row"
				class:active={i === selectedIndex}
				role="option"
				aria-selected={i === selectedIndex}
				onclick={() => onSelect(cmd.name)}
				onmouseenter={() => onHover(i)}
				tabindex="-1"
			>
				<span class="cmd-icon">
					<Icon name={cmd.icon} size={16} />
				</span>
				<span class="cmd-label">
					<span class="cmd-slash">/</span><span class="cmd-name">{cmd.name}</span>
				</span>
				<span class="cmd-desc">{cmd.description}</span>
			</button>
		{/each}
	</div>
{/if}

<style>
	.command-picker {
		background: rgba(26, 26, 36, 0.92);
		backdrop-filter: blur(20px) saturate(1.4);
		-webkit-backdrop-filter: blur(20px) saturate(1.4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl) var(--radius-xl) var(--radius-md) var(--radius-md);
		overflow: hidden;
		box-shadow: 0 -6px 28px rgba(0, 0, 0, 0.35);
	}

	.command-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-3) var(--space-4);
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-primary);
		text-align: left;
		cursor: pointer;
		transition: background 0.1s;
		font-family: var(--font-sans);
		text-shadow: none;
	}

	.command-row:last-child {
		border-bottom: none;
	}

	.command-row.active {
		background: var(--color-accent-dim);
	}

	.cmd-icon {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-pill);
		background: var(--color-accent-dim);
		color: var(--color-accent);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.cmd-label {
		font-size: var(--text-sm);
		font-weight: 600;
		flex-shrink: 0;
	}

	.cmd-slash {
		color: var(--color-text-secondary);
	}

	.cmd-name {
		color: var(--color-accent);
	}

	.cmd-desc {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
