import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, loginAsOwner, shot, test } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

const TINY_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
);

function tmpPng(name: string): string {
    const dir = path.join(process.cwd(), 'qa', 'evidence', 'tmp');
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, name);
    writeFileSync(file, TINY_PNG);
    return file;
}

test('home renders statement hero, CTAs, favourites, writing list, and explore rows', async ({ page }) => {
    await page.goto('/');

    const h1 = page.locator('main h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText(/Timadey/);
    await shot(page, 'home-hero');

    await expect(page.locator('main').getByRole('link', { name: 'Ask me anything' })).toHaveAttribute('href', '/ask');
    await expect(page.locator('main').getByRole('link', { name: /Read what I/ })).toHaveAttribute('href', '/writing');

    await expect(page.getByRole('heading', { name: /A few favourites/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /been writing/i })).toBeVisible();
    await expect(page.locator('main').getByRole('link', { name: 'All writing' })).toHaveAttribute('href', '/writing');

    await expect(page.getByRole('heading', { name: /More to explore/i })).toBeVisible();
    await expect(page.locator('main').getByRole('link', { name: /Projects/ })).toHaveAttribute('href', '/projects');
    await expect(page.locator('main').getByRole('link', { name: /Collected/ })).toHaveAttribute('href', '/collected');
    await expect(page.locator('main').getByRole('link', { name: /Activity/ })).toHaveAttribute('href', '/activity');
});

test('activity page renders the aggregated feed under Lately', async ({ page }) => {
    const response = await page.goto('/activity');
    expect(response?.status(), 'activity status').toBe(200);

    await expect(page.locator('main h1')).toHaveText('Lately');
    await shot(page, 'activity');
});

test('owner can edit hero fields, upload an avatar, and see it on home', async ({ page }) => {
    const headline = `E2E hero ${Date.now()}`;

    await loginAsOwner(page);
    await page.goto('/admin/settings');

    await page.getByLabel('Headline').fill(headline);
    await page.getByLabel('Status line').fill('E2E status line');
    await page.getByLabel('Avatar', { exact: true }).setInputFiles(tmpPng('e2e-avatar.png'));
    await page.getByRole('button', { name: 'Save home' }).click();
    await expect(page.getByText('Settings saved.')).toBeVisible();

    await page.goto('/');
    await expect(page.locator('main h1')).toHaveText(headline);
    await expect(page.getByText('E2E status line')).toBeVisible();
    const avatar = page.locator('main img[src*="/storage/hero/"]').first();
    await expect(avatar).toBeVisible();
    await shot(page, 'home-hero-avatar');

    await page.goto('/admin/settings');
    await page.getByLabel('Remove current avatar').check();
    await page.getByRole('button', { name: 'Save home' }).click();
    await expect(page.getByText('Settings saved.')).toBeVisible();
    await page.getByLabel('Headline').fill("Hey, I’m Timadey.");
    await page.getByLabel('Status line').fill('');
    await page.getByRole('button', { name: 'Save home' }).click();
    await expect(page.getByText('Settings saved.')).toBeVisible();
});

test('admin hero upload rejects a non-image file', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/admin/settings');

    const dir = path.join(process.cwd(), 'qa', 'evidence', 'tmp');
    mkdirSync(dir, { recursive: true });
    const notImage = path.join(dir, 'e2e-doc.pdf');
    writeFileSync(notImage, '%PDF-1.4 not an image');

    await page.getByLabel('Avatar', { exact: true }).setInputFiles(notImage);
    await page.getByRole('button', { name: 'Save home' }).click();
    await expect(page.getByText(/hero avatar/i).first()).toBeVisible();
});
