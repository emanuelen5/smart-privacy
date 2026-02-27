import type {
  StorageData,
  PromptReason,
  BackgroundMessage,
  ShowPromptMessage,
} from './types.js';
import { getDomain } from './utils.js';

/**
 * Background script – handles:
 *  - Cookie/site-data cleanup for non-approved domains
 *  - Visit counting and prompt triggering
 *  - Messages from content script and popup
 */

const VISIT_THRESHOLD = 3;

/** In-memory map of tabId → current URL (updated on each navigation) */
const tabUrls = new Map<number, string>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export async function getStorage(): Promise<StorageData> {
  const result = await browser.storage.local.get({
    approvedDomains: [] as string[],
    deniedDomains: [] as string[],
    visitCounts: {} as Record<string, number>,
    promptedDomains: [] as string[],
    visitThreshold: VISIT_THRESHOLD,
  });
  return result as StorageData;
}

// ---------------------------------------------------------------------------
// Site-data cleanup
// ---------------------------------------------------------------------------

export async function clearSiteData(domain: string): Promise<void> {
  try {
    await browser.browsingData.remove(
      { hostnames: [domain] },
      {
        cookies: true,
        localStorage: true,
        indexedDB: true,
        cache: true,
        serviceWorkers: true,
      }
    );
  } catch {
    // Fallback: remove cookies one by one when browsingData.remove is unavailable
    const cookies = await browser.cookies.getAll({ domain });
    for (const cookie of cookies) {
      const protocol = cookie.secure ? 'https:' : 'http:';
      const cookieDomain = cookie.domain.startsWith('.')
        ? cookie.domain.slice(1)
        : cookie.domain;
      try {
        await browser.cookies.remove({
          url: `${protocol}//${cookieDomain}${cookie.path}`,
          name: cookie.name,
          storeId: cookie.storeId,
        });
      } catch {
        // ignore individual removal errors
      }
    }
  }
}

/**
 * Clear site data for `domain` if it is not approved and no other open tab
 * is still on that domain (excluding `excludeTabId` which is being closed).
 */
export async function maybeCleanupDomain(domain: string | null, excludeTabId: number): Promise<void> {
  if (!domain) return;
  const data = await getStorage();
  if (data.approvedDomains.includes(domain)) return;

  // Check whether another tab is still using this domain
  const allTabs = await browser.tabs.query({});
  const stillOpen = allTabs.some(t => t.id !== excludeTabId && getDomain(t.url) === domain);
  if (!stillOpen) {
    await clearSiteData(domain);
  }
}

// ---------------------------------------------------------------------------
// Visit tracking & prompt triggering
// ---------------------------------------------------------------------------

export async function triggerPrompt(tabId: number, domain: string, reason: PromptReason): Promise<void> {
  // Mark as prompted so we never ask again for this domain
  const data = await getStorage();
  if (data.promptedDomains.includes(domain)) return;
  data.promptedDomains.push(domain);
  await browser.storage.local.set({ promptedDomains: data.promptedDomains });

  const msg: ShowPromptMessage = { type: 'showPrompt', domain, reason };
  try {
    await browser.tabs.sendMessage(tabId, msg);
  } catch {
    // Content script not yet injected; it will pick up the prompt state on load
  }
}

export async function handleVisit(tabId: number, url: string): Promise<void> {
  const domain = getDomain(url);
  if (!domain) return;

  const data = await getStorage();
  if (
    data.approvedDomains.includes(domain) ||
    data.deniedDomains.includes(domain) ||
    data.promptedDomains.includes(domain)
  ) {
    return;
  }

  data.visitCounts[domain] = (data.visitCounts[domain] ?? 0) + 1;
  await browser.storage.local.set({ visitCounts: data.visitCounts });

  if (data.visitCounts[domain] >= data.visitThreshold) {
    await triggerPrompt(tabId, domain, 'repeated_visits');
  }
}

// ---------------------------------------------------------------------------
// Tab event listeners
// ---------------------------------------------------------------------------

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url) return;

  // When the URL changes, potentially clean up the previous domain
  if (changeInfo.url) {
    const prevUrl = tabUrls.get(tabId);
    if (prevUrl) {
      const prevDomain = getDomain(prevUrl);
      const newDomain = getDomain(changeInfo.url);
      if (prevDomain && prevDomain !== newDomain) {
        await maybeCleanupDomain(prevDomain, tabId);
      }
    }
    tabUrls.set(tabId, changeInfo.url);
  }

  if (changeInfo.status === 'complete' && tab.url) {
    tabUrls.set(tabId, tab.url);
    await handleVisit(tabId, tab.url);
  }
});

browser.tabs.onRemoved.addListener(async (tabId) => {
  const url = tabUrls.get(tabId);
  tabUrls.delete(tabId);
  if (url) {
    await maybeCleanupDomain(getDomain(url), tabId);
  }
});

// ---------------------------------------------------------------------------
// Message handler (from content script and popup)
// ---------------------------------------------------------------------------

export async function handleMessage(
  message: BackgroundMessage,
  sender: browser.runtime.MessageSender
): Promise<unknown> {
  const senderDomain = getDomain(sender.tab?.url);

  switch (message.type) {
    case 'getStatus': {
      const domain = message.domain ?? senderDomain;
      if (!domain) return {};
      const data = await getStorage();
      return {
        approved: data.approvedDomains.includes(domain),
        denied: data.deniedDomains.includes(domain),
        prompted: data.promptedDomains.includes(domain),
        visitCount: data.visitCounts[domain] ?? 0,
      };
    }

    case 'approve': {
      const domain = message.domain ?? senderDomain;
      if (!domain) return;
      const data = await getStorage();
      if (!data.approvedDomains.includes(domain)) {
        data.approvedDomains.push(domain);
      }
      data.deniedDomains = data.deniedDomains.filter(d => d !== domain);
      await browser.storage.local.set({
        approvedDomains: data.approvedDomains,
        deniedDomains: data.deniedDomains,
      });
      break;
    }

    case 'deny': {
      const domain = message.domain ?? senderDomain;
      if (!domain) return;
      const data = await getStorage();
      if (!data.deniedDomains.includes(domain)) {
        data.deniedDomains.push(domain);
      }
      data.approvedDomains = data.approvedDomains.filter(d => d !== domain);
      await browser.storage.local.set({
        approvedDomains: data.approvedDomains,
        deniedDomains: data.deniedDomains,
      });
      await clearSiteData(domain);
      break;
    }

    case 'remove': {
      const { domain } = message;
      const data = await getStorage();
      data.approvedDomains = data.approvedDomains.filter(d => d !== domain);
      data.deniedDomains = data.deniedDomains.filter(d => d !== domain);
      data.promptedDomains = data.promptedDomains.filter(d => d !== domain);
      delete data.visitCounts[domain];
      await browser.storage.local.set(data);
      break;
    }

    case 'passwordDetected': {
      const domain = senderDomain;
      const tabId = sender.tab?.id;
      if (!domain || tabId === undefined) return;
      const data = await getStorage();
      if (
        !data.approvedDomains.includes(domain) &&
        !data.deniedDomains.includes(domain) &&
        !data.promptedDomains.includes(domain)
      ) {
        await triggerPrompt(tabId, domain, 'password');
      }
      break;
    }

    default:
      break;
  }

  return undefined;
}

browser.runtime.onMessage.addListener((message, sender) => {
  return handleMessage(message as BackgroundMessage, sender);
});

// ---------------------------------------------------------------------------
// Startup: populate tabUrls from currently open tabs
// ---------------------------------------------------------------------------

browser.tabs.query({}).then(tabs => {
  for (const tab of tabs) {
    if (tab.id !== undefined && tab.url) {
      tabUrls.set(tab.id, tab.url);
    }
  }
});

// ---------------------------------------------------------------------------
// First install: open the sponsor page to say thank you / ask for support
// ---------------------------------------------------------------------------

browser.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    browser.tabs.create({ url: browser.runtime.getURL('static/sponsor/sponsor.html') });
  }
});
