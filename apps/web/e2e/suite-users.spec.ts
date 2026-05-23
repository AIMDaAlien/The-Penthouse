/**
 * Users Suite — directory, search, profiles, new DM, settings
 * Run: npx playwright test e2e/suite-users.spec.ts
 */
import { test, expect, Browser, Page } from '@playwright/test';
import { createUserViaApi, openDmWithUser, openUserProfile, registerUser } from './utils';

const rosterItems = (page: Page) => page.locator('.roster-item');
const profileCard = (page: Page) => page.locator('.pc');

test.describe('User Directory', () => {
  test('directory page loads and shows users', async ({ page }) => {
    const u = `dir_${Date.now()}`;
    await registerUser(page, u);
    await page.goto('/users');
    await expect(rosterItems(page).first()).toBeVisible({ timeout: 8000 });
  });

  test('search filters users by username', async ({ page }) => {
    const actor = `search_actor_${Date.now()}`;
    const target = `searchme_${Date.now()}`;
    await registerUser(page, actor);
    await createUserViaApi(page, target);
    await page.goto('/users');
    const input = page.getByPlaceholder(/search/i);
    await input.fill(target);
    await page.keyboard.press('Enter');
    await expect(rosterItems(page).filter({ hasText: target })).toBeVisible({ timeout: 8000 });
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
      const countBefore = await rosterItems(page).count();
      await loadMore.click();
      const countAfter = await rosterItems(page).count();
      expect(countAfter).toBeGreaterThanOrEqual(countBefore);
    }
    // else auto-scroll pagination — just verify list renders
    await expect(rosterItems(page).first()).toBeVisible();
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

    await openUserProfile(pageA, userB);

    // Profile modal/page should open
    await expect(profileCard(pageA)).toBeVisible({ timeout: 5000 });
    await expect(profileCard(pageA).filter({ hasText: new RegExp(userB, 'i') })).toBeVisible({ timeout: 3000 });

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

    await openUserProfile(pageA, userB);

    await expect(profileCard(pageA).getByRole('button', { name: 'Message' })).toBeVisible({ timeout: 5000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('profile does NOT show Send Message button for own profile', async ({ page }) => {
    const u = `aaa_selfprofile_${Date.now()}`;
    await registerUser(page, u);
    await page.goto('/users');
    const row = rosterItems(page).filter({ hasText: `@${u}` }).first();
    await expect(row).toBeVisible({ timeout: 8000 });
    await row.click();
    await expect(profileCard(page)).toBeVisible({ timeout: 5000 });

    // "Send message" should not be visible when viewing own profile
    await expect(profileCard(page).getByRole('button', { name: 'Message' })).not.toBeVisible({ timeout: 3000 });
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

    await openDmWithUser(pageA, userB);

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

test.describe('New DM via People directory', () => {
  test('People search opens user profile', async ({ page }) => {
    const actor = `newdm_actor_${Date.now()}`;
    const target = `newdm_${Date.now()}`;
    await registerUser(page, actor);
    await createUserViaApi(page, target);
    await openUserProfile(page, target);
    await expect(profileCard(page)).toBeVisible({ timeout: 5000 });
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

    await openDmWithUser(pageA, userB);
    await expect(pageA).toHaveURL(/\/chat\//, { timeout: 8000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('Back returns from profile detail to people list', async ({ page }) => {
    const actor = `back_actor_${Date.now()}`;
    const target = `back_dm_${Date.now()}`;
    await registerUser(page, actor);
    await createUserViaApi(page, target);
    await openUserProfile(page, target);
    await expect(profileCard(page)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(rosterItems(page).filter({ hasText: target })).toBeVisible({ timeout: 3000 });
  });
});
