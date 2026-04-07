import { test, expect } from '@playwright/test';
import { expectAxePasses, takeVisualSnapshot, humanSwipe, throttleNetwork } from './qa-utils';
import { registerUser } from './utils';

test.describe('Handoff Feature #6: Chat Muting Context Menu', () => {
  let userA: string;
  let userB: string;

  test.beforeAll(async ({ browser }) => {
    // Generate test accounts
    userA = `u_mute_${Date.now()}_a`;
    userB = `u_mute_${Date.now()}_b`;
    
    // We need logic to generate a message between them so a chat row exists.
    // Set up via User B
    const pageB = await browser.newPage();
    await registerUser(pageB, userB);
    await pageB.goto('/users');
    await pageB.getByPlaceholder(/search/i).fill(userA);
    // User A might not exist yet if they didn't register. Register A first.
    await pageB.close();
  });

  test.beforeEach(async ({ page }) => {
    // Ensure both users exist for the test setup
    userA = `u_mute_${Date.now()}_a`;
    userB = `u_mute_${Date.now()}_b`;
    
    // A registers
    await registerUser(page, userA);
    
    // Create new tab context to log in B
    const contextB = await page.context().browser()!.newContext();
    const pageB = await contextB.newPage();
    await registerUser(pageB, userB);
    
    // B sends message to A
    await pageB.goto('/users');
    await pageB.getByPlaceholder(/search/i).fill(userA);
    await pageB.getByRole('button', { name: new RegExp(userA, 'i') }).click();
    await pageB.getByPlaceholder(/message/i).fill('Hello A, I am B!');
    await pageB.getByRole('button', { name: /send/i }).click();
    
    // Wait for B to send
    await pageB.waitForSelector('.bubble.mine:not(.pending)', { timeout: 10000 });
    await contextB.close();
    
    // A goes to chat list
    await page.goto('/');
    await page.waitForSelector('.chat-row');
  });

  test('Long-press behavior opens context menu & prevents navigation', async ({ page }) => {
    const chatRow = page.locator('.chat-row').first();
    const box = await chatRow.boundingBox();
    if (!box) throw new Error('Chat row not found');
    
    // 1. Quick click navigates immediately
    await chatRow.click();
    await expect(page).toHaveURL(/\/chat\//);
    await page.goto('/'); // go back
    
    // 2. Long-press
    await page.waitForSelector('.chat-row');
    // Using custom gestures or standard playwright down/up
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(600); // Wait 600ms for long press
    await page.mouse.up();
    
    // Context menu should appear
    const menu = page.locator('.context-menu');
    await expect(menu).toBeVisible();
    // And we should STILL be on the home page (no navigation)
    await expect(page).toHaveURL('http://localhost:5173/');

    // Run Axe A11y check while menu is open
    await expectAxePasses(page);

    // Percy baseline for context menu
    await takeVisualSnapshot(page, 'Context Menu Open');
    
    // Cancel closes it
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(menu).toBeHidden();
  });

  test('Right-click behavior opens immediately', async ({ page }) => {
    const chatRow = page.locator('.chat-row').first();
    
    // Right click
    await chatRow.click({ button: 'right' });
    
    const menu = page.locator('.context-menu');
    await expect(menu).toBeVisible();
    await expect(page).toHaveURL('http://localhost:5173/'); // No nav
  });

  test('Mute toggle interaction & optimism', async ({ page }) => {
    const chatRow = page.locator('.chat-row').first();
    
    // Ensure we have an unread badge initially (User B sent a message)
    await expect(chatRow.locator('.unread-badge')).toBeVisible();

    // Right click
    await chatRow.click({ button: 'right' });
    
    // Click 'Mute'
    const muteBtn = page.getByRole('button', { name: /mute notifications/i });
    await expect(muteBtn).toBeVisible();
    
    await muteBtn.click();
    
    // Menu closes
    await expect(page.locator('.context-menu')).toBeHidden();
    
    // Chat row becomes muted (opacity/bell icon)
    await expect(chatRow).toHaveClass(/muted/);
    await expect(chatRow.locator('.muted-icon')).toBeVisible();
    
    // Unread badge is HIDDEN when muted
    await expect(chatRow.locator('.unread-badge')).toBeHidden();
    
    // Visual baseline of muted state
    await takeVisualSnapshot(page, 'Muted Chat Row');
    
    // Unmute
    await chatRow.click({ button: 'right' });
    await page.getByRole('button', { name: /unmute notifications/i }).click();
    
    await expect(chatRow).not.toHaveClass(/muted/);
    await expect(chatRow.locator('.unread-badge')).toBeVisible();
  });

  test('Network failure rollback (Optimistic UI)', async ({ page }) => {
    // We need to test the route failing. Playwright lets us abort the mutate API
    await page.route('**/api/chats/*/mute', route => route.abort('failed'));
    
    const chatRow = page.locator('.chat-row').first();
    await chatRow.click({ button: 'right' });
    await page.getByRole('button', { name: /mute notifications/i }).click();
    
    // The UI optimistically tries to apply the mute class, but it should fail
    // It reverts and shows an error message toast
    await expect(chatRow).not.toHaveClass(/muted/, { timeout: 3000 });
    
    // Verify toast or error state message is present
    await expect(page.locator('.state-msg.error').or(page.locator('.send-error'))).toContainText('Failed to');
  });

});
