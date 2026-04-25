// int-home-invite-rpc-schemas.test.ts
// Seam #076 — src/pages/home.invite.ts → rpc-schemas
// Tests: loadInviteScreen RPC call path, error/null handling, cleanup,
//        schema validation for get_my_invite_stats.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// ----------------------------------------------------------------
// TC-ARCH: import from rpc-schemas still present
// ----------------------------------------------------------------
describe('Seam #076 — home.invite.ts → rpc-schemas', () => {
  it('ARCH: home.invite.ts imports from ../contracts/rpc-schemas', async () => {
    vi.resetModules();
    const src = await import('../../src/pages/home.invite.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = lines.some((l: string) => l.includes('../contracts/rpc-schemas'));
    expect(hasImport).toBe(true);
  });

  // ----------------------------------------------------------------
  // TC-SCHEMA-SHAPE: get_my_invite_stats Zod schema
  // ----------------------------------------------------------------
  describe('get_my_invite_stats schema', () => {
    it('TC-SCHEMA-VALID: parses a complete valid InviteStats object', async () => {
      vi.resetModules();
      const { get_my_invite_stats } = await import('../../src/contracts/rpc-schemas.ts');
      const result = get_my_invite_stats.safeParse({
        ref_code: 'ABC123',
        invite_url: 'https://themoderator.app/invite/ABC123',
        total_clicks: 10,
        total_signups: 5,
        total_converts: 2,
        next_milestone: 10,
        unclaimed_rewards: [
          {
            id: 'reward-1',
            milestone: 5,
            reward_type: 'legendary_powerup',
            pending_review: false,
            awarded_at: '2026-04-01T00:00:00Z',
          },
        ],
        activity: [
          { status: 'signup', username: 'testuser', event_at: '2026-04-02T00:00:00Z' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('TC-SCHEMA-INVALID-REWARD-TYPE: rejects unknown reward_type', async () => {
      vi.resetModules();
      const { get_my_invite_stats } = await import('../../src/contracts/rpc-schemas.ts');
      const result = get_my_invite_stats.safeParse({
        ref_code: 'ABC123',
        invite_url: 'https://themoderator.app/invite/ABC123',
        total_clicks: 10,
        total_signups: 5,
        total_converts: 2,
        next_milestone: 10,
        unclaimed_rewards: [
          {
            id: 'reward-1',
            milestone: 5,
            reward_type: 'invalid_type', // bad value
            pending_review: false,
            awarded_at: '2026-04-01T00:00:00Z',
          },
        ],
        activity: [],
      });
      expect(result.success).toBe(false);
    });

    it('TC-SCHEMA-NULL-REF-CODE: allows null ref_code and invite_url', async () => {
      vi.resetModules();
      const { get_my_invite_stats } = await import('../../src/contracts/rpc-schemas.ts');
      const result = get_my_invite_stats.safeParse({
        ref_code: null,
        invite_url: null,
        total_clicks: 0,
        total_signups: 0,
        total_converts: 0,
        next_milestone: 5,
        unclaimed_rewards: [],
        activity: [],
      });
      expect(result.success).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // TC-RPC-CALL: loadInviteScreen happy path
  // ----------------------------------------------------------------
  describe('loadInviteScreen', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('TC-RPC-CALL: calls safeRpc with get_my_invite_stats and renders on success', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockStats = {
        ref_code: 'XYZ',
        invite_url: 'https://themoderator.app/invite/XYZ',
        total_clicks: 3,
        total_signups: 1,
        total_converts: 0,
        next_milestone: 5,
        unclaimed_rewards: [],
        activity: [],
      };

      const mockSafeRpc = vi.fn().mockResolvedValue({ data: mockStats, error: null });
      const mockRenderInvite = vi.fn();
      const mockOpenClaimSheet = vi.fn().mockResolvedValue(() => {});

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: mockSafeRpc,
        getCurrentUser: vi.fn(() => null),
        getSupabaseClient: vi.fn(() => null),
      }));
      vi.doMock('../../src/pages/home.invite-render.ts', () => ({
        renderInvite: mockRenderInvite,
      }));
      vi.doMock('../../src/pages/home.invite-sheet.ts', () => ({
        openClaimSheet: mockOpenClaimSheet,
      }));
      vi.doMock('../../src/pages/home.invite-types.ts', () => ({}));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        friendlyError: vi.fn(),
        isAnyPlaceholder: false,
        FEATURES: {},
      }));

      const { loadInviteScreen } = await import('../../src/pages/home.invite.ts');

      const container = document.createElement('div');
      await loadInviteScreen(container);

      expect(mockSafeRpc).toHaveBeenCalledWith('get_my_invite_stats', {}, expect.anything());
      expect(mockRenderInvite).toHaveBeenCalledWith(container, mockStats, expect.any(Function));
    });

    it('TC-RPC-ERROR: shows error message when safeRpc returns error', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockSafeRpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } });
      const mockRenderInvite = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: mockSafeRpc,
        getCurrentUser: vi.fn(() => null),
        getSupabaseClient: vi.fn(() => null),
      }));
      vi.doMock('../../src/pages/home.invite-render.ts', () => ({
        renderInvite: mockRenderInvite,
      }));
      vi.doMock('../../src/pages/home.invite-sheet.ts', () => ({
        openClaimSheet: vi.fn(),
      }));
      vi.doMock('../../src/pages/home.invite-types.ts', () => ({}));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        friendlyError: vi.fn(),
        isAnyPlaceholder: false,
        FEATURES: {},
      }));

      const { loadInviteScreen } = await import('../../src/pages/home.invite.ts');

      const container = document.createElement('div');
      await loadInviteScreen(container);

      expect(container.innerHTML).toContain('Could not load invite stats');
      expect(mockRenderInvite).not.toHaveBeenCalled();
    });

    it('TC-RPC-NULL-DATA: shows error message when safeRpc returns null data with no error', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockSafeRpc = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockRenderInvite = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: mockSafeRpc,
        getCurrentUser: vi.fn(() => null),
        getSupabaseClient: vi.fn(() => null),
      }));
      vi.doMock('../../src/pages/home.invite-render.ts', () => ({
        renderInvite: mockRenderInvite,
      }));
      vi.doMock('../../src/pages/home.invite-sheet.ts', () => ({
        openClaimSheet: vi.fn(),
      }));
      vi.doMock('../../src/pages/home.invite-types.ts', () => ({}));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        friendlyError: vi.fn(),
        isAnyPlaceholder: false,
        FEATURES: {},
      }));

      const { loadInviteScreen } = await import('../../src/pages/home.invite.ts');

      const container = document.createElement('div');
      await loadInviteScreen(container);

      expect(container.innerHTML).toContain('Could not load invite stats');
      expect(mockRenderInvite).not.toHaveBeenCalled();
    });

    it('TC-CLEANUP: cleanupInviteScreen invokes registered sheet cleanup', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const sheetCleanupFn = vi.fn();
      const mockOpenClaimSheet = vi.fn().mockResolvedValue(sheetCleanupFn);
      const mockSafeRpc = vi.fn().mockResolvedValue({
        data: {
          ref_code: 'XYZ',
          invite_url: 'https://themoderator.app/invite/XYZ',
          total_clicks: 3,
          total_signups: 1,
          total_converts: 0,
          next_milestone: 5,
          unclaimed_rewards: [],
          activity: [],
        },
        error: null,
      });

      // renderInvite that immediately triggers the claim callback
      const mockRenderInvite = vi.fn().mockImplementation(
        (_container: HTMLElement, _stats: unknown, onClaim: (id: string, type: string) => void) => {
          onClaim('reward-1', 'legendary_powerup');
        }
      );

      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: mockSafeRpc,
        getCurrentUser: vi.fn(() => null),
        getSupabaseClient: vi.fn(() => null),
      }));
      vi.doMock('../../src/pages/home.invite-render.ts', () => ({
        renderInvite: mockRenderInvite,
      }));
      vi.doMock('../../src/pages/home.invite-sheet.ts', () => ({
        openClaimSheet: mockOpenClaimSheet,
      }));
      vi.doMock('../../src/pages/home.invite-types.ts', () => ({}));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        friendlyError: vi.fn(),
        isAnyPlaceholder: false,
        FEATURES: {},
      }));

      const { loadInviteScreen, cleanupInviteScreen } = await import('../../src/pages/home.invite.ts');

      const container = document.createElement('div');
      await loadInviteScreen(container);

      // Let the openClaimSheet promise resolve
      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();

      cleanupInviteScreen();
      expect(sheetCleanupFn).toHaveBeenCalled();
    });
  });
});
