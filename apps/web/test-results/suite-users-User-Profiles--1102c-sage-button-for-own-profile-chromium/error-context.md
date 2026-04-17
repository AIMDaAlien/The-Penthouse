# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: suite-users.spec.ts >> User Profiles >> profile does NOT show Send Message button for own profile
- Location: e2e/suite-users.spec.ts:107:3

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for locator('.user-card, .user-row').filter({ hasText: 'selfprofile_1775845006847' }).first().locator('.avatar-btn, .avatar').first()

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - button "Back to chat list" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
      - heading "Find People" [level=1] [ref=e8]
    - generic [ref=e9]:
      - textbox "Search by username or name..." [ref=e10]: selfprofile_1775845006847
      - button "Search users" [ref=e11] [cursor=pointer]: 🔍
    - generic [ref=e12]:
      - generic [ref=e13]: Showing 1–20 of 68 users
      - button "A aimtest_manual_1 @aimtest_manual_1 Away" [ref=e14] [cursor=pointer]:
        - generic [ref=e17]: A
        - generic [ref=e18]:
          - generic [ref=e19]: aimtest_manual_1
          - generic [ref=e20]: "@aimtest_manual_1"
          - generic [ref=e21]: Away
        - img [ref=e23]
      - button "B badpw_1775842100832 @badpw_1775842100832 Away" [ref=e25] [cursor=pointer]:
        - generic [ref=e28]: B
        - generic [ref=e29]:
          - generic [ref=e30]: badpw_1775842100832
          - generic [ref=e31]: "@badpw_1775842100832"
          - generic [ref=e32]: Away
        - img [ref=e34]
      - button "B badpw_1775842938446 @badpw_1775842938446 Away" [ref=e36] [cursor=pointer]:
        - generic [ref=e39]: B
        - generic [ref=e40]:
          - generic [ref=e41]: badpw_1775842938446
          - generic [ref=e42]: "@badpw_1775842938446"
          - generic [ref=e43]: Away
        - img [ref=e45]
      - button "B badpw_1775844570077 @badpw_1775844570077 Away" [ref=e47] [cursor=pointer]:
        - generic [ref=e50]: B
        - generic [ref=e51]:
          - generic [ref=e52]: badpw_1775844570077
          - generic [ref=e53]: "@badpw_1775844570077"
          - generic [ref=e54]: Away
        - img [ref=e56]
      - button "B browser_qa_2 @browser_qa_2 Away" [ref=e58] [cursor=pointer]:
        - generic [ref=e61]: B
        - generic [ref=e62]:
          - generic [ref=e63]: browser_qa_2
          - generic [ref=e64]: "@browser_qa_2"
          - generic [ref=e65]: Away
        - img [ref=e67]
      - button "B browser_tester_1775843481772 @browser_tester_1775843481772 Away" [ref=e69] [cursor=pointer]:
        - generic [ref=e72]: B
        - generic [ref=e73]:
          - generic [ref=e74]: browser_tester_1775843481772
          - generic [ref=e75]: "@browser_tester_1775843481772"
          - generic [ref=e76]: Away
        - img [ref=e78]
      - button "C chat_a_1775842159371 @chat_a_1775842159371 Away" [ref=e80] [cursor=pointer]:
        - generic [ref=e83]: C
        - generic [ref=e84]:
          - generic [ref=e85]: chat_a_1775842159371
          - generic [ref=e86]: "@chat_a_1775842159371"
          - generic [ref=e87]: Away
        - img [ref=e89]
      - button "C chat_a_1775842279780 @chat_a_1775842279780 Away" [ref=e91] [cursor=pointer]:
        - generic [ref=e94]: C
        - generic [ref=e95]:
          - generic [ref=e96]: chat_a_1775842279780
          - generic [ref=e97]: "@chat_a_1775842279780"
          - generic [ref=e98]: Away
        - img [ref=e100]
      - button "C chat_a_1775842400155 @chat_a_1775842400155 Away" [ref=e102] [cursor=pointer]:
        - generic [ref=e105]: C
        - generic [ref=e106]:
          - generic [ref=e107]: chat_a_1775842400155
          - generic [ref=e108]: "@chat_a_1775842400155"
          - generic [ref=e109]: Away
        - img [ref=e111]
      - button "C chat_a_1775842962317 @chat_a_1775842962317 Away" [ref=e113] [cursor=pointer]:
        - generic [ref=e116]: C
        - generic [ref=e117]:
          - generic [ref=e118]: chat_a_1775842962317
          - generic [ref=e119]: "@chat_a_1775842962317"
          - generic [ref=e120]: Away
        - img [ref=e122]
      - button "C chat_a_1775843082675 @chat_a_1775843082675 Away" [ref=e124] [cursor=pointer]:
        - generic [ref=e127]: C
        - generic [ref=e128]:
          - generic [ref=e129]: chat_a_1775843082675
          - generic [ref=e130]: "@chat_a_1775843082675"
          - generic [ref=e131]: Away
        - img [ref=e133]
      - button "C chat_a_1775843203179 @chat_a_1775843203179 Away" [ref=e135] [cursor=pointer]:
        - generic [ref=e138]: C
        - generic [ref=e139]:
          - generic [ref=e140]: chat_a_1775843203179
          - generic [ref=e141]: "@chat_a_1775843203179"
          - generic [ref=e142]: Away
        - img [ref=e144]
      - button "C chat_a_1775843323614 @chat_a_1775843323614 Away" [ref=e146] [cursor=pointer]:
        - generic [ref=e149]: C
        - generic [ref=e150]:
          - generic [ref=e151]: chat_a_1775843323614
          - generic [ref=e152]: "@chat_a_1775843323614"
          - generic [ref=e153]: Away
        - img [ref=e155]
      - button "C chat_a_1775843444023 @chat_a_1775843444023 Away" [ref=e157] [cursor=pointer]:
        - generic [ref=e160]: C
        - generic [ref=e161]:
          - generic [ref=e162]: chat_a_1775843444023
          - generic [ref=e163]: "@chat_a_1775843444023"
          - generic [ref=e164]: Away
        - img [ref=e166]
      - button "C chat_a_1775843564489 @chat_a_1775843564489 Away" [ref=e168] [cursor=pointer]:
        - generic [ref=e171]: C
        - generic [ref=e172]:
          - generic [ref=e173]: chat_a_1775843564489
          - generic [ref=e174]: "@chat_a_1775843564489"
          - generic [ref=e175]: Away
        - img [ref=e177]
      - button "C chat_a_1775843684920 @chat_a_1775843684920 Away" [ref=e179] [cursor=pointer]:
        - generic [ref=e182]: C
        - generic [ref=e183]:
          - generic [ref=e184]: chat_a_1775843684920
          - generic [ref=e185]: "@chat_a_1775843684920"
          - generic [ref=e186]: Away
        - img [ref=e188]
      - button "C chat_a_1775844598118 @chat_a_1775844598118 Away" [ref=e190] [cursor=pointer]:
        - generic [ref=e193]: C
        - generic [ref=e194]:
          - generic [ref=e195]: chat_a_1775844598118
          - generic [ref=e196]: "@chat_a_1775844598118"
          - generic [ref=e197]: Away
        - img [ref=e199]
      - button "C chat_a_1775844718456 @chat_a_1775844718456 Online" [ref=e201] [cursor=pointer]:
        - generic [ref=e204]: C
        - generic [ref=e205]:
          - generic [ref=e206]: chat_a_1775844718456
          - generic [ref=e207]: "@chat_a_1775844718456"
          - generic [ref=e208]: Online
        - img [ref=e210]
      - button "C chat_b_1775842159371 @chat_b_1775842159371 Away" [ref=e212] [cursor=pointer]:
        - generic [ref=e215]: C
        - generic [ref=e216]:
          - generic [ref=e217]: chat_b_1775842159371
          - generic [ref=e218]: "@chat_b_1775842159371"
          - generic [ref=e219]: Away
        - img [ref=e221]
      - button "C chat_b_1775842279780 @chat_b_1775842279780 Away" [ref=e223] [cursor=pointer]:
        - generic [ref=e226]: C
        - generic [ref=e227]:
          - generic [ref=e228]: chat_b_1775842279780
          - generic [ref=e229]: "@chat_b_1775842279780"
          - generic [ref=e230]: Away
        - img [ref=e232]
      - generic [ref=e234]:
        - button "Previous page" [disabled]:
          - img
        - generic [ref=e235]: Page 1
        - button "Next page" [ref=e236] [cursor=pointer]:
          - img [ref=e237]
  - navigation "Main navigation" [ref=e239]:
    - button "Chats" [ref=e240] [cursor=pointer]:
      - img [ref=e242]
      - generic [ref=e244]: Chats
    - button "People" [ref=e245] [cursor=pointer]:
      - img [ref=e247]
      - generic [ref=e252]: People
    - button "Settings" [ref=e253] [cursor=pointer]:
      - img [ref=e255]
      - generic [ref=e258]: Settings
```

# Test source

```ts
  14  |   });
  15  | 
  16  |   test('search filters users by username', async ({ page }) => {
  17  |     const u = `searchme_${Date.now()}`;
  18  |     await registerUser(page, u);
  19  |     await page.goto('/users');
  20  |     const input = page.getByPlaceholder(/search/i);
  21  |     await input.fill(u);
  22  |     await page.keyboard.press('Enter');
  23  |     await expect(page.locator('.user-card, .user-row').filter({ hasText: u })).toBeVisible({ timeout: 8000 });
  24  |   });
  25  | 
  26  |   test('search with no match shows empty state', async ({ page }) => {
  27  |     const u = `dir_empty_${Date.now()}`;
  28  |     await registerUser(page, u);
  29  |     await page.goto('/users');
  30  |     await page.getByPlaceholder(/search/i).fill(`zzz_nobody_${Date.now()}`);
  31  |     await page.keyboard.press('Enter');
  32  |     await expect(page.locator('text=/no users|not found|empty/i')).toBeVisible({ timeout: 5000 });
  33  |   });
  34  | 
  35  |   test('pagination works — load more button or auto-scroll', async ({ page }) => {
  36  |     const u = `paginate_${Date.now()}`;
  37  |     await registerUser(page, u);
  38  |     await page.goto('/users');
  39  |     // If there's a load-more button, click it
  40  |     const loadMore = page.locator('button:has-text("Load more"), button:has-text("Show more")');
  41  |     if (await loadMore.isVisible({ timeout: 3000 }).catch(() => false)) {
  42  |       const countBefore = await page.locator('.user-card, .user-row').count();
  43  |       await loadMore.click();
  44  |       const countAfter = await page.locator('.user-card, .user-row').count();
  45  |       expect(countAfter).toBeGreaterThanOrEqual(countBefore);
  46  |     }
  47  |     // else auto-scroll pagination — just verify list renders
  48  |     await expect(page.locator('.user-card, .user-row').first()).toBeVisible();
  49  |   });
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
> 114 |       .locator('.avatar-btn, .avatar').first().click();
      |                                                ^ Error: locator.click: Test timeout of 120000ms exceeded.
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