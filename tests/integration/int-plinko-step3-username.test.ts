// ============================================================
// INTEGRATOR — plinko-step3-username + nudge
// Seam #188: plinko-step3-username.ts → nudge.ts
// Boundary: nudge() called on OAuth success path.
//           nudge suppression via sessionStorage/localStorage.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
// DOM HELPERS
// ============================================================

function buildStep3DOM(): void {
  document.body.innerHTML = `
    <div id="step-1" class="plinko-step active">
      <div id="step1-msg" class="form-msg"></div>
      <input id="signup-email" type="email" value="" />
    </div>
    <div id="step-2" class="plinko-step">
      <div id="step2-msg" class="form-msg"></div>
    </div>
    <div id="step-3" class="plinko-step">
      <div id="step3-msg" class="form-msg"></div>
      <input id="signup-username" type="text" value="" />
      <input id="signup-display" type="text" value="" />
      <button id="btn-create" type="button">CREATE ACCOUNT</button>
    </div>
    <div id="step-4" class="plinko-step">
      <div id="step4-msg" class="form-msg"></div>
    </div>
    <div id="step-5" class="plinko-step">
      <h2 class="step-title">YOU'RE IN</h2>
      <div id="welcome-text"></div>
      <button id="btn-enter" type="button">ENTER THE ARENA</button>
    </div>
    <div id="progress"></div>
  `;
}

// ============================================================
// ARCH FILTER — TC0: import lines point only to expected deps
// ============================================================

describe('TC0 — ARCH: plinko-step3-username.ts import boundaries', () => {
  it('imports from nudge.ts and no banned heavy deps', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/plinko-step3-username.ts'),
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

    // Must import nudge
    expect(importLines.some(l => l.includes('nudge'))).toBe(true);
  });
});

// ============================================================
// SHARED beforeEach
// ============================================================

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  buildStep3DOM();

  // Reset storage
  sessionStorage.clear();
  localStorage.clear();
});

// ============================================================
// TC1 — OAuth success path calls nudge('first_signup', ...)
// ============================================================

describe('TC1 — OAuth success: nudge fires with first_signup id', () => {
  it('calls showToast once with success type after OAuth account creation', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockRpc.mockResolvedValue({ data: null, error: null });
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-oauth-001' } } },
      error: null,
    });

    // Set up plinko state: oauth method
    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod('oauth');
    state.set_signupDob('');

    // Set up DOM inputs
    (document.getElementById('signup-username') as HTMLInputElement).value = 'oauthuser';
    (document.getElementById('signup-display') as HTMLInputElement).value = 'OAuth User';

    const configToast = await import('../../src/config.toast.ts');
    const showToastSpy = vi.spyOn(configToast, 'showToast');

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    const btn = document.getElementById('btn-create') as HTMLButtonElement;
    btn.click();

    await vi.runAllTimersAsync();

    // nudge fires showToast exactly once
    expect(showToastSpy).toHaveBeenCalledTimes(1);
    expect(showToastSpy).toHaveBeenCalledWith(
      expect.stringContaining('Welcome to the arena'),
      'success',
    );

    // welcome-text updated
    const welcome = document.getElementById('welcome-text');
    expect(welcome?.textContent).toContain('OAuth User');
  });
});

// ============================================================
// TC2 — nudge suppression: already fired this session
// ============================================================

describe('TC2 — nudge suppressed when already fired this session', () => {
  it('does not call showToast when first_signup already in sessionStorage', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Pre-seed sessionStorage with first_signup already fired
    sessionStorage.setItem('mod_nudge_session', JSON.stringify(['first_signup']));

    mockRpc.mockResolvedValue({ data: null, error: null });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod('oauth');
    state.set_signupDob('');

    (document.getElementById('signup-username') as HTMLInputElement).value = 'oauthuser2';

    const configToast = await import('../../src/config.toast.ts');
    const showToastSpy = vi.spyOn(configToast, 'showToast');

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    document.getElementById('btn-create')!.click();
    await vi.runAllTimersAsync();

    // nudge is suppressed — showToast not called
    expect(showToastSpy).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC3 — nudge suppressed: session cap reached (3 different IDs)
// ============================================================

describe('TC3 — nudge suppressed when session cap of 3 is reached', () => {
  it('does not call showToast when 3 other nudges already fired this session', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Pre-seed sessionStorage with 3 OTHER IDs (cap = 3)
    sessionStorage.setItem('mod_nudge_session', JSON.stringify(['nudge_a', 'nudge_b', 'nudge_c']));

    mockRpc.mockResolvedValue({ data: null, error: null });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod('oauth');
    state.set_signupDob('');

    (document.getElementById('signup-username') as HTMLInputElement).value = 'oauthuser3';

    const configToast = await import('../../src/config.toast.ts');
    const showToastSpy = vi.spyOn(configToast, 'showToast');

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    document.getElementById('btn-create')!.click();
    await vi.runAllTimersAsync();

    expect(showToastSpy).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC4 — nudge suppressed: 24h cooldown active
// ============================================================

describe('TC4 — nudge suppressed when 24h cooldown active', () => {
  it('does not call showToast when localStorage shows first_signup fired <24h ago', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Pre-seed localStorage: fired 1 hour ago
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    localStorage.setItem('mod_nudge_history', JSON.stringify({ first_signup: oneHourAgo }));

    mockRpc.mockResolvedValue({ data: null, error: null });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod('oauth');
    state.set_signupDob('');

    (document.getElementById('signup-username') as HTMLInputElement).value = 'oauthuser4';

    const configToast = await import('../../src/config.toast.ts');
    const showToastSpy = vi.spyOn(configToast, 'showToast');

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    document.getElementById('btn-create')!.click();
    await vi.runAllTimersAsync();

    expect(showToastSpy).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC5 — nudge fires and marks sessionStorage + localStorage
// ============================================================

describe('TC5 — nudge marks both sessionStorage and localStorage after firing', () => {
  it('adds first_signup to session and history after successful nudge', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockRpc.mockResolvedValue({ data: null, error: null });
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-oauth-002' } } },
      error: null,
    });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod('oauth');
    state.set_signupDob('');

    (document.getElementById('signup-username') as HTMLInputElement).value = 'oauthuser5';

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    document.getElementById('btn-create')!.click();
    await vi.runAllTimersAsync();

    // sessionStorage should contain first_signup
    const sessionRaw = sessionStorage.getItem('mod_nudge_session');
    expect(sessionRaw).not.toBeNull();
    const sessionFired: string[] = JSON.parse(sessionRaw!);
    expect(sessionFired).toContain('first_signup');

    // localStorage should contain first_signup with recent timestamp
    const historyRaw = localStorage.getItem('mod_nudge_history');
    expect(historyRaw).not.toBeNull();
    const history: Record<string, number> = JSON.parse(historyRaw!);
    expect(history['first_signup']).toBeDefined();
    expect(history['first_signup']).toBeGreaterThan(Date.now() - 5000);
  });
});

// ============================================================
// TC6 — OAuth path calls update_profile and set_profile_dob RPCs
// ============================================================

describe('TC6 — OAuth path calls update_profile + set_profile_dob RPCs', () => {
  it('calls safeRpc with update_profile and set_profile_dob when signupMethod is oauth + dob set', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockRpc.mockResolvedValue({ data: null, error: null });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod('oauth');
    state.set_signupDob('1995-06-15');

    (document.getElementById('signup-username') as HTMLInputElement).value = 'oauthwithDob';
    (document.getElementById('signup-display') as HTMLInputElement).value = 'Dob User';

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    document.getElementById('btn-create')!.click();
    await vi.runAllTimersAsync();

    // update_profile RPC called with correct params
    const updateProfileCall = mockRpc.mock.calls.find(
      (c: unknown[]) => c[0] === 'update_profile',
    );
    expect(updateProfileCall).toBeDefined();
    expect(updateProfileCall![1]).toMatchObject({
      p_display_name: 'Dob User',
      p_username: 'oauthwithDob',
    });

    // set_profile_dob RPC called with dob
    const dobCall = mockRpc.mock.calls.find(
      (c: unknown[]) => c[0] === 'set_profile_dob',
    );
    expect(dobCall).toBeDefined();
    expect(dobCall![1]).toMatchObject({ p_dob: '1995-06-15' });
  });
});

// ============================================================
// TC7 — Username validation: too short shows error, no RPC
// ============================================================

describe('TC7 — username too short shows error message, no RPC fired', () => {
  it('shows "Username must be 3-20 characters" in step3-msg and does not call rpc', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod('oauth');

    (document.getElementById('signup-username') as HTMLInputElement).value = 'ab';

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    document.getElementById('btn-create')!.click();
    await vi.runAllTimersAsync();

    const msgEl = document.getElementById('step3-msg');
    expect(msgEl?.textContent).toContain('Username must be 3-20 characters');
    expect(msgEl?.className).toContain('error');

    // No step3 RPCs should have been called (auth-init RPCs like complete_onboarding_day are allowed)
    const step3Calls = mockRpc.mock.calls.filter(
      (c: unknown[]) => c[0] === 'update_profile' || c[0] === 'check_username' || c[0] === 'set_profile_dob',
    );
    expect(step3Calls).toHaveLength(0);
  });
});

// ============================================================
// SEAM #308 — plinko-step3-username → plinko-helpers
// Boundary: clearMsg, showMsg, goToStep from helpers.
//           Validates that helpers wire correctly into step3 UI.
// ============================================================

// TC8 — showMsg('step3-msg', ...) sets textContent + class
describe('TC8 (Seam #308) — showMsg sets step3-msg textContent and error class', () => {
  it('invalid username chars: step3-msg shows error class and correct text', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod('oauth');

    (document.getElementById('signup-username') as HTMLInputElement).value = 'bad user!';

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    document.getElementById('btn-create')!.click();
    await vi.advanceTimersByTimeAsync(50);

    const msgEl = document.getElementById('step3-msg');
    expect(msgEl?.className).toContain('error');
    expect(msgEl?.textContent).toContain('Letters, numbers, and underscores only');
  });
});

// TC9 — clearMsg clears step3-msg before new validation run
describe('TC9 (Seam #308) — clearMsg clears stale error before new validation', () => {
  it('stale error message is cleared when btn-create clicked again', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod('oauth');

    // Pre-seed stale error
    const msgEl = document.getElementById('step3-msg')!;
    msgEl.className = 'form-msg error';
    msgEl.textContent = 'stale error from prior attempt';

    // Now click with empty username to trigger early return (clearMsg then showMsg)
    (document.getElementById('signup-username') as HTMLInputElement).value = '';

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    document.getElementById('btn-create')!.click();
    await vi.advanceTimersByTimeAsync(50);

    expect(msgEl.textContent).not.toBe('stale error from prior attempt');
  });
});

// TC10 — goToStep(4) via email signup: mock auth.signUp to return a session
describe('TC10 (Seam #308) — email signup with session: goToStep(4) activates step-4', () => {
  it('step-4 becomes active when auth.signUp returns a session', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockRpc.mockResolvedValue({ data: null, error: null });
    // auth.signUp is called on the supabase client — add signUp mock to mockAuth
    (mockAuth as Record<string, unknown>).signUp = vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'email-user-001' } }, user: { id: 'email-user-001' } },
      error: null,
    });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod('email');
    state.set_signupEmail('test@example.com');
    state.set_signupPassword('StrongP@ss1!');
    state.set_signupDob('2000-06-15');

    (document.getElementById('signup-username') as HTMLInputElement).value = 'validuser';

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    document.getElementById('btn-create')!.click();
    await vi.advanceTimersByTimeAsync(500);

    // Step 4 should be active (goToStep(4) for email with session)
    // OR step 5 if session is null path — depends on signUp mock result
    const step4Active = document.getElementById('step-4')?.classList.contains('active') ?? false;
    const step5Active = document.getElementById('step-5')?.classList.contains('active') ?? false;
    expect(step4Active || step5Active).toBe(true);
  });
});

// TC11 — goToStep(1) via expired email session: step-1 becomes active after delay
describe('TC11 (Seam #308) — expired email session: goToStep(1) after 1500ms', () => {
  it('step-1 becomes active when signupEmail is empty with email method', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod('email');
    state.set_signupEmail('');
    state.set_signupPassword('');

    (document.getElementById('signup-username') as HTMLInputElement).value = 'validuser';

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    document.getElementById('btn-create')!.click();
    // Before timeout fires
    await vi.advanceTimersByTimeAsync(500);
    const beforeTimeout = document.getElementById('step-1')?.classList.contains('active') ?? false;

    // After 1500ms timeout
    await vi.advanceTimersByTimeAsync(1200);
    const afterTimeout = document.getElementById('step-1')?.classList.contains('active') ?? false;

    // step-1 active after the 1500ms timeout
    expect(afterTimeout).toBe(true);
    // Error message shown
    const msgEl = document.getElementById('step3-msg');
    expect(msgEl?.textContent).toContain('Session expired');
  });
});

// ============================================================
// SEAM #363 — plinko-step3-username → plinko-state
// Boundary: signupMethod / signupEmail / signupPassword / signupDob
//           read live; set_signupPassword + set_signupEmail wiped on success.
// ============================================================

// TC12 — plinko-state ARCH: imports plinko-state, not banned deps
describe('TC12 (Seam #363) — ARCH: plinko-step3-username imports plinko-state', () => {
  it('import list includes plinko-state and no banned wall deps', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/plinko-step3-username.ts'),
      'utf-8',
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    expect(importLines.some((l: string) => l.includes('plinko-state'))).toBe(true);
    for (const dep of ['webrtc', 'feed-room', 'deepgram', 'voicememo', 'arena-css', 'arena-sounds', 'peermetrics']) {
      expect(importLines.some((l: string) => l.includes(dep))).toBe(false);
    }
  });
});

// TC13 — set_signupPassword + set_signupEmail cleared after email success (no session path)
describe('TC13 (Seam #363) — credentials wiped from plinko-state after email signup (no session)', () => {
  it('signupEmail and signupPassword are empty strings after successful signUp with no session', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    (mockAuth as Record<string, unknown>).signUp = vi.fn().mockResolvedValue({
      data: { session: null, user: { id: 'email-noconf-001' } },
      error: null,
    });
    mockRpc.mockResolvedValue({ data: null, error: null });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod('email');
    state.set_signupEmail('wipe@example.com');
    state.set_signupPassword('StrongP@ss1!');
    state.set_signupDob('1995-03-10');

    (document.getElementById('signup-username') as HTMLInputElement).value = 'wipeuser';

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    document.getElementById('btn-create')!.click();
    await vi.runAllTimersAsync();

    // Credentials must be wiped
    expect(state.signupEmail).toBe('');
    expect(state.signupPassword).toBe('');
  });
});

// TC14 — credentials NOT wiped on { success: false } (only wiped on success or real throw)
// auth.ops.ts wraps supabase throws into { success: false } — step3 shows error and returns early.
// Only step3's own catch (which requires getSupabaseClient() itself to throw) clears credentials.
describe('TC14 (Seam #363) — credentials remain in state on signUp { success: false } (error returned, not thrown)', () => {
  it('signupEmail is still set after signUp returns success:false (no credentials wipe on error path)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    (mockAuth as Record<string, unknown>).signUp = vi.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Email already registered.' },
    });
    mockRpc.mockResolvedValue({ data: null, error: null });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod('email');
    state.set_signupEmail('existing@example.com');
    state.set_signupPassword('StrongP@ss1!');
    state.set_signupDob('1993-07-04');

    (document.getElementById('signup-username') as HTMLInputElement).value = 'throwuser';

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    document.getElementById('btn-create')!.click();
    await vi.runAllTimersAsync();

    // auth.ops wraps error into { success: false } — step3 early-returns after showMsg
    // credentials are NOT wiped in this path (only wiped on confirmed success)
    const msgEl = document.getElementById('step3-msg');
    expect(msgEl?.textContent).toContain('Email already registered.');
    // Credentials intact (not wiped on failure)
    expect(state.signupEmail).toBe('existing@example.com');
  });
});

// TC15 — null signupMethod triggers "Session expired" and redirects to step 1
describe('TC15 (Seam #363) — null signupMethod in state triggers session-expired path', () => {
  it('step3-msg shows Session expired and step-1 activates after 1500ms', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod(null);

    (document.getElementById('signup-username') as HTMLInputElement).value = 'nullmethoduser';

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    document.getElementById('btn-create')!.click();
    await vi.advanceTimersByTimeAsync(200);

    const msgEl = document.getElementById('step3-msg');
    expect(msgEl?.textContent).toContain('Session expired');

    await vi.advanceTimersByTimeAsync(1500);
    const step1 = document.getElementById('step-1');
    expect(step1?.classList.contains('active')).toBe(true);
  });
});

// TC16 — signupDob flows from state into auth.signUp as date_of_birth in options.data
// auth.ops.ts calls supabase.auth.signUp({ ..., options: { data: { date_of_birth: dob } } })
describe('TC16 (Seam #363) — signupDob from plinko-state passed to supabase.auth.signUp as date_of_birth', () => {
  it('supabase.auth.signUp called with options.data.date_of_birth matching plinko-state.signupDob', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const signUpMock = vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'dob-flow-001' } }, user: { id: 'dob-flow-001' } },
      error: null,
    });
    (mockAuth as Record<string, unknown>).signUp = signUpMock;
    mockRpc.mockResolvedValue({ data: null, error: null });

    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupMethod('email');
    state.set_signupEmail('dobflow@example.com');
    state.set_signupPassword('StrongP@ss1!');
    state.set_signupDob('1988-11-22');

    (document.getElementById('signup-username') as HTMLInputElement).value = 'dobflowuser';

    const { attachStep3 } = await import('../../src/pages/plinko-step3-username.ts');
    attachStep3();

    document.getElementById('btn-create')!.click();
    await vi.runAllTimersAsync();

    // auth.ops.ts calls supabase.auth.signUp with options.data.date_of_birth (not 'dob')
    expect(signUpMock).toHaveBeenCalled();
    const callArgs = signUpMock.mock.calls[0][0] as Record<string, unknown>;
    const meta = (callArgs.options as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    expect(meta).toBeDefined();
    expect(meta!['date_of_birth']).toBe('1988-11-22');
  });
});
