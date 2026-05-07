/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: Array<{ url: string; revision: string | null }> | undefined;
};

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST ?? []);
cleanupOutdatedCaches();

// API calls: network first
registerRoute(
	({ url }) => url.pathname.startsWith('/api/'),
	new NetworkFirst({ cacheName: 'api-cache' })
);

// Static assets: cache first
registerRoute(
	({ request }) => request.destination === 'image' || request.destination === 'font',
	new CacheFirst({ cacheName: 'asset-cache' })
);

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

// ── Push Notifications ──────────────────────────────────────────────────────

import { parsePushPayload, buildNotificationTitle, buildNotificationBody } from './lib/push/payload';

self.addEventListener('push', (event) => {
	if (!event.data) return;

	let raw: unknown;
	try {
		raw = event.data.json();
	} catch {
		raw = { privacyLevel: 'private' };
	}

	const payload = parsePushPayload(raw);
	const title = buildNotificationTitle(payload);
	const body = buildNotificationBody(payload);

	const badge = payload.badge && payload.badge > 1 ? payload.badge : undefined;

	const options: NotificationOptions = {
		body,
		badge: badge ? undefined : undefined, // web badge is rarely supported
		tag: payload.chatId ? `chat-${payload.chatId}` : 'penthouse-push',
		requireInteraction: false,
		silent: false,
		data: {
			chatId: payload.chatId,
			messageId: payload.messageId,
			privacyLevel: payload.privacyLevel,
		} as Record<string, unknown>,
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const data = (event.notification.data ?? {}) as Record<string, unknown>;
	const chatId = typeof data.chatId === 'string' ? data.chatId : null;
	const url = chatId ? `/chat/${chatId}` : '/';

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			// Focus existing tab if already open
			for (const client of clientList) {
				if (client.url.includes(chatId ?? '') && 'focus' in client) {
					return (client as WindowClient).focus();
				}
			}
			// Otherwise open new tab
			return self.clients.openWindow(url);
		})
	);
});
