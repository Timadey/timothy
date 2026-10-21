import type { Page } from 'playwright/test';
import {
    discoverFirstHref,
    expect,
    expectNoHorizontalOverflow,
    recordFinding,
    shot,
    test,
    writeMetric,
} from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

type PublicPage = { path: string; slug: string; h1: string | RegExp };

const PUBLIC_PAGES: PublicPage[] = [
    { path: '/', slug: 'home', h1: /Hey, I\u2019m Timadey/ },
    { path: '/writing', slug: 'writing', h1: 'Writing' },
    { path: '/notes', slug: 'notes', h1: 'Notes' },
    { path: '/projects', slug: 'projects', h1: 'Projects' },
    { path: '/collected', slug: 'collected', h1: 'Collected' },
    { path: '/activity', slug: 'activity', h1: 'Lately' },
    { path: '/about', slug: 'about', h1: 'About' },
    { path: '/now', slug: 'now', h1: 'Now' },
    { path: '/ask', slug: 'ask', h1: 'Ask Timadey' },
    { path: '/search', slug: 'search', h1: 'Search' },
];

for (const publicPage of PUBLIC_PAGES) {
    test(`${publicPage.path} renders at 1440px`, async ({ page }) => {
        const response = await page.goto(publicPage.path);
        expect(response?.status(), `${publicPage.path} status`).toBe(200);

        const h1 = page.locator('main h1');
        await expect(h1, `${publicPage.path} h1 count`).toHaveCount(1);
        await expect(h1).toBeVisible();
        await expect(h1).toHaveText(publicPage.h1);

        await expect(page.locator('header')).toBeVisible();
        await expect(page.locator('header nav[aria-label="Primary"]')).toBeVisible();

        await expectNoHorizontalOverflow(page, 1440);
        await shot(page, `${publicPage.slug}-desktop-1440`);
    });
}

test('published article detail renders at 1440px', async ({ page }) => {
    const href = await discoverFirstHref(page, '/writing', '/writing/');
    const response = await page.goto(href);
    expect(response?.status(), 'article detail status').toBe(200);

    const h1 = page.locator('main h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();

    const prose = page.locator('main article .prose-custom');
    await expect(prose).toBeVisible();
    const proseText = (await prose.innerText()).trim();
    expect(proseText.length, 'article body prose is nearly empty').toBeGreaterThan(50);

    await expect(page.locator('header nav[aria-label="Primary"]')).toBeVisible();
    await expectNoHorizontalOverflow(page, 1440);
    await shot(page, 'article-desktop-1440');
});

test('note detail renders at 1440px', async ({ page }) => {
    // The /notes feed intentionally has no permalink links; discover one from the activity feed.
    const href = await discoverFirstHref(page, '/activity', '/notes/');
    const response = await page.goto(href);
    expect(response?.status(), 'note detail status').toBe(200);

    const h1 = page.locator('main h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(page.locator('header nav[aria-label="Primary"]')).toBeVisible();
    await expectNoHorizontalOverflow(page, 1440);
    await shot(page, 'note-desktop-1440');
});

test('project detail renders at 1440px', async ({ page }) => {
    const href = await discoverFirstHref(page, '/projects', '/projects/');
    const response = await page.goto(href);
    expect(response?.status(), 'project detail status').toBe(200);

    const h1 = page.locator('main h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(page.locator('header nav[aria-label="Primary"]')).toBeVisible();
    await expectNoHorizontalOverflow(page, 1440);
    await shot(page, 'project-desktop-1440');
});

test('editorial 404 page renders with working navigation', async ({ page, diagnostics }) => {
    diagnostics.expect404(/definitely-missing/);
    const response = await page.goto('/definitely-missing');
    expect(response?.status(), 'missing route status').toBe(404);

    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/This page doesn\u2019t exist/);
    await expect(page.locator('main nav a')).toHaveCount(2);
    await expectNoHorizontalOverflow(page, 1440);
    await shot(page, '404-page');

    await page.getByRole('link', { name: 'Back home' }).click();
    await page.waitForURL((url) => url.pathname === '/');
    await expect(page.locator('main h1')).toHaveText(/Hey, I\u2019m Timadey/);
});

async function collectHead(page: Page): Promise<{
    title: string;
    description: string | null;
    canonical: string | null;
    ogTitle: string | null;
    twitterCard: string | null;
}> {
    return page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
        ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? null,
        twitterCard: document.querySelector('meta[name="twitter:card"]')?.getAttribute('content') ?? null,
    }));
}

test('head metadata on home and article', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title, 'home title').toContain('Timadey');
    const homeHead = await collectHead(page);

    const homeChecks: Record<string, string | null> = {
        canonical: homeHead.canonical,
        ogTitle: homeHead.ogTitle,
        twitterCard: homeHead.twitterCard,
    };
    for (const [tag, value] of Object.entries(homeChecks)) {
        if (!value) {
            recordFinding({
                id: `home-missing-${tag}`,
                severity: 'low',
                where: '/',
                detail: `<head> on home has no ${tag} tag (SEO/social preview gap).`,
                evidence: ['qa/evidence/head-metadata.json'],
            });
        }
    }

    const articlePath = await discoverFirstHref(page, '/writing', '/writing/');
    await page.goto(articlePath);
    const articleHead = await collectHead(page);

    expect(articleHead.title.length).toBeGreaterThan(0);
    expect(articleHead.title).toContain('\u2014 Timadey');
    expect(articleHead.canonical, 'article canonical').toBeTruthy();
    expect(articleHead.canonical).toContain('/writing/');
    expect(articleHead.ogTitle, 'article og:title').toBeTruthy();
    expect(articleHead.twitterCard, 'article twitter:card').toBe('summary');
    expect(articleHead.description, 'article description').toBeTruthy();

    writeMetric('head-metadata.json', 'home', homeHead);
    writeMetric('head-metadata.json', 'article', { path: articlePath, ...articleHead });
});
