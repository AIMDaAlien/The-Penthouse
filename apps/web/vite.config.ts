import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'The Penthouse',
				short_name: 'Penthouse',
				description: 'A privacy-focused messaging app as dynamic as your personality',
				theme_color: '#0d0d0d',
				background_color: '#0d0d0d',
				display: 'standalone',
				orientation: 'portrait',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/icons/icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: '/icons/icon-512-maskable.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				// Cache the SPA shell for offline graceful degradation.
				// Never cache auth endpoints or message data.
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /\/api\/v1\/health/,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-health',
							expiration: { maxAgeSeconds: 60 }
						}
					}
				]
			},
			devOptions: {
				enabled: false // PWA only active in production build
			}
		})
	]
});
