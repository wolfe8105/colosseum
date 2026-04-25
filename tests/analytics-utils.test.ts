// ============================================================
// ANALYTICS UTILS — tests/analytics-utils.test.ts
// Source: src/analytics.utils.ts
//
// CLASSIFICATION:
//   KEY_MIGRATIONS         — Constant data → value test
//   migrateKeys()          — Behavioral/side effect: reads/writes localStorage → Behavioral test
//   isOptedOut()           — Behavioral: reads localStorage → Behavioral test
//   setAnalyticsOptOut()   — Behavioral: writes localStorage → Behavioral test
//   getVisitorId()         — Behavioral: reads/writes localStorage + crypto → Behavioral test
//   getTrafficSource()     — Behavioral: reads/writes localStorage → Behavioral test
//   getUserId()            — Behavioral: reads localStorage using SUPABASE_URL → Behavioral test
//
// IMPORTS:
//   { SUPABASE_URL } from './config'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabaseUrl = vi.hoisted(() => ({ value: 'https://faomczmipsccwbhpivmp.supabase.co' }));

vi.mock('../src/config', () => ({
  get SUPABASE_URL() { return mockSupabaseUrl.value; },
}));

import {
  KEY_MIGRATIONS,
  migrateKeys,
  isOptedOut,
  setAnalyticsOptOut,
  getVisitorId,
  getTrafficSource,
  getUserId,
} from '../src/analytics.utils.ts';

beforeEach(() => {
  localStorage.clear();
  // Reset internal migration flag by clearing all state
  vi.resetModules();
});

// ── KEY_MIGRATIONS ────────────────────────────────────────────

describe('TC1 — KEY_MIGRATIONS: migrates colo_ keys to mod_ keys', () => {
  it('contains colo_vid → mod_vid mapping', () => {
    expect(KEY_MIGRATIONS).toContainEqual(['colo_vid', 'mod_vid']);
  });
});

describe('TC2 — KEY_MIGRATIONS: has 3 entries', () => {
  it('contains exactly 3 migration pairs', () => {
    expect(KEY_MIGRATIONS).toHaveLength(3);
  });
});

// ── isOptedOut / setAnalyticsOptOut ──────────────────────────

describe('TC3 — isOptedOut: returns false when not opted out', () => {
  it('returns false when mod_analytics_opt_out is not set', () => {
    expect(isOptedOut()).toBe(false);
  });
});

describe('TC4 — setAnalyticsOptOut: opt-out sets the flag', () => {
  it('sets mod_analytics_opt_out to "1" in localStorage', () => {
    setAnalyticsOptOut(true);
    expect(localStorage.getItem('mod_analytics_opt_out')).toBe('1');
  });
});

describe('TC5 — setAnalyticsOptOut + isOptedOut: round-trip', () => {
  it('isOptedOut returns true after opting out', () => {
    setAnalyticsOptOut(true);
    expect(isOptedOut()).toBe(true);
  });
});

describe('TC6 — setAnalyticsOptOut: opt back in removes flag', () => {
  it('removes mod_analytics_opt_out key when opting back in', () => {
    setAnalyticsOptOut(true);
    setAnalyticsOptOut(false);
    expect(localStorage.getItem('mod_analytics_opt_out')).toBeNull();
    expect(isOptedOut()).toBe(false);
  });
});

// ── getVisitorId ──────────────────────────────────────────────

describe('TC7 — getVisitorId: returns a UUID-like string', () => {
  it('returns a non-empty string', () => {
    const id = getVisitorId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('TC8 — getVisitorId: persists to localStorage on first call', () => {
  it('stores the ID in mod_vid', () => {
    const id = getVisitorId();
    expect(localStorage.getItem('mod_vid')).toBe(id);
  });
});

describe('TC9 — getVisitorId: returns same ID on second call', () => {
  it('returns the cached ID without generating a new one', () => {
    const id1 = getVisitorId();
    const id2 = getVisitorId();
    expect(id1).toBe(id2);
  });
});

describe('TC10 — getVisitorId: uses existing mod_vid if present', () => {
  it('returns the pre-seeded ID from localStorage', () => {
    localStorage.setItem('mod_vid', 'pre-seeded-id-xyz');
    const id = getVisitorId();
    expect(id).toBe('pre-seeded-id-xyz');
  });
});

// ── getTrafficSource ──────────────────────────────────────────

describe('TC11 — getTrafficSource: returns object with expected keys', () => {
  it('returns TrafficSource with referrer, utm_source, utm_medium, utm_campaign', () => {
    const src = getTrafficSource();
    expect('referrer' in src).toBe(true);
    expect('utm_source' in src).toBe(true);
    expect('utm_medium' in src).toBe(true);
    expect('utm_campaign' in src).toBe(true);
  });
});

describe('TC12 — getTrafficSource: cached value returned on second call', () => {
  it('returns the same object on second call when cache is set', () => {
    const cached = { referrer: null, utm_source: 'test', utm_medium: null, utm_campaign: null };
    localStorage.setItem('mod_src', JSON.stringify(cached));
    const src = getTrafficSource();
    expect(src.utm_source).toBe('test');
  });
});

// ── getUserId ─────────────────────────────────────────────────

describe('TC13 — getUserId: returns null when no auth token in localStorage', () => {
  it('returns null when auth token is absent', () => {
    expect(getUserId()).toBeNull();
  });
});

describe('TC14 — getUserId: extracts user.id from auth token', () => {
  it('returns the user ID from the stored auth token', () => {
    const ref = new URL(mockSupabaseUrl.value).hostname.split('.')[0];
    const key = `sb-${ref}-auth-token`;
    localStorage.setItem(key, JSON.stringify({ user: { id: 'user-uuid-123' } }));
    expect(getUserId()).toBe('user-uuid-123');
  });
});

describe('TC15 — getUserId: returns null when user.id missing from token', () => {
  it('returns null when token has no user.id', () => {
    const ref = new URL(mockSupabaseUrl.value).hostname.split('.')[0];
    const key = `sb-${ref}-auth-token`;
    localStorage.setItem(key, JSON.stringify({ user: {} }));
    expect(getUserId()).toBeNull();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/analytics.utils.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config', './config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/analytics.utils.ts'),
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
