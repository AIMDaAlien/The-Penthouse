import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';
import { api } from '$services/api';

const STORAGE_KEY = 'penthouse:push-subscribed';
const SW_TIMEOUT_MS = 5000;

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

export type SubscribeResult =
	| { ok: true }
	| { ok: false; reason: 'unsupported' | 'denied' | 'no-vapid-key' | 'network' | 'sw-timeout' | 'unknown'; error?: unknown };

export type PushStatus = {
	supported: boolean;
	permission: NotificationPermission | 'unsupported';
	swReady: boolean;
	hasSubscription: boolean;
};

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

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
	if (!('serviceWorker' in navigator)) return null;
	try {
		const reg = await Promise.race([
			navigator.serviceWorker.ready,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('Service Worker ready timeout')), SW_TIMEOUT_MS)
			),
		]);
		return reg;
	} catch {
		return null;
	}
}

export async function getPushStatus(): Promise<PushStatus> {
	const supported = 'serviceWorker' in navigator && 'PushManager' in window;
	if (!supported) {
		return {
			supported: false,
			permission: 'unsupported',
			swReady: false,
			hasSubscription: false,
		};
	}

	const reg = await getServiceWorkerRegistration();
	const sub = reg ? await reg.pushManager.getSubscription() : null;

	return {
		supported: true,
		permission: Notification.permission,
		swReady: reg !== null,
		hasSubscription: sub !== null,
	};
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
	const reg = await getServiceWorkerRegistration();
	if (!reg) return null;
	return reg.pushManager.getSubscription();
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
	return getCurrentSubscription();
}

export async function subscribeToPush(): Promise<SubscribeResult> {
	if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
		return { ok: false, reason: 'unsupported' };
	}

	if (Notification.permission === 'denied') {
		return { ok: false, reason: 'denied' };
	}

	const reg = await getServiceWorkerRegistration();
	if (!reg) {
		return { ok: false, reason: 'sw-timeout' };
	}

	let sub = await reg.pushManager.getSubscription();
	if (sub) {
		// Idempotent: reuse existing subscription, re-post to backend
		try {
			await api.post('/api/v1/push/subscribe', sub.toJSON());
		} catch (err) {
			return { ok: false, reason: 'network', error: err };
		}
		markSubscribed();
		return { ok: true };
	}

	const key = await getVapidPublicKey();
	if (!key) {
		return { ok: false, reason: 'no-vapid-key' };
	}

	const applicationServerKey = urlBase64ToUint8Array(key);

	try {
		sub = await reg.pushManager.subscribe({
			userVisibleOnly: true,
			// Cast to workaround TypeScript's strict ArrayBufferLike vs ArrayBuffer
			applicationServerKey: applicationServerKey as unknown as ArrayBuffer,
		});
	} catch (err) {
		return { ok: false, reason: 'unknown', error: err };
	}

	try {
		await api.post('/api/v1/push/subscribe', sub.toJSON());
	} catch (err) {
		return { ok: false, reason: 'network', error: err };
	}

	markSubscribed();
	return { ok: true };
}

export async function unsubscribeFromPush(): Promise<SubscribeResult> {
	if (!('serviceWorker' in navigator)) {
		return { ok: false, reason: 'unsupported' };
	}

	const reg = await getServiceWorkerRegistration();
	if (!reg) {
		return { ok: false, reason: 'sw-timeout' };
	}

	const sub = await reg.pushManager.getSubscription();
	if (sub) {
		await sub.unsubscribe();
		try {
			await api.post('/api/v1/push/unsubscribe', sub.toJSON());
		} catch (err) {
			return { ok: false, reason: 'network', error: err };
		}
	}

	markUnsubscribed();
	return { ok: true };
}

// Aliases for backward compatibility
export const subscribe = subscribeToPush;
export const unsubscribe = unsubscribeFromPush;
