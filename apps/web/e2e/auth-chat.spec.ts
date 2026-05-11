import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('auth and routing', () => {
  test('unauthenticated user is redirected to auth page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByText('The', { exact: true })).toBeVisible();
    await expect(page.getByText('PENT', { exact: true })).toBeVisible();
    await expect(page.getByText('HOUSE', { exact: true })).toBeVisible();
  });

  test('auth page has login and register tabs', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' }).first()).toBeVisible();

    // Default to login mode
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    // Switch to register
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByLabel('Display name')).toBeVisible();
    await expect(page.getByLabel('Confirm password')).toBeVisible();
  });

  test('register mode has alpha notice checkbox', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: 'Create account' }).first().click();
    await expect(page.getByText(/alpha/i)).toBeVisible();
  });

  test('auth page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/auth');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
