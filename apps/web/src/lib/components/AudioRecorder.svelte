<script lang="ts">
	import { onDestroy } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		onRecord?: (blob: Blob, mimeType: string) => void;
		onCancel?: () => void;
	}

	let { onRecord, onCancel }: Props = $props();

	let isRecording = $state(false);
	let duration = $state(0);
	let timer = $state<ReturnType<typeof setInterval> | null>(null);
	let mediaRecorder = $state<MediaRecorder | null>(null);
	let chunks = $state<Blob[]>([]);
	let error = $state('');
	let shouldEmitRecording = true;

	const MAX_DURATION_SECONDS = 120;

	function getSupportedMimeType(): string | null {
		const types = [
			'audio/webm;codecs=opus',
			'audio/webm',
			'audio/mp4',
			'audio/ogg;codecs=opus',
			'audio/ogg'
		];
		for (const type of types) {
			if (MediaRecorder.isTypeSupported(type)) return type;
		}
		return null;
	}

	async function startRecording() {
		error = '';
		const mimeType = getSupportedMimeType();
		if (!mimeType) {
			error = 'Audio recording is not supported in this browser.';
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const recorder = new MediaRecorder(stream, { mimeType });
			mediaRecorder = recorder;
			chunks = [];
			shouldEmitRecording = true;

			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) chunks.push(e.data);
			};

			recorder.onstop = () => {
				const blob = new Blob(chunks, { type: mimeType });
				if (shouldEmitRecording && blob.size > 0) {
					onRecord?.(blob, mimeType);
				}
				stream.getTracks().forEach((t) => t.stop());
				mediaRecorder = null;
				chunks = [];
			};

			recorder.onerror = () => {
				error = 'Recording failed. Please try again.';
				stopRecording(false);
			};

			recorder.start(100); // collect data every 100ms
			isRecording = true;
			duration = 0;
			timer = setInterval(() => {
				duration++;
				if (duration >= MAX_DURATION_SECONDS) {
					stopRecording();
				}
			}, 1000);
		} catch {
			error = 'Microphone access denied.';
		}
	}

	function stopRecording(emit = true) {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			shouldEmitRecording = emit;
			mediaRecorder.stop();
		}
		isRecording = false;
		duration = 0;
	}

	onDestroy(() => {
		stopRecording(false);
	});

	function handleToggle() {
		if (isRecording) {
			stopRecording();
		} else {
			startRecording();
		}
	}

	function cancelRecording() {
		stopRecording(false);
		onCancel?.();
	}

	function formatTime(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}
</script>

<div class="recorder">
	{#if error}
		<span class="error">{error}</span>
	{/if}

	{#if isRecording}
		<span class="duration">{formatTime(duration)}</span>
		<span class="recording-dot"></span>
	{/if}

	<button
		type="button"
		class="record-btn"
		class:recording={isRecording}
		onclick={handleToggle}
		aria-label={isRecording ? 'Stop recording' : 'Record audio message'}
	>
		<Icon name={isRecording ? 'square' : 'mic'} size={20} />
	</button>

	{#if isRecording}
		<button type="button" class="cancel-btn" onclick={cancelRecording} aria-label="Cancel recording">
			<Icon name="x" size={18} />
		</button>
	{/if}
</div>

<style>
	.recorder {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.duration {
		font-size: var(--text-sm);
		font-family: var(--font-mono);
		color: var(--p-error);
		min-width: 40px;
	}

	.recording-dot {
		width: 8px;
		height: 8px;
		background: var(--p-error);
		border-radius: 50%;
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	.record-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--p-accent);
		color: var(--p-bg);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.15s, transform 0.15s;
		flex-shrink: 0;
	}

	.record-btn.recording {
		background: var(--p-error);
		color: var(--p-bg);
		animation: pulse 1s ease-in-out infinite;
	}

	.cancel-btn {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--p-surface-2);
		color: var(--p-text-2);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		flex-shrink: 0;
	}

	.error {
		font-size: var(--text-xs);
		color: var(--p-error);
	}
</style>
