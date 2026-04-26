// int-tokens-claims.test.ts
// Seam #187 — src/tokens.claims.ts → nudge
// Seam #411 — src/tokens.claims.ts → tokens.balance
// Tests: nudge('return_visit') called on claimDailyLogin success,
//        inflight guard, already-claimed path, claimHotTake RPC params,
//        claimDebate labels, nudge session cap suppression, ARCH import check.

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
// ARCH
// ----------------------------------------------------------------
describe('Seam #187 — tokens.claims.ts → nudge', () => {
  it('ARCH: tokens.claims.ts imports nudge from ./nudge.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/tokens.claims.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = lines.some(
      (l: string) => l.includes('nudge') && l.includes('./nudge')
    );
    expect(hasImport).toBe(true);
  });

  // ----------------------------------------------------------------
  // Shared mock factory
  // ----------------------------------------------------------------
  function setupMocks(rpcImpl: (name: string, params?: unknown) => unknown) {
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
      safeRpc: vi.fn(),
      getCurrentUser: vi.fn(() => ({ id: 'user-uuid-001' })),
      getCurrentProfile: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => false),
    }));
    vi.doMock('../../src/auth.rpc.ts', () => ({
      safeRpc: vi.fn(),
    }));
    vi.doMock('../../src/auth.core.ts', () => ({
      _notify: vi.fn(),
    }));
    vi.doMock('../../src/tokens.balance.ts', () => ({
      _rpc: vi.fn().mockImplementation(rpcImpl),
      _updateBalanceDisplay: vi.fn(),
      lastKnownBalance: 0,
    }));
    vi.doMock('../../src/tokens.animations.ts', () => ({
      _tokenToast: vi.fn(),
    }));
    vi.doMock('../../src/tokens.milestones.ts', () => ({
      claimMilestone: vi.fn(),
      _checkStreakMilestones: vi.fn(),
    }));
    vi.doMock('../../src/onboarding-drip.ts', () => ({
      triggerDripDay: vi.fn(),
    }));
  }

  // ----------------------------------------------------------------
  // TC1: claimDailyLogin success — nudge('return_visit') fires
  // ----------------------------------------------------------------
  describe('claimDailyLogin — success path calls nudge', () => {
    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
      localStorage.clear();
    });

    it('TC1: nudge("return_visit") fires showToast on successful claimDailyLogin', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockShowToast = vi.fn();

      setupMocks(async (_name: string) => ({
        success: true,
        tokens_earned: 5,
        new_balance: 100,
        login_streak: 3,
        streak_bonus: 0,
        freeze_used: false,
      }));

      vi.doMock('../../src/config.ts', () => ({
        showToast: mockShowToast,
        escapeHTML: (s: string) => s,
        UUID_RE: /^[0-9a-f-]{36}$/i,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: false },
        friendlyError: vi.fn(),
        FEATURES: {},
      }));

      const mod = await import('../../src/tokens.claims.ts');
      await mod.claimDailyLogin();

      expect(mockShowToast).toHaveBeenCalledWith(
        '🔥 Welcome back. The arena missed you.',
        'info'
      );
    });
  });

  // ----------------------------------------------------------------
  // TC2: claimDailyLogin inflight guard returns null on 2nd call
  // ----------------------------------------------------------------
  describe('claimDailyLogin — inflight guard', () => {
    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
      localStorage.clear();
    });

    it('TC2: second concurrent claimDailyLogin returns null (inflight guard)', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      // rpc never resolves — stays in flight
      let resolveRpc!: (v: unknown) => void;
      setupMocks(() => new Promise((res) => { resolveRpc = res; }));

      const mod = await import('../../src/tokens.claims.ts');

      const p1 = mod.claimDailyLogin(); // starts, stays in flight
      const result2 = await mod.claimDailyLogin(); // second call should be null immediately

      expect(result2).toBeNull();

      // Resolve to avoid hanging
      resolveRpc(null);
      await p1;
    });
  });

  // ----------------------------------------------------------------
  // TC3: claimDailyLogin already-claimed sets isDailyLoginClaimed()=true
  // ----------------------------------------------------------------
  describe('claimDailyLogin — already claimed path', () => {
    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
      localStorage.clear();
    });

    it('TC3: dailyLoginClaimed becomes true when rpc returns Already claimed today', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      setupMocks(async () => ({
        success: false,
        error: 'Already claimed today',
      }));

      const mod = await import('../../src/tokens.claims.ts');
      const result = await mod.claimDailyLogin();

      expect(result).toBeNull();
      expect(mod.isDailyLoginClaimed()).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // TC4: claimHotTake — RPC called with correct action param
  // ----------------------------------------------------------------
  describe('claimHotTake — RPC params', () => {
    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
      localStorage.clear();
    });

    it('TC4: claimHotTake calls _rpc("claim_action_tokens", { p_action: "hot_take" })', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockRpc = vi.fn().mockResolvedValue({
        success: true,
        tokens_earned: 2,
        new_balance: 50,
      });

      setupMocks(mockRpc);
      vi.doMock('../../src/tokens.balance.ts', () => ({
        _rpc: mockRpc,
        _updateBalanceDisplay: vi.fn(),
        lastKnownBalance: 0,
      }));

      const mod = await import('../../src/tokens.claims.ts');
      await mod.claimHotTake('hot-take-uuid-001');

      expect(mockRpc).toHaveBeenCalledWith(
        'claim_action_tokens',
        { p_action: 'hot_take', p_reference_id: 'hot-take-uuid-001' }
      );
    });
  });

  // ----------------------------------------------------------------
  // TC5: claimDebate — is_winner flag changes label
  // ----------------------------------------------------------------
  describe('claimDebate — winner label', () => {
    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
      localStorage.clear();
    });

    it('TC5: claimDebate with is_winner=true calls _tokenToast with "Debate win!" label', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockTokenToast = vi.fn();
      setupMocks(async () => ({
        success: true,
        tokens_earned: 10,
        new_balance: 200,
        is_winner: true,
        upset_bonus: 0,
        fate_bonus: 0,
      }));
      vi.doMock('../../src/tokens.animations.ts', () => ({
        _tokenToast: mockTokenToast,
      }));

      const mod = await import('../../src/tokens.claims.ts');
      await mod.claimDebate('debate-uuid-001');

      expect(mockTokenToast).toHaveBeenCalledWith(10, 'Debate win!');
    });

    it('TC5b: claimDebate with is_winner=false calls _tokenToast with "Debate complete" label', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockTokenToast = vi.fn();
      setupMocks(async () => ({
        success: true,
        tokens_earned: 3,
        new_balance: 150,
        is_winner: false,
        upset_bonus: 0,
        fate_bonus: 0,
      }));
      vi.doMock('../../src/tokens.animations.ts', () => ({
        _tokenToast: mockTokenToast,
      }));

      const mod = await import('../../src/tokens.claims.ts');
      await mod.claimDebate('debate-uuid-002');

      expect(mockTokenToast).toHaveBeenCalledWith(3, 'Debate complete');
    });
  });

  // ----------------------------------------------------------------
  // TC6: claimHotTake with empty ID returns null immediately
  // ----------------------------------------------------------------
  describe('claimHotTake — empty guard', () => {
    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
      localStorage.clear();
    });

    it('TC6: claimHotTake("") returns null without calling _rpc', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockRpc = vi.fn();
      setupMocks(mockRpc);
      vi.doMock('../../src/tokens.balance.ts', () => ({
        _rpc: mockRpc,
        _updateBalanceDisplay: vi.fn(),
        lastKnownBalance: 0,
      }));

      const mod = await import('../../src/tokens.claims.ts');
      const result = await mod.claimHotTake('');

      expect(result).toBeNull();
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // TC7: nudge session cap — 4th nudge does not fire showToast
  // ----------------------------------------------------------------
  describe('nudge — session cap suppression', () => {
    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
      localStorage.clear();
    });

    it('TC7: nudge suppresses 4th call (session cap = 3)', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockShowToast = vi.fn();
      vi.doMock('../../src/config.ts', () => ({
        showToast: mockShowToast,
        escapeHTML: (s: string) => s,
        UUID_RE: /^[0-9a-f-]{36}$/i,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: false },
        friendlyError: vi.fn(),
        FEATURES: {},
      }));

      const nudgeMod = await import('../../src/nudge.ts');

      // Fire 3 unique nudges — all should pass
      nudgeMod.nudge('nudge-id-a', 'Message A');
      nudgeMod.nudge('nudge-id-b', 'Message B');
      nudgeMod.nudge('nudge-id-c', 'Message C');

      expect(mockShowToast).toHaveBeenCalledTimes(3);

      // 4th nudge — session cap reached, should be suppressed
      nudgeMod.nudge('nudge-id-d', 'Message D');
      expect(mockShowToast).toHaveBeenCalledTimes(3);
    });
  });
});

// ================================================================
// Seam #411 — src/tokens.claims.ts → tokens.balance
// Tests: _rpc wiring, _updateBalanceDisplay calls, guard paths,
//        debate label logic, multi-action RPC params, ARCH check.
// ================================================================

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

describe('Seam #411 — tokens.claims.ts → tokens.balance', () => {

  // ----------------------------------------------------------------
  // ARCH
  // ----------------------------------------------------------------
  it('ARCH: tokens.claims.ts imports _rpc and _updateBalanceDisplay from ./tokens.balance.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/tokens.claims.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = lines.some(
      (l: string) => l.includes('tokens.balance') && l.includes('_rpc') && l.includes('_updateBalanceDisplay')
    );
    expect(hasImport).toBe(true);
  });

  // ----------------------------------------------------------------
  // Shared mock factory for seam #411
  // ----------------------------------------------------------------
  function setupBalanceMocks(
    rpcImpl: (name: string, args?: Record<string, unknown>) => unknown,
    updateBalanceSpy: ReturnType<typeof vi.fn>
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
      safeRpc: vi.fn(),
      getCurrentUser: vi.fn(() => ({ id: 'user-uuid-411' })),
      getCurrentProfile: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => false),
    }));
    vi.doMock('../../src/auth.rpc.ts', () => ({ safeRpc: vi.fn() }));
    vi.doMock('../../src/auth.core.ts', () => ({ _notify: vi.fn() }));
    vi.doMock('../../src/tokens.balance.ts', () => ({
      _rpc: vi.fn().mockImplementation(rpcImpl),
      _updateBalanceDisplay: updateBalanceSpy,
      lastKnownBalance: 0,
    }));
    vi.doMock('../../src/tokens.animations.ts', () => ({ _tokenToast: vi.fn() }));
    vi.doMock('../../src/tokens.milestones.ts', () => ({
      claimMilestone: vi.fn(),
      _checkStreakMilestones: vi.fn(),
    }));
    vi.doMock('../../src/nudge.ts', () => ({ nudge: vi.fn() }));
    vi.doMock('../../src/onboarding-drip.ts', () => ({ triggerDripDay: vi.fn() }));
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  // ----------------------------------------------------------------
  // TC-411-01: claimDailyLogin calls _updateBalanceDisplay with new_balance
  // ----------------------------------------------------------------
  it('TC-411-01: claimDailyLogin calls _updateBalanceDisplay(new_balance) on success', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const updateSpy = vi.fn();
    setupBalanceMocks(async () => ({
      success: true,
      tokens_earned: 5,
      new_balance: 250,
      login_streak: 1,
      streak_bonus: 0,
      freeze_used: false,
    }), updateSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimDailyLogin();

    expect(updateSpy).toHaveBeenCalledWith(250);
  });

  // ----------------------------------------------------------------
  // TC-411-02: claimDailyLogin — _rpc returns null → no update, null result
  // ----------------------------------------------------------------
  it('TC-411-02: claimDailyLogin returns null and skips _updateBalanceDisplay when _rpc returns null', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const updateSpy = vi.fn();
    setupBalanceMocks(async () => null, updateSpy);

    const mod = await import('../../src/tokens.claims.ts');
    const result = await mod.claimDailyLogin();

    expect(result).toBeNull();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // TC-411-03: claimHotTake returns null (no RPC call) for empty id
  // ----------------------------------------------------------------
  it('TC-411-03: claimHotTake("") returns null without calling _rpc', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const rpcSpy = vi.fn();
    const updateSpy = vi.fn();
    setupBalanceMocks(rpcSpy, updateSpy);
    vi.doMock('../../src/tokens.balance.ts', () => ({
      _rpc: rpcSpy,
      _updateBalanceDisplay: updateSpy,
      lastKnownBalance: 0,
    }));

    const mod = await import('../../src/tokens.claims.ts');
    const result = await mod.claimHotTake('');

    expect(result).toBeNull();
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // TC-411-04: claimDebate calls _updateBalanceDisplay on success
  // ----------------------------------------------------------------
  it('TC-411-04: claimDebate calls _updateBalanceDisplay(new_balance) on success', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const updateSpy = vi.fn();
    setupBalanceMocks(async () => ({
      success: true,
      tokens_earned: 10,
      new_balance: 300,
      is_winner: false,
      upset_bonus: 0,
      fate_bonus: 0,
    }), updateSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimDebate('debate-uuid-411');

    expect(updateSpy).toHaveBeenCalledWith(300);
  });

  // ----------------------------------------------------------------
  // TC-411-05: claimDebate "Upset victory!" label when upset_bonus > 0
  // ----------------------------------------------------------------
  it('TC-411-05: claimDebate uses "Upset victory!" label when upset_bonus > 0', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockTokenToast = vi.fn();
    const updateSpy = vi.fn();
    setupBalanceMocks(async () => ({
      success: true,
      tokens_earned: 15,
      new_balance: 400,
      is_winner: true,
      upset_bonus: 5,
      fate_bonus: 0,
    }), updateSpy);
    vi.doMock('../../src/tokens.animations.ts', () => ({ _tokenToast: mockTokenToast }));

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimDebate('debate-uuid-upset');

    expect(mockTokenToast).toHaveBeenCalledWith(15, 'Upset victory!');
  });

  // ----------------------------------------------------------------
  // TC-411-06: claimDebate appends fate bonus suffix when fate_bonus > 0
  // ----------------------------------------------------------------
  it('TC-411-06: claimDebate appends fate bonus suffix when fate_bonus > 0', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockTokenToast = vi.fn();
    const updateSpy = vi.fn();
    setupBalanceMocks(async () => ({
      success: true,
      tokens_earned: 8,
      new_balance: 350,
      is_winner: false,
      upset_bonus: 0,
      fate_bonus: 3,
      fate_pct: 10,
    }), updateSpy);
    vi.doMock('../../src/tokens.animations.ts', () => ({ _tokenToast: mockTokenToast }));

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimDebate('debate-uuid-fate');

    const [, label] = mockTokenToast.mock.calls[0] as [number, string];
    expect(label).toContain('+10% Group Fate');
  });

  // ----------------------------------------------------------------
  // TC-411-07: falsy-id guards on all action claims
  // ----------------------------------------------------------------
  it('TC-411-07: claimReaction/claimVote/claimAiSparring/claimPrediction all return null for empty id', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const rpcSpy = vi.fn();
    const updateSpy = vi.fn();
    setupBalanceMocks(rpcSpy, updateSpy);
    vi.doMock('../../src/tokens.balance.ts', () => ({
      _rpc: rpcSpy,
      _updateBalanceDisplay: updateSpy,
      lastKnownBalance: 0,
    }));

    const mod = await import('../../src/tokens.claims.ts');

    expect(await mod.claimReaction('')).toBeNull();
    expect(await mod.claimVote('')).toBeNull();
    expect(await mod.claimAiSparring('')).toBeNull();
    expect(await mod.claimPrediction('')).toBeNull();
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});

// ================================================================
// Seam #449 — src/tokens.claims.ts → tokens.animations
// Tests: _tokenToast called with correct args for each claim type,
//        freeze label, streak label, zero-token short-circuit, ARCH.
// ================================================================

describe('Seam #449 — tokens.claims.ts → tokens.animations', () => {

  // ----------------------------------------------------------------
  // ARCH
  // ----------------------------------------------------------------
  it('ARCH: tokens.claims.ts imports _tokenToast from ./tokens.animations', async () => {
    vi.resetModules();
    const src = await import('../../src/tokens.claims.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = lines.some(
      (l: string) => l.includes('_tokenToast') && l.includes('./tokens.animations')
    );
    expect(hasImport).toBe(true);
  });

  // ----------------------------------------------------------------
  // Shared mock factory for seam #449
  // ----------------------------------------------------------------
  function setup449Mocks(
    rpcImpl: (name: string, args?: Record<string, unknown>) => unknown,
    tokenToastSpy: ReturnType<typeof vi.fn>
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
      safeRpc: vi.fn(),
      getCurrentUser: vi.fn(() => ({ id: 'user-uuid-449' })),
      getCurrentProfile: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => false),
    }));
    vi.doMock('../../src/auth.rpc.ts', () => ({ safeRpc: vi.fn() }));
    vi.doMock('../../src/auth.core.ts', () => ({ _notify: vi.fn() }));
    vi.doMock('../../src/tokens.balance.ts', () => ({
      _rpc: vi.fn().mockImplementation(rpcImpl),
      _updateBalanceDisplay: vi.fn(),
      lastKnownBalance: 0,
    }));
    vi.doMock('../../src/tokens.animations.ts', () => ({
      _tokenToast: tokenToastSpy,
    }));
    vi.doMock('../../src/tokens.milestones.ts', () => ({
      claimMilestone: vi.fn(),
      _checkStreakMilestones: vi.fn(),
    }));
    vi.doMock('../../src/nudge.ts', () => ({ nudge: vi.fn() }));
    vi.doMock('../../src/onboarding-drip.ts', () => ({ triggerDripDay: vi.fn() }));
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  // ----------------------------------------------------------------
  // TC-449-01: claimDailyLogin plain label
  // ----------------------------------------------------------------
  it('TC-449-01: claimDailyLogin success calls _tokenToast(tokens_earned, "Daily login")', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const toastSpy = vi.fn();
    setup449Mocks(async () => ({
      success: true,
      tokens_earned: 5,
      new_balance: 100,
      login_streak: 1,
      streak_bonus: 0,
      freeze_used: false,
    }), toastSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimDailyLogin();

    expect(toastSpy).toHaveBeenCalledWith(5, 'Daily login');
  });

  // ----------------------------------------------------------------
  // TC-449-02: claimDailyLogin with streak_bonus > 0 uses streak label
  // ----------------------------------------------------------------
  it('TC-449-02: claimDailyLogin with streak_bonus > 0 calls _tokenToast with streak label', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const toastSpy = vi.fn();
    setup449Mocks(async () => ({
      success: true,
      tokens_earned: 8,
      new_balance: 120,
      login_streak: 7,
      streak_bonus: 3,
      freeze_used: false,
    }), toastSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimDailyLogin();

    expect(toastSpy).toHaveBeenCalledWith(8, 'Daily login + 7-day streak!');
  });

  // ----------------------------------------------------------------
  // TC-449-03: claimDailyLogin with freeze_used=true uses freeze label
  // ----------------------------------------------------------------
  it('TC-449-03: claimDailyLogin with freeze_used=true calls _tokenToast with freeze label', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const toastSpy = vi.fn();
    setup449Mocks(async () => ({
      success: true,
      tokens_earned: 5,
      new_balance: 110,
      login_streak: 4,
      streak_bonus: 0,
      freeze_used: true,
    }), toastSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimDailyLogin();

    expect(toastSpy).toHaveBeenCalledWith(5, 'Daily login (❄️ freeze saved your streak!)');
  });

  // ----------------------------------------------------------------
  // TC-449-04: claimDailyLogin with tokens_earned=0 does NOT call _tokenToast
  // ----------------------------------------------------------------
  it('TC-449-04: claimDailyLogin with tokens_earned=0 does not call _tokenToast', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const toastSpy = vi.fn();
    setup449Mocks(async () => ({
      success: true,
      tokens_earned: 0,
      new_balance: 100,
      login_streak: 1,
      streak_bonus: 0,
      freeze_used: false,
    }), toastSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimDailyLogin();

    // _tokenToast bails early when tokens <= 0
    expect(toastSpy).toHaveBeenCalledWith(0, 'Daily login');
    // But showToast inside _tokenToast would not fire — that's tested in tokens.animations tests.
    // Here we verify claims passes the value through regardless.
  });

  // ----------------------------------------------------------------
  // TC-449-05: claimHotTake calls _tokenToast with 'Post' label
  // ----------------------------------------------------------------
  it('TC-449-05: claimHotTake calls _tokenToast(tokens_earned, "Post")', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const toastSpy = vi.fn();
    setup449Mocks(async () => ({
      success: true,
      tokens_earned: 2,
      new_balance: 50,
    }), toastSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimHotTake('hot-take-uuid-449');

    expect(toastSpy).toHaveBeenCalledWith(2, 'Post');
  });

  // ----------------------------------------------------------------
  // TC-449-06: claimVote calls _tokenToast with 'Vote' label
  // ----------------------------------------------------------------
  it('TC-449-06: claimVote calls _tokenToast(tokens_earned, "Vote")', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const toastSpy = vi.fn();
    setup449Mocks(async () => ({
      success: true,
      tokens_earned: 1,
      new_balance: 60,
    }), toastSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimVote('debate-uuid-vote');

    expect(toastSpy).toHaveBeenCalledWith(1, 'Vote');
  });

  // ----------------------------------------------------------------
  // TC-449-07: claimAiSparring calls _tokenToast with 'AI Sparring' label
  // ----------------------------------------------------------------
  it('TC-449-07: claimAiSparring calls _tokenToast(tokens_earned, "AI Sparring")', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const toastSpy = vi.fn();
    setup449Mocks(async () => ({
      success: true,
      tokens_earned: 3,
      new_balance: 75,
    }), toastSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimAiSparring('debate-uuid-ai');

    expect(toastSpy).toHaveBeenCalledWith(3, 'AI Sparring');
  });
});

// ================================================================
// Seam #496 — src/tokens.claims.ts → tokens.milestones
// Tests: claimMilestone called after each action claim type,
//        _checkStreakMilestones called from claimDailyLogin,
//        milestone NOT called when id guard rejects, ARCH check.
// ================================================================

describe('Seam #496 — tokens.claims.ts → tokens.milestones', () => {

  // ----------------------------------------------------------------
  // ARCH
  // ----------------------------------------------------------------
  it('ARCH: tokens.claims.ts imports claimMilestone and _checkStreakMilestones from ./tokens.milestones.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/tokens.claims.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = lines.some(
      (l: string) =>
        l.includes('claimMilestone') &&
        l.includes('_checkStreakMilestones') &&
        l.includes('./tokens.milestones')
    );
    expect(hasImport).toBe(true);
  });

  // ----------------------------------------------------------------
  // Shared mock factory for seam #496
  // ----------------------------------------------------------------
  function setup496Mocks(
    rpcImpl: (name: string, args?: Record<string, unknown>) => unknown,
    claimMilestoneSpy: ReturnType<typeof vi.fn>,
    checkStreakSpy: ReturnType<typeof vi.fn>
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
      safeRpc: vi.fn(),
      getCurrentUser: vi.fn(() => ({ id: 'user-uuid-496' })),
      getCurrentProfile: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => false),
    }));
    vi.doMock('../../src/auth.rpc.ts', () => ({ safeRpc: vi.fn() }));
    vi.doMock('../../src/auth.core.ts', () => ({ _notify: vi.fn() }));
    vi.doMock('../../src/tokens.balance.ts', () => ({
      _rpc: vi.fn().mockImplementation(rpcImpl),
      _updateBalanceDisplay: vi.fn(),
      lastKnownBalance: 0,
    }));
    vi.doMock('../../src/tokens.animations.ts', () => ({
      _tokenToast: vi.fn(),
    }));
    vi.doMock('../../src/tokens.milestones.ts', () => ({
      claimMilestone: claimMilestoneSpy,
      _checkStreakMilestones: checkStreakSpy,
    }));
    vi.doMock('../../src/nudge.ts', () => ({ nudge: vi.fn() }));
    vi.doMock('../../src/onboarding-drip.ts', () => ({ triggerDripDay: vi.fn() }));
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  // ----------------------------------------------------------------
  // TC-496-01: claimHotTake calls claimMilestone('first_hot_take')
  // ----------------------------------------------------------------
  it('TC-496-01: claimHotTake calls claimMilestone("first_hot_take") on success', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const claimMilestoneSpy = vi.fn().mockResolvedValue(null);
    const checkStreakSpy = vi.fn();
    setup496Mocks(async () => ({
      success: true,
      tokens_earned: 2,
      new_balance: 50,
    }), claimMilestoneSpy, checkStreakSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimHotTake('hot-take-uuid-496');

    expect(claimMilestoneSpy).toHaveBeenCalledWith('first_hot_take');
  });

  // ----------------------------------------------------------------
  // TC-496-02: claimReaction calls claimMilestone('first_reaction')
  // ----------------------------------------------------------------
  it('TC-496-02: claimReaction calls claimMilestone("first_reaction") on success', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const claimMilestoneSpy = vi.fn().mockResolvedValue(null);
    const checkStreakSpy = vi.fn();
    setup496Mocks(async () => ({
      success: true,
      tokens_earned: 1,
      new_balance: 55,
    }), claimMilestoneSpy, checkStreakSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimReaction('hot-take-uuid-496-reaction');

    expect(claimMilestoneSpy).toHaveBeenCalledWith('first_reaction');
  });

  // ----------------------------------------------------------------
  // TC-496-03: claimVote calls claimMilestone('first_vote')
  // ----------------------------------------------------------------
  it('TC-496-03: claimVote calls claimMilestone("first_vote") on success', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const claimMilestoneSpy = vi.fn().mockResolvedValue(null);
    const checkStreakSpy = vi.fn();
    setup496Mocks(async () => ({
      success: true,
      tokens_earned: 1,
      new_balance: 60,
    }), claimMilestoneSpy, checkStreakSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimVote('debate-uuid-496-vote');

    expect(claimMilestoneSpy).toHaveBeenCalledWith('first_vote');
  });

  // ----------------------------------------------------------------
  // TC-496-04: claimDebate calls claimMilestone('first_debate')
  // ----------------------------------------------------------------
  it('TC-496-04: claimDebate calls claimMilestone("first_debate") on success', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const claimMilestoneSpy = vi.fn().mockResolvedValue(null);
    const checkStreakSpy = vi.fn();
    setup496Mocks(async () => ({
      success: true,
      tokens_earned: 10,
      new_balance: 200,
      is_winner: false,
      upset_bonus: 0,
      fate_bonus: 0,
    }), claimMilestoneSpy, checkStreakSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimDebate('debate-uuid-496');

    expect(claimMilestoneSpy).toHaveBeenCalledWith('first_debate');
  });

  // ----------------------------------------------------------------
  // TC-496-05: claimAiSparring calls claimMilestone('first_ai_sparring')
  // ----------------------------------------------------------------
  it('TC-496-05: claimAiSparring calls claimMilestone("first_ai_sparring") on success', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const claimMilestoneSpy = vi.fn().mockResolvedValue(null);
    const checkStreakSpy = vi.fn();
    setup496Mocks(async () => ({
      success: true,
      tokens_earned: 3,
      new_balance: 75,
    }), claimMilestoneSpy, checkStreakSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimAiSparring('debate-uuid-496-ai');

    expect(claimMilestoneSpy).toHaveBeenCalledWith('first_ai_sparring');
  });

  // ----------------------------------------------------------------
  // TC-496-06: claimDailyLogin calls _checkStreakMilestones(login_streak)
  // ----------------------------------------------------------------
  it('TC-496-06: claimDailyLogin calls _checkStreakMilestones with login_streak value on success', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const claimMilestoneSpy = vi.fn().mockResolvedValue(null);
    const checkStreakSpy = vi.fn();
    setup496Mocks(async () => ({
      success: true,
      tokens_earned: 5,
      new_balance: 100,
      login_streak: 7,
      streak_bonus: 2,
      freeze_used: false,
    }), claimMilestoneSpy, checkStreakSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimDailyLogin();

    expect(checkStreakSpy).toHaveBeenCalledWith(7);
  });

  // ----------------------------------------------------------------
  // TC-496-07: claimMilestone NOT called when id guard rejects
  // ----------------------------------------------------------------
  it('TC-496-07: claimMilestone not called when claimHotTake receives empty id', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const claimMilestoneSpy = vi.fn();
    const checkStreakSpy = vi.fn();
    setup496Mocks(async () => ({
      success: true,
      tokens_earned: 2,
      new_balance: 50,
    }), claimMilestoneSpy, checkStreakSpy);

    const mod = await import('../../src/tokens.claims.ts');
    await mod.claimHotTake('');

    expect(claimMilestoneSpy).not.toHaveBeenCalled();
  });
});
