import { test, expect, type Page } from '@playwright/test';

test.use({
 launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  }
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class MockMediaRecorder {
      static isTypeSupported() {
        return true;
      }

      state = 'inactive';
      mimeType: string;
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private interval: ReturnType<typeof setInterval> | null = null;

      constructor(_stream: unknown, options?: { mimeType?: string }) {
        this.mimeType = options?.mimeType ?? 'audio/webm';
      }

      start() {
        this.state = 'recording';
        this.interval = setInterval(() => {
          this.ondataavailable?.({
            data: new Blob(['mock-audio'], { type: this.mimeType })
          });
        }, 50);
      }

      stop() {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
        this.state = 'inactive';
        this.ondataavailable?.({
          data: new Blob(['mock-audio-final'], { type: this.mimeType })
        });
        this.onstop?.();
      }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      writable: true,
      value: MockMediaRecorder
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop: () => undefined }]
        })
      }
    });
  });
});

async function registerAndLogin(page: Page, username: string) {
  await page.goto('/auth');
  await expect(async () => {
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('#display-name')).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 5000 });
  await page.locator('#username').fill(username);
  await page.locator('#display-name').fill(username);
  await page.locator('#password').fill('TestPassword123!');
  await page.locator('#confirm-password').fill('TestPassword123!');
  await page.getByLabel(/I understand/i).check();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL('/', { timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Open chat General' })).toBeVisible({ timeout: 15000 });
  await expect(async () => {
    await page.getByRole('button', { name: 'Open chat General' }).click();
    await expect(page).toHaveURL(/\/chat\/.+/, { timeout: 1000 });
  }).toPass({ timeout: 5000 });
}

test.describe('Audio Messages E2E', () => {
  test('record and send audio message', async ({ page }) => {
    const username = `audio_${Math.random().toString(36).slice(2, 8)}`;
    await registerAndLogin(page, username);

    // Mic button should be visible
    const micBtn = page.getByRole('button', { name: /record audio/i }).first();
    await expect(micBtn).toBeVisible();

    // Click mic to start recording
    await micBtn.click();

    // Should show recording state (stop button)
    const stopBtn = page.getByRole('button', { name: /stop recording/i }).first();
    await expect(stopBtn).toBeVisible({ timeout: 5000 });

    // Click stop
    await stopBtn.click();

    // Custom audio player should appear in thread
    await expect(page.locator('.audio-player').first()).toBeVisible({ timeout: 10000 });
  });
});
