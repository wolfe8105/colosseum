/**
 * Integration tests — src/auth.gate.ts → auth.core
 * Seam #151
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ARCH filter — verify imports from auth.gate.ts only pull from auth.core and config
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE_PATH = resolve(__dirname, '../../src/auth.gate.ts');

describe('ARCH: auth.gate.ts import surface', () => {
  it('only imports from auth.core and config (no wall-trigger modules)', () => {
    const source = readFileSync(SOURCE_PATH, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const forbidden = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of importLines) {
      for (const bad of forbidden) {
        expect(line, `forbidden import "${bad}" found: ${line}`).not.toContain(bad);
      }
    }
    // Must import from auth.core
    expect(importLines.some(l => l.includes('auth.core'))).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// Module-level mocks
// ──────────────────────────────────────────────────────────────

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function setupDOM() {
  document.body.innerHTML = '';
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe('requireAuth — auth.gate.ts → auth.core', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    setupDOM();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  // TC-1: returns true when user is set and not in placeholder mode
  it('TC-1: returns true when getCurrentUser() is truthy and not placeholder mode', async () => {
    const authCore = await import('../../src/auth.core.ts');
    // Directly set state via exported mutators
    authCore._setCurrentUser({ id: 'user-123', email: 'test@example.com' } as any);

    // Patch getIsPlaceholderMode via vi.spyOn on the module itself
    // We re-import gate to get a fresh copy wired to this module's state
    const { requireAuth } = await import('../../src/auth.gate.ts');

    // Override getIsPlaceholderMode to return false (real user)
    const spy = vi.spyOn(authCore, 'getIsPlaceholderMode').mockReturnValue(false);

    const result = requireAuth('post a challenge');
    expect(result).toBe(true);
    spy.mockRestore();
  });

  // TC-2: returns false when getCurrentUser() returns null
  it('TC-2: returns false when no user is logged in', async () => {
    const authCore = await import('../../src/auth.core.ts');
    authCore._setCurrentUser(null);
    vi.spyOn(authCore, 'getIsPlaceholderMode').mockReturnValue(false);

    const { requireAuth } = await import('../../src/auth.gate.ts');
    const result = requireAuth('vote');
    expect(result).toBe(false);
  });

  // TC-3: returns false when in placeholder mode (even if currentUser is set)
  it('TC-3: returns false when getIsPlaceholderMode() returns true', async () => {
    const authCore = await import('../../src/auth.core.ts');
    authCore._setCurrentUser({ id: 'placeholder-user', email: 'gladiator@moderator.app' } as any);
    vi.spyOn(authCore, 'getIsPlaceholderMode').mockReturnValue(true);

    const { requireAuth } = await import('../../src/auth.gate.ts');
    const result = requireAuth('challenge someone');
    expect(result).toBe(false);
  });

  // TC-4: modal is appended to body when requireAuth returns false
  it('TC-4: appends #auth-gate-modal to document.body when returning false', async () => {
    const authCore = await import('../../src/auth.core.ts');
    authCore._setCurrentUser(null);
    vi.spyOn(authCore, 'getIsPlaceholderMode').mockReturnValue(false);

    const { requireAuth } = await import('../../src/auth.gate.ts');
    requireAuth('react');

    const modal = document.getElementById('auth-gate-modal');
    expect(modal).not.toBeNull();
    expect(document.body.contains(modal)).toBe(true);
  });

  // TC-5: close button removes the modal from DOM
  it('TC-5: clicking #auth-gate-close-btn removes the modal', async () => {
    const authCore = await import('../../src/auth.core.ts');
    authCore._setCurrentUser(null);
    vi.spyOn(authCore, 'getIsPlaceholderMode').mockReturnValue(false);

    const { requireAuth } = await import('../../src/auth.gate.ts');
    requireAuth('submit a hot take');

    const closeBtn = document.getElementById('auth-gate-close-btn');
    expect(closeBtn).not.toBeNull();
    closeBtn!.click();

    expect(document.getElementById('auth-gate-modal')).toBeNull();
  });

  // TC-6: clicking the backdrop (modal overlay itself) removes modal
  it('TC-6: clicking the modal backdrop removes the modal', async () => {
    const authCore = await import('../../src/auth.core.ts');
    authCore._setCurrentUser(null);
    vi.spyOn(authCore, 'getIsPlaceholderMode').mockReturnValue(false);

    const { requireAuth } = await import('../../src/auth.gate.ts');
    requireAuth('join a debate');

    const modal = document.getElementById('auth-gate-modal') as HTMLElement;
    expect(modal).not.toBeNull();

    // Simulate click on the backdrop (target === modal)
    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: modal });
    modal.dispatchEvent(clickEvent);

    expect(document.getElementById('auth-gate-modal')).toBeNull();
  });

  // TC-7: actionLabel is HTML-escaped before injection (XSS protection)
  it('TC-7: actionLabel is escaped before innerHTML injection', async () => {
    const authCore = await import('../../src/auth.core.ts');
    authCore._setCurrentUser(null);
    vi.spyOn(authCore, 'getIsPlaceholderMode').mockReturnValue(false);

    const { requireAuth } = await import('../../src/auth.gate.ts');
    const xssPayload = '<script>alert("xss")</script>';
    requireAuth(xssPayload);

    const modal = document.getElementById('auth-gate-modal');
    expect(modal).not.toBeNull();
    // The raw script tag must NOT appear in innerHTML
    expect(modal!.innerHTML).not.toContain('<script>');
    // The escaped version should appear
    expect(modal!.innerHTML).toContain('&lt;script&gt;');
  });
});

describe('requireAuth — extended coverage (seam #151)', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  // TC-8: default actionLabel "do that" is used when no argument provided
  it('TC-8: uses "do that" as default actionLabel when called with no argument', async () => {
    const authCore = await import('../../src/auth.core.ts');
    authCore._setCurrentUser(null);
    vi.spyOn(authCore, 'getIsPlaceholderMode').mockReturnValue(false);

    const { requireAuth } = await import('../../src/auth.gate.ts');
    requireAuth(); // no argument

    const modal = document.getElementById('auth-gate-modal');
    expect(modal).not.toBeNull();
    expect(modal!.innerHTML).toContain('do that');
  });

  // TC-9: calling requireAuth twice removes old modal before appending new one
  it('TC-9: pre-existing #auth-gate-modal is removed before inserting a new one', async () => {
    const authCore = await import('../../src/auth.core.ts');
    authCore._setCurrentUser(null);
    vi.spyOn(authCore, 'getIsPlaceholderMode').mockReturnValue(false);

    const { requireAuth } = await import('../../src/auth.gate.ts');
    requireAuth('first call');
    requireAuth('second call');

    // Only one modal should be in the DOM
    const modals = document.querySelectorAll('#auth-gate-modal');
    expect(modals.length).toBe(1);
    // The modal should show the second call's label
    expect(modals[0].innerHTML).toContain('second call');
  });

  // TC-10: sign-up link contains returnTo param encoding current pathname
  it('TC-10: SIGN UP FREE link includes encoded returnTo query param', async () => {
    const authCore = await import('../../src/auth.core.ts');
    authCore._setCurrentUser(null);
    vi.spyOn(authCore, 'getIsPlaceholderMode').mockReturnValue(false);

    const { requireAuth } = await import('../../src/auth.gate.ts');
    requireAuth('join');

    const modal = document.getElementById('auth-gate-modal');
    expect(modal).not.toBeNull();
    const signUpLink = modal!.querySelector('a[href*="moderator-plinko"]') as HTMLAnchorElement;
    expect(signUpLink).not.toBeNull();
    expect(signUpLink.href).toContain('returnTo=');
  });

  // TC-11: login link contains returnTo param encoding current pathname
  it('TC-11: Log in link includes encoded returnTo query param', async () => {
    const authCore = await import('../../src/auth.core.ts');
    authCore._setCurrentUser(null);
    vi.spyOn(authCore, 'getIsPlaceholderMode').mockReturnValue(false);

    const { requireAuth } = await import('../../src/auth.gate.ts');
    requireAuth('vote');

    const modal = document.getElementById('auth-gate-modal');
    expect(modal).not.toBeNull();
    const loginLink = modal!.querySelector('a[href*="moderator-login"]') as HTMLAnchorElement;
    expect(loginLink).not.toBeNull();
    expect(loginLink.href).toContain('returnTo=');
  });

  // TC-12: no modal is appended when user is authenticated and not in placeholder mode
  it('TC-12: no modal is appended to body when requireAuth returns true', async () => {
    const authCore = await import('../../src/auth.core.ts');
    authCore._setCurrentUser({ id: 'real-user', email: 'user@test.com' } as any);
    vi.spyOn(authCore, 'getIsPlaceholderMode').mockReturnValue(false);

    const { requireAuth } = await import('../../src/auth.gate.ts');
    const result = requireAuth('post');

    expect(result).toBe(true);
    expect(document.getElementById('auth-gate-modal')).toBeNull();
  });
});
