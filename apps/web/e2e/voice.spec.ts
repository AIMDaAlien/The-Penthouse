import { test, expect, type Page } from '@playwright/test';

// Configuration for fake media streams to bypass microphone permission
// and inject synthetic audio into WebRTC connections.
test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  }
});

async function registerAndLogin(page: Page, username: string) {
  await page.goto('/auth');
  const createAccountBtn = page.getByRole('button', { name: 'Create account' }).first();
  await expect(async () => {
    await createAccountBtn.click();
    await expect(page.getByLabel('Display name')).toBeVisible({ timeout: 1000 });
  }).toPass();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Display name').fill(username);
  await page.getByLabel('Password', { exact: true }).fill('Password123!');
  await page.getByLabel('Confirm password').fill('Password123!');
  await page.getByLabel(/I understand/i).check();
  
  // Wait for network idle or URL change
  await page.locator('button[type="submit"]').click();
  
  // Wait for redirect to chat
  await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible({ timeout: 15000 });
  
  // Navigate to chat if not already there
  if (page.url().includes('/auth')) {
     await page.goto('/');
  }
  
  // Enter the first available chat
  await expect(async () => {
    await page.getByRole('button', { name: /Open chat/i }).first().click({ force: true });
    await expect(page).toHaveURL(/\/chat\/.+/, { timeout: 1000 });
  }).toPass();
}

test.describe('Voice Chat E2E', () => {
  test('Test 1: Join and leave voice room', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const username = `v_test1_${Date.now()}`;
    await registerAndLogin(page, username);

    // Wait for chat UI to load
    await expect(page.getByRole('button', { name: 'Join voice' })).toBeVisible({ timeout: 15000 });
    
    // Join voice
    await page.getByRole('button', { name: 'Join voice' }).click();
    
    // Check pill appears
    const youPill = page.locator('.voice-pill.self');
    await expect(youPill).toBeVisible();
    await expect(youPill).toContainText('You');

    // Mute
    await page.getByRole('button', { name: 'Mute' }).click();
    await expect(youPill).toContainText('(muted)');
    await expect(youPill).toHaveClass(/muted/);
    await expect(youPill).not.toHaveClass(/speaking/);

    // Unmute
    await page.getByRole('button', { name: 'Unmute' }).click();
    await expect(youPill).not.toContainText('(muted)');

    // Leave
    await page.getByRole('button', { name: 'Leave voice' }).click();
    await expect(youPill).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Join voice' })).toBeVisible();
  });

  test('Test 2, 3, 4: Two-User Audio Flow, Mute Sync, Deafen Sync', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    const userA = `v_test2a_${Date.now()}`;
    const userB = `v_test2b_${Date.now()}`;
    
    await registerAndLogin(pageA, userA);
    await registerAndLogin(pageB, userB);

    // Ensure they are both in the chat view before clicking Join voice
    await expect(pageA.getByRole('button', { name: 'Join voice' })).toBeVisible({ timeout: 15000 });
    await expect(pageB.getByRole('button', { name: 'Join voice' })).toBeVisible({ timeout: 15000 });

    // Both join voice
    await pageA.getByRole('button', { name: 'Join voice' }).click();
    await pageB.getByRole('button', { name: 'Join voice' }).click();

    // Verify pills
    const pillAOnB = pageB.locator('.voice-pill').filter({ hasText: userA });
    const pillBOnA = pageA.locator('.voice-pill').filter({ hasText: userB });

    await expect(pillAOnB).toBeVisible({ timeout: 10000 });
    await expect(pillBOnA).toBeVisible({ timeout: 10000 });

    // Verify speaking state syncs
    await expect(pillAOnB).toHaveClass(/speaking/, { timeout: 15000 });
    await expect(pillBOnA).toHaveClass(/speaking/, { timeout: 15000 });

    // Test 3: Mute Sync
    await pageA.getByRole('button', { name: 'Mute' }).click();
    await expect(pageA.locator('.voice-pill.self')).toContainText('(muted)');
    await expect(pillAOnB).toContainText('(muted)');
    await expect(pillAOnB).toHaveClass(/muted/);

    await pageA.getByRole('button', { name: 'Unmute' }).click();
    await expect(pillAOnB).not.toContainText('(muted)');

    // Test 4: Deafen Sync
    await pageA.getByRole('button', { name: 'Deafen' }).click();
    await expect(pageA.getByRole('button', { name: 'Undeafen' })).toBeVisible();
    await expect(pillAOnB).toContainText('(deafened)');
    await expect(pillAOnB).toHaveClass(/deafened/);

    await pageA.getByRole('button', { name: 'Undeafen' }).click();
    await expect(pillAOnB).not.toContainText('(deafened)');
  });

  test('Test 5: Push-to-talk', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const username = `v_ptt_${Date.now()}`;
    await registerAndLogin(page, username);

    await expect(page.getByRole('button', { name: 'Join voice' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Join voice' }).click();
    
    // Enable PTT
    await page.getByRole('button', { name: 'Switch to push-to-talk' }).click();
    
    const youPill = page.locator('.voice-pill.self');
    await expect(youPill).toContainText('(PTT)');
    
    // Should be muted initially
    await expect(youPill).not.toHaveClass(/speaking/);
    
    // Make sure focus is on the body, not an input
    await page.locator('body').click();

    // Press Space
    await page.keyboard.down('Space');
    await expect(youPill).toHaveClass(/ptt-active/);

    // Release Space
    await page.keyboard.up('Space');
    await expect(youPill).not.toHaveClass(/ptt-active/);
    await expect(youPill).not.toHaveClass(/speaking/);
  });
  
  test('Test 7: Disconnect Cleanup', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    const userA = `v_dcA_${Date.now()}`;
    const userB = `v_dcB_${Date.now()}`;
    
    await registerAndLogin(pageA, userA);
    await registerAndLogin(pageB, userB);

    await expect(pageA.getByRole('button', { name: 'Join voice' })).toBeVisible({ timeout: 15000 });
    await expect(pageB.getByRole('button', { name: 'Join voice' })).toBeVisible({ timeout: 15000 });

    await pageA.getByRole('button', { name: 'Join voice' }).click();
    await pageB.getByRole('button', { name: 'Join voice' }).click();

    const pillAOnB = pageB.locator('.voice-pill').filter({ hasText: userA });
    await expect(pillAOnB).toBeVisible({ timeout: 10000 });

    // Close pageA
    await pageA.close();

    // Verify User A disappears from B's screen
    await expect(pillAOnB).not.toBeVisible({ timeout: 10000 });
  });
});
