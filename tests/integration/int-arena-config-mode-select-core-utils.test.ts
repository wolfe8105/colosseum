// int-arena-config-mode-select-core-utils.test.ts
// Seam #074 — src/arena/arena-config-mode-select.ts → arena-core.utils
// Tests: isPlaceholder gate in showModeSelect, pushArenaState call on overlay open,
//        closeModeSelect DOM removal, and direct utils (isPlaceholder, pushArenaState).

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
describe('Seam #074 — arena-config-mode-select.ts → arena-core.utils', () => {
  it('ARCH: arena-config-mode-select.ts imports from ./arena-core.utils', async () => {
    vi.resetModules();
    const src = await import('../../src/arena/arena-config-mode-select.ts?raw');
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
        getAvailableModerators: vi.fn(async () => []),
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
        getAvailableModerators: vi.fn(async () => []),
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
        getAvailableModerators: vi.fn(async () => []),
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

    it('TC4: pushArenaState("modeSelect") calls history.pushState with { arenaView: "modeSelect" }', () => {
      const pushStateSpy = vi.spyOn(history, 'pushState');
      pushArenaState('modeSelect');
      expect(pushStateSpy).toHaveBeenCalledWith({ arenaView: 'modeSelect' }, '');
      pushStateSpy.mockRestore();
    });

    it('TC5: pushArenaState passes the exact viewName string through', () => {
      const pushStateSpy = vi.spyOn(history, 'pushState');
      pushArenaState('lobby');
      expect(pushStateSpy).toHaveBeenCalledWith({ arenaView: 'lobby' }, '');
      pushStateSpy.mockRestore();
    });
  });

  // ----------------------------------------------------------------
  // showModeSelect — auth gate + pushArenaState integration
  // ----------------------------------------------------------------
  describe('showModeSelect — auth gate and overlay', () => {
    afterEach(() => {
      vi.useRealTimers();
      // Clean up any overlay left in DOM
      document.getElementById('arena-mode-overlay')?.remove();
    });

    it('TC6: showModeSelect redirects to plinko when no user and isPlaceholder returns false', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
      const fakeClient = { auth: {}, rpc: vi.fn() };
      vi.doMock('../../src/auth.ts', () => ({
        getSupabaseClient: vi.fn(() => fakeClient),
        getCurrentUser: vi.fn(() => null),
        safeRpc: vi.fn(),
        getCurrentProfile: vi.fn(() => null),
        getAvailableModerators: vi.fn(async () => []),
      }));
      vi.doMock('../../src/config.ts', () => ({
        isAnyPlaceholder: false,
        escapeHTML: (s: string) => s,
        friendlyError: vi.fn(),
        FEATURES: { liveDebates: false },
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-state.ts', () => ({
        set_selectedModerator: vi.fn(),
        set_selectedRuleset: vi.fn(),
        getArenaState: vi.fn(() => ({})),
      }));
      vi.doMock('../../src/arena/arena-constants.ts', () => ({
        MODES: {},
      }));
      vi.doMock('../../src/arena/arena-queue.ts', () => ({
        enterQueue: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-private-picker.ts', () => ({
        maybeRoutePrivate: vi.fn(() => false),
      }));
      vi.doMock('../../src/arena/arena-config-category.ts', () => ({
        showCategoryPicker: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-types-moderator.ts', () => ({}));

      const mod = await import('../../src/arena/arena-config-mode-select.ts');

      // Spy on window.location.href setter
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

      mod.showModeSelect();
      expect(assignedHref).toBe('moderator-plinko.html');

      // Restore
      Object.defineProperty(window, 'location', { writable: true, value: originalLocation });
    });

    it('TC7: closeModeSelect removes the overlay element from the DOM', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
      vi.doMock('../../src/auth.ts', () => ({
        getSupabaseClient: vi.fn(() => null),
        getCurrentUser: vi.fn(() => ({ id: 'user-1' })),
        safeRpc: vi.fn(),
        getCurrentProfile: vi.fn(() => null),
        getAvailableModerators: vi.fn(async () => []),
      }));
      vi.doMock('../../src/config.ts', () => ({
        isAnyPlaceholder: false,
        escapeHTML: (s: string) => s,
        friendlyError: vi.fn(),
        FEATURES: { liveDebates: false },
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-state.ts', () => ({
        set_selectedModerator: vi.fn(),
        set_selectedRuleset: vi.fn(),
        getArenaState: vi.fn(() => ({})),
      }));
      vi.doMock('../../src/arena/arena-constants.ts', () => ({
        MODES: {},
      }));
      vi.doMock('../../src/arena/arena-queue.ts', () => ({
        enterQueue: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-private-picker.ts', () => ({
        maybeRoutePrivate: vi.fn(() => false),
      }));
      vi.doMock('../../src/arena/arena-config-category.ts', () => ({
        showCategoryPicker: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-types-moderator.ts', () => ({}));

      const mod = await import('../../src/arena/arena-config-mode-select.ts');

      // Manually insert a fake overlay
      const fakeOverlay = document.createElement('div');
      fakeOverlay.id = 'arena-mode-overlay';
      document.body.appendChild(fakeOverlay);
      expect(document.getElementById('arena-mode-overlay')).not.toBeNull();

      const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {});
      mod.closeModeSelect();
      expect(document.getElementById('arena-mode-overlay')).toBeNull();
      backSpy.mockRestore();
    });
  });
});
