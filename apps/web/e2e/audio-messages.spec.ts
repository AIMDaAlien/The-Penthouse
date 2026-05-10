import { test, expect } from '@playwright/test';

test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  }
});

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
  await page.getByRole('button', { name: /general/i }).first().click();
  await expect(page).toHaveURL(/\/chat\/.+/, { timeout: 5000 });
}

test.describe('Audio Messages E2E', () => {
  test('record and send audio message', async ({ page }) => {
    const username = `audio_${Date.now()}`;
    await registerAndLogin(page, username);

    // Mic button should be visible
    const micBtn = page.getByRole('button', { name: /record audio|microphone/i });
    await expect(micBtn).toBeVisible();

    // Click mic to start recording
    await micBtn.click();

    // Should show recording state (stop button or recording indicator)
    const stopBtn = page.getByRole('button', { name: /stop/i });
    await expect(stopBtn).toBeVisible({ timeout: 5000 });

    // Click stop
    await stopBtn.click();

    // Audio player should appear in thread
    await expect(page.locator('audio')).toBeVisible({ timeout: 10000 });
  });
});
