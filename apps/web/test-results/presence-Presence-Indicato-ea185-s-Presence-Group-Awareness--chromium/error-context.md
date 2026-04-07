# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: presence.spec.ts >> Presence Indicators >> Scenario 7: Multiple Users Presence (Group Awareness)
- Location: e2e/presence.spec.ts:209:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.user-row, .chat-row').filter({ hasText: /u_grp_b_1775535615762/i }).first().locator('.status-dot.online')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.user-row, .chat-row').filter({ hasText: /u_grp_b_1775535615762/i }).first().locator('.status-dot.online')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - button "Back to chat list" [ref=e5] [cursor=pointer]: ←
    - heading "Find People" [level=1] [ref=e6]
  - generic [ref=e7]:
    - textbox "Search by username or name..." [active] [ref=e8]: u_grp
    - button "Search users" [ref=e9] [cursor=pointer]: 🔍
  - generic [ref=e10]:
    - generic [ref=e11]: Showing 1–20 of 23 users
    - button "A aimtest @aimtest Away →" [ref=e12] [cursor=pointer]:
      - generic [ref=e14]: A
      - generic [ref=e16]:
        - generic [ref=e17]: aimtest
        - generic [ref=e18]: "@aimtest"
        - generic [ref=e19]: Away
      - generic [ref=e20]: →
    - button "A aimtest1 @aimtest1 Away →" [ref=e21] [cursor=pointer]:
      - generic [ref=e23]: A
      - generic [ref=e25]:
        - generic [ref=e26]: aimtest1
        - generic [ref=e27]: "@aimtest1"
        - generic [ref=e28]: Away
      - generic [ref=e29]: →
    - button "D davidtest @davidtest Away →" [ref=e30] [cursor=pointer]:
      - generic [ref=e32]: D
      - generic [ref=e34]:
        - generic [ref=e35]: davidtest
        - generic [ref=e36]: "@davidtest"
        - generic [ref=e37]: Away
      - generic [ref=e38]: →
    - button "G gabetest @gabetest Away →" [ref=e39] [cursor=pointer]:
      - generic [ref=e41]: G
      - generic [ref=e43]:
        - generic [ref=e44]: gabetest
        - generic [ref=e45]: "@gabetest"
        - generic [ref=e46]: Away
      - generic [ref=e47]: →
    - button "R ryantest @ryantest Away →" [ref=e48] [cursor=pointer]:
      - generic [ref=e50]: R
      - generic [ref=e52]:
        - generic [ref=e53]: ryantest
        - generic [ref=e54]: "@ryantest"
        - generic [ref=e55]: Away
      - generic [ref=e56]: →
    - button "T test_e2e_bypass @test_e2e_bypass Away →" [ref=e57] [cursor=pointer]:
      - generic [ref=e59]: T
      - generic [ref=e61]:
        - generic [ref=e62]: test_e2e_bypass
        - generic [ref=e63]: "@test_e2e_bypass"
        - generic [ref=e64]: Away
      - generic [ref=e65]: →
    - button "T tester22818 @tester22818 Away →" [ref=e66] [cursor=pointer]:
      - generic [ref=e68]: T
      - generic [ref=e70]:
        - generic [ref=e71]: tester22818
        - generic [ref=e72]: "@tester22818"
        - generic [ref=e73]: Away
      - generic [ref=e74]: →
    - button "U u_a_1775535366715 @u_a_1775535366715 Online →" [ref=e75] [cursor=pointer]:
      - generic [ref=e77]: U
      - generic [ref=e79]:
        - generic [ref=e80]: u_a_1775535366715
        - generic [ref=e81]: "@u_a_1775535366715"
        - generic [ref=e82]: Online
      - generic [ref=e83]: →
    - button "U u_a_1775535564369 @u_a_1775535564369 Online →" [ref=e84] [cursor=pointer]:
      - generic [ref=e86]: U
      - generic [ref=e88]:
        - generic [ref=e89]: u_a_1775535564369
        - generic [ref=e90]: "@u_a_1775535564369"
        - generic [ref=e91]: Online
      - generic [ref=e92]: →
    - button "U u_a_1775535614986 @u_a_1775535614986 Online →" [ref=e93] [cursor=pointer]:
      - generic [ref=e95]: U
      - generic [ref=e97]:
        - generic [ref=e98]: u_a_1775535614986
        - generic [ref=e99]: "@u_a_1775535614986"
        - generic [ref=e100]: Online
      - generic [ref=e101]: →
    - button "U u_b_1775535382373 @u_b_1775535382373 Online →" [ref=e102] [cursor=pointer]:
      - generic [ref=e104]: U
      - generic [ref=e106]:
        - generic [ref=e107]: u_b_1775535382373
        - generic [ref=e108]: "@u_b_1775535382373"
        - generic [ref=e109]: Online
      - generic [ref=e110]: →
    - button "U u_b_1775535580016 @u_b_1775535580016 Online →" [ref=e111] [cursor=pointer]:
      - generic [ref=e113]: U
      - generic [ref=e115]:
        - generic [ref=e116]: u_b_1775535580016
        - generic [ref=e117]: "@u_b_1775535580016"
        - generic [ref=e118]: Online
      - generic [ref=e119]: →
    - button "U u_b_1775535630620 @u_b_1775535630620 Online →" [ref=e120] [cursor=pointer]:
      - generic [ref=e122]: U
      - generic [ref=e124]:
        - generic [ref=e125]: u_b_1775535630620
        - generic [ref=e126]: "@u_b_1775535630620"
        - generic [ref=e127]: Online
      - generic [ref=e128]: →
    - button "U u_cl_a_1775535606269 @u_cl_a_1775535606269 Online →" [ref=e129] [cursor=pointer]:
      - generic [ref=e131]: U
      - generic [ref=e133]:
        - generic [ref=e134]: u_cl_a_1775535606269
        - generic [ref=e135]: "@u_cl_a_1775535606269"
        - generic [ref=e136]: Online
      - generic [ref=e137]: →
    - button "U u_cl_b_1775535621957 @u_cl_b_1775535621957 Online →" [ref=e138] [cursor=pointer]:
      - generic [ref=e140]: U
      - generic [ref=e142]:
        - generic [ref=e143]: u_cl_b_1775535621957
        - generic [ref=e144]: "@u_cl_b_1775535621957"
        - generic [ref=e145]: Online
      - generic [ref=e146]: →
    - button "U u_grp_a_1775535615762 @u_grp_a_1775535615762 Online →" [ref=e147] [cursor=pointer]:
      - generic [ref=e149]: U
      - generic [ref=e151]:
        - generic [ref=e152]: u_grp_a_1775535615762
        - generic [ref=e153]: "@u_grp_a_1775535615762"
        - generic [ref=e154]: Online
      - generic [ref=e155]: →
    - button "U u_grp_b_1775535615762 @u_grp_b_1775535615762 Online →" [ref=e156] [cursor=pointer]:
      - generic [ref=e158]: U
      - generic [ref=e160]:
        - generic [ref=e161]: u_grp_b_1775535615762
        - generic [ref=e162]: "@u_grp_b_1775535615762"
        - generic [ref=e163]: Online
      - generic [ref=e164]: →
    - button "U u_grp_c_1775535615762 @u_grp_c_1775535615762 Online →" [ref=e165] [cursor=pointer]:
      - generic [ref=e167]: U
      - generic [ref=e169]:
        - generic [ref=e170]: u_grp_c_1775535615762
        - generic [ref=e171]: "@u_grp_c_1775535615762"
        - generic [ref=e172]: Online
      - generic [ref=e173]: →
    - button "U u_rld_a_1775535579055 @u_rld_a_1775535579055 Online →" [ref=e174] [cursor=pointer]:
      - generic [ref=e176]: U
      - generic [ref=e178]:
        - generic [ref=e179]: u_rld_a_1775535579055
        - generic [ref=e180]: "@u_rld_a_1775535579055"
        - generic [ref=e181]: Online
      - generic [ref=e182]: →
    - button "U u_rld_b_1775535594726 @u_rld_b_1775535594726 Online →" [ref=e183] [cursor=pointer]:
      - generic [ref=e185]: U
      - generic [ref=e187]:
        - generic [ref=e188]: u_rld_b_1775535594726
        - generic [ref=e189]: "@u_rld_b_1775535594726"
        - generic [ref=e190]: Online
      - generic [ref=e191]: →
    - generic [ref=e192]:
      - button "← Previous" [disabled]
      - generic [ref=e193]: Page 1
      - button "Next →" [ref=e194] [cursor=pointer]
```

# Test source

```ts
  133 |     await expect(chatRowA.locator('.status-dot.online')).toBeVisible({ timeout: 5000 });
  134 | 
  135 |     await contextA.close();
  136 |     await contextB.close();
  137 |   });
  138 | 
  139 |   test('Scenario 4 & 5: Header Avatar and Socket Disconnect', async ({ browser }) => {
  140 |     const contextA = await browser.newContext();
  141 |     const pageA = await contextA.newPage();
  142 |     const usernameA = `u_hd_a_${Date.now()}`;
  143 |     await registerUser(pageA, usernameA);
  144 |     
  145 |     const contextB = await browser.newContext();
  146 |     const pageB = await contextB.newPage();
  147 |     const usernameB = `u_hd_b_${Date.now()}`;
  148 |     await registerUser(pageB, usernameB);
  149 |     
  150 |     // Start DM
  151 |     await pageB.goto('/users');
  152 |     await pageB.getByPlaceholder(/search/i).fill(usernameA);
  153 |     await pageB.locator('.user-card, .chat-row', { hasText: new RegExp(usernameA, 'i') }).first().click();
  154 |     await pageB.getByPlaceholder(/message/i).fill('hello context');
  155 |     await pageB.keyboard.press('Enter');
  156 |     
  157 |     // A opens chat list -> conversation
  158 |     await pageA.goto('/');
  159 |     await pageA.locator('.chat-row', { hasText: new RegExp(usernameB, 'i') }).first().click();
  160 |     
  161 |     // Header should contain avatar
  162 |     await expect(pageA.locator('header').locator('.status-dot.online')).toBeVisible({ timeout: 5000 });
  163 |     
  164 |     // Close B context
  165 |     await contextB.close();
  166 |     
  167 |     await expect(pageA.locator('header').locator('.status-dot.online')).toBeHidden({ timeout: 15000 });
  168 |     
  169 |     await contextA.close();
  170 |   });
  171 | 
  172 |   test('Scenario 6: Page Reload and Presence Restoration', async ({ browser }) => {
  173 |     const contextA = await browser.newContext();
  174 |     const pageA = await contextA.newPage();
  175 |     const usernameA = `u_rld_a_${Date.now()}`;
  176 |     await registerUser(pageA, usernameA);
  177 |     
  178 |     const contextB = await browser.newContext();
  179 |     const pageB = await contextB.newPage();
  180 |     const usernameB = `u_rld_b_${Date.now()}`;
  181 |     await registerUser(pageB, usernameB);
  182 |     
  183 |     // Tab A sees Tab B
  184 |     await pageA.goto('/users');
  185 |     await pageA.getByPlaceholder(/search/i).fill(usernameB);
  186 |     const rowForB = pageA.locator('.user-card, .chat-row', { hasText: new RegExp(usernameB, 'i') }).first();
  187 |     await expect(rowForB.locator('.status-dot.online')).toBeVisible({ timeout: 5000 });
  188 |     
  189 |     // Refresh page A
  190 |     await pageA.reload();
  191 |     
  192 |     // B watches A in DM Search
  193 |     await pageB.goto('/users');
  194 |     await pageB.getByPlaceholder(/search/i).fill(usernameA);
  195 |     const rowForA = pageB.locator('.user-card, .chat-row', { hasText: new RegExp(usernameA, 'i') }).first();
  196 |     
  197 |     await expect(rowForA.locator('.status-dot.online')).toBeVisible({ timeout: 15000 });
  198 |     
  199 |     // A should see B online again
  200 |     await pageA.goto('/users');
  201 |     await pageA.getByPlaceholder(/search/i).fill(usernameB);
  202 |     const rowForA_B = pageA.locator('.user-card, .chat-row', { hasText: new RegExp(usernameB, 'i') }).first();
  203 |     await expect(rowForA_B.locator('.status-dot.online')).toBeVisible({ timeout: 10000 });
  204 |     
  205 |     await contextA.close();
  206 |     await contextB.close();
  207 |   });
  208 | 
  209 |   test('Scenario 7: Multiple Users Presence (Group Awareness)', async ({ browser }) => {
  210 |     test.setTimeout(150000);
  211 |     const [contextA, contextB, contextC] = await Promise.all([
  212 |       browser.newContext(), browser.newContext(), browser.newContext()
  213 |     ]);
  214 |     const [pageA, pageB, pageC] = await Promise.all([
  215 |       contextA.newPage(), contextB.newPage(), contextC.newPage()
  216 |     ]);
  217 |     
  218 |     const ts = Date.now();
  219 |     const usernameA = `u_grp_a_${ts}`;
  220 |     const usernameB = `u_grp_b_${ts}`;
  221 |     const usernameC = `u_grp_c_${ts}`;
  222 |     
  223 |     await registerUser(pageA, usernameA);
  224 |     await registerUser(pageB, usernameB);
  225 |     await registerUser(pageC, usernameC);
  226 |     
  227 |     await pageA.goto('/users');
  228 |     await pageA.getByPlaceholder(/search/i).fill(`u_grp`); // Should match all users
  229 |     
  230 |     const rowForB = pageA.locator('.user-card, .chat-row', { hasText: new RegExp(usernameB, 'i') }).first();
  231 |     const rowForC = pageA.locator('.user-card, .chat-row', { hasText: new RegExp(usernameC, 'i') }).first();
  232 |     
> 233 |     await expect(rowForB.locator('.status-dot.online')).toBeVisible({ timeout: 5000 });
      |                                                         ^ Error: expect(locator).toBeVisible() failed
  234 |     await expect(rowForC.locator('.status-dot.online')).toBeVisible({ timeout: 5000 });
  235 |     
  236 |     // Tab B idles
  237 |     // eslint-disable-next-line playwright/no-wait-for-timeout
  238 |     await pageB.waitForTimeout(65000);
  239 |     
  240 |     // Tab B goes offline for Tab A
  241 |     await expect(rowForB.locator('.status-dot.online')).toBeHidden({ timeout: 10000 });
  242 |     await expect(rowForC.locator('.status-dot.online')).toBeVisible({ timeout: 5000 });
  243 |     
  244 |     await contextA.close();
  245 |     await contextB.close();
  246 |     await contextC.close();
  247 |   });
  248 | 
  249 |   test('Scenario 8: Avatar Component Variants (sm, md, lg)', async ({ browser }) => {
  250 |     const contextA = await browser.newContext();
  251 |     const pageA = await contextA.newPage();
  252 |     const usernameA = `u_var_a_${Date.now()}`;
  253 |     await registerUser(pageA, usernameA);
  254 |     
  255 |     const contextB = await browser.newContext();
  256 |     const pageB = await contextB.newPage();
  257 |     const usernameB = `u_var_b_${Date.now()}`;
  258 |     await registerUser(pageB, usernameB);
  259 |     
  260 |     // In DM Search modal
  261 |     await pageA.getByRole('button', { name: /✏️|New Chat/i }).first().click();
  262 |     await pageA.getByPlaceholder(/search/i).fill(usernameB);
  263 |     const rowForB = pageA.locator('.user-card, .chat-row', { hasText: new RegExp(usernameB, 'i') }).first();
  264 |     
  265 |     // Avatar presence is displayed
  266 |     const defaultDot = rowForB.locator('.status-dot.online');
  267 |     await expect(defaultDot).toBeVisible();
  268 |     
  269 |     // Start DM
  270 |     await rowForB.click();
  271 |     await pageA.getByPlaceholder(/message/i).fill('hello context');
  272 |     await pageA.keyboard.press('Enter');
  273 |     
  274 |     // Wait for message sending overlay or something to navigate
  275 |     await expect(pageA).toHaveURL(/\/chat\//, { timeout: 10000 });
  276 |     
  277 |     // In Chat Header (typically sm)
  278 |     const headerAvatar = pageA.locator('header').locator('[class*="avatar"]');
  279 |     await expect(headerAvatar).toBeVisible();
  280 |     await expect(headerAvatar.locator('.status-dot.online')).toBeVisible();
  281 |     
  282 |     // Co-locate to chat list (typically md)
  283 |     await pageA.goto('/');
  284 |     const chatListAvatar = pageA.locator('.chat-row', { hasText: new RegExp(usernameB, 'i') }).first();
  285 |     await expect(chatListAvatar.locator('.status-dot.online')).toBeVisible();
  286 |     
  287 |     await contextA.close();
  288 |     await contextB.close();
  289 |   });
  290 | });
  291 | 
```