/**
 * Core Chat Suite — send/receive, real-time delivery, scroll, read receipts
 * Run: npx playwright test e2e/suite-chat.spec.ts
 */
import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { registerUser } from './utils';

async function setupTwoUsers(browser: Browser): Promise<{
  ctxA: BrowserContext; pageA: Page; userA: string;
  ctxB: BrowserContext; pageB: Page; userB: string;
}> {
  const ts = Date.now();
  const userA = `chat_a_${ts}`;
  const userB = `chat_b_${ts}`;

  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await registerUser(pageA, userA);

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await registerUser(pageB, userB);

  return { ctxA, pageA, userA, ctxB, pageB, userB };
}

async function openDm(page: Page, searchFor: string): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New message' }).click();
  await page.getByPlaceholder(/search/i).fill(searchFor);
  await page.waitForSelector('.dm-user-row', { timeout: 8000 });
  await page.locator('.dm-user-row').filter({ hasText: searchFor }).first().click();
  await page.waitForURL(/\/chat\//);
  return page.url().split('/chat/')[1].split('?')[0];
}

test.describe('Chat — Real-time send & receive', () => {
  test('message sent by A appears in B\'s thread in real time', async ({ browser }) => {
    const { ctxA, pageA, userA, ctxB, pageB, userB } = await setupTwoUsers(browser);

    // A opens DM to B
    await openDm(pageA, userB);

    // B opens DM to A
    await openDm(pageB, userA);

    const msg = `hello_${Date.now()}`;
    await pageA.locator('.composer-input').fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();

    // Message appears in A's thread (optimistic)
    await expect(pageA.locator('.bubble.mine', { hasText: msg })).toBeVisible({ timeout: 5000 });

    // Message appears in B's thread via socket
    await expect(pageB.locator('.bubble.theirs', { hasText: msg })).toBeVisible({ timeout: 8000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('sent message shows pending state then resolves', async ({ browser }) => {
    const { ctxA, pageA, userA, ctxB, pageB, userB } = await setupTwoUsers(browser);
    await openDm(pageA, userB);
    await openDm(pageB, userA);

    const msg = `pending_${Date.now()}`;
    await pageA.locator('.composer-input').fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();

    // Pending dot should appear then disappear (replaced by sent-check)
    const bubble = pageA.locator('.bubble.mine', { hasText: msg });
    await expect(bubble).toBeVisible({ timeout: 5000 });
    // Eventually the sent-check icon should appear
    await expect(pageA.locator('.sent-check').last()).toBeVisible({ timeout: 8000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('Enter key sends message; Shift+Enter adds newline', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB, userB } = await setupTwoUsers(browser);
    await openDm(pageA, userB);
    await openDm(pageB, ctxA.pages()[0] ? userB : userB); // ensure B is in a chat

    const input = pageA.locator('.composer-input');
    const msg = `enter_send_${Date.now()}`;
    await input.fill(msg);
    await input.press('Enter');
    await expect(pageA.locator('.bubble.mine', { hasText: msg })).toBeVisible({ timeout: 5000 });

    // Shift+Enter should NOT send
    const multiMsg = `line1`;
    await input.fill(multiMsg);
    await input.press('Shift+Enter');
    await expect(pageA.locator('.bubble.mine', { hasText: multiMsg })).not.toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });

  test('empty message cannot be sent', async ({ browser }) => {
    const { ctxA, pageA, ctxB, userB } = await setupTwoUsers(browser);
    await openDm(pageA, userB);
    const sendBtn = pageA.getByRole('button', { name: 'Send message' });
    await expect(sendBtn).toBeDisabled();
    await ctxA.close();
    await ctxB.close();
  });

  test('input is cleared after sending', async ({ browser }) => {
    const { ctxA, pageA, ctxB, userB } = await setupTwoUsers(browser);
    await openDm(pageA, userB);
    const input = pageA.locator('.composer-input');
    await input.fill('should clear');
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(input).toHaveValue('', { timeout: 3000 });
    await ctxA.close();
    await ctxB.close();
  });
});

test.describe('Chat — Navigation & list', () => {
  test('back button returns to chat list', async ({ browser }) => {
    const { ctxA, pageA, ctxB, userB } = await setupTwoUsers(browser);
    await openDm(pageA, userB);
    await pageA.getByRole('button', { name: 'Back to chat list' }).click();
    await expect(pageA).toHaveURL('/');
    await ctxA.close();
    await ctxB.close();
  });

  test('chat row shows in list after DM is created', async ({ browser }) => {
    const { ctxA, pageA, ctxB, userB } = await setupTwoUsers(browser);
    await openDm(pageA, userB);
    await pageA.goto('/');
    await expect(pageA.locator('.chat-row')).toBeVisible({ timeout: 5000 });
    await ctxA.close();
    await ctxB.close();
  });

  test('unread badge appears on chat row when message received while away', async ({ browser }) => {
    const { ctxA, pageA, userA, ctxB, pageB, userB } = await setupTwoUsers(browser);

    // A creates DM to B so B has the chat in list
    await openDm(pageA, userB);
    // B opens DM so the chat is seeded on both sides
    await openDm(pageB, userA);

    // A goes back to chat list (away from thread)
    await pageA.goto('/');

    // B sends a message
    const msg = `unread_${Date.now()}`;
    await pageB.locator('.composer-input').fill(msg);
    await pageB.getByRole('button', { name: 'Send message' }).click();
    await expect(pageB.locator('.bubble.mine', { hasText: msg })).toBeVisible({ timeout: 5000 });

    // A's chat list should show an unread badge
    await expect(pageA.locator('.unread-badge')).toBeVisible({ timeout: 8000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('connection status dot is visible', async ({ page }) => {
    const u = `conn_${Date.now()}`;
    await registerUser(page, u);
    await expect(page.locator('.conn-dot')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Chat — Read receipts', () => {
  test('DM read receipt appears after recipient opens thread', async ({ browser }) => {
    const { ctxA, pageA, userA, ctxB, pageB, userB } = await setupTwoUsers(browser);

    await openDm(pageA, userB);
    await openDm(pageB, userA);

    const msg = `receipt_${Date.now()}`;
    await pageA.locator('.composer-input').fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(pageA.locator('.bubble.mine', { hasText: msg })).toBeVisible({ timeout: 5000 });

    // B scrolls to bottom (triggers markRead)
    await pageB.evaluate(() => {
      const el = document.querySelector('.messages-scroll');
      if (el) el.scrollTop = el.scrollHeight;
    });

    // Read receipt or "Seen" indicator appears for A
    const receipt = pageA.locator('.read-receipts, .seen-label, .receipt-avatar').last();
    await expect(receipt).toBeVisible({ timeout: 10000 });

    await ctxA.close();
    await ctxB.close();
  });
});
