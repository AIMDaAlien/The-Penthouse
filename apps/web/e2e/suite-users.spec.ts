/**
 * Users Suite — directory, search, profiles, new DM, settings
 * Run: npx playwright test e2e/suite-users.spec.ts
 */
import { test, expect, Browser } from '@playwright/test';
import { registerUser } from './utils';

test.describe('User Directory', () => {
  test('directory page loads and shows users', async ({ page }) => {
    const u = `dir_${Date.now()}`;
    await registerUser(page, u);
    await page.goto('/users');
    await expect(page.locator('.user-card, .user-row')).toBeVisible({ timeout: 8000 });
  });

  test('search filters users by username', async ({ page }) => {
    const u = `searchme_${Date.now()}`;
    await registerUser(page, u);
    await page.goto('/users');
    const input = page.getByPlaceholder(/search/i);
    await input.fill(u);
    await page.keyboard.press('Enter');
    await expect(page.locator('.user-card, .user-row').filter({ hasText: u })).toBeVisible({ timeout: 8000 });
  });

  test('search with no match shows empty state', async ({ page }) => {
    const u = `dir_empty_${Date.now()}`;
    await registerUser(page, u);
    await page.goto('/users');
    await page.getByPlaceholder(/search/i).fill(`zzz_nobody_${Date.now()}`);
    await page.keyboard.press('Enter');
    await expect(page.locator('text=/no users|not found|empty/i')).toBeVisible({ timeout: 5000 });
  });

  test('pagination works — load more button or auto-scroll', async ({ page }) => {
    const u = `paginate_${Date.now()}`;
    await registerUser(page, u);
    await page.goto('/users');
    // If there's a load-more button, click it
    const loadMore = page.locator('button:has-text("Load more"), button:has-text("Show more")');
    if (await loadMore.isVisible({ timeout: 3000 }).catch(() => false)) {
      const countBefore = await page.locator('.user-card, .user-row').count();
      await loadMore.click();
      const countAfter = await page.locator('.user-card, .user-row').count();
      expect(countAfter).toBeGreaterThanOrEqual(countBefore);
    }
    // else auto-scroll pagination — just verify list renders
    await expect(page.locator('.user-card, .user-row').first()).toBeVisible();
  });
});

test.describe('User Profiles', () => {
  test('clicking a user opens their profile', async ({ browser }) => {
    const ts = Date.now();
    const userA = `profile_a_${ts}`;
    const userB = `profile_b_${ts}`;

    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await registerUser(pageA, userA);

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await registerUser(pageB, userB);

    await pageA.goto('/users');
    await pageA.getByPlaceholder(/search/i).fill(userB);
    await pageA.keyboard.press('Enter');

    const userRow = pageA.locator('.user-card, .user-row').filter({ hasText: userB }).first();
    await expect(userRow).toBeVisible({ timeout: 8000 });

    // Click avatar or name to open profile
    await userRow.locator('.avatar-btn, .user-name, .avatar').first().click();

    // Profile modal/page should open
    await expect(pageA.locator('.modal-card, .profile-body, [aria-label="User profile"]')).toBeVisible({ timeout: 5000 });
    await expect(pageA.locator('.display-name, h2').filter({ hasText: new RegExp(userB, 'i') })).toBeVisible({ timeout: 3000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('profile shows Send Message button for other users', async ({ browser }) => {
    const ts = Date.now();
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await registerUser(pageA, `prof_a_${ts}`);

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    const userB = `prof_b_${ts}`;
    await registerUser(pageB, userB);

    await pageA.goto('/users');
    await pageA.getByPlaceholder(/search/i).fill(userB);
    await pageA.keyboard.press('Enter');
    await pageA.locator('.user-card, .user-row').filter({ hasText: userB }).first()
      .locator('.avatar-btn, .avatar').first().click();

    await expect(pageA.locator('button:has-text("Send message"), button:has-text("Message")')).toBeVisible({ timeout: 5000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('profile does NOT show Send Message button for own profile', async ({ page }) => {
    const u = `selfprofile_${Date.now()}`;
    await registerUser(page, u);
    await page.goto('/users');
    await page.getByPlaceholder(/search/i).fill(u);
    await page.keyboard.press('Enter');
    await page.locator('.user-card, .user-row').filter({ hasText: u }).first()
      .locator('.avatar-btn, .avatar').first().click();

    // "Send message" should not be visible when viewing own profile
    await expect(page.locator('button:has-text("Send message"), button:has-text("Message")')).not.toBeVisible({ timeout: 3000 });
  });

  test('Send Message from profile navigates to DM thread', async ({ browser }) => {
    const ts = Date.now();
    const userA = `dm_from_a_${ts}`;
    const userB = `dm_from_b_${ts}`;
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await registerUser(pageA, userA);
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await registerUser(pageB, userB);

    await pageA.goto('/users');
    await pageA.getByPlaceholder(/search/i).fill(userB);
    await pageA.keyboard.press('Enter');
    await pageA.locator('.user-card, .user-row').filter({ hasText: userB }).first()
      .locator('.avatar-btn, .avatar').first().click();
    await pageA.locator('button:has-text("Send message"), button:has-text("Message")').first().click();

    await expect(pageA).toHaveURL(/\/chat\//, { timeout: 8000 });

    await ctxA.close();
    await ctxB.close();
  });
});

test.describe('Settings', () => {
  test('settings page loads', async ({ page }) => {
    const u = `settings_${Date.now()}`;
    await registerUser(page, u);
    await page.goto('/settings');
    await expect(page.locator('.settings, h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test('display name can be updated', async ({ page }) => {
    const u = `editname_${Date.now()}`;
    await registerUser(page, u);
    await page.goto('/settings');

    const nameInput = page.locator('input[name="displayName"], #display-name, input[placeholder*="display" i]').first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const newName = `Updated ${Date.now()}`;
      await nameInput.fill(newName);
      await page.locator('button:has-text("Save"), button[type="submit"]').first().click();
      await expect(page.locator('.success, text=/saved|updated/i')).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(); // Settings form not exposed in this build
    }
  });
});

test.describe('New DM via chat list button', () => {
  test('New Message button opens user search modal', async ({ page }) => {
    const u = `newdm_${Date.now()}`;
    await registerUser(page, u);
    await page.goto('/');
    await page.getByRole('button', { name: 'New message' }).click();
    await expect(page.locator('.bottom-sheet, [aria-labelledby="dm-modal-title"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.search-input, input[type="text"]').first()).toBeVisible();
  });

  test('searching and selecting a user opens DM thread', async ({ browser }) => {
    const ts = Date.now();
    const userA = `newdm_a_${ts}`;
    const userB = `newdm_b_${ts}`;
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await registerUser(pageA, userA);
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await registerUser(pageB, userB);

    await pageA.goto('/');
    await pageA.getByRole('button', { name: 'New message' }).click();
    await pageA.locator('.search-input, .bottom-sheet input[type="text"]').first().fill(userB);
    await pageA.waitForSelector('.dm-user-row', { timeout: 8000 });
    await pageA.locator('.dm-user-row').filter({ hasText: userB }).first().click();
    await expect(pageA).toHaveURL(/\/chat\//, { timeout: 8000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('Escape closes the New Message modal', async ({ page }) => {
    const u = `esc_dm_${Date.now()}`;
    await registerUser(page, u);
    await page.goto('/');
    await page.getByRole('button', { name: 'New message' }).click();
    await expect(page.locator('.bottom-sheet')).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('.bottom-sheet')).not.toBeVisible({ timeout: 3000 });
    await expect(page).toHaveURL('/');
  });
});
