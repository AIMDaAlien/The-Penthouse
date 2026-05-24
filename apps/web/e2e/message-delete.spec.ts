/**
 * Message Delete E2E
 * Tests that a user can delete their own message, the delete tombstone appears for both users.
 */
import { test, expect, Browser } from '@playwright/test';
import { registerUser, openDmWithUser } from './utils';

async function setupTwoUsers(browser: Browser) {
  const ts = Date.now();
  const userA = `del_a_${ts}`;
  const userB = `del_b_${ts}`;

  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await registerUser(pageA, userA);

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await registerUser(pageB, userB);

  return { ctxA, pageA, userA, ctxB, pageB, userB };
}

test.describe('Message Delete', () => {
  test('user can delete their own message and tombstone appears for both users', async ({ browser }) => {
    const { ctxA, pageA, userA, ctxB, pageB, userB } = await setupTwoUsers(browser);

    await openDmWithUser(pageA, userB);
    await openDmWithUser(pageB, userA);

    const msg = `delete-me-${Date.now()}`;

    // User A sends a message
    await pageA.getByPlaceholder(/^Message/).fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();

    // Both users see the message
    const bubbleA = pageA.locator('.msg.own', { hasText: msg });
    const bubbleB = pageB.locator('.msg:not(.own)', { hasText: msg });
    await expect(bubbleA).toBeVisible({ timeout: 5000 });
    await expect(bubbleB).toBeVisible({ timeout: 8000 });

    // Handle the delete confirm dialog on pageA
    pageA.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    // User A opens message actions and clicks Delete
    await bubbleA.hover();
    await bubbleA.locator('button[aria-label="More"]').click();
    await bubbleA.locator('.menu button.danger', { hasText: 'Delete' }).click();

    // Tombstone appears for A
    const tombstoneA = pageA.locator('.msg.own .deleted-label');
    await expect(tombstoneA).toBeVisible({ timeout: 5000 });
    await expect(tombstoneA).toHaveText('Message deleted');

    // Tombstone appears for B via socket
    const tombstoneB = pageB.locator('.msg:not(.own) .deleted-label');
    await expect(tombstoneB).toBeVisible({ timeout: 8000 });
    await expect(tombstoneB).toHaveText('Message deleted');

    await ctxA.close();
    await ctxB.close();
  });

  test('deleting a message removes content and shows deleted styling', async ({ browser }) => {
    const { ctxA, pageA, userA, ctxB, pageB, userB } = await setupTwoUsers(browser);

    await openDmWithUser(pageA, userB);
    await openDmWithUser(pageB, userA);

    const msg = `del-style-${Date.now()}`;

    await pageA.getByPlaceholder(/^Message/).fill(msg);
    await pageA.getByRole('button', { name: 'Send message' }).click();

    const bubbleA = pageA.locator('.msg.own', { hasText: msg });
    await expect(bubbleA).toBeVisible({ timeout: 5000 });

    pageA.on('dialog', async (dialog) => {
      if (dialog.type() === 'confirm') await dialog.accept();
    });

    await bubbleA.hover();
    await bubbleA.locator('button[aria-label="More"]').click();
    await bubbleA.locator('.menu button.danger', { hasText: 'Delete' }).click();

    // The bubble should have the deleted class
    const deletedBubbleA = pageA.locator('.msg.own .bubble.deleted');
    await expect(deletedBubbleA).toBeVisible({ timeout: 5000 });

    // Same for B
    const deletedBubbleB = pageB.locator('.msg:not(.own) .bubble.deleted');
    await expect(deletedBubbleB).toBeVisible({ timeout: 8000 });

    await ctxA.close();
    await ctxB.close();
  });
});
