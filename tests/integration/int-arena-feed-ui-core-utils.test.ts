// ============================================================
// INTEGRATOR — seam #051 | src/arena/arena-feed-ui.ts → arena-core.utils
// Boundary:
//   arena-feed-ui.updateTimerDisplay() delegates timer string formatting to
//   formatTimer() from arena-core.utils.  This file exercises that single
//   cross-module seam — the only import arena-feed-ui takes from
//   arena-core.utils — plus the pure formatTimer() utility itself.
// Mock boundary: @supabase/supabase-js only.
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let updateTimerDisplay: () => void;
let set_timeLeft: (v: number) => void;
let formatTimer: (sec: number) => string;

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  document.body.innerHTML = '<div id="screen-main"></div>';

  const uiMod = await import('../../src/arena/arena-feed-ui.ts');
  updateTimerDisplay = uiMod.updateTimerDisplay;

  const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
  set_timeLeft = feedStateMod.set_timeLeft;

  const utilsMod = await import('../../src/arena/arena-core.utils.ts');
  formatTimer = utilsMod.formatTimer;
});

// ============================================================
// TC-1: formatTimer — zero seconds formats as "0:00"
// ============================================================

describe('TC-1: formatTimer(0) returns "0:00"', () => {
  it('formats zero seconds', () => {
    expect(formatTimer(0)).toBe('0:00');
  });
});

// ============================================================
// TC-2: formatTimer — single-digit seconds get zero-padded
// ============================================================

describe('TC-2: formatTimer(9) returns "0:09"', () => {
  it('zero-pads seconds under 10', () => {
    expect(formatTimer(9)).toBe('0:09');
  });
});

// ============================================================
// TC-3: formatTimer — minutes and seconds round-trip correctly
// ============================================================

describe('TC-3: formatTimer(90) returns "1:30"', () => {
  it('converts 90 seconds to "1:30"', () => {
    expect(formatTimer(90)).toBe('1:30');
  });
});

// ============================================================
// TC-4: updateTimerDisplay writes formatTimer(timeLeft) into #feed-timer
// ============================================================

describe('TC-4: updateTimerDisplay — writes formatted time to #feed-timer', () => {
  it('sets #feed-timer textContent to formatTimer(timeLeft)', () => {
    document.body.innerHTML += '<div id="feed-timer"></div>';
    set_timeLeft(65);
    updateTimerDisplay();
    const timerEl = document.getElementById('feed-timer');
    expect(timerEl).not.toBeNull();
    expect(timerEl!.textContent).toBe('1:05');
  });
});

// ============================================================
// TC-5: updateTimerDisplay clamps negative timeLeft to 0
// ============================================================

describe('TC-5: updateTimerDisplay — clamps negative timeLeft to 0', () => {
  it('displays "0:00" when timeLeft is negative', () => {
    document.body.innerHTML += '<div id="feed-timer"></div>';
    set_timeLeft(-5);
    updateTimerDisplay();
    const timerEl = document.getElementById('feed-timer');
    expect(timerEl!.textContent).toBe('0:00');
  });
});

// ============================================================
// TC-6: updateTimerDisplay is a no-op when #feed-timer is absent
// ============================================================

describe('TC-6: updateTimerDisplay — no-op when #feed-timer absent', () => {
  it('does not throw when element is missing', () => {
    // document.body.innerHTML is just the base screen-main div, no #feed-timer
    set_timeLeft(30);
    expect(() => updateTimerDisplay()).not.toThrow();
  });
});

// ============================================================
// TC-7: formatTimer — exact boundary at 60 seconds
// ============================================================

describe('TC-7: formatTimer(60) returns "1:00"', () => {
  it('handles the 60-second boundary', () => {
    expect(formatTimer(60)).toBe('1:00');
  });
});

// ============================================================
// ARCH — seam #051
// ============================================================

describe('ARCH — seam #051', () => {
  it('src/arena/arena-feed-ui.ts still imports arena-core.utils', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-feed-ui.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-core.utils'))).toBe(true);
  });
});
