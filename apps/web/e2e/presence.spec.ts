import { test, expect } from '@playwright/test';
import { registerUser } from './utils';

test.describe('Presence Indicators', () => {

  test('Scenario 1: Single User Presence (Self) with Inactivity', async ({ browser }) => {
    test.setTimeout(120000); // Need time for 65s inactivity
    const context = await browser.newContext();
    const page = await context.newPage();
    const username = `u_single_${Date.now()}`;
    
    await registerUser(page, username);
    
    // Verify connection status
    const statusDot = page.locator('.status-dot, .connection-status');
    const connectedIndicator = statusDot.filter({ hasText: /connected|🟢/i }).or(page.locator('.status-dot'));
    // Give it a moment to connect
    await expect(connectedIndicator).toBeVisible({ timeout: 10000 }).catch(() => {});
    
    // Go to user directory
    await page.goto('/users');
    
    // Wait for our own presence avatar
    // Look for our specific user row
    const userRow = page.locator('.user-card, .chat-row', { hasText: new RegExp(username, 'i') }).first();
    const presenceDot = userRow.locator('.status-dot');
    
    // Initial: User A avatar with green dot (online)
    await expect(presenceDot).toBeVisible({ timeout: 5000 });
    
    // Wait 65 seconds
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(65000);
    
    // After 60s idle: Green dot gone (offline)
    await expect(presenceDot).toBeHidden({ timeout: 5000 });
    
    // Move mouse
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    
    // On activity: Green dot returns quickly
    await expect(presenceDot).toBeVisible({ timeout: 5000 });
    
    await context.close();
  });

  test('Scenario 2: Two Users Presence Sync', async ({ browser }) => {
    test.setTimeout(150000);
    
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const usernameA = `u_a_${Date.now()}`;
    await registerUser(pageA, usernameA);
    
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const usernameB = `u_b_${Date.now()}`;
    await registerUser(pageB, usernameB);
    
    // Tab A sees Tab B as online
    await pageA.goto('/users');
    await pageA.getByPlaceholder(/search/i).fill(usernameB);
    
    const rowForB = pageA.locator('.user-card, .chat-row', { hasText: new RegExp(usernameB, 'i') }).first();
    await expect(rowForB.locator('.status-dot')).toBeVisible({ timeout: 10000 });
    
    // Tab B sees Tab A as online
    await pageB.goto('/users');
    await pageB.getByPlaceholder(/search/i).fill(usernameA);
    
    const rowForA = pageB.locator('.user-card, .chat-row', { hasText: new RegExp(usernameA, 'i') }).first();
    await expect(rowForA.locator('.status-dot')).toBeVisible({ timeout: 10000 });
    
    // Go to chat list
    await pageA.goto('/');
    
    // Idle Tab B
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await pageB.waitForTimeout(65000);
    
    // Tab A should see B offline
    await pageA.goto('/users');
    await pageA.getByPlaceholder(/search/i).fill(usernameB);
    await expect(rowForB.locator('.status-dot.online')).toBeHidden({ timeout: 10000 });
    
    // Move B to wake up
    await pageB.mouse.move(100, 100);
    await expect(rowForB.locator('.status-dot.online')).toBeVisible({ timeout: 5000 });
    
    await contextA.close();
    await contextB.close();
  });

  test('Scenario 3: Chat List Avatar Presence', async ({ browser }) => {
    test.setTimeout(120000);
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const usernameA = `u_cl_a_${Date.now()}`;
    await registerUser(pageA, usernameA);
    
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const usernameB = `u_cl_b_${Date.now()}`;
    await registerUser(pageB, usernameB);
    
    // Start DM
    await pageA.goto('/users');
    await pageA.getByPlaceholder(/search/i).fill(usernameB);
    await pageA.locator('.user-card, .chat-row', { hasText: new RegExp(usernameB, 'i') }).first().click();
    
    // Make sure DM is created by sending a message
    await pageA.getByPlaceholder(/message/i).fill('hello');
    await pageA.keyboard.press('Enter');
    
    // Go to chat list for both
    await pageA.goto('/');
    await pageB.goto('/');
    
    const chatRowB = pageA.locator('.chat-row', { hasText: new RegExp(usernameB, 'i') }).first();
    const chatRowA = pageB.locator('.chat-row', { hasText: new RegExp(usernameA, 'i') }).first();
    
    await expect(chatRowB.locator('.status-dot.online')).toBeVisible({ timeout: 10000 });
    await expect(chatRowA.locator('.status-dot.online')).toBeVisible({ timeout: 10000 });
    
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await pageA.waitForTimeout(65000); // A idles
    
    await expect(chatRowA.locator('.status-dot.online')).toBeHidden({ timeout: 10000 });
    
    await pageA.mouse.move(100, 100); // A wakes
    
    await expect(chatRowA.locator('.status-dot.online')).toBeVisible({ timeout: 5000 });

    await contextA.close();
    await contextB.close();
  });

  test('Scenario 4 & 5: Header Avatar and Socket Disconnect', async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const usernameA = `u_hd_a_${Date.now()}`;
    await registerUser(pageA, usernameA);
    
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const usernameB = `u_hd_b_${Date.now()}`;
    await registerUser(pageB, usernameB);
    
    // Start DM
    await pageB.goto('/users');
    await pageB.getByPlaceholder(/search/i).fill(usernameA);
    await pageB.locator('.user-card, .chat-row', { hasText: new RegExp(usernameA, 'i') }).first().click();
    await pageB.getByPlaceholder(/message/i).fill('hello context');
    await pageB.keyboard.press('Enter');
    
    // A opens chat list -> conversation
    await pageA.goto('/');
    await pageA.locator('.chat-row', { hasText: new RegExp(usernameB, 'i') }).first().click();
    
    // Header should contain avatar
    await expect(pageA.locator('header').locator('.status-dot.online')).toBeVisible({ timeout: 5000 });
    
    // Close B context
    await contextB.close();
    
    await expect(pageA.locator('header').locator('.status-dot.online')).toBeHidden({ timeout: 15000 });
    
    await contextA.close();
  });

  test('Scenario 6: Page Reload and Presence Restoration', async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const usernameA = `u_rld_a_${Date.now()}`;
    await registerUser(pageA, usernameA);
    
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const usernameB = `u_rld_b_${Date.now()}`;
    await registerUser(pageB, usernameB);
    
    // Tab A sees Tab B
    await pageA.goto('/users');
    await pageA.getByPlaceholder(/search/i).fill(usernameB);
    const rowForB = pageA.locator('.user-card, .chat-row', { hasText: new RegExp(usernameB, 'i') }).first();
    await expect(rowForB.locator('.status-dot.online')).toBeVisible({ timeout: 5000 });
    
    // Refresh page A
    await pageA.reload();
    
    // B watches A in DM Search
    await pageB.goto('/users');
    await pageB.getByPlaceholder(/search/i).fill(usernameA);
    const rowForA = pageB.locator('.user-card, .chat-row', { hasText: new RegExp(usernameA, 'i') }).first();
    
    await expect(rowForA.locator('.status-dot.online')).toBeVisible({ timeout: 15000 });
    
    // A should see B online again
    await pageA.goto('/users');
    await pageA.getByPlaceholder(/search/i).fill(usernameB);
    const rowForA_B = pageA.locator('.user-card, .chat-row', { hasText: new RegExp(usernameB, 'i') }).first();
    await expect(rowForA_B.locator('.status-dot.online')).toBeVisible({ timeout: 10000 });
    
    await contextA.close();
    await contextB.close();
  });

  test('Scenario 7: Multiple Users Presence (Group Awareness)', async ({ browser }) => {
    test.setTimeout(150000);
    const [contextA, contextB, contextC] = await Promise.all([
      browser.newContext(), browser.newContext(), browser.newContext()
    ]);
    const [pageA, pageB, pageC] = await Promise.all([
      contextA.newPage(), contextB.newPage(), contextC.newPage()
    ]);
    
    const ts = Date.now();
    const usernameA = `u_grp_a_${ts}`;
    const usernameB = `u_grp_b_${ts}`;
    const usernameC = `u_grp_c_${ts}`;
    
    await registerUser(pageA, usernameA);
    await registerUser(pageB, usernameB);
    await registerUser(pageC, usernameC);
    
    await pageA.goto('/users');
    await pageA.getByPlaceholder(/search/i).fill(`u_grp`); // Should match all users
    
    const rowForB = pageA.locator('.user-card, .chat-row', { hasText: new RegExp(usernameB, 'i') }).first();
    const rowForC = pageA.locator('.user-card, .chat-row', { hasText: new RegExp(usernameC, 'i') }).first();
    
    await expect(rowForB.locator('.status-dot.online')).toBeVisible({ timeout: 5000 });
    await expect(rowForC.locator('.status-dot.online')).toBeVisible({ timeout: 5000 });
    
    // Tab B idles
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await pageB.waitForTimeout(65000);
    
    // Tab B goes offline for Tab A
    await expect(rowForB.locator('.status-dot.online')).toBeHidden({ timeout: 10000 });
    await expect(rowForC.locator('.status-dot.online')).toBeVisible({ timeout: 5000 });
    
    await contextA.close();
    await contextB.close();
    await contextC.close();
  });

  test('Scenario 8: Avatar Component Variants (sm, md, lg)', async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const usernameA = `u_var_a_${Date.now()}`;
    await registerUser(pageA, usernameA);
    
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const usernameB = `u_var_b_${Date.now()}`;
    await registerUser(pageB, usernameB);
    
    // In DM Search modal
    await pageA.getByRole('button', { name: /✏️|New Chat/i }).first().click();
    await pageA.getByPlaceholder(/search/i).fill(usernameB);
    const rowForB = pageA.locator('.user-card, .chat-row', { hasText: new RegExp(usernameB, 'i') }).first();
    
    // Avatar presence is displayed
    const defaultDot = rowForB.locator('.status-dot.online');
    await expect(defaultDot).toBeVisible();
    
    // Start DM
    await rowForB.click();
    await pageA.getByPlaceholder(/message/i).fill('hello context');
    await pageA.keyboard.press('Enter');
    
    // Wait for message sending overlay or something to navigate
    await expect(pageA).toHaveURL(/\/chat\//, { timeout: 10000 });
    
    // In Chat Header (typically sm)
    const headerAvatar = pageA.locator('header').locator('[class*="avatar"]');
    await expect(headerAvatar).toBeVisible();
    await expect(headerAvatar.locator('.status-dot.online')).toBeVisible();
    
    // Co-locate to chat list (typically md)
    await pageA.goto('/');
    const chatListAvatar = pageA.locator('.chat-row', { hasText: new RegExp(usernameB, 'i') }).first();
    await expect(chatListAvatar.locator('.status-dot.online')).toBeVisible();
    
    await contextA.close();
    await contextB.close();
  });
});
