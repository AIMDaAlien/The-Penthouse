import { Page } from '@playwright/test';

const TEST_PASSWORD = 'Test@12345';

/**
 * Registers a user via the UI form with CAPTCHA bypass.
 *
 * This goes through the real auth form so that handleSubmit() fires naturally,
 * which calls socketStore.connect() and establishes the WebSocket session.
 */
export async function registerUser(page: Page, username: string) {
  await page.goto('/auth', { waitUntil: 'networkidle' });

  // Ensure the page is fully loaded and hydrated before interacting
  await page.waitForLoadState('domcontentloaded');

  // Switch to register mode
  const createAccountTab = page.getByRole('button', { name: 'Create account' });
  await createAccountTab.waitFor({ state: 'visible', timeout: 5000 });
  await createAccountTab.click();

  // Wait for Svelte to fully re-render the form in register mode.
  // The submit button text changes from "Sign in" to "Create account" after mode switch.
  await page.waitForFunction(() => {
    const btn = document.querySelector('button[type="submit"]');
    return btn && btn.textContent?.trim() === 'Create account';
  }, { timeout: 10000 });

  // Fill out the form
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Display name (optional)').fill(`${username} Display`);
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
  await page.getByLabel('Confirm password').fill(TEST_PASSWORD);
  await page.getByLabel(/I understand this is an alpha/).check();

  // Wait for Altcha to render (altchaRuntimeState === 'ready')
  await page.waitForSelector('altcha-widget', { state: 'attached', timeout: 15000 });

  // Bypass the CAPTCHA: dispatch events to update Svelte state, AND interact with
  // the internal checkbox so browser constraint validation is satisfied.
  await page.evaluate(() => {
    const widget = document.querySelector('altcha-widget');
    if (!widget) return;

    // 1. Dispatch 'load' → sets altchaWidgetLoaded = true in Svelte
    widget.dispatchEvent(new Event('load'));

    // 2. Dispatch 'statechange' with bypass payload → sets captchaToken in Svelte
    widget.dispatchEvent(
      new CustomEvent('statechange', {
        detail: { state: 'verified', payload: 'e2e-bypass' },
      })
    );

    // 3. Satisfy browser's native HTML5 constraint validation for the internal checkbox.
    //    Altcha's internal checkbox is in its Shadow DOM.
    const shadowRoot = widget.shadowRoot;
    if (shadowRoot) {
      const internalCheckbox = shadowRoot.querySelector('input[type="checkbox"]');
      if (internalCheckbox) {
        (internalCheckbox as HTMLInputElement).checked = true;
        internalCheckbox.removeAttribute('required');
      }
    }

    // 4. Fallback: also try the light DOM (older versions or SSR)
    const lightCheckbox = widget.querySelector('input[type="checkbox"]');
    if (lightCheckbox) {
      (lightCheckbox as HTMLInputElement).checked = true;
      lightCheckbox.removeAttribute('required');
    }
  });

  // Wait for Svelte to re-render and show "✓ CAPTCHA verified"
  await page.waitForSelector('text=✓ CAPTCHA verified', { timeout: 5000 }).catch(() => {});

  // Submit — handleSubmit fires, calls auth.register(), socketStore.connect(), then goto('/')
  await page.locator('button[type="submit"]').click();

  // Wait for navigation to chat list
  await page.waitForURL('/', { timeout: 20000 });
}

/**
 * Logs in an existing user via the auth form.
 */
export async function loginUser(page: Page, username: string) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });

  // Default mode is 'login' — just fill username/password
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);

  // Use button[type="submit"] to avoid strict-mode violation with the "Sign in" tab
  await page.locator('button[type="submit"]').click();

  await page.waitForURL('/', { timeout: 15000 });
}
