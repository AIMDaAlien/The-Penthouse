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
  await page.locator('button.tab').filter({ hasText: 'Create account' }).click();
  await expect(page.locator('#display-name')).toBeVisible();
  await page.locator('#username').fill(username);
  await page.locator('#display-name').fill(username);
  await page.locator('#password').fill('TestPassword123!');
  await page.locator('#confirm-password').fill('TestPassword123!');
  await page.getByLabel(/I understand/i).check();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL('/', { timeout: 15000 });
  await page.locator('button[aria-label="Open chat General"]:visible').first().click({ force: true });
  await expect(page).toHaveURL(/\/chat\/.+/, { timeout: 5000 });
}

test.describe('Audio Messages E2E', () => {
  test('record and send audio message', async ({ page }) => {
    const username = `audio_${Math.random().toString(36).slice(2, 8)}`;
    await registerAndLogin(page, username);

    // Mic button should be visible
    const micBtn = page.getByRole('button', { name: /record audio/i }).first();
    await expect(micBtn).toBeVisible();

    // Click mic to start recording
    await micBtn.click({ force: true });

    // Should show recording state (stop button)
    const stopBtn = page.getByRole('button', { name: /stop recording/i }).first();
    await expect(stopBtn).toBeVisible({ timeout: 5000 });

    // Click stop
    await stopBtn.click({ force: true });

    // Custom audio player should appear in thread
    await expect(page.locator('.audio-player')).toBeVisible({ timeout: 10000 });
  });
});
