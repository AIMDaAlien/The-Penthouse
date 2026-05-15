# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: local-sync.spec.ts >> local-first sync shadow mode >> persists first sync and serves local search when server search is unavailable
- Location: e2e/local-sync.spec.ts:123:2

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Open chat General' })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('button', { name: 'Open chat General' })

```

# Page snapshot

```yaml
- generic [ref=e2]: "Error: EPERM: operation not permitted, scandir '/Users/aim/Documents/penthouse-v3/apps/web/src' at Object.readdirSync (node:fs:1554:26) at resolve_entry (file:///Users/aim/Documents/penthouse-v3/node_modules/@sveltejs/kit/src/utils/filesystem.js:188:20) at file:///Users/aim/Documents/penthouse-v3/node_modules/@sveltejs/kit/src/exports/vite/dev/index.js:490:38 at call (file:///Users/aim/Documents/penthouse-v3/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:19166:7) at next (file:///Users/aim/Documents/penthouse-v3/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:19110:5) at viteServeRawFsMiddleware (file:///Users/aim/Documents/penthouse-v3/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:35495:7) at call (file:///Users/aim/Documents/penthouse-v3/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:19166:7) at next (file:///Users/aim/Documents/penthouse-v3/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:19110:5) at viteTransformMiddleware (file:///Users/aim/Documents/penthouse-v3/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:37162:14) at call (file:///Users/aim/Documents/penthouse-v3/node_modules/vite/dist/node/chunks/dep-D4NMHUTW.js:19166:7)"
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | 
  3   | const API_BASE = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000';
  4   | 
  5   | async function registerAndLogin(page: Page, username: string) {
  6   | 	const response = await page.request.post(`${API_BASE}/api/v1/auth/register`, {
  7   | 		data: {
  8   | 			username,
  9   | 			displayName: username,
  10  | 			password: 'TestPassword123!',
  11  | 			inviteCode: 'PENTHOUSE-ALPHA',
  12  | 			captchaToken: 'dev',
  13  | 			acceptTestNotice: true,
  14  | 			testNoticeVersion: 'alpha-v1'
  15  | 		}
  16  | 	});
  17  | 	expect(response.ok()).toBe(true);
  18  | 	const session = await response.json();
  19  | 
  20  | 	await page.goto('/auth');
  21  | 	await page.evaluate((value) => {
  22  | 		sessionStorage.setItem('penthouse_session', JSON.stringify(value));
  23  | 	}, session);
  24  | 	await page.goto('/');
  25  | 	await expect(page).toHaveURL('/', { timeout: 15000 });
> 26  | 	await expect(page.getByRole('button', { name: 'Open chat General' })).toBeVisible({ timeout: 15000 });
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
  27  | }
  28  | 
  29  | async function openGeneralChat(page: Page) {
  30  | 	await expect(async () => {
  31  | 		await page.getByRole('button', { name: 'Open chat General' }).click();
  32  | 		await expect(page).toHaveURL(/\/chat\/.+/, { timeout: 1000 });
  33  | 	}).toPass({ timeout: 5000 });
  34  | }
  35  | 
  36  | async function cloneSession(source: Page, target: Page) {
  37  | 	const session = await source.evaluate(() => sessionStorage.getItem('penthouse_session'));
  38  | 	expect(session).toBeTruthy();
  39  | 
  40  | 	await target.goto('/auth');
  41  | 	await target.evaluate((value) => {
  42  | 		sessionStorage.setItem('penthouse_session', value);
  43  | 	}, session);
  44  | 	await target.goto('/');
  45  | 	await expect(target.getByRole('button', { name: 'Open chat General' })).toBeVisible({ timeout: 15000 });
  46  | }
  47  | 
  48  | async function localDbSize(page: Page) {
  49  | 	return page.evaluate(async () => {
  50  | 		const session = JSON.parse(sessionStorage.getItem('penthouse_session') ?? 'null') as { user?: { id?: string } } | null;
  51  | 		const userId = session?.user?.id;
  52  | 		if (!userId) return 0;
  53  | 
  54  | 		const db = await new Promise<IDBDatabase>((resolve, reject) => {
  55  | 			const request = indexedDB.open('penthouse-local-sync');
  56  | 			request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  57  | 			request.onsuccess = () => resolve(request.result);
  58  | 		});
  59  | 
  60  | 		if (!db.objectStoreNames.contains('databases')) {
  61  | 			db.close();
  62  | 			return 0;
  63  | 		}
  64  | 
  65  | 		const tx = db.transaction('databases', 'readonly');
  66  | 		const value = await new Promise<Uint8Array | ArrayBuffer | null>((resolve, reject) => {
  67  | 			const request = tx.objectStore('databases').get(userId);
  68  | 			request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
  69  | 			request.onsuccess = () => resolve(request.result ?? null);
  70  | 		});
  71  | 		db.close();
  72  | 
  73  | 	return value?.byteLength ?? 0;
  74  | 	});
  75  | }
  76  | 
  77  | async function searchLocalContents(page: Page, query: string) {
  78  | 	return page.evaluate(async (value) => {
  79  | 		const session = JSON.parse(sessionStorage.getItem('penthouse_session') ?? 'null') as { user?: { id?: string } } | null;
  80  | 		const userId = session?.user?.id;
  81  | 		const chatId = location.pathname.split('/').filter(Boolean).at(-1);
  82  | 		if (!userId || !chatId) return [];
  83  | 
  84  | 		const [{ localSyncDb }, { searchLocalMessages }] = await Promise.all([
  85  | 			import('/src/lib/sync/db-client.ts'),
  86  | 			import('/src/lib/sync/search.ts')
  87  | 		]);
  88  | 		await localSyncDb.init(userId);
  89  | 		const results = await searchLocalMessages(localSyncDb, chatId, value);
  90  | 		return results.map((message) => message.content);
  91  | 	}, query);
  92  | }
  93  | 
  94  | async function fetchServerSearchStatus(page: Page, query: string) {
  95  | 	return page.evaluate(async ({ apiBase, value }) => {
  96  | 		const session = JSON.parse(sessionStorage.getItem('penthouse_session') ?? 'null') as { accessToken?: string } | null;
  97  | 		const chatId = location.pathname.split('/').filter(Boolean).at(-1);
  98  | 		if (!session?.accessToken || !chatId) return 0;
  99  | 		const response = await fetch(`${apiBase}/api/v1/chats/${chatId}/messages/search?q=${encodeURIComponent(value)}`, {
  100 | 			headers: { authorization: `Bearer ${session.accessToken}` }
  101 | 		});
  102 | 		return response.status;
  103 | 	}, { apiBase: API_BASE, value: query });
  104 | }
  105 | 
  106 | async function blockServerSearch(page: Page) {
  107 | 	let blockedRequests = 0;
  108 | 	await page.context().route(/\/api\/v1\/chats\/[^/]+\/messages\/search(?:\?|$)/, (route) => {
  109 | 		blockedRequests += 1;
  110 | 		route.fulfill({
  111 | 			status: 503,
  112 | 			contentType: 'application/json',
  113 | 			body: JSON.stringify({
  114 | 				code: 'SERVER_SEARCH_BLOCKED_FOR_LOCAL_SYNC_PROOF',
  115 | 				message: 'Server search blocked for local sync proof'
  116 | 			})
  117 | 		});
  118 | 	});
  119 | 	return () => blockedRequests;
  120 | }
  121 | 
  122 | test.describe('local-first sync shadow mode', () => {
  123 | 	test('persists first sync and serves local search when server search is unavailable', async ({ browser }) => {
  124 | 		const context = await browser.newContext();
  125 | 		const pageA = await context.newPage();
  126 | 		const pageB = await context.newPage();
```