// ============================================================
// GK -- F-28 BOUNTY BOARD -- tests/gk-bounties.test.ts
// Source: src/bounties.ts
// SPEC: docs/THE-MODERATOR-PUNCH-LIST.md row F-28 +
//       Session 245 lock notes (rivals-only, graduated gate,
//       85% cancel refund, gold indicator dot).
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

vi.mock('../src/config.ts', () => ({
  escapeHTML: vi.fn((s: string) => s),
  showToast: vi.fn(),
}));

import {
  bountySlotLimit,
  postBounty,
  cancelBounty,
  getMyBounties,
  getOpponentBounties,
  selectBountyClaim,
  loadBountyDotSet,
  userHasBountyDot,
  bountyDot,
  renderProfileBountySection,
  renderMyBountiesSection,
} from '../src/bounties.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
  document.body.innerHTML = '';
});

// -- TC1: bountySlotLimit -- below 25% = 0 (graduated gate) ---

describe('TC1 -- bountySlotLimit: below 25% returns 0', () => {
  it('returns 0 for depthPct below the 25% posting gate', () => {
    expect(bountySlotLimit(0)).toBe(0);
    expect(bountySlotLimit(24)).toBe(0);
    expect(bountySlotLimit(24.9)).toBe(0);
  });
});

// -- TC2: bountySlotLimit -- step ladder 25%->1 ... 75%->6 ----

describe('TC2 -- bountySlotLimit: graduated step ladder', () => {
  it('returns correct slot count at each spec-defined threshold', () => {
    expect(bountySlotLimit(25)).toBe(1);
    expect(bountySlotLimit(35)).toBe(2);
    expect(bountySlotLimit(45)).toBe(3);
    expect(bountySlotLimit(55)).toBe(4);
    expect(bountySlotLimit(65)).toBe(5);
    expect(bountySlotLimit(75)).toBe(6);
  });
});

// -- TC3: bountySlotLimit -- max 6 slots at >=75% -------------

describe('TC3 -- bountySlotLimit: cap at 6 slots above 75%', () => {
  it('returns 6 for depthPct >= 75', () => {
    expect(bountySlotLimit(76)).toBe(6);
    expect(bountySlotLimit(100)).toBe(6);
  });
});

// -- TC4: postBounty -- calls post_bounty RPC -----------------

describe('TC4 -- postBounty: calls post_bounty RPC with correct params', () => {
  it('calls safeRpc("post_bounty") with p_target_id, p_amount, p_duration_days', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, bounty_id: 'b-1' }, error: null });
    await postBounty('rival-id', 100, 7);
    expect(mockSafeRpc).toHaveBeenCalledWith('post_bounty', {
      p_target_id: 'rival-id',
      p_amount: 100,
      p_duration_days: 7,
    });
  });
});

// -- TC5: postBounty -- placeholder mode stub -----------------

describe('TC5 -- postBounty: placeholder mode returns stub without calling RPC', () => {
  it('returns { success: true, bounty_id: "placeholder" } and skips RPC', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const result = await postBounty('rival-id', 50, 3);
    expect(result.success).toBe(true);
    expect(result.bounty_id).toBe('placeholder');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// -- TC6: postBounty -- RPC error -> failure result -----------

describe('TC6 -- postBounty: RPC error returns { success: false, error }', () => {
  it('returns success:false with error message when RPC returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Insufficient balance' } });
    const result = await postBounty('rival-id', 9999, 1);
    expect(result.success).toBe(false);
    expect((result as { error?: string }).error).toContain('Insufficient balance');
  });
});

// -- TC7: cancelBounty -- calls cancel_bounty RPC -------------

describe('TC7 -- cancelBounty: calls cancel_bounty RPC with p_bounty_id', () => {
  it('calls safeRpc("cancel_bounty") with the bounty id', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, refund: 85 }, error: null });
    await cancelBounty('bounty-abc');
    expect(mockSafeRpc).toHaveBeenCalledWith('cancel_bounty', { p_bounty_id: 'bounty-abc' });
  });
});

// -- TC8: cancelBounty -- placeholder mode skips RPC ----------

describe('TC8 -- cancelBounty: placeholder mode returns success without calling RPC', () => {
  it('returns { success: true } and does not call safeRpc', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const result = await cancelBounty('bounty-xyz');
    expect(result.success).toBe(true);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// -- TC9: getMyBounties -- calls get_my_bounties ---------------

describe('TC9 -- getMyBounties: calls get_my_bounties RPC with no params', () => {
  it('calls safeRpc("get_my_bounties") without extra arguments', async () => {
    mockSafeRpc.mockResolvedValue({ data: { incoming: [], outgoing: [] }, error: null });
    await getMyBounties();
    expect(mockSafeRpc).toHaveBeenCalledWith('get_my_bounties');
  });
});

// -- TC10: getMyBounties -- error -> empty arrays -------------

describe('TC10 -- getMyBounties: returns empty arrays on RPC error', () => {
  it('returns { incoming: [], outgoing: [] } when RPC returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Unauthorized' } });
    const result = await getMyBounties();
    expect(result.incoming).toEqual([]);
    expect(result.outgoing).toEqual([]);
  });
});

// -- TC11: getOpponentBounties -- calls correct RPC -----------

describe('TC11 -- getOpponentBounties: calls get_opponent_bounties with p_opponent_id', () => {
  it('calls safeRpc("get_opponent_bounties") with the opponent id', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await getOpponentBounties('opp-999');
    expect(mockSafeRpc).toHaveBeenCalledWith('get_opponent_bounties', { p_opponent_id: 'opp-999' });
  });
});

// -- TC12: selectBountyClaim -- calls correct RPC -------------

describe('TC12 -- selectBountyClaim: calls select_bounty_claim with p_bounty_id and p_debate_id', () => {
  it('calls safeRpc("select_bounty_claim") with both required params', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });
    await selectBountyClaim('bounty-1', 'debate-1');
    expect(mockSafeRpc).toHaveBeenCalledWith('select_bounty_claim', {
      p_bounty_id: 'bounty-1',
      p_debate_id: 'debate-1',
    });
  });
});

// -- TC13: loadBountyDotSet -- calls get_bounty_dot_user_ids --

describe('TC13 -- loadBountyDotSet: calls get_bounty_dot_user_ids RPC', () => {
  it('calls safeRpc("get_bounty_dot_user_ids") to populate the dot set', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadBountyDotSet();
    expect(mockSafeRpc).toHaveBeenCalledWith('get_bounty_dot_user_ids');
  });
});

// -- TC14: loadBountyDotSet -- placeholder mode skips RPC -----

describe('TC14 -- loadBountyDotSet: placeholder mode skips RPC', () => {
  it('returns without calling safeRpc in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    await loadBountyDotSet();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// -- TC15: userHasBountyDot -- null/undefined -> false --------

describe('TC15 -- userHasBountyDot: null and undefined always return false', () => {
  it('returns false for null and undefined inputs', () => {
    expect(userHasBountyDot(null)).toBe(false);
    expect(userHasBountyDot(undefined)).toBe(false);
  });
});

// -- TC16: bountyDot -- empty for user not in set -------------

describe('TC16 -- bountyDot: returns empty string for user not in the bounty dot set', () => {
  it('returns "" for a user id that was never loaded into the set', () => {
    expect(bountyDot('not-a-bounty-user-tc16')).toBe('');
  });
});

// -- TC17: bountyDot -- gold dot HTML for user in set ---------

describe('TC17 -- bountyDot: returns gold dot HTML span for user loaded into dot set', () => {
  it('returns span with bounty-dot class and gold emoji after loadBountyDotSet', async () => {
    mockSafeRpc.mockResolvedValue({ data: [{ user_id: 'dot-user-tc17' }], error: null });
    await loadBountyDotSet();
    const html = bountyDot('dot-user-tc17');
    expect(html).toContain('bounty-dot');
    expect(html).toContain('🟡');
  });
});

// -- TC18: renderProfileBountySection -- depth gate at 25% ---

describe('TC18 -- renderProfileBountySection: shows 25% depth gate message when slotLimit is 0', () => {
  it('renders depth gate message when viewer depth is below 25%', async () => {
    mockSafeRpc.mockResolvedValue({ data: { incoming: [], outgoing: [] }, error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderProfileBountySection(container, 'target-1', 0, 100, 0);
    expect(container.innerHTML).toContain('25%');
  });
});

// -- TC19: renderProfileBountySection -- 85% refund in cancel -

describe('TC19 -- renderProfileBountySection: cancel button shows 85% refund copy', () => {
  it('renders CANCEL BOUNTY (85% refund) button when open bounty exists on target', async () => {
    const existingBounty = {
      id: 'b-open-tc19',
      target_id: 'target-19',
      poster_id: 'me',
      amount: 100,
      duration_days: 7,
      duration_fee: 7,
      status: 'open' as const,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
    };
    mockSafeRpc.mockResolvedValue({ data: { incoming: [], outgoing: [existingBounty] }, error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderProfileBountySection(container, 'target-19', 50, 500, 1);
    expect(container.innerHTML).toContain('85%');
    expect(container.innerHTML).toContain('CANCEL');
  });
});

// -- TC20: renderProfileBountySection -- post form when no bounty

describe('TC20 -- renderProfileBountySection: shows POST BOUNTY button when no existing bounty', () => {
  it('renders bounty-post-btn when outgoing has no open bounty on this target', async () => {
    mockSafeRpc.mockResolvedValue({ data: { incoming: [], outgoing: [] }, error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderProfileBountySection(container, 'target-20', 50, 200, 0);
    expect(document.getElementById('bounty-post-btn')).not.toBeNull();
    expect(container.innerHTML).toContain('POST BOUNTY');
  });
});

// -- TC21: renderMyBountiesSection -- incoming section --------

describe('TC21 -- renderMyBountiesSection: renders incoming bounty rows', () => {
  it('renders at least one .bounty-list-row for each incoming bounty', async () => {
    const incoming = [{
      id: 'in-tc21', poster_username: 'hunter99', target_username: 'me',
      amount: 200, duration_days: 14, status: 'open' as const,
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
    }];
    mockSafeRpc.mockResolvedValue({ data: { incoming, outgoing: [] }, error: null });
    const container = document.createElement('div');
    await renderMyBountiesSection(container);
    expect(container.querySelectorAll('.bounty-list-row').length).toBeGreaterThanOrEqual(1);
  });
});

// -- TC22: renderMyBountiesSection -- CANCEL for open outgoing -

describe('TC22 -- renderMyBountiesSection: renders CANCEL button for open outgoing bounty', () => {
  it('includes a .bounty-cancel-row-btn for each open outgoing bounty', async () => {
    const outgoing = [{
      id: 'out-tc22', target_username: 'rival99', poster_username: 'me',
      amount: 150, duration_days: 7, status: 'open' as const,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
    }];
    mockSafeRpc.mockResolvedValue({ data: { incoming: [], outgoing }, error: null });
    const container = document.createElement('div');
    await renderMyBountiesSection(container);
    expect(container.querySelector('.bounty-cancel-row-btn')).not.toBeNull();
  });
});

// -- TC23: renderMyBountiesSection -- two-step cancel confirm -

describe('TC23 -- renderMyBountiesSection: two-step cancel calls cancelBounty on second click', () => {
  it('only calls cancel_bounty RPC after confirm click, not on first click', async () => {
    const outgoing = [{
      id: 'b-twostep-tc23', target_username: 'rival', poster_username: 'me',
      amount: 100, duration_days: 7, status: 'open' as const,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
    }];
    mockSafeRpc.mockResolvedValueOnce({ data: { incoming: [], outgoing }, error: null });
    mockSafeRpc.mockResolvedValue({ data: { success: true, refund: 90 }, error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderMyBountiesSection(container);
    const cancelBtn = container.querySelector('.bounty-cancel-row-btn') as HTMLButtonElement;
    cancelBtn.click();
    await new Promise(r => setTimeout(r, 0));
    const callNamesAfterFirst = mockSafeRpc.mock.calls.map((c: unknown[]) => c[0]);
    expect(callNamesAfterFirst).not.toContain('cancel_bounty');
    cancelBtn.click();
    await new Promise(r => setTimeout(r, 0));
    const callNamesAfterSecond = mockSafeRpc.mock.calls.map((c: unknown[]) => c[0]);
    expect(callNamesAfterSecond).toContain('cancel_bounty');
  });
});

// -- ARCH ------------------------------------------------------

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH -- src/bounties.ts only re-exports from allowed sub-modules', () => {
  it('has no from-paths outside the allowed sub-module list', () => {
    const allowed = [
      './bounties.types.ts',
      './bounties.dot.ts',
      './bounties.rpc.ts',
      './bounties.render.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/bounties.ts'), 'utf-8');
    const paths = source
      .split('\n')
      .map((l: string) => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, 'Unexpected from-path: ' + path).toContain(path);
    }
  });
});
