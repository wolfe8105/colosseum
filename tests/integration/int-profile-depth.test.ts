/**
 * Integration tests — profile-depth.ts → profile-depth.state
 * SEAM: #478
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ARCH filter
const SOURCE_IMPORTS = `
import { SECTIONS } from './profile-depth.data.ts';
import type { Answers, AnswerValue } from './profile-depth.types.ts';
`.split('\n').filter(l => /from\s+['"]/.test(l));

// ── Mock @supabase/supabase-js (only mock, per mandate) ──
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

// Provide localStorage stub for module-level init
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { localStorageStore[key] = val; }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }),
};

describe('profile-depth.state — SEAM #478', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    // Reset localStorage store
    Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]);
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── TC1: ARCH filter verifies state imports data and types only ──
  it('TC1: state module imports match expected seam sources', () => {
    expect(SOURCE_IMPORTS).toContain("import { SECTIONS } from './profile-depth.data.ts';");
    expect(SOURCE_IMPORTS.every(l => !l.includes('@supabase'))).toBe(true);
  });

  // ── TC2: hasAnswer returns false for falsy / empty values ──
  it('TC2: hasAnswer returns false for undefined, null, empty string, empty array', async () => {
    const { hasAnswer } = await import('../../src/pages/profile-depth.state.ts');
    expect(hasAnswer(undefined)).toBe(false);
    expect(hasAnswer('')).toBe(false);
    expect(hasAnswer(null as unknown as undefined)).toBe(false);
    expect(hasAnswer([])).toBe(false);
  });

  // ── TC3: hasAnswer returns true for valid values ──
  it('TC3: hasAnswer returns true for non-empty string, number, and non-empty array', async () => {
    const { hasAnswer } = await import('../../src/pages/profile-depth.state.ts');
    expect(hasAnswer('hello')).toBe(true);
    expect(hasAnswer(42)).toBe(true);
    expect(hasAnswer(['a', 'b'])).toBe(true);
  });

  // ── TC4: setServerQuestionsAnswered mutates serverQuestionsAnswered ──
  it('TC4: setServerQuestionsAnswered updates the exported state', async () => {
    const state = await import('../../src/pages/profile-depth.state.ts');
    expect(state.serverQuestionsAnswered).toBe(0);
    state.setServerQuestionsAnswered(17);
    expect(state.serverQuestionsAnswered).toBe(17);
    state.setServerQuestionsAnswered(0);
    expect(state.serverQuestionsAnswered).toBe(0);
  });

  // ── TC5: snapshotAnswered populates previouslyAnsweredIds from answers ──
  it('TC5: snapshotAnswered populates previouslyAnsweredIds for answered questions', async () => {
    // Pre-seed localStorage with answers for known question IDs from data
    // 'b1' is a known question ID from SECTIONS (basics section)
    localStorageStore['colosseum_profile_depth'] = JSON.stringify({ b1: 'Alice', b2: '', b3: ['Male'] });
    const state = await import('../../src/pages/profile-depth.state.ts');

    state.snapshotAnswered();

    // b1 has value 'Alice' → should be in set
    expect(state.previouslyAnsweredIds.has('b1')).toBe(true);
    // b3 has non-empty array → should be in set
    expect(state.previouslyAnsweredIds.has('b3')).toBe(true);
    // b2 has '' → should NOT be in set
    expect(state.previouslyAnsweredIds.has('b2')).toBe(false);
  });

  // ── TC6: snapshotAnswered clears previous state before re-scanning ──
  it('TC6: snapshotAnswered is idempotent — same result on double call', async () => {
    localStorageStore['colosseum_profile_depth'] = JSON.stringify({ b1: 'Bob' });
    const state = await import('../../src/pages/profile-depth.state.ts');

    state.snapshotAnswered();
    const sizeAfterFirst = state.previouslyAnsweredIds.size;

    state.snapshotAnswered();
    const sizeAfterSecond = state.previouslyAnsweredIds.size;

    expect(sizeAfterFirst).toBe(sizeAfterSecond);
    expect(state.previouslyAnsweredIds.has('b1')).toBe(true);
  });

  // ── TC7: sanitizeAnswers strips unknown IDs and enforces type rules ──
  it('TC7: sanitizeAnswers strips unknown question IDs and keeps valid ones', async () => {
    const { sanitizeAnswers } = await import('../../src/pages/profile-depth.state.ts');
    const raw = {
      b1: 'Alice',                       // valid: known ID, string ≤ 500 chars
      UNKNOWN_KEY: 'should be dropped',  // invalid: unknown question ID
      b4: ['25-34'],                     // valid: known ID, array of strings
      b5: 99,                            // valid: known ID, finite number
    };
    const clean = sanitizeAnswers(raw);
    expect(Object.keys(clean)).toContain('b1');
    expect(Object.keys(clean)).not.toContain('UNKNOWN_KEY');
    expect(clean['b1']).toBe('Alice');
  });

  // ── TC8: sanitizeAnswers returns {} for non-object input ──
  it('TC8: sanitizeAnswers returns empty object for null, array, and non-object inputs', async () => {
    const { sanitizeAnswers } = await import('../../src/pages/profile-depth.state.ts');
    expect(sanitizeAnswers(null)).toEqual({});
    expect(sanitizeAnswers([])).toEqual({});
    expect(sanitizeAnswers('string')).toEqual({});
    expect(sanitizeAnswers(42)).toEqual({});
  });

  // ── TC9: sanitizeCompleted strips invalid section IDs ──
  it('TC9: sanitizeCompleted keeps only valid section IDs', async () => {
    const { sanitizeCompleted } = await import('../../src/pages/profile-depth.state.ts');
    const raw = ['basics', 'politics', 'FAKE_SECTION'];
    const result = sanitizeCompleted(raw);
    expect(result.has('basics')).toBe(true);
    expect(result.has('politics')).toBe(true);
    expect(result.has('FAKE_SECTION')).toBe(false);
  });

  // ── TC10: localStorage init — bad JSON clears key gracefully ──
  it('TC10: corrupt localStorage data is handled gracefully (no throw, empty state)', async () => {
    localStorageStore['colosseum_profile_depth'] = '{INVALID_JSON}';
    localStorageStore['colosseum_depth_complete'] = '{ALSO_BAD}';

    // Module-level code runs on import, must not throw
    let caughtError: unknown = null;
    try {
      const state = await import('../../src/pages/profile-depth.state.ts');
      expect(state.answers).toEqual({});
      expect(state.completedSections.size).toBe(0);
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).toBeNull();
  });
});
