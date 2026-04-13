# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: suite-users.spec.ts >> Settings >> settings page loads
- Location: e2e/suite-users.spec.ts:146:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.settings, h1, h2').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.settings, h1, h2').first()

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]: The
        - generic [ref=e7]: Penthouse
    - main [ref=e8]:
      - generic [ref=e9]:
        - button "Change avatar" [ref=e10] [cursor=pointer]:
          - generic [ref=e11]: SE
          - img [ref=e13]
        - generic [ref=e17]:
          - paragraph [ref=e18]: settings_1775845247503
          - paragraph [ref=e19]: "@settings_1775845247503"
      - generic [ref=e20]:
        - paragraph [ref=e21]: Display
        - generic [ref=e22]:
          - generic [ref=e23]:
            - paragraph [ref=e24]: Density
            - paragraph [ref=e25]: Controls spacing between chat rows
          - generic [ref=e26]:
            - button "Spacious" [ref=e27] [cursor=pointer]
            - button "Compact" [ref=e28] [cursor=pointer]
      - generic [ref=e29]:
        - paragraph [ref=e30]: Account
        - button "Sign out" [ref=e31] [cursor=pointer]:
          - img [ref=e32]
          - text: Sign out
      - paragraph [ref=e35]: The Penthouse · alpha
  - navigation "Main navigation" [ref=e36]:
    - button "Chats" [ref=e37] [cursor=pointer]:
      - img [ref=e39]
      - generic [ref=e41]: Chats
    - button "People" [ref=e42] [cursor=pointer]:
      - img [ref=e44]
      - generic [ref=e49]: People
    - button "Settings" [ref=e50] [cursor=pointer]:
      - img [ref=e52]
      - generic [ref=e55]: Settings
```

# Test source

```ts
  50  | });
  51  | 
  52  | test.describe('User Profiles', () => {
  53  |   test('clicking a user opens their profile', async ({ browser }) => {
  54  |     const ts = Date.now();
  55  |     const userA = `profile_a_${ts}`;
  56  |     const userB = `profile_b_${ts}`;
  57  | 
  58  |     const ctxA = await browser.newContext();
  59  |     const pageA = await ctxA.newPage();
  60  |     await registerUser(pageA, userA);
  61  | 
  62  |     const ctxB = await browser.newContext();
  63  |     const pageB = await ctxB.newPage();
  64  |     await registerUser(pageB, userB);
  65  | 
  66  |     await pageA.goto('/users');
  67  |     await pageA.getByPlaceholder(/search/i).fill(userB);
  68  |     await pageA.keyboard.press('Enter');
  69  | 
  70  |     const userRow = pageA.locator('.user-card, .user-row').filter({ hasText: userB }).first();
  71  |     await expect(userRow).toBeVisible({ timeout: 8000 });
  72  | 
  73  |     // Click avatar or name to open profile
  74  |     await userRow.locator('.avatar-btn, .user-name, .avatar').first().click();
  75  | 
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
> 150 |     await expect(page.locator('.settings, h1, h2').first()).toBeVisible({ timeout: 5000 });
      |                                                             ^ Error: expect(locator).toBeVisible() failed
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
  176 |     await expect(page.locator('.bottom-sheet, [aria-labelledby="dm-modal-title"]')).toBeVisible({ timeout: 5000 });
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