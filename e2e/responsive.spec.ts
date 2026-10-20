import {
    discoverFirstHref,
    expect,
    expectNoHorizontalOverflow,
    recordFinding,
    resetMetric,
    shot,
    test,
    writeMetric,
} from './fixtures';

const VIEWPORTS = [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'tablet', width: 768, height: 1024 },
    { label: 'mobile', width: 375, height: 812 },
];

const PAGES = [
    { slug: 'home', path: '/' },
    { slug: 'writing', path: '/writing' },
    { slug: 'article', path: 'dynamic:article' },
    { slug: 'login', path: '/admin/login' },
];

test.beforeAll(() => {
    resetMetric('responsive-observations.json');
    resetMetric('touch-targets.json');
});

for (const viewport of VIEWPORTS) {
    for (const target of PAGES) {
        test(`${target.slug} layout at ${viewport.label} (${viewport.width}px)`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });

            const path = target.path.startsWith('dynamic:')
                ? await discoverFirstHref(page, '/writing', '/writing/')
                : target.path;
            const response = await page.goto(path);
            expect(response?.status(), `${path} status`).toBe(200);

            const h1 = target.slug === 'login' ? page.locator('h1') : page.locator('main h1');
            await expect(h1).toBeVisible();

            await expectNoHorizontalOverflow(page, viewport.width);

            const desktopNavVisible = await page.locator('header nav[aria-label="Primary"]').isVisible();
            const hamburgerVisible = await page.locator('button[aria-label="Open menu"]').isVisible();

            if (target.slug !== 'login') {
                expect(
                    desktopNavVisible !== hamburgerVisible,
                    'exactly one navigation mechanism should be visible',
                ).toBe(true);
            }

            writeMetric('responsive-observations.json', `${target.slug}@${viewport.width}`, {
                path,
                viewport,
                desktopNavVisible,
                hamburgerVisible,
                navMechanism: desktopNavVisible ? 'inline nav' : hamburgerVisible ? 'hamburger drawer' : 'none',
            });

            await shot(page, `${target.slug}-${viewport.label}-${viewport.width}`);
        });
    }
}

test('mobile drawer opens, navigates and closes (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const toggle = page.locator('button[aria-label="Open menu"]');
    await expect(toggle).toBeVisible();
    await toggle.click();

    const drawer = page.locator('nav[aria-label="Mobile"]');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('a')).toHaveCount(7);
    await shot(page, 'mobile-drawer-open', false);

    await drawer.getByRole('link', { name: 'Notes', exact: true }).click();
    await page.waitForURL((url) => url.pathname === '/notes');
    await expect(page.locator('main h1')).toHaveText('Notes');
    await expect(drawer).toBeHidden();
    await expect(page.locator('button[aria-label="Open menu"]')).toBeVisible();
    await expectNoHorizontalOverflow(page, 375);
    await shot(page, 'notes-mobile-375');
});

test('mobile touch targets meet size guidelines (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const measure = async (selector: string): Promise<{ text: string; width: number; height: number }[]> =>
        page.$$eval(selector, (elements) =>
            elements
                .map((element) => {
                    const rect = element.getBoundingClientRect();
                    return {
                        text: (element.textContent ?? '').trim().slice(0, 40),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                    };
                })
                .filter((entry) => entry.width > 0 && entry.height > 0),
        );

    const headerTargets = await measure('header a, header button');
    await page.locator('button[aria-label="Open menu"]').click();
    const drawerTargets = await measure('nav[aria-label="Mobile"] a');

    writeMetric('touch-targets.json', 'header', headerTargets);
    writeMetric('touch-targets.json', 'drawer', drawerTargets);

    expect(headerTargets.length, 'header should contain interactive targets').toBeGreaterThanOrEqual(2);
    expect(drawerTargets.length, 'drawer should contain nav links').toBe(7);

    const all = [...headerTargets, ...drawerTargets];
    for (const target of all) {
        expect(target.width, `target "${target.text}" width (WCAG 2.5.8 AA needs >=24)`).toBeGreaterThanOrEqual(24);
        expect(target.height, `target "${target.text}" height (WCAG 2.5.8 AA needs >=24)`).toBeGreaterThanOrEqual(24);
    }

    const under44 = all.filter((target) => target.width < 44 || target.height < 44);
    if (under44.length > 0) {
        recordFinding({
            id: 'mobile-touch-targets-under-44px',
            severity: 'low',
            where: 'Public header + mobile drawer (375px)',
            detail: `${under44.length} interactive target(s) smaller than 44x44 (Apple HIG / WCAG 2.5.5 AAA): ${under44
                .map((target) => `"${target.text}" ${target.width}x${target.height}`)
                .join(', ')}`,
            evidence: ['qa/evidence/touch-targets.json', 'qa/evidence/mobile-drawer-open.png'],
        });
    }
});
