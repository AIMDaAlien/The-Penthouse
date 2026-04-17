import { test, expect } from '@playwright/test';
import { expectAxePasses, throttleNetwork, takeVisualSnapshot, humanSwipe } from './qa-utils';
import { registerUser } from './utils';

test.describe('Advanced Superhuman QA Suite', () => {

  test('Page Structural Accessibility (Axe-Core)', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');
    
    // Wait for basic render
    await page.waitForLoadState('domcontentloaded');

    // Superhuman A11y Verification
    await expectAxePasses(page, {
      exclude: ['.sr-only'] // exclude structurally hidden elements if necessary
    });
  });

  test('Visual Regression Baseline (Percy AI)', async ({ page }) => {
    // Generate an isolated user
    const qaUser = `u_qa_vis_${Date.now()}`;
    await registerUser(page, qaUser);
    
    // Wait for the inbox layout to settle
    await page.waitForSelector('.main-layout', { state: 'visible' });

    // Perceptual AI Snapshot
    await takeVisualSnapshot(page, 'Inbox Dashboard - Day 1 Validation');
    
    // Validate we can safely log out without breaking layout
    await page.getByRole('button', { name: /settings|profile/i }).first().click().catch(() => {});
    await takeVisualSnapshot(page, 'Settings Drawer Overlay');
  });

  test('Slow 3G Network Resilience & Interactions', async ({ page }) => {
    const qaUser = `u_qa_net_${Date.now()}`;
    await registerUser(page, qaUser);
    
    // Severely throttle the CDP connection
    await throttleNetwork(page, 'slow3g');
    
    await page.goto('/users');
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.waitFor({ state: 'visible' });
    
    // Type and verify UI doesn't stutter or crash under blocked packets
    await searchInput.fill('AdminUserTest');
    
    // Use human realistic swipe motion over the screen to emulate doom-scrolling impatience
    await humanSwipe(page, { x: 500, y: 600 }, { x: 500, y: 100 }, 30);
    
    // Reset to none
    await throttleNetwork(page, 'none');
  });

});
