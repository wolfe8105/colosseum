// int-arena-queue-core-utils.test.ts
// Seam #059 — src/arena/arena-queue.ts → arena-core.utils
// Tests: isPlaceholder, formatTimer, randomFrom, pushArenaState

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

describe('Seam #059 — arena-queue.ts → arena-core.utils', () => {
  // ----------------------------------------------------------------
  // ARCH test — must run first (no module re-import needed)
  // ----------------------------------------------------------------
  it('ARCH: arena-queue.ts imports from ./arena-core.utils', async () => {
    vi.resetModules();
    const src = await import('../../src/arena/arena-queue.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = lines.some((l: string) => l.includes('./arena-core.utils'));
    expect(hasImport).toBe(true);
  });

  // ----------------------------------------------------------------
  // formatTimer
  // ----------------------------------------------------------------
  describe('formatTimer', () => {
    let formatTimer: (sec: number) => string;

    beforeEach(async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
      const mod = await import('../../src/arena/arena-core.utils.ts');
      formatTimer = mod.formatTimer;
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('TC1: formatTimer(0) returns "0:00"', () => {
      expect(formatTimer(0)).toBe('0:00');
    });

    it('TC2: formatTimer(65) returns "1:05"', () => {
      expect(formatTimer(65)).toBe('1:05');
    });

    it('TC3: formatTimer(3600) returns "60:00"', () => {
      expect(formatTimer(3600)).toBe('60:00');
    });
  });

  // ----------------------------------------------------------------
  // isPlaceholder
  // ----------------------------------------------------------------
  describe('isPlaceholder', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('TC4: isPlaceholder() returns true when getSupabaseClient() returns null', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
      vi.doMock('../../src/auth.ts', () => ({
        getSupabaseClient: vi.fn(() => null),
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

    it('TC5: isPlaceholder() returns false when getSupabaseClient() returns a real client', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
      const fakeClient = { auth: {}, rpc: vi.fn() };
      vi.doMock('../../src/auth.ts', () => ({
        getSupabaseClient: vi.fn(() => fakeClient),
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
  });

  // ----------------------------------------------------------------
  // randomFrom
  // ----------------------------------------------------------------
  describe('randomFrom', () => {
    let randomFrom: <T>(arr: readonly T[]) => T;

    beforeEach(async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
      const mod = await import('../../src/arena/arena-core.utils.ts');
      randomFrom = mod.randomFrom;
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('TC6: randomFrom returns an element from the array', () => {
      const arr = ['alpha', 'beta', 'gamma'] as const;
      // Run multiple times to confirm always within set
      for (let i = 0; i < 20; i++) {
        const result = randomFrom(arr);
        expect(arr).toContain(result);
      }
    });
  });

  // ----------------------------------------------------------------
  // pushArenaState
  // ----------------------------------------------------------------
  describe('pushArenaState', () => {
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

    it('TC7: pushArenaState("queue") calls history.pushState with { arenaView: "queue" }', () => {
      const pushStateSpy = vi.spyOn(history, 'pushState');
      pushArenaState('queue');
      expect(pushStateSpy).toHaveBeenCalledWith({ arenaView: 'queue' }, '');
      pushStateSpy.mockRestore();
    });
  });
});
