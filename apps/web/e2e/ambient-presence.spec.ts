import { expect, test, type Browser, type Page } from '@playwright/test';
import type { AuthResponse } from '@penthouse/contracts';
import { createUserViaApi, installSession } from './utils';

const API_BASE = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000';

async function authenticatedPage(browser: Browser, username: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const session = await createUserViaApi(page, username);
  await installSession(page, session);
  return { context, page, session };
}

async function createDm(page: Page, session: AuthResponse, memberId: string) {
  const response = await page.request.post(`${API_BASE}/api/v1/chats/dm`, {
    headers: { authorization: `Bearer ${session.accessToken}` },
    data: { memberId }
  });
  expect(response.ok()).toBe(true);
}

async function setPresence(page: Page, state: 'available' | 'busy' | 'dnd' | 'afk', note?: string) {
  await page.goto('/settings');
  await page.locator('#presence-state').selectOption(state);
  if (note !== undefined) {
    await page.locator('#presence-note').fill(note);
    await page.locator('#presence-note').blur();
  }
}

async function findUserRow(page: Page, username: string) {
  const row = page.getByRole('button').filter({ hasText: `@${username}` }).first();
  await expect(async () => {
    const search = page.getByPlaceholder('Search...');
    await expect(search).toBeEnabled({ timeout: 1000 });
    await search.fill(username);
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(row).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10000 });
  return row;
}

test.describe('Ambient presence', () => {
  test('DM chat list shows counterpart presence dot and note', async ({ browser }) => {
    const userA = await authenticatedPage(browser, `amb_dm_a_${Date.now()}`);
    const userB = await authenticatedPage(browser, `amb_dm_b_${Date.now()}`);
    const note = 'In a meeting';

    await createDm(userA.page, userA.session, userB.session.user.id);
    await userA.page.goto('/');
    const dmRow = userA.page.getByRole('button', { name: `Open chat ${userB.session.user.displayName}` });
    await expect(dmRow).toBeVisible();

    await setPresence(userB.page, 'busy', note);

    await expect(dmRow.locator('[data-presence-dot="busy"]')).toBeVisible({ timeout: 10000 });
    await expect(dmRow).toContainText(note, { timeout: 10000 });

    await userA.context.close();
    await userB.context.close();
  });

  test('People directory renders live presence status for another online user', async ({ browser }) => {
    const userA = await authenticatedPage(browser, `amb_people_a_${Date.now()}`);
    const userB = await authenticatedPage(browser, `amb_people_b_${Date.now()}`);

    await userA.page.goto('/users');
    const row = await findUserRow(userA.page, userB.session.user.username);

    await setPresence(userB.page, 'dnd');

    await expect(row.locator('[data-presence-dot="dnd"]')).toBeVisible({ timeout: 10000 });

    await userA.context.close();
    await userB.context.close();
  });

  test('members modal shows presence labels for active chat members', async ({ browser }) => {
    const userA = await authenticatedPage(browser, `amb_mem_a_${Date.now()}`);
    const userB = await authenticatedPage(browser, `amb_mem_b_${Date.now()}`);

    await setPresence(userB.page, 'afk');

    await userA.page.getByRole('button', { name: 'Open chat General' }).click();
    await expect(userA.page).toHaveURL(/\/chat\/.+/);
    await userA.page.getByRole('button', { name: 'Chat actions' }).click();
    await userA.page.getByRole('menuitem', { name: /members/i }).click();

    const row = userA.page.getByRole('listitem').filter({ hasText: userB.session.user.displayName }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.locator('[data-presence-dot="afk"]')).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText(/afk/i);

    await userA.context.close();
    await userB.context.close();
  });
});
