<script lang="ts">
	interface Props {
		src: string;
	}

	let { src }: Props = $props();

	let audio = $state<HTMLAudioElement | null>(null);
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	let playbackRate = $state(1);
	const speeds = [1, 1.5, 2];

	function togglePlay() {
		if (!audio) return;
		if (isPlaying) {
			audio.pause();
		} else {
			audio.play();
		}
	}

	function handleSeek(e: MouseEvent) {
		if (!audio || !duration) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		audio.currentTime = pct * duration;
	}

	function cycleSpeed() {
		if (!audio) return;
		const idx = speeds.indexOf(playbackRate);
		playbackRate = speeds[(idx + 1) % speeds.length];
		audio.playbackRate = playbackRate;
	}

	function formatTime(sec: number): string {
		if (!isFinite(sec)) return '0:00';
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	// Generate deterministic waveform bars from src string
	function waveHeights(url: string): number[] {
		const seed = url.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
		const rng = (n: number) => {
			const x = Math.sin(seed + n) * 10000;
			return x - Math.floor(x);
		};
		return Array.from({ length: 32 }, (_, i) => 0.3 + rng(i) * 0.7);
	}

	const bars = $derived(waveHeights(src));
	const progress = $derived(duration > 0 ? currentTime / duration : 0);
</script>

<div class="audio-player">
	<button class="play-btn" onclick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
		{#if isPlaying}
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<rect x="2" y="1" width="5" height="14" rx="1" />
				<rect x="9" y="1" width="5" height="14" rx="1" />
			</svg>
		{:else}
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<path d="M3 1l12 7-12 7z" />
			</svg>
		{/if}
	</button>

	<div
		class="waveform"
		onclick={handleSeek}
		role="slider"
		tabindex="0"
		aria-valuenow={Math.round(progress * 100)}
		aria-label="Seek"
		onkeydown={(e: KeyboardEvent) => {
			if (!audio || !duration) return;
			if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
			if (e.key === 'ArrowRight') audio.currentTime = Math.min(duration, audio.currentTime + 5);
		}}
	>
		{#each bars as h, i}
			<div
				class="bar"
				class:played={i / bars.length < progress}
				style="height: {h * 100}%"
			></div>
		{/each}
	</div>

	<span class="time">{formatTime(currentTime)} / {formatTime(duration)}</span>

	<button class="speed-btn" onclick={cycleSpeed} aria-label="Playback speed">
		{playbackRate}x
	</button>

	<audio
		bind:this={audio}
		{src}
		onplay={() => isPlaying = true}
		onpause={() => isPlaying = false}
		onended={() => isPlaying = false}
		onloadedmetadata={() => duration = audio?.duration ?? 0}
		ontimeupdate={() => currentTime = audio?.currentTime ?? 0}
		preload="metadata"
	></audio>
</div>

<style>
	.audio-player {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-surface-elevated);
		border-radius: var(--radius-lg);
		min-width: 260px;
		max-width: 400px;
	}

	.play-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--color-accent);
		color: var(--color-bg);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		flex-shrink: 0;
		transition: opacity 0.15s;
	}
	.play-btn:hover { opacity: 0.85; }

	.waveform {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 2px;
		height: 32px;
		cursor: pointer;
	}

	.bar {
		flex: 1;
		min-width: 2px;
		background: var(--color-border);
		border-radius: 1px;
		transition: background 0.1s;
	}
	.bar.played {
		background: var(--color-accent);
	}

	.time {
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.speed-btn {
		background: none;
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font-size: var(--text-xs);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		flex-shrink: 0;
		transition: background 0.1s;
	}
	.speed-btn:hover {
		background: var(--color-surface);
	}
</style>
