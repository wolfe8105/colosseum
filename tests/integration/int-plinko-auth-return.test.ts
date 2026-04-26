// ============================================================
// INTEGRATOR — plinko-auth-return + plinko-helpers
// Seam #311: plinko-auth-return.ts → plinko-helpers
// Boundary: goToStep() from helpers is called by:
//   1) onAuthStateChange SIGNED_IN with email-confirmation hash
//   2) onAuthStateChange SIGNED_IN OAuth return
//   3) hash-based access_token handler (getCurrentUser check)
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let authStateCallback: ((event: string, session: unknown) => void) | null = null;

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
    authStateCallback = cb;
  }),
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
// DOM HELPERS
// ============================================================

function buildAuthReturnDOM(): void {
  document.body.innerHTML = `
    <div id="step-1" class="plinko-step active"></div>
    <div id="step-2" class="plinko-step"></div>
    <div id="step-3" class="plinko-step"></div>
    <div id="step-4" class="plinko-step"></div>
    <div id="step-5" class="plinko-step">
      <h2 class="step-title">CHECK YOUR EMAIL</h2>
      <div id="welcome-text"></div>
      <button id="btn-enter" style="display:none;" type="button">ENTER THE ARENA</button>
      <button id="btn-resend-email" type="button">RESEND</button>
    </div>
    <div id="progress" style="width:0%"></div>
  `;
}

function setWindowLocation(overrides: Partial<typeof window.location>): void {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: {
      href: 'http://localhost/moderator-plinko.html',
      search: '',
      hash: '',
      pathname: '/moderator-plinko.html',
      ...overrides,
    },
  });
}

// ============================================================
// ARCH FILTER — TC0
// ============================================================

describe('TC0 — ARCH: plinko-auth-return.ts import boundaries', () => {
  it('imports from plinko-helpers and no banned heavy deps', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/plinko-auth-return.ts'),
      'utf-8',
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));

    const banned = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const dep of banned) {
      expect(importLines.some(l => l.includes(dep))).toBe(false);
    }

    expect(importLines.some(l => l.includes('plinko-helpers'))).toBe(true);
  });
});

// ============================================================
// beforeEach
// ============================================================

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  authStateCallback = null;
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
    authStateCallback = cb;
  });
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  buildAuthReturnDOM();
  setWindowLocation({ hash: '' });
});

// ============================================================
// TC1 — SIGNED_IN + email-confirmation hash → goToStep(5) + restoreStep5UI
// ============================================================

describe('TC1 — SIGNED_IN email-confirmation hash: goToStep(5) and restores step-5 UI', () => {
  it('step-5 becomes active, title resets to "YOU\'RE IN", btn-enter visible', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    setWindowLocation({ hash: '#type=signup' });

    const { attachAuthReturnHandler } = await import('../../src/pages/plinko-auth-return.ts');
    attachAuthReturnHandler();

    // Fire auth state change
    authStateCallback!('SIGNED_IN', { user: { id: 'user-001' } });
    await vi.advanceTimersByTimeAsync(50);

    const step5 = document.getElementById('step-5');
    expect(step5?.classList.contains('active')).toBe(true);

    const title = document.querySelector('#step-5 .step-title');
    expect(title?.textContent).toBe("YOU'RE IN");

    const enterBtn = document.getElementById('btn-enter') as HTMLButtonElement;
    expect(enterBtn.style.display).not.toBe('none');
  });
});

// ============================================================
// TC2 — SIGNED_IN OAuth return (no confirmation hash): goToStep(2)
// ============================================================

describe('TC2 — SIGNED_IN OAuth return: goToStep(2) and signupMethod set to oauth', () => {
  it('step-2 becomes active and signupMethod is oauth', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // No email-confirmation hash
    setWindowLocation({ hash: '' });

    const state = await import('../../src/pages/plinko-state.ts');
    const { attachAuthReturnHandler } = await import('../../src/pages/plinko-auth-return.ts');
    attachAuthReturnHandler();

    authStateCallback!('SIGNED_IN', { user: { id: 'oauth-user-001' } });
    await vi.advanceTimersByTimeAsync(50);

    const step2 = document.getElementById('step-2');
    expect(step2?.classList.contains('active')).toBe(true);
    expect(state.signupMethod).toBe('oauth');
  });
});

// ============================================================
// TC3 — SIGNED_IN without user: no navigation
// ============================================================

describe('TC3 — SIGNED_IN with null session: no step change', () => {
  it('no plinko step becomes active when session has no user', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    setWindowLocation({ hash: '' });

    const { attachAuthReturnHandler } = await import('../../src/pages/plinko-auth-return.ts');
    attachAuthReturnHandler();

    authStateCallback!('SIGNED_IN', null);
    await vi.advanceTimersByTimeAsync(50);

    // No step except step-1 (initial active) should become active
    const step2 = document.getElementById('step-2');
    const step5 = document.getElementById('step-5');
    expect(step2?.classList.contains('active')).toBe(false);
    expect(step5?.classList.contains('active')).toBe(false);
  });
});

// ============================================================
// TC4 — hash access_token without live user: no navigation (no session)
// ============================================================

describe('TC4 — hash access_token type=signup but no live getCurrentUser: stays on step-1', () => {
  it('step-5 does NOT become active when getCurrentUser returns null', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // access_token present but getCurrentUser() returns null (no INITIAL_SESSION fired)
    setWindowLocation({
      hash: '#access_token=tok123&type=signup&refresh_token=ref456',
    });

    // auth.core.currentUser is null — no onAuthStateChange fired
    const { attachAuthReturnHandler } = await import('../../src/pages/plinko-auth-return.ts');
    attachAuthReturnHandler();

    await vi.advanceTimersByTimeAsync(50);

    // No navigation to step 5 — welcome-text stays empty
    const welcome = document.getElementById('welcome-text');
    expect(welcome?.textContent ?? '').toBe('');

    const step5 = document.getElementById('step-5');
    expect(step5?.classList.contains('active')).toBe(false);
  });
});

// ============================================================
// TC5 — hash cleared after access_token processed
// ============================================================

describe('TC5 — hash cleared after access_token processed (security: no token leak)', () => {
  it('window.history.replaceState called to strip hash tokens from URL', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    setWindowLocation({
      hash: '#access_token=tok123&type=signup',
    });

    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'confirmed-002' } } },
      error: null,
    });

    const { attachAuthReturnHandler } = await import('../../src/pages/plinko-auth-return.ts');
    attachAuthReturnHandler();

    await vi.advanceTimersByTimeAsync(50);

    expect(replaceStateSpy).toHaveBeenCalled();
  });
});

// ============================================================
// SEAM #366 — plinko-auth-return → plinko-state
// Boundary: set_signupMethod('oauth') called on OAuth return SIGNED_IN.
//           State starts null; only mutated on correct event+session.
// ============================================================

// TC6 — ARCH: plinko-auth-return imports plinko-state
describe('TC6 (Seam #366) — ARCH: plinko-auth-return imports plinko-state', () => {
  it('import list includes plinko-state and no banned wall deps', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/plinko-auth-return.ts'),
      'utf-8',
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    expect(importLines.some((l: string) => l.includes('plinko-state'))).toBe(true);
    for (const dep of ['webrtc', 'feed-room', 'deepgram', 'voicememo', 'arena-css', 'arena-sounds', 'peermetrics']) {
      expect(importLines.some((l: string) => l.includes(dep))).toBe(false);
    }
  });
});

// TC7 — signupMethod is null before attachAuthReturnHandler called
describe('TC7 (Seam #366) — plinko-state.signupMethod is null before handler attached', () => {
  it('signupMethod starts null and is not mutated until SIGNED_IN fires', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    setWindowLocation({ hash: '' });

    const state = await import('../../src/pages/plinko-state.ts');
    // Verify initial value
    expect(state.signupMethod).toBeNull();

    // Attach but do NOT fire auth event
    const { attachAuthReturnHandler } = await import('../../src/pages/plinko-auth-return.ts');
    attachAuthReturnHandler();

    await vi.advanceTimersByTimeAsync(50);

    // No event fired — state remains null
    expect(state.signupMethod).toBeNull();
  });
});

// TC8 — SIGNED_OUT event does NOT set signupMethod to oauth
describe('TC8 (Seam #366) — SIGNED_OUT event does not mutate plinko-state.signupMethod', () => {
  it('signupMethod stays null when auth event is SIGNED_OUT not SIGNED_IN', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    setWindowLocation({ hash: '' });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod(null);

    const { attachAuthReturnHandler } = await import('../../src/pages/plinko-auth-return.ts');
    attachAuthReturnHandler();

    // Fire SIGNED_OUT — should not trigger the oauth path
    authStateCallback!('SIGNED_OUT', { user: { id: 'out-user-001' } });
    await vi.advanceTimersByTimeAsync(50);

    expect(state.signupMethod).toBeNull();
    const step2 = document.getElementById('step-2');
    expect(step2?.classList.contains('active')).toBe(false);
  });
});

// TC9 — set_signupMethod('oauth') triggers goToStep(2) for non-email-confirm SIGNED_IN
describe('TC9 (Seam #366) — SIGNED_IN with user + no email hash: state.signupMethod=oauth + step-2 active', () => {
  it('signupMethod is oauth and step-2 active on clean OAuth SIGNED_IN', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    setWindowLocation({ hash: '' });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod(null);

    const { attachAuthReturnHandler } = await import('../../src/pages/plinko-auth-return.ts');
    attachAuthReturnHandler();

    authStateCallback!('SIGNED_IN', { user: { id: 'oauth-state-001' } });
    await vi.advanceTimersByTimeAsync(50);

    expect(state.signupMethod).toBe('oauth');
    const step2 = document.getElementById('step-2');
    expect(step2?.classList.contains('active')).toBe(true);
  });
});

// TC10 — email-confirm hash prevents set_signupMethod('oauth'); state unchanged
describe('TC10 (Seam #366) — email-confirm SIGNED_IN does not set signupMethod to oauth', () => {
  it('signupMethod stays null (not oauth) when email hash present on SIGNED_IN', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    setWindowLocation({ hash: '#type=signup' });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod(null);

    const { attachAuthReturnHandler } = await import('../../src/pages/plinko-auth-return.ts');
    attachAuthReturnHandler();

    authStateCallback!('SIGNED_IN', { user: { id: 'emailconf-001' } });
    await vi.advanceTimersByTimeAsync(50);

    // Email confirmation path returns early — set_signupMethod('oauth') NOT called
    expect(state.signupMethod).toBeNull();
    // Step 5 activated (email confirmed flow)
    const step5 = document.getElementById('step-5');
    expect(step5?.classList.contains('active')).toBe(true);
  });
});
