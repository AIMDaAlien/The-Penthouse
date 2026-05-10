import { test, expect } from '@playwright/test';

test.describe('Auth Flow E2E', () => {
  test('register, login, logout, session persistence', async ({ page }) => {
    const username = `auth_test_${Math.random().toString(36).slice(2, 8)}`;

    // 2.1 Register
    await page.goto('/auth');
    await page.locator('button.tab').filter({ hasText: 'Create account' }).click();
    await expect(page.locator('#display-name')).toBeVisible();
    await page.locator('#username').fill(username);
    await page.locator('#display-name').fill('Auth Bot');
    await page.locator('#password').fill('TestPassword123!');
    await page.locator('#confirm-password').fill('TestPassword123!');
    await page.getByLabel(/I understand/i).check();
    await page.locator('button[type="submit"]').click();

    // Should redirect to /
    await expect(page).toHaveURL('/', { timeout: 15000 });

    // 2.2 Session persistence
    await page.reload();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: /general/i }).first()).toBeVisible();

    // 2.3 Logout (settings page says "Sign out" and opens a confirmation modal)
    await page.goto('/settings');
    await page.getByRole('button', { name: /sign out/i }).first().click({ force: true });
    // Confirm in modal
    await page.locator('[role="dialog"] button').filter({ hasText: /sign out/i }).click({ force: true });
    await expect(page).toHaveURL(/\/auth/);

    // 2.4 Login with existing user
    await page.locator('#username').fill(username);
    await page.locator('#password').fill('TestPassword123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/', { timeout: 15000 });
  });

  test('duplicate username rejected', async ({ page }) => {
    const username = `dup_test_${Math.random().toString(36).slice(2, 8)}`;

    // Register first user
    await page.goto('/auth');
    await page.locator('button.tab').filter({ hasText: 'Create account' }).click();
    await expect(page.locator('#display-name')).toBeVisible();
    await page.locator('#username').fill(username);
    await page.locator('#display-name').fill('Dup Bot');
    await page.locator('#password').fill('TestPassword123!');
    await page.locator('#confirm-password').fill('TestPassword123!');
    await page.getByLabel(/I understand/i).check();
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/', { timeout: 15000 });

    // Try duplicate
    await page.goto('/auth');
    await page.locator('button.tab').filter({ hasText: 'Create account' }).click();
    await expect(page.locator('#display-name')).toBeVisible();
    await page.locator('#username').fill(username);
    await page.locator('#display-name').fill('Dup Bot 2');
    await page.locator('#password').fill('TestPassword123!');
    await page.locator('#confirm-password').fill('TestPassword123!');
    await page.getByLabel(/I understand/i).check();
    await page.locator('button[type="submit"]').click();

    // Should show error
    await expect(page.getByText(/already taken|username is already/i)).toBeVisible({ timeout: 5000 });
  });

  test('weak password rejected', async ({ page }) => {
    await page.goto('/auth');
    await page.locator('button.tab').filter({ hasText: 'Create account' }).click();
    await expect(page.locator('#display-name')).toBeVisible();
    await page.locator('#username').fill(`weak_${Date.now()}`);
    await page.locator('#display-name').fill('Weak Bot');
    await page.locator('#password').fill('short');
    await page.locator('#confirm-password').fill('short');
    await page.getByLabel(/I understand/i).check();

    const submit = page.locator('button[type="submit"]');
    // Submit should be disabled or show validation error
    const isDisabled = await submit.isDisabled().catch(() => false);
    if (!isDisabled) {
      await submit.click();
      await expect(page.getByText(/password|too short|minimum/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('no CAPTCHA in dev mode', async ({ page }) => {
    await page.goto('/auth');
    await page.locator('button.tab').filter({ hasText: 'Create account' }).click();
    await expect(page.locator('#display-name')).toBeVisible();
    // Should NOT see verify you're human text
    await expect(page.getByText(/verify you.re human/i)).not.toBeVisible();
    await expect(page.getByText(/captcha/i)).not.toBeVisible();
  });
});
