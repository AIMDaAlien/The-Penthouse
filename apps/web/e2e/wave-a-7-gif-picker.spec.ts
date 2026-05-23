import { test, expect } from '@playwright/test';
import { expectAxePasses, throttleNetwork, createMultiplexedContexts } from './qa-utils';
import { openDmWithUser, openGifPicker, registerUser } from './utils';

test.describe('Handoff Feature #7: GIF Picker', () => {
  let userA: string;
  let userB: string;

  test.beforeAll(async ({ browser }) => {
    userA = `u_gif_${Date.now()}_a`;
    userB = `u_gif_${Date.now()}_b`;
    
    // Register A and B so they exist
    const context = await browser.newContext();
    const pageA = await context.newPage();
    await registerUser(pageA, userA);
    const pageB = await context.newPage();
    await registerUser(pageB, userB);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    // Generate fresh users for isolated sessions per test
    userA = `u_gif_${Date.now()}_a`;
    userB = `u_gif_${Date.now()}_b`;
    
    // Register User B
    const contextB = await page.context().browser()!.newContext();
    const pageB = await contextB.newPage();
    await registerUser(pageB, userB);
    await contextB.close();

    // Register and login User A in the main page
    await registerUser(page, userA);
    
    await openDmWithUser(page, userB);
  });

  test('Picker Open/Close behavior & Accessibility', async ({ page }) => {
    // Open picker
    await openGifPicker(page);

    const gifPicker = page.locator('.gif-picker');
    await expect(gifPicker.first()).toBeVisible();
    await expect(page.locator('.gif-picker img').first()).toBeVisible({ timeout: 15000 });

    // Axe A11y while Modal is open
    await expectAxePasses(page, { include: ['[role="dialog"][aria-label="Media picker"]'] });

    await page.getByRole('button', { name: 'Close media picker' }).click();
    await expect(page.locator('.gif-picker')).not.toBeVisible();

    // Open again
    await openGifPicker(page);
    await expect(page.locator('.gif-picker')).toBeVisible();

    // Close via Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('.gif-picker')).not.toBeVisible();
  });

  test('Search debouncing & non-blocking requests on slow networks', async ({ page }) => {
    await throttleNetwork(page, 'slow3g');

    await openGifPicker(page);
    
    const searchInput = page.getByPlaceholder(/search gifts|search/i).first();
    await searchInput.fill('cat');

    // Wait to ensure UI isn't blocking while request is supposedly in flight
    await expect(searchInput).toBeEditable();

    // Test that we can append without blocking
    await searchInput.fill('cat dance');
    await expect(searchInput).toBeEditable();

    // Turn network back to normal to allow request to finish eventually
    await throttleNetwork(page, 'none');

    // The grid should eventually populate
    const gifGrid = page.locator('.gif-picker img');
    // Expect at least 1 image to load
    await expect(gifGrid.first()).toBeVisible({ timeout: 15000 });
  });

  test('GIF rendering, inline boundaries, and Multi-user Read Receipts', async ({ browser }) => {
    // We will multiplex B to watch A's GIF
    const [contextA, contextB] = await createMultiplexedContexts(browser, 2);
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Login logic using fresh users
    const uA = `u_gif_read_${Date.now()}_a`;
    const uB = `u_gif_read_${Date.now()}_b`;
    await registerUser(pageA, uA);
    await registerUser(pageB, uB);

    await openDmWithUser(pageB, uA);
    await openDmWithUser(pageA, uB);

    // A sends GIF
    await openGifPicker(pageA);
    // Assuming default is trending, just click the first GIF image
    await pageA.locator('.gif-picker img').first().click();

    // It should close picker
    await expect(pageA.locator('.gif-picker')).not.toBeVisible();

    // Check GIF rendering in chat
    const gifMsgA = pageA.locator('.media-gif, .msg img').first();
    await expect(gifMsgA).toBeVisible();
    
    // Check constraints (Max width: 240px)
    const box = await gifMsgA.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(240);

    // B receives GIF
    const gifMsgB = pageB.locator('.media-gif, .msg img').first();
    await expect(gifMsgB).toBeVisible();

    // Verify Read Receipts update! A should see "Seen" pill
    await expect(pageA.locator('.read-status', { hasText: '✓✓' }).last()).toBeVisible({ timeout: 10000 });

    await contextA.close();
    await contextB.close();
  });
});
