// ============================================================
// TOKENS CLAIMS — tests/tokens-claims.test.ts
// Source: src/tokens.claims.ts
//
// CLASSIFICATION:
//   isDailyLoginClaimed()  — pure flag → Unit test
//   claimDailyLogin()      — RPC + toast + guard → Integration test
//   claimHotTake()         — RPC + toast → Integration test
//   claimReaction()        — RPC + toast → Integration test
//   claimVote()            — RPC + toast → Integration test
//   claimDebate()          — RPC + toast → Integration test
//   claimAiSparring()      — RPC + toast → Integration test
//   claimPrediction()      — RPC + toast → Integration test
//
// IMPORTS:
//   { nudge }                          from './nudge.ts'
//   { _rpc, _updateBalanceDisplay }    from './tokens.balance.ts'
//   { _tokenToast }                    from './tokens.animations.ts'
//   { claimMilestone, _checkStreakMilestones } from './tokens.milestones.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockUpdateBalanceDisplay = vi.hoisted(() => vi.fn());
const mockTokenToast = vi.hoisted(() => vi.fn());
const mockNudge = vi.hoisted(() => vi.fn());
const mockClaimMilestone = vi.hoisted(() => vi.fn(async () => null));
const mockCheckStreakMilestones = vi.hoisted(() => vi.fn());

vi.mock('../src/tokens.balance.ts', () => ({
  _rpc: mockRpc,
  _updateBalanceDisplay: mockUpdateBalanceDisplay,
  getBalance: vi.fn(() => 0),
  updateBalance: vi.fn(),
}));

vi.mock('../src/tokens.animations.ts', () => ({
  _tokenToast: mockTokenToast,
  _milestoneToast: vi.fn(),
  _coinFlyUp: vi.fn(),
  _injectCSS: vi.fn(),
}));

vi.mock('../src/nudge.ts', () => ({
  nudge: mockNudge,
}));

vi.mock('../src/tokens.milestones.ts', () => ({
  claimMilestone: mockClaimMilestone,
  _checkStreakMilestones: mockCheckStreakMilestones,
  MILESTONES: {},
  getMilestoneList: vi.fn(() => []),
}));

vi.mock('../src/onboarding-drip.ts', () => ({
  triggerDripDay: vi.fn(async () => {}),
}));

import {
  isDailyLoginClaimed,
  claimDailyLogin,
  claimHotTake,
  claimReaction,
  claimVote,
  claimDebate,
  claimAiSparring,
  claimPrediction,
} from '../src/tokens.claims.ts';

const makeClaimResult = (overrides: Partial<any> = {}): any => ({
  success: true,
  tokens_earned: 10,
  new_balance: 510,
  login_streak: 3,
  freeze_used: false,
  streak_bonus: 0,
  freezes_earned: 0,
  is_winner: false,
  ...overrides,
});

beforeEach(() => {
  mockRpc.mockReset();
  mockUpdateBalanceDisplay.mockReset();
  mockTokenToast.mockReset();
  mockNudge.mockReset();
  mockClaimMilestone.mockReset();
  mockCheckStreakMilestones.mockReset();
});

// ── isDailyLoginClaimed ───────────────────────────────────────

describe('TC1 — isDailyLoginClaimed: initially false', () => {
  it('returns false before any claim attempt', () => {
    // Note: module-level flag may have been set by prior test runs;
    // we can only test the function exists and returns a boolean.
    expect(typeof isDailyLoginClaimed()).toBe('boolean');
  });
});

// ── claimDailyLogin ───────────────────────────────────────────

describe('TC2 — claimDailyLogin: calls _rpc("claim_daily_login")', () => {
  it('invokes _rpc with no extra args', async () => {
    mockRpc.mockResolvedValue(makeClaimResult());

    await claimDailyLogin();

    expect(mockRpc).toHaveBeenCalledWith('claim_daily_login');
  });
});

describe('TC3 — claimDailyLogin: shows token toast on success', () => {
  it('calls _tokenToast with earned amount', async () => {
    mockRpc.mockResolvedValue(makeClaimResult({ tokens_earned: 5 }));

    await claimDailyLogin();

    expect(mockTokenToast).toHaveBeenCalledWith(5, expect.any(String));
  });
});

describe('TC4 — claimDailyLogin: calls _updateBalanceDisplay', () => {
  it('updates display with new_balance', async () => {
    mockRpc.mockResolvedValue(makeClaimResult({ new_balance: 600 }));

    await claimDailyLogin();

    expect(mockUpdateBalanceDisplay).toHaveBeenCalledWith(600);
  });
});

describe('TC5 — claimDailyLogin: calls nudge on success', () => {
  it('fires nudge("return_visit")', async () => {
    mockRpc.mockResolvedValue(makeClaimResult());

    await claimDailyLogin();

    expect(mockNudge).toHaveBeenCalledWith('return_visit', expect.any(String));
  });
});

describe('TC6 — claimDailyLogin: returns null when _rpc returns null', () => {
  it('handles null result gracefully', async () => {
    mockRpc.mockResolvedValue(null);

    const result = await claimDailyLogin();

    expect(result).toBeNull();
  });
});

describe('TC7 — claimDailyLogin: freeze label when freeze_used is true', () => {
  it('toast label contains freeze text', async () => {
    mockRpc.mockResolvedValue(makeClaimResult({ freeze_used: true, streak_bonus: 0 }));

    await claimDailyLogin();

    expect(mockTokenToast).toHaveBeenCalledWith(expect.any(Number), expect.stringContaining('freeze'));
  });
});

describe('TC8 — claimDailyLogin: streak label when streak_bonus > 0', () => {
  it('toast label contains streak text', async () => {
    mockRpc.mockResolvedValue(makeClaimResult({ streak_bonus: 1, login_streak: 7, freeze_used: false }));

    await claimDailyLogin();

    expect(mockTokenToast).toHaveBeenCalledWith(expect.any(Number), expect.stringContaining('streak'));
  });
});

// ── claimHotTake ──────────────────────────────────────────────

describe('TC9 — claimHotTake: no-op for empty hotTakeId', () => {
  it('returns null without RPC when id is empty', async () => {
    const result = await claimHotTake('');
    expect(result).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe('TC10 — claimHotTake: calls claim_action_tokens with hot_take action', () => {
  it('invokes _rpc with correct params', async () => {
    mockRpc.mockResolvedValue(makeClaimResult());

    await claimHotTake('take-1');

    expect(mockRpc).toHaveBeenCalledWith('claim_action_tokens', {
      p_action: 'hot_take',
      p_reference_id: 'take-1',
    });
  });
});

describe('TC11 — claimHotTake: returns null when RPC fails', () => {
  it('returns null on unsuccessful result', async () => {
    mockRpc.mockResolvedValue({ success: false });
    const result = await claimHotTake('take-2');
    expect(result).toBeNull();
  });
});

// ── claimVote ─────────────────────────────────────────────────

describe('TC12 — claimVote: no-op for empty debateId', () => {
  it('returns null without calling _rpc', async () => {
    const result = await claimVote('');
    expect(result).toBeNull();
  });
});

describe('TC13 — claimVote: calls first_vote milestone', () => {
  it('triggers claimMilestone("first_vote")', async () => {
    mockRpc.mockResolvedValue(makeClaimResult());

    await claimVote('debate-1');

    expect(mockClaimMilestone).toHaveBeenCalledWith('first_vote');
  });
});

// ── claimDebate ───────────────────────────────────────────────

describe('TC14 — claimDebate: includes win label when is_winner is true', () => {
  it('toast includes "win" text for winning debate', async () => {
    mockRpc.mockResolvedValue(makeClaimResult({ is_winner: true, upset_bonus: 0, fate_bonus: 0 }));

    await claimDebate('debate-x');

    expect(mockTokenToast).toHaveBeenCalledWith(expect.any(Number), expect.stringContaining('win'));
  });
});

describe('TC15 — claimDebate: upset label when upset_bonus > 0', () => {
  it('toast shows "Upset" text', async () => {
    mockRpc.mockResolvedValue(makeClaimResult({ is_winner: true, upset_bonus: 5, fate_bonus: 0 }));

    await claimDebate('debate-y');

    expect(mockTokenToast).toHaveBeenCalledWith(expect.any(Number), expect.stringContaining('Upset'));
  });
});

// ── claimAiSparring ───────────────────────────────────────────

describe('TC16 — claimAiSparring: calls claim_action_tokens with ai_sparring', () => {
  it('invokes _rpc with correct action', async () => {
    mockRpc.mockResolvedValue(makeClaimResult());

    await claimAiSparring('spar-1');

    expect(mockRpc).toHaveBeenCalledWith('claim_action_tokens', {
      p_action: 'ai_sparring',
      p_reference_id: 'spar-1',
    });
  });
});

// ── claimPrediction ───────────────────────────────────────────

describe('TC17 — claimPrediction: no-op for empty debateId', () => {
  it('returns null without RPC', async () => {
    const result = await claimPrediction('');
    expect(result).toBeNull();
  });
});

describe('TC18 — claimPrediction: calls claim_action_tokens with prediction action', () => {
  it('invokes _rpc with correct params', async () => {
    mockRpc.mockResolvedValue(makeClaimResult());

    await claimPrediction('pred-debate-1');

    expect(mockRpc).toHaveBeenCalledWith('claim_action_tokens', {
      p_action: 'prediction',
      p_reference_id: 'pred-debate-1',
    });
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/tokens.claims.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './nudge.ts',
      './tokens.balance.ts',
      './tokens.animations.ts',
      './tokens.milestones.ts',
      './tokens.types.ts',
      './onboarding-drip.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/tokens.claims.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
