import { test, expect, type Page } from '@playwright/test';
import { registerUser } from './utils';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function enterGeneralChat(page: Page) {
	await expect(async () => {
		await page.getByRole('button', { name: 'Open chat General' }).click();
		await expect(page).toHaveURL(/\/chat\/.+/, { timeout: 1000 });
	}).toPass({ timeout: 5000 });
}

test.describe('Media Upload', () => {
	test('user can upload an image to a chat', async ({ page }) => {
		const username = `img_${Date.now()}`;
		await registerUser(page, username);
		await enterGeneralChat(page);

		const [fileChooser] = await Promise.all([
			page.waitForEvent('filechooser'),
			page.getByRole('button', { name: 'Attach media' }).click()
		]);
		await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'test-image.png'));

		await expect(page.locator('.file-preview .preview-img')).toBeVisible({ timeout: 3000 });
		await page.getByRole('button', { name: 'Send message' }).click();

		// Optimistic message appears immediately
		await expect(page.locator('.msg.own')).toBeVisible({ timeout: 10000 });
		await expect(page.locator('.msg.own .media-image')).toBeAttached({ timeout: 5000 });

		// Reload to get hydrated message with signed media URL
		await page.reload();
		await expect(page.locator('.msg.own .media-image')).toBeVisible({ timeout: 10000 });
	});

	test('user can upload a video to a chat', async ({ page }) => {
		const username = `vid_${Date.now()}`;
		await registerUser(page, username);
		await enterGeneralChat(page);

		const [fileChooser] = await Promise.all([
			page.waitForEvent('filechooser'),
			page.getByRole('button', { name: 'Attach media' }).click()
		]);
		await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'test-video.mp4'));

		await expect(page.locator('.file-preview .file-name')).toBeVisible({ timeout: 3000 });
		await page.getByRole('button', { name: 'Send message' }).click();

		const video = page.locator('.msg.own .media-video');
		await expect(video).toBeVisible({ timeout: 10000 });
		await expect(video).toHaveAttribute('controls');
	});
});
