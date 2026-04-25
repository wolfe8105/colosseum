// ============================================================
// ARENA ENTRANCE — tests/arena-entrance.test.ts
// Source: src/arena/arena-entrance.ts
//
// CLASSIFICATION:
//   playEntranceSequence() — Orchestration + DOM + timers → Integration test
//
// IMPORTS:
//   { getCurrentProfile } from '../auth.ts'
//   { playSound }         from './arena-sounds.ts'
//   type { CurrentDebate } from './arena-types.ts'
//   { injectEntranceCSS } from './arena-entrance-css.ts'
//   { renderTier1, renderTier2, renderTier3 } from './arena-entrance-render.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetCurrentProfile  = vi.hoisted(() => vi.fn(() => null));
const mockPlaySound          = vi.hoisted(() => vi.fn());
const mockInjectEntranceCSS  = vi.hoisted(() => vi.fn());
const mockRenderTier1        = vi.hoisted(() => vi.fn());
const mockRenderTier2        = vi.hoisted(() => vi.fn());
const mockRenderTier3        = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/arena/arena-sounds.ts', () => ({
  playSound: mockPlaySound,
}));

vi.mock('../src/arena/arena-entrance-css.ts', () => ({
  injectEntranceCSS: mockInjectEntranceCSS,
}));

vi.mock('../src/arena/arena-entrance-render.ts', () => ({
  renderTier1: mockRenderTier1,
  renderTier2: mockRenderTier2,
  renderTier3: mockRenderTier3,
}));

import { playEntranceSequence } from '../src/arena/arena-entrance.ts';

const makeDebate = (overrides = {}) => ({
  debateId: 'debate-1',
  opponentName: 'Bob',
  opponentElo: 1100,
  mode: 'live' as const,
  ranked: false,
  topic: 'AI will take jobs',
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
  mockGetCurrentProfile.mockReset().mockReturnValue(null);
  mockPlaySound.mockReset();
  mockInjectEntranceCSS.mockReset();
  mockRenderTier1.mockReset();
  mockRenderTier2.mockReset();
  mockRenderTier3.mockReset();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

// ── TC1: playEntranceSequence — calls injectEntranceCSS ──────

describe('TC1 — playEntranceSequence: calls injectEntranceCSS', () => {
  it('injects entrance CSS on call', async () => {
    const p = playEntranceSequence(makeDebate() as never);
    vi.runAllTimers();
    await p;
    expect(mockInjectEntranceCSS).toHaveBeenCalledTimes(1);
  });
});

// ── TC2: playEntranceSequence — appends ent-stage to body ────

describe('TC2 — playEntranceSequence: appends #ent-stage to document.body', () => {
  it('creates and appends div.ent-stage to body', async () => {
    const p = playEntranceSequence(makeDebate() as never);
    // Stage is appended synchronously before the timer
    expect(document.getElementById('ent-stage')).not.toBeNull();
    vi.runAllTimers();
    await p;
  });
});

// ── TC3: playEntranceSequence — tier 1 when no profile ───────

describe('TC3 — playEntranceSequence: uses renderTier1 when profile is null', () => {
  it('calls renderTier1 when getCurrentProfile returns null', async () => {
    mockGetCurrentProfile.mockReturnValue(null);
    const p = playEntranceSequence(makeDebate() as never);
    vi.runAllTimers();
    await p;
    expect(mockRenderTier1).toHaveBeenCalledTimes(1);
    expect(mockRenderTier2).not.toHaveBeenCalled();
    expect(mockRenderTier3).not.toHaveBeenCalled();
  });
});

// ── TC4: playEntranceSequence — tier 1 for <5 debates ────────

describe('TC4 — playEntranceSequence: uses renderTier1 for fewer than 5 debates', () => {
  it('calls renderTier1 when debates_completed < 5 regardless of win rate', async () => {
    mockGetCurrentProfile.mockReturnValue({ wins: 10, losses: 0, debates_completed: 4, elo_rating: 1500, display_name: 'Pro' });
    const p = playEntranceSequence(makeDebate() as never);
    vi.runAllTimers();
    await p;
    expect(mockRenderTier1).toHaveBeenCalledTimes(1);
  });
});

// ── TC5: playEntranceSequence — tier 3 for high win rate ─────

describe('TC5 — playEntranceSequence: uses renderTier3 for win rate > 50%', () => {
  it('calls renderTier3 when wins > losses and debates_completed >= 5', async () => {
    mockGetCurrentProfile.mockReturnValue({ wins: 8, losses: 2, debates_completed: 10, elo_rating: 1500, display_name: 'Pro' });
    const p = playEntranceSequence(makeDebate() as never);
    vi.runAllTimers();
    await p;
    expect(mockRenderTier3).toHaveBeenCalledTimes(1);
  });
});

// ── TC6: playEntranceSequence — tier 2 for mid win rate ──────

describe('TC6 — playEntranceSequence: uses renderTier2 for win rate 26-50%', () => {
  it('calls renderTier2 when win rate is between 26% and 50%', async () => {
    mockGetCurrentProfile.mockReturnValue({ wins: 4, losses: 6, debates_completed: 10, elo_rating: 1200, display_name: 'Mid' });
    const p = playEntranceSequence(makeDebate() as never);
    vi.runAllTimers();
    await p;
    expect(mockRenderTier2).toHaveBeenCalledTimes(1);
  });
});

// ── TC7: playEntranceSequence — resolves after DURATION ──────

describe('TC7 — playEntranceSequence: promise resolves after animation timeout', () => {
  it('resolves the returned promise after timers run', async () => {
    const p = playEntranceSequence(makeDebate() as never);
    vi.runAllTimers();
    await expect(p).resolves.toBeUndefined();
  });
});

// ── TC8: playEntranceSequence — removes stage after DURATION ─

describe('TC8 — playEntranceSequence: removes #ent-stage from DOM after animation', () => {
  it('stage element is removed after timers complete', async () => {
    const p = playEntranceSequence(makeDebate() as never);
    vi.runAllTimers();
    await p;
    expect(document.getElementById('ent-stage')).toBeNull();
  });
});

// ── TC9: playEntranceSequence — calls playSound ──────────────

describe('TC9 — playEntranceSequence: calls playSound with roundStart', () => {
  it('plays roundStart sound', async () => {
    const p = playEntranceSequence(makeDebate() as never);
    vi.runAllTimers();
    await p;
    expect(mockPlaySound).toHaveBeenCalledWith('roundStart');
  });
});

// ── TC10: playEntranceSequence — AI opponent passed through ──

describe('TC10 — playEntranceSequence: passes isAI=true to renderer when mode is ai', () => {
  it('renderTier1 receives isAI=true for ai mode debate', async () => {
    mockGetCurrentProfile.mockReturnValue(null);
    const p = playEntranceSequence(makeDebate({ mode: 'ai' }) as never);
    vi.runAllTimers();
    await p;
    const [, , , , , , , isAI] = mockRenderTier1.mock.calls[0];
    expect(isAI).toBe(true);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-entrance.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      './arena-sounds.ts',
      './arena-types.ts',
      './arena-entrance-css.ts',
      './arena-entrance-render.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-entrance.ts'),
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
