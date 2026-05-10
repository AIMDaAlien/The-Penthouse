import { test, expect } from '@playwright/test';

async function registerAndLogin(page: any, username: string) {
  await page.goto('/auth');
  await page.locator('button.tab').filter({ hasText: 'Create account' }).click();
  await expect(page.locator('#display-name')).toBeVisible();
  await page.locator('#username').fill(username);
  await page.locator('#display-name').fill(username);
  await page.locator('#password').fill('TestPassword123!');
  await page.locator('#confirm-password').fill('TestPassword123!');
  await page.getByLabel(/I understand/i).check();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL('/', { timeout: 15000 });
}

test.describe('Folders & Channels E2E', () => {
  test('create folder, move chat, collapse/expand', async ({ page }) => {
    const username = `folder_${Math.random().toString(36).slice(2, 8)}`;
    await registerAndLogin(page, username);

    // 4.1 Create folder
    await page.locator('button[aria-label="New folder"]:visible').click({ force: true });
    await page.locator('input[placeholder="Folder name"]:visible').fill('Test Folder');
    await page.locator('button[aria-label="Create folder"]:visible').click({ force: true });

    // Folder should appear
    const folder = page.locator('details').filter({ hasText: 'Test Folder' });
    await expect(folder).toBeVisible();

    // 4.2 Move chat to folder (right-click context menu)
    const generalChat = page.locator('button[aria-label="Open chat General"]:visible').first();
    await generalChat.click({ button: 'right', force: true });
    await page.getByText(/move to folder/i).click({ force: true });
    await page.getByText('Test Folder').click({ force: true });

    // Chat should be inside folder
    await expect(folder.locator('text=General')).toBeVisible();

    // 4.3 Collapse/expand
    await folder.locator('summary').click();
    await expect(folder.locator('text=General')).not.toBeVisible();
    await folder.locator('summary').click();
    await expect(folder.locator('text=General')).toBeVisible();
  });

  test('create and navigate channel', async ({ page }) => {
    const username = `channel_${Math.random().toString(36).slice(2, 8)}`;
    await registerAndLogin(page, username);

    // Open General chat
    await page.locator('button[aria-label="Open chat General"]:visible').first().click({ force: true });
    await expect(page).toHaveURL(/\/chat\/.+/, { timeout: 5000 });

    // 4.4 Create channel
    await page.getByRole('button', { name: /create channel/i }).first().click({ force: true });
    await page.locator('input[placeholder="Channel name"]:visible').fill('random');
    await page.getByRole('button', { name: /create/i }).first().click({ force: true });

    // Channel should appear in list (button text is "# random")
    const channel = page.getByRole('button', { name: '# random' });
    await expect(channel).toBeVisible();

    // 4.5 Navigate channel
    await channel.click({ force: true });
    await expect(page).toHaveURL(/\/chat\/.+/, { timeout: 5000 });

    // Send message in channel
    const input = page.locator('input[type="text"][placeholder^="Message"]:visible').first();
    await input.fill('Channel message!');
    await input.press('Enter');
    await expect(page.getByText('Channel message!')).toBeVisible();
  });

  test('channel member inheritance for late joiner', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const userA = `late_a_${Math.random().toString(36).slice(2, 8)}`;
    const userB = `late_b_${Math.random().toString(36).slice(2, 8)}`;

    await registerAndLogin(pageA, userA);
    await registerAndLogin(pageB, userB);

    // User A opens General, creates channel
    await pageA.locator('button[aria-label="Open chat General"]:visible').first().click({ force: true });
    await expect(pageA).toHaveURL(/\/chat\/.+/, { timeout: 5000 });
    await pageA.getByRole('button', { name: /create channel/i }).first().click({ force: true });
    await pageA.locator('input[placeholder="Channel name"]:visible').fill('shared');
    await pageA.getByRole('button', { name: /create/i }).first().click({ force: true });

    // User B should see the channel without refresh
    await expect(pageB.getByRole('button', { name: '# shared' })).toBeVisible({ timeout: 10000 });

    await ctxA.close();
    await ctxB.close();
  });
});
