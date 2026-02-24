import { Page } from '@playwright/test';
import path from 'path';

export const EXTENSION_ROOT = path.resolve(__dirname, '..');

export interface MockStore {
  approvedDomains: string[];
  deniedDomains: string[];
  visitCounts: Record<string, number>;
  promptedDomains: string[];
  visitThreshold: number;
}

export const DEFAULT_STORE: MockStore = {
  approvedDomains: [],
  deniedDomains: [],
  visitCounts: {},
  promptedDomains: [],
  visitThreshold: 3,
};

/**
 * Injects a `window.browser` mock into the page before any page scripts run.
 * This allows the extension HTML pages to be tested in a regular browser
 * (Chromium) without a real extension context.
 */
export async function setupBrowserMock(
  page: Page,
  store: MockStore = DEFAULT_STORE,
  tabUrl: string | null = null,
): Promise<void> {
  await page.addInitScript(
    ({ store: s, tabUrl: url }) => {
      // This function runs in the browser context.
      // It must be self-contained (no imports or external references).
      const data: Record<string, unknown> = JSON.parse(JSON.stringify(s));

      (window as unknown as Record<string, unknown>).browser = {
        storage: {
          local: {
            get: (defaults: Record<string, unknown>) => {
              const result = Object.assign({}, defaults);
              for (const key of Object.keys(defaults)) {
                if (key in data) result[key] = data[key];
              }
              return Promise.resolve(result);
            },
            set: (values: Record<string, unknown>) => {
              Object.assign(data, values);
              return Promise.resolve(undefined);
            },
          },
        },
        tabs: {
          query: () => Promise.resolve(url ? [{ url }] : []),
          create: () => Promise.resolve(undefined),
        },
        runtime: {
          sendMessage: (msg: { type: string; domain?: string }) => {
            const approved: string[] = (data.approvedDomains as string[]) ?? [];
            const denied: string[] = (data.deniedDomains as string[]) ?? [];
            const prompted: string[] = (data.promptedDomains as string[]) ?? [];
            const visitCounts = (data.visitCounts as Record<string, number>) ?? {};

            if (msg.type === 'getStatus' && msg.domain) {
              return Promise.resolve({
                approved: approved.includes(msg.domain),
                denied: denied.includes(msg.domain),
                prompted: prompted.includes(msg.domain),
                visitCount: visitCounts[msg.domain] ?? 0,
              });
            }
            if (msg.type === 'approve' && msg.domain) {
              data.approvedDomains = [
                ...approved.filter(d => d !== msg.domain),
                msg.domain,
              ];
              data.deniedDomains = denied.filter(d => d !== msg.domain);
            } else if (msg.type === 'deny' && msg.domain) {
              data.deniedDomains = [
                ...denied.filter(d => d !== msg.domain),
                msg.domain,
              ];
              data.approvedDomains = approved.filter(d => d !== msg.domain);
            } else if (msg.type === 'remove' && msg.domain) {
              data.approvedDomains = approved.filter(d => d !== msg.domain);
              data.deniedDomains = denied.filter(d => d !== msg.domain);
            }
            return Promise.resolve({});
          },
          openOptionsPage: () => Promise.resolve(undefined),
          getURL: (p: string) => p,
        },
      };

      // Prevent window.close() from closing the Playwright-controlled page.
      window.close = () => {};
    },
    { store, tabUrl },
  );
}
