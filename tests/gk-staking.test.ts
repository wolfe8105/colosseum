// ============================================================
// GK F-09 — TOKEN PREDICTION STAKING — tests/gk-staking.test.ts
// Source: src/staking.ts (pure re-export barrel)
//
// Spec: docs/product/F-09-token-staking.md
//
// All functions imported from the barrel (src/staking.ts).
// Mock all transitive deps (auth, tokens, depth-gate, config, tiers).
// vi.hoisted() for all mocks per pattern.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc        = vi.hoisted(() => vi.fn());
const mockGetBalance     = vi.hoisted(() => vi.fn(() => 500));
const mockIsDepthBlocked = vi.hoisted(() => vi.fn(() => false));
const mockEscapeHTML     = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));
const mockGetTier        = vi.hoisted(() => vi.fn(() => ({ name: 'Contender', icon: '🥊', stakeCap: 25 })));
const mockCanStake       = vi.hoisted(() => vi.fn(() => true));
const mockGetNextTier    = vi.hoisted(() => vi.fn(() => ({ questionsNeeded: 5 })));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/tokens.ts', () => ({
  getBalance: mockGetBalance,
}));

vi.mock('../src/depth-gate.ts', () => ({
  isDepthBlocked: mockIsDepthBlocked,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: vi.fn(),
  FEATURES: {},
}));

vi.mock('../src/tiers.ts', () => ({
  getTier:     mockGetTier,
  canStake:    mockCanStake,
  getNextTier: mockGetNextTier,
}));

import {
  placeStake,
  getPool,
  settleStakes,
  getOdds,
  renderStakingPanel,
  wireStakingPanel,
} from '../src/staking.ts';

// ── DOM helper ─────────────────────────────────────────────────

function buildDOM(): void {
  document.body.innerHTML = `
    <button class="stake-side-btn" data-side="a">Side A</button>
    <button class="stake-side-btn" data-side="b">Side B</button>
    <button class="stake-quick-btn" data-amount="50">50</button>
    <input id="stake-amount-input" value="" />
    <button id="stake-confirm-btn" disabled style="opacity:0.5">SELECT A SIDE</button>
    <div id="stake-error" style="display:none"></div>
  `;
}

const makePool = (overrides: Partial<any> = {}): any => ({
  exists: true,
  total_side_a: 100,
  total_side_b: 100,
  pool_status: 'open',
  user_stake: null,
  ...overrides,
});

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetBalance.mockReturnValue(500);
  mockIsDepthBlocked.mockReturnValue(false);
  mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
  mockGetTier.mockReturnValue({ name: 'Contender', icon: '🥊', stakeCap: 25 });
  mockCanStake.mockReturnValue(true);
  mockGetNextTier.mockReturnValue({ questionsNeeded: 5 });
});

// ── TC1: placeStake — depth gate blocks ──────────────────────

describe('TC1 — placeStake: F-63 depth gate blocks sub-25% users', () => {
  it('returns {success:false, error:"Profile incomplete"} without calling RPC', async () => {
    mockIsDepthBlocked.mockReturnValue(true);

    const result = await placeStake('debate-tc1', 'a', 50);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Profile incomplete');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC2: placeStake — missing debateId ───────────────────────

describe('TC2 — placeStake: missing debateId returns failure without RPC', () => {
  it('returns failure for empty debateId', async () => {
    const result = await placeStake('', 'a', 50);

    expect(result.success).toBe(false);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC3: placeStake — invalid amount ─────────────────────────

describe('TC3 — placeStake: zero amount returns failure without RPC', () => {
  it('rejects amount=0 as not a positive number', async () => {
    const result = await placeStake('debate-tc3', 'a', 0);

    expect(result.success).toBe(false);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC4: placeStake — balance check ──────────────────────────

describe('TC4 — placeStake: amount exceeds balance returns Insufficient balance error', () => {
  it('soft-gates when amount > getBalance() and does not call RPC', async () => {
    mockGetBalance.mockReturnValue(10);

    const result = await placeStake('debate-tc4', 'a', 100);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Insufficient balance/);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC5: placeStake — RPC name and named params ───────────────

describe('TC5 — placeStake: calls place_stake RPC with named p_debate_id, p_side, p_amount', () => {
  it('sends all three named params to safeRpc', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await placeStake('debate-tc5', 'b', 75);

    expect(mockSafeRpc).toHaveBeenCalledWith('place_stake', {
      p_debate_id: 'debate-tc5',
      p_side: 'b',
      p_amount: 75,
    });
  });
});

// ── TC6: placeStake — string amount parsed to integer ─────────

describe('TC6 — placeStake: string amount is parsed to integer before RPC call', () => {
  it('sends p_amount as number when amount is passed as string "50"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await placeStake('debate-tc6', 'a', '50' as any);

    const [, args] = mockSafeRpc.mock.calls[0];
    expect(typeof args.p_amount).toBe('number');
    expect(args.p_amount).toBe(50);
  });
});

// ── TC7: getPool — RPC name and param ────────────────────────

describe('TC7 — getPool: calls get_stake_pool RPC with only p_debate_id', () => {
  it('sends {p_debate_id} to safeRpc under "get_stake_pool"', async () => {
    mockSafeRpc.mockResolvedValue({ data: makePool(), error: null });

    await getPool('debate-tc7');

    expect(mockSafeRpc).toHaveBeenCalledWith('get_stake_pool', { p_debate_id: 'debate-tc7' });
  });
});

// ── TC8: getPool — error returns empty pool ───────────────────

describe('TC8 — getPool: RPC error returns empty pool with exists:false', () => {
  it('returns {exists:false, total_side_a:0, total_side_b:0} on error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const result = await getPool('debate-tc8');

    expect(result.exists).toBe(false);
    expect(result.total_side_a).toBe(0);
    expect(result.total_side_b).toBe(0);
  });
});

// ── TC9: settleStakes — S230: only p_debate_id ───────────────

describe('TC9 — settleStakes: S230 — calls settle_stakes with only p_debate_id', () => {
  it('passes only p_debate_id to safeRpc (no p_winner, no p_multiplier)', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await settleStakes('debate-tc9');

    expect(mockSafeRpc).toHaveBeenCalledWith('settle_stakes', { p_debate_id: 'debate-tc9' });
  });
});

// ── TC10: settleStakes — param object has exactly 1 key ──────

describe('TC10 — settleStakes: S230 structural guard — param object has exactly one key', () => {
  it('RPC param object contains only p_debate_id and nothing else', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await settleStakes('debate-tc10');

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(Object.keys(params)).toEqual(['p_debate_id']);
    expect(params).not.toHaveProperty('p_winner');
    expect(params).not.toHaveProperty('p_multiplier');
  });
});

// ── TC11: settleStakes — RPC error returns failure ───────────

describe('TC11 — settleStakes: RPC error returns {success:false}', () => {
  it('returns success:false with error message when safeRpc returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Settlement failed' } });

    const result = await settleStakes('debate-tc11');

    expect(result.success).toBe(false);
  });
});

// ── TC12: getOdds — empty pool default ───────────────────────

describe('TC12 — getOdds: empty pool returns 50/50 default with 2.00x multipliers', () => {
  it('returns {a:50, b:50, multiplierA:"2.00", multiplierB:"2.00"} for 0,0', () => {
    const odds = getOdds(0, 0);

    expect(odds.a).toBe(50);
    expect(odds.b).toBe(50);
    expect(odds.multiplierA).toBe('2.00');
    expect(odds.multiplierB).toBe('2.00');
  });
});

// ── TC13: getOdds — all tokens on one side → infinity ────────

describe('TC13 — getOdds: zero on one side returns infinity multiplier for that side', () => {
  it('returns multiplierB "∞" when totalB is 0', () => {
    const odds = getOdds(100, 0);

    expect(odds.a).toBe(100);
    expect(odds.b).toBe(0);
    expect(odds.multiplierA).toBe('1.00');
    expect(odds.multiplierB).toBe('∞');
  });
});

// ── TC14: renderStakingPanel — already staked → staking-placed

describe('TC14 — renderStakingPanel: user already staked renders staking-placed YOUR STAKE', () => {
  it('returns HTML with "staking-placed" class and "YOUR STAKE" heading', () => {
    const pool = makePool({ user_stake: { side: 'a', amount: 20 } });

    const html = renderStakingPanel('d-tc14', 'Alice', 'Bob', pool, 30);

    expect(html).toContain('staking-placed');
    expect(html).toContain('YOUR STAKE');
    expect(html).toContain('20 tokens');
  });
});

// ── TC15: renderStakingPanel — tier locked → staking-locked ──

describe('TC15 — renderStakingPanel: tier locked renders staking-locked TOKEN STAKING', () => {
  it('returns HTML with "staking-locked" class when canStake returns false', () => {
    mockCanStake.mockReturnValue(false);
    mockGetNextTier.mockReturnValue({ questionsNeeded: 8 });

    const html = renderStakingPanel('d-tc15', 'A', 'B', makePool(), 5);

    expect(html).toContain('staking-locked');
    expect(html).toContain('TOKEN STAKING');
    expect(html).toContain('8');
  });
});

// ── TC16: renderStakingPanel — active → staking-active ───────

describe('TC16 — renderStakingPanel: active user renders staking-active with side buttons', () => {
  it('returns HTML with "staking-active" class and stake-side-btn elements', () => {
    mockCanStake.mockReturnValue(true);

    const html = renderStakingPanel('d-tc16', 'Left', 'Right', makePool(), 30);

    expect(html).toContain('staking-active');
    expect(html).toContain('STAKE TOKENS');
    expect(html).toContain('stake-side-btn');
  });
});

// ── TC17: renderStakingPanel — quick amounts cap-gated ───────

describe('TC17 — renderStakingPanel: quick amounts respect tier stakeCap', () => {
  it('excludes data-amount 50 and 100 when stakeCap is 25', () => {
    mockCanStake.mockReturnValue(true);
    mockGetTier.mockReturnValue({ name: 'Contender', icon: '🥊', stakeCap: 25 });

    const html = renderStakingPanel('d-tc17a', 'A', 'B', makePool(), 30);

    expect(html).not.toContain('data-amount="50"');
    expect(html).not.toContain('data-amount="100"');
  });

  it('includes data-amount 50 and 100 when stakeCap is 100', () => {
    mockCanStake.mockReturnValue(true);
    mockGetTier.mockReturnValue({ name: 'Champion', icon: '🏆', stakeCap: 100 });

    const html = renderStakingPanel('d-tc17b', 'A', 'B', makePool(), 100);

    expect(html).toContain('data-amount="50"');
    expect(html).toContain('data-amount="100"');
  });
});

// ── TC18: wireStakingPanel — confirm starts disabled ─────────

describe('TC18 — wireStakingPanel: confirm button starts disabled with SELECT A SIDE', () => {
  it('confirm button is disabled on initial wire', () => {
    buildDOM();
    wireStakingPanel('debate-tc18');

    const btn = document.getElementById('stake-confirm-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toBe('SELECT A SIDE');
  });
});

// ── TC19: wireStakingPanel — side click, no amount ───────────

describe('TC19 — wireStakingPanel: side click with no amount shows ENTER AMOUNT', () => {
  it('confirm button remains disabled and shows ENTER AMOUNT after side selection only', () => {
    buildDOM();
    wireStakingPanel('debate-tc19');

    const sideBtn = document.querySelector('.stake-side-btn[data-side="a"]') as HTMLButtonElement;
    sideBtn.click();

    const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
    expect(confirmBtn.textContent).toBe('ENTER AMOUNT');
  });
});

// ── TC20: wireStakingPanel — side + amount enables confirm ────

describe('TC20 — wireStakingPanel: side + amount enables confirm with STAKE N ON SIDE X', () => {
  it('confirm button enabled with correct text when side and amount are set', () => {
    buildDOM();
    const input = document.getElementById('stake-amount-input') as HTMLInputElement;
    input.value = '50';
    wireStakingPanel('debate-tc20');

    const sideBtn = document.querySelector('.stake-side-btn[data-side="a"]') as HTMLButtonElement;
    sideBtn.click();

    const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);
    expect(confirmBtn.textContent).toBe('STAKE 50 ON SIDE A');
  });
});

// ── TC21: wireStakingPanel — confirm calls place_stake RPC ────

describe('TC21 — wireStakingPanel: confirm click calls place_stake via safeRpc', () => {
  it('safeRpc called with place_stake, debateId, side and parsed amount on confirm', async () => {
    buildDOM();
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });
    const input = document.getElementById('stake-amount-input') as HTMLInputElement;
    input.value = '50';
    wireStakingPanel('debate-tc21');

    const sideBtn = document.querySelector('.stake-side-btn[data-side="b"]') as HTMLButtonElement;
    sideBtn.click();
    input.dispatchEvent(new Event('input'));

    const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();

    await vi.waitFor(() => expect(mockSafeRpc).toHaveBeenCalled());

    const [rpcName, rpcParams] = mockSafeRpc.mock.calls[0];
    expect(rpcName).toBe('place_stake');
    expect(rpcParams.p_debate_id).toBe('debate-tc21');
    expect(rpcParams.p_side).toBe('b');
    expect(rpcParams.p_amount).toBe(50);
  });
});

// ── TC22: wireStakingPanel — success path ─────────────────────

describe('TC22 — wireStakingPanel: success renders STAKE PLACED on confirm button', () => {
  it('sets confirm button text to "STAKE PLACED ✓" after successful placeStake', async () => {
    buildDOM();
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });
    const input = document.getElementById('stake-amount-input') as HTMLInputElement;
    input.value = '25';
    wireStakingPanel('debate-tc22');

    document.querySelector<HTMLButtonElement>('.stake-side-btn[data-side="a"]')!.click();
    input.dispatchEvent(new Event('input'));
    document.getElementById('stake-confirm-btn')!.click();

    await vi.waitFor(() =>
      expect((document.getElementById('stake-confirm-btn') as HTMLButtonElement).textContent)
        .toBe('STAKE PLACED ✓')
    );
  });
});

// ── TC23: wireStakingPanel — failure path ─────────────────────

describe('TC23 — wireStakingPanel: failure shows error in #stake-error element', () => {
  it('displays error text and shows #stake-error on placeStake failure', async () => {
    buildDOM();
    // Balance set high so client gate passes; server rejects via RPC response
    mockGetBalance.mockReturnValue(10000);
    mockSafeRpc.mockResolvedValue({ data: { success: false, error: 'Cap exceeded' }, error: null });
    const input = document.getElementById('stake-amount-input') as HTMLInputElement;
    input.value = '999';
    wireStakingPanel('debate-tc23');

    document.querySelector<HTMLButtonElement>('.stake-side-btn[data-side="a"]')!.click();
    input.dispatchEvent(new Event('input'));
    document.getElementById('stake-confirm-btn')!.click();

    const errorEl = document.getElementById('stake-error') as HTMLElement;
    await vi.waitFor(() => expect(errorEl.style.display).toBe('block'));
    expect(errorEl.textContent).toBe('Cap exceeded');
  });
});

// ── ARCH: staking.ts imports only from allowed sub-files ──────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/staking.ts imports only from its four allowed sub-files', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './staking.types.ts',
      './staking.rpc.ts',
      './staking.render.ts',
      './staking.wire.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/staking.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
