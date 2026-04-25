// ============================================================
// INTEGRATOR — arena-match-timers + arena-state
// Seam #016 | score: 54
// Boundary: clearMatchAcceptTimers reads matchAcceptTimer +
//           matchAcceptPollTimer from arena-state, clears them,
//           and calls set_matchAcceptTimer / set_matchAcceptPollTimer(null).
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let clearMatchAcceptTimers: () => void;
let set_matchAcceptTimer: (v: ReturnType<typeof setInterval> | null) => void;
let set_matchAcceptPollTimer: (v: ReturnType<typeof setInterval> | null) => void;
let getMatchAcceptTimer: () => ReturnType<typeof setInterval> | null;
let getMatchAcceptPollTimer: () => ReturnType<typeof setInterval> | null;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  const timersMod = await import('../../src/arena/arena-match-timers.ts');
  clearMatchAcceptTimers = timersMod.clearMatchAcceptTimers;

  const stateMod = await import('../../src/arena/arena-state.ts');
  set_matchAcceptTimer = stateMod.set_matchAcceptTimer;
  set_matchAcceptPollTimer = stateMod.set_matchAcceptPollTimer;
  getMatchAcceptTimer = () => stateMod.matchAcceptTimer;
  getMatchAcceptPollTimer = () => stateMod.matchAcceptPollTimer;
});

// ============================================================
// TC-I1: clearMatchAcceptTimers — clears matchAcceptTimer in arena-state
// ============================================================

describe('TC-I1: clearMatchAcceptTimers clears matchAcceptTimer in arena-state', () => {
  it('sets matchAcceptTimer to null after clearing', () => {
    const t = setInterval(() => {}, 5000);
    set_matchAcceptTimer(t);
    expect(getMatchAcceptTimer()).not.toBeNull();

    clearMatchAcceptTimers();

    expect(getMatchAcceptTimer()).toBeNull();
  });
});

// ============================================================
// TC-I2: clearMatchAcceptTimers — clears matchAcceptPollTimer in arena-state
// ============================================================

describe('TC-I2: clearMatchAcceptTimers clears matchAcceptPollTimer in arena-state', () => {
  it('sets matchAcceptPollTimer to null after clearing', () => {
    const t = setInterval(() => {}, 3000);
    set_matchAcceptPollTimer(t);
    expect(getMatchAcceptPollTimer()).not.toBeNull();

    clearMatchAcceptTimers();

    expect(getMatchAcceptPollTimer()).toBeNull();
  });
});

// ============================================================
// TC-I3: clearMatchAcceptTimers — clears both timers in one call
// ============================================================

describe('TC-I3: clearMatchAcceptTimers clears both timers simultaneously', () => {
  it('nulls matchAcceptTimer and matchAcceptPollTimer in a single call', () => {
    set_matchAcceptTimer(setInterval(() => {}, 5000));
    set_matchAcceptPollTimer(setInterval(() => {}, 3000));

    clearMatchAcceptTimers();

    expect(getMatchAcceptTimer()).toBeNull();
    expect(getMatchAcceptPollTimer()).toBeNull();
  });
});

// ============================================================
// TC-I4: clearMatchAcceptTimers — safe no-op when timers are already null
// ============================================================

describe('TC-I4: clearMatchAcceptTimers is safe when timers are already null', () => {
  it('does not throw when both timers are null', () => {
    // default state — timers are null
    expect(() => clearMatchAcceptTimers()).not.toThrow();
    expect(getMatchAcceptTimer()).toBeNull();
    expect(getMatchAcceptPollTimer()).toBeNull();
  });
});

// ============================================================
// ARCH — arena-match-timers.ts imports only from arena-state
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — arena-match-timers.ts imports only from arena-state', () => {
  it('has exactly one runtime import: arena-state.ts', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-match-timers.ts'),
      'utf-8'
    );
    const paths = source.split('\n')
      .filter(l => /from\s+['"]/.test(l))
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter((p): p is string => Boolean(p));
    expect(paths).toEqual(['./arena-state.ts']);
  });
});
