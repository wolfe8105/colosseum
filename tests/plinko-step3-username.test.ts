/**
 * Tests for src/pages/plinko-step3-username.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSignUp = vi.hoisted(() => vi.fn());
const mockGetSupabaseClient = vi.hoisted(() => vi.fn());
const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockIsAnyPlaceholder = vi.hoisted(() => ({ value: false }));
const mockNudge = vi.hoisted(() => vi.fn());
const mockClearMsg = vi.hoisted(() => vi.fn());
const mockGoToStep = vi.hoisted(() => vi.fn());
const mockShowMsg = vi.hoisted(() => vi.fn());
const mockSignupMethod = vi.hoisted(() => ({ value: 'email' }));
const mockSignupEmail = vi.hoisted(() => ({ value: 'test@example.com' }));
const mockSignupPassword = vi.hoisted(() => ({ value: 'ValidPass1!' }));
const mockSignupDob = vi.hoisted(() => ({ value: '2000-01-01' }));
const mockSet_signupEmail = vi.hoisted(() => vi.fn());
const mockSet_signupPassword = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  signUp: mockSignUp,
  getSupabaseClient: mockGetSupabaseClient,
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  get isAnyPlaceholder() { return mockIsAnyPlaceholder.value; },
}));

vi.mock('../src/nudge.ts', () => ({
  nudge: mockNudge,
}));

vi.mock('../src/pages/plinko-helpers.ts', () => ({
  clearMsg: mockClearMsg,
  goToStep: mockGoToStep,
  showMsg: mockShowMsg,
}));

vi.mock('../src/onboarding-drip.ts', () => ({
  triggerDripDay: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/pages/plinko-state.ts', () => ({
  get signupMethod() { return mockSignupMethod.value; },
  get signupEmail() { return mockSignupEmail.value; },
  get signupPassword() { return mockSignupPassword.value; },
  get signupDob() { return mockSignupDob.value; },
  set_signupEmail: mockSet_signupEmail,
  set_signupPassword: mockSet_signupPassword,
}));

import { attachStep3 } from '../src/pages/plinko-step3-username.ts';

function buildDOM(username = 'testuser', displayName = '') {
  document.body.innerHTML = `
    <input id="signup-username" value="${username}" />
    <input id="signup-display" value="${displayName}" />
    <div id="step3-msg"></div>
    <div id="step1-msg"></div>
    <div id="step-5">
      <div class="step-title"></div>
      <div id="welcome-text"></div>
      <button id="btn-enter"></button>
    </div>
    <button id="btn-create">CREATE ACCOUNT</button>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAnyPlaceholder.value = false;
  mockSignupMethod.value = 'email';
  mockSignupEmail.value = 'test@example.com';
  mockSignupPassword.value = 'ValidPass1!';
  mockSignupDob.value = '2000-01-01';
});

describe('attachStep3 — shows error when username too short', () => {
  it('TC1: shows error for username under 3 characters', () => {
    buildDOM('ab');
    attachStep3();
    document.getElementById('btn-create')!.click();
    expect(mockShowMsg).toHaveBeenCalledWith('step3-msg', expect.stringContaining('3-20'), 'error');
  });
});

describe('attachStep3 — shows error when username has invalid chars', () => {
  it('TC2: shows error for username with special characters', () => {
    buildDOM('bad user!');
    attachStep3();
    document.getElementById('btn-create')!.click();
    expect(mockShowMsg).toHaveBeenCalledWith('step3-msg', expect.stringContaining('underscores'), 'error');
  });
});

describe('attachStep3 — calls signUp for email method', () => {
  it('TC3: calls signUp with email credentials on valid input', async () => {
    buildDOM();
    mockSignUp.mockResolvedValue({ success: true, session: { user: {} }, error: null });
    attachStep3();
    document.getElementById('btn-create')!.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockSignUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
      username: 'testuser',
    }));
  });
});

describe('attachStep3 — shows signUp error on failure', () => {
  it('TC4: shows error message returned from signUp', async () => {
    buildDOM();
    mockSignUp.mockResolvedValue({ success: false, error: 'Username taken', session: null });
    attachStep3();
    document.getElementById('btn-create')!.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockShowMsg).toHaveBeenCalledWith('step3-msg', 'Username taken', 'error');
  });
});

describe('attachStep3 — advances to step 5 when session is null (email confirm)', () => {
  it('TC5: goes to step 5 when signUp returns no session', async () => {
    buildDOM();
    mockSignUp.mockResolvedValue({ success: true, session: null, error: null });
    attachStep3();
    document.getElementById('btn-create')!.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockGoToStep).toHaveBeenCalledWith(5);
  });
});

describe('attachStep3 — advances to step 4 when session exists', () => {
  it('TC6: goes to step 4 when signUp returns a session', async () => {
    buildDOM();
    mockSignUp.mockResolvedValue({ success: true, session: { user: {} }, error: null });
    attachStep3();
    document.getElementById('btn-create')!.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockGoToStep).toHaveBeenCalledWith(4);
  });
});

describe('attachStep3 — clears credentials after successful signup', () => {
  it('TC7: calls set_signupPassword("") and set_signupEmail("") after successful email signup', async () => {
    buildDOM();
    mockSignUp.mockResolvedValue({ success: true, session: { user: {} }, error: null });
    attachStep3();
    document.getElementById('btn-create')!.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockSet_signupPassword).toHaveBeenCalledWith('');
    expect(mockSet_signupEmail).toHaveBeenCalledWith('');
  });
});

describe('attachStep3 — oauth method calls safeRpc update_profile', () => {
  it('TC8: for oauth signup, calls safeRpc update_profile', async () => {
    buildDOM();
    mockSignupMethod.value = 'oauth';
    mockGetSupabaseClient.mockReturnValue({ rpc: vi.fn() });
    mockSafeRpc.mockResolvedValue({ data: {}, error: null });
    attachStep3();
    document.getElementById('btn-create')!.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockSafeRpc).toHaveBeenCalledWith('update_profile', expect.objectContaining({ p_username: 'testuser' }));
  });
});

describe('ARCH — src/pages/plinko-step3-username.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      '../nudge.ts',
      './plinko-helpers.ts',
      './plinko-state.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/plinko-step3-username.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
