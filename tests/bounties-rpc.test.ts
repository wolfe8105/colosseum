// ============================================================
// BOUNTIES RPC — tests/bounties-rpc.test.ts
// Source: src/bounties.rpc.ts
//
// CLASSIFICATION:
//   postBounty()         — RPC wrapper + placeholder guard → Contract test
//   cancelBounty()       — RPC wrapper + placeholder guard → Contract test
//   getMyBounties()      — RPC wrapper + placeholder guard → Contract test
//   getOpponentBounties() — RPC wrapper + placeholder guard → Contract test
//   selectBountyClaim()  — RPC wrapper + placeholder guard → Contract test
//   bountySlotLimit()    — Pure step-ladder → Unit test
//
// IMPORTS:
//   { safeRpc, getIsPlaceholderMode } from './auth.ts'
//   import type { ... } — type-only
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

import {
  postBounty,
  cancelBounty,
  getMyBounties,
  getOpponentBounties,
  selectBountyClaim,
  bountySlotLimit,
} from '../src/bounties.rpc.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
});

// ── bountySlotLimit (pure) ────────────────────────────────────

describe('TC1 — bountySlotLimit: 0 slots below 25%', () => {
  it('returns 0 for depthPct < 25', () => {
    expect(bountySlotLimit(0)).toBe(0);
    expect(bountySlotLimit(24)).toBe(0);
  });
});

describe('TC2 — bountySlotLimit: step ladder 25-74', () => {
  it('returns correct slot count at each threshold', () => {
    expect(bountySlotLimit(25)).toBe(1);
    expect(bountySlotLimit(35)).toBe(2);
    expect(bountySlotLimit(45)).toBe(3);
    expect(bountySlotLimit(55)).toBe(4);
    expect(bountySlotLimit(65)).toBe(5);
    expect(bountySlotLimit(75)).toBe(6);
  });
});

describe('TC3 — bountySlotLimit: max 6 slots at 100%', () => {
  it('returns 6 for depthPct >= 75', () => {
    expect(bountySlotLimit(100)).toBe(6);
  });
});

// ── postBounty ────────────────────────────────────────────────

describe('TC4 — postBounty: calls post_bounty RPC', () => {
  it('calls safeRpc with "post_bounty" and correct params', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, bounty_id: 'b-1' }, error: null });

    await postBounty('user-target', 100, 7);

    expect(mockSafeRpc).toHaveBeenCalledWith('post_bounty', {
      p_target_id: 'user-target',
      p_amount: 100,
      p_duration_days: 7,
    });
  });
});

describe('TC5 — postBounty: placeholder mode returns stub', () => {
  it('returns success:true without calling RPC in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await postBounty('user-x', 50, 3);

    expect(result.success).toBe(true);
    expect(result.bounty_id).toBe('placeholder');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC6 — postBounty: RPC error returns failure', () => {
  it('returns success:false with error message on RPC error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Insufficient balance' } });

    const result = await postBounty('user-y', 999, 1);

    expect(result.success).toBe(false);
    expect((result as { error?: string }).error).toContain('Insufficient balance');
  });
});

// ── cancelBounty ──────────────────────────────────────────────

describe('TC7 — cancelBounty: calls cancel_bounty RPC', () => {
  it('calls safeRpc with "cancel_bounty" and bounty id', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await cancelBounty('bounty-abc');

    expect(mockSafeRpc).toHaveBeenCalledWith('cancel_bounty', { p_bounty_id: 'bounty-abc' });
  });
});

describe('TC8 — cancelBounty: placeholder mode skips RPC', () => {
  it('returns success:true without calling RPC in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await cancelBounty('b-1');

    expect(result.success).toBe(true);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── getMyBounties ─────────────────────────────────────────────

describe('TC9 — getMyBounties: calls get_my_bounties RPC', () => {
  it('calls safeRpc with "get_my_bounties" (no params)', async () => {
    mockSafeRpc.mockResolvedValue({ data: { incoming: [], outgoing: [] }, error: null });

    await getMyBounties();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_my_bounties');
  });
});

describe('TC10 — getMyBounties: returns empty on error', () => {
  it('returns empty arrays on RPC error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const result = await getMyBounties();

    expect(result.incoming).toEqual([]);
    expect(result.outgoing).toEqual([]);
  });
});

// ── getOpponentBounties ───────────────────────────────────────

describe('TC11 — getOpponentBounties: calls get_opponent_bounties RPC', () => {
  it('calls safeRpc with "get_opponent_bounties" and opponent id', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await getOpponentBounties('opp-123');

    expect(mockSafeRpc).toHaveBeenCalledWith('get_opponent_bounties', { p_opponent_id: 'opp-123' });
  });
});

// ── selectBountyClaim ─────────────────────────────────────────

describe('TC12 — selectBountyClaim: calls select_bounty_claim RPC', () => {
  it('calls safeRpc with bounty_id and debate_id', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await selectBountyClaim('bounty-1', 'debate-1');

    expect(mockSafeRpc).toHaveBeenCalledWith('select_bounty_claim', {
      p_bounty_id: 'bounty-1',
      p_debate_id: 'debate-1',
    });
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/bounties.rpc.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './auth.types.ts', './bounties.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/bounties.rpc.ts'),
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
