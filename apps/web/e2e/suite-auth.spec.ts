/**
 * Auth Suite — login, register, logout, session persistence
 * Run: npx playwright test e2e/suite-auth.spec.ts
 */
import { test, expect } from '@playwright/test';
import { registerUser, loginUser } from './utils';

const pw = 'Test@12345';

test.describe('Auth — Register', () => {
  test('register with valid credentials navigates to chat list', async ({ page }) => {
    const u = `reg_${Date.now()}`;
    await registerUser(page, u);
    await expect(page).toHaveURL('/');
    await expect(page.locator('.app-header')).toBeVisible();
  });

  test('register with duplicate username shows error', async ({ page }) => {
    const u = `dup_${Date.now()}`;
    await registerUser(page, u);
    await page.locator('button', { hasText: /sign out|logout/i }).click().catch(() => {});
    // Re-attempt registration with same username
    await page.goto('/auth');
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.getByLabel('Username').fill(u);
    await page.getByLabel('Display name', { exact: false }).fill('Dup Test');
    await page.getByLabel('Password', { exact: true }).fill(pw);
    await page.getByLabel('Confirm password').fill(pw);
    await page.getByLabel(/I understand this is an alpha/).check();
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.error, [role="alert"]')).toBeVisible({ timeout: 8000 });
    await expect(page).not.toHaveURL('/');
  });

  test('register with password under 10 chars keeps submit disabled', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.getByLabel('Username').fill(`short_${Date.now()}`);
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByLabel('Confirm password').fill('short');
    const submit = page.locator('button[type="submit"]');
    await expect(submit).toBeDisabled();
  });

  test('register with mismatched passwords keeps submit disabled', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.getByLabel('Username').fill(`mismatch_${Date.now()}`);
    await page.getByLabel('Password', { exact: true }).fill(pw);
    await page.getByLabel('Confirm password').fill('Different@12345');
    const submit = page.locator('button[type="submit"]');
    await expect(submit).toBeDisabled();
  });
});

test.describe('Auth — Login', () => {
  test('login with valid credentials navigates to chat list', async ({ page }) => {
    const u = `login_${Date.now()}`;
    await registerUser(page, u);
    await page.goto('/auth'); // goes back to auth (session cleared by navigating)
    await loginUser(page, u);
    await expect(page).toHaveURL('/');
  });

  test('login with wrong password shows error', async ({ page }) => {
    const u = `badpw_${Date.now()}`;
    await registerUser(page, u);
    await page.goto('/auth');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByLabel('Username').fill(u);
    await page.getByLabel('Password', { exact: true }).fill('WrongPassword@99');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('.error, [role="alert"]')).toBeVisible({ timeout: 8000 });
    await expect(page).not.toHaveURL('/');
  });

  test('login with unknown username shows error', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByLabel('Username').fill(`nobody_${Date.now()}`);
    await page.getByLabel('Password', { exact: true }).fill(pw);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('.error, [role="alert"]')).toBeVisible({ timeout: 8000 });
  });

  test('unauthenticated access to / redirects to /auth', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Auth — Session', () => {
  test('page refresh keeps session alive', async ({ page }) => {
    const u = `sess_${Date.now()}`;
    await registerUser(page, u);
    await page.reload();
    await expect(page).toHaveURL('/');
    await expect(page.locator('.app-header')).toBeVisible();
  });

  test('logout redirects to /auth and clears session', async ({ page }) => {
    const u = `logout_${Date.now()}`;
    await registerUser(page, u);
    // Find and click logout (settings page or header)
    await page.goto('/settings');
    await page.getByRole('button', { name: /sign out|log out/i }).click();
    await expect(page).toHaveURL(/\/auth/);
    // Going to / redirects back to auth
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth/);
  });
});
