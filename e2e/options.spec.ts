import { test, expect } from '@playwright/test';
import path from 'path';
import { EXTENSION_ROOT, DEFAULT_STORE, setupBrowserMock } from './helpers';

const optionsUrl = `file://${path.join(EXTENSION_ROOT, 'options', 'options.html')}`;

test.describe('Options page', () => {
  test('has the correct page title', async ({ page }) => {
    await setupBrowserMock(page);
    await page.goto(optionsUrl);
    await expect(page).toHaveTitle('Smart Privacy – Settings');
  });

  test('shows empty state for approved and denied lists', async ({ page }) => {
    await setupBrowserMock(page);
    await page.goto(optionsUrl);
    await expect(page.locator('#approved-empty')).toBeVisible();
    await expect(page.locator('#denied-empty')).toBeVisible();
    await expect(page.locator('#approved-count')).toHaveText('0');
    await expect(page.locator('#denied-count')).toHaveText('0');
  });

  test('pre-populates approved list from storage', async ({ page }) => {
    await setupBrowserMock(page, {
      ...DEFAULT_STORE,
      approvedDomains: ['example.com', 'trusted.org'],
    });
    await page.goto(optionsUrl);
    await expect(page.locator('#approved-count')).toHaveText('2');
    await expect(page.locator('#approved-empty')).toBeHidden();
    await expect(page.locator('#approved-list')).toContainText('example.com');
    await expect(page.locator('#approved-list')).toContainText('trusted.org');
  });

  test('pre-populates denied list from storage', async ({ page }) => {
    await setupBrowserMock(page, {
      ...DEFAULT_STORE,
      deniedDomains: ['evil.com'],
    });
    await page.goto(optionsUrl);
    await expect(page.locator('#denied-count')).toHaveText('1');
    await expect(page.locator('#denied-empty')).toBeHidden();
    await expect(page.locator('#denied-list')).toContainText('evil.com');
  });

  test('loads the visit threshold from storage', async ({ page }) => {
    await setupBrowserMock(page, { ...DEFAULT_STORE, visitThreshold: 7 });
    await page.goto(optionsUrl);
    await expect(page.locator('#visit-threshold')).toHaveValue('7');
  });

  test('adds a domain to the approved list', async ({ page }) => {
    await setupBrowserMock(page);
    await page.goto(optionsUrl);

    await page.locator('#add-input').fill('newsite.com');
    await page.locator('#btn-add-approve').click();

    await expect(page.locator('#approved-list')).toContainText('newsite.com');
    await expect(page.locator('#approved-count')).toHaveText('1');
    await expect(page.locator('#approved-empty')).toBeHidden();
  });

  test('adds a domain to the denied list', async ({ page }) => {
    await setupBrowserMock(page);
    await page.goto(optionsUrl);

    await page.locator('#add-input').fill('badsite.com');
    await page.locator('#btn-add-deny').click();

    await expect(page.locator('#denied-list')).toContainText('badsite.com');
    await expect(page.locator('#denied-count')).toHaveText('1');
    await expect(page.locator('#denied-empty')).toBeHidden();
  });

  test('shows an error for an invalid domain input', async ({ page }) => {
    await setupBrowserMock(page);
    await page.goto(optionsUrl);

    await page.locator('#add-input').fill('not a valid domain!');
    await page.locator('#btn-add-approve').click();

    await expect(page.locator('#add-error')).toBeVisible();
    await expect(page.locator('#add-error')).toContainText('valid domain');
  });

  test('removes a domain from the approved list', async ({ page }) => {
    await setupBrowserMock(page, {
      ...DEFAULT_STORE,
      approvedDomains: ['remove-me.com'],
    });
    await page.goto(optionsUrl);
    await expect(page.locator('#approved-list')).toContainText('remove-me.com');

    await page.locator('#approved-list .btn-remove-domain').click();

    await expect(page.locator('#approved-list')).not.toContainText('remove-me.com');
    await expect(page.locator('#approved-empty')).toBeVisible();
  });

  test('saves the visit threshold and shows confirmation', async ({ page }) => {
    await setupBrowserMock(page);
    await page.goto(optionsUrl);

    await page.locator('#visit-threshold').fill('5');
    await page.locator('#btn-save-settings').click();

    await expect(page.locator('#settings-saved')).toBeVisible();
  });
});
