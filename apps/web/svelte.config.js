import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Static SPA mode — all data comes from the API, no SSR needed.
		// Caddy serves the built files directly. 'fallback' enables client-side routing.
		adapter: adapter({
			fallback: 'index.html'
		}),
		alias: {
			$components: 'src/lib/components',
			$stores: 'src/lib/stores',
			$services: 'src/lib/services'
		}
	}
};

export default config;
