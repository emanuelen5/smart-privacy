import { test, expect } from '@playwright/test';
import path from 'path';
import { EXTENSION_ROOT, DEFAULT_STORE, setupBrowserMock } from './helpers';

const popupUrl = `file://${path.join(EXTENSION_ROOT, 'popup', 'popup.html')}`;

test.describe('Popup', () => {
  test('shows "Not a web page" when no tab URL is available', async ({ page }) => {
    await setupBrowserMock(page, DEFAULT_STORE, null);
    await page.goto(popupUrl);

    await expect(page.locator('#domain-name')).toHaveText('Not a web page');
    await expect(page.locator('#actions')).toBeHidden();
  });

  test('displays the current domain name', async ({ page }) => {
    await setupBrowserMock(page, DEFAULT_STORE, 'https://example.com/some/path');
    await page.goto(popupUrl);

    await expect(page.locator('#domain-name')).toHaveText('example.com');
  });

  test('shows "Unknown" badge for a domain not on any list', async ({ page }) => {
    await setupBrowserMock(page, DEFAULT_STORE, 'https://unknown-site.com/');
    await page.goto(popupUrl);

    await expect(page.locator('#status-badge')).toHaveText('Unknown');
    await expect(page.locator('#status-badge')).toHaveClass(/unknown/);
    await expect(page.locator('#btn-approve')).toBeVisible();
    await expect(page.locator('#btn-deny')).toBeVisible();
    await expect(page.locator('#btn-remove')).toBeHidden();
  });

  test('shows "Approved" badge for a domain on the approved list', async ({ page }) => {
    await setupBrowserMock(
      page,
      { ...DEFAULT_STORE, approvedDomains: ['approved-site.com'] },
      'https://approved-site.com/',
    );
    await page.goto(popupUrl);

    await expect(page.locator('#status-badge')).toHaveText('Approved');
    await expect(page.locator('#status-badge')).toHaveClass(/approved/);
    await expect(page.locator('#btn-approve')).toBeHidden();
    await expect(page.locator('#btn-remove')).toBeVisible();
  });

  test('shows "Denied" badge for a domain on the denied list', async ({ page }) => {
    await setupBrowserMock(
      page,
      { ...DEFAULT_STORE, deniedDomains: ['denied-site.com'] },
      'https://denied-site.com/',
    );
    await page.goto(popupUrl);

    await expect(page.locator('#status-badge')).toHaveText('Denied');
    await expect(page.locator('#status-badge')).toHaveClass(/denied/);
    await expect(page.locator('#btn-deny')).toBeHidden();
    await expect(page.locator('#btn-remove')).toBeVisible();
  });

  test('"Manage approve list" button is present', async ({ page }) => {
    await setupBrowserMock(page, DEFAULT_STORE, 'https://example.com/');
    await page.goto(popupUrl);

    await expect(page.locator('#open-options')).toBeVisible();
  });
});
