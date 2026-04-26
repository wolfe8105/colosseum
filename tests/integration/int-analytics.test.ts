/**
 * Integration tests — Seam #533
 * src/analytics.ts → analytics.utils
 *
 * analytics.utils is pure localStorage/URL. No Supabase rpc calls.
 * analytics.ts fires raw fetch() to /rest/v1/rpc/log_event — mocked via globalThis.fetch.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── helpers ──────────────────────────────────────────────────────────────────

function clearAnalyticsKeys() {
  const keys = [
    'mod_vid', 'mod_src', 'mod_uid_seen', 'mod_analytics_opt_out',
    'colo_vid', 'colo_src', 'colo_uid_seen',
  ];
  for (const k of keys) localStorage.removeItem(k);
}

// Build a minimal fake Supabase auth token for a given user ID.
// Key format: sb-{projectRef}-auth-token (AUTH-BUG-4 pattern).
// SUPABASE_URL in config.ts points to https://faomczmipsccwbhpivmp.supabase.co
// → projectRef = faomczmipsccwbhpivmp
const PROJECT_REF = 'faomczmipsccwbhpivmp';
const AUTH_KEY = `sb-${PROJECT_REF}-auth-token`;

function setAuthUser(userId: string) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ user: { id: userId } }));
}

function clearAuthUser() {
  localStorage.removeItem(AUTH_KEY);
}

// ── STEP 0: ARCH filter ───────────────────────────────────────────────────────

describe('Seam #533 – ARCH: analytics.ts imports from analytics.utils', () => {
  it('imports only from analytics.utils (no wall modules)', async () => {
    const raw = await import('../../src/analytics.ts?raw');
    const source: string = (raw as unknown as { default: string }).default;
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const wallTerms = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of importLines) {
      for (const term of wallTerms) {
        expect(line).not.toContain(term);
      }
    }
    // Must import from analytics.utils
    const hasUtilsImport = importLines.some(l => l.includes('analytics.utils'));
    expect(hasUtilsImport).toBe(true);
  });
});

// ── TC-1: getVisitorId — generates and persists UUID ─────────────────────────

describe('TC-1: getVisitorId generates and persists a visitor ID', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    clearAnalyticsKeys();
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a new UUID and stores it under mod_vid', async () => {
    const { getVisitorId } = await import('../../src/analytics.utils');
    const id = getVisitorId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(8);
    expect(localStorage.getItem('mod_vid')).toBe(id);
  });
});

// ── TC-2: getVisitorId — returns existing stored ID ──────────────────────────

describe('TC-2: getVisitorId returns existing stored ID', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    clearAnalyticsKeys();
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not overwrite an already-stored visitor ID', async () => {
    localStorage.setItem('mod_vid', 'existing-id-abc');
    const { getVisitorId } = await import('../../src/analytics.utils');
    const id = getVisitorId();
    expect(id).toBe('existing-id-abc');
    expect(localStorage.getItem('mod_vid')).toBe('existing-id-abc');
  });
});

// ── TC-3: migrateKeys — colo_ → mod_ migration ───────────────────────────────

describe('TC-3: migrateKeys migrates colo_ keys to mod_ keys', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    clearAnalyticsKeys();
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('copies colo_vid to mod_vid and removes the old key', async () => {
    localStorage.setItem('colo_vid', 'legacy-visitor-id');
    const { migrateKeys } = await import('../../src/analytics.utils');
    migrateKeys();
    expect(localStorage.getItem('mod_vid')).toBe('legacy-visitor-id');
    expect(localStorage.getItem('colo_vid')).toBeNull();
  });

  it('does not overwrite mod_vid if it already exists', async () => {
    localStorage.setItem('colo_vid', 'legacy-visitor-id');
    localStorage.setItem('mod_vid', 'current-visitor-id');
    const { migrateKeys } = await import('../../src/analytics.utils');
    migrateKeys();
    // mod_vid is kept; colo_vid is removed
    expect(localStorage.getItem('mod_vid')).toBe('current-visitor-id');
    expect(localStorage.getItem('colo_vid')).toBeNull();
  });
});

// ── TC-4: isOptedOut / setAnalyticsOptOut round-trip ─────────────────────────

describe('TC-4: isOptedOut / setAnalyticsOptOut round-trip', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    clearAnalyticsKeys();
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to not opted out', async () => {
    const { isOptedOut } = await import('../../src/analytics.utils');
    expect(isOptedOut()).toBe(false);
  });

  it('setAnalyticsOptOut(true) makes isOptedOut() return true', async () => {
    const { isOptedOut, setAnalyticsOptOut } = await import('../../src/analytics.utils');
    setAnalyticsOptOut(true);
    expect(isOptedOut()).toBe(true);
    expect(localStorage.getItem('mod_analytics_opt_out')).toBe('1');
  });

  it('setAnalyticsOptOut(false) clears opt-out', async () => {
    const { isOptedOut, setAnalyticsOptOut } = await import('../../src/analytics.utils');
    setAnalyticsOptOut(true);
    setAnalyticsOptOut(false);
    expect(isOptedOut()).toBe(false);
    expect(localStorage.getItem('mod_analytics_opt_out')).toBeNull();
  });
});

// ── TC-5: getTrafficSource — parses UTM params and caches ────────────────────

describe('TC-5: getTrafficSource parses UTM params from URL', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    clearAnalyticsKeys();
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a TrafficSource object with null values when no UTMs present', async () => {
    // jsdom default location has no query string
    const { getTrafficSource } = await import('../../src/analytics.utils');
    const src = getTrafficSource();
    expect(src).toHaveProperty('utm_source');
    expect(src).toHaveProperty('utm_medium');
    expect(src).toHaveProperty('utm_campaign');
    expect(src).toHaveProperty('referrer');
  });

  it('returns cached source from mod_src if already stored', async () => {
    const cached = { referrer: null, utm_source: 'twitter', utm_medium: 'social', utm_campaign: 'launch' };
    localStorage.setItem('mod_src', JSON.stringify(cached));
    const { getTrafficSource } = await import('../../src/analytics.utils');
    const src = getTrafficSource();
    expect(src.utm_source).toBe('twitter');
    expect(src.utm_medium).toBe('social');
    expect(src.utm_campaign).toBe('launch');
  });
});

// ── TC-6: getUserId — reads from Supabase auth token ─────────────────────────

describe('TC-6: getUserId reads user ID from Supabase auth token in localStorage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    clearAnalyticsKeys();
    clearAuthUser();
    vi.resetModules();
  });
  afterEach(() => {
    clearAuthUser();
    vi.useRealTimers();
  });

  it('returns null when no auth token is stored', async () => {
    const { getUserId } = await import('../../src/analytics.utils');
    expect(getUserId()).toBeNull();
  });

  it('returns the user ID from the stored auth token', async () => {
    const uid = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff';
    setAuthUser(uid);
    const { getUserId } = await import('../../src/analytics.utils');
    expect(getUserId()).toBe(uid);
  });

  it('returns null when auth token exists but has no user', async () => {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ access_token: 'tok', user: null }));
    const { getUserId } = await import('../../src/analytics.utils');
    expect(getUserId()).toBeNull();
  });
});

// ── TC-7: trackEvent — fires fetch with correct body ─────────────────────────

describe('TC-7: trackEvent fires fetch to log_event with correct body', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    clearAnalyticsKeys();
    clearAuthUser();
    vi.resetModules();
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    clearAuthUser();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('fires fetch with p_event_type in body', async () => {
    const { trackEvent } = await import('../../src/analytics');
    trackEvent('page_view');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/rest/v1/rpc/log_event');
    const body = JSON.parse(options.body as string);
    expect(body.p_event_type).toBe('page_view');
    expect(body.p_metadata).toBeDefined();
    expect(body.p_metadata.visitor_id).toBeDefined();
  });

  it('includes p_user_id when user is authenticated', async () => {
    const uid = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff';
    setAuthUser(uid);
    vi.resetModules();
    const { trackEvent } = await import('../../src/analytics');
    trackEvent('some_event');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.p_user_id).toBe(uid);
  });

  it('does not fire fetch when user is opted out', async () => {
    localStorage.setItem('mod_analytics_opt_out', '1');
    const { trackEvent } = await import('../../src/analytics');
    trackEvent('should_not_fire');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('merges extra metadata fields into p_metadata', async () => {
    const { trackEvent } = await import('../../src/analytics');
    trackEvent('custom_event', { custom_key: 'custom_val' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.p_metadata.custom_key).toBe('custom_val');
  });
});

// ── TC-8: checkSignup — fires signup event on first userId detection ──────────

describe('TC-8: checkSignup fires signup event on first userId detection', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    clearAnalyticsKeys();
    clearAuthUser();
    vi.resetModules();
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    clearAuthUser();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('fires signup event when userId is seen for the first time', async () => {
    const uid = 'bbbbcccc-dddd-eeee-ffff-000011112222';
    setAuthUser(uid);
    vi.resetModules();
    const { checkSignup } = await import('../../src/analytics');
    checkSignup();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/rest/v1/rpc/log_event');
    const body = JSON.parse(options.body as string);
    expect(body.p_event_type).toBe('signup');
    expect(body.p_metadata.new_user).toBe(true);
    // mod_uid_seen is now set
    expect(localStorage.getItem('mod_uid_seen')).toBe(uid);
  });

  it('does not fire signup if userId was already seen', async () => {
    const uid = 'bbbbcccc-dddd-eeee-ffff-000011112222';
    setAuthUser(uid);
    localStorage.setItem('mod_uid_seen', uid);
    vi.resetModules();
    const { checkSignup } = await import('../../src/analytics');
    checkSignup();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fires signup with switched:true when userId changes', async () => {
    const uid = 'ccccdddd-eeee-ffff-0000-111122223333';
    setAuthUser(uid);
    localStorage.setItem('mod_uid_seen', 'old-user-id');
    vi.resetModules();
    const { checkSignup } = await import('../../src/analytics');
    checkSignup();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.p_event_type).toBe('signup');
    expect(body.p_metadata.switched).toBe(true);
  });

  it('does not fire if opted out', async () => {
    const uid = 'ddddeeee-ffff-0000-1111-222233334444';
    setAuthUser(uid);
    localStorage.setItem('mod_analytics_opt_out', '1');
    vi.resetModules();
    const { checkSignup } = await import('../../src/analytics');
    checkSignup();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
