// ============================================================
// ANALYTICS — tests/analytics.test.ts
// Source: src/analytics.ts
//
// CLASSIFICATION:
//   trackEvent()   — Behavioral: calls isOptedOut, getVisitorId, getTrafficSource,
//                    getUserId, then fetch() and window.posthog
//                    → Behavioral test — mock imports, spy on fetch
//   checkSignup()  — Multi-step orchestration: isOptedOut, migrateKeys, getUserId,
//                    localStorage, trackEvent()
//                    → Behavioral test — mock imports, spy on localStorage
//   ModeratorAnalytics — re-export object, verified via individual function tests
//
// IMPORTS:
//   { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'
//   { migrateKeys, isOptedOut, setAnalyticsOptOut, getVisitorId,
//     getTrafficSource, getUserId }  from './analytics.utils'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockIsOptedOut    = vi.hoisted(() => vi.fn(() => false));
const mockMigrateKeys   = vi.hoisted(() => vi.fn());
const mockGetVisitorId  = vi.hoisted(() => vi.fn(() => 'vid-test'));
const mockGetTrafficSource = vi.hoisted(() => vi.fn(() => ({
  referrer: 'https://example.com',
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
})));
const mockGetUserId     = vi.hoisted(() => vi.fn(() => null));
const mockSetAnalyticsOptOut = vi.hoisted(() => vi.fn());

vi.mock('../src/config', () => ({
  SUPABASE_URL: 'https://fake.supabase.co',
  SUPABASE_ANON_KEY: 'fake-anon-key',
}));

vi.mock('../src/analytics.utils', () => ({
  isOptedOut: mockIsOptedOut,
  migrateKeys: mockMigrateKeys,
  setAnalyticsOptOut: mockSetAnalyticsOptOut,
  getVisitorId: mockGetVisitorId,
  getTrafficSource: mockGetTrafficSource,
  getUserId: mockGetUserId,
}));

import { trackEvent, checkSignup, ModeratorAnalytics } from '../src/analytics.ts';

beforeEach(() => {
  mockIsOptedOut.mockReturnValue(false);
  mockGetVisitorId.mockReturnValue('vid-test');
  mockGetTrafficSource.mockReturnValue({
    referrer: 'https://example.com',
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
  });
  mockGetUserId.mockReturnValue(null);
  mockMigrateKeys.mockReset();
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));
  localStorage.clear();
});

// ── TC1: trackEvent — skips when opted out ────────────────────

describe('TC1 — trackEvent: no-op when opted out', () => {
  it('does not call fetch when isOptedOut returns true', async () => {
    mockIsOptedOut.mockReturnValue(true);
    trackEvent('page_view');
    expect(fetch).not.toHaveBeenCalled();
  });
});

// ── TC2: trackEvent — calls fetch with correct URL ───────────

describe('TC2 — trackEvent: calls fetch with the Supabase log_event endpoint', () => {
  it('posts to /rest/v1/rpc/log_event', () => {
    trackEvent('page_view');
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('/rest/v1/rpc/log_event');
  });
});

// ── TC3: trackEvent — uses visitor ID from getVisitorId ──────

describe('TC3 — trackEvent: includes visitor_id from getVisitorId', () => {
  it('calls getVisitorId and includes result in metadata', () => {
    mockGetVisitorId.mockReturnValue('vis-xyz');
    trackEvent('page_view');
    expect(mockGetVisitorId).toHaveBeenCalled();
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.p_metadata.visitor_id).toBe('vis-xyz');
  });
});

// ── TC4: trackEvent — includes event type as p_event_type ────

describe('TC4 — trackEvent: sends p_event_type in request body', () => {
  it('p_event_type matches the eventType argument', () => {
    trackEvent('debate_started');
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.p_event_type).toBe('debate_started');
  });
});

// ── TC5: trackEvent — includes user_id when authenticated ────

describe('TC5 — trackEvent: includes p_user_id when getUserId returns a UUID', () => {
  it('adds p_user_id to body when a user ID is present', () => {
    mockGetUserId.mockReturnValue('user-uuid-123');
    trackEvent('page_view');
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.p_user_id).toBe('user-uuid-123');
  });
});

// ── TC6: trackEvent — omits p_user_id when anonymous ─────────

describe('TC6 — trackEvent: omits p_user_id for anonymous users', () => {
  it('does not include p_user_id when getUserId returns null', () => {
    mockGetUserId.mockReturnValue(null);
    trackEvent('page_view');
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).not.toHaveProperty('p_user_id');
  });
});

// ── TC7: trackEvent — merges extra fields into metadata ──────

describe('TC7 — trackEvent: merges extra fields into p_metadata', () => {
  it('extra fields appear in p_metadata', () => {
    trackEvent('signup', { new_user: true, campaign: 'launch' });
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.p_metadata.new_user).toBe(true);
    expect(body.p_metadata.campaign).toBe('launch');
  });
});

// ── TC8: checkSignup — skips when opted out ───────────────────

describe('TC8 — checkSignup: no-op when opted out', () => {
  it('does not fire trackEvent when isOptedOut returns true', () => {
    mockIsOptedOut.mockReturnValue(true);
    checkSignup();
    expect(fetch).not.toHaveBeenCalled();
  });
});

// ── TC9: checkSignup — tracks signup for new user ────────────

describe('TC9 — checkSignup: tracks signup for first-seen user', () => {
  it('calls trackEvent("signup") when user has no prior mod_uid_seen', () => {
    mockGetUserId.mockReturnValue('new-user-id');
    checkSignup();
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.p_event_type).toBe('signup');
    expect(body.p_metadata.new_user).toBe(true);
  });
});

// ── TC10: checkSignup — no duplicate for seen user ───────────

describe('TC10 — checkSignup: does not re-fire for already-seen user', () => {
  it('does not call trackEvent when mod_uid_seen matches current userId', () => {
    localStorage.setItem('mod_uid_seen', 'same-user-id');
    mockGetUserId.mockReturnValue('same-user-id');
    checkSignup();
    expect(fetch).not.toHaveBeenCalled();
  });
});

// ── TC11: ModeratorAnalytics object exports the right functions ─

describe('TC11 — ModeratorAnalytics: exports expected function references', () => {
  it('contains trackEvent, checkSignup, getVisitorId, getTrafficSource, getUserId, isOptedOut, setAnalyticsOptOut', () => {
    expect(typeof ModeratorAnalytics.trackEvent).toBe('function');
    expect(typeof ModeratorAnalytics.checkSignup).toBe('function');
    expect(typeof ModeratorAnalytics.getVisitorId).toBe('function');
    expect(typeof ModeratorAnalytics.getTrafficSource).toBe('function');
    expect(typeof ModeratorAnalytics.getUserId).toBe('function');
    expect(typeof ModeratorAnalytics.isOptedOut).toBe('function');
    expect(typeof ModeratorAnalytics.setAnalyticsOptOut).toBe('function');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/analytics.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config', './analytics.utils'];
    const source = readFileSync(
      resolve(__dirname, '../src/analytics.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
