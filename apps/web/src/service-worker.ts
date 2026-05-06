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
