import { expect, loginAsOwner, shot, test } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

const LONG_BODY =
    `Quick note from the FAB drawer — shipping the breeze composer today. `.repeat(5) +
    'More than two hundred eighty characters so the stream truncates it.';

test('FAB drawer composes and publishes a note that appears in the public stream', async ({ page }) => {
    const stamp = Date.now();
    const body = `Drawer note ${stamp}: ${LONG_BODY}`;

    await loginAsOwner(page);
    await page.goto('/admin');

    await page.getByRole('button', { name: 'Quick post' }).click();
    const dialog = page.getByRole('dialog', { name: 'Quick post' });
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("What's on your mind?").fill(body);
    await shot(page, 'admin-quick-note-drawer');

    await dialog.getByRole('button', { name: 'Publish' }).click();
    await page.waitForURL((url) => url.pathname === '/admin/notes');
    await expect(page.getByText('Note saved.')).toBeVisible();
    await expect(dialog).toHaveCount(0);

    await page.goto('/notes');
    const row = page.locator('main article').filter({ hasText: `Drawer note ${stamp}` });
    await expect(row).toBeVisible();
    await shot(page, 'notes-stream-truncated');

    await row.getByRole('link').first().click();
    await page.waitForURL((url) => url.pathname.startsWith('/notes/drawer-note-'));
    await expect(page.getByText('More than two hundred eighty characters so the stream truncates it.')).toBeVisible();
});

test('full page composer publishes from /admin/notes/new', async ({ page }) => {
    const stamp = Date.now();
    const body = `Full page note ${stamp}: written from the composer with no title at all.`;

    await loginAsOwner(page);
    await page.goto('/admin/notes/new');
    await expect(page.locator('h1', { hasText: 'New note' })).toBeVisible();

    await page.fill('#note-body', body);
    await page.getByRole('button', { name: 'Publish' }).click();
    await page.waitForURL((url) => url.pathname === '/admin/notes');
    await expect(page.getByText('Note saved.')).toBeVisible();
    await expect(page.getByText(`Full page note ${stamp}`)).toBeVisible();
});

test('notes admin list opens a note in the composer for editing', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/admin/notes');
    await expect(page.locator('main h1')).toHaveText('Notes');

    await page.getByRole('link', { name: 'Edit' }).first().click();
    await page.waitForURL((url) => /\/admin\/notes\/\d+\/edit/.test(url.pathname));
    await expect(page.locator('#note-body')).not.toHaveValue('');
});
