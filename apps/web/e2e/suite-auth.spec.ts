/**
 * Auth Suite — login, register, logout, session persistence
 * Run: npx playwright test e2e/suite-auth.spec.ts
 */
import { test, expect } from '@playwright/test';
import { TEST_INVITE_CODE, TEST_PASSWORD, loginUser, registerUser, switchToRegister } from './utils';

const API_BASE = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000';
const pw = TEST_PASSWORD;

async function seedUser(page: import('@playwright/test').Page, username: string) {
  const response = await page.request.post(`${API_BASE}/api/v1/auth/register`, {
    data: {
      username,
      displayName: `${username} Display`,
      password: pw,
      inviteCode: TEST_INVITE_CODE,
      captchaToken: 'dev',
      acceptTestNotice: true,
      testNoticeVersion: 'alpha-v1'
    }
  });
  expect(response.ok()).toBe(true);
}

test.describe('Auth — Register', () => {
  test('register with valid credentials navigates to chat list', async ({ page }) => {
    const u = `reg_${Date.now()}`;
    await registerUser(page, u);
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'Open chat General' })).toBeVisible();
  });

  test('register with duplicate username shows error', async ({ page }) => {
    const u = `dup_${Date.now()}`;
    await seedUser(page, u);

    // Re-attempt registration with same username
    await page.goto('/auth');
    await switchToRegister(page);
    await page.locator('#username').fill(u);
    await page.locator('#display-name').fill('Dup Test');
    await page.locator('#invite-code').fill(TEST_INVITE_CODE);
    await page.locator('#password').fill(pw);
    await page.locator('#confirm-password').fill(pw);
    await page.getByLabel(/I understand this is an alpha/).check();
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8000 });
    await expect(page).not.toHaveURL('/');
  });

  test('register with password under 10 chars keeps submit disabled', async ({ page }) => {
    await page.goto('/auth');
    await switchToRegister(page);
    await page.locator('#username').fill(`short_${Date.now()}`);
    await page.locator('#invite-code').fill(TEST_INVITE_CODE);
    await page.locator('#password').fill('short');
    await page.locator('#confirm-password').fill('short');
    await page.getByLabel(/I understand this is an alpha/).check();
    const submit = page.locator('button[type="submit"]');
    await expect(submit).toBeDisabled();
  });

  test('register with mismatched passwords keeps submit disabled', async ({ page }) => {
    await page.goto('/auth');
    await switchToRegister(page);
    await page.locator('#username').fill(`mismatch_${Date.now()}`);
    await page.locator('#invite-code').fill(TEST_INVITE_CODE);
    await page.locator('#password').fill(pw);
    await page.locator('#confirm-password').fill('Different@12345');
    await page.getByLabel(/I understand this is an alpha/).check();
    const submit = page.locator('button[type="submit"]');
    await expect(submit).toBeDisabled();
  });
});

test.describe('Auth — Login', () => {
  test('login with valid credentials navigates to chat list', async ({ page }) => {
    const u = `login_${Date.now()}`;
    await seedUser(page, u);
    await loginUser(page, u);
    await expect(page).toHaveURL('/');
  });

  test('login with wrong password shows error', async ({ page }) => {
    const u = `badpw_${Date.now()}`;
    await seedUser(page, u);
    await page.goto('/auth');
    await page.locator('#username').fill(u);
    await page.locator('#password').fill('WrongPassword@99');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8000 });
    await expect(page).not.toHaveURL('/');
  });

  test('login with unknown username shows error', async ({ page }) => {
    await page.goto('/auth');
    await page.locator('#username').fill(`nobody_${Date.now()}`);
    await page.locator('#password').fill(pw);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8000 });
  });

  test('unauthenticated access to / redirects to welcome', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/welcome/);
  });
});

test.describe('Auth — Session', () => {
  test('page refresh keeps session alive', async ({ page }) => {
    const u = `sess_${Date.now()}`;
    await registerUser(page, u);
    await page.reload();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'Open chat General' })).toBeVisible();
  });

  test('logout redirects to welcome and clears session', async ({ page }) => {
    const u = `logout_${Date.now()}`;
    await registerUser(page, u);
    // Find and click logout (settings page or header)
    await page.goto('/settings');
    await page.getByRole('button', { name: /sign out|log out/i }).click();
    await page.locator('[role="dialog"] button').filter({ hasText: /sign out|log out/i }).click();
    await expect(page).toHaveURL(/\/welcome/);
    // Going to / redirects back to welcome
    await page.goto('/');
    await expect(page).toHaveURL(/\/welcome/);
  });
});
