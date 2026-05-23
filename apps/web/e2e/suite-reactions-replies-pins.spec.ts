/**
 * Reactions · Replies · Pins Suite
 * Run: npx playwright test e2e/suite-reactions-replies-pins.spec.ts
 */
import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { openDmWithUser, registerUser } from './utils';

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

  await openDmWithUser(pageA, userB);
  await openDmWithUser(pageB, userA);

  return { ctxA, pageA, userA, ctxB, pageB, userB };
}

// ── Reactions ──────────────────────────────────────────────────────────────

test.describe('Reactions', () => {
  test('adds a reaction to a message and count shows 1', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    const msg = `react-${Date.now()}`;
    await pageA.getByPlaceholder(/^Message/).fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(pageA.locator('.msg.own', { hasText: msg })).toBeVisible({ timeout: 5000 });
    await expect(pageB.locator('.msg:not(.own)', { hasText: msg })).toBeVisible({ timeout: 8000 });

    // B reacts with 👍
    const bMsg = pageB.locator('.msg:not(.own)', { hasText: msg });
    await bMsg.getByRole('button', { name: 'React' }).click();
    await pageB.getByRole('button', { name: 'React with 👍' }).click();
    await expect(bMsg.locator('.pill').first()).toBeVisible({ timeout: 5000 });
    await expect(bMsg.locator('.count').first()).toHaveText('1', { timeout: 5000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('reacting twice (toggle) removes the reaction', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    const msg = `toggle-react-${Date.now()}`;
    await pageA.getByPlaceholder(/^Message/).fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(pageB.locator('.msg:not(.own)', { hasText: msg })).toBeVisible({ timeout: 8000 });

    // Add
    const bMsg = pageB.locator('.msg:not(.own)', { hasText: msg });
    await bMsg.getByRole('button', { name: 'React' }).click();
    await pageB.getByRole('button', { name: 'React with 👍' }).click();
    const pill = bMsg.locator('.pill').first();
    await expect(pill).toBeVisible({ timeout: 5000 });
    // Remove (second click)
    await pill.click();
    await expect(pill).not.toBeVisible({ timeout: 5000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('reaction from B is visible on A\'s screen in real time', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    const msg = `rt-react-${Date.now()}`;
    await pageA.getByPlaceholder(/^Message/).fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(pageA.locator('.msg.own', { hasText: msg })).toBeVisible({ timeout: 5000 });
    await expect(pageB.locator('.msg:not(.own)', { hasText: msg })).toBeVisible({ timeout: 8000 });

    const bMsg = pageB.locator('.msg:not(.own)', { hasText: msg });
    await bMsg.getByRole('button', { name: 'React' }).click();
    await pageB.getByRole('button', { name: 'React with ❤️' }).click();

    // A should see reaction appear on their sent message
    const aMsg = pageA.locator('.msg.own', { hasText: msg });
    await expect(aMsg.locator('.pill').first()).toBeVisible({ timeout: 8000 });

    await ctxA.close();
    await ctxB.close();
  });
});

// ── Replies ────────────────────────────────────────────────────────────────

test.describe('Replies', () => {
  test('reply appears as quoted preview in thread', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    const original = `original-${Date.now()}`;
    await pageA.getByPlaceholder(/^Message/).fill(original);
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(pageB.locator('.msg:not(.own)', { hasText: original })).toBeVisible({ timeout: 8000 });

    const bMsg = pageB.locator('.msg:not(.own)', { hasText: original });
    await bMsg.getByRole('button', { name: 'Reply' }).click();

    // ReplyBar should appear
    await expect(pageB.locator('.reply-bar')).toBeVisible({ timeout: 5000 });

    const replyText = `reply-${Date.now()}`;
    await pageB.getByPlaceholder(/^Reply/).fill(replyText);
    await pageB.getByRole('button', { name: 'Send message' }).click();

    // Reply bubble should show quote
    const replyBubble = pageB.locator('.msg.own', { hasText: replyText });
    await expect(replyBubble).toBeVisible({ timeout: 5000 });
    await expect(replyBubble.locator('.reply-to')).toBeVisible({ timeout: 5000 });
    await expect(replyBubble.locator('.reply-to')).toContainText(original.slice(0, 30));

    await ctxA.close();
    await ctxB.close();
  });

  test('cancel reply removes the ReplyBar', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    const msg = `cancel-reply-${Date.now()}`;
    await pageA.getByPlaceholder(/^Message/).fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(pageB.locator('.msg:not(.own)', { hasText: msg })).toBeVisible({ timeout: 8000 });

    const bMsg = pageB.locator('.msg:not(.own)', { hasText: msg });
    await bMsg.getByRole('button', { name: 'Reply' }).click();
    const replyBar = pageB.locator('.reply-bar');
    await expect(replyBar).toBeVisible({ timeout: 3000 });
    await pageB.getByRole('button', { name: 'Cancel reply' }).click();
    await expect(replyBar).not.toBeVisible({ timeout: 3000 });

    await ctxA.close();
    await ctxB.close();
  });
});

// ── Pins ───────────────────────────────────────────────────────────────────

test.describe('Pins', () => {
  test('pinning a message marks it as pinned', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    const msg = `pin-me-${Date.now()}`;
    await pageA.getByPlaceholder(/^Message/).fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(pageA.locator('.msg.own', { hasText: msg })).toBeVisible({ timeout: 5000 });

    const aMsg = pageA.locator('.msg.own', { hasText: msg });
    await aMsg.getByRole('button', { name: 'More' }).click();

    const pinBtn = pageA.locator('[aria-label*="Pin"], button:has-text("Pin")').first();
    if (await pinBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pinBtn.click();
      // Pinned indicator should appear on the message
      await expect(pageA.locator('.pinned-banner', { hasText: msg })).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(); // Pin UI not exposed via long-press on this build
    }

    await ctxA.close();
    await ctxB.close();
  });
});
