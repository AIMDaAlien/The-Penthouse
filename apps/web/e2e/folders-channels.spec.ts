import { test, expect } from '@playwright/test';

async function registerAndLogin(page: any, username: string) {
  await page.goto('/auth');
  await page.getByRole('button', { name: 'Create account' }).first().click();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Display name').fill(username);
  await page.getByLabel('Password', { exact: true }).fill('TestPassword123!');
  await page.getByLabel('Confirm password').fill('TestPassword123!');
  await page.getByLabel(/I understand/i).check();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL('/', { timeout: 15000 });
}

test.describe('Folders & Channels E2E', () => {
  test('create folder, move chat, collapse/expand', async ({ page }) => {
    const username = `folder_${Date.now()}`;
    await registerAndLogin(page, username);

    // 4.1 Create folder
    await page.getByRole('button', { name: /new folder/i }).click();
    await page.getByPlaceholder(/folder name/i).fill('Test Folder');
    await page.getByRole('button', { name: /create/i }).click();

    // Folder should appear
    const folder = page.locator('details').filter({ hasText: 'Test Folder' });
    await expect(folder).toBeVisible();

    // 4.2 Move chat to folder (right-click context menu)
    const generalChat = page.getByRole('button', { name: /general/i }).first();
    await generalChat.click({ button: 'right' });
    await page.getByText(/move to folder/i).click();
    await page.getByText('Test Folder').click();

    // Chat should be inside folder
    await expect(folder.locator('text=General')).toBeVisible();

    // 4.3 Collapse/expand
    await folder.locator('summary').click();
    await expect(folder.locator('text=General')).not.toBeVisible();
    await folder.locator('summary').click();
    await expect(folder.locator('text=General')).toBeVisible();
  });

  test('create and navigate channel', async ({ page }) => {
    const username = `channel_${Date.now()}`;
    await registerAndLogin(page, username);

    // Open General chat
    await page.getByRole('button', { name: /general/i }).first().click();
    await expect(page).toHaveURL(/\/chat\/.+/, { timeout: 5000 });

    // 4.4 Create channel
    await page.getByRole('button', { name: /create channel/i }).click();
    await page.getByPlaceholder(/channel name/i).fill('random');
    await page.getByRole('button', { name: /create/i }).click();

    // Channel should appear in list
    const channel = page.getByRole('button', { name: 'random' });
    await expect(channel).toBeVisible();

    // 4.5 Navigate channel
    await channel.click();
    await expect(page).toHaveURL(/\/chat\/.+/, { timeout: 5000 });

    // Send message in channel
    const input = page.locator('textarea, [contenteditable="true"], input[type="text"]').first();
    await input.fill('Channel message!');
    await input.press('Enter');
    await expect(page.getByText('Channel message!')).toBeVisible();
  });

  test('channel member inheritance for late joiner', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const userA = `late_a_${Date.now()}`;
    const userB = `late_b_${Date.now()}`;

    await registerAndLogin(pageA, userA);
    await registerAndLogin(pageB, userB);

    // User A opens General, creates channel
    await pageA.getByRole('button', { name: /general/i }).first().click();
    await expect(pageA).toHaveURL(/\/chat\/.+/, { timeout: 5000 });
    await pageA.getByRole('button', { name: /create channel/i }).click();
    await pageA.getByPlaceholder(/channel name/i).fill('shared');
    await pageA.getByRole('button', { name: /create/i }).click();

    // User B should see the channel without refresh
    await expect(pageB.getByRole('button', { name: 'shared' })).toBeVisible({ timeout: 10000 });

    await ctxA.close();
    await ctxB.close();
  });
});
