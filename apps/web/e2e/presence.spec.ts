import { expect, test, type Browser, type Page } from '@playwright/test';
import { createUserViaApi, installSession } from './utils';

async function authenticatedPage(browser: Browser, username: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const session = await createUserViaApi(page, username);
  await installSession(page, session);
  return { context, page, session };
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

test.describe('Presence indicators', () => {
  test('manual status changes render in another user directory', async ({ browser }) => {
    const observer = await authenticatedPage(browser, `presence_observer_${Date.now()}`);
    const subject = await authenticatedPage(browser, `presence_subject_${Date.now()}`);

    await observer.page.goto('/users');
    const row = await findUserRow(observer.page, subject.session.user.username);

    await setPresence(subject.page, 'afk');
    await expect(row.locator('[data-presence-dot="afk"]')).toBeVisible({ timeout: 10000 });

    await observer.context.close();
    await subject.context.close();
  });

  test('presence changes sync between two signed-in users', async ({ browser }) => {
    const userA = await authenticatedPage(browser, `presence_a_${Date.now()}`);
    const userB = await authenticatedPage(browser, `presence_b_${Date.now()}`);

    await userA.page.goto('/users');
    const row = await findUserRow(userA.page, userB.session.user.username);

    await setPresence(userB.page, 'busy', 'Focus block');

    await expect(row.locator('[data-presence-dot="busy"]')).toBeVisible({ timeout: 10000 });
    await expect(row.locator('[title="Focus block"]')).toBeVisible({ timeout: 10000 });

    await userA.context.close();
    await userB.context.close();
  });

  test('presence sync survives a page reload', async ({ browser }) => {
    const userA = await authenticatedPage(browser, `presence_reload_a_${Date.now()}`);
    const userB = await authenticatedPage(browser, `presence_reload_b_${Date.now()}`);

    await setPresence(userB.page, 'dnd');
    await userA.page.reload();
    await userA.page.goto('/users');

    const row = await findUserRow(userA.page, userB.session.user.username);
    await expect(row.locator('[data-presence-dot="dnd"]')).toBeVisible({ timeout: 10000 });

    await userA.context.close();
    await userB.context.close();
  });
});
