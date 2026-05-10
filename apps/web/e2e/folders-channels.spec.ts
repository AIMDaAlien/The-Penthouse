import { test, expect, type Page } from '@playwright/test';

async function switchToRegister(page: Page) {
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.locator('#display-name')).toBeVisible();
}

async function registerAndLogin(page: Page, username: string) {
  await page.goto('/auth');
  await switchToRegister(page);
  await page.locator('#username').fill(username);
  await page.locator('#display-name').fill(username);
  await page.locator('#password').fill('TestPassword123!');
  await page.locator('#confirm-password').fill('TestPassword123!');
  await page.getByLabel(/I understand/i).check();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL('/', { timeout: 15000 });
  await expect(page.getByText(/connected/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Open chat General' })).toBeVisible({ timeout: 15000 });
}

async function openGeneralChat(page: Page) {
  await expect(async () => {
    await page.getByRole('button', { name: 'Open chat General' }).click();
    await expect(page).toHaveURL(/\/chat\/.+/, { timeout: 1000 });
  }).toPass({ timeout: 5000 });
}

test.describe('Folders & Channels E2E', () => {
  test('create folder, move chat, collapse/expand', async ({ page }) => {
    const username = `folder_${Math.random().toString(36).slice(2, 8)}`;
    await registerAndLogin(page, username);
    const mobileHome = page.locator('.mobile-only');

    // 4.1 Create folder
    await expect(async () => {
      await mobileHome.getByRole('button', { name: 'New folder' }).click();
      await expect(mobileHome.locator('input[placeholder="Folder name"]')).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 5000 });
    await mobileHome.locator('input[placeholder="Folder name"]').fill('Test Folder');
    await mobileHome.getByRole('button', { name: 'Create folder' }).click();

    // Folder should appear
    const folder = mobileHome.locator('details').filter({ hasText: 'Test Folder' });
    await expect(folder).toBeVisible();

    // 4.2 Move chat to folder (right-click context menu)
    await mobileHome.getByRole('button', { name: 'Open chat General' }).click({ button: 'right' });
    await mobileHome.getByText(/move to folder/i).click();
    await mobileHome.getByRole('button', { name: 'Test Folder' }).click();

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
    const channelName = `random-${Math.random().toString(36).slice(2, 8)}`;
    await registerAndLogin(page, username);

    // Open General chat
    await openGeneralChat(page);

    // 4.4 Create channel
    await page.getByRole('button', { name: /create channel/i }).first().click();
    await page.locator('input[placeholder="Channel name"]:visible').fill(channelName);
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    // Channel should appear in list (button text is "# <name>")
    const channel = page.getByRole('button', { name: `# ${channelName}` });
    await expect(channel).toBeVisible();

    // 4.5 Navigate channel
    await channel.click();
    await expect(page).toHaveURL(/\/chat\/.+/, { timeout: 5000 });

    // Send message in channel
    const input = page.locator('input[type="text"][placeholder^="Message"]:visible').first();
    await input.fill('Channel message!');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Channel message!')).toBeVisible();
  });

  test('channel member inheritance for late joiner', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const userA = `late_a_${Math.random().toString(36).slice(2, 8)}`;
    const userB = `late_b_${Math.random().toString(36).slice(2, 8)}`;
    const channelName = `shared-${Math.random().toString(36).slice(2, 8)}`;

    await registerAndLogin(pageA, userA);
    await registerAndLogin(pageB, userB);

    // User B is already in General, so this proves realtime channel sync without a refresh.
    await openGeneralChat(pageB);

    // User A opens General, creates channel
    await openGeneralChat(pageA);
    await pageA.getByRole('button', { name: /create channel/i }).first().click();
    await pageA.locator('input[placeholder="Channel name"]:visible').fill(channelName);
    await pageA.getByRole('button', { name: 'Create', exact: true }).click();

    // User B should see the channel without refresh
    await expect(pageB.getByRole('button', { name: `# ${channelName}` })).toBeVisible({ timeout: 10000 });

    await ctxA.close();
    await ctxB.close();
  });
});
