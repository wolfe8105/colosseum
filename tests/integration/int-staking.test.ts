/**
 * int-staking.test.ts
 * Seam #335 | src/staking.ts → staking.rpc
 * 5 TCs
 *
 * Verifies that staking.ts barrel correctly re-exports the four public
 * functions from staking.rpc.ts and that those re-exports behave identically
 * to direct imports.
 *
 * Seam #432 | src/staking.ts → staking.wire  — 7 TCs
 * Seam #433 | src/staking.ts → staking.render — 7 TCs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Stable mocks (module-level) — only @supabase/supabase-js
// ---------------------------------------------------------------------------

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() })),
  })),
}));

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('staking.ts barrel → staking.rpc (seam #335)', () => {
  let placeStake: typeof import('../../src/staking.ts').placeStake;
  let getPool: typeof import('../../src/staking.ts').getPool;
  let settleStakes: typeof import('../../src/staking.ts').settleStakes;
  let getOdds: typeof import('../../src/staking.ts').getOdds;

  let safeRpcMock: ReturnType<typeof vi.fn>;
  let isDepthBlockedMock: ReturnType<typeof vi.fn>;
  let getBalanceMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    safeRpcMock = vi.fn(() => Promise.resolve({ data: { success: true }, error: null }));
    isDepthBlockedMock = vi.fn(() => false);
    getBalanceMock = vi.fn(() => null);

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: safeRpcMock,
      getCurrentUser: vi.fn(() => ({ id: 'user-barrel' })),
      getCurrentProfile: vi.fn(() => ({ token_balance: 500 })),
      getIsPlaceholderMode: vi.fn(() => false),
      onChange: vi.fn(),
      onAuthStateChange: vi.fn(),
    }));

    vi.doMock('../../src/tokens.ts', () => ({
      getBalance: getBalanceMock,
    }));

    vi.doMock('../../src/depth-gate.ts', () => ({
      isDepthBlocked: isDepthBlockedMock,
    }));

    vi.doMock('../../src/staking.types.ts', () => ({}));
    vi.doMock('../../src/staking.render.ts', () => ({
      renderStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/staking.wire.ts', () => ({
      wireStakingPanel: vi.fn(),
    }));

    const mod = await import('../../src/staking.ts');
    placeStake = mod.placeStake;
    getPool = mod.getPool;
    settleStakes = mod.settleStakes;
    getOdds = mod.getOdds;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // ARCH: staking.ts re-exports from staking.rpc.ts
  // -------------------------------------------------------------------------
  it('ARCH: staking.ts imports placeStake/getPool/settleStakes/getOdds from staking.rpc.ts', async () => {
    const source = await import('../../src/staking.ts?raw').then((m: { default: string }) => m.default).catch(() => '');
    expect(source.length).toBeGreaterThan(0);
    const importLines = source.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const hasRpc = importLines.some((l: string) => l.includes("'./staking.rpc.ts'") || l.includes('"./staking.rpc.ts"'));
    expect(hasRpc).toBe(true);
    expect(source).toContain('placeStake');
    expect(source).toContain('getPool');
    expect(source).toContain('settleStakes');
    expect(source).toContain('getOdds');
  });

  // -------------------------------------------------------------------------
  // TC2: placeStake re-export works — calls place_stake RPC
  // -------------------------------------------------------------------------
  it('TC2: placeStake from barrel calls place_stake RPC with correct params', async () => {
    safeRpcMock.mockResolvedValue({ data: { success: true, stake_id: 'stk-barrel' }, error: null });

    const result = await placeStake('debate-barrel-01', 'b', 100);

    expect(safeRpcMock).toHaveBeenCalledWith('place_stake', {
      p_debate_id: 'debate-barrel-01',
      p_side: 'b',
      p_amount: 100,
    });
    expect(result.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // TC3: getPool re-export works — calls get_stake_pool RPC
  // -------------------------------------------------------------------------
  it('TC3: getPool from barrel calls get_stake_pool RPC and returns pool data', async () => {
    const fakePool = {
      exists: true,
      total_side_a: 400,
      total_side_b: 200,
      pool_status: 'open',
      user_stake: null,
    };
    safeRpcMock.mockResolvedValue({ data: fakePool, error: null });

    const result = await getPool('debate-barrel-02');

    expect(safeRpcMock).toHaveBeenCalledWith('get_stake_pool', { p_debate_id: 'debate-barrel-02' });
    expect(result.exists).toBe(true);
    expect(result.total_side_a).toBe(400);
  });

  // -------------------------------------------------------------------------
  // TC4: settleStakes re-export works — calls settle_stakes RPC
  // -------------------------------------------------------------------------
  it('TC4: settleStakes from barrel calls settle_stakes RPC', async () => {
    safeRpcMock.mockResolvedValue({ data: { success: true, payout: 600 }, error: null });

    const result = await settleStakes('debate-barrel-03');

    expect(safeRpcMock).toHaveBeenCalledWith('settle_stakes', { p_debate_id: 'debate-barrel-03' });
    expect(result.success).toBe(true);
    expect((result as { payout?: number }).payout).toBe(600);
  });

  // -------------------------------------------------------------------------
  // TC5: getOdds re-export works — pure function, 50/50 on empty pool
  // -------------------------------------------------------------------------
  it('TC5: getOdds from barrel returns 50/50 for empty pool and correct split for known totals', () => {
    const empty = getOdds(0, 0);
    expect(empty.a).toBe(50);
    expect(empty.b).toBe(50);
    expect(empty.multiplierA).toBe('2.00');
    expect(empty.multiplierB).toBe('2.00');

    // 600 on A, 200 on B → 75% A, 25% B
    const split = getOdds(600, 200);
    expect(split.a).toBe(75);
    expect(split.b).toBe(25);
    expect(split.multiplierA).toBe((800 / 600).toFixed(2));
    expect(split.multiplierB).toBe((800 / 200).toFixed(2));
  });
});

// =============================================================================
// Seam #432 | src/staking.ts → staking.wire — 7 TCs
// =============================================================================

describe('staking.ts → staking.wire (seam #432)', () => {
  // placeStakeMock is per-test; reassigned in beforeEach
  let placeStakeMock: ReturnType<typeof vi.fn>;
  // getWire: returns a fresh wireStakingPanel bound to the current placeStakeMock
  let getWire: () => Promise<typeof import('../../src/staking.wire.ts').wireStakingPanel>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    placeStakeMock = vi.fn(() => Promise.resolve({ success: true }));

    // Restore staking.wire.ts to real implementation (seam#335 registered a doMock for it)
    vi.doMock('../../src/staking.wire.ts', async () => {
      const actual = await vi.importActual<typeof import('../../src/staking.wire.ts')>('../../src/staking.wire.ts');
      return actual;
    });

    vi.doMock('../../src/staking.rpc.ts', () => ({
      placeStake: (...args: unknown[]) => placeStakeMock(...args),
      getPool: vi.fn(),
      settleStakes: vi.fn(),
      getOdds: vi.fn(() => ({ a: 50, b: 50, multiplierA: '2.00', multiplierB: '2.00' })),
    }));

    getWire = async () => {
      vi.resetModules();
      vi.doMock('../../src/staking.wire.ts', async () => {
        const actual = await vi.importActual<typeof import('../../src/staking.wire.ts')>('../../src/staking.wire.ts');
        return actual;
      });
      vi.doMock('../../src/staking.rpc.ts', () => ({
        placeStake: (...args: unknown[]) => placeStakeMock(...args),
        getPool: vi.fn(),
        settleStakes: vi.fn(),
        getOdds: vi.fn(() => ({ a: 50, b: 50, multiplierA: '2.00', multiplierB: '2.00' })),
      }));
      const m = await import('../../src/staking.wire.ts');
      return m.wireStakingPanel;
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  // TC-W1: ARCH filter
  it('TC-W1 ARCH: staking.ts re-exports wireStakingPanel from ./staking.wire.ts', async () => {
    const source = await import('../../src/staking.ts?raw')
      .then((m: { default: string }) => m.default)
      .catch(() => '');
    expect(source.length).toBeGreaterThan(0);
    const importLines = source.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const hasWire = importLines.some(
      (l: string) => l.includes("'./staking.wire.ts'") || l.includes('"./staking.wire.ts"'),
    );
    expect(hasWire).toBe(true);
    expect(source).toContain('wireStakingPanel');
  });

  // TC-W2: clicking side-btn enables confirm when amount > 0
  it('TC-W2: clicking .stake-side-btn + entering amount > 0 enables confirm button', async () => {
    const wireStakingPanel = await getWire();
    document.body.innerHTML = `
      <button class="stake-side-btn" data-side="a">Side A</button>
      <button class="stake-side-btn" data-side="b">Side B</button>
      <input id="stake-amount-input" value="25" />
      <button id="stake-confirm-btn" disabled></button>
      <div id="stake-error" style="display:none;"></div>
    `;
    wireStakingPanel('debate-w2');
    (document.querySelector('.stake-side-btn[data-side="a"]') as HTMLButtonElement).click();
    const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);
    expect(confirmBtn.textContent).toContain('STAKE 25 ON SIDE A');
  });

  // TC-W3: clicking quick-amount btn sets input value
  it('TC-W3: clicking .stake-quick-btn sets stake-amount-input value', async () => {
    const wireStakingPanel = await getWire();
    document.body.innerHTML = `
      <button class="stake-side-btn" data-side="a">Side A</button>
      <button class="stake-quick-btn" data-amount="50">50</button>
      <input id="stake-amount-input" value="" />
      <button id="stake-confirm-btn" disabled></button>
      <div id="stake-error"></div>
    `;
    wireStakingPanel('debate-w3');
    (document.querySelector('.stake-quick-btn') as HTMLButtonElement).click();
    const input = document.getElementById('stake-amount-input') as HTMLInputElement;
    expect(input.value).toBe('50');
  });

  // TC-W4: confirm button click calls placeStake with correct args
  it('TC-W4: confirm button click calls placeStake(debateId, side, amount)', async () => {
    const wireStakingPanel = await getWire();
    document.body.innerHTML = `
      <button class="stake-side-btn" data-side="b">Side B</button>
      <input id="stake-amount-input" value="10" />
      <button id="stake-confirm-btn" disabled></button>
      <div id="stake-error" style="display:none;"></div>
    `;
    wireStakingPanel('debate-w4');
    (document.querySelector('.stake-side-btn[data-side="b"]') as HTMLButtonElement).click();
    const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();
    // flush microtasks
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(placeStakeMock).toHaveBeenCalledWith('debate-w4', 'b', 10);
  });

  // TC-W5: on success, confirm button says "STAKE PLACED ✓"
  it('TC-W5: on placeStake success, confirm button text becomes "STAKE PLACED ✓"', async () => {
    placeStakeMock = vi.fn(() => Promise.resolve({ success: true }));
    const wireStakingPanel = await getWire();
    document.body.innerHTML = `
      <button class="stake-side-btn" data-side="a">Side A</button>
      <input id="stake-amount-input" value="5" />
      <button id="stake-confirm-btn" disabled></button>
      <div id="stake-error" style="display:none;"></div>
    `;
    wireStakingPanel('debate-w5');
    (document.querySelector('.stake-side-btn[data-side="a"]') as HTMLButtonElement).click();
    const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(confirmBtn.textContent).toBe('STAKE PLACED ✓');
  });

  // TC-W6: on placeStake failure, stake-error is shown with error text
  it('TC-W6: on placeStake failure, #stake-error is shown with error text', async () => {
    placeStakeMock = vi.fn(() => Promise.resolve({ success: false, error: 'Insufficient balance (10 tokens)' }));
    const wireStakingPanel = await getWire();
    document.body.innerHTML = `
      <button class="stake-side-btn" data-side="a">Side A</button>
      <input id="stake-amount-input" value="20" />
      <button id="stake-confirm-btn" disabled></button>
      <div id="stake-error" style="display:none;"></div>
    `;
    wireStakingPanel('debate-w6');
    (document.querySelector('.stake-side-btn[data-side="a"]') as HTMLButtonElement).click();
    const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    const errorEl = document.getElementById('stake-error') as HTMLElement;
    expect(errorEl.style.display).toBe('block');
    expect(errorEl.textContent).toContain('Insufficient balance');
  });

  // TC-W7: on unexpected throw, stake-error shows generic message
  it('TC-W7: on placeStake unexpected throw, #stake-error shows "Unexpected error"', async () => {
    placeStakeMock = vi.fn(() => Promise.reject(new Error('network failure')));
    const wireStakingPanel = await getWire();
    document.body.innerHTML = `
      <button class="stake-side-btn" data-side="b">Side B</button>
      <input id="stake-amount-input" value="15" />
      <button id="stake-confirm-btn" disabled></button>
      <div id="stake-error" style="display:none;"></div>
    `;
    wireStakingPanel('debate-w7');
    (document.querySelector('.stake-side-btn[data-side="b"]') as HTMLButtonElement).click();
    const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement;
    confirmBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    const errorEl = document.getElementById('stake-error') as HTMLElement;
    expect(errorEl.style.display).toBe('block');
    expect(errorEl.textContent).toContain('Unexpected error');
  });
});

// =============================================================================
// Seam #433 | src/staking.ts → staking.render — 7 TCs
// =============================================================================

describe('staking.ts → staking.render (seam #433)', () => {
  let renderStakingPanel: typeof import('../../src/staking.render.ts').renderStakingPanel;

  const defaultPool = {
    exists: true,
    total_side_a: 0,
    total_side_b: 0,
    pool_status: 'open',
    user_stake: null as null | { side: 'a' | 'b'; amount: number },
  };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    // Restore staking.render.ts to real implementation (seam#335 registered a doMock for it)
    vi.doMock('../../src/staking.render.ts', async () => {
      const actual = await vi.importActual<typeof import('../../src/staking.render.ts')>('../../src/staking.render.ts');
      return actual;
    });

    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
      ModeratorConfig: { escapeHTML: (s: string) => s },
      showToast: vi.fn(),
    }));

    vi.doMock('../../src/tiers.ts', () => ({
      getTier: vi.fn((qa: number) => ({
        tier: qa >= 25 ? 2 : 0,
        name: qa >= 25 ? 'Contender' : 'Spectator',
        icon: qa >= 25 ? 'box' : 'eye',
        stakeCap: qa >= 25 ? 25 : 0,
        questionsAnswered: qa,
        slots: 1,
        min: 0,
        maxStake: 0,
      })),
      canStake: vi.fn((qa: number) => qa >= 25),
      getNextTier: vi.fn((_qa: number) => ({
        tier: 2,
        name: 'Contender',
        icon: 'box',
        questionsNeeded: 5,
        totalRequired: 25,
        minQuestions: 25,
      })),
    }));

    vi.doMock('../../src/staking.rpc.ts', () => ({
      getOdds: vi.fn((a: number, b: number) => {
        const total = a + b;
        if (total === 0) return { a: 50, b: 50, multiplierA: '2.00', multiplierB: '2.00' };
        const pctA = Math.round((a / total) * 100);
        return { a: pctA, b: 100 - pctA, multiplierA: '2.00', multiplierB: '2.00' };
      }),
      placeStake: vi.fn(),
      getPool: vi.fn(),
      settleStakes: vi.fn(),
    }));

    const mod = await import('../../src/staking.render.ts');
    renderStakingPanel = mod.renderStakingPanel;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // TC-R1: ARCH filter
  it('TC-R1 ARCH: staking.ts re-exports renderStakingPanel from ./staking.render.ts', async () => {
    const source = await import('../../src/staking.ts?raw')
      .then((m: { default: string }) => m.default)
      .catch(() => '');
    expect(source.length).toBeGreaterThan(0);
    const importLines = source.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const hasRender = importLines.some(
      (l: string) => l.includes("'./staking.render.ts'") || l.includes('"./staking.render.ts"'),
    );
    expect(hasRender).toBe(true);
    expect(source).toContain('renderStakingPanel');
  });

  // TC-R2: staking-placed panel when user_stake exists
  it('TC-R2: returns staking-placed HTML when pool.user_stake is set', () => {
    const pool = {
      ...defaultPool,
      total_side_a: 100,
      total_side_b: 50,
      user_stake: { side: 'a' as const, amount: 20 },
    };
    const html = renderStakingPanel('debate-r2', 'Side A', 'Side B', pool, 30);
    expect(html).toContain('staking-placed');
    expect(html).toContain('YOUR STAKE');
    expect(html).toContain('20 tokens');
    expect(html).toContain('Side A');
  });

  // TC-R3: staking-locked panel when canStake is false
  it('TC-R3: returns staking-locked HTML when questionsAnswered < 25', () => {
    const html = renderStakingPanel('debate-r3', 'Claim A', 'Claim B', defaultPool, 10);
    expect(html).toContain('staking-locked');
    expect(html).toContain('TOKEN STAKING');
    expect(html).toContain('more profile questions');
  });

  // TC-R4: staking-active panel when user can stake
  it('TC-R4: returns staking-active HTML when questionsAnswered >= 25 and no existing stake', () => {
    const html = renderStakingPanel('debate-r4', 'Pro', 'Con', defaultPool, 30);
    expect(html).toContain('staking-active');
    expect(html).toContain('STAKE TOKENS');
  });

  // TC-R5: active panel includes side buttons with correct data-side
  it('TC-R5: active panel contains stake-side-btn buttons with data-side="a" and data-side="b"', () => {
    const html = renderStakingPanel('debate-r5', 'Alpha', 'Beta', defaultPool, 30);
    expect(html).toContain('data-side="a"');
    expect(html).toContain('data-side="b"');
    expect(html).toContain('data-debate="debate-r5"');
  });

  // TC-R6: active panel includes confirm button and amount input
  it('TC-R6: active panel contains stake-confirm-btn and stake-amount-input', () => {
    const html = renderStakingPanel('debate-r6', 'Yes', 'No', defaultPool, 50);
    expect(html).toContain('id="stake-confirm-btn"');
    expect(html).toContain('id="stake-amount-input"');
    expect(html).toContain('id="stake-error"');
  });

  // TC-R7: empty pool shows "No stakes yet" message
  it('TC-R7: empty pool (total=0) renders "No stakes yet" message in pool bar', () => {
    const html = renderStakingPanel('debate-r7', 'Up', 'Down', defaultPool, 30);
    expect(html).toContain('No stakes yet');
  });
});
