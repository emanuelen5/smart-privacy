import { test, expect } from '@playwright/test';
import path from 'path';
import { EXTENSION_ROOT } from './helpers';

const sponsorUrl = `file://${path.join(EXTENSION_ROOT, 'static', 'sponsor', 'sponsor.html')}`;

test.describe('Sponsor page', () => {
  test('has the correct page title', async ({ page }) => {
    await page.goto(sponsorUrl);
    await expect(page).toHaveTitle('Smart Privacy – Support');
  });

  test('shows the "Support Smart Privacy" heading', async ({ page }) => {
    await page.goto(sponsorUrl);
    await expect(page.locator('h2')).toHaveText('Support Smart Privacy');
  });

  test('has a GitHub Sponsors link with the correct href', async ({ page }) => {
    await page.goto(sponsorUrl);
    const link = page.locator('a.btn-sponsor');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://github.com/sponsors/emanuelen5');
  });

  test('GitHub Sponsors link opens in a new tab', async ({ page }) => {
    await page.goto(sponsorUrl);
    const link = page.locator('a.btn-sponsor');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
