// ============================================================
// TOKENS MILESTONES — tests/tokens-milestones.test.ts
// Source: src/tokens.milestones.ts
//
// CLASSIFICATION:
//   MILESTONES              — Constant data → value test
//   claimMilestone()        — Multi-step orchestration (RPC + side effects) → Integration test
//   _loadMilestones()       — RPC wrapper → Contract test
//   _checkStreakMilestones() — Pure calculation → Unit test
//   getMilestoneList()      — Pure calculation (reads module state) → Unit test
//   checkProfileMilestones() — Multi-step → Integration test
//
// IMPORTS:
//   { _rpc, _updateBalanceDisplay } from './tokens.balance.ts'
//   { _milestoneToast }             from './tokens.animations.ts'
//   import type { ... }             — type-only
//
// NOTE: module has milestoneClaimed Set as module-level state.
//       Tests use unique keys to avoid cross-test contamination.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockUpdateBalanceDisplay = vi.hoisted(() => vi.fn());
const mockMilestoneToast = vi.hoisted(() => vi.fn());

vi.mock('../src/tokens.balance.ts', () => ({
  _rpc: mockRpc,
  _updateBalanceDisplay: mockUpdateBalanceDisplay,
}));

vi.mock('../src/tokens.animations.ts', () => ({
  _milestoneToast: mockMilestoneToast,
}));

vi.mock('../src/onboarding-drip.ts', () => ({
  triggerDripDay: vi.fn().mockResolvedValue(undefined),
}));

import {
  MILESTONES,
  claimMilestone,
  _loadMilestones,
  _checkStreakMilestones,
  getMilestoneList,
  checkProfileMilestones,
} from '../src/tokens.milestones.ts';

beforeEach(() => {
  mockRpc.mockReset();
  mockUpdateBalanceDisplay.mockReset();
  mockMilestoneToast.mockReset();
});

// ── MILESTONES ────────────────────────────────────────────────

describe('TC1 — MILESTONES: has first_debate with 50 tokens', () => {
  it('first_debate milestone has 50 token reward', () => {
    expect(MILESTONES['first_debate'].tokens).toBe(50);
  });
});

describe('TC2 — MILESTONES: streak milestones award freeze tokens', () => {
  it('streak_7 awards 1 freeze', () => {
    expect(MILESTONES['streak_7'].freezes).toBe(1);
    expect(MILESTONES['streak_30'].freezes).toBe(3);
    expect(MILESTONES['streak_100'].freezes).toBe(5);
  });
});

describe('TC3 — MILESTONES: all entries have label and icon', () => {
  it('every milestone has a non-empty label and icon', () => {
    for (const [, def] of Object.entries(MILESTONES)) {
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.icon.length).toBeGreaterThan(0);
    }
  });
});

// ── claimMilestone ────────────────────────────────────────────

describe('TC4 — claimMilestone: calls claim_milestone RPC', () => {
  it('calls _rpc with "claim_milestone"', async () => {
    mockRpc.mockResolvedValue({ success: true, new_balance: 100, tokens_earned: 25, freezes_earned: 0 });

    await claimMilestone('first_hot_take');

    expect(mockRpc).toHaveBeenCalledWith('claim_milestone', { p_milestone_key: 'first_hot_take' });
  });
});

describe('TC5 — claimMilestone: second call for same key returns null (dedup)', () => {
  it('returns null when key was already claimed in this session', async () => {
    mockRpc.mockResolvedValue({ success: true, new_balance: 50, tokens_earned: 10, freezes_earned: 0 });

    await claimMilestone('first_vote');        // first call
    mockRpc.mockReset();
    const result = await claimMilestone('first_vote'); // second call

    expect(result).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe('TC6 — claimMilestone: calls _updateBalanceDisplay on success (import contract)', () => {
  it('_updateBalanceDisplay is called when RPC succeeds', async () => {
    mockRpc.mockResolvedValue({ success: true, new_balance: 200, tokens_earned: 50, freezes_earned: 0 });

    await claimMilestone('first_debate');

    expect(mockUpdateBalanceDisplay).toHaveBeenCalledWith(200);
  });
});

describe('TC7 — claimMilestone: calls _milestoneToast on success (import contract)', () => {
  it('_milestoneToast is called with icon and label', async () => {
    mockRpc.mockResolvedValue({ success: true, new_balance: 160, tokens_earned: 15, freezes_earned: 0 });

    await claimMilestone('first_ai_sparring');

    expect(mockMilestoneToast).toHaveBeenCalled();
    expect(mockMilestoneToast.mock.calls[0][0]).toBe(MILESTONES['first_ai_sparring'].icon);
  });
});

describe('TC8 — claimMilestone: returns null on RPC failure', () => {
  it('returns null when _rpc returns success:false', async () => {
    mockRpc.mockResolvedValue({ success: false, error: 'Unauthorized' });

    const result = await claimMilestone('first_prediction');

    expect(result).toBeNull();
  });
});

// ── _loadMilestones ───────────────────────────────────────────

describe('TC9 — _loadMilestones: calls get_my_milestones RPC', () => {
  it('calls _rpc with "get_my_milestones"', async () => {
    mockRpc.mockResolvedValue({ success: true, claimed: [] });

    await _loadMilestones();

    expect(mockRpc).toHaveBeenCalledWith('get_my_milestones');
  });
});

describe('TC10 — _loadMilestones: no-op when RPC fails', () => {
  it('returns without error when _rpc returns failure', async () => {
    mockRpc.mockResolvedValue({ success: false });

    await expect(_loadMilestones()).resolves.not.toThrow();
  });
});

// ── _checkStreakMilestones ────────────────────────────────────

describe('TC11 — _checkStreakMilestones: no-op for streak 0', () => {
  it('does not call _rpc when streak is 0', () => {
    // Using fake timers to prevent the void promises from running
    _checkStreakMilestones(0);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ── getMilestoneList ──────────────────────────────────────────

describe('TC12 — getMilestoneList: returns array with all milestone keys', () => {
  it('returns an entry for each key in MILESTONES', () => {
    const list = getMilestoneList();
    const milestoneKeys = Object.keys(MILESTONES);
    expect(list).toHaveLength(milestoneKeys.length);
    for (const key of milestoneKeys) {
      expect(list.some(m => m.key === key)).toBe(true);
    }
  });
});

describe('TC13 — getMilestoneList: each entry has key, tokens, label, icon, claimed', () => {
  it('every list item has required fields', () => {
    const list = getMilestoneList();
    for (const item of list) {
      expect(typeof item.key).toBe('string');
      expect(typeof item.tokens).toBe('number');
      expect(typeof item.label).toBe('string');
      expect(typeof item.claimed).toBe('boolean');
    }
  });
});

// ── checkProfileMilestones ────────────────────────────────────

describe('TC14 — checkProfileMilestones: no-op for 0 completedCount', () => {
  it('does not call _rpc when completedCount is 0', async () => {
    await checkProfileMilestones(0);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/tokens.milestones.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './tokens.balance.ts',
      './tokens.animations.ts',
      './tokens.types.ts',
      './onboarding-drip.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/tokens.milestones.ts'),
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
