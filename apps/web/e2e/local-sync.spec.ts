import { expect, test, type Page } from '@playwright/test';

const API_BASE = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000';

async function registerAndLogin(page: Page, username: string) {
	const response = await page.request.post(`${API_BASE}/api/v1/auth/register`, {
		data: {
			username,
			displayName: username,
			password: 'TestPassword123!',
			inviteCode: 'PENTHOUSE-ALPHA',
			captchaToken: 'dev',
			acceptTestNotice: true,
			testNoticeVersion: 'alpha-v1'
		}
	});
	expect(response.ok()).toBe(true);
	const session = await response.json();

	await page.goto('/auth');
	await page.evaluate((value) => {
		sessionStorage.setItem('penthouse_session', JSON.stringify(value));
	}, session);
	await page.goto('/');
	await expect(page).toHaveURL('/', { timeout: 15000 });
	await expect(page.getByRole('button', { name: 'Open chat General' })).toBeVisible({ timeout: 15000 });
}

async function openGeneralChat(page: Page) {
	await expect(async () => {
		await page.getByRole('button', { name: 'Open chat General' }).click();
		await expect(page).toHaveURL(/\/chat\/.+/, { timeout: 1000 });
	}).toPass({ timeout: 5000 });
}

async function cloneSession(source: Page, target: Page) {
	const session = await source.evaluate(() => sessionStorage.getItem('penthouse_session'));
	expect(session).toBeTruthy();

	await target.goto('/auth');
	await target.evaluate((value) => {
		sessionStorage.setItem('penthouse_session', value);
	}, session);
	await target.goto('/');
	await expect(target.getByRole('button', { name: 'Open chat General' })).toBeVisible({ timeout: 15000 });
}

async function localDbSize(page: Page) {
	return page.evaluate(async () => {
		const session = JSON.parse(sessionStorage.getItem('penthouse_session') ?? 'null') as { user?: { id?: string } } | null;
		const userId = session?.user?.id;
		if (!userId) return 0;

		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const request = indexedDB.open('penthouse-local-sync');
			request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
			request.onsuccess = () => resolve(request.result);
		});

		if (!db.objectStoreNames.contains('databases')) {
			db.close();
			return 0;
		}

		const tx = db.transaction('databases', 'readonly');
		const value = await new Promise<Uint8Array | ArrayBuffer | null>((resolve, reject) => {
			const request = tx.objectStore('databases').get(userId);
			request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
			request.onsuccess = () => resolve(request.result ?? null);
		});
		db.close();

	return value?.byteLength ?? 0;
	});
}

async function searchLocalContents(page: Page, query: string) {
	return page.evaluate(async (value) => {
		const session = JSON.parse(sessionStorage.getItem('penthouse_session') ?? 'null') as { user?: { id?: string } } | null;
		const userId = session?.user?.id;
		const chatId = location.pathname.split('/').filter(Boolean).at(-1);
		if (!userId || !chatId) return [];

		const [{ localSyncDb }, { searchLocalMessages }] = await Promise.all([
			import('/src/lib/sync/db-client.ts'),
			import('/src/lib/sync/search.ts')
		]);
		await localSyncDb.init(userId);
		const results = await searchLocalMessages(localSyncDb, chatId, value);
		return results.map((message) => message.content);
	}, query);
}

async function fetchServerSearchStatus(page: Page, query: string) {
	return page.evaluate(async ({ apiBase, value }) => {
		const session = JSON.parse(sessionStorage.getItem('penthouse_session') ?? 'null') as { accessToken?: string } | null;
		const chatId = location.pathname.split('/').filter(Boolean).at(-1);
		if (!session?.accessToken || !chatId) return 0;
		const response = await fetch(`${apiBase}/api/v1/chats/${chatId}/messages/search?q=${encodeURIComponent(value)}`, {
			headers: { authorization: `Bearer ${session.accessToken}` }
		});
		return response.status;
	}, { apiBase: API_BASE, value: query });
}

async function blockServerSearch(page: Page) {
	let blockedRequests = 0;
	await page.context().route(/\/api\/v1\/chats\/[^/]+\/messages\/search(?:\?|$)/, (route) => {
		blockedRequests += 1;
		route.fulfill({
			status: 503,
			contentType: 'application/json',
			body: JSON.stringify({
				code: 'SERVER_SEARCH_BLOCKED_FOR_LOCAL_SYNC_PROOF',
				message: 'Server search blocked for local sync proof'
			})
		});
	});
	return () => blockedRequests;
}

test.describe('local-first sync shadow mode', () => {
	test('persists first sync and serves local search when server search is unavailable', async ({ browser }) => {
		const context = await browser.newContext();
		const pageA = await context.newPage();
		const pageB = await context.newPage();

		const username = `sync_${Math.random().toString(36).slice(2, 8)}`;
		const messageText = `local sync proof ${Date.now()}`;

		await registerAndLogin(pageA, username);
		await expect.poll(() => localDbSize(pageA), { timeout: 10000 }).toBeGreaterThan(0);

		await pageA.reload();
		await expect(pageA.getByRole('button', { name: 'Open chat General' })).toBeVisible({ timeout: 15000 });
		await expect.poll(() => localDbSize(pageA), { timeout: 10000 }).toBeGreaterThan(0);

		await cloneSession(pageA, pageB);
		await openGeneralChat(pageA);
		await openGeneralChat(pageB);

		const composerInput = pageA.locator('input[type="text"][placeholder^="Message"]:visible');
		await composerInput.fill(messageText);
		await composerInput.press('Enter');
		await expect(pageB.getByText(messageText)).toBeVisible({ timeout: 15000 });

		await expect.poll(() => searchLocalContents(pageB, messageText), { timeout: 10000 }).toContain(messageText);

		const blockedServerSearches = await blockServerSearch(pageB);
		await expect(fetchServerSearchStatus(pageB, messageText)).resolves.toBe(503);
		expect(blockedServerSearches()).toBeGreaterThan(0);
		await expect(searchLocalContents(pageB, messageText)).resolves.toContain(messageText);

		await context.close();
	});
});
