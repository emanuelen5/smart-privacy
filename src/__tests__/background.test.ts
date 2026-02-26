import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the `browser` global before importing the module under test.
// We rebuild a fresh mock state before each test so tests are isolated.
// ---------------------------------------------------------------------------

type StorageStore = Record<string, unknown>;

function makeBrowserMock(initialStorage: StorageStore = {}) {
  const storage: StorageStore = { ...initialStorage };

  const browsingDataRemove = vi.fn().mockResolvedValue(undefined);
  const cookiesGetAll = vi.fn().mockResolvedValue([]);
  const cookiesRemove = vi.fn().mockResolvedValue(undefined);
  const tabsQuery = vi.fn().mockResolvedValue([]);
  const tabsSendMessage = vi.fn().mockResolvedValue(undefined);

  const storageLocalGet = vi.fn(async (defaults: StorageStore) => {
    const result: StorageStore = { ...defaults };
    for (const key of Object.keys(defaults)) {
      if (key in storage) result[key] = storage[key];
    }
    return result;
  });

  const storageLocalSet = vi.fn(async (values: StorageStore) => {
    Object.assign(storage, values);
  });

  const noopListener = { addListener: vi.fn() };

  return {
    storage,
    mock: {
      browsingData: { remove: browsingDataRemove },
      cookies: { getAll: cookiesGetAll, remove: cookiesRemove },
      tabs: {
        query: tabsQuery,
        sendMessage: tabsSendMessage,
        onUpdated: noopListener,
        onRemoved: noopListener,
      },
      runtime: {
        onMessage: noopListener,
        onInstalled: noopListener,
      },
      storage: {
        local: { get: storageLocalGet, set: storageLocalSet },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// handleMessage – approve
// ---------------------------------------------------------------------------

describe('handleMessage – approve', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('adds the domain to approvedDomains and removes from deniedDomains', async () => {
    const { storage, mock } = makeBrowserMock({
      approvedDomains: [],
      deniedDomains: ['example.com'],
      visitCounts: {},
      promptedDomains: [],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleMessage } = await import('../background.js');

    await handleMessage(
      { type: 'approve', domain: 'example.com' },
      {}
    );

    expect(storage.approvedDomains).toContain('example.com');
    expect(storage.deniedDomains).not.toContain('example.com');
  });

  it('does not duplicate an already-approved domain', async () => {
    const { storage, mock } = makeBrowserMock({
      approvedDomains: ['example.com'],
      deniedDomains: [],
      visitCounts: {},
      promptedDomains: [],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleMessage } = await import('../background.js');

    await handleMessage(
      { type: 'approve', domain: 'example.com' },
      {}
    );

    const approved = storage.approvedDomains as string[];
    expect(approved.filter(d => d === 'example.com')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// handleMessage – deny
// ---------------------------------------------------------------------------

describe('handleMessage – deny', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('adds the domain to deniedDomains, removes from approvedDomains, and clears site data', async () => {
    const { storage, mock } = makeBrowserMock({
      approvedDomains: ['example.com'],
      deniedDomains: [],
      visitCounts: {},
      promptedDomains: [],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleMessage } = await import('../background.js');

    await handleMessage(
      { type: 'deny', domain: 'example.com' },
      {}
    );

    expect(storage.deniedDomains).toContain('example.com');
    expect(storage.approvedDomains).not.toContain('example.com');
    expect(mock.browsingData.remove).toHaveBeenCalledWith(
      { hostnames: ['example.com'] },
      expect.any(Object)
    );
  });
});

// ---------------------------------------------------------------------------
// handleMessage – remove
// ---------------------------------------------------------------------------

describe('handleMessage – remove', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('removes the domain from all lists and resets visit count', async () => {
    const { storage, mock } = makeBrowserMock({
      approvedDomains: ['example.com'],
      deniedDomains: [],
      visitCounts: { 'example.com': 5 },
      promptedDomains: ['example.com'],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleMessage } = await import('../background.js');

    await handleMessage({ type: 'remove', domain: 'example.com' }, {});

    expect(storage.approvedDomains).not.toContain('example.com');
    expect(storage.promptedDomains).not.toContain('example.com');
    expect((storage.visitCounts as Record<string, number>)['example.com']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// handleMessage – getStatus
// ---------------------------------------------------------------------------

describe('handleMessage – getStatus', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns approved=true for an approved domain', async () => {
    const { mock } = makeBrowserMock({
      approvedDomains: ['example.com'],
      deniedDomains: [],
      visitCounts: { 'example.com': 2 },
      promptedDomains: [],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleMessage } = await import('../background.js');

    const result = await handleMessage(
      { type: 'getStatus', domain: 'example.com' },
      {}
    ) as { approved: boolean; denied: boolean; visitCount: number };

    expect(result.approved).toBe(true);
    expect(result.denied).toBe(false);
    expect(result.visitCount).toBe(2);
  });

  it('returns denied=true for a denied domain', async () => {
    const { mock } = makeBrowserMock({
      approvedDomains: [],
      deniedDomains: ['evil.com'],
      visitCounts: {},
      promptedDomains: [],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleMessage } = await import('../background.js');

    const result = await handleMessage(
      { type: 'getStatus', domain: 'evil.com' },
      {}
    ) as { approved: boolean; denied: boolean };

    expect(result.approved).toBe(false);
    expect(result.denied).toBe(true);
  });

  it('returns empty object when no domain is provided or derivable from sender', async () => {
    const { mock } = makeBrowserMock({
      approvedDomains: [],
      deniedDomains: [],
      visitCounts: {},
      promptedDomains: [],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleMessage } = await import('../background.js');

    const result = await handleMessage({ type: 'getStatus' }, {});
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// handleVisit
// ---------------------------------------------------------------------------

describe('handleVisit', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('increments the visit count for an unknown domain', async () => {
    const { storage, mock } = makeBrowserMock({
      approvedDomains: [],
      deniedDomains: [],
      visitCounts: {},
      promptedDomains: [],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleVisit } = await import('../background.js');

    await handleVisit(1, 'https://example.com/page');

    expect((storage.visitCounts as Record<string, number>)['example.com']).toBe(1);
  });

  it('does not increment the count for an approved domain', async () => {
    const { storage, mock } = makeBrowserMock({
      approvedDomains: ['example.com'],
      deniedDomains: [],
      visitCounts: {},
      promptedDomains: [],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleVisit } = await import('../background.js');

    await handleVisit(1, 'https://example.com/page');

    expect((storage.visitCounts as Record<string, number>)['example.com']).toBeUndefined();
  });

  it('triggers a prompt after reaching the visit threshold', async () => {
    const { storage, mock } = makeBrowserMock({
      approvedDomains: [],
      deniedDomains: [],
      visitCounts: { 'example.com': 2 },
      promptedDomains: [],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleVisit } = await import('../background.js');

    await handleVisit(1, 'https://example.com/page');

    expect(storage.promptedDomains as string[]).toContain('example.com');
    expect(mock.tabs.sendMessage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ type: 'showPrompt', reason: 'repeated_visits' })
    );
  });

  it('does not re-trigger a prompt for an already-prompted domain', async () => {
    const { mock } = makeBrowserMock({
      approvedDomains: [],
      deniedDomains: [],
      visitCounts: { 'example.com': 10 },
      promptedDomains: ['example.com'],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleVisit } = await import('../background.js');

    await handleVisit(1, 'https://example.com/page');

    expect(mock.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('ignores non-http URLs (e.g. about:newtab)', async () => {
    const { storage, mock } = makeBrowserMock({
      approvedDomains: [],
      deniedDomains: [],
      visitCounts: {},
      promptedDomains: [],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleVisit } = await import('../background.js');

    await handleVisit(1, 'about:newtab');

    expect(Object.keys(storage.visitCounts as object)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// handleMessage – passwordDetected
// ---------------------------------------------------------------------------

describe('handleMessage – passwordDetected', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('triggers a prompt for an unknown domain when a password is detected', async () => {
    const { storage, mock } = makeBrowserMock({
      approvedDomains: [],
      deniedDomains: [],
      visitCounts: {},
      promptedDomains: [],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleMessage } = await import('../background.js');

    await handleMessage(
      { type: 'passwordDetected' },
      { tab: { id: 42, url: 'https://login.example.com/signin' } } as browser.runtime.MessageSender
    );

    expect(storage.promptedDomains as string[]).toContain('login.example.com');
    expect(mock.tabs.sendMessage).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ type: 'showPrompt', reason: 'password' })
    );
  });

  it('does not trigger a prompt for an already-approved domain', async () => {
    const { mock } = makeBrowserMock({
      approvedDomains: ['login.example.com'],
      deniedDomains: [],
      visitCounts: {},
      promptedDomains: [],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleMessage } = await import('../background.js');

    await handleMessage(
      { type: 'passwordDetected' },
      { tab: { id: 42, url: 'https://login.example.com/signin' } } as browser.runtime.MessageSender
    );

    expect(mock.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('does not trigger a prompt when no sender tab is present', async () => {
    const { mock } = makeBrowserMock({
      approvedDomains: [],
      deniedDomains: [],
      visitCounts: {},
      promptedDomains: [],
      visitThreshold: 3,
    });
    (globalThis as Record<string, unknown>).browser = mock;

    const { handleMessage } = await import('../background.js');

    await handleMessage({ type: 'passwordDetected' }, {});

    expect(mock.tabs.sendMessage).not.toHaveBeenCalled();
  });
});
