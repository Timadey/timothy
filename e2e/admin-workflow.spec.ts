import type { Page } from 'playwright/test';
import { ADMIN, expect, loginAsOwner, recordFinding, shot, test } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

async function readCard(page: Page, label: string): Promise<number> {
    const card = page.locator('a').filter({ hasText: label }).first();
    const value = (await card.locator('p').first().innerText()).trim();
    const parsed = parseInt(value.replace(/\D/g, ''), 10);
    expect(Number.isNaN(parsed), `dashboard card "${label}" had non-numeric value "${value}"`).toBe(false);
    return parsed;
}

test(
    'full article lifecycle: create, preview, publish, verify, edit, draft preview, logout, guest 404',
    { timeout: 180_000 },
    async ({ page, diagnostics }) => {
        await loginAsOwner(page);
        await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();

        const publishedBefore = await readCard(page, 'Published articles');
        const draftsBefore = await readCard(page, 'Drafts');
        await shot(page, 'admin-dashboard-desktop');

        const stamp = Date.now();
        const title = `QA Lifecycle ${stamp}`;

        await page.goto('/admin/posts/create');
        await expect(page.locator('h1', { hasText: 'New post' })).toBeVisible();
        await page.fill('#post-title', title);
        await page.fill('#post-excerpt', 'A QA-created article exercising the full publishing lifecycle.');
        const editorBody = page.locator('.ProseMirror');
        await editorBody.click();
        await page.keyboard.type('## QA Section Heading');
        await page.keyboard.press('Enter');
        await page.keyboard.type('This is **bold text** written by Playwright.');
        await page.keyboard.press('Enter');
        await page.keyboard.type('- item one');
        await page.keyboard.press('Enter');
        await page.keyboard.type('item two');

        await page.getByRole('button', { name: 'Preview', exact: true }).click();
        const pane = page.locator('article').filter({ hasText: 'QA Section Heading' }).first();
        await expect(pane.locator('h2', { hasText: 'QA Section Heading' })).toBeVisible();
        await expect(pane.locator('strong', { hasText: 'bold text' })).toBeVisible();
        await expect(pane.locator('h1', { hasText: title })).toBeVisible();
        await shot(page, 'post-editor-live-preview');

        await page.getByRole('button', { name: 'Edit', exact: true }).click();
        await expect(page.locator('#post-title')).toBeVisible();
        await page.selectOption('#post-status', 'published');
        await page.getByRole('button', { name: 'Save', exact: true }).click();

        await page.waitForURL(/\/admin\/posts\/\d+\/edit/);
        const postId = (page.url().match(/\/admin\/posts\/(\d+)\/edit/) ?? [])[1];
        expect(postId, 'created post id from URL').toBeTruthy();
        await expect(page.getByRole('status')).toContainText(/Post (created|updated)\./);

        await page.goto('/writing');
        const publicLink = page.locator('main article a', { hasText: title }).first();
        await expect(publicLink).toBeVisible();
        await publicLink.click();
        await page.waitForURL(/\/writing\/qa-lifecycle/);
        await expect(page.locator('main h1')).toHaveText(title);
        await expect(page.locator('main h2', { hasText: 'QA Section Heading' })).toBeVisible();
        await expect(page.locator('main strong', { hasText: 'bold text' })).toBeVisible();
        await shot(page, 'article-published-detail');

        await page.goto(`/admin/posts/${postId}/edit`);
        await expect(page.locator('#post-title')).toHaveValue(title);
        await expect(page.locator('#post-status')).toHaveValue('published');
        await expect(page.locator('#post-excerpt')).toHaveValue('A QA-created article exercising the full publishing lifecycle.');

        const editedLine = `Edited by QA at ${stamp}`;
        await editorBody.click();
        await page.keyboard.press('ControlOrMeta+End');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.keyboard.type(editedLine);
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();

        await page.reload();
        await expect(page.locator('.ProseMirror')).toContainText(/Edited by QA at/);
        await expect(page.locator('#post-title')).toHaveValue(title);
        await shot(page, 'admin-post-edit');

        await page.goto('/admin/posts/create');
        const draftTitle = `QA Draft ${stamp}`;
        await page.fill('#post-title', draftTitle);
        await editorBody.click();
        await page.keyboard.type('Secret draft body written by QA. Not public.');
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page.waitForURL(/\/admin\/posts\/\d+\/edit/);

        const [popup] = await Promise.all([
            page.waitForEvent('popup'),
            page.getByRole('link', { name: 'Open page' }).click(),
        ]);
        await popup.waitForURL(/\/writing\/.+preview=1/, { timeout: 20_000 });
        const draftPath = new URL(popup.url()).pathname;
        await expect(popup.getByText(/Preview \u2014 this article/)).toBeVisible();
        await expect(popup.getByText('Secret draft body written by QA. Not public.')).toBeVisible();
        await shot(popup, 'draft-preview-banner', false);
        await popup.close();

        await page.goto('/admin');
        expect(await readCard(page, 'Published articles')).toBe(publishedBefore + 1);
        expect(await readCard(page, 'Drafts')).toBe(draftsBefore + 1);

        await page.getByRole('button', { name: 'Sign out' }).click();
        await page.waitForURL((url) => url.pathname === '/admin/login');

        diagnostics.expect404(new RegExp(draftPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        const guestResponse = await page.goto(`${draftPath}?preview=1`);
        expect(guestResponse?.status(), 'guest draft preview must 404').toBe(404);
        await expect(page.locator('h1')).toHaveText(/This page doesn\u2019t exist/);
        await shot(page, 'draft-guest-404');
    },
);

test('create with empty title shows a field-level validation error', { timeout: 90_000 }, async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/admin/posts/create');

    await page.getByRole('button', { name: 'Save', exact: true }).click();

    const fieldError = page.locator('#post-title ~ p.text-red-700');
    await expect(fieldError).toBeVisible();
    await expect(fieldError).toContainText(/required/i);
    await expect(page).toHaveURL(/\/admin\/posts\/create/);
    await shot(page, 'admin-title-validation-error');
});

test(
    'admin sections render, sidebar navigates, mobile drawer works',
    { timeout: 120_000 },
    async ({ page }) => {
        await loginAsOwner(page);

        await page.locator('aside').getByRole('link', { name: 'Projects' }).click();
        await page.waitForURL((url) => url.pathname === '/admin/projects');
        await expect(page.locator('main h1')).toBeVisible();
        await shot(page, 'admin-projects');

        const sections: { path: string; name: string; expectsForm: boolean }[] = [
            { path: '/admin/notes', name: 'admin-notes', expectsForm: false },
            { path: '/admin/collected', name: 'admin-collected', expectsForm: false },
            { path: '/admin/now', name: 'admin-now', expectsForm: true },
            { path: '/admin/about', name: 'admin-about', expectsForm: true },
            { path: '/admin/social', name: 'admin-social', expectsForm: true },
            { path: '/admin/tags', name: 'admin-tags', expectsForm: true },
        ];

        for (const section of sections) {
            const response = await page.goto(section.path);
            expect(response?.status(), `${section.path} status`).toBe(200);
            await expect(page.locator('main h1')).toBeVisible();
            if (section.expectsForm) {
                expect(
                    await page.locator('main input, main textarea, main select').count(),
                    `${section.path} should render form fields`,
                ).toBeGreaterThan(0);
            }
            if (['admin-social', 'admin-tags', 'admin-collected'].includes(section.name)) {
                await shot(page, section.name);
            }
        }

        const sidebarTargets = await page.locator('aside a').count();
        expect(sidebarTargets).toBeGreaterThanOrEqual(10);

        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/admin');
        const toggle = page.locator('button[aria-label="Toggle menu"]');
        await expect(toggle).toBeVisible();
        await toggle.click();

        const drawerNav = page.locator('nav[aria-label="Admin"]:visible');
        await expect(drawerNav).toHaveCount(1);
        await shot(page, 'admin-mobile-drawer-375', false);

        await drawerNav.getByRole('link', { name: 'Tags & Topics' }).click();
        await page.waitForURL((url) => url.pathname === '/admin/tags');
        await expect(page.locator('nav[aria-label="Admin"]:visible')).toHaveCount(0);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(overflow, 'admin at 375px must not scroll horizontally').toBeLessThanOrEqual(376);
    },
);

test('login validation: native required fields and invalid credentials', async ({ page }) => {
    await page.goto('/admin/login');
    await page.click('button[type="submit"]');

    expect(await page.locator('input[type="email"]').evaluate((el) => el.matches(':invalid'))).toBe(true);
    expect(await page.locator('input[type="password"]').evaluate((el) => el.matches(':invalid'))).toBe(true);
    await expect(page).toHaveURL(/\/admin\/login/);
    await shot(page, 'login-validation-errors');

    await page.fill('input[type="email"]', ADMIN.email);
    await page.fill('input[type="password"]', 'definitely-wrong-password');
    await page.click('button[type="submit"]');

    const error = page.locator('form p.text-red-700');
    await expect(error).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
    await shot(page, 'login-invalid-credentials');

    recordFinding({
        id: 'login-invalid-credentials-message',
        severity: 'low',
        where: '/admin/login',
        detail: `Invalid credentials render as: "${(await error.innerText()).trim()}"`,
    });
});
