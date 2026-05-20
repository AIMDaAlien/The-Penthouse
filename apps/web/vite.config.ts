import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig(async () => ({
	test: {
		exclude: [...configDefaults.exclude, 'e2e/**'],
		passWithNoTests: true
	},
	plugins: [
		...(await sveltekit()),
		...(await SvelteKitPWA({
			base: '/',
			scope: '/',
			registerType: 'autoUpdate',
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'service-worker.ts',
			injectManifest: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
			},
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
			devOptions: {
				enabled: false
			}
		}))
	]
}));
