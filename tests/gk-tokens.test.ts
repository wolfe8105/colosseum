// ============================================================
// GATEKEEPER — F-15 Token Earn System
// Source: src/tokens.ts
// Spec: punch list changelog (S195, S274) + tokens.ts header comment
//
// src/tokens.ts is the Token Earn System barrel / orchestrator.
// It wires CSS animations, balance broadcast, and the auth-state
// callback that fires daily-login, milestone-load, and follower
// notification on every authenticated page load.
//
// CLASSIFICATION (per src/tokens.ts):
//   init(): Multi-step orchestration — mock each dependency
//   tokens default export: behavioral / property getters
//
// All mocks are vi.hoisted() to avoid TDZ in vi.mock factories.
// Import of module under test appears AFTER all vi.mock() calls.
// One describe block per TC.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockOnChange             = vi.hoisted(() => vi.fn());
const mockInjectCSS            = vi.hoisted(() => vi.fn());
const mockInitBroadcast        = vi.hoisted(() => vi.fn());
const mockUpdateBalanceDisplay = vi.hoisted(() => vi.fn());
const mockRpc                  = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockLoadMilestones       = vi.hoisted(() => vi.fn());
const mockClaimDailyLogin      = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockRequireTokens        = vi.hoisted(() => vi.fn());

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
  _initBroadcast:        mockInitBroadcast,
  _updateBalanceDisplay: mockUpdateBalanceDisplay,
  _rpc:                  mockRpc,
  lastKnownBalance:      42,
  requireTokens:         mockRequireTokens,
  updateBalance:         vi.fn(),
  getSummary:            vi.fn(),
  getBalance:            vi.fn(),
}));

vi.mock('../src/tokens.milestones.ts', () => ({
  _loadMilestones:       mockLoadMilestones,
  MILESTONES:            { FIRST_DEBATE: { reward: 50 } },
  claimMilestone:        vi.fn(),
  getMilestoneList:      vi.fn(() => []),
  checkProfileMilestones: vi.fn(),
}));

vi.mock('../src/tokens.claims.ts', () => ({
  claimDailyLogin:  mockClaimDailyLogin,
  claimHotTake:     vi.fn(),
  claimReaction:    vi.fn(),
  claimVote:        vi.fn(),
  claimDebate:      vi.fn(),
  claimAiSparring:  vi.fn(),
  claimPrediction:  vi.fn(),
}));

// Import AFTER mocks
import { init } from '../src/tokens.ts';
import tokens from '../src/tokens.ts';

// ── Helpers ───────────────────────────────────────────────────

/** Extract the callback registered with onChange in the most recent init() call. */
function captureCallback(): (user: unknown, profile: unknown) => void {
  return vi.mocked(mockOnChange).mock.calls.at(-1)![0] as (
    user: unknown, profile: unknown
  ) => void;
}

// ── beforeEach ────────────────────────────────────────────────

beforeEach(() => {
  mockOnChange.mockReset();
  mockInjectCSS.mockReset();
  mockInitBroadcast.mockReset();
  mockUpdateBalanceDisplay.mockReset();
  mockRpc.mockReset().mockResolvedValue({});
  mockLoadMilestones.mockReset();
  mockClaimDailyLogin.mockReset().mockResolvedValue(null);
  mockRequireTokens.mockReset();
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — init injects token animation CSS', () => {
  it('calls _injectCSS() exactly once', () => {
    init();
    expect(mockInjectCSS).toHaveBeenCalledTimes(1);
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — init initializes balance broadcast channel', () => {
  it('calls _initBroadcast() exactly once', () => {
    init();
    expect(mockInitBroadcast).toHaveBeenCalledTimes(1);
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — init registers an auth-state change callback', () => {
  it('calls onChange with a function', () => {
    init();
    expect(mockOnChange).toHaveBeenCalledWith(expect.any(Function));
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — balance display updates when profile.token_balance is non-null', () => {
  it('passes the exact balance to _updateBalanceDisplay', () => {
    init();
    const cb = captureCallback();
    cb({ id: 'u1' }, { token_balance: 350 });
    expect(mockUpdateBalanceDisplay).toHaveBeenCalledWith(350);
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — daily login claim fires when user and profile are present', () => {
  it('calls claimDailyLogin() on each authenticated state change', () => {
    init();
    const cb = captureCallback();
    cb({ id: 'u1' }, { token_balance: 100 });
    expect(mockClaimDailyLogin).toHaveBeenCalledTimes(1);
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — milestones load when user and profile are present', () => {
  it('calls _loadMilestones() on each authenticated state change', () => {
    init();
    const cb = captureCallback();
    cb({ id: 'u1' }, { token_balance: 100 });
    expect(mockLoadMilestones).toHaveBeenCalledTimes(1);
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — follower online notification fires as fire-and-forget', () => {
  it('calls _rpc with notify_followers_online and the user id', () => {
    init();
    const cb = captureCallback();
    cb({ id: 'uid-xyz' }, { token_balance: 100 });
    expect(mockRpc).toHaveBeenCalledWith('notify_followers_online', { p_user_id: 'uid-xyz' });
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — earn side-effects do not fire when user is null', () => {
  it('skips claimDailyLogin and _loadMilestones when user is null', () => {
    init();
    const cb = captureCallback();
    cb(null, { token_balance: 100 });
    expect(mockClaimDailyLogin).not.toHaveBeenCalled();
    expect(mockLoadMilestones).not.toHaveBeenCalled();
  });
});

// ── TC9 ───────────────────────────────────────────────────────

describe('TC9 — balance display does not update when profile.token_balance is null', () => {
  it('skips _updateBalanceDisplay when token_balance is null', () => {
    init();
    const cb = captureCallback();
    cb({ id: 'u1' }, { token_balance: null });
    expect(mockUpdateBalanceDisplay).not.toHaveBeenCalled();
  });
});

// ── TC10 ──────────────────────────────────────────────────────

describe('TC10 — earn side-effects do not fire when profile is null', () => {
  it('skips claimDailyLogin and _loadMilestones when profile is null', () => {
    init();
    const cb = captureCallback();
    cb({ id: 'u1' }, null);
    expect(mockClaimDailyLogin).not.toHaveBeenCalled();
    expect(mockLoadMilestones).not.toHaveBeenCalled();
  });
});

// ── TC11 ──────────────────────────────────────────────────────

describe('TC11 — default export tokens.balance getter returns lastKnownBalance', () => {
  it('tokens.balance returns the value of lastKnownBalance (42 in mock)', () => {
    expect(tokens.balance).toBe(42);
  });
});

// ── TC12 ──────────────────────────────────────────────────────

describe('TC12 — default export exposes requireTokens as a callable', () => {
  it('tokens.requireTokens is a function', () => {
    expect(typeof tokens.requireTokens).toBe('function');
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — src/tokens.ts imports only from its declared sub-modules', () => {
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
    const importLines = source
      .split('\n')
      .filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import path: ${path}`).toContain(path);
    }
  });
});
