import { test, expect, type Page } from '@playwright/test';
import { createUserViaApi, installSession } from './utils';

const E2E_DATABASE_URL = process.env.PLAYWRIGHT_DATABASE_URL
  ?? process.env.DATABASE_URL
  ?? 'postgresql://penthouse:penthouse@localhost:5434/penthouse';

async function promoteGeneralOwner(username: string) {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `
        update chat_members
        set role = 'owner'
        from users, chats
        where chat_members.user_id = users.id
          and chat_members.chat_id = chats.id
          and users.username = $1
          and chats.system_key = 'general'
      `,
      [username]
    );
  } finally {
    await client.end();
  }
}

async function switchToRegister(page: Page) {
  await expect(async () => {
    await page.getByRole('button', { name: 'Create account' }).first().click();
    await expect(page.locator('#display-name')).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 5000 });
}

async function registerAndLogin(page: Page, username: string) {
  await page.goto('/auth');
  await switchToRegister(page);
  await page.locator('#username').fill(username);
  await page.locator('#display-name').fill(username);
  await page.locator('#invite-code').fill('PENTHOUSE-ALPHA');
  await page.locator('#password').fill('TestPassword123!');
  await page.locator('#confirm-password').fill('TestPassword123!');
  await page.getByLabel(/I understand/i).check();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL('/', { timeout: 15000 });
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

    // 4.1 Create folder
    await expect(async () => {
      await page.getByRole('button', { name: 'New folder' }).click();
      await expect(page.locator('input[placeholder="Folder name"]')).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 5000 });
    await page.locator('input[placeholder="Folder name"]').fill('Test Folder');
    await page.getByRole('button', { name: 'Create folder' }).click();

    // Folder should appear
    const folder = page.locator('.folder').filter({ hasText: 'Test Folder' }).first();
    await expect(folder).toBeVisible();

    // 4.2 Move chat to folder via actions button
    await page.getByRole('button', { name: 'Chat actions for General' }).click();
    await page.getByRole('menuitem', { name: 'Test Folder' }).click();

    // Chat should be inside folder
    await expect(folder.locator('.fbody').locator('text=General')).toBeVisible();

    // 4.3 Collapse/expand
    await folder.locator('[data-folder-header]').click();
    await expect(folder.locator('.fbody').locator('text=General')).not.toBeVisible();
    await folder.locator('[data-folder-header]').click();
    await expect(folder.locator('.fbody').locator('text=General')).toBeVisible();
  });

  test('create and navigate channel', async ({ page }) => {
    const username = `channel_${Math.random().toString(36).slice(2, 8)}`;
    const channelName = `random-${Math.random().toString(36).slice(2, 8)}`;
    const session = await createUserViaApi(page, username);
    await promoteGeneralOwner(username);
    await installSession(page, session);

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

    const sessionA = await createUserViaApi(pageA, userA);
    await promoteGeneralOwner(userA);
    await installSession(pageA, sessionA);
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
