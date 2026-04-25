// ============================================================
// ARENA MATCH TIMERS — tests/arena-match-timers.test.ts
// Source: src/arena/arena-match-timers.ts
//
// CLASSIFICATION:
//   clearMatchAcceptTimers() — Behavioral (clears intervals) → Behavioral test
//
// IMPORTS:
//   { matchAcceptTimer, matchAcceptPollTimer,
//     set_matchAcceptTimer, set_matchAcceptPollTimer } from './arena-state.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSet_matchAcceptTimer     = vi.hoisted(() => vi.fn());
const mockSet_matchAcceptPollTimer = vi.hoisted(() => vi.fn());

const stateVars = vi.hoisted(() => ({
  matchAcceptTimer: null as ReturnType<typeof setInterval> | null,
  matchAcceptPollTimer: null as ReturnType<typeof setInterval> | null,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get matchAcceptTimer()     { return stateVars.matchAcceptTimer; },
  get matchAcceptPollTimer() { return stateVars.matchAcceptPollTimer; },
  set_matchAcceptTimer: mockSet_matchAcceptTimer,
  set_matchAcceptPollTimer: mockSet_matchAcceptPollTimer,
  // stub other arena-state exports so module load succeeds
  set_view: vi.fn(),
  set_currentDebate: vi.fn(),
  set_queueStatus: vi.fn(),
}));

import { clearMatchAcceptTimers } from '../src/arena/arena-match-timers.ts';

beforeEach(() => {
  vi.useFakeTimers();
  stateVars.matchAcceptTimer = null;
  stateVars.matchAcceptPollTimer = null;
  mockSet_matchAcceptTimer.mockReset();
  mockSet_matchAcceptPollTimer.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── TC1: clearMatchAcceptTimers — no-op when both timers null ─

describe('TC1 — clearMatchAcceptTimers: no-op when both timers are null', () => {
  it('does not call set_matchAcceptTimer when timer is null', () => {
    stateVars.matchAcceptTimer = null;
    stateVars.matchAcceptPollTimer = null;
    clearMatchAcceptTimers();
    expect(mockSet_matchAcceptTimer).not.toHaveBeenCalled();
    expect(mockSet_matchAcceptPollTimer).not.toHaveBeenCalled();
  });
});

// ── TC2: clearMatchAcceptTimers — clears matchAcceptTimer ────

describe('TC2 — clearMatchAcceptTimers: clears matchAcceptTimer when set', () => {
  it('calls set_matchAcceptTimer(null) when timer is active', () => {
    stateVars.matchAcceptTimer = setInterval(() => {}, 1000);
    clearMatchAcceptTimers();
    expect(mockSet_matchAcceptTimer).toHaveBeenCalledWith(null);
  });
});

// ── TC3: clearMatchAcceptTimers — clears matchAcceptPollTimer ─

describe('TC3 — clearMatchAcceptTimers: clears matchAcceptPollTimer when set', () => {
  it('calls set_matchAcceptPollTimer(null) when poll timer is active', () => {
    stateVars.matchAcceptPollTimer = setInterval(() => {}, 1000);
    clearMatchAcceptTimers();
    expect(mockSet_matchAcceptPollTimer).toHaveBeenCalledWith(null);
  });
});

// ── TC4: clearMatchAcceptTimers — clears both when both set ──

describe('TC4 — clearMatchAcceptTimers: clears both timers when both are active', () => {
  it('calls both setters with null when both timers are active', () => {
    stateVars.matchAcceptTimer = setInterval(() => {}, 1000);
    stateVars.matchAcceptPollTimer = setInterval(() => {}, 1000);
    clearMatchAcceptTimers();
    expect(mockSet_matchAcceptTimer).toHaveBeenCalledWith(null);
    expect(mockSet_matchAcceptPollTimer).toHaveBeenCalledWith(null);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-match-timers.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./arena-state.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-match-timers.ts'),
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
