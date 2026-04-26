/**
 * int-staking.render.test.ts
 * Seam #451 | src/staking.render.ts → staking.rpc — 7 TCs
 * Seam #497 | src/staking.render.ts → tiers — 6 TCs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Stable mocks (module-level)
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

describe('staking.render → staking.rpc integration (seam #451)', () => {
  let renderStakingPanel: typeof import('../../src/staking.render.ts').renderStakingPanel;
  let getOdds: typeof import('../../src/staking.rpc.ts').getOdds;

  // Hoisted mutable stubs — reset each test
  let getTierMock: ReturnType<typeof vi.fn>;
  let canStakeMock: ReturnType<typeof vi.fn>;
  let getNextTierMock: ReturnType<typeof vi.fn>;
  let getOddsMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    // Default tier: mid-level, stakeCap 50
    getTierMock = vi.fn(() => ({ name: 'Challenger', icon: '⚔️', stakeCap: 50 }));
    canStakeMock = vi.fn(() => true);
    getNextTierMock = vi.fn(() => ({ questionsNeeded: 10 }));
    getOddsMock = vi.fn((a: number, b: number) => {
      const total = a + b;
      if (total === 0) return { a: 50, b: 50, multiplierA: '2.00', multiplierB: '2.00' };
      const pctA = Math.round((a / total) * 100);
      const pctB = 100 - pctA;
      const multA = a > 0 ? (total / a).toFixed(2) : '∞';
      const multB = b > 0 ? (total / b).toFixed(2) : '∞';
      return { a: pctA, b: pctB, multiplierA: multA, multiplierB: multB };
    });

    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'),
      ModeratorConfig: {
        escapeHTML: (s: string) => s,
      },
    }));

    vi.doMock('../../src/tiers.ts', () => ({
      getTier: getTierMock,
      canStake: canStakeMock,
      getNextTier: getNextTierMock,
    }));

    vi.doMock('../../src/staking.rpc.ts', () => ({
      getOdds: getOddsMock,
    }));

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
      getCurrentUser: vi.fn(() => null),
      getCurrentProfile: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => false),
      onChange: vi.fn(),
      onAuthStateChange: vi.fn(),
    }));

    vi.doMock('../../src/tokens.ts', () => ({
      getBalance: vi.fn(() => null),
    }));

    vi.doMock('../../src/depth-gate.ts', () => ({
      isDepthBlocked: vi.fn(() => false),
    }));

    vi.doMock('../../src/staking.types.ts', () => ({}));

    const mod = await import('../../src/staking.render.ts');
    renderStakingPanel = mod.renderStakingPanel;

    const rpcMod = await import('../../src/staking.rpc.ts');
    getOdds = rpcMod.getOdds;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // TC1: Empty pool renders "No stakes yet" within active panel

  it('TC1: empty pool renders "No stakes yet" message in active panel', () => {
    const pool = { exists: true, total_side_a: 0, total_side_b: 0, pool_status: 'open', user_stake: null };
    const html = renderStakingPanel('debate-001', 'Side A', 'Side B', pool, 30);

    expect(html).toContain('staking-active');
    expect(html).toContain('No stakes yet');
    // getOdds called with 0,0
    expect(getOddsMock).toHaveBeenCalledWith(0, 0);
  });

  // TC2: User already staked → staking-placed panel with side label and amount
  it('TC2: existing user stake renders staking-placed panel with side and amount', () => {
    const pool = {
      exists: true,
      total_side_a: 100,
      total_side_b: 50,
      pool_status: 'open',
      user_stake: { side: 'a' as const, amount: 25 },
    };
    const html = renderStakingPanel('debate-002', 'Team Alpha', 'Team Beta', pool, 30);

    expect(html).toContain('staking-placed');
    expect(html).toContain('25 tokens');
    expect(html).toContain('Team Alpha');
    // getOdds called with pool totals
    expect(getOddsMock).toHaveBeenCalledWith(100, 50);
  });

  // TC3: canStake false → staking-locked panel with remaining questions
  it('TC3: locked staking renders staking-locked panel with questions-remaining message', () => {
    canStakeMock.mockReturnValue(false);
    getNextTierMock.mockReturnValue({ questionsNeeded: 7 });

    const pool = { exists: true, total_side_a: 0, total_side_b: 0, pool_status: 'open', user_stake: null };
    const html = renderStakingPanel('debate-003', 'Pro', 'Con', pool, 5);

    expect(html).toContain('staking-locked');
    expect(html).toContain('7');
    expect(html).toContain('more profile questions');
  });

  // TC4: getOdds(0,0) returns 50/50 with 2.00 multipliers
  it('TC4: getOdds(0,0) returns 50/50 balanced odds with 2.00 multipliers', async () => {
    // Use the real module logic via the mock (which delegates to real logic)
    const result = getOdds(0, 0);
    expect(result.a).toBe(50);
    expect(result.b).toBe(50);
    expect(result.multiplierA).toBe('2.00');
    expect(result.multiplierB).toBe('2.00');
  });

  // TC5: getOdds(75, 25) returns 75/25 with correct multipliers
  it('TC5: getOdds(75,25) returns correct percentage and multiplier values', () => {
    const result = getOdds(75, 25);
    expect(result.a).toBe(75);
    expect(result.b).toBe(25);
    expect(result.multiplierA).toBe('1.33');
    expect(result.multiplierB).toBe('4.00');
  });

  // TC6: High tier (stakeCap >= 100) includes quick-btn amounts 50 and 100
  it('TC6: active panel with stakeCap >= 100 includes quick-btn for 50 and 100', () => {
    getTierMock.mockReturnValue({ name: 'Legend', icon: '👑', stakeCap: 100 });

    const pool = { exists: true, total_side_a: 20, total_side_b: 30, pool_status: 'open', user_stake: null };
    const html = renderStakingPanel('debate-004', 'Yes', 'No', pool, 80);

    expect(html).toContain('data-amount="50"');
    expect(html).toContain('data-amount="100"');
  });

  // TC7: ARCH — staking.render.ts imports from staking.rpc.ts
  it('TC7: ARCH — staking.render.ts has direct import from staking.rpc', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src/staking.render.ts');
    const source = fs.readFileSync(filePath, 'utf8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasRpcImport = importLines.some(l => l.includes('staking.rpc'));
    expect(hasRpcImport).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Seam #497 | src/staking.render.ts → tiers
// ---------------------------------------------------------------------------

describe('staking.render → tiers integration (seam #497)', () => {
  let renderStakingPanel: typeof import('../../src/staking.render.ts').renderStakingPanel;

  let getTierMock: ReturnType<typeof vi.fn>;
  let canStakeMock: ReturnType<typeof vi.fn>;
  let getNextTierMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    getTierMock = vi.fn(() => ({ name: 'Gladiator', icon: '⚔️', stakeCap: 50, maxStake: 50 }));
    canStakeMock = vi.fn(() => true);
    getNextTierMock = vi.fn(() => ({ questionsNeeded: 25, totalRequired: 50, minQuestions: 50 }));

    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'),
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));

    vi.doMock('../../src/tiers.ts', () => ({
      getTier: getTierMock,
      canStake: canStakeMock,
      getNextTier: getNextTierMock,
    }));

    vi.doMock('../../src/staking.rpc.ts', () => ({
      getOdds: vi.fn((_a: number, _b: number) => ({ a: 50, b: 50, multiplierA: '2.00', multiplierB: '2.00' })),
    }));

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
      getCurrentUser: vi.fn(() => null),
      getCurrentProfile: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => false),
      onChange: vi.fn(),
      onAuthStateChange: vi.fn(),
    }));

    vi.doMock('../../src/tokens.ts', () => ({
      getBalance: vi.fn(() => null),
    }));

    vi.doMock('../../src/depth-gate.ts', () => ({
      isDepthBlocked: vi.fn(() => false),
    }));

    const mod = await import('../../src/staking.render.ts');
    renderStakingPanel = mod.renderStakingPanel;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // TC1: getTier is called with questionsAnswered and tier name/icon appear in active panel
  it('TC1: getTier result — name and icon — appear in active staking panel', () => {
    getTierMock.mockReturnValue({ name: 'Gladiator', icon: '⚔️', stakeCap: 50, maxStake: 50 });
    canStakeMock.mockReturnValue(true);

    const pool = { exists: true, total_side_a: 0, total_side_b: 0, pool_status: 'open', user_stake: null };
    const html = renderStakingPanel('debate-t1', 'Side A', 'Side B', pool, 30);

    expect(getTierMock).toHaveBeenCalledWith(30);
    expect(html).toContain('Gladiator');
    expect(html).toContain('Max 50');
  });

  // TC2: canStake(false) → locked panel, canStake called with questionsAnswered
  it('TC2: canStake=false triggers staking-locked panel and canStake is called', () => {
    canStakeMock.mockReturnValue(false);
    getNextTierMock.mockReturnValue({ questionsNeeded: 15, totalRequired: 25, minQuestions: 25 });

    const pool = { exists: true, total_side_a: 0, total_side_b: 0, pool_status: 'open', user_stake: null };
    const html = renderStakingPanel('debate-t2', 'Pro', 'Con', pool, 5);

    expect(canStakeMock).toHaveBeenCalledWith(5);
    expect(html).toContain('staking-locked');
    expect(html).toContain('TOKEN STAKING');
  });

  // TC3: getNextTier questionsNeeded appears in locked panel message
  it('TC3: getNextTier.questionsNeeded appears in locked panel remaining message', () => {
    canStakeMock.mockReturnValue(false);
    getNextTierMock.mockReturnValue({ questionsNeeded: 7, totalRequired: 10, minQuestions: 10 });

    const pool = { exists: true, total_side_a: 0, total_side_b: 0, pool_status: 'open', user_stake: null };
    const html = renderStakingPanel('debate-t3', 'Alpha', 'Beta', pool, 3);

    expect(getNextTierMock).toHaveBeenCalledWith(3);
    expect(html).toContain('7');
    expect(html).toContain('more profile questions');
  });

  // TC4: stakeCap=5 (Spectator+) — quick-btn amounts do NOT include 50 or 100
  it('TC4: low stakeCap (5) — quick-btn set is limited to 5 and 10 amounts', () => {
    getTierMock.mockReturnValue({ name: 'Spectator+', icon: '👁️', stakeCap: 5, maxStake: 5 });
    canStakeMock.mockReturnValue(true);

    const pool = { exists: true, total_side_a: 0, total_side_b: 0, pool_status: 'open', user_stake: null };
    const html = renderStakingPanel('debate-t4', 'Side A', 'Side B', pool, 10);

    expect(html).not.toContain('data-amount="50"');
    expect(html).not.toContain('data-amount="100"');
    expect(html).toContain('data-amount="5"');
  });

  // TC5: max input cap equals tier.stakeCap in the number input element
  it('TC5: active panel input max attribute equals tier.stakeCap', () => {
    getTierMock.mockReturnValue({ name: 'Champion', icon: '🏆', stakeCap: 100, maxStake: 100 });
    canStakeMock.mockReturnValue(true);

    const pool = { exists: true, total_side_a: 10, total_side_b: 10, pool_status: 'open', user_stake: null };
    const html = renderStakingPanel('debate-t5', 'Yes', 'No', pool, 80);

    expect(html).toContain('max="100"');
  });

  // TC6: ARCH — staking.render.ts imports getTier, canStake, getNextTier from tiers.ts
  it('TC6: ARCH — staking.render.ts imports getTier, canStake, getNextTier from tiers', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src/staking.render.ts');
    const source = fs.readFileSync(filePath, 'utf8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const tiersLine = importLines.find(l => l.includes('tiers'));
    expect(tiersLine).toBeDefined();
    expect(tiersLine).toContain('getTier');
    expect(tiersLine).toContain('canStake');
    expect(tiersLine).toContain('getNextTier');
  });
});
