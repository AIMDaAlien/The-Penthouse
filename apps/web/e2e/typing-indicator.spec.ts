/**
 * Typing Indicator E2E
 * Tests that typing events are broadcast via socket and rendered for the other user.
 */
import { test, expect, Browser } from '@playwright/test';
import { registerUser, openDmWithUser } from './utils';

async function setupTwoUsers(browser: Browser) {
  const ts = Date.now();
  const userA = `typing_a_${ts}`;
  const userB = `typing_b_${ts}`;

  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await registerUser(pageA, userA);

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await registerUser(pageB, userB);

  return { ctxA, pageA, userA, ctxB, pageB, userB };
}

test.describe('Typing Indicator', () => {
  test('User B sees "is typing" when User A types and it disappears when typing stops', async ({ browser }) => {
    const { ctxA, pageA, userA, ctxB, pageB, userB } = await setupTwoUsers(browser);

    // Both users open the DM
    await openDmWithUser(pageA, userB);
    await openDmWithUser(pageB, userA);

    const composerA = pageA.getByPlaceholder(/^Message/);
    const typingIndicatorB = pageB.locator('.typing-indicator');

    // User A starts typing (without sending)
    await composerA.fill('typing something');

    // User B should see the typing indicator
    await expect(typingIndicatorB.locator('.typing-row')).toBeVisible({ timeout: 5000 });

    // User A clears input to trigger typing stop
    await composerA.fill('');

    // Typing indicator should disappear
    await expect(typingIndicatorB.locator('.typing-row')).toBeHidden({ timeout: 5000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('typing indicator disappears after message is sent', async ({ browser }) => {
    const { ctxA, pageA, userA, ctxB, pageB, userB } = await setupTwoUsers(browser);

    await openDmWithUser(pageA, userB);
    await openDmWithUser(pageB, userA);

    const composerA = pageA.getByPlaceholder(/^Message/);
    const typingIndicatorB = pageB.locator('.typing-indicator');

    // User A starts typing
    await composerA.fill('hello there');
    await expect(typingIndicatorB.locator('.typing-row')).toBeVisible({ timeout: 5000 });

    // User A sends the message
    await pageA.getByRole('button', { name: 'Send message' }).click();

    // Message appears and typing indicator disappears
    await expect(pageB.locator('.msg:not(.own)', { hasText: 'hello there' })).toBeVisible({ timeout: 5000 });
    await expect(typingIndicatorB.locator('.typing-row')).toBeHidden({ timeout: 5000 });

    await ctxA.close();
    await ctxB.close();
  });
});
