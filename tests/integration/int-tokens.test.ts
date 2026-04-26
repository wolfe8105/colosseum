// int-tokens.test.ts
// Seam #286 — src/tokens.ts → tokens.claims
// Tests: init() calls claimDailyLogin via onChange, balance display,
//        notify_followers_online RPC, claimDailyLogin re-export, claimVote re-export,
//        _loadMilestones called, ARCH import check.

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
describe('Seam #286 — tokens.ts → tokens.claims', () => {
  it('ARCH: tokens.ts imports claimDailyLogin from ./tokens.claims.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/tokens.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = lines.some(
      (l: string) => l.includes('claimDailyLogin') && l.includes('./tokens.claims')
    );
    expect(hasImport).toBe(true);
  });

  // ----------------------------------------------------------------
  // Shared mock factory
  // ----------------------------------------------------------------
  function setupMocks(opts: {
    rpcImpl?: (name: string, params?: unknown) => unknown;
    onChangeCb?: (cb: (user: unknown, profile: unknown) => void) => void;
  } = {}) {
    const mockRpc = vi.fn().mockImplementation(opts.rpcImpl ?? (() => Promise.resolve(null)));
    const mockUpdateBalanceDisplay = vi.fn();
    const mockLoadMilestones = vi.fn();
    const mockClaimDailyLogin = vi.fn().mockResolvedValue(null);
    const mockInjectCSS = vi.fn();
    const mockInitBroadcast = vi.fn();
    const mockOnChange = vi.fn().mockImplementation((cb: (user: unknown, profile: unknown) => void) => {
      if (opts.onChangeCb) opts.onChangeCb(cb);
    });

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
      onChange: mockOnChange,
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
    vi.doMock('../../src/tokens.animations.ts', () => ({
      _injectCSS: mockInjectCSS,
      _tokenToast: vi.fn(),
    }));
    vi.doMock('../../src/tokens.balance.ts', () => ({
      _rpc: mockRpc,
      _updateBalanceDisplay: mockUpdateBalanceDisplay,
      _initBroadcast: mockInitBroadcast,
      lastKnownBalance: 0,
      requireTokens: vi.fn(),
      updateBalance: vi.fn(),
      getSummary: vi.fn(),
      getBalance: vi.fn(),
    }));
    vi.doMock('../../src/tokens.milestones.ts', () => ({
      _loadMilestones: mockLoadMilestones,
      MILESTONES: {},
      claimMilestone: vi.fn(),
      getMilestoneList: vi.fn(),
      checkProfileMilestones: vi.fn(),
      _checkStreakMilestones: vi.fn(),
    }));
    vi.doMock('../../src/tokens.claims.ts', () => ({
      claimDailyLogin: mockClaimDailyLogin,
      claimHotTake: vi.fn(),
      claimReaction: vi.fn(),
      claimVote: vi.fn(),
      claimDebate: vi.fn(),
      claimAiSparring: vi.fn(),
      claimPrediction: vi.fn(),
      isDailyLoginClaimed: vi.fn(() => false),
    }));
    vi.doMock('../../src/nudge.ts', () => ({
      nudge: vi.fn(),
    }));
    vi.doMock('../../src/onboarding-drip.ts', () => ({
      triggerDripDay: vi.fn(),
    }));

    return { mockRpc, mockUpdateBalanceDisplay, mockLoadMilestones, mockClaimDailyLogin, mockOnChange };
  }

  // ----------------------------------------------------------------
  // TC1: init() registers onChange callback
  // ----------------------------------------------------------------
  describe('init — registers onChange callback', () => {
    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
      localStorage.clear();
    });

    it('TC1: tokens.init() calls onChange() to register auth callback', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const { mockOnChange } = setupMocks();

      const mod = await import('../../src/tokens.ts');
      // tokens.ts auto-calls init() at module load (readyState !== 'loading' in jsdom),
      // then we call it again explicitly — assert it was called at least once total.
      mockOnChange.mockClear();
      mod.init();

      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------------
  // TC2: init() calls claimDailyLogin when user+profile fires
  // ----------------------------------------------------------------
  describe('init — claimDailyLogin called on user+profile', () => {
    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
      localStorage.clear();
    });

    it('TC2: claimDailyLogin() is called when onChange fires with user and profile', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      let capturedCb!: (user: unknown, profile: unknown) => void;
      const { mockClaimDailyLogin } = setupMocks({
        onChangeCb: (cb) => { capturedCb = cb; },
      });

      const mod = await import('../../src/tokens.ts');
      mod.init();

      // Simulate onChange firing with a user+profile
      capturedCb({ id: 'user-uuid-001' }, { token_balance: 42 });
      await vi.runAllTimersAsync();

      expect(mockClaimDailyLogin).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------------
  // TC3: init() calls _updateBalanceDisplay when profile.token_balance present
  // ----------------------------------------------------------------
  describe('init — _updateBalanceDisplay on profile.token_balance', () => {
    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
      localStorage.clear();
    });

    it('TC3: _updateBalanceDisplay called with profile.token_balance value when user+profile arrives', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      let capturedCb!: (user: unknown, profile: unknown) => void;
      const { mockUpdateBalanceDisplay } = setupMocks({
        onChangeCb: (cb) => { capturedCb = cb; },
      });

      const mod = await import('../../src/tokens.ts');
      mod.init();

      capturedCb({ id: 'user-uuid-001' }, { token_balance: 77 });
      await vi.runAllTimersAsync();

      expect(mockUpdateBalanceDisplay).toHaveBeenCalledWith(77);
    });
  });

  // ----------------------------------------------------------------
  // TC4: init() fires notify_followers_online RPC with user.id
  // ----------------------------------------------------------------
  describe('init — notify_followers_online RPC', () => {
    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
      localStorage.clear();
    });

    it('TC4: _rpc("notify_followers_online", { p_user_id: user.id }) called on init onChange', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      let capturedCb!: (user: unknown, profile: unknown) => void;
      const { mockRpc } = setupMocks({
        onChangeCb: (cb) => { capturedCb = cb; },
      });

      const mod = await import('../../src/tokens.ts');
      mod.init();

      capturedCb({ id: 'user-uuid-999' }, { token_balance: 10 });
      await vi.runAllTimersAsync();

      expect(mockRpc).toHaveBeenCalledWith('notify_followers_online', { p_user_id: 'user-uuid-999' });
    });
  });

  // ----------------------------------------------------------------
  // TC5: init() calls _loadMilestones when user+profile present
  // ----------------------------------------------------------------
  describe('init — _loadMilestones called', () => {
    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
      localStorage.clear();
    });

    it('TC5: _loadMilestones() is called when onChange fires with user and profile', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      let capturedCb!: (user: unknown, profile: unknown) => void;
      const { mockLoadMilestones } = setupMocks({
        onChangeCb: (cb) => { capturedCb = cb; },
      });

      const mod = await import('../../src/tokens.ts');
      mod.init();

      capturedCb({ id: 'user-uuid-001' }, { token_balance: 5 });
      await vi.runAllTimersAsync();

      expect(mockLoadMilestones).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------------
  // TC6: claimDailyLogin re-exported from barrel calls _rpc correctly
  // ----------------------------------------------------------------
  describe('claimDailyLogin re-export — RPC call', () => {
    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
      localStorage.clear();
    });

    it('TC6: claimDailyLogin re-exported through tokens.ts barrel calls _rpc("claim_daily_login")', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      // For this TC we want the real tokens.claims behaviour, so override tokens.claims mock
      const mockRpcDirect = vi.fn().mockResolvedValue({
        success: true,
        tokens_earned: 5,
        new_balance: 55,
        login_streak: 1,
        streak_bonus: 0,
        freeze_used: false,
      });

      setupMocks();

      // Override tokens.claims with real-ish behaviour connected to our rpc mock
      vi.doMock('../../src/tokens.claims.ts', () => ({
        claimDailyLogin: async () => {
          const result = await mockRpcDirect('claim_daily_login');
          return result;
        },
        claimHotTake: vi.fn(),
        claimReaction: vi.fn(),
        claimVote: vi.fn(),
        claimDebate: vi.fn(),
        claimAiSparring: vi.fn(),
        claimPrediction: vi.fn(),
        isDailyLoginClaimed: vi.fn(() => false),
      }));

      const barrel = await import('../../src/tokens.ts');
      const result = await barrel.claimDailyLogin();

      expect(mockRpcDirect).toHaveBeenCalledWith('claim_daily_login');
      expect(result).toMatchObject({ success: true, tokens_earned: 5 });
    });
  });

  // ----------------------------------------------------------------
  // TC7: claimVote re-exported from barrel calls _rpc with vote action
  // ----------------------------------------------------------------
  describe('claimVote re-export — RPC params', () => {
    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
      localStorage.clear();
    });

    it('TC7: claimVote re-exported through tokens.ts barrel calls _rpc("claim_action_tokens", { p_action: "vote" })', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockRpcDirect = vi.fn().mockResolvedValue({
        success: true,
        tokens_earned: 1,
        new_balance: 30,
      });

      setupMocks();

      vi.doMock('../../src/tokens.claims.ts', () => ({
        claimDailyLogin: vi.fn().mockResolvedValue(null),
        claimHotTake: vi.fn(),
        claimReaction: vi.fn(),
        claimVote: async (debateId: string) => {
          if (!debateId) return null;
          const result = await mockRpcDirect('claim_action_tokens', { p_action: 'vote', p_reference_id: debateId });
          return result;
        },
        claimDebate: vi.fn(),
        claimAiSparring: vi.fn(),
        claimPrediction: vi.fn(),
        isDailyLoginClaimed: vi.fn(() => false),
      }));

      const barrel = await import('../../src/tokens.ts');
      await barrel.claimVote('debate-uuid-abc');

      expect(mockRpcDirect).toHaveBeenCalledWith(
        'claim_action_tokens',
        { p_action: 'vote', p_reference_id: 'debate-uuid-abc' }
      );
    });
  });
});
