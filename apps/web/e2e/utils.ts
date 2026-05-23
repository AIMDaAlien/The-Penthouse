import { expect, type Page } from '@playwright/test';
import type { AuthResponse } from '@penthouse/contracts';

const TEST_PASSWORD = 'Test@12345';
const TEST_INVITE_CODE = 'PENTHOUSE-ALPHA';
const API_BASE = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000';

export { TEST_PASSWORD, TEST_INVITE_CODE };

export async function switchToRegister(page: Page) {
  await expect(async () => {
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('#display-name')).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 5000 });
}

/**
 * Registers a user via the UI form with CAPTCHA bypass.
 *
 * This goes through the real auth form so that handleSubmit() fires naturally,
 * which calls socketStore.connect() and establishes the WebSocket session.
 */
export async function registerUser(page: Page, username: string) {
  await page.goto('/auth', { waitUntil: 'networkidle' });

  // Ensure the page is fully loaded and hydrated before interacting
  await page.waitForLoadState('domcontentloaded');

  // Switch to register mode
  await switchToRegister(page);

  // Fill out the form
  await page.locator('#username').fill(username);
  await page.locator('#display-name').fill(`${username} Display`);
  await page.locator('#invite-code').fill(TEST_INVITE_CODE);
  await page.locator('#password').fill(TEST_PASSWORD);
  await page.locator('#confirm-password').fill(TEST_PASSWORD);
  await page.getByLabel(/I understand this is an alpha/).check();

  if (await page.locator('altcha-widget').count()) {
    // Bypass the CAPTCHA in non-dev runs by dispatching the same event ALTCHA emits.
    await page.evaluate(() => {
      const widget = document.querySelector('altcha-widget');
      if (!widget) return;

      widget.dispatchEvent(new Event('load'));
      widget.dispatchEvent(
        new CustomEvent('statechange', {
          detail: { state: 'verified', payload: 'e2e-bypass' },
        })
      );

      const shadowRoot = widget.shadowRoot;
      const internalCheckbox = shadowRoot?.querySelector('input[type="checkbox"]') ?? widget.querySelector('input[type="checkbox"]');
      if (internalCheckbox) {
        (internalCheckbox as HTMLInputElement).checked = true;
        internalCheckbox.removeAttribute('required');
      }
    });
  }

  // Submit — handleSubmit fires, calls auth.register(), socketStore.connect(), then goto('/')
  await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 5000 });
  await page.locator('button[type="submit"]').click();

  // Wait for navigation to chat list
  await page.waitForURL('/', { timeout: 20000 });
  await expect(page.getByRole('button', { name: 'Open chat General' })).toBeVisible({ timeout: 15000 });
}

/**
 * Logs in an existing user via the auth form.
 */
export async function loginUser(page: Page, username: string) {
  await expect(async () => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    // Default mode is 'login' — just fill username/password
    await page.locator('#username').fill(username);
    await page.locator('#password').fill(TEST_PASSWORD);

    // Use button[type="submit"] to avoid strict-mode violation with the "Sign in" tab
    await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 1000 });
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/', { timeout: 5000 });
  }).toPass({ timeout: 20000 });

  await expect(page.getByRole('button', { name: 'Open chat General' })).toBeVisible({ timeout: 15000 });
}

export async function createUserViaApi(page: Page, username: string): Promise<AuthResponse> {
  const response = await page.request.post(`${API_BASE}/api/v1/auth/register`, {
    data: {
      username,
      displayName: `${username} Display`,
      password: TEST_PASSWORD,
      inviteCode: TEST_INVITE_CODE,
      captchaToken: 'dev',
      acceptTestNotice: true,
      testNoticeVersion: 'alpha-v1'
    }
  });
  expect(response.ok()).toBe(true);
  return response.json() as Promise<AuthResponse>;
}

export async function installSession(page: Page, session: AuthResponse) {
  await page.addInitScript((value) => {
    window.sessionStorage.setItem('penthouse_session', JSON.stringify(value));
  }, session);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open chat General' })).toBeVisible({ timeout: 15000 });
}

export async function openUserProfile(page: Page, username: string) {
  await page.goto('/users');
  const search = page.getByPlaceholder('Search...');
  const row = page.getByRole('button').filter({ hasText: `@${username}` }).first();

  await expect(async () => {
    await expect(search).toBeEnabled({ timeout: 1000 });
    await search.fill(username);
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(row).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10000 });

  await row.click();
}

export async function openDmWithUser(page: Page, username: string): Promise<string> {
  await openUserProfile(page, username);
  await expect(page.getByRole('button', { name: 'Message' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Message' }).click();
  await page.waitForURL(/\/chat\//, { timeout: 10000 });
  return page.url().split('/chat/')[1].split('?')[0];
}

export async function openGifPicker(page: Page) {
  await page.getByRole('button', { name: 'Open media picker' }).click();
  await page.getByRole('tab', { name: 'GIF' }).click();
  await expect(page.locator('.gif-picker')).toBeVisible({ timeout: 5000 });
}
