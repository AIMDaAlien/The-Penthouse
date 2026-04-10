<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		onSubmit: (data: { question: string; options: string[]; expiresAt?: string }) => void;
		onClose: () => void;
		submitting?: boolean;
	}

	let { onSubmit, onClose, submitting = false }: Props = $props();

	let question = $state('');
	let options = $state(['', '']);
	let expiresInHours = $state<number | null>(null);
	let localError = $state('');

	const filledOptions = $derived(options.map((o) => o.trim()).filter(Boolean));
	const canSubmit = $derived(
		question.trim().length > 0 && filledOptions.length >= 2 && !submitting
	);

	function addOption() {
		if (options.length < 4) options = [...options, ''];
	}

	function removeOption(i: number) {
		if (options.length > 2) options = options.filter((_, idx) => idx !== i);
	}

	function handleSubmit() {
		localError = '';
		const validOptions = options.map((o) => o.trim()).filter(Boolean);

		if (!question.trim()) {
			localError = 'Please enter a question.';
			return;
		}
		if (validOptions.length < 2) {
			localError = 'Please fill in at least 2 options.';
			return;
		}

		let expiresAt: string | undefined;
		if (expiresInHours !== null) {
			expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
		}

		onSubmit({ question: question.trim(), options: validOptions, expiresAt });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !submitting) onClose();
	}

	const EXPIRY_OPTIONS: [number | null, string][] = [
		[null, 'Never'],
		[24, '24 hours'],
		[168, '1 week']
	];
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="overlay"
	onclick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
	onkeydown={(e) => e.key === 'Escape' && !submitting && onClose()}
	role="dialog"
	aria-modal="true"
	aria-label="Create poll"
	tabindex="-1"
>
	<div
		class="sheet"
		role="document"
	>
		<div class="sheet-handle"></div>

		<div class="sheet-header">
			<div class="sheet-title-row">
				<Icon name="bar-chart" size={18} />
				<h3 class="sheet-title">Create Poll</h3>
			</div>
			<button class="close-btn" onclick={onClose} disabled={submitting} aria-label="Close">
				<Icon name="close" size={18} />
			</button>
		</div>

		<div class="sheet-body">
			<!-- Question -->
			<div class="field">
				<label class="field-label" for="poll-question">Question</label>
				<input
					id="poll-question"
					type="text"
					class="field-input"
					placeholder="Ask your community..."
					bind:value={question}
					maxlength={200}
					disabled={submitting}
				/>
			</div>

			<!-- Options -->
			<div class="field">
				<p class="field-label">Options</p>
				<div class="options-list">
					{#each options as _, i}
						<div class="option-row">
							<span class="option-bullet">{i + 1}</span>
							<input
								type="text"
								class="field-input option-input"
								placeholder="Option {i + 1}"
								bind:value={options[i]}
								maxlength={100}
								disabled={submitting}
							/>
							{#if options.length > 2}
								<button
									class="remove-btn"
									onclick={() => removeOption(i)}
									disabled={submitting}
									aria-label="Remove option {i + 1}"
								>
									<Icon name="close" size={13} />
								</button>
							{/if}
						</div>
					{/each}
				</div>
				{#if options.length < 4}
					<button class="add-option-btn" onclick={addOption} disabled={submitting}>
						<Icon name="plus" size={14} />
						Add option
					</button>
				{/if}
			</div>

			<!-- Expiry -->
			<div class="field">
				<p class="field-label">Closes in</p>
				<div class="expiry-row">
					{#each EXPIRY_OPTIONS as [val, label]}
						<button
							class="expiry-btn"
							class:active={expiresInHours === val}
							onclick={() => (expiresInHours = val)}
							disabled={submitting}
						>
							{label}
						</button>
					{/each}
				</div>
			</div>

			{#if localError}
				<p class="field-error">{localError}</p>
			{/if}

			<button class="submit-btn" onclick={handleSubmit} disabled={!canSubmit}>
				{submitting ? 'Creating...' : 'Create Poll'}
			</button>
		</div>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		display: flex;
		align-items: flex-end;
		z-index: 50;
		animation: fade-in 0.2s ease;
	}

	@keyframes fade-in {
		from { opacity: 0; }
	}

	.sheet {
		width: 100%;
		background: var(--color-surface);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		border-top: 1px solid var(--color-border);
		max-height: 85dvh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		animation: slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes slide-up {
		from { transform: translateY(100%); }
	}

	.sheet-handle {
		width: 36px;
		height: 4px;
		background: var(--color-border-solid);
		border-radius: var(--radius-full);
		margin: var(--space-3) auto var(--space-1);
		flex-shrink: 0;
	}

	.sheet-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-5) var(--space-3);
		flex-shrink: 0;
	}

	.sheet-title-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-accent);
	}

	.sheet-title {
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.close-btn {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-lg);
		background: none;
		border: none;
		color: var(--color-text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
		text-shadow: none;
	}

	.close-btn:hover:not(:disabled) {
		background: var(--color-accent-dim);
		color: var(--color-text-primary);
	}

	.sheet-body {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-2) var(--space-5) calc(var(--space-8) + env(safe-area-inset-bottom, 0px));
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	/* ── Fields ── */
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.field-label {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0;
	}

	.field-input {
		width: 100%;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		color: var(--color-text-primary);
		padding: var(--space-3) var(--space-4);
		font-size: var(--text-base);
		font-family: var(--font-sans);
		outline: none;
		transition: border-color 0.15s;
		box-sizing: border-box;
	}

	.field-input:focus {
		border-color: var(--color-accent);
	}

	.field-input:disabled {
		opacity: 0.5;
	}

	.field-error {
		font-size: var(--text-xs);
		color: var(--color-danger);
		margin: 0;
		padding: var(--space-2) var(--space-3);
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		border-radius: var(--radius-md);
	}

	/* ── Options ── */
	.options-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.option-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.option-bullet {
		width: 20px;
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--color-text-secondary);
		text-align: center;
		flex-shrink: 0;
	}

	.option-input {
		flex: 1;
	}

	.remove-btn {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-md);
		background: none;
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.15s, color 0.15s;
		text-shadow: none;
	}

	.remove-btn:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		color: var(--color-danger);
		border-color: var(--color-danger);
	}

	.add-option-btn {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		background: none;
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-lg);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		padding: var(--space-2) var(--space-4);
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
		font-family: var(--font-sans);
		text-shadow: none;
		align-self: flex-start;
	}

	.add-option-btn:hover:not(:disabled) {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	/* ── Expiry ── */
	.expiry-row {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.expiry-btn {
		padding: var(--space-2) var(--space-4);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
		font-family: var(--font-sans);
		text-shadow: none;
	}

	.expiry-btn:hover:not(:disabled) {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	.expiry-btn.active {
		background: var(--color-accent-dim);
		border-color: var(--color-accent);
		color: var(--color-accent);
		font-weight: 600;
	}

	/* ── Submit ── */
	.submit-btn {
		width: 100%;
		padding: var(--space-4);
		background: var(--color-accent);
		color: #000;
		border: none;
		border-radius: var(--radius-xl);
		font-size: var(--text-base);
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.15s;
		font-family: var(--font-sans);
		text-shadow: none;
	}

	.submit-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.submit-btn:not(:disabled):hover {
		opacity: 0.85;
	}
</style>
