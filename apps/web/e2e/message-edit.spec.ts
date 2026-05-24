/**
 * Message Edit E2E
 * Tests that a user can edit their own message, the edit syncs to the other user,
 * and the edited marker appears.
 */
import { test, expect, Browser } from '@playwright/test';
import { registerUser, openDmWithUser } from './utils';

async function setupTwoUsers(browser: Browser) {
  const ts = Date.now();
  const userA = `edit_a_${ts}`;
  const userB = `edit_b_${ts}`;

  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await registerUser(pageA, userA);

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await registerUser(pageB, userB);

  return { ctxA, pageA, userA, ctxB, pageB, userB };
}

test.describe('Message Edit', () => {
  test('user can edit their own message and the edit syncs to the other user', async ({ browser }) => {
    const { ctxA, pageA, userA, ctxB, pageB, userB } = await setupTwoUsers(browser);

    await openDmWithUser(pageA, userB);
    await openDmWithUser(pageB, userA);

    const originalMsg = `orig-${Date.now()}`;
    const editedMsg = `edited-${Date.now()}`;

    // User A sends a message
    await pageA.getByPlaceholder(/^Message/).fill(originalMsg);
    await pageA.getByRole('button', { name: 'Send message' }).click();

    // Both users see the original message
    const bubbleA = pageA.locator('.msg.own', { hasText: originalMsg });
    const bubbleB = pageB.locator('.msg:not(.own)', { hasText: originalMsg });
    await expect(bubbleA).toBeVisible({ timeout: 5000 });
    await expect(bubbleB).toBeVisible({ timeout: 8000 });

    // Handle the edit prompt dialog on pageA
    pageA.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept(editedMsg);
    });

    // User A opens message actions and clicks Edit
    await bubbleA.hover();
    await bubbleA.locator('button[aria-label="More"]').click();
    await bubbleA.locator('.menu button', { hasText: 'Edit' }).click();

    // Edited message appears for A with edited marker
    const editedBubbleA = pageA.locator('.msg.own', { hasText: editedMsg });
    await expect(editedBubbleA).toBeVisible({ timeout: 5000 });
    await expect(editedBubbleA.locator('.edited')).toBeVisible({ timeout: 5000 });

    // Edited message syncs to B with edited marker
    const editedBubbleB = pageB.locator('.msg:not(.own)', { hasText: editedMsg });
    await expect(editedBubbleB).toBeVisible({ timeout: 8000 });
    await expect(editedBubbleB.locator('.edited')).toBeVisible({ timeout: 5000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('edited marker does not appear before editing', async ({ browser }) => {
    const { ctxA, pageA, userA, ctxB, pageB, userB } = await setupTwoUsers(browser);

    await openDmWithUser(pageA, userB);
    await openDmWithUser(pageB, userA);

    const msg = `no-edit-${Date.now()}`;

    await pageA.getByPlaceholder(/^Message/).fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();

    const bubbleA = pageA.locator('.msg.own', { hasText: msg });
    await expect(bubbleA).toBeVisible({ timeout: 5000 });
    await expect(bubbleA.locator('.edited')).not.toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });
});
