# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: suite-users.spec.ts >> New DM via chat list button >> New Message button opens user search modal
- Location: e2e/suite-users.spec.ts:171:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.bottom-sheet, [aria-labelledby="dm-modal-title"]')
Expected: visible
Error: strict mode violation: locator('.bottom-sheet, [aria-labelledby="dm-modal-title"]') resolved to 2 elements:
    1) <div role="dialog" tabindex="-1" aria-modal="true" class="overlay s-y_bCXRrkrYfP" aria-labelledby="dm-modal-title">…</div> aka getByRole('dialog', { name: 'New message' })
    2) <div role="document" class="bottom-sheet s-y_bCXRrkrYfP">…</div> aka locator('html').getByRole('document')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.bottom-sheet, [aria-labelledby="dm-modal-title"]')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]: The
        - generic [ref=e7]: Penthouse
      - generic [ref=e8]:
        - generic "idle" [ref=e9]
        - button "New message" [active] [ref=e10] [cursor=pointer]:
          - img [ref=e11]
    - main [ref=e14]:
      - button "General Tue Channel" [ref=e15] [cursor=pointer]:
        - img [ref=e17]
        - generic [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e22]: General
            - generic [ref=e23]: Tue
          - generic [ref=e24]: Channel
  - dialog "New message" [ref=e25]:
    - document [ref=e26]:
      - generic [ref=e28]:
        - paragraph [ref=e29]: New message
        - button "Close" [ref=e30] [cursor=pointer]:
          - img [ref=e31]
      - generic [ref=e35]:
        - img
        - textbox "Search by name or username..." [ref=e36]
  - navigation "Main navigation" [ref=e37]:
    - button "Chats" [ref=e38] [cursor=pointer]:
      - img [ref=e40]
      - generic [ref=e42]: Chats
    - button "People" [ref=e43] [cursor=pointer]:
      - img [ref=e45]
      - generic [ref=e50]: People
    - button "Settings" [ref=e51] [cursor=pointer]:
      - img [ref=e53]
      - generic [ref=e56]: Settings
```

# Test source

```ts
  76  |     // Profile modal/page should open
  77  |     await expect(pageA.locator('.modal-card, .profile-body, [aria-label="User profile"]')).toBeVisible({ timeout: 5000 });
  78  |     await expect(pageA.locator('.display-name, h2').filter({ hasText: new RegExp(userB, 'i') })).toBeVisible({ timeout: 3000 });
  79  | 
  80  |     await ctxA.close();
  81  |     await ctxB.close();
  82  |   });
  83  | 
  84  |   test('profile shows Send Message button for other users', async ({ browser }) => {
  85  |     const ts = Date.now();
  86  |     const ctxA = await browser.newContext();
  87  |     const pageA = await ctxA.newPage();
  88  |     await registerUser(pageA, `prof_a_${ts}`);
  89  | 
  90  |     const ctxB = await browser.newContext();
  91  |     const pageB = await ctxB.newPage();
  92  |     const userB = `prof_b_${ts}`;
  93  |     await registerUser(pageB, userB);
  94  | 
  95  |     await pageA.goto('/users');
  96  |     await pageA.getByPlaceholder(/search/i).fill(userB);
  97  |     await pageA.keyboard.press('Enter');
  98  |     await pageA.locator('.user-card, .user-row').filter({ hasText: userB }).first()
  99  |       .locator('.avatar-btn, .avatar').first().click();
  100 | 
  101 |     await expect(pageA.locator('button:has-text("Send message"), button:has-text("Message")')).toBeVisible({ timeout: 5000 });
  102 | 
  103 |     await ctxA.close();
  104 |     await ctxB.close();
  105 |   });
  106 | 
  107 |   test('profile does NOT show Send Message button for own profile', async ({ page }) => {
  108 |     const u = `selfprofile_${Date.now()}`;
  109 |     await registerUser(page, u);
  110 |     await page.goto('/users');
  111 |     await page.getByPlaceholder(/search/i).fill(u);
  112 |     await page.keyboard.press('Enter');
  113 |     await page.locator('.user-card, .user-row').filter({ hasText: u }).first()
  114 |       .locator('.avatar-btn, .avatar').first().click();
  115 | 
  116 |     // "Send message" should not be visible when viewing own profile
  117 |     await expect(page.locator('button:has-text("Send message"), button:has-text("Message")')).not.toBeVisible({ timeout: 3000 });
  118 |   });
  119 | 
  120 |   test('Send Message from profile navigates to DM thread', async ({ browser }) => {
  121 |     const ts = Date.now();
  122 |     const userA = `dm_from_a_${ts}`;
  123 |     const userB = `dm_from_b_${ts}`;
  124 |     const ctxA = await browser.newContext();
  125 |     const pageA = await ctxA.newPage();
  126 |     await registerUser(pageA, userA);
  127 |     const ctxB = await browser.newContext();
  128 |     const pageB = await ctxB.newPage();
  129 |     await registerUser(pageB, userB);
  130 | 
  131 |     await pageA.goto('/users');
  132 |     await pageA.getByPlaceholder(/search/i).fill(userB);
  133 |     await pageA.keyboard.press('Enter');
  134 |     await pageA.locator('.user-card, .user-row').filter({ hasText: userB }).first()
  135 |       .locator('.avatar-btn, .avatar').first().click();
  136 |     await pageA.locator('button:has-text("Send message"), button:has-text("Message")').first().click();
  137 | 
  138 |     await expect(pageA).toHaveURL(/\/chat\//, { timeout: 8000 });
  139 | 
  140 |     await ctxA.close();
  141 |     await ctxB.close();
  142 |   });
  143 | });
  144 | 
  145 | test.describe('Settings', () => {
  146 |   test('settings page loads', async ({ page }) => {
  147 |     const u = `settings_${Date.now()}`;
  148 |     await registerUser(page, u);
  149 |     await page.goto('/settings');
  150 |     await expect(page.locator('.settings, h1, h2').first()).toBeVisible({ timeout: 5000 });
  151 |   });
  152 | 
  153 |   test('display name can be updated', async ({ page }) => {
  154 |     const u = `editname_${Date.now()}`;
  155 |     await registerUser(page, u);
  156 |     await page.goto('/settings');
  157 | 
  158 |     const nameInput = page.locator('input[name="displayName"], #display-name, input[placeholder*="display" i]').first();
  159 |     if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
  160 |       const newName = `Updated ${Date.now()}`;
  161 |       await nameInput.fill(newName);
  162 |       await page.locator('button:has-text("Save"), button[type="submit"]').first().click();
  163 |       await expect(page.locator('.success, text=/saved|updated/i')).toBeVisible({ timeout: 5000 });
  164 |     } else {
  165 |       test.skip(); // Settings form not exposed in this build
  166 |     }
  167 |   });
  168 | });
  169 | 
  170 | test.describe('New DM via chat list button', () => {
  171 |   test('New Message button opens user search modal', async ({ page }) => {
  172 |     const u = `newdm_${Date.now()}`;
  173 |     await registerUser(page, u);
  174 |     await page.goto('/');
  175 |     await page.getByRole('button', { name: 'New message' }).click();
> 176 |     await expect(page.locator('.bottom-sheet, [aria-labelledby="dm-modal-title"]')).toBeVisible({ timeout: 5000 });
      |                                                                                     ^ Error: expect(locator).toBeVisible() failed
  177 |     await expect(page.locator('.search-input, input[type="text"]').first()).toBeVisible();
  178 |   });
  179 | 
  180 |   test('searching and selecting a user opens DM thread', async ({ browser }) => {
  181 |     const ts = Date.now();
  182 |     const userA = `newdm_a_${ts}`;
  183 |     const userB = `newdm_b_${ts}`;
  184 |     const ctxA = await browser.newContext();
  185 |     const pageA = await ctxA.newPage();
  186 |     await registerUser(pageA, userA);
  187 |     const ctxB = await browser.newContext();
  188 |     const pageB = await ctxB.newPage();
  189 |     await registerUser(pageB, userB);
  190 | 
  191 |     await pageA.goto('/');
  192 |     await pageA.getByRole('button', { name: 'New message' }).click();
  193 |     await pageA.locator('.search-input, .bottom-sheet input[type="text"]').first().fill(userB);
  194 |     await pageA.waitForSelector('.dm-user-row', { timeout: 8000 });
  195 |     await pageA.locator('.dm-user-row').filter({ hasText: userB }).first().click();
  196 |     await expect(pageA).toHaveURL(/\/chat\//, { timeout: 8000 });
  197 | 
  198 |     await ctxA.close();
  199 |     await ctxB.close();
  200 |   });
  201 | 
  202 |   test('Escape closes the New Message modal', async ({ page }) => {
  203 |     const u = `esc_dm_${Date.now()}`;
  204 |     await registerUser(page, u);
  205 |     await page.goto('/');
  206 |     await page.getByRole('button', { name: 'New message' }).click();
  207 |     await expect(page.locator('.bottom-sheet')).toBeVisible({ timeout: 5000 });
  208 |     await page.keyboard.press('Escape');
  209 |     await expect(page.locator('.bottom-sheet')).not.toBeVisible({ timeout: 3000 });
  210 |     await expect(page).toHaveURL('/');
  211 |   });
  212 | });
  213 | 
```