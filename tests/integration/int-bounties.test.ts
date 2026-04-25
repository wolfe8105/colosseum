// int-bounties.test.ts
// Seam #197 — src/bounties.ts → bounties.dot
// Tests: loadBountyDotSet, userHasBountyDot, bountyDot

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
describe('Seam #197 — bounties.dot.ts → auth.ts', () => {
  it('ARCH: bounties.dot.ts imports safeRpc and getIsPlaceholderMode from ./auth.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/bounties.dot.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasAuth = lines.some(
      (l: string) => l.includes('./auth') && (l.includes('safeRpc') || l.includes('getIsPlaceholderMode'))
    );
    expect(hasAuth).toBe(true);
  });

  // ----------------------------------------------------------------
  // TC2: loadBountyDotSet skips RPC when in placeholder mode
  // ----------------------------------------------------------------
  describe('loadBountyDotSet — placeholder mode guard', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('TC2: returns without calling safeRpc when getIsPlaceholderMode returns true', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockSafeRpc = vi.fn();

      vi.doMock('../../src/config.ts', () => ({
        showToast: vi.fn(),
        escapeHTML: (s: string) => s,
        UUID_RE: /^[0-9a-f-]{36}$/i,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        friendlyError: vi.fn(),
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: mockSafeRpc,
        getIsPlaceholderMode: vi.fn(() => true),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));

      const mod = await import('../../src/bounties.dot.ts');
      await mod.loadBountyDotSet();

      expect(mockSafeRpc).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // TC3: loadBountyDotSet calls RPC and populates dot set
  // ----------------------------------------------------------------
  describe('loadBountyDotSet — RPC call and set population', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('TC3: calls safeRpc("get_bounty_dot_user_ids") and populates the dot set', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockSafeRpc = vi.fn().mockResolvedValue({
        data: [{ user_id: 'user-aaa' }, { user_id: 'user-bbb' }],
        error: null,
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
        safeRpc: mockSafeRpc,
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));

      const mod = await import('../../src/bounties.dot.ts');
      await mod.loadBountyDotSet();

      expect(mockSafeRpc).toHaveBeenCalledWith('get_bounty_dot_user_ids');
      expect(mod.userHasBountyDot('user-aaa')).toBe(true);
      expect(mod.userHasBountyDot('user-bbb')).toBe(true);
      expect(mod.userHasBountyDot('user-unknown')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // TC4: userHasBountyDot returns false for null/undefined
  // ----------------------------------------------------------------
  describe('userHasBountyDot — null/undefined guard', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('TC4: returns false for null userId', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/config.ts', () => ({
        showToast: vi.fn(),
        escapeHTML: (s: string) => s,
        UUID_RE: /^[0-9a-f-]{36}$/i,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        friendlyError: vi.fn(),
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getIsPlaceholderMode: vi.fn(() => true),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));

      const mod = await import('../../src/bounties.dot.ts');

      expect(mod.userHasBountyDot(null)).toBe(false);
      expect(mod.userHasBountyDot(undefined)).toBe(false);
      expect(mod.userHasBountyDot('')).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // TC5: userHasBountyDot returns true after set is populated
  // ----------------------------------------------------------------
  describe('userHasBountyDot — positive match after load', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('TC5: returns true for a user_id present after loadBountyDotSet', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockSafeRpc = vi.fn().mockResolvedValue({
        data: [{ user_id: 'user-xyz' }],
        error: null,
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
        safeRpc: mockSafeRpc,
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));

      const mod = await import('../../src/bounties.dot.ts');
      await mod.loadBountyDotSet();

      expect(mod.userHasBountyDot('user-xyz')).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // TC6: bountyDot returns empty string when no dot
  // ----------------------------------------------------------------
  describe('bountyDot — no dot', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('TC6: returns empty string when user has no active bounty', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/config.ts', () => ({
        showToast: vi.fn(),
        escapeHTML: (s: string) => s,
        UUID_RE: /^[0-9a-f-]{36}$/i,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        friendlyError: vi.fn(),
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getIsPlaceholderMode: vi.fn(() => true),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));

      const mod = await import('../../src/bounties.dot.ts');

      expect(mod.bountyDot('user-not-in-set')).toBe('');
      expect(mod.bountyDot(null)).toBe('');
    });
  });

  // ----------------------------------------------------------------
  // TC7: bountyDot returns span.bounty-dot when user has dot
  // ----------------------------------------------------------------
  describe('bountyDot — active dot HTML', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC7: returns a span with class bounty-dot for a user in the set', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockSafeRpc = vi.fn().mockResolvedValue({
        data: [{ user_id: 'user-with-dot' }],
        error: null,
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
        safeRpc: mockSafeRpc,
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));

      const mod = await import('../../src/bounties.dot.ts');
      await mod.loadBountyDotSet();

      const html = mod.bountyDot('user-with-dot');
      expect(html).not.toBe('');
      expect(html).toContain('bounty-dot');

      // Verify it produces valid DOM
      document.body.innerHTML = html;
      const span = document.querySelector('.bounty-dot');
      expect(span).not.toBeNull();
      expect(span?.getAttribute('aria-label')).toBe('Active bounty');
    });
  });
});

// ============================================================
// Seam #196 — bounties.rpc.ts
// Tests: postBounty, cancelBounty, getMyBounties,
//        getOpponentBounties, selectBountyClaim, bountySlotLimit
// ============================================================

describe('Seam #196 — bounties.rpc.ts', () => {
  // ----------------------------------------------------------------
  // ARCH: bounties.rpc.ts imports from ./auth.ts and ./bounties.types.ts
  // ----------------------------------------------------------------
  it('ARCH: bounties.rpc.ts imports safeRpc from ./auth.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/bounties.rpc.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasAuth = lines.some(
      (l: string) => l.includes('./auth') && l.includes('safeRpc'),
    );
    expect(hasAuth).toBe(true);
  });

  // ----------------------------------------------------------------
  // TC-R1: postBounty placeholder mode returns sentinel
  // ----------------------------------------------------------------
  describe('postBounty — placeholder mode guard', () => {
    afterEach(() => { vi.useRealTimers(); });

    it('TC-R1: returns { success: true, bounty_id: "placeholder" } and skips RPC', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockSafeRpc = vi.fn();
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: mockSafeRpc,
        getIsPlaceholderMode: vi.fn(() => true),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));

      const mod = await import('../../src/bounties.rpc.ts');
      const result = await mod.postBounty('target-id', 100, 7);

      expect(result).toEqual({ success: true, bounty_id: 'placeholder' });
      expect(mockSafeRpc).not.toHaveBeenCalled();
      vi.doUnmock('../../src/auth.ts');
    });
  });

  // ----------------------------------------------------------------
  // TC-R2: postBounty success path — resolves with bounty_id
  // ----------------------------------------------------------------
  describe('postBounty — RPC success', () => {
    afterEach(() => { vi.useRealTimers(); });

    it('TC-R2: calls post_bounty RPC with correct params and returns bounty_id', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockSafeRpc = vi.fn().mockResolvedValueOnce({
        data: { success: true, bounty_id: 'b-abc-123' },
        error: null,
      });
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: mockSafeRpc,
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));

      const mod = await import('../../src/bounties.rpc.ts');
      const result = await mod.postBounty('target-uuid', 200, 14);

      expect(result).toEqual({ success: true, bounty_id: 'b-abc-123' });
      expect(mockSafeRpc).toHaveBeenCalledWith(
        'post_bounty',
        expect.objectContaining({
          p_target_id: 'target-uuid',
          p_amount: 200,
          p_duration_days: 14,
        }),
      );
      vi.doUnmock('../../src/auth.ts');
    });
  });

  // ----------------------------------------------------------------
  // TC-R3: postBounty RPC error returns failure shape
  // ----------------------------------------------------------------
  describe('postBounty — RPC error', () => {
    afterEach(() => { vi.useRealTimers(); });

    it('TC-R3: returns { success: false, error } when RPC returns an error', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockSafeRpc = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'insufficient tokens' },
      });
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: mockSafeRpc,
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));

      const mod = await import('../../src/bounties.rpc.ts');
      const result = await mod.postBounty('target-uuid', 500, 7);

      expect(result.success).toBe(false);
      expect((result as { success: false; error: string }).error).toBe('insufficient tokens');
      vi.doUnmock('../../src/auth.ts');
    });
  });

  // ----------------------------------------------------------------
  // TC-R4: cancelBounty returns refund and burned amounts
  // ----------------------------------------------------------------
  describe('cancelBounty — success with refund', () => {
    afterEach(() => { vi.useRealTimers(); });

    it('TC-R4: cancelBounty resolves with refund and burned fields', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockSafeRpc = vi.fn().mockResolvedValueOnce({
        data: { success: true, refund: 80, burned: 20 },
        error: null,
      });
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: mockSafeRpc,
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));

      const mod = await import('../../src/bounties.rpc.ts');
      const result = await mod.cancelBounty('bounty-id-xyz');

      expect(result).toEqual({ success: true, refund: 80, burned: 20 });
      expect(mockSafeRpc).toHaveBeenCalledWith(
        'cancel_bounty',
        expect.objectContaining({ p_bounty_id: 'bounty-id-xyz' }),
      );
      vi.doUnmock('../../src/auth.ts');
    });
  });

  // ----------------------------------------------------------------
  // TC-R5: getMyBounties returns incoming/outgoing structure
  // ----------------------------------------------------------------
  describe('getMyBounties — success', () => {
    afterEach(() => { vi.useRealTimers(); });

    it('TC-R5: returns parsed incoming and outgoing arrays', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const incomingRow = {
        id: 'row-1',
        poster_id: 'p-1',
        target_id: 'me',
        amount: 150,
        duration_days: 7,
        duration_fee: 15,
        status: 'open',
        expires_at: '2026-05-01T00:00:00Z',
        created_at: '2026-04-25T00:00:00Z',
      };
      const mockSafeRpc = vi.fn().mockResolvedValueOnce({
        data: { incoming: [incomingRow], outgoing: [] },
        error: null,
      });
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: mockSafeRpc,
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));

      const mod = await import('../../src/bounties.rpc.ts');
      const result = await mod.getMyBounties();

      expect(result.incoming).toHaveLength(1);
      expect(result.incoming[0].id).toBe('row-1');
      expect(result.outgoing).toEqual([]);
      expect(mockSafeRpc).toHaveBeenCalledWith('get_my_bounties');
      vi.doUnmock('../../src/auth.ts');
    });
  });

  // ----------------------------------------------------------------
  // TC-R6: getOpponentBounties calls RPC with p_opponent_id
  // ----------------------------------------------------------------
  describe('getOpponentBounties — success', () => {
    afterEach(() => { vi.useRealTimers(); });

    it('TC-R6: passes p_opponent_id and returns the bounty array', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const opp = {
        bounty_id: 'ob-1',
        poster_id: 'poster-uuid',
        amount: 300,
        duration_days: 14,
        expires_at: '2026-05-10T00:00:00Z',
        attempt_fee: 30,
      };
      const mockSafeRpc = vi.fn().mockResolvedValueOnce({ data: [opp], error: null });
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: mockSafeRpc,
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));

      const mod = await import('../../src/bounties.rpc.ts');
      const result = await mod.getOpponentBounties('opp-uuid-999');

      expect(result).toHaveLength(1);
      expect(result[0].bounty_id).toBe('ob-1');
      expect(mockSafeRpc).toHaveBeenCalledWith(
        'get_opponent_bounties',
        expect.objectContaining({ p_opponent_id: 'opp-uuid-999' }),
      );
      vi.doUnmock('../../src/auth.ts');
    });
  });

  // ----------------------------------------------------------------
  // TC-R7: bountySlotLimit — pure tier ladder
  // ----------------------------------------------------------------
  describe('bountySlotLimit — tier ladder', () => {
    afterEach(() => { vi.useRealTimers(); });

    it('TC-R7: returns correct slot count at all tier boundaries', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getIsPlaceholderMode: vi.fn(() => true),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));

      const mod = await import('../../src/bounties.rpc.ts');

      expect(mod.bountySlotLimit(0)).toBe(0);    // below 25 -> 0
      expect(mod.bountySlotLimit(24)).toBe(0);   // just below 25 -> 0
      expect(mod.bountySlotLimit(25)).toBe(1);   // at 25 -> 1
      expect(mod.bountySlotLimit(35)).toBe(2);   // at 35 -> 2
      expect(mod.bountySlotLimit(45)).toBe(3);   // at 45 -> 3
      expect(mod.bountySlotLimit(55)).toBe(4);   // at 55 -> 4
      expect(mod.bountySlotLimit(65)).toBe(5);   // at 65 -> 5
      expect(mod.bountySlotLimit(75)).toBe(6);   // at 75 -> 6
      expect(mod.bountySlotLimit(100)).toBe(6);  // above 75 -> 6
      vi.doUnmock('../../src/auth.ts');
    });
  });
});

// ============================================================
// Seam #226 — bounties.ts → bounties.render
// Tests: renderProfileBountySection, renderMyBountiesSection
// ============================================================

describe('Seam #226 — bounties.render.ts', () => {
  // ----------------------------------------------------------------
  // ARCH: bounties.render.ts imports from bounties.rpc.ts and config.ts
  // ----------------------------------------------------------------
  it('ARCH: bounties.render.ts imports from ./bounties.rpc.ts, ./config.ts, ./bounties.dot.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/bounties.render.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasRpc = lines.some((l: string) => l.includes('./bounties.rpc'));
    const hasConfig = lines.some((l: string) => l.includes('./config'));
    const hasDot = lines.some((l: string) => l.includes('./bounties.dot'));
    expect(hasRpc).toBe(true);
    expect(hasConfig).toBe(true);
    expect(hasDot).toBe(true);
  });

  // ----------------------------------------------------------------
  // TC-REN1: renderProfileBountySection — depth gate (< 25%)
  // ----------------------------------------------------------------
  describe('renderProfileBountySection — depth gate below 25%', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC-REN1: renders depth gate message when viewerDepth < 25', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockGetMyBounties = vi.fn();

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        friendlyError: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        UUID_RE: /^[0-9a-f-]{36}$/i,
        placeholderMode: { supabase: false },
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/bounties.rpc.ts', () => ({
        getMyBounties: mockGetMyBounties,
        postBounty: vi.fn(),
        cancelBounty: vi.fn(),
        bountySlotLimit: (depth: number) => {
          if (depth >= 25) return 1;
          return 0;
        },
      }));
      vi.doMock('../../src/bounties.dot.ts', () => ({
        loadBountyDotSet: vi.fn(),
        userHasBountyDot: vi.fn(() => false),
        bountyDot: vi.fn(() => ''),
      }));

      const mod = await import('../../src/bounties.render.ts');
      const container = document.createElement('div');
      document.body.appendChild(container);

      await mod.renderProfileBountySection(container, 'target-uuid', 20, 500, 0);

      expect(mockGetMyBounties).not.toHaveBeenCalled();
      expect(container.innerHTML).toContain('25%');
    });
  });

  // ----------------------------------------------------------------
  // TC-REN2: renderProfileBountySection — no existing bounty renders post form
  // ----------------------------------------------------------------
  describe('renderProfileBountySection — no existing bounty shows post form', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC-REN2: calls getMyBounties and renders post form when no open bounty on target', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockGetMyBounties = vi.fn().mockResolvedValue({ incoming: [], outgoing: [] });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        friendlyError: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        UUID_RE: /^[0-9a-f-]{36}$/i,
        placeholderMode: { supabase: false },
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/bounties.rpc.ts', () => ({
        getMyBounties: mockGetMyBounties,
        postBounty: vi.fn(),
        cancelBounty: vi.fn(),
        bountySlotLimit: (_depth: number) => 3,
      }));
      vi.doMock('../../src/bounties.dot.ts', () => ({
        loadBountyDotSet: vi.fn(),
        userHasBountyDot: vi.fn(() => false),
        bountyDot: vi.fn(() => ''),
      }));

      const mod = await import('../../src/bounties.render.ts');
      const container = document.createElement('div');
      document.body.appendChild(container);

      await mod.renderProfileBountySection(container, 'target-uuid', 50, 500, 0);

      expect(mockGetMyBounties).toHaveBeenCalledOnce();
      const postBtn = container.querySelector('#bounty-post-btn');
      expect(postBtn).not.toBeNull();
      const amtInput = container.querySelector('#bounty-amount-input');
      expect(amtInput).not.toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // TC-REN3: renderProfileBountySection — existing open bounty renders cancel button
  // ----------------------------------------------------------------
  describe('renderProfileBountySection — existing bounty renders cancel button', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC-REN3: renders cancel button and token amount when open bounty exists on target', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const existingBounty = {
        id: 'bounty-existing-1',
        target_id: 'target-uuid',
        poster_id: 'viewer-uuid',
        amount: 200,
        duration_days: 7,
        duration_fee: 7,
        status: 'open' as const,
        expires_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
        created_at: new Date().toISOString(),
      };
      const mockGetMyBounties = vi.fn().mockResolvedValue({
        incoming: [],
        outgoing: [existingBounty],
      });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        friendlyError: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        UUID_RE: /^[0-9a-f-]{36}$/i,
        placeholderMode: { supabase: false },
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/bounties.rpc.ts', () => ({
        getMyBounties: mockGetMyBounties,
        postBounty: vi.fn(),
        cancelBounty: vi.fn(),
        bountySlotLimit: (_depth: number) => 3,
      }));
      vi.doMock('../../src/bounties.dot.ts', () => ({
        loadBountyDotSet: vi.fn(),
        userHasBountyDot: vi.fn(() => false),
        bountyDot: vi.fn(() => ''),
      }));

      const mod = await import('../../src/bounties.render.ts');
      const container = document.createElement('div');
      document.body.appendChild(container);

      await mod.renderProfileBountySection(container, 'target-uuid', 50, 500, 0);

      expect(mockGetMyBounties).toHaveBeenCalledOnce();
      const cancelBtn = document.getElementById('bounty-cancel-btn');
      expect(cancelBtn).not.toBeNull();
      expect(container.innerHTML).toContain('200');
    });
  });

  // ----------------------------------------------------------------
  // TC-REN4: renderMyBountiesSection — empty lists render empty-state messages
  // ----------------------------------------------------------------
  describe('renderMyBountiesSection — empty state', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC-REN4: calls get_my_bounties RPC and renders no-bounties messages for empty lists', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockGetMyBounties = vi.fn().mockResolvedValue({ incoming: [], outgoing: [] });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        friendlyError: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        UUID_RE: /^[0-9a-f-]{36}$/i,
        placeholderMode: { supabase: false },
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/bounties.rpc.ts', () => ({
        getMyBounties: mockGetMyBounties,
        postBounty: vi.fn(),
        cancelBounty: vi.fn(),
        bountySlotLimit: (_depth: number) => 1,
      }));
      vi.doMock('../../src/bounties.dot.ts', () => ({
        loadBountyDotSet: vi.fn(),
        userHasBountyDot: vi.fn(() => false),
        bountyDot: vi.fn(() => ''),
      }));

      const mod = await import('../../src/bounties.render.ts');
      const container = document.createElement('div');
      document.body.appendChild(container);

      await mod.renderMyBountiesSection(container);

      expect(mockGetMyBounties).toHaveBeenCalledOnce();
      expect(container.innerHTML).toContain('No active bounties on you');
      expect(container.innerHTML).toContain("haven't posted");
    });
  });

  // ----------------------------------------------------------------
  // TC-REN5: renderMyBountiesSection — populated lists render rows and cancel buttons
  // ----------------------------------------------------------------
  describe('renderMyBountiesSection — populated lists', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC-REN5: renders .bounty-list-row and .bounty-cancel-row-btn for open outgoing bounty', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const incomingRow = {
        id: 'inc-1',
        poster_id: 'poster-uuid',
        poster_username: 'EnemyDebater',
        target_id: 'me-uuid',
        target_username: 'MyUsername',
        amount: 100,
        duration_days: 7,
        duration_fee: 7,
        status: 'open' as const,
        expires_at: new Date(Date.now() + 5 * 86_400_000).toISOString(),
        created_at: new Date().toISOString(),
      };
      const outgoingRow = {
        id: 'out-1',
        poster_id: 'me-uuid',
        poster_username: 'MyUsername',
        target_id: 'rival-uuid',
        target_username: 'RivalUser',
        amount: 250,
        duration_days: 14,
        duration_fee: 14,
        status: 'open' as const,
        expires_at: new Date(Date.now() + 10 * 86_400_000).toISOString(),
        created_at: new Date().toISOString(),
      };

      const mockGetMyBounties = vi.fn().mockResolvedValue({
        incoming: [incomingRow],
        outgoing: [outgoingRow],
      });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        friendlyError: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        UUID_RE: /^[0-9a-f-]{36}$/i,
        placeholderMode: { supabase: false },
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/bounties.rpc.ts', () => ({
        getMyBounties: mockGetMyBounties,
        postBounty: vi.fn(),
        cancelBounty: vi.fn(),
        bountySlotLimit: (_depth: number) => 3,
      }));
      vi.doMock('../../src/bounties.dot.ts', () => ({
        loadBountyDotSet: vi.fn(),
        userHasBountyDot: vi.fn(() => false),
        bountyDot: vi.fn(() => ''),
      }));

      const mod = await import('../../src/bounties.render.ts');
      const container = document.createElement('div');
      document.body.appendChild(container);

      await mod.renderMyBountiesSection(container);

      const rows = container.querySelectorAll('.bounty-list-row');
      expect(rows.length).toBe(2);

      const cancelBtns = container.querySelectorAll('.bounty-cancel-row-btn');
      expect(cancelBtns.length).toBe(1);
      expect((cancelBtns[0] as HTMLButtonElement).dataset.bountyId).toBe('out-1');

      // usernames are escaped and displayed
      expect(container.innerHTML).toContain('EnemyDebater');
      expect(container.innerHTML).toContain('RivalUser');
    });
  });

  // ----------------------------------------------------------------
  // TC-REN6: renderMyBountiesSection — claimed outgoing bounty has no cancel button
  // ----------------------------------------------------------------
  describe('renderMyBountiesSection — claimed bounty has no cancel button', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC-REN6: does not render cancel button for claimed outgoing bounty', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const claimedRow = {
        id: 'out-claimed',
        poster_id: 'me-uuid',
        poster_username: 'MyUsername',
        target_id: 'rival-uuid',
        target_username: 'WonUser',
        amount: 500,
        duration_days: 7,
        duration_fee: 7,
        status: 'claimed' as const,
        expires_at: new Date(Date.now() - 86_400_000).toISOString(),
        created_at: new Date(Date.now() - 8 * 86_400_000).toISOString(),
      };

      const mockGetMyBounties = vi.fn().mockResolvedValue({
        incoming: [],
        outgoing: [claimedRow],
      });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        friendlyError: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        UUID_RE: /^[0-9a-f-]{36}$/i,
        placeholderMode: { supabase: false },
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/bounties.rpc.ts', () => ({
        getMyBounties: mockGetMyBounties,
        postBounty: vi.fn(),
        cancelBounty: vi.fn(),
        bountySlotLimit: (_depth: number) => 3,
      }));
      vi.doMock('../../src/bounties.dot.ts', () => ({
        loadBountyDotSet: vi.fn(),
        userHasBountyDot: vi.fn(() => false),
        bountyDot: vi.fn(() => ''),
      }));

      const mod = await import('../../src/bounties.render.ts');
      const container = document.createElement('div');
      document.body.appendChild(container);

      await mod.renderMyBountiesSection(container);

      const rows = container.querySelectorAll('.bounty-list-row');
      expect(rows.length).toBe(1);

      const cancelBtns = container.querySelectorAll('.bounty-cancel-row-btn');
      expect(cancelBtns.length).toBe(0);

      expect(container.innerHTML).toContain('CLAIMED');
    });
  });

  // ----------------------------------------------------------------
  // TC-REN7: renderProfileBountySection — slot count displayed in post form
  // ----------------------------------------------------------------
  describe('renderProfileBountySection — slot count in post form', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC-REN7: shows correct remaining slot count and bounty-cost-preview element', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      // 2 existing open outgoing (not on this target), slotLimit = 3 → slotsLeft = 1
      const openBounty = {
        id: 'other-1',
        target_id: 'other-target',
        amount: 50,
        duration_days: 7,
        duration_fee: 7,
        status: 'open' as const,
        expires_at: new Date(Date.now() + 5 * 86_400_000).toISOString(),
        created_at: new Date().toISOString(),
      };
      const openBounty2 = { ...openBounty, id: 'other-2', target_id: 'another-target' };
      const mockGetMyBounties = vi.fn().mockResolvedValue({
        incoming: [],
        outgoing: [openBounty, openBounty2],
      });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        friendlyError: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        UUID_RE: /^[0-9a-f-]{36}$/i,
        placeholderMode: { supabase: false },
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getIsPlaceholderMode: vi.fn(() => false),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/bounties.rpc.ts', () => ({
        getMyBounties: mockGetMyBounties,
        postBounty: vi.fn(),
        cancelBounty: vi.fn(),
        bountySlotLimit: (_depth: number) => 3,
      }));
      vi.doMock('../../src/bounties.dot.ts', () => ({
        loadBountyDotSet: vi.fn(),
        userHasBountyDot: vi.fn(() => false),
        bountyDot: vi.fn(() => ''),
      }));

      const mod = await import('../../src/bounties.render.ts');
      const container = document.createElement('div');
      document.body.appendChild(container);

      // target-uuid doesn't match any existing outgoing bounty → shows post form
      await mod.renderProfileBountySection(container, 'target-uuid', 60, 1000, 0);

      // 3 slots - 2 open = 1 slot remaining
      expect(container.innerHTML).toContain('1 slot');

      const costPreview = container.querySelector('#bounty-cost-preview');
      expect(costPreview).not.toBeNull();
    });
  });
});
