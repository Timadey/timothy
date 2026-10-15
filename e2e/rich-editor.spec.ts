import { expect, loginAsOwner, test } from './fixtures';

const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
);

test.use({ viewport: { width: 1440, height: 900 } });

test(
    'rich editor: heading select, bubble bold, image upload, public render',
    { timeout: 180_000 },
    async ({ page }) => {
        await loginAsOwner(page);

        const stamp = Date.now();
        const title = `QA Rich ${stamp}`;
        const slug = `qa-rich-${stamp}`;

        await page.goto('/admin/posts/create');
        await expect(page.locator('h1', { hasText: 'New post' })).toBeVisible();
        await page.fill('#post-title', title);
        await page.fill('#post-excerpt', 'A QA-created article exercising the rich editor.');

        const editor = page.locator('.ProseMirror');
        await editor.click();

        await page.keyboard.type('Rich heading worth reading');
        await page.keyboard.press('ControlOrMeta+a');
        await page.getByLabel('Text style').selectOption('h2');

        await editor.click();
        await page.keyboard.press('ControlOrMeta+ArrowRight');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Say bold');
        for (let i = 0; i < 4; i += 1) {
            await page.keyboard.press('Shift+ArrowLeft');
        }
        const boldButton = page.getByLabel('Bold');
        await expect(boldButton).toBeVisible();
        await boldButton.click();
        await expect(editor.locator('strong', { hasText: 'bold' })).toBeVisible();

        // Click the far end of the line (clear of the floating bubble menu). The
        // bubble hides only once ProseMirror's state has the collapsed caret, so
        // waiting for it to disappear guarantees the following Enter splits from
        // fresh state instead of racing the async selectionchange sync (which
        // used to delete the selected word under load).
        const boldLine = editor.locator('p', { hasText: 'Say bold' });
        const boldLineBox = await boldLine.boundingBox();
        if (!boldLineBox) throw new Error('bold line not visible');
        await boldLine.click({ position: { x: boldLineBox.width - 20, y: 10 } });
        await expect(boldButton).toBeHidden();
        await page.keyboard.press('Enter');
        await expect(editor.locator('p strong', { hasText: 'bold' })).toBeVisible();
        await page.keyboard.type('A photo follows.');

        await page.setInputFiles('[aria-label="Image file"]', {
            name: 'qa-photo.png',
            mimeType: 'image/png',
            buffer: PNG,
        });
        const image = editor.locator('img[src^="/storage/uploads/"]');
        await expect(image).toBeAttached({ timeout: 20_000 });

        await page.selectOption('#post-status', 'published');
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page.waitForURL(/\/admin\/posts\/\d+\/edit/);

        await page.goto(`/writing/${slug}`);
        await expect(page.locator('main h1')).toHaveText(title);
        await expect(page.locator('main h2', { hasText: 'Rich heading worth reading' })).toBeVisible();
        await expect(page.locator('main strong', { hasText: 'bold' })).toBeVisible();
        await expect(page.locator('main p', { hasText: 'A photo follows.' })).toBeVisible();
        await expect(page.locator('main img[src^="/storage/uploads/"]')).toBeVisible();
    },
);
