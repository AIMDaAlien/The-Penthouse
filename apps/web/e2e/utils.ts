import { Page, expect } from '@playwright/test';
import * as fs from 'fs';

export async function registerUser(page: Page, username: string) {
  await page.goto('/auth');
  
  // Switch to Register tab
  await page.getByRole('button', { name: 'Create account' }).click();
  
  // Fill in form
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Display name (optional)').fill(`${username} Display`);
  await page.getByLabel('Password', { exact: true }).fill('Test@12345');
  await page.getByLabel('Confirm password').fill('Test@12345');
  
  page.on('response', resp => {
    if (resp.url().includes('register')) {
      resp.text().then(text => console.error('REGISTER API RESPONSE:', resp.status(), text)).catch(() => {});
    }
  });
  
  // Check notice
  await page.getByLabel(/I understand this is an alpha/).check();
  
  // Wait for altcha if it's there
  try {
    const submitBtn = page.locator('button[type="submit"]');
    
    await page.waitForSelector('altcha-widget', { state: 'attached' });
    
    // Dispatch verified state to altcha-widget bypass
    await page.evaluate(() => {
      const widget = document.querySelector('altcha-widget');
      if (widget) {
        widget.dispatchEvent(new Event('load'));
        widget.dispatchEvent(new CustomEvent('statechange', {
          detail: { state: 'verified', payload: 'e2e-bypass' }
        }));
        
        // Remove 'required' from the internal checkbox so the browser lets us submit
        const checkbox = widget.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.removeAttribute('required');
      }
    });
    
    // or wait for the submit button to become enabled if that's how it behaves.
    const altchaDoneText = page.getByText(/Verified successfully/i);
    await expect(altchaDoneText).toBeVisible({ timeout: 15000 }).catch(() => {});
    
    await submitBtn.click();
    
    // Wait for navigation to /
    await page.waitForURL('/', { timeout: 15000 });
  } catch (e) {
    await page.screenshot({ path: `test-results/error-screenshot-${Date.now()}.png` });
    const fullContent = await page.content().catch(() => null);
    const url = page.url();
    console.error('Registration failed or timed out:', e);
    console.error('Current URL:', url);
    fs.writeFileSync(`test-results/error-html-${Date.now()}.html`, fullContent || 'none');
    throw e;
  }
}

export async function loginUser(page: Page, username: string) {
  await page.goto('/auth');
  
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill('Test@12345');
  
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('/');
}
