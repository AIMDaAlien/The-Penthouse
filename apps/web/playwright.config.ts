import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: 'list',
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Pixel 5'] }
		},
		{
			name: 'firefox',
			use: { ...devices['Pixel 5'] }
		},
		{
			name: 'webkit',
			use: { ...devices['iPhone 13'] }
		}
	],
	/* webServer: {
		command: 'npm run preview',
		port: 4173
	} */
});
