# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: suite-users.spec.ts >> User Directory >> directory page loads and shows users
- Location: e2e/suite-users.spec.ts:9:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.user-card, .user-row')
Expected: visible
Error: strict mode violation: locator('.user-card, .user-row') resolved to 20 elements:
    1) <button class="user-card s-xAzoHdC_kP8W">…</button> aka getByRole('button', { name: 'A aimtest_manual_1 @' })
    2) <button class="user-card s-xAzoHdC_kP8W">…</button> aka getByRole('button', { name: 'B badpw_1775842100832 @' })
    3) <button class="user-card s-xAzoHdC_kP8W">…</button> aka getByRole('button', { name: 'B badpw_1775842938446 @' })
    4) <button class="user-card s-xAzoHdC_kP8W">…</button> aka getByRole('button', { name: 'B badpw_1775844570077 @' })
    5) <button class="user-card s-xAzoHdC_kP8W">…</button> aka getByRole('button', { name: 'B browser_qa_2 @browser_qa_2' })
    6) <button class="user-card s-xAzoHdC_kP8W">…</button> aka getByRole('button', { name: 'B browser_tester_1775843481772 @browser_tester_1775843481772 Away' })
    7) <button class="user-card s-xAzoHdC_kP8W">…</button> aka getByRole('button', { name: 'C chat_a_1775842159371 @' })
    8) <button class="user-card s-xAzoHdC_kP8W">…</button> aka getByRole('button', { name: 'C chat_a_1775842279780 @' })
    9) <button class="user-card s-xAzoHdC_kP8W">…</button> aka getByRole('button', { name: 'C chat_a_1775842400155 @' })
    10) <button class="user-card s-xAzoHdC_kP8W">…</button> aka getByRole('button', { name: 'C chat_a_1775842962317 @' })
    ...

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('.user-card, .user-row')

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
      - textbox "Search by username or name..." [ref=e10]
      - button "Search users" [disabled]: 🔍
    - generic [ref=e11]:
      - generic [ref=e12]: Showing 1–20 of 60 users
      - button "A aimtest_manual_1 @aimtest_manual_1 Away" [ref=e13] [cursor=pointer]:
        - generic [ref=e16]: A
        - generic [ref=e17]:
          - generic [ref=e18]: aimtest_manual_1
          - generic [ref=e19]: "@aimtest_manual_1"
          - generic [ref=e20]: Away
        - img [ref=e22]
      - button "B badpw_1775842100832 @badpw_1775842100832 Away" [ref=e24] [cursor=pointer]:
        - generic [ref=e27]: B
        - generic [ref=e28]:
          - generic [ref=e29]: badpw_1775842100832
          - generic [ref=e30]: "@badpw_1775842100832"
          - generic [ref=e31]: Away
        - img [ref=e33]
      - button "B badpw_1775842938446 @badpw_1775842938446 Away" [ref=e35] [cursor=pointer]:
        - generic [ref=e38]: B
        - generic [ref=e39]:
          - generic [ref=e40]: badpw_1775842938446
          - generic [ref=e41]: "@badpw_1775842938446"
          - generic [ref=e42]: Away
        - img [ref=e44]
      - button "B badpw_1775844570077 @badpw_1775844570077 Away" [ref=e46] [cursor=pointer]:
        - generic [ref=e49]: B
        - generic [ref=e50]:
          - generic [ref=e51]: badpw_1775844570077
          - generic [ref=e52]: "@badpw_1775844570077"
          - generic [ref=e53]: Away
        - img [ref=e55]
      - button "B browser_qa_2 @browser_qa_2 Away" [ref=e57] [cursor=pointer]:
        - generic [ref=e60]: B
        - generic [ref=e61]:
          - generic [ref=e62]: browser_qa_2
          - generic [ref=e63]: "@browser_qa_2"
          - generic [ref=e64]: Away
        - img [ref=e66]
      - button "B browser_tester_1775843481772 @browser_tester_1775843481772 Away" [ref=e68] [cursor=pointer]:
        - generic [ref=e71]: B
        - generic [ref=e72]:
          - generic [ref=e73]: browser_tester_1775843481772
          - generic [ref=e74]: "@browser_tester_1775843481772"
          - generic [ref=e75]: Away
        - img [ref=e77]
      - button "C chat_a_1775842159371 @chat_a_1775842159371 Away" [ref=e79] [cursor=pointer]:
        - generic [ref=e82]: C
        - generic [ref=e83]:
          - generic [ref=e84]: chat_a_1775842159371
          - generic [ref=e85]: "@chat_a_1775842159371"
          - generic [ref=e86]: Away
        - img [ref=e88]
      - button "C chat_a_1775842279780 @chat_a_1775842279780 Away" [ref=e90] [cursor=pointer]:
        - generic [ref=e93]: C
        - generic [ref=e94]:
          - generic [ref=e95]: chat_a_1775842279780
          - generic [ref=e96]: "@chat_a_1775842279780"
          - generic [ref=e97]: Away
        - img [ref=e99]
      - button "C chat_a_1775842400155 @chat_a_1775842400155 Away" [ref=e101] [cursor=pointer]:
        - generic [ref=e104]: C
        - generic [ref=e105]:
          - generic [ref=e106]: chat_a_1775842400155
          - generic [ref=e107]: "@chat_a_1775842400155"
          - generic [ref=e108]: Away
        - img [ref=e110]
      - button "C chat_a_1775842962317 @chat_a_1775842962317 Away" [ref=e112] [cursor=pointer]:
        - generic [ref=e115]: C
        - generic [ref=e116]:
          - generic [ref=e117]: chat_a_1775842962317
          - generic [ref=e118]: "@chat_a_1775842962317"
          - generic [ref=e119]: Away
        - img [ref=e121]
      - button "C chat_a_1775843082675 @chat_a_1775843082675 Away" [ref=e123] [cursor=pointer]:
        - generic [ref=e126]: C
        - generic [ref=e127]:
          - generic [ref=e128]: chat_a_1775843082675
          - generic [ref=e129]: "@chat_a_1775843082675"
          - generic [ref=e130]: Away
        - img [ref=e132]
      - button "C chat_a_1775843203179 @chat_a_1775843203179 Away" [ref=e134] [cursor=pointer]:
        - generic [ref=e137]: C
        - generic [ref=e138]:
          - generic [ref=e139]: chat_a_1775843203179
          - generic [ref=e140]: "@chat_a_1775843203179"
          - generic [ref=e141]: Away
        - img [ref=e143]
      - button "C chat_a_1775843323614 @chat_a_1775843323614 Away" [ref=e145] [cursor=pointer]:
        - generic [ref=e148]: C
        - generic [ref=e149]:
          - generic [ref=e150]: chat_a_1775843323614
          - generic [ref=e151]: "@chat_a_1775843323614"
          - generic [ref=e152]: Away
        - img [ref=e154]
      - button "C chat_a_1775843444023 @chat_a_1775843444023 Away" [ref=e156] [cursor=pointer]:
        - generic [ref=e159]: C
        - generic [ref=e160]:
          - generic [ref=e161]: chat_a_1775843444023
          - generic [ref=e162]: "@chat_a_1775843444023"
          - generic [ref=e163]: Away
        - img [ref=e165]
      - button "C chat_a_1775843564489 @chat_a_1775843564489 Away" [ref=e167] [cursor=pointer]:
        - generic [ref=e170]: C
        - generic [ref=e171]:
          - generic [ref=e172]: chat_a_1775843564489
          - generic [ref=e173]: "@chat_a_1775843564489"
          - generic [ref=e174]: Away
        - img [ref=e176]
      - button "C chat_a_1775843684920 @chat_a_1775843684920 Away" [ref=e178] [cursor=pointer]:
        - generic [ref=e181]: C
        - generic [ref=e182]:
          - generic [ref=e183]: chat_a_1775843684920
          - generic [ref=e184]: "@chat_a_1775843684920"
          - generic [ref=e185]: Away
        - img [ref=e187]
      - button "C chat_a_1775844598118 @chat_a_1775844598118 Online" [ref=e189] [cursor=pointer]:
        - generic [ref=e192]: C
        - generic [ref=e193]:
          - generic [ref=e194]: chat_a_1775844598118
          - generic [ref=e195]: "@chat_a_1775844598118"
          - generic [ref=e196]: Online
        - img [ref=e198]
      - button "C chat_a_1775844718456 @chat_a_1775844718456 Online" [ref=e200] [cursor=pointer]:
        - generic [ref=e203]: C
        - generic [ref=e204]:
          - generic [ref=e205]: chat_a_1775844718456
          - generic [ref=e206]: "@chat_a_1775844718456"
          - generic [ref=e207]: Online
        - img [ref=e209]
      - button "C chat_b_1775842159371 @chat_b_1775842159371 Away" [ref=e211] [cursor=pointer]:
        - generic [ref=e214]: C
        - generic [ref=e215]:
          - generic [ref=e216]: chat_b_1775842159371
          - generic [ref=e217]: "@chat_b_1775842159371"
          - generic [ref=e218]: Away
        - img [ref=e220]
      - button "C chat_b_1775842279780 @chat_b_1775842279780 Away" [ref=e222] [cursor=pointer]:
        - generic [ref=e225]: C
        - generic [ref=e226]:
          - generic [ref=e227]: chat_b_1775842279780
          - generic [ref=e228]: "@chat_b_1775842279780"
          - generic [ref=e229]: Away
        - img [ref=e231]
      - generic [ref=e233]:
        - button "Previous page" [disabled]:
          - img
        - generic [ref=e234]: Page 1
        - button "Next page" [ref=e235] [cursor=pointer]:
          - img [ref=e236]
  - navigation "Main navigation" [ref=e238]:
    - button "Chats" [ref=e239] [cursor=pointer]:
      - img [ref=e241]
      - generic [ref=e243]: Chats
    - button "People" [ref=e244] [cursor=pointer]:
      - img [ref=e246]
      - generic [ref=e251]: People
    - button "Settings" [ref=e252] [cursor=pointer]:
      - img [ref=e254]
      - generic [ref=e257]: Settings
```

# Test source

```ts
  1   | /**
  2   |  * Users Suite — directory, search, profiles, new DM, settings
  3   |  * Run: npx playwright test e2e/suite-users.spec.ts
  4   |  */
  5   | import { test, expect, Browser } from '@playwright/test';
  6   | import { registerUser } from './utils';
  7   | 
  8   | test.describe('User Directory', () => {
  9   |   test('directory page loads and shows users', async ({ page }) => {
  10  |     const u = `dir_${Date.now()}`;
  11  |     await registerUser(page, u);
  12  |     await page.goto('/users');
> 13  |     await expect(page.locator('.user-card, .user-row')).toBeVisible({ timeout: 8000 });
      |                                                         ^ Error: expect(locator).toBeVisible() failed
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
```