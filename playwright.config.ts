import { defineConfig, devices } from 'playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 45_000,
    expect: {
        timeout: 10_000,
    },
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [['list'], ['html', { outputFolder: 'qa/evidence/html-report', open: 'never' }]],
    outputDir: 'qa/evidence/test-results',
    use: {
        baseURL: 'http://127.0.0.1:8892',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'APP_ENV=testing APP_DEBUG=false DB_DATABASE=timadey_qa_browser VITE_HOT_FILE=public/hot-e2e LOGIN_THROTTLE=120 php artisan serve --no-reload --host=127.0.0.1 --port=8892',
        url: 'http://127.0.0.1:8892/up',
        reuseExistingServer: true,
        timeout: 120_000,
    },
});
