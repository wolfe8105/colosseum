/**
 * Tests for src/pages/plinko-step1-method.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockOauthLogin = vi.hoisted(() => vi.fn());
const mockIsAnyPlaceholder = vi.hoisted(() => ({ value: false }));
const mockClearMsg = vi.hoisted(() => vi.fn());
const mockGoToStep = vi.hoisted(() => vi.fn());
const mockShowMsg = vi.hoisted(() => vi.fn());
const mockValidatePasswordComplexity = vi.hoisted(() => vi.fn());
const mockCheckHIBP = vi.hoisted(() => vi.fn());
const mockSet_signupEmail = vi.hoisted(() => vi.fn());
const mockSet_signupMethod = vi.hoisted(() => vi.fn());
const mockSet_signupPassword = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  oauthLogin: mockOauthLogin,
}));

vi.mock('../src/config.ts', () => ({
  get isAnyPlaceholder() { return mockIsAnyPlaceholder.value; },
}));

vi.mock('../src/pages/plinko-helpers.ts', () => ({
  clearMsg: mockClearMsg,
  goToStep: mockGoToStep,
  showMsg: mockShowMsg,
}));

vi.mock('../src/pages/plinko-password.ts', () => ({
  validatePasswordComplexity: mockValidatePasswordComplexity,
  checkHIBP: mockCheckHIBP,
}));

vi.mock('../src/pages/plinko-state.ts', () => ({
  set_signupEmail: mockSet_signupEmail,
  set_signupMethod: mockSet_signupMethod,
  set_signupPassword: mockSet_signupPassword,
}));

import { attachStep1 } from '../src/pages/plinko-step1-method.ts';

function buildDOM() {
  document.body.innerHTML = `
    <button id="btn-google">Google</button>
    <button id="btn-apple">Apple</button>
    <div id="email-fields"></div>
    <button id="email-toggle">Use email instead ▾</button>
    <input id="signup-email" value="" />
    <input id="signup-password" value="" />
    <button id="btn-email-next">CONTINUE</button>
    <div id="step1-msg"></div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAnyPlaceholder.value = false;
  buildDOM();
});

describe('attachStep1 — Google button calls oauthLogin', () => {
  it('TC1: clicking Google calls oauthLogin("google", ...)', () => {
    attachStep1();
    document.getElementById('btn-google')!.click();
    expect(mockOauthLogin).toHaveBeenCalledWith('google', expect.any(String));
  });
});

describe('attachStep1 — Apple button calls oauthLogin', () => {
  it('TC2: clicking Apple calls oauthLogin("apple", ...)', () => {
    attachStep1();
    document.getElementById('btn-apple')!.click();
    expect(mockOauthLogin).toHaveBeenCalledWith('apple', expect.any(String));
  });
});

describe('attachStep1 — email next shows error when email empty', () => {
  it('TC3: clicking email next with no email shows error', async () => {
    mockValidatePasswordComplexity.mockReturnValue(null);
    mockCheckHIBP.mockResolvedValue(false);
    attachStep1();
    (document.getElementById('signup-email') as HTMLInputElement).value = '';
    document.getElementById('btn-email-next')!.click();
    await Promise.resolve();
    expect(mockShowMsg).toHaveBeenCalledWith('step1-msg', expect.stringContaining('email'), 'error');
  });
});

describe('attachStep1 — email next shows password error on complexity failure', () => {
  it('TC4: shows complexity error when validatePasswordComplexity returns message', async () => {
    mockValidatePasswordComplexity.mockReturnValue('Password needs uppercase');
    attachStep1();
    (document.getElementById('signup-email') as HTMLInputElement).value = 'test@example.com';
    (document.getElementById('signup-password') as HTMLInputElement).value = 'weakpass';
    document.getElementById('btn-email-next')!.click();
    await Promise.resolve();
    expect(mockShowMsg).toHaveBeenCalledWith('step1-msg', 'Password needs uppercase', 'error');
  });
});

describe('attachStep1 — email next shows error for pwned password', () => {
  it('TC5: shows pwned password error when checkHIBP returns true', async () => {
    mockValidatePasswordComplexity.mockReturnValue(null);
    mockCheckHIBP.mockResolvedValue(true);
    attachStep1();
    (document.getElementById('signup-email') as HTMLInputElement).value = 'test@example.com';
    (document.getElementById('signup-password') as HTMLInputElement).value = 'ValidPass1!';
    document.getElementById('btn-email-next')!.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockShowMsg).toHaveBeenCalledWith('step1-msg', expect.stringContaining('breach'), 'error');
  });
});

describe('attachStep1 — email next advances to step 2 on valid input', () => {
  it('TC6: calls goToStep(2) when email and password are valid and not pwned', async () => {
    mockValidatePasswordComplexity.mockReturnValue(null);
    mockCheckHIBP.mockResolvedValue(false);
    attachStep1();
    (document.getElementById('signup-email') as HTMLInputElement).value = 'test@example.com';
    (document.getElementById('signup-password') as HTMLInputElement).value = 'ValidPass1!';
    document.getElementById('btn-email-next')!.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockGoToStep).toHaveBeenCalledWith(2);
  });
});

describe('ARCH — src/pages/plinko-step1-method.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './plinko-helpers.ts',
      './plinko-password.ts',
      './plinko-state.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/plinko-step1-method.ts'),
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
