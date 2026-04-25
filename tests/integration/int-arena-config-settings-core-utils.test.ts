// int-arena-config-settings-core-utils.test.ts
// Seam #092 — src/arena/arena-config-settings.ts → arena-core.utils
// Tests: isPlaceholder gate in showRankedPicker, pushArenaState calls on overlay open,
//        close helpers, and direct utils (isPlaceholder, pushArenaState).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// ----------------------------------------------------------------
// ARCH test
// ----------------------------------------------------------------
describe('Seam #092 — arena-config-settings.ts → arena-core.utils', () => {
  it('ARCH: arena-config-settings.ts imports from ./arena-core.utils', async () => {
    vi.resetModules();
    const src = await import('../../src/arena/arena-config-settings.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = lines.some((l: string) => l.includes('./arena-core.utils'));
    expect(hasImport).toBe(true);
  });

  // ----------------------------------------------------------------
  // isPlaceholder — via arena-core.utils directly
  // ----------------------------------------------------------------
  describe('isPlaceholder (via arena-core.utils)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('TC1: isPlaceholder() returns true when getSupabaseClient() returns null', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
      vi.doMock('../../src/auth.ts', () => ({
        getSupabaseClient: vi.fn(() => null),
        getCurrentUser: vi.fn(() => null),
        safeRpc: vi.fn(),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/config.ts', () => ({
        isAnyPlaceholder: false,
        escapeHTML: (s: string) => s,
        friendlyError: vi.fn(),
        FEATURES: { liveDebates: false },
        showToast: vi.fn(),
      }));
      const mod = await import('../../src/arena/arena-core.utils.ts');
      expect(mod.isPlaceholder()).toBe(true);
    });

    it('TC2: isPlaceholder() returns false when client is non-null and isAnyPlaceholder is false', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
      const fakeClient = { auth: {}, rpc: vi.fn() };
      vi.doMock('../../src/auth.ts', () => ({
        getSupabaseClient: vi.fn(() => fakeClient),
        getCurrentUser: vi.fn(() => null),
        safeRpc: vi.fn(),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/config.ts', () => ({
        isAnyPlaceholder: false,
        escapeHTML: (s: string) => s,
        friendlyError: vi.fn(),
        FEATURES: { liveDebates: false },
        showToast: vi.fn(),
      }));
      const mod = await import('../../src/arena/arena-core.utils.ts');
      expect(mod.isPlaceholder()).toBe(false);
    });

    it('TC3: isPlaceholder() returns true when isAnyPlaceholder flag is true (even with a client)', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
      const fakeClient = { auth: {}, rpc: vi.fn() };
      vi.doMock('../../src/auth.ts', () => ({
        getSupabaseClient: vi.fn(() => fakeClient),
        getCurrentUser: vi.fn(() => null),
        safeRpc: vi.fn(),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/config.ts', () => ({
        isAnyPlaceholder: true,
        escapeHTML: (s: string) => s,
        friendlyError: vi.fn(),
        FEATURES: { liveDebates: false },
        showToast: vi.fn(),
      }));
      const mod = await import('../../src/arena/arena-core.utils.ts');
      expect(mod.isPlaceholder()).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // pushArenaState — via arena-core.utils directly
  // ----------------------------------------------------------------
  describe('pushArenaState (via arena-core.utils)', () => {
    let pushArenaState: (viewName: string) => void;

    beforeEach(async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
      const mod = await import('../../src/arena/arena-core.utils.ts');
      pushArenaState = mod.pushArenaState;
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('TC4: pushArenaState("rankedPicker") calls history.pushState with { arenaView: "rankedPicker" }', () => {
      const pushStateSpy = vi.spyOn(history, 'pushState');
      pushArenaState('rankedPicker');
      expect(pushStateSpy).toHaveBeenCalledWith({ arenaView: 'rankedPicker' }, '');
      pushStateSpy.mockRestore();
    });

    it('TC5: pushArenaState("rulesetPicker") calls history.pushState with { arenaView: "rulesetPicker" }', () => {
      const pushStateSpy = vi.spyOn(history, 'pushState');
      pushArenaState('rulesetPicker');
      expect(pushStateSpy).toHaveBeenCalledWith({ arenaView: 'rulesetPicker' }, '');
      pushStateSpy.mockRestore();
    });
  });

  // ----------------------------------------------------------------
  // showRankedPicker — auth gate + pushArenaState integration
  // ----------------------------------------------------------------
  describe('showRankedPicker — auth gate and overlay', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.getElementById('arena-rank-overlay')?.remove();
    });

    it('TC6: showRankedPicker redirects to plinko when no user and isPlaceholder returns false', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
      const fakeClient = { auth: {}, rpc: vi.fn() };
      vi.doMock('../../src/auth.ts', () => ({
        getSupabaseClient: vi.fn(() => fakeClient),
        getCurrentUser: vi.fn(() => null),
        safeRpc: vi.fn(),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/config.ts', () => ({
        isAnyPlaceholder: false,
        escapeHTML: (s: string) => s,
        friendlyError: vi.fn(),
        FEATURES: { liveDebates: false },
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-state.ts', () => ({
        selectedRanked: false,
        set_selectedRanked: vi.fn(),
        set_selectedRuleset: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-config-mode-select.ts', () => ({
        showModeSelect: vi.fn(),
      }));

      const mod = await import('../../src/arena/arena-config-settings.ts');

      const originalLocation = window.location;
      let assignedHref = '';
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...originalLocation, href: '' },
      });
      Object.defineProperty(window.location, 'href', {
        set(v: string) { assignedHref = v; },
        get() { return assignedHref; },
      });

      mod.showRankedPicker();
      expect(assignedHref).toBe('moderator-plinko.html');

      Object.defineProperty(window, 'location', { writable: true, value: originalLocation });
    });

    it('TC7: closeRankedPicker removes the overlay element from the DOM', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
      vi.doMock('../../src/auth.ts', () => ({
        getSupabaseClient: vi.fn(() => null),
        getCurrentUser: vi.fn(() => ({ id: 'user-1' })),
        safeRpc: vi.fn(),
        getCurrentProfile: vi.fn(() => null),
      }));
      vi.doMock('../../src/config.ts', () => ({
        isAnyPlaceholder: false,
        escapeHTML: (s: string) => s,
        friendlyError: vi.fn(),
        FEATURES: { liveDebates: false },
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-state.ts', () => ({
        selectedRanked: false,
        set_selectedRanked: vi.fn(),
        set_selectedRuleset: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-config-mode-select.ts', () => ({
        showModeSelect: vi.fn(),
      }));

      const mod = await import('../../src/arena/arena-config-settings.ts');

      const fakeOverlay = document.createElement('div');
      fakeOverlay.id = 'arena-rank-overlay';
      document.body.appendChild(fakeOverlay);
      expect(document.getElementById('arena-rank-overlay')).not.toBeNull();

      const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {});
      mod.closeRankedPicker();
      expect(document.getElementById('arena-rank-overlay')).toBeNull();
      backSpy.mockRestore();
    });
  });
});
