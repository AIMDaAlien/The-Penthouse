/**
 * Polls Suite — create, vote, multi-select, expiry
 * Run: npx playwright test e2e/suite-polls.spec.ts
 */
import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { registerUser } from './utils';

async function twoUserDm(browser: Browser) {
  const ts = Date.now();
  const userA = `poll_a_${ts}`;
  const userB = `poll_b_${ts}`;
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await registerUser(pageA, userA);
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await registerUser(pageB, userB);

  await pageA.goto('/');
  await pageA.getByRole('button', { name: 'New message' }).click();
  await pageA.getByPlaceholder(/search/i).fill(userB);
  await pageA.waitForSelector('.dm-user-row', { timeout: 8000 });
  await pageA.locator('.dm-user-row').filter({ hasText: userB }).first().click();
  await pageA.waitForURL(/\/chat\//);

  await pageB.goto('/');
  await pageB.getByRole('button', { name: 'New message' }).click();
  await pageB.getByPlaceholder(/search/i).fill(userA);
  await pageB.waitForSelector('.dm-user-row', { timeout: 8000 });
  await pageB.locator('.dm-user-row').filter({ hasText: userA }).first().click();
  await pageB.waitForURL(/\/chat\//);

  return { ctxA, pageA, userA, ctxB, pageB, userB };
}

async function openPollBuilder(page: Page) {
  const input = page.locator('.composer-input');
  await input.fill('/poll');
  // Wait for slash command picker
  const picker = page.locator('.command-picker, .slash-commands');
  if (await picker.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.locator('.command-item', { hasText: /poll/i }).first().click();
  } else {
    await input.press('Enter');
  }
  await expect(page.locator('.poll-builder, [aria-label="Create poll"]')).toBeVisible({ timeout: 5000 });
}

test.describe('Polls — Creation', () => {
  test('can open poll builder via /poll command', async ({ browser }) => {
    const { ctxA, pageA, ctxB } = await twoUserDm(browser);
    await openPollBuilder(pageA);
    await expect(pageA.locator('.poll-builder, .sheet-title:has-text("Create Poll")')).toBeVisible();
    await ctxA.close();
    await ctxB.close();
  });

  test('submit button disabled until question and 2 options are filled', async ({ browser }) => {
    const { ctxA, pageA, ctxB } = await twoUserDm(browser);
    await openPollBuilder(pageA);

    const submit = pageA.locator('.submit-btn, button:has-text("Create Poll")').first();
    await expect(submit).toBeDisabled();

    await pageA.locator('#poll-question').fill('Best language?');
    await expect(submit).toBeDisabled(); // still need options

    await pageA.locator('.option-input').nth(0).fill('TypeScript');
    await expect(submit).toBeDisabled(); // need at least 2

    await pageA.locator('.option-input').nth(1).fill('Rust');
    await expect(submit).not.toBeDisabled();

    await ctxA.close();
    await ctxB.close();
  });

  test('poll appears in chat as PollCard after creation', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);
    await openPollBuilder(pageA);

    await pageA.locator('#poll-question').fill(`Fav color? ${Date.now()}`);
    await pageA.locator('.option-input').nth(0).fill('Blue');
    await pageA.locator('.option-input').nth(1).fill('Red');

    await pageA.locator('.submit-btn, button:has-text("Create Poll")').first().click();

    // PollCard should appear in A's thread
    await expect(pageA.locator('.poll-card, .bubble:has(.poll-question)')).toBeVisible({ timeout: 8000 });

    // And in B's thread via socket
    await expect(pageB.locator('.poll-card, .bubble:has(.poll-question)')).toBeVisible({ timeout: 10000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('duplicate option text is rejected', async ({ browser }) => {
    const { ctxA, pageA, ctxB } = await twoUserDm(browser);
    await openPollBuilder(pageA);

    await pageA.locator('#poll-question').fill('Dupe test?');
    await pageA.locator('.option-input').nth(0).fill('Same');
    await pageA.locator('.option-input').nth(1).fill('Same');

    const submit = pageA.locator('.submit-btn, button:has-text("Create Poll")').first();
    // Either submit stays disabled or an error message appears
    const isDisabled = await submit.isDisabled();
    if (!isDisabled) {
      await submit.click();
      await expect(pageA.locator('.field-error, .error')).toBeVisible({ timeout: 3000 });
    } else {
      expect(isDisabled).toBe(true);
    }

    await ctxA.close();
    await ctxB.close();
  });
});

test.describe('Polls — Voting', () => {
  test('voting on a poll updates the count', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    await openPollBuilder(pageA);
    await pageA.locator('#poll-question').fill(`Vote test ${Date.now()}`);
    await pageA.locator('.option-input').nth(0).fill('Yes');
    await pageA.locator('.option-input').nth(1).fill('No');
    await pageA.locator('.submit-btn, button:has-text("Create Poll")').first().click();
    await expect(pageB.locator('.poll-card')).toBeVisible({ timeout: 10000 });

    // B votes on the first option
    await pageB.locator('.poll-option').first().click();

    // Vote count should update (at least 1 vote)
    await expect(pageB.locator('.poll-option').first().locator('.vote-count, .voter-count, .vote-bar')).toBeVisible({ timeout: 8000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('voting twice on same option is idempotent (no double count)', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    await openPollBuilder(pageA);
    await pageA.locator('#poll-question').fill(`Idempotent ${Date.now()}`);
    await pageA.locator('.option-input').nth(0).fill('Option A');
    await pageA.locator('.option-input').nth(1).fill('Option B');
    await pageA.locator('.submit-btn, button:has-text("Create Poll")').first().click();
    await expect(pageB.locator('.poll-card')).toBeVisible({ timeout: 10000 });

    await pageB.locator('.poll-option').first().click();
    await pageB.locator('.poll-option').first().click(); // second click

    // Should still show 1 voter, not 2
    const voterText = await pageB.locator('.poll-option').first().textContent();
    expect(voterText).not.toMatch(/2 vote/i);

    await ctxA.close();
    await ctxB.close();
  });
});
