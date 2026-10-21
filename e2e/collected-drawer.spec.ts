import { expect, shot, test } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

test('drawer: category tiles deep-link into category pages', async ({ page }) => {
    await page.goto('/collected');
    await expect(page.getByRole('heading', { level: 1, name: 'Collected' })).toBeVisible();

    const booksTile = page.getByRole('link', { name: /^Books, \d+ items$/ });
    await expect(booksTile).toHaveAttribute('href', '/collected/books');
    await booksTile.click();
    await page.waitForURL(/\/collected\/books$/);

    await expect(page.getByRole('heading', { level: 1, name: 'Books' })).toBeVisible();
    await expect(page.getByText(/^[1-9]\d* items?$/)).toBeVisible();
    await shot(page, 'collected-books');
});

test('drawer: back link returns to the drawer', async ({ page }) => {
    await page.goto('/collected/books');
    await page.getByRole('link', { name: 'Back to Collected' }).click();
    await page.waitForURL(/\/collected$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Collected' })).toBeVisible();
});

test('category: annotated item opens the detail modal with backdrop blur', async ({ page }) => {
    await page.goto('/collected/books');
    const trigger = page.getByRole('button', { name: /Thinking in Systems|Design of Everyday Things/ }).first();
    await trigger.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.locator('.backdrop-blur-md')).toBeVisible();
    await expect(dialog.getByRole('heading')).toBeVisible();
    await shot(page, 'collected-item-modal', false);

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
});

test('category: tag chip filters the list', async ({ page }) => {
    await page.goto('/collected/books');
    const nav = page.getByRole('navigation', { name: 'Filter by tag' });
    await expect(nav).toBeVisible();

    const tagLink = nav.locator('a').filter({ hasNotText: 'All' }).first();
    const tagName = (await tagLink.textContent())?.trim();
    expect(tagName).toBeTruthy();

    await tagLink.click();
    await page.waitForURL(/tag=/);
    await expect(nav.locator('a').filter({ hasText: tagName as string }).first()).toHaveClass(/bg-primary/);

    const rows = page.locator('main article, main ul li');
    expect(await rows.count()).toBeGreaterThan(0);
    await shot(page, 'collected-tag-filtered');
});

test('drawer: spotlight search filters only the drawer', async ({ page }) => {
    await page.goto('/collected');
    await page.getByPlaceholder('Search collection').fill('systems');
    await page.waitForURL(/q=systems/);

    await expect(page.getByText(/\d+ results? for/)).toBeVisible();
    await expect(page.getByRole('link', { name: /^Books, \d+ items$/ })).toBeVisible();
    await shot(page, 'collected-search');
});

test('category: unknown segment returns 404', async ({ page, diagnostics }) => {
    diagnostics.expect404(/\/collected\/nope/);
    const response = await page.goto('/collected/nope');
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText(/This page doesn’t exist/);
});

test('category: tag with no matches renders the empty state', async ({ page }) => {
    await page.goto('/collected/books?tag=zxqjkwvptyy9876');
    await expect(page.getByText('Nothing here yet')).toBeVisible();
    await shot(page, 'collected-empty-tag');
});

test('category: finder tools view selects with keyboard and opens', async ({ page }) => {
    await page.goto('/collected/tools');
    const listbox = page.getByRole('listbox', { name: 'Tools' });
    await expect(listbox).toBeVisible();

    await listbox.click();
    await page.keyboard.press('ArrowRight');
    await expect(listbox).toHaveAttribute('aria-activedescendant', /tool-opt-/);

    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await shot(page, 'collected-tools');
});
