import { expect, shot, test } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

test('search: seeded keyword returns results via debounced router.get', async ({ page }) => {
    await page.goto('/search');
    await page.getByPlaceholder('Search writing, notes, projects\u2026').fill('demo');
    await page.waitForURL(/q=demo/);

    const items = page.locator('main ul li');
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(0);
    await expect(page.getByText(/\d+ results?/)).toBeVisible();
    await shot(page, 'search-results');
});

test('search: type chip narrows the result list', async ({ page }) => {
    await page.goto('/search?q=demo');
    const items = page.locator('main ul li');
    await expect(items.first()).toBeVisible();
    const before = await items.count();

    await page.getByRole('button', { name: 'Articles', exact: true }).click();
    await page.waitForURL(/type=article/);

    const after = await items.count();
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThanOrEqual(before);
    for (let index = 0; index < after; index += 1) {
        await expect(items.nth(index).locator('span').first()).toHaveText('Article');
    }
});

test('search: garbage query renders the empty state', async ({ page }) => {
    await page.goto('/search');
    await page.getByPlaceholder('Search writing, notes, projects\u2026').fill('zxqjkwvptyy9876');
    await page.waitForURL(/q=zxqjkwvptyy9876/);

    await expect(page.getByText(/No results for/)).toBeVisible();
    await expect(page.locator('main ul li')).toHaveCount(0);
    await shot(page, 'search-empty-state');
});

test('writing: topic chip filters the archive and history works', async ({ page }) => {
    await page.goto('/writing');
    const rows = page.locator('main article');
    await expect(rows.first()).toBeVisible();
    const before = await rows.count();
    expect(before, 'seeded articles should be listed').toBeGreaterThanOrEqual(2);

    await page.getByRole('button', { name: 'Technology', exact: true }).click();
    await page.waitForURL(/topic=technology/);

    const filtered = await rows.count();
    expect(filtered, 'technology filter should return articles').toBeGreaterThanOrEqual(2);
    expect(filtered).toBeLessThanOrEqual(before);
    for (let index = 0; index < filtered; index += 1) {
        await expect(rows.nth(index)).toContainText('Technology');
    }
    await shot(page, 'writing-topic-filtered');

    await page.goBack();
    await page.waitForURL((url) => !url.searchParams.has('topic'));
    expect(await rows.count(), 'back should restore the unfiltered archive').toBe(before);

    await page.goForward();
    await page.waitForURL(/topic=technology/);
    expect(await rows.count(), 'forward should re-apply the topic filter').toBe(filtered);
});

test('notes: tag chip filters the archive', async ({ page }) => {
    await page.goto('/notes');
    const rows = page.locator('main article');
    await expect(rows.first()).toBeVisible();
    const before = await rows.count();
    expect(before).toBeGreaterThanOrEqual(3);

    await page.getByRole('button', { name: 'writing', exact: true }).click();
    await page.waitForURL(/tag=writing/);

    const filtered = await rows.count();
    expect(filtered).toBeGreaterThanOrEqual(1);
    expect(filtered).toBeLessThan(before);
    for (let index = 0; index < filtered; index += 1) {
        await expect(rows.nth(index)).toContainText('writing');
    }
    await shot(page, 'notes-tag-filtered');
});

test('writing: search input applies the q filter to the archive', async ({ page }) => {
    await page.goto('/writing');
    const rows = page.locator('main article');
    await expect(rows.first()).toBeVisible();
    const before = await rows.count();

    await page.getByPlaceholder('Search writing').fill('personal');
    await page.waitForTimeout(1200);

    expect(new URL(page.url()).searchParams.get('q'), 'typing should update ?q= in the URL').toBe('personal');
    const after = await rows.count();
    expect(after, 'typing should narrow the visible list').toBeLessThan(before);
});
