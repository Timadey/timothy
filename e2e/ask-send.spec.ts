import { expect, shot, test } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

test('ask: compose sends and shows the sent view', async ({ page }) => {
    await page.goto('/ask');
    await expect(page.getByRole('heading', { level: 1, name: 'Ask Timadey' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'New Message' })).toBeVisible();

    await page.getByRole('textbox', { name: 'From' }).fill('visitor@example.com');
    await page.getByRole('textbox', { name: 'Subject' }).fill('Hello from e2e');
    await page.getByRole('textbox', { name: 'Message' }).fill('Testing the ask composer.');
    await shot(page, 'ask-compose');

    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Your message is on its way.')).toBeVisible();
    await shot(page, 'ask-sent');
});
