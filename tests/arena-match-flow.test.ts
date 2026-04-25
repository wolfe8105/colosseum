// ============================================================
// ARENA MATCH FLOW — tests/arena-match-flow.test.ts
// Source: src/arena/arena-match-flow.ts
//
// CLASSIFICATION:
//   onMatchAccept()      — async RPC + DOM → Integration test
//   onMatchConfirmed()   — DOM + nav → Behavioral test
//   onOpponentDeclined() — DOM + nav → Behavioral test
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const stateVars = vi.hoisted(() => ({
  matchFoundDebate: null as unknown,
  matchAcceptTimer: null as ReturnType<typeof setInterval> | null,
  selectedWantMod: false,
}));

const mockSet_matchAcceptTimer     = vi.hoisted(() => vi.fn((v: unknown) => { stateVars.matchAcceptTimer = v as ReturnType<typeof setInterval> | null; }));
const mockSet_matchAcceptPollTimer = vi.hoisted(() => vi.fn());
const mockSet_selectedWantMod      = vi.hoisted(() => vi.fn((v: boolean) => { stateVars.selectedWantMod = v; }));

vi.mock('../src/arena/arena-state.ts', () => ({
  get matchFoundDebate()  { return stateVars.matchFoundDebate; },
  get matchAcceptTimer()  { return stateVars.matchAcceptTimer; },
  get selectedWantMod()   { return stateVars.selectedWantMod; },
  set_matchAcceptTimer:   mockSet_matchAcceptTimer,
  set_matchAcceptPollTimer: mockSet_matchAcceptPollTimer,
  set_selectedWantMod:    mockSet_selectedWantMod,
}));

const mockSafeRpc                = vi.hoisted(() => vi.fn());
const mockIsPlaceholder          = vi.hoisted(() => vi.fn(() => true));
const mockShowPreDebate          = vi.hoisted(() => vi.fn());
const mockClearMatchAcceptTimers = vi.hoisted(() => vi.fn());
const mockReturnToQueueAfterDecline = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  isPlaceholder: mockIsPlaceholder,
}));

vi.mock('../src/arena/arena-room-predebate.ts', () => ({
  showPreDebate: mockShowPreDebate,
}));

vi.mock('../src/arena/arena-match-timers.ts', () => ({
  clearMatchAcceptTimers: mockClearMatchAcceptTimers,
}));

vi.mock('../src/arena/arena-match-found.ts', () => ({
  returnToQueueAfterDecline: mockReturnToQueueAfterDecline,
}));

vi.mock('../src/arena/arena-constants.ts', () => ({
  MATCH_ACCEPT_POLL_TIMEOUT_SEC: 30,
}));

import {
  onMatchAccept,
  onMatchConfirmed,
  onOpponentDeclined,
} from '../src/arena/arena-match-flow.ts';

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = `
    <div id="mf-status">Accept before time runs out</div>
    <button id="mf-accept-btn">ACCEPT</button>
    <button id="mf-decline-btn">DECLINE</button>
  `;
  stateVars.matchFoundDebate = null;
  stateVars.matchAcceptTimer = null;
  stateVars.selectedWantMod = false;

  mockSafeRpc.mockReset();
  mockClearMatchAcceptTimers.mockReset();
  mockShowPreDebate.mockReset();
  mockReturnToQueueAfterDecline.mockReset();
  mockSet_matchAcceptPollTimer.mockReset();
  mockIsPlaceholder.mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

// ── TC1: onMatchAccept — disables accept button ───────────────

describe('TC1 — onMatchAccept: disables accept button', () => {
  it('sets accept button to disabled', async () => {
    await onMatchAccept();
    const btn = document.getElementById('mf-accept-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

// ── TC2: onMatchAccept — updates status text ──────────────────

describe('TC2 — onMatchAccept: updates #mf-status text', () => {
  it('sets status to "Waiting for opponent"', async () => {
    await onMatchAccept();
    const statusEl = document.getElementById('mf-status')!;
    expect(statusEl.textContent).toContain('Waiting for opponent');
  });
});

// ── TC3: onMatchAccept — starts poll timer ────────────────────

describe('TC3 — onMatchAccept: starts poll timer', () => {
  it('calls set_matchAcceptPollTimer', async () => {
    await onMatchAccept();
    expect(mockSet_matchAcceptPollTimer).toHaveBeenCalledTimes(1);
  });
});

// ── TC4: onMatchConfirmed — clears timers ────────────────────

describe('TC4 — onMatchConfirmed: calls clearMatchAcceptTimers', () => {
  it('clears timers on confirmation', () => {
    onMatchConfirmed();
    expect(mockClearMatchAcceptTimers).toHaveBeenCalledTimes(1);
  });
});

// ── TC5: onMatchConfirmed — shows both ready message ─────────

describe('TC5 — onMatchConfirmed: shows both ready message', () => {
  it('updates #mf-status to "Both ready"', () => {
    onMatchConfirmed();
    expect(document.getElementById('mf-status')!.textContent).toContain('Both ready');
  });
});

// ── TC6: onMatchConfirmed — calls showPreDebate with debate ──

describe('TC6 — onMatchConfirmed: calls showPreDebate when matchFoundDebate set', () => {
  it('schedules showPreDebate after 800ms', () => {
    stateVars.matchFoundDebate = { id: 'd-1', topic: 'topic', mode: 'text', messages: [] };
    onMatchConfirmed();
    vi.advanceTimersByTime(800);
    expect(mockShowPreDebate).toHaveBeenCalledWith(stateVars.matchFoundDebate);
  });
});

// ── TC7: onOpponentDeclined — calls clearMatchAcceptTimers ───

describe('TC7 — onOpponentDeclined: calls clearMatchAcceptTimers', () => {
  it('clears timers', () => {
    onOpponentDeclined();
    expect(mockClearMatchAcceptTimers).toHaveBeenCalledTimes(1);
  });
});

// ── TC8: onOpponentDeclined — shows declined message ─────────

describe('TC8 — onOpponentDeclined: shows declined message', () => {
  it('updates #mf-status to "Opponent declined"', () => {
    onOpponentDeclined();
    expect(document.getElementById('mf-status')!.textContent).toContain('Opponent declined');
  });
});

// ── TC9: onOpponentDeclined — calls returnToQueueAfterDecline ─

describe('TC9 — onOpponentDeclined: calls returnToQueueAfterDecline after delay', () => {
  it('calls returnToQueueAfterDecline after 1500ms', () => {
    onOpponentDeclined();
    vi.advanceTimersByTime(1500);
    expect(mockReturnToQueueAfterDecline).toHaveBeenCalledTimes(1);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-match-flow.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      './arena-state.ts',
      './arena-types-match.ts',
      './arena-constants.ts',
      './arena-core.utils.ts',
      './arena-room-predebate.ts',
      './arena-match-timers.ts',
      './arena-match-found.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-match-flow.ts'),
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
