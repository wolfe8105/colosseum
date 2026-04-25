// ============================================================
// INTEGRATOR — share.ts → navigation
// Seam #205
// Boundary: src/share.ts calls navigateTo() from src/navigation.ts
//           and showToast() from src/config.ts
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// ARCH FILTER — verify share.ts imports navigation
// ============================================================
describe('ARCH: share.ts imports', () => {
  it('imports from navigation.ts', async () => {
    const src = await import('../../src/share.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasNav = lines.some((l: string) => l.includes('navigation'));
    expect(hasNav).toBe(true);
  });
});

// ============================================================
// MODULE RE-IMPORT PER TEST
// ============================================================

let handleDeepLink: () => void;
let navigateTo: (screenId: string) => void;
let registerNavigate: (fn: (screenId: string) => void) => void;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });

  // Default: auth resolves as guest
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      cb('INITIAL_SESSION', null);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  // Clear localStorage key
  localStorage.removeItem('colosseum_referrer');

  // Reset location so auto-init handleDeepLink() during import has no params
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search: '' },
    writable: true,
    configurable: true,
  });

  const shareModule = await import('../../src/share.ts');
  handleDeepLink = shareModule.handleDeepLink;

  const navModule = await import('../../src/navigation.ts');
  navigateTo = navModule.navigateTo;
  registerNavigate = navModule.registerNavigate;
});

// ============================================================
// TC-01 — ?debate= triggers navigateTo('arena') after 500ms
// ============================================================
describe('TC-01: handleDeepLink ?debate= calls navigateTo(arena)', () => {
  it('calls navigateTo with arena after setTimeout(500)', async () => {
    const navSpy = vi.fn();
    registerNavigate(navSpy);

    // Set search params
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?debate=some-debate-id' },
      writable: true,
      configurable: true,
    });

    handleDeepLink();

    // Before advancing time — should not have fired yet
    expect(navSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);

    expect(navSpy).toHaveBeenCalledWith('arena');
  });
});

// ============================================================
// TC-02 — ?from= (challenge) shows toast with challenger name + topic
// ============================================================
describe('TC-02: handleDeepLink ?from= shows toast', () => {
  it('calls showToast containing challenger name and topic after 1000ms', async () => {
    // We spy on showToast via config module
    const configModule = await import('../../src/config.ts');
    const toastSpy = vi.spyOn(configModule, 'showToast').mockImplementation(() => {});

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?from=Alice&topic=Is%20AI%20bad' },
      writable: true,
      configurable: true,
    });

    handleDeepLink();

    expect(toastSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);

    expect(toastSpy).toHaveBeenCalledTimes(1);
    const msg: string = toastSpy.mock.calls[0][0] as string;
    expect(msg).toContain('Alice');
    expect(msg).toContain('Is AI bad');

    toastSpy.mockRestore();
  });
});

// ============================================================
// TC-03 — ?ref= valid code stores referrer in localStorage
// ============================================================
describe('TC-03: handleDeepLink ?ref= stores referrer', () => {
  it('sets colosseum_referrer in localStorage for valid 5-char alphanum code', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?ref=abc12' },
      writable: true,
      configurable: true,
    });

    handleDeepLink();

    expect(localStorage.getItem('colosseum_referrer')).toBe('abc12');
  });
});

// ============================================================
// TC-04 — ?ref= invalid code does NOT set localStorage
// ============================================================
describe('TC-04: handleDeepLink ?ref= invalid code rejected', () => {
  it('does not set colosseum_referrer for invalid ref code', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?ref=INVALID!' },
      writable: true,
      configurable: true,
    });

    handleDeepLink();

    expect(localStorage.getItem('colosseum_referrer')).toBeNull();
  });
});

// ============================================================
// TC-05 — navigateTo is no-op before registerNavigate
// ============================================================
describe('TC-05: navigateTo no-op before register', () => {
  it('does not throw when no handler registered', () => {
    // fresh import without registering — just call navigateTo
    expect(() => navigateTo('arena')).not.toThrow();
  });
});

// ============================================================
// TC-06 — navigateTo dispatches to registered handler
// ============================================================
describe('TC-06: navigateTo dispatches to registered handler', () => {
  it('calls registered handler with correct screenId', () => {
    const spy = vi.fn();
    registerNavigate(spy);
    navigateTo('arena');
    expect(spy).toHaveBeenCalledWith('arena');
  });

  it('handles multiple calls with different screenIds', () => {
    const spy = vi.fn();
    registerNavigate(spy);
    navigateTo('home');
    navigateTo('arena');
    navigateTo('profile');
    expect(spy).toHaveBeenNthCalledWith(1, 'home');
    expect(spy).toHaveBeenNthCalledWith(2, 'arena');
    expect(spy).toHaveBeenNthCalledWith(3, 'profile');
  });
});

// ============================================================
// TC-07 — handleDeepLink sanitizes special chars in challenger name
// ============================================================
describe('TC-07: handleDeepLink sanitizes challenger name', () => {
  it('strips non-alphanumeric/underscore chars from challenger name in toast', async () => {
    const configModule = await import('../../src/config.ts');
    const toastSpy = vi.spyOn(configModule, 'showToast').mockImplementation(() => {});

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?from=Evil%3Cscript%3E&topic=test' },
      writable: true,
      configurable: true,
    });

    handleDeepLink();

    await vi.advanceTimersByTimeAsync(1000);

    expect(toastSpy).toHaveBeenCalledTimes(1);
    const msg: string = toastSpy.mock.calls[0][0] as string;
    // Special chars stripped — < and > should not appear in the name portion
    expect(msg).not.toContain('<script>');
    expect(msg).not.toContain('<');

    toastSpy.mockRestore();
  });
});
