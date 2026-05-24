import { test, expect, type Page } from '@playwright/test';
import { registerUser, createUserViaApi, installSession, openDmWithUser } from './utils';

const SCREENSHOT_DIR = 'e2e/screenshots';

interface AuditIssue {
	page: string;
	severity: 'critical' | 'warning' | 'nit';
	type: string;
	message: string;
	selector?: string;
}

const issues: AuditIssue[] = [];

function recordIssue(page: string, severity: AuditIssue['severity'], type: string, message: string, selector?: string) {
	issues.push({ page, severity, type, message, selector });
}

async function checkHorizontalOverflow(page: Page, pageName: string) {
	const hasOverflow = await page.evaluate(() => {
		return document.documentElement.scrollWidth > window.innerWidth;
	});
	if (hasOverflow) {
		recordIssue(pageName, 'critical', 'overflow', `Horizontal overflow detected: scrollWidth(${await page.evaluate(() => document.documentElement.scrollWidth)}) > innerWidth(${await page.evaluate(() => window.innerWidth)})`);
	}
}

async function checkTouchTargets(page: Page, pageName: string) {
	const smallTargets = await page.evaluate(() => {
		const interactive = Array.from(document.querySelectorAll('button, a, input, textarea, select, [role="button"], [onclick]'));
		return interactive
			.filter((el) => {
				const rect = el.getBoundingClientRect();
				const style = window.getComputedStyle(el);
				// Skip hidden elements (display:none, visibility:hidden, or inside hidden parent)
				if (style.display === 'none' || style.visibility === 'hidden') return false;
				if (rect.width === 0 || rect.height === 0) return false;
				// Skip elements inside aria-hidden containers (like hidden desktop panes)
				let parent = el.parentElement;
				while (parent) {
					if (parent.getAttribute('aria-hidden') === 'true') return false;
					const parentStyle = window.getComputedStyle(parent);
					if (parentStyle.display === 'none') return false;
					parent = parent.parentElement;
				}
				return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
			})
			.map((el) => ({
				tag: el.tagName,
				class: el.className.slice(0, 60),
				width: el.getBoundingClientRect().width,
				height: el.getBoundingClientRect().height,
				text: (el.textContent || '').slice(0, 40),
				ariaLabel: el.getAttribute('aria-label') || ''
			}))
			.slice(0, 20);
	});
	for (const target of smallTargets) {
		recordIssue(pageName, 'warning', 'touch-target', `Touch target too small: ${target.tag} ${target.ariaLabel || target.text || target.class} (${target.width.toFixed(1)}×${target.height.toFixed(1)}px)`);
	}
}

async function checkTinyFonts(page: Page, pageName: string) {
	const tinyText = await page.evaluate(() => {
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
		const results: { text: string; fontSize: string; parent: string }[] = [];
		let node: Text | null;
		while ((node = walker.nextNode() as Text | null)) {
			if (!node.textContent?.trim()) continue;
			const parent = node.parentElement;
			if (!parent) continue;
			const style = window.getComputedStyle(parent);
			const size = parseFloat(style.fontSize);
			if (size > 0 && size < 12) {
				results.push({
					text: node.textContent.trim().slice(0, 40),
					fontSize: style.fontSize,
					parent: parent.tagName + (parent.className ? '.' + parent.className.slice(0, 40) : '')
				});
			}
			if (results.length >= 15) break;
		}
		return results;
	});
	for (const item of tinyText) {
		recordIssue(pageName, 'warning', 'font-size', `Tiny text detected: "${item.text}" at ${item.fontSize} in ${item.parent}`);
	}
}

async function auditPage(page: Page, pageName: string, screenshotName: string) {
	await page.waitForLoadState('networkidle');
	// Allow view transitions / animations to settle before measuring
	await page.waitForTimeout(400);
	// Measure layout BEFORE screenshot — fullPage screenshots can trigger
	// scroll events that break flex layouts, giving false positives.
	await checkHorizontalOverflow(page, pageName);
	await checkTouchTargets(page, pageName);
	await checkTinyFonts(page, pageName);
	await page.screenshot({ path: `${SCREENSHOT_DIR}/${screenshotName}.png`, fullPage: true });
}

// ─── Auth page (signed out) ───────────────────────────────────────────

test.describe('Responsive Audit — Auth', () => {
	test('auth page layout', async ({ page }) => {
		await page.goto('/auth');
		await auditPage(page, 'auth', '01-auth');
	});
});

// ─── Welcome page (signed out) ────────────────────────────────────────

test.describe('Responsive Audit — Welcome', () => {
	test('welcome page layout', async ({ page }) => {
		await page.goto('/welcome');
		await auditPage(page, 'welcome', '02-welcome');
	});
});

// ─── Authenticated pages ──────────────────────────────────────────────

test.describe('Responsive Audit — Authenticated', () => {
	test('home chat list', async ({ page, browser }) => {
		const user = `resp_home_${Date.now()}`;
		await registerUser(page, user);
		await auditPage(page, 'home', '03-home');

		// Also check BottomNav is visible and doesn't cause overlap
		const bottomNav = page.locator('.bottom-nav');
		await expect(bottomNav).toBeVisible();
		const navBox = await bottomNav.boundingBox();
		if (navBox && navBox.height > 0) {
			const viewportH = await page.evaluate(() => window.innerHeight);
			if (navBox.y + navBox.height > viewportH + 2) {
				recordIssue('home', 'critical', 'layout', `BottomNav extends below viewport: bottom at ${navBox.y + navBox.height}, viewport height ${viewportH}`);
			}
		}
	});

	test('chat thread', async ({ page, browser }) => {
		const ts = Date.now();
		const userA = `resp_chat_a_${ts}`;
		const userB = `resp_chat_b_${ts}`;

		// Create both users and establish a DM
		const ctxA = await browser.newContext();
		const pageA = await ctxA.newPage();
		await registerUser(pageA, userA);

		const sessionB = await createUserViaApi(page, userB);
		await installSession(page, sessionB);

		const chatId = await openDmWithUser(pageA, userB);
		await page.goto(`/chat/${chatId}`);
		await page.waitForURL(/\/chat\//, { timeout: 10000 });

		// Send some messages to populate the thread
		await pageA.getByPlaceholder(/^Message/).fill('Hello this is a test message');
		await pageA.getByRole('button', { name: 'Send message' }).click();
		await pageA.getByPlaceholder(/^Message/).fill('Another message with some content that wraps nicely on mobile screens');
		await pageA.getByRole('button', { name: 'Send message' }).click();

		// Wait for messages to appear on page B
		await expect(page.locator('.msg:not(.own)', { hasText: 'Hello this is a test message' })).toBeVisible({ timeout: 8000 });

		await auditPage(page, 'chat-thread', '04-chat-thread');

		// Check composer is visible and above bottom nav
		const composer = page.locator('.composer-shell');
		await expect(composer).toBeVisible();
		const composerBox = await composer.boundingBox();
		if (composerBox) {
			const viewportH = await page.evaluate(() => window.innerHeight);
			if (composerBox.y + composerBox.height > viewportH + 2) {
				recordIssue('chat-thread', 'critical', 'layout', `Composer extends below viewport`);
			}
		}

		// Test message actions menu visibility
		const msg = page.locator('.msg:not(.own)', { hasText: 'Hello this is a test message' }).first();
		await msg.hover();
		await msg.locator('button[aria-label="More"]').click();
		const menu = page.locator('.menu').first();
		await expect(menu).toBeVisible();
		const menuBox = await menu.boundingBox();
		if (menuBox) {
			const viewportW = await page.evaluate(() => window.innerWidth);
			const viewportH = await page.evaluate(() => window.innerHeight);
			if (menuBox.x + menuBox.width > viewportW + 2 || menuBox.y + menuBox.height > viewportH + 2) {
				recordIssue('chat-thread', 'critical', 'overflow', `Message actions menu overflows viewport: ${menuBox.x},${menuBox.y} ${menuBox.width}×${menuBox.height} in ${viewportW}×${viewportH}`);
			}
		}
		await page.keyboard.press('Escape');

		// Test emoji picker / unified picker
		await page.getByRole('button', { name: 'Open media picker' }).click();
		const picker = page.locator('.picker-popup').first();
		await expect(picker).toBeVisible();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/04-chat-picker.png`, fullPage: false });
		await page.keyboard.press('Escape');

		await ctxA.close();
	});

	test('users directory', async ({ page }) => {
		const user = `resp_users_${Date.now()}`;
		await registerUser(page, user);
		await page.goto('/users');
		await auditPage(page, 'users-list', '05-users-list');

		// Click a user to open detail view on mobile
		const firstUser = page.locator('.user-row').first();
		if (await firstUser.count() > 0) {
			await firstUser.click();
			await page.waitForTimeout(500);
			await page.screenshot({ path: `${SCREENSHOT_DIR}/05-users-detail.png`, fullPage: true });

			// Check mobile back button is visible
			const backBtn = page.locator('.mobile-back');
			if (await backBtn.count() > 0) {
				await expect(backBtn).toBeVisible();
			}
		}
	});

	test('settings page', async ({ page }) => {
		const user = `resp_settings_${Date.now()}`;
		await registerUser(page, user);
		await page.goto('/settings');
		await auditPage(page, 'settings', '06-settings');

		// Scroll to bottom to check all sections
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await page.waitForTimeout(300);
		await page.screenshot({ path: `${SCREENSHOT_DIR}/06-settings-bottom.png`, fullPage: true });
	});
});

// ─── Final report ─────────────────────────────────────────────────────

test.describe('Responsive Audit — Report', () => {
	test('print audit report', async () => {
		console.log('\n=== MOBILE RESPONSIVE AUDIT REPORT ===\n');
		if (issues.length === 0) {
			console.log('✅ No responsive issues detected!');
		} else {
			const critical = issues.filter((i) => i.severity === 'critical');
			const warnings = issues.filter((i) => i.severity === 'warning');
			const nits = issues.filter((i) => i.severity === 'nit');

			console.log(`Found ${issues.length} issues:`);
			console.log(`  Critical: ${critical.length}`);
			console.log(`  Warnings: ${warnings.length}`);
			console.log(`  Nits:     ${nits.length}\n`);

			for (const issue of issues) {
				const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '⚪';
				console.log(`${icon} [${issue.page}] ${issue.type}: ${issue.message}`);
			}
		}
		console.log('\n=======================================\n');
		expect(issues.filter((i) => i.severity === 'critical')).toHaveLength(0);
	});
});
