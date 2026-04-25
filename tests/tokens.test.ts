// ============================================================
// TOKENS BARREL — tests/tokens.test.ts
// Source: src/tokens.ts
//
// CLASSIFICATION:
//   init(): Behavioral — calls _injectCSS, _initBroadcast, registers
//           onChange callback that wires daily login + milestones
//
// IMPORTS:
//   { onChange }              from './auth.ts'
//   { _injectCSS }            from './tokens.animations.ts'
//   { _initBroadcast, _updateBalanceDisplay, _rpc, ... }
//                             from './tokens.balance.ts'
//   { _loadMilestones, ... }  from './tokens.milestones.ts'
//   { claimDailyLogin, ... }  from './tokens.claims.ts'
//
// NOTE: tokens.ts calls init() at module load time (readyState === 'complete'
// in jsdom). TC1-TC3 verify the side-effects of that initial call.
// TC4-TC7 extract the onChange callback and drive it with test data.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockOnChange            = vi.hoisted(() => vi.fn());
const mockInjectCSS           = vi.hoisted(() => vi.fn());
const mockInitBroadcast       = vi.hoisted(() => vi.fn());
const mockUpdateBalanceDisplay = vi.hoisted(() => vi.fn());
const mockRpc                 = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockLoadMilestones      = vi.hoisted(() => vi.fn());
const mockClaimDailyLogin     = vi.hoisted(() => vi.fn().mockResolvedValue(null));

vi.mock('../src/auth.ts', () => ({
  onChange: mockOnChange,
  ready: Promise.resolve(),
  getCurrentUser: vi.fn(),
  getCurrentProfile: vi.fn(),
}));

vi.mock('../src/tokens.animations.ts', () => ({
  _injectCSS: mockInjectCSS,
}));

vi.mock('../src/tokens.balance.ts', () => ({
  _initBroadcast: mockInitBroadcast,
  _updateBalanceDisplay: mockUpdateBalanceDisplay,
  _rpc: mockRpc,
  lastKnownBalance: 0,
  requireTokens: vi.fn(),
  updateBalance: vi.fn(),
  getSummary: vi.fn(),
  getBalance: vi.fn(),
}));

vi.mock('../src/tokens.milestones.ts', () => ({
  _loadMilestones: mockLoadMilestones,
  MILESTONES: {},
  claimMilestone: vi.fn(),
  getMilestoneList: vi.fn(() => []),
  checkProfileMilestones: vi.fn(),
}));

vi.mock('../src/tokens.claims.ts', () => ({
  claimDailyLogin: mockClaimDailyLogin,
  claimHotTake: vi.fn(),
  claimReaction: vi.fn(),
  claimVote: vi.fn(),
  claimDebate: vi.fn(),
  claimAiSparring: vi.fn(),
  claimPrediction: vi.fn(),
}));

// Import AFTER mocks
import { init } from '../src/tokens.ts';

// NOTE: tokens.ts runs init() via DOMContentLoaded if readyState==='loading',
// which means it may not fire during module evaluation in jsdom.
// Each TC below calls init() directly to guarantee the side-effects run.

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — init calls _injectCSS', () => {
  it('_injectCSS is called by init()', () => {
    mockInjectCSS.mockClear();
    init();
    expect(mockInjectCSS).toHaveBeenCalledTimes(1);
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — init calls _initBroadcast', () => {
  it('_initBroadcast is called by init()', () => {
    mockInitBroadcast.mockClear();
    init();
    expect(mockInitBroadcast).toHaveBeenCalledTimes(1);
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — init registers onChange callback', () => {
  it('onChange is called with a function', () => {
    mockOnChange.mockClear();
    init();
    expect(mockOnChange).toHaveBeenCalledWith(expect.any(Function));
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — onChange callback calls _updateBalanceDisplay when profile has token_balance', () => {
  it('passes token_balance to _updateBalanceDisplay', () => {
    mockOnChange.mockClear();
    init();
    const callback = vi.mocked(mockOnChange).mock.calls[0][0] as (
      user: unknown, profile: unknown
    ) => void;
    mockUpdateBalanceDisplay.mockClear();
    callback({ id: 'user-1' }, { token_balance: 750 });
    expect(mockUpdateBalanceDisplay).toHaveBeenCalledWith(750);
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — onChange callback calls claimDailyLogin when user + profile present', () => {
  it('claimDailyLogin is invoked by the registered callback', () => {
    mockOnChange.mockClear();
    init();
    const callback = vi.mocked(mockOnChange).mock.calls[0][0] as (
      user: unknown, profile: unknown
    ) => void;
    mockClaimDailyLogin.mockClear();
    callback({ id: 'user-1' }, { token_balance: 100 });
    expect(mockClaimDailyLogin).toHaveBeenCalled();
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — onChange callback calls _loadMilestones when user + profile present', () => {
  it('_loadMilestones is invoked by the registered callback', () => {
    mockOnChange.mockClear();
    init();
    const callback = vi.mocked(mockOnChange).mock.calls[0][0] as (
      user: unknown, profile: unknown
    ) => void;
    mockLoadMilestones.mockClear();
    callback({ id: 'user-1' }, { token_balance: 100 });
    expect(mockLoadMilestones).toHaveBeenCalled();
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — onChange callback calls _rpc notify_followers_online with user id', () => {
  it('_rpc is invoked with notify_followers_online and p_user_id', () => {
    mockOnChange.mockClear();
    init();
    const callback = vi.mocked(mockOnChange).mock.calls[0][0] as (
      user: unknown, profile: unknown
    ) => void;
    mockRpc.mockClear();
    callback({ id: 'uid-abc' }, { token_balance: 100 });
    expect(mockRpc).toHaveBeenCalledWith('notify_followers_online', { p_user_id: 'uid-abc' });
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — onChange callback does nothing when user is null', () => {
  it('no side-effect calls when user is null', () => {
    mockOnChange.mockClear();
    init();
    const callback = vi.mocked(mockOnChange).mock.calls[0][0] as (
      user: unknown, profile: unknown
    ) => void;
    mockClaimDailyLogin.mockClear();
    mockLoadMilestones.mockClear();
    callback(null, { token_balance: 100 });
    expect(mockClaimDailyLogin).not.toHaveBeenCalled();
    expect(mockLoadMilestones).not.toHaveBeenCalled();
  });
});

// ── TC9 ───────────────────────────────────────────────────────

describe('TC9 — onChange callback does not call _updateBalanceDisplay when token_balance is null', () => {
  it('skips balance update when profile.token_balance is null', () => {
    mockOnChange.mockClear();
    init();
    const callback = vi.mocked(mockOnChange).mock.calls[0][0] as (
      user: unknown, profile: unknown
    ) => void;
    mockUpdateBalanceDisplay.mockClear();
    callback({ id: 'u1' }, { token_balance: null });
    expect(mockUpdateBalanceDisplay).not.toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/tokens.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './auth.ts',
      './tokens.animations.ts',
      './tokens.balance.ts',
      './tokens.milestones.ts',
      './tokens.claims.ts',
      './tokens.types.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/tokens.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
