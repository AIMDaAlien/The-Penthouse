import { test, expect } from '@playwright/test';
import { expectAxePasses, takeVisualSnapshot, throttleNetwork, createMultiplexedContexts } from './qa-utils';
import { registerUser } from './utils';

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
    
    // Navigate A to a DM with B
    await page.goto('/users');
    await page.getByPlaceholder(/search/i).fill(userB);
    await page.getByRole('button', { name: new RegExp(userB, 'i') }).click();
  });

  test('Picker Open/Close behavior & Accessibility', async ({ page }) => {
    // Open picker
    await page.getByRole('button', { name: /Send a GIF|GIF/i }).click();

    const gifPicker = page.locator('.gif-picker-modal').or(page.locator('.picker-content')).or(page.getByText('Trending'));
    await expect(gifPicker.first()).toBeVisible();

    // Axe A11y while Modal is open
    await expectAxePasses(page);

    // Close via backdrop click (we assume clicking outside modal content closes it)
    await page.mouse.click(10, 10);
    // Assert it hides
    await expect(page.getByText('Trending')).toBeHidden();

    // Open again
    await page.getByRole('button', { name: /Send a GIF|GIF/i }).click();
    await expect(page.getByText('Trending')).toBeVisible();

    // Close via Escape
    await page.keyboard.press('Escape');
    await expect(page.getByText('Trending')).toBeHidden();
  });

  test('Search debouncing & non-blocking requests on slow networks', async ({ page }) => {
    await throttleNetwork(page, 'slow3g');

    await page.getByRole('button', { name: /Send a GIF/i }).click();
    
    // Click 'Search' tab
    await page.getByRole('button', { name: /Search/i }).click();

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
    const gifGrid = page.locator('.gif-grid img');
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

    // B opens DM with A
    await pageB.goto('/users');
    await pageB.getByPlaceholder(/search/i).fill(uA);
    await pageB.getByRole('button', { name: new RegExp(uA, 'i') }).click();

    // A opens DM with B
    await pageA.goto('/users');
    await pageA.getByPlaceholder(/search/i).fill(uB);
    await pageA.getByRole('button', { name: new RegExp(uB, 'i') }).click();

    // A sends GIF
    await pageA.getByRole('button', { name: /Send a GIF/i }).click();
    // Assuming default is trending, just click the first GIF image
    await pageA.locator('.gif-picker-modal img, .picker-content img').first().click();

    // It should close picker
    await expect(pageA.getByText('Trending')).toBeHidden();

    // Check GIF rendering in chat
    const gifMsgA = pageA.locator('.bubble.gif-bubble img').first();
    await expect(gifMsgA).toBeVisible();
    
    // Check constraints (Max width: 240px)
    const box = await gifMsgA.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(240);

    // B receives GIF
    const gifMsgB = pageB.locator('.bubble.gif-bubble img').first();
    await expect(gifMsgB).toBeVisible();

    // Verify Read Receipts update! A should see "Seen" pill
    const readReceiptA = pageA.locator('.read-receipts .pill');
    await expect(readReceiptA).toHaveText('Seen', { timeout: 10000 });

    await contextA.close();
    await contextB.close();
  });
});
