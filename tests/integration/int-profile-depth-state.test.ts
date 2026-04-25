/**
 * Integration tests — profile-depth.state.ts → profile-depth.data
 * SEAM: #254
 * 7 TCs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// No Supabase calls in this module — mock is provided for any transitive import safety
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  })),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  // Reset localStorage for each test
  localStorage.clear();
});

// ── ARCH CHECK ──────────────────────────────────────────────────────────────
describe('ARCH — profile-depth.state imports only from profile-depth.data and profile-depth.types', () => {
  it('contains no forbidden imports', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/profile-depth.state.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const forbidden = ['webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics'];
    for (const line of importLines) {
      for (const term of forbidden) {
        expect(line).not.toContain(term);
      }
    }
    // Must import from profile-depth.data
    expect(importLines.some(l => l.includes('profile-depth.data'))).toBe(true);
  });
});

// ── TC1 ──────────────────────────────────────────────────────────────────────
describe('TC1 — sanitizeAnswers accepts valid question IDs and rejects unknown IDs', () => {
  it('keeps answers for real question IDs and strips unknown keys', async () => {
    const { sanitizeAnswers } = await import('../../src/pages/profile-depth.state.ts');
    const raw = {
      b1: 'Alice',          // valid — basics question
      UNKNOWN_KEY: 'hack',  // invalid — not in any section
      p1: 5,                // valid — politics slider
    };
    const result = sanitizeAnswers(raw);
    expect(result['b1']).toBe('Alice');
    expect(result['p1']).toBe(5);
    expect('UNKNOWN_KEY' in result).toBe(false);
  });
});

// ── TC2 ──────────────────────────────────────────────────────────────────────
describe('TC2 — sanitizeAnswers enforces value type and size constraints', () => {
  it('accepts string≤500, finite number, string[]≤20; rejects oversized string and invalid array', async () => {
    const { sanitizeAnswers } = await import('../../src/pages/profile-depth.state.ts');

    const longString = 'x'.repeat(501);
    const validArray = ['a', 'b'];
    const oversizedArray = Array.from({ length: 21 }, (_, i) => `item${i}`);

    const raw = {
      b1: longString,    // too long — should be dropped
      b3: validArray,    // valid chips array
      b4: oversizedArray, // too many items — should be dropped
      p1: 7,             // valid number
      p4: NaN,           // invalid number — NaN is not finite
    };
    const result = sanitizeAnswers(raw);

    expect('b1' in result).toBe(false);     // oversized string rejected
    expect(result['b3']).toEqual(validArray);
    expect('b4' in result).toBe(false);     // oversized array rejected
    expect(result['p1']).toBe(7);
    expect('p4' in result).toBe(false);     // NaN rejected
  });
});

// ── TC3 ──────────────────────────────────────────────────────────────────────
describe('TC3 — sanitizeCompleted accepts valid section IDs and rejects unknown ones', () => {
  it('returns Set with known section IDs only', async () => {
    const { sanitizeCompleted } = await import('../../src/pages/profile-depth.state.ts');
    const raw = ['basics', 'politics', 'FAKE_SECTION', 'sports'];
    const result = sanitizeCompleted(raw);
    expect(result.has('basics')).toBe(true);
    expect(result.has('politics')).toBe(true);
    expect(result.has('sports')).toBe(true);
    expect(result.has('FAKE_SECTION')).toBe(false);
  });
});

// ── TC4 ──────────────────────────────────────────────────────────────────────
describe('TC4 — sanitizeCompleted returns empty Set for non-array input', () => {
  it('returns empty Set when given null, object, or string', async () => {
    const { sanitizeCompleted } = await import('../../src/pages/profile-depth.state.ts');
    expect(sanitizeCompleted(null).size).toBe(0);
    expect(sanitizeCompleted({ id: 'basics' }).size).toBe(0);
    expect(sanitizeCompleted('basics').size).toBe(0);
  });
});

// ── TC5 ──────────────────────────────────────────────────────────────────────
describe('TC5 — snapshotAnswered populates previouslyAnsweredIds from current answers', () => {
  it('adds IDs for answered questions and clears stale IDs on re-call', async () => {
    // Pre-seed localStorage with answers so the module picks them up on init
    localStorage.setItem(
      'colosseum_profile_depth',
      JSON.stringify({ b1: 'Alice', p1: 5 })
    );

    const mod = await import('../../src/pages/profile-depth.state.ts');
    mod.snapshotAnswered();

    expect(mod.previouslyAnsweredIds.has('b1')).toBe(true);
    expect(mod.previouslyAnsweredIds.has('p1')).toBe(true);
    // unanswered question should not be in the snapshot
    expect(mod.previouslyAnsweredIds.has('b2')).toBe(false);

    // After clearing answers and re-snapshotting, set should be empty
    mod.setAnswer('b1', '');
    mod.setAnswer('p1', '');
    // Re-seed module answers via setAnswer then snapshot
    mod.snapshotAnswered();
    // b1 and p1 now have empty string — hasAnswer returns false
    expect(mod.previouslyAnsweredIds.has('b1')).toBe(false);
    expect(mod.previouslyAnsweredIds.has('p1')).toBe(false);
  });
});

// ── TC6 ──────────────────────────────────────────────────────────────────────
describe('TC6 — hasAnswer returns correct truth values', () => {
  it('returns false for undefined, empty string, null, empty array; true for real values', async () => {
    const { hasAnswer } = await import('../../src/pages/profile-depth.state.ts');
    expect(hasAnswer(undefined)).toBe(false);
    expect(hasAnswer('')).toBe(false);
    expect(hasAnswer(null as unknown as undefined)).toBe(false);
    expect(hasAnswer([])).toBe(false);
    expect(hasAnswer('Alice')).toBe(true);
    expect(hasAnswer(0)).toBe(true);     // 0 is a valid number answer
    expect(hasAnswer(5)).toBe(true);
    expect(hasAnswer(['a'])).toBe(true);
  });
});

// ── TC7 ──────────────────────────────────────────────────────────────────────
describe('TC7 — localStorage init: invalid JSON clears key and starts with empty state', () => {
  it('initialises answers to {} and completedSections to empty Set when localStorage has corrupt data', async () => {
    localStorage.setItem('colosseum_profile_depth', '{NOT VALID JSON}');
    localStorage.setItem('colosseum_depth_complete', 'BAD');

    const mod = await import('../../src/pages/profile-depth.state.ts');

    // After corrupt init, answers should be empty object
    expect(Object.keys(mod.answers).length).toBe(0);
    // After corrupt init, completedSections should be empty
    expect(mod.completedSections.size).toBe(0);
  });
});
