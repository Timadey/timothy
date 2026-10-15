import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test as base, expect, type Page, type TestInfo } from 'playwright/test';

export const ROOT = process.cwd();
export const EVIDENCE_DIR = path.join(ROOT, 'qa', 'evidence');
const CONSOLE_LOG = path.join(EVIDENCE_DIR, 'console-errors.log');
const FINDINGS_FILE = path.join(EVIDENCE_DIR, 'findings.json');

mkdirSync(EVIDENCE_DIR, { recursive: true });

function readAdminCredentials(): { email: string; password: string } {
    const raw = readFileSync(path.join(ROOT, '.env'), 'utf8');
    const pick = (key: string): string =>
        raw
            .split(/\r?\n/)
            .find((line) => line.startsWith(`${key}=`))
            ?.slice(key.length + 1)
            .trim() ?? '';
    return { email: pick('ADMIN_EMAIL'), password: pick('ADMIN_PASSWORD') };
}

export const ADMIN = readAdminCredentials();

export type Finding = {
    id: string;
    severity: 'low' | 'medium' | 'high';
    where: string;
    detail: string;
    evidence?: string[];
};

export function recordFinding(finding: Finding): void {
    let list: Finding[] = [];
    try {
        list = JSON.parse(readFileSync(FINDINGS_FILE, 'utf8'));
    } catch {
        list = [];
    }
    if (!list.some((entry) => entry.id === finding.id)) {
        list.push(finding);
        writeFileSync(FINDINGS_FILE, `${JSON.stringify(list, null, 2)}\n`);
    }
}

export function writeMetric(file: string, key: string, value: unknown): void {
    const target = path.join(EVIDENCE_DIR, file);
    let data: Record<string, unknown> = {};
    try {
        data = JSON.parse(readFileSync(target, 'utf8'));
    } catch {
        data = {};
    }
    data[key] = value;
    writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
}

export function resetMetric(file: string): void {
    writeFileSync(path.join(EVIDENCE_DIR, file), '{}\n');
}

export async function shot(page: Page, name: string, fullPage = true): Promise<void> {
    await page.screenshot({ path: path.join(EVIDENCE_DIR, `${name}.png`), fullPage });
}

export async function overflowMetrics(page: Page): Promise<{
    scrollWidth: number;
    clientWidth: number;
    innerWidth: number;
}> {
    return page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        innerWidth: window.innerWidth,
    }));
}

export async function expectNoHorizontalOverflow(page: Page, viewportWidth: number): Promise<void> {
    const metrics = await overflowMetrics(page);
    expect(
        metrics.scrollWidth,
        `document overflows viewport horizontally: ${JSON.stringify(metrics)}`,
    ).toBeLessThanOrEqual(Math.max(metrics.innerWidth, viewportWidth) + 1);
    expect(
        metrics.scrollWidth,
        `document overflows client width horizontally: ${JSON.stringify(metrics)}`,
    ).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

export async function discoverFirstHref(page: Page, index: string, prefix: string): Promise<string> {
    await page.goto(index);
    const href = await page.locator(`main a[href^="${prefix}"]`).first().getAttribute('href');
    expect(href, `no link starting with "${prefix}" found on ${index}`).toBeTruthy();
    return href as string;
}

export async function loginAsOwner(page: Page): Promise<void> {
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', ADMIN.email);
    await page.fill('input[type="password"]', ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname === '/admin');
}

type Diagnostics = {
    expect404: (urlPattern: RegExp) => void;
    fatal: string[];
};

export const test = base.extend<{ diagnostics: Diagnostics }>({
    diagnostics: [
        async ({ page }, use, testInfo: TestInfo) => {
            const fatal: string[] = [];
            const expected404: RegExp[] = [];
            const isFontUrl = (value: string): boolean => /fonts\.(googleapis|gstatic)\.com/.test(value);

            page.on('dialog', (dialog) => {
                void dialog.accept().catch(() => undefined);
            });
            page.on('pageerror', (error) => {
                fatal.push(`pageerror: ${error.message}`);
            });
            page.on('console', (message) => {
                if (message.type() !== 'error') return;
                const text = message.text();
                const location = message.location()?.url ?? '';
                if (isFontUrl(text) || isFontUrl(location)) return;
                if (/Failed to load resource/.test(text) && expected404.some((pattern) => pattern.test(location))) {
                    return;
                }
                fatal.push(`console.error: ${text}${location ? ` @ ${location}` : ''}`);
            });
            page.on('response', (response) => {
                const status = response.status();
                if (status < 400) return;
                const url = response.url();
                if (isFontUrl(url)) return;
                if (status === 404 && expected404.some((pattern) => pattern.test(url))) return;
                fatal.push(`http ${status}: ${url}`);
            });
            page.on('requestfailed', (request) => {
                const url = request.url();
                if (isFontUrl(url)) return;
                const errorText = request.failure()?.errorText ?? 'unknown error';
                if (errorText.includes('ERR_ABORTED')) return;
                fatal.push(`requestfailed: ${url} (${errorText})`);
            });

            await use({
                expect404: (urlPattern: RegExp) => expected404.push(urlPattern),
                fatal,
            });

            const header = `[${new Date().toISOString()}] [${testInfo.status}] ${testInfo.titlePath.join(' > ')}`;
            const body = fatal.length
                ? fatal.map((entry) => `  ${entry}`).join('\n')
                : '  (clean)';
            appendFileSync(CONSOLE_LOG, `${header}\n${body}\n`);

            if (fatal.length > 0 && testInfo.status === 'passed') {
                throw new Error(
                    `Diagnostics recorded ${fatal.length} issue(s):\n${fatal.join('\n')}\n(see qa/evidence/console-errors.log)`,
                );
            }
        },
        { auto: true },
    ],
});

export { expect };
