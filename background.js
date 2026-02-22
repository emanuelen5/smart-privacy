'use strict';

/**
 * Background script – handles:
 *  - Cookie/site-data cleanup for non-approved domains
 *  - Visit counting and prompt triggering
 *  - Messages from content script and popup
 */

const VISIT_THRESHOLD = 3;

/** In-memory map of tabId → current URL (updated on each navigation) */
const tabUrls = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDomain(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.hostname;
    }
  } catch {
    // ignore invalid URLs
  }
  return null;
}

async function getStorage() {
  return browser.storage.local.get({
    approvedDomains: [],
    deniedDomains: [],
    visitCounts: {},
    promptedDomains: [],
    visitThreshold: VISIT_THRESHOLD
  });
}

// ---------------------------------------------------------------------------
// Site-data cleanup
// ---------------------------------------------------------------------------

async function clearSiteData(domain) {
  try {
    await browser.browsingData.remove(
      { hostnames: [domain] },
      {
        cookies: true,
        localStorage: true,
        indexedDB: true,
        cacheStorage: true,
        serviceWorkers: true
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
          storeId: cookie.storeId
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
async function maybeCleanupDomain(domain, excludeTabId) {
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

async function triggerPrompt(tabId, domain, reason) {
  // Mark as prompted so we never ask again for this domain
  const data = await getStorage();
  if (data.promptedDomains.includes(domain)) return;
  data.promptedDomains.push(domain);
  await browser.storage.local.set({ promptedDomains: data.promptedDomains });

  try {
    await browser.tabs.sendMessage(tabId, { type: 'showPrompt', domain, reason });
  } catch {
    // Content script not yet injected; it will pick up the prompt state on load
  }
}

async function handleVisit(tabId, url) {
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

  data.visitCounts[domain] = (data.visitCounts[domain] || 0) + 1;
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

async function handleMessage(message, sender) {
  const senderDomain = getDomain(sender.tab && sender.tab.url);

  switch (message.type) {
    case 'getStatus': {
      const domain = message.domain || senderDomain;
      if (!domain) return {};
      const data = await getStorage();
      return {
        approved: data.approvedDomains.includes(domain),
        denied: data.deniedDomains.includes(domain),
        prompted: data.promptedDomains.includes(domain),
        visitCount: data.visitCounts[domain] || 0
      };
    }

    case 'approve': {
      const domain = message.domain || senderDomain;
      if (!domain) return;
      const data = await getStorage();
      if (!data.approvedDomains.includes(domain)) {
        data.approvedDomains.push(domain);
      }
      data.deniedDomains = data.deniedDomains.filter(d => d !== domain);
      await browser.storage.local.set({
        approvedDomains: data.approvedDomains,
        deniedDomains: data.deniedDomains
      });
      break;
    }

    case 'deny': {
      const domain = message.domain || senderDomain;
      if (!domain) return;
      const data = await getStorage();
      if (!data.deniedDomains.includes(domain)) {
        data.deniedDomains.push(domain);
      }
      data.approvedDomains = data.approvedDomains.filter(d => d !== domain);
      await browser.storage.local.set({
        approvedDomains: data.approvedDomains,
        deniedDomains: data.deniedDomains
      });
      await clearSiteData(domain);
      break;
    }

    case 'remove': {
      // Remove domain from all lists (reset to unknown state)
      const domain = message.domain;
      if (!domain) return;
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
      const tabId = sender.tab && sender.tab.id;
      if (!domain || !tabId) return;
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
}

browser.runtime.onMessage.addListener((message, sender) => {
  return handleMessage(message, sender);
});

// ---------------------------------------------------------------------------
// Startup: populate tabUrls from currently open tabs
// ---------------------------------------------------------------------------

browser.tabs.query({}).then(tabs => {
  for (const tab of tabs) {
    if (tab.url) tabUrls.set(tab.id, tab.url);
  }
});
