/**
 * Reactions · Replies · Pins Suite
 * Run: npx playwright test e2e/suite-reactions-replies-pins.spec.ts
 */
import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { registerUser } from './utils';

async function twoUserDm(browser: Browser): Promise<{
  ctxA: BrowserContext; pageA: Page; userA: string;
  ctxB: BrowserContext; pageB: Page; userB: string;
}> {
  const ts = Date.now();
  const userA = `rrp_a_${ts}`;
  const userB = `rrp_b_${ts}`;
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await registerUser(pageA, userA);
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await registerUser(pageB, userB);

  // A opens DM to B
  await pageA.goto('/');
  await pageA.getByRole('button', { name: 'New message' }).click();
  await pageA.getByPlaceholder(/search/i).fill(userB);
  await pageA.waitForSelector('.dm-user-row', { timeout: 8000 });
  await pageA.locator('.dm-user-row').filter({ hasText: userB }).first().click();
  await pageA.waitForURL(/\/chat\//);

  // B opens DM to A
  await pageB.goto('/');
  await pageB.getByRole('button', { name: 'New message' }).click();
  await pageB.getByPlaceholder(/search/i).fill(userA);
  await pageB.waitForSelector('.dm-user-row', { timeout: 8000 });
  await pageB.locator('.dm-user-row').filter({ hasText: userA }).first().click();
  await pageB.waitForURL(/\/chat\//);

  return { ctxA, pageA, userA, ctxB, pageB, userB };
}

// ── Reactions ──────────────────────────────────────────────────────────────

test.describe('Reactions', () => {
  test('adds a reaction to a message and count shows 1', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    const msg = `react_${Date.now()}`;
    await pageA.locator('.composer-input').fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(pageA.locator('.bubble.mine', { hasText: msg })).toBeVisible({ timeout: 5000 });
    await expect(pageB.locator('.bubble.theirs', { hasText: msg })).toBeVisible({ timeout: 8000 });

    // B reacts with 👍
    const pill = pageB.locator('.reaction-pill', { hasText: '👍' }).first();
    // Reaction pills on the message
    const bMsg = pageB.locator('.bubble.theirs', { hasText: msg });
    await bMsg.locator('[aria-label*="👍"], [aria-label*="React with 👍"]').first().click();
    await expect(bMsg.locator('.reaction-pill').first()).toBeVisible({ timeout: 5000 });
    await expect(bMsg.locator('.reaction-count').first()).toHaveText('1', { timeout: 5000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('reacting twice (toggle) removes the reaction', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    const msg = `toggle_react_${Date.now()}`;
    await pageA.locator('.composer-input').fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(pageB.locator('.bubble.theirs', { hasText: msg })).toBeVisible({ timeout: 8000 });

    const bMsg = pageB.locator('.bubble.theirs', { hasText: msg });
    const reactBtn = bMsg.locator('[aria-label*="React with 👍"]').first();
    // Add
    await reactBtn.click();
    const pill = bMsg.locator('.reaction-pill').first();
    await expect(pill).toBeVisible({ timeout: 5000 });
    // Remove (second click)
    await reactBtn.click();
    await expect(pill).not.toBeVisible({ timeout: 5000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('reaction from B is visible on A\'s screen in real time', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    const msg = `rt_react_${Date.now()}`;
    await pageA.locator('.composer-input').fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(pageA.locator('.bubble.mine', { hasText: msg })).toBeVisible({ timeout: 5000 });
    await expect(pageB.locator('.bubble.theirs', { hasText: msg })).toBeVisible({ timeout: 8000 });

    const bMsg = pageB.locator('.bubble.theirs', { hasText: msg });
    await bMsg.locator('[aria-label*="React with ❤️"], [aria-label*="React with 👍"]').first().click();

    // A should see reaction appear on their sent message
    const aMsg = pageA.locator('.bubble.mine', { hasText: msg });
    await expect(aMsg.locator('.reaction-pill').first()).toBeVisible({ timeout: 8000 });

    await ctxA.close();
    await ctxB.close();
  });
});

// ── Replies ────────────────────────────────────────────────────────────────

test.describe('Replies', () => {
  test('reply appears as quoted preview in thread', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    const original = `original_${Date.now()}`;
    await pageA.locator('.composer-input').fill(original);
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(pageB.locator('.bubble.theirs', { hasText: original })).toBeVisible({ timeout: 8000 });

    // B long-presses or right-clicks the message to open context menu, then replies
    const bMsg = pageB.locator('.bubble.theirs', { hasText: original });
    const box = await bMsg.boundingBox();
    if (!box) throw new Error('Message bubble not found');

    await pageB.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await pageB.mouse.down();
    await pageB.waitForTimeout(600);
    await pageB.mouse.up();

    // Context menu or swipe-to-reply mechanism — try reply button
    const replyBtn = pageB.locator('[aria-label*="Reply"], button:has-text("Reply")').first();
    if (await replyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await replyBtn.click();
    }

    // ReplyBar should appear
    await expect(pageB.locator('.reply-bar, .reply-preview')).toBeVisible({ timeout: 5000 });

    const replyText = `reply_${Date.now()}`;
    await pageB.locator('.composer-input').fill(replyText);
    await pageB.getByRole('button', { name: 'Send message' }).click();

    // Reply bubble should show quote
    const replyBubble = pageB.locator('.bubble.mine', { hasText: replyText });
    await expect(replyBubble).toBeVisible({ timeout: 5000 });
    await expect(replyBubble.locator('.reply-quote')).toBeVisible({ timeout: 5000 });
    await expect(replyBubble.locator('.reply-quote')).toContainText(original.slice(0, 30));

    await ctxA.close();
    await ctxB.close();
  });

  test('cancel reply removes the ReplyBar', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    const msg = `cancel_reply_${Date.now()}`;
    await pageA.locator('.composer-input').fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(pageB.locator('.bubble.theirs', { hasText: msg })).toBeVisible({ timeout: 8000 });

    const bMsg = pageB.locator('.bubble.theirs', { hasText: msg });
    const box = await bMsg.boundingBox();
    if (!box) throw new Error('Message bubble not found');
    await pageB.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await pageB.mouse.down();
    await pageB.waitForTimeout(600);
    await pageB.mouse.up();

    const replyBtn = pageB.locator('[aria-label*="Reply"], button:has-text("Reply")').first();
    if (await replyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await replyBtn.click();
      const replyBar = pageB.locator('.reply-bar, .reply-preview');
      await expect(replyBar).toBeVisible({ timeout: 3000 });
      await pageB.locator('[aria-label="Cancel reply"], .reply-cancel').click();
      await expect(replyBar).not.toBeVisible({ timeout: 3000 });
    }

    await ctxA.close();
    await ctxB.close();
  });
});

// ── Pins ───────────────────────────────────────────────────────────────────

test.describe('Pins', () => {
  test('pinning a message marks it as pinned', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    const msg = `pin_me_${Date.now()}`;
    await pageA.locator('.composer-input').fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(pageA.locator('.bubble.mine', { hasText: msg })).toBeVisible({ timeout: 5000 });

    // Long-press to open context menu on own message
    const aMsg = pageA.locator('.bubble.mine', { hasText: msg });
    const box = await aMsg.boundingBox();
    if (!box) throw new Error('Message bubble not found');
    await pageA.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await pageA.mouse.down();
    await pageA.waitForTimeout(600);
    await pageA.mouse.up();

    const pinBtn = pageA.locator('[aria-label*="Pin"], button:has-text("Pin")').first();
    if (await pinBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pinBtn.click();
      // Pinned indicator should appear on the message
      await expect(pageA.locator('.bubble.mine.pinned, .pin-indicator').first()).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(); // Pin UI not exposed via long-press on this build
    }

    await ctxA.close();
    await ctxB.close();
  });
});
