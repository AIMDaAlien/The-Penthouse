import { socketStore } from './socket.svelte';

interface VoiceParticipant {
	userId: string;
	displayName: string;
	muted: boolean;
	deafened: boolean;
	speaking: boolean;
}

interface PeerConnection {
	pc: RTCPeerConnection;
	userId: string;
	audioEl: HTMLAudioElement;
}

const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

function createVoiceStore() {
	let joined = $state(false);
	let muted = $state(false);
	let deafened = $state(false);
	let pttMode = $state(false);
	let pttActive = $state(false);
	let speaking = $state(false);
	let localVolume = $state(0);
	let participants = $state<VoiceParticipant[]>([]);
	let localStream = $state<MediaStream | null>(null);
	let peers = $state<Map<string, PeerConnection>>(new Map());
	let currentChatId = $state('');
	let unsubscribers: (() => void)[] = [];
	let audioContext: AudioContext | null = null;
	let analyser: AnalyserNode | null = null;
	let volumeRaf: number | null = null;

	async function join(chatId: string) {
		if (joined) await leave();
		currentChatId = chatId;

		try {
			localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
			localStream.getAudioTracks().forEach((t) => { t.enabled = !muted; });
		} catch {
			// User denied mic or no mic available
			return;
		}

		// Set up volume analyzer
		audioContext = new AudioContext();
		analyser = audioContext.createAnalyser();
		analyser.fftSize = 256;
		const source = audioContext.createMediaStreamSource(localStream);
		source.connect(analyser);
		startVolumePolling();

		socketStore.emit('voice.join', { chatId });
		joined = true;
		setupListeners();
	}

	async function leave() {
		if (!joined) return;

		// Stop volume polling
		if (volumeRaf) {
			cancelAnimationFrame(volumeRaf);
			volumeRaf = null;
		}
		audioContext?.close().catch(() => {});
		audioContext = null;
		analyser = null;
		speaking = false;
		localVolume = 0;

		// Close all peer connections
		for (const peer of peers.values()) {
			peer.pc.close();
		}
		peers = new Map();

		// Stop local stream
		localStream?.getTracks().forEach((t) => t.stop());
		localStream = null;

		// Unsubscribe socket listeners
		for (const unsub of unsubscribers) unsub();
		unsubscribers = [];

		// Leave socket room
		if (currentChatId) {
			socketStore.emit('voice.leave', { chatId: currentChatId });
		}

		joined = false;
		participants = [];
		currentChatId = '';
	}

	function setMuted(value: boolean) {
		muted = value;
		updateMicState();
		socketStore.emit('voice.mute', { muted: value });
	}

	function setDeafened(value: boolean) {
		deafened = value;
		for (const peer of peers.values()) {
			peer.audioEl.muted = value;
		}
		socketStore.emit('voice.deafen', { deafened: value });
	}

	function setPttMode(value: boolean) {
		pttMode = value;
		updateMicState();
	}

	function setPttActive(value: boolean) {
		pttActive = value;
		updateMicState();
	}

	function updateMicState() {
		const shouldBeUnmuted = pttMode ? pttActive : !muted;
		localStream?.getAudioTracks().forEach((t) => { t.enabled = shouldBeUnmuted; });
	}

	function setupListeners() {
		unsubscribers = [
			socketStore.on<{ payload: { participants: VoiceParticipant[] } }>('voice.state', (data) => {
				for (const p of data.payload.participants) {
					addParticipant(p);
					// Newcomer creates offers to all existing participants
					createAndSendOffer(p.userId);
				}
			}),
			socketStore.on<{ payload: VoiceParticipant }>('voice.user_joined', (data) => {
				// Existing peer waits for newcomer to send offer
				addParticipant(data.payload);
			}),
			socketStore.on<{ payload: { userId: string } }>('voice.user_left', (data) => {
				removeParticipant(data.payload.userId);
				closePeer(data.payload.userId);
			}),
			socketStore.on<{ payload: { fromUserId: string; data: any } }>('voice.signal', (data) => {
				handleSignal(data.payload.fromUserId, data.payload.data);
			}),
			socketStore.on<{ payload: { userId: string; muted: boolean } }>('voice.mute', (data) => {
				participants = participants.map((p) =>
					p.userId === data.payload.userId ? { ...p, muted: data.payload.muted } : p
				);
			}),
			socketStore.on<{ payload: { userId: string; deafened: boolean } }>('voice.deafen', (data) => {
				participants = participants.map((p) =>
					p.userId === data.payload.userId ? { ...p, deafened: data.payload.deafened } : p
				);
			}),
			socketStore.on<{ payload: { userId: string; speaking: boolean } }>('voice.speaking', (data) => {
				participants = participants.map((p) =>
					p.userId === data.payload.userId ? { ...p, speaking: data.payload.speaking } : p
				);
			})
		];
	}

	function addParticipant(p: VoiceParticipant) {
		if (!participants.find((x) => x.userId === p.userId)) {
			participants = [...participants, { ...p, speaking: false, deafened: p.deafened ?? false }];
		}
	}

	function removeParticipant(userId: string) {
		participants = participants.filter((p) => p.userId !== userId);
	}

	function closePeer(userId: string) {
		const peer = peers.get(userId);
		if (peer) {
			peer.pc.close();
			const next = new Map(peers);
			next.delete(userId);
			peers = next;
		}
	}

	async function createAndSendOffer(targetUserId: string) {
		const pc = getOrCreatePeerConnection(targetUserId);

		localStream?.getTracks().forEach((track) => {
			if (localStream) pc.addTrack(track, localStream);
		});

		const offer = await pc.createOffer();
		await pc.setLocalDescription(offer);

		socketStore.emit('voice.signal', {
			targetUserId,
			data: { type: 'offer', sdp: offer.sdp }
		});
	}

	async function handleSignal(fromUserId: string, data: any) {
		if (data.type === 'offer') {
			// Existing peer receives newcomer's offer
			const pc = getOrCreatePeerConnection(fromUserId);

			localStream?.getTracks().forEach((track) => {
				if (localStream) pc.addTrack(track, localStream);
			});

			await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);

			socketStore.emit('voice.signal', {
				targetUserId: fromUserId,
				data: { type: 'answer', sdp: answer.sdp }
			});
		} else if (data.type === 'answer') {
			// Newcomer receives answer from existing peer
			const peer = peers.get(fromUserId);
			if (peer) {
				await peer.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
			}
		} else if (data.type === 'ice' && data.candidate) {
			const peer = peers.get(fromUserId);
			if (peer) {
				await peer.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
			}
		}
	}

	function getOrCreatePeerConnection(userId: string): RTCPeerConnection {
		const existing = peers.get(userId);
		if (existing) return existing.pc;

		const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

		pc.onicecandidate = (event) => {
			if (event.candidate) {
				socketStore.emit('voice.signal', {
					targetUserId: userId,
					data: { type: 'ice', candidate: event.candidate }
				});
			}
		};

		pc.ontrack = (event) => {
			const audio = new Audio();
			audio.srcObject = event.streams[0];
			audio.muted = deafened;
			audio.play().catch(() => {});
			const peer = peers.get(userId);
			if (peer) peer.audioEl = audio;
		};

		peers = new Map([...peers, [userId, { pc, userId, audioEl: new Audio() }]]);
		return pc;
	}

	return {
		get joined() { return joined; },
		get muted() { return muted; },
		get deafened() { return deafened; },
		get pttMode() { return pttMode; },
		get pttActive() { return pttActive; },
		get speaking() { return speaking; },
		get localVolume() { return localVolume; },
		get participants() { return participants; },
		get localStream() { return localStream; },
		join,
		leave,
		setMuted,
		setDeafened,
		setPttMode,
		setPttActive
	};

	function startVolumePolling() {
		const dataArray = new Uint8Array(analyser?.frequencyBinCount ?? 0);
		let lastSpeakingState = false;

		function poll() {
			if (!analyser || !joined) return;
			analyser.getByteFrequencyData(dataArray);

			const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
			localVolume = average / 255;

			// Threshold: ~5% of max volume (~-46dB)
			const isSpeaking = localVolume > 0.05 && !muted;
			speaking = isSpeaking;

			if (isSpeaking !== lastSpeakingState) {
				lastSpeakingState = isSpeaking;
				socketStore.emit('voice.speaking', { speaking: isSpeaking });
			}

			volumeRaf = requestAnimationFrame(poll);
		}

		volumeRaf = requestAnimationFrame(poll);
	}
}

export const voiceStore = createVoiceStore();
