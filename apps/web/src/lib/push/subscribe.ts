import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';
import { api } from '$services/api';

const STORAGE_KEY = 'penthouse:push-subscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	const output = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		output[i] = rawData.charCodeAt(i);
	}
	return output;
}

export type PushState = 'default' | 'granted' | 'denied' | 'unsupported';

export function getPushState(): PushState {
	if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
		return 'unsupported';
	}
	return Notification.permission as PushState;
}

export function hasSubscribedBefore(): boolean {
	if (typeof window === 'undefined') return false;
	return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function markSubscribed() {
	localStorage.setItem(STORAGE_KEY, 'true');
}

export function markUnsubscribed() {
	localStorage.removeItem(STORAGE_KEY);
}

export async function getVapidPublicKey(): Promise<string> {
	try {
		const data = await api.get<{ publicKey: string }>('/api/v1/push/vapid-key');
		if (data.publicKey) return data.publicKey;
	} catch {
		// fall through to env
	}
	return PUBLIC_VAPID_PUBLIC_KEY ?? '';
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
	if (!('serviceWorker' in navigator)) return null;
	const reg = await navigator.serviceWorker.ready;
	return reg.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
	if (!('serviceWorker' in navigator)) return null;

	const reg = await navigator.serviceWorker.ready;
	let sub = await reg.pushManager.getSubscription();
	if (sub) return sub;

	const key = await getVapidPublicKey();
	if (!key) {
		throw new Error('No VAPID public key available');
	}

	const applicationServerKey = urlBase64ToUint8Array(key);

	sub = await reg.pushManager.subscribe({
		userVisibleOnly: true,
		// Cast to workaround TypeScript's strict ArrayBufferLike vs ArrayBuffer
		applicationServerKey: applicationServerKey as unknown as ArrayBuffer,
	});

	// Send subscription to backend
	await api.post('/api/v1/push/subscribe', sub.toJSON());

	markSubscribed();
	return sub;
}

export async function unsubscribeFromPush(): Promise<void> {
	if (!('serviceWorker' in navigator)) return;

	const reg = await navigator.serviceWorker.ready;
	const sub = await reg.pushManager.getSubscription();
	if (sub) {
		await sub.unsubscribe();
		// Notify backend
		try {
			await api.post('/api/v1/push/unsubscribe', sub.toJSON());
		} catch {
			// best-effort
		}
	}
	markUnsubscribed();
}
