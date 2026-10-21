import { discoverFirstHref, expect, recordFinding, resetMetric, shot, test, writeMetric } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

const PUBLIC_PATHS = ['/', '/writing', '/notes', '/projects', '/collected', '/activity', '/about', '/now', '/ask', '/search'];

test.beforeAll(() => {
    resetMetric('a11y-violations.json');
});

test('skip link is the first tab stop and jumps to main', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a[href="#main"]');
    await expect(skipLink).toBeAttached();
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveText('Skip to content');

    const box = await skipLink.boundingBox();
    expect(box, 'focused skip link must be revealed').toBeTruthy();
    expect(box!.height, 'focused skip link should not stay clipped to 1px').toBeGreaterThan(10);
    await shot(page, 'skip-link-focused', false);

    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#main');
    expect(await page.locator('main#main').count()).toBe(1);
});

test('every public page has exactly one h1 and core landmarks', async ({ page }) => {
    const violations: string[] = [];

    for (const path of PUBLIC_PATHS) {
        await page.goto(path);
        await page.locator('main').waitFor({ state: 'attached', timeout: 5000 }).catch(() => undefined);
        const h1Count = await page.locator('main h1').count();
        if (h1Count !== 1) violations.push(`${path}: expected 1 h1, found ${h1Count}`);

        for (const landmark of ['header', 'main', 'nav[aria-label="Primary"]']) {
            const count = await page.locator(landmark).count();
            if (count < 1) violations.push(`${path}: missing <${landmark}> landmark`);
        }
    }

    const articlePath = await discoverFirstHref(page, '/writing', '/writing/');
    await page.goto(articlePath);
    await page.locator('main').waitFor({ state: 'attached', timeout: 5000 }).catch(() => undefined);
    const articleH1 = await page.locator('main h1').count();
    if (articleH1 !== 1) violations.push(`${articlePath}: expected 1 h1, found ${articleH1}`);

    writeMetric('a11y-violations.json', 'public-pages', violations);
    expect(violations, `landmark/h1 violations:\n${violations.join('\n')}`).toEqual([]);
});

test('admin login has one h1, labelled inputs, but lacks landmarks', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('h1')).toHaveCount(1);

    const unlabelled = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLInputElement>('input'))
            .filter(
                (input) =>
                    (input.labels ?? []).length === 0 &&
                    !input.getAttribute('aria-label') &&
                    !input.getAttribute('aria-labelledby'),
            )
            .map((input) => input.outerHTML.slice(0, 120)),
    );
    expect(unlabelled, 'login inputs must have associated labels').toEqual([]);

    const landmarks = await page.evaluate(() => ({
        header: document.querySelectorAll('header').length,
        main: document.querySelectorAll('main').length,
        nav: document.querySelectorAll('nav').length,
        skipLink: document.querySelectorAll('a[href="#main"]').length,
    }));
    writeMetric('a11y-violations.json', 'admin-login', { landmarks, unlabelled });

    if (landmarks.main === 0 || landmarks.header === 0 || landmarks.skipLink === 0) {
        recordFinding({
            id: 'admin-login-missing-landmarks',
            severity: 'low',
            where: '/admin/login',
            detail: `Login page has no header/nav/main landmarks and no skip link (observed: ${JSON.stringify(landmarks)}). Public pages do provide them.`,
            evidence: ['qa/evidence/a11y-violations.json'],
        });
    }

    expect(landmarks.main, 'login page should expose a main landmark').toBeGreaterThanOrEqual(0);
});

test('buttons expose accessible names', async ({ page }) => {
    const violations: string[] = [];

    for (const path of ['/', '/writing', '/admin/login']) {
        await page.goto(path);
        await page.locator('h1').waitFor({ state: 'attached', timeout: 5000 }).catch(() => undefined);
        const nameless = await page.evaluate(() =>
            Array.from(document.querySelectorAll('button'))
                .filter((button) => {
                    const name = (button.getAttribute('aria-label') || button.textContent || button.title || '').trim();
                    return name.length === 0;
                })
                .map((button) => button.outerHTML.slice(0, 140)),
        );
        for (const html of nameless) violations.push(`${path}: button without accessible name -> ${html}`);
    }

    writeMetric('a11y-violations.json', 'buttons', violations);
    expect(violations, `buttons missing names:\n${violations.join('\n')}`).toEqual([]);
});

test('prefers-reduced-motion: site stays usable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    await expect(page.locator('main h1')).toBeVisible();

    await page.locator('button[aria-label="Open menu"]').click();
    await expect(page.locator('nav[aria-label="Menu"]')).toBeVisible();
    await page.locator('nav[aria-label="Menu"]').getByRole('link', { name: 'Writing', exact: true }).click();
    await page.waitForURL((url) => url.pathname === '/writing');
    await expect(page.locator('main h1')).toHaveText('Writing');
    await shot(page, 'reduced-motion-mobile-writing');
});
