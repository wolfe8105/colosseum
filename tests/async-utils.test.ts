// ============================================================
// ASYNC UTILS — tests/async-utils.test.ts
// Source: src/async.utils.ts
//
// CLASSIFICATION:
//   _timeAgo()             — Pure calculation → Unit test
//   _enterArenaWithTopic() — Behavioral: calls navigateTo (import contract) + setTimeout
//                           → Behavioral test with mock + fake timers
//
// IMPORTS:
//   { navigateTo } from './navigation.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNavigateTo = vi.hoisted(() => vi.fn());

vi.mock('../src/navigation.ts', () => ({
  navigateTo: mockNavigateTo,
}));

import { _timeAgo, _enterArenaWithTopic } from '../src/async.utils.ts';

beforeEach(() => {
  mockNavigateTo.mockReset();
  vi.useRealTimers();
});

// ── _timeAgo ──────────────────────────────────────────────────

describe('TC1 — _timeAgo: null/undefined/empty returns empty string', () => {
  it('returns empty string for null', () => {
    expect(_timeAgo(null)).toBe('');
    expect(_timeAgo(undefined)).toBe('');
    expect(_timeAgo('')).toBe('');
  });
});

describe('TC2 — _timeAgo: less than 1 minute returns "now"', () => {
  it('returns "now" for a timestamp 30 seconds ago', () => {
    const ts = new Date(Date.now() - 30_000).toISOString();
    expect(_timeAgo(ts)).toBe('now');
  });
});

describe('TC3 — _timeAgo: 2 minutes ago returns "2m"', () => {
  it('returns "2m" for a timestamp 2 minutes ago', () => {
    const ts = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    expect(_timeAgo(ts)).toBe('2m');
  });
});

describe('TC4 — _timeAgo: 3 hours ago returns "3h"', () => {
  it('returns "3h" for a timestamp 3 hours ago', () => {
    const ts = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(_timeAgo(ts)).toBe('3h');
  });
});

describe('TC5 — _timeAgo: 2 days ago returns "2d"', () => {
  it('returns "2d" for a timestamp 2 days ago', () => {
    const ts = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(_timeAgo(ts)).toBe('2d');
  });
});

// ── _enterArenaWithTopic ──────────────────────────────────────

describe('TC6 — _enterArenaWithTopic: calls navigateTo("arena") after delay', () => {
  it('calls navigateTo with "arena" after 800ms', () => {
    vi.useFakeTimers();
    _enterArenaWithTopic('Climate change');
    expect(mockNavigateTo).not.toHaveBeenCalled();
    vi.advanceTimersByTime(800);
    expect(mockNavigateTo).toHaveBeenCalledTimes(1);
    expect(mockNavigateTo).toHaveBeenCalledWith('arena');
  });
});

describe('TC7 — _enterArenaWithTopic: import contract — calls navigateTo', () => {
  it('navigateTo mock is called (import contract)', () => {
    vi.useFakeTimers();
    _enterArenaWithTopic('any topic');
    vi.advanceTimersByTime(800);
    expect(mockNavigateTo).toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/async.utils.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./navigation.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/async.utils.ts'),
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
