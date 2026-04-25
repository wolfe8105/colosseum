// int-tokens-claims.test.ts
// Seam #187 — src/tokens.claims.ts → nudge
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
