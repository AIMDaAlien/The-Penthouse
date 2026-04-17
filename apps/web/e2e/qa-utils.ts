import { expect, type Page, type BrowserContext, type Browser } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import percySnapshot from '@percy/playwright';

/**
 * Superhuman A11y
 * Crawls the DOM to verify WCAG 2.1 compliance
 */
export async function expectAxePasses(page: Page, options?: { exclude?: string[] }) {
  const builder = new AxeBuilder({ page });
  if (options?.exclude) {
    builder.exclude(options.exclude);
  }
  const result = await builder.analyze();
  
  // Format violations explicitly for clearer error logs
  const violations = result.violations.map(v => `${v.id} (${v.impact}): ${v.help}`);
  expect(violations, `Accessibility violations detected:\n${violations.join('\n')}`).toEqual([]);
}

/**
 * Superhuman Throttle
 * Emulates terrible network connections to verify robust retry mechanisms and CLS
 */
export async function throttleNetwork(page: Page, type: 'none' | 'fast3g' | 'slow3g' | 'offline') {
  const client = await page.context().newCDPSession(page);
  if (type === 'none') {
    await client.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  } else if (type === 'fast3g') {
    await client.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 1.5 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  } else if (type === 'slow3g') {
    await client.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8 });
  } else if (type === 'offline') {
    await client.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  }
}

/**
 * Superhuman Touch
 * Instead of instant teleportation (which bypasses inertial gesture bugs), 
 * calculates interpolated curves over ms-steps to drag realistically.
 */
export async function humanSwipe(page: Page, from: {x:number, y:number}, to: {x:number, y:number}, steps = 20) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  
  for (let i = 1; i <= steps; i++) {
    const nextX = from.x + ((to.x - from.x) * (i / steps));
    const nextY = from.y + ((to.y - from.y) * (i / steps));
    await page.mouse.move(nextX, nextY, { steps: 2 });
    await page.waitForTimeout(10); // Natural drag interval
  }
  
  await page.mouse.up();
}

/**
 * Perceptive Visual Regression
 * Compares current viewport DOM snapshot against the baseline trained by Percy.
 */
export async function takeVisualSnapshot(page: Page, name: string) {
  // Graceful fail if token is missing locally so tests still run
  if (process.env.PERCY_TOKEN) {
    await percySnapshot(page, name);
  } else {
    console.warn(`[Percy] Skipping snapshot '${name}' because PERCY_TOKEN is not set.`);
  }
}

/**
 * Multiplexes isolated incognito browser instances for concurrent UI testing
 * (e.g. testing if User C sees User B type to User A)
 */
export async function createMultiplexedContexts(browser: Browser, count: number): Promise<BrowserContext[]> {
  const promises = Array.from({ length: count }).map(() => browser.newContext());
  return Promise.all(promises);
}
