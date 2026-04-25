// int-tokens-milestones.test.ts
// Seam #252 — src/tokens.ts → tokens.milestones
// Tests: claimMilestone RPC + DOM, dedup guard, _loadMilestones hydration,
//        getMilestoneList shape, checkProfileMilestones thresholds, ARCH import check.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
    },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// ----------------------------------------------------------------
// Shared mock factory
// ----------------------------------------------------------------
function setupMocks(
  rpcImpl: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> = vi.fn().mockResolvedValue({ data: null, error: null })
) {
  vi.doMock('../../src/config.ts', () => ({
    showToast: vi.fn(),
    escapeHTML: (s: string) => s,
    UUID_RE: /^[0-9a-f-]{36}$/i,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
    placeholderMode: { supabase: false },
    friendlyError: vi.fn(),
    FEATURES: {},
  }));
  vi.doMock('../../src/auth.ts', () => ({
    safeRpc: rpcImpl,
    getCurrentUser: vi.fn(() => ({ id: 'user-xyz' })),
    getCurrentProfile: vi.fn(() => ({ id: 'user-xyz', token_balance: 100 })),
    getIsPlaceholderMode: vi.fn(() => false),
    onChange: vi.fn(),
  }));
  vi.doMock('../../src/auth.core.ts', () => ({
    _notify: vi.fn(),
  }));
  vi.doMock('../../src/onboarding-drip.ts', () => ({
    triggerDripDay: vi.fn().mockResolvedValue(undefined),
  }));
}

// ----------------------------------------------------------------
// ARCH
// ----------------------------------------------------------------
describe('Seam #252 — tokens.milestones.ts ARCH', () => {
  it('ARCH: tokens.milestones.ts imports _rpc and _updateBalanceDisplay from ./tokens.balance.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/tokens.milestones.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasBalance = lines.some(
      (l: string) => l.includes('_rpc') && l.includes('./tokens.balance')
    );
    const hasUpdateBalance = lines.some(
      (l: string) => l.includes('_updateBalanceDisplay') && l.includes('./tokens.balance')
    );
    expect(hasBalance, 'Should import _rpc from ./tokens.balance').toBe(true);
    expect(hasUpdateBalance, 'Should import _updateBalanceDisplay from ./tokens.balance').toBe(true);
  });

  it('ARCH: tokens.milestones.ts imports _milestoneToast from ./tokens.animations.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/tokens.milestones.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasToast = lines.some(
      (l: string) => l.includes('_milestoneToast') && l.includes('./tokens.animations')
    );
    expect(hasToast, 'Should import _milestoneToast from ./tokens.animations').toBe(true);
  });
});

// ----------------------------------------------------------------
// TC1: claimMilestone — success path: RPC called, balance updated, toast injected
// ----------------------------------------------------------------
describe('Seam #252 — claimMilestone success path', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC1: claimMilestone calls claim_milestone RPC and renders .milestone-toast on success', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockSafeRpc = vi.fn().mockResolvedValue({
      data: { success: true, tokens_earned: 25, new_balance: 125, freezes_earned: 0 },
      error: null,
    });

    setupMocks(mockSafeRpc);

    const mod = await import('../../src/tokens.milestones.ts');
    const resultPromise = mod.claimMilestone('first_hot_take');
    await vi.advanceTimersByTimeAsync(100);
    const result = await resultPromise;

    expect(mockSafeRpc).toHaveBeenCalledWith('claim_milestone', { p_milestone_key: 'first_hot_take' });
    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);
    expect(result?.tokens_earned).toBe(25);
    // milestone-toast should be injected into the DOM
    const toast = document.querySelector('.milestone-toast');
    expect(toast).not.toBeNull();
  });
});

// ----------------------------------------------------------------
// TC2: claimMilestone dedup — second call with same key skips RPC
// ----------------------------------------------------------------
describe('Seam #252 — claimMilestone dedup guard', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC2: second claimMilestone call with same key returns null without calling RPC again', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockSafeRpc = vi.fn().mockResolvedValue({
      data: { success: true, tokens_earned: 50, new_balance: 150, freezes_earned: 0 },
      error: null,
    });

    setupMocks(mockSafeRpc);

    const mod = await import('../../src/tokens.milestones.ts');

    // First call — should succeed
    const p1 = mod.claimMilestone('first_debate');
    await vi.advanceTimersByTimeAsync(100);
    const r1 = await p1;
    expect(r1).not.toBeNull();
    expect(mockSafeRpc).toHaveBeenCalledTimes(1);

    // Second call — same key — should be deduped
    const p2 = mod.claimMilestone('first_debate');
    await vi.advanceTimersByTimeAsync(100);
    const r2 = await p2;
    expect(r2).toBeNull();
    // RPC must NOT have been called a second time
    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
  });
});

// ----------------------------------------------------------------
// TC3: claimMilestone — "Already claimed" error marks key as claimed
// ----------------------------------------------------------------
describe('Seam #252 — claimMilestone Already-claimed error', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC3: claimMilestone marks key claimed when RPC returns Already claimed error', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockSafeRpc = vi.fn().mockResolvedValue({
      data: { success: false, error: 'Already claimed' },
      error: null,
    });

    setupMocks(mockSafeRpc);

    const mod = await import('../../src/tokens.milestones.ts');
    const p1 = mod.claimMilestone('first_vote');
    await vi.advanceTimersByTimeAsync(100);
    const r1 = await p1;
    expect(r1).toBeNull();
    expect(mockSafeRpc).toHaveBeenCalledTimes(1);

    // Second call — key should now be in dedup cache, RPC not called again
    const p2 = mod.claimMilestone('first_vote');
    await vi.advanceTimersByTimeAsync(100);
    const r2 = await p2;
    expect(r2).toBeNull();
    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
  });
});

// ----------------------------------------------------------------
// TC4: _loadMilestones — hydrates claimed set from get_my_milestones
// ----------------------------------------------------------------
describe('Seam #252 — _loadMilestones hydrates claimed set', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC4: _loadMilestones calls get_my_milestones and prevents subsequent claimMilestone RPC', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // First call = _loadMilestones (get_my_milestones), second would be claimMilestone
    const mockSafeRpc = vi.fn()
      .mockResolvedValueOnce({
        data: { success: true, claimed: ['first_reaction', 'first_ai_sparring'] },
        error: null,
      })
      .mockResolvedValue({
        data: { success: true, tokens_earned: 5, new_balance: 105, freezes_earned: 0 },
        error: null,
      });

    setupMocks(mockSafeRpc);

    const mod = await import('../../src/tokens.milestones.ts');

    // Load milestones — should hydrate 'first_reaction' and 'first_ai_sparring'
    const loadPromise = mod._loadMilestones();
    await vi.advanceTimersByTimeAsync(100);
    await loadPromise;

    expect(mockSafeRpc).toHaveBeenCalledWith('get_my_milestones', {});

    // 'first_reaction' is now in set — claimMilestone should return null immediately
    const claimPromise = mod.claimMilestone('first_reaction');
    await vi.advanceTimersByTimeAsync(100);
    const claimResult = await claimPromise;
    expect(claimResult).toBeNull();
    // Only the one get_my_milestones call, no additional claim RPC
    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
  });
});

// ----------------------------------------------------------------
// TC5: getMilestoneList — returns all 13 keys with correct shape
// ----------------------------------------------------------------
describe('Seam #252 — getMilestoneList shape', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC5: getMilestoneList returns all 13 milestone keys with required fields', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    setupMocks();

    const mod = await import('../../src/tokens.milestones.ts');
    const list = mod.getMilestoneList();

    expect(list.length).toBe(13);
    const expectedKeys = [
      'first_hot_take', 'first_debate', 'first_vote', 'first_reaction',
      'first_ai_sparring', 'first_prediction',
      'profile_3_sections', 'profile_6_sections', 'profile_12_sections',
      'verified_gladiator', 'streak_7', 'streak_30', 'streak_100',
    ];
    for (const key of expectedKeys) {
      const item = list.find(i => i.key === key);
      expect(item, `Missing milestone key: ${key}`).toBeDefined();
      expect(typeof item!.label).toBe('string');
      expect(typeof item!.tokens).toBe('number');
      expect(typeof item!.claimed).toBe('boolean');
      expect(item!.claimed).toBe(false);
    }
  });

  it('TC5b: getMilestoneList reflects claimed state after successful claimMilestone', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockSafeRpc = vi.fn().mockResolvedValue({
      data: { success: true, tokens_earned: 10, new_balance: 110, freezes_earned: 0 },
      error: null,
    });

    setupMocks(mockSafeRpc);

    const mod = await import('../../src/tokens.milestones.ts');

    // Before claiming
    let list = mod.getMilestoneList();
    const before = list.find(i => i.key === 'first_prediction');
    expect(before?.claimed).toBe(false);

    // Claim it
    const p = mod.claimMilestone('first_prediction');
    await vi.advanceTimersByTimeAsync(100);
    await p;

    // After claiming
    list = mod.getMilestoneList();
    const after = list.find(i => i.key === 'first_prediction');
    expect(after?.claimed).toBe(true);
  });
});

// ----------------------------------------------------------------
// TC6: checkProfileMilestones — correct thresholds trigger correct RPCs
// ----------------------------------------------------------------
describe('Seam #252 — checkProfileMilestones thresholds', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC6: checkProfileMilestones(3) triggers claim_milestone for profile_3_sections and verified_gladiator', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockSafeRpc = vi.fn().mockResolvedValue({
      data: { success: true, tokens_earned: 30, new_balance: 130, freezes_earned: 0 },
      error: null,
    });

    setupMocks(mockSafeRpc);

    const mod = await import('../../src/tokens.milestones.ts');
    const checkPromise = mod.checkProfileMilestones(3);
    await vi.advanceTimersByTimeAsync(200);
    await checkPromise;

    const calledKeys = mockSafeRpc.mock.calls
      .filter((c: unknown[]) => c[0] === 'claim_milestone')
      .map((c: unknown[]) => (c[1] as { p_milestone_key: string }).p_milestone_key);

    expect(calledKeys).toContain('profile_3_sections');
    expect(calledKeys).toContain('verified_gladiator');
    expect(calledKeys).not.toContain('profile_6_sections');
    expect(calledKeys).not.toContain('profile_12_sections');
  });

  it('TC6b: checkProfileMilestones(12) triggers all four profile milestones', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockSafeRpc = vi.fn().mockResolvedValue({
      data: { success: true, tokens_earned: 150, new_balance: 250, freezes_earned: 0 },
      error: null,
    });

    setupMocks(mockSafeRpc);

    const mod = await import('../../src/tokens.milestones.ts');
    const checkPromise = mod.checkProfileMilestones(12);
    await vi.advanceTimersByTimeAsync(200);
    await checkPromise;

    const calledKeys = mockSafeRpc.mock.calls
      .filter((c: unknown[]) => c[0] === 'claim_milestone')
      .map((c: unknown[]) => (c[1] as { p_milestone_key: string }).p_milestone_key);

    expect(calledKeys).toContain('profile_3_sections');
    expect(calledKeys).toContain('profile_6_sections');
    expect(calledKeys).toContain('profile_12_sections');
    expect(calledKeys).toContain('verified_gladiator');
  });

  it('TC6c: checkProfileMilestones(0) calls no RPCs', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockSafeRpc = vi.fn();
    setupMocks(mockSafeRpc);

    const mod = await import('../../src/tokens.milestones.ts');
    const checkPromise = mod.checkProfileMilestones(0);
    await vi.advanceTimersByTimeAsync(100);
    await checkPromise;

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------
// TC7: MILESTONES constant — streak milestones award freezes not tokens
// ----------------------------------------------------------------
describe('Seam #252 — MILESTONES constant shape', () => {
  it('TC7: streak milestones have tokens=0 and freezes defined; token milestones have tokens>0', async () => {
    vi.resetModules();

    setupMocks();

    const mod = await import('../../src/tokens.milestones.ts');
    const M = mod.MILESTONES;

    // Streak milestones award freezes, not tokens
    expect(M.streak_7.tokens).toBe(0);
    expect(M.streak_7.freezes).toBe(1);
    expect(M.streak_30.tokens).toBe(0);
    expect(M.streak_30.freezes).toBe(3);
    expect(M.streak_100.tokens).toBe(0);
    expect(M.streak_100.freezes).toBe(5);

    // Token milestones have positive tokens
    expect(M.first_hot_take.tokens).toBeGreaterThan(0);
    expect(M.first_debate.tokens).toBeGreaterThan(0);
    expect(M.verified_gladiator.tokens).toBeGreaterThan(0);
  });
});
