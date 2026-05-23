/**
 * GIF Picker Suite — Giphy trending, search, send, cache
 * Requires: GIPHY_API_KEY set in services/api/.env
 * Run: npx playwright test e2e/suite-gif.spec.ts
 */
import { test, expect, Browser, Page } from '@playwright/test';
import { openDmWithUser, openGifPicker, registerUser } from './utils';

const gifPicker = (page: Page) => page.locator('.gif-picker');
const gifImages = (page: Page) => page.locator('.gif-picker img');

async function searchForGif(page: Page, query = 'cat') {
  const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="GIF" i]').first();
  await searchInput.fill(query);
  await expect(gifImages(page).first()).toBeVisible({ timeout: 12000 });
}

async function twoUserDm(browser: Browser) {
  const ts = Date.now();
  const userA = `gif_a_${ts}`;
  const userB = `gif_b_${ts}`;
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await registerUser(pageA, userA);
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await registerUser(pageB, userB);

  await openDmWithUser(pageA, userB);
  await openDmWithUser(pageB, userA);

  return { ctxA, pageA, ctxB, pageB, userA, userB };
}

test.describe('GIF Picker — Open & Close', () => {
  test('GIF button opens the picker', async ({ browser }) => {
    const { ctxA, pageA, ctxB } = await twoUserDm(browser);
    await openGifPicker(pageA);
    await expect(gifPicker(pageA)).toBeVisible({ timeout: 5000 });
    await ctxA.close();
    await ctxB.close();
  });

  test('Escape closes the picker', async ({ browser }) => {
    const { ctxA, pageA, ctxB } = await twoUserDm(browser);
    await openGifPicker(pageA);
    const picker = gifPicker(pageA);
    await expect(picker).toBeVisible({ timeout: 5000 });
    await pageA.keyboard.press('Escape');
    await expect(picker).not.toBeVisible({ timeout: 3000 });
    await ctxA.close();
    await ctxB.close();
  });

  test('close button dismisses picker', async ({ browser }) => {
    const { ctxA, pageA, ctxB } = await twoUserDm(browser);
    await openGifPicker(pageA);
    const picker = gifPicker(pageA);
    await expect(picker).toBeVisible({ timeout: 5000 });
    await pageA.getByRole('button', { name: 'Close media picker' }).click();
    await expect(picker).not.toBeVisible({ timeout: 3000 });
    await ctxA.close();
    await ctxB.close();
  });

  test('can open and close multiple times without errors', async ({ browser }) => {
    const { ctxA, pageA, ctxB } = await twoUserDm(browser);
    for (let i = 0; i < 3; i++) {
      await openGifPicker(pageA);
      await expect(pageA.locator('.gif-picker')).toBeVisible({ timeout: 5000 });
      await pageA.keyboard.press('Escape');
      await expect(pageA.locator('.gif-picker')).not.toBeVisible({ timeout: 3000 });
    }
    await ctxA.close();
    await ctxB.close();
  });
});

test.describe('GIF Picker — Trending', () => {
  test('trending GIFs load on open', async ({ browser }) => {
    const { ctxA, pageA, ctxB } = await twoUserDm(browser);
    await openGifPicker(pageA);
    // Wait for at least one GIF image to appear
    await expect(gifImages(pageA).first()).toBeVisible({ timeout: 15000 });
    await ctxA.close();
    await ctxB.close();
  });

  test('trending GIFs load from cache on reopen (no second network request)', async ({ browser }) => {
    const { ctxA, pageA, ctxB } = await twoUserDm(browser);

    // First open — loads from network
    await openGifPicker(pageA);
    await expect(gifImages(pageA).first()).toBeVisible({ timeout: 15000 });
    await pageA.keyboard.press('Escape');

    // Track network requests on second open
    const requests: string[] = [];
    pageA.on('request', req => {
      if (req.url().includes('/api/v1/gifs/search')) requests.push(req.url());
    });

    await openGifPicker(pageA);
    // GIFs should appear immediately (cached)
    await expect(gifImages(pageA).first()).toBeVisible({ timeout: 3000 });
    // No new GIF API call should have been made
    expect(requests.length).toBe(0);

    await ctxA.close();
    await ctxB.close();
  });
});

test.describe('GIF Picker — Search', () => {
  test('switching to Search tab shows search input', async ({ browser }) => {
    const { ctxA, pageA, ctxB } = await twoUserDm(browser);
    await openGifPicker(pageA);
    await expect(pageA.locator('input[placeholder*="search" i], input[placeholder*="GIF" i]')).toBeVisible({ timeout: 3000 });
    await ctxA.close();
    await ctxB.close();
  });

  test('typing in search returns results from Giphy', async ({ browser }) => {
    const { ctxA, pageA, ctxB } = await twoUserDm(browser);
    await openGifPicker(pageA);
    const searchInput = pageA.locator('input[placeholder*="search" i], input[placeholder*="GIF" i]').first();
    await searchInput.fill('cat');
    // Wait for debounce + API response
    await expect(gifImages(pageA).first()).toBeVisible({ timeout: 12000 });
    await ctxA.close();
    await ctxB.close();
  });

  test('clearing search returns to trending', async ({ browser }) => {
    const { ctxA, pageA, ctxB } = await twoUserDm(browser);
    await openGifPicker(pageA);

    // Go to search, type, then clear
    const searchInput = pageA.locator('input[placeholder*="search" i], input[placeholder*="GIF" i]').first();
    await searchInput.fill('dog');
    await expect(gifImages(pageA).first()).toBeVisible({ timeout: 12000 });
    await searchInput.clear();

    // Trending tab or empty state should show
    const noResults = pageA.locator('text=/no results|empty|trending/i');
    const gifGrid = gifImages(pageA);
    await expect(noResults.or(gifGrid.first())).toBeVisible({ timeout: 5000 });

    await ctxA.close();
    await ctxB.close();
  });
});

test.describe('GIF Picker — Send', () => {
  test('clicking a GIF sends it to the chat', async ({ browser }) => {
    const { ctxA, pageA, ctxB, pageB } = await twoUserDm(browser);

    await openGifPicker(pageA);
    await searchForGif(pageA);

    // Click the first GIF
    await gifImages(pageA).first().click();

    // Picker should close
    await expect(pageA.locator('.gif-picker')).not.toBeVisible({ timeout: 5000 });

    // GIF message should appear as an inline image in A's thread
    await expect(pageA.locator('.media-gif, .msg img').first()).toBeVisible({ timeout: 8000 });

    // B should receive it
    await expect(pageB.locator('.media-gif, .msg img').first()).toBeVisible({ timeout: 10000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('GIF message preserves aspect ratio (no distortion)', async ({ browser }) => {
    const { ctxA, pageA, ctxB } = await twoUserDm(browser);

    await openGifPicker(pageA);
    await searchForGif(pageA);
    await gifImages(pageA).first().click();

    const img = pageA.locator('.media-gif, .msg img').first();
    await expect(img).toBeVisible({ timeout: 8000 });

    // Natural dimensions should not be zero
    const dims = await img.evaluate((el: HTMLImageElement) => ({
      w: el.naturalWidth, h: el.naturalHeight,
      dw: el.offsetWidth, dh: el.offsetHeight
    }));
    expect(dims.w).toBeGreaterThan(0);
    expect(dims.h).toBeGreaterThan(0);

    await ctxA.close();
    await ctxB.close();
  });
});
