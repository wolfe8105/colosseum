/**
 * Tests for src/pages/login.forms.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockLogIn = vi.hoisted(() => vi.fn());
const mockSignUp = vi.hoisted(() => vi.fn());
const mockIsAnyPlaceholder = vi.hoisted(() => false);

vi.mock('../src/auth.ts', () => ({
  logIn: mockLogIn,
  signUp: mockSignUp,
}));

vi.mock('../src/config.ts', () => ({
  get isAnyPlaceholder() { return mockIsAnyPlaceholder; },
}));

// Build DOM before module loads (module-level querySelector runs at load)
document.body.innerHTML = `
  <div id="login-msg" class="form-msg"></div>
  <div id="signup-msg" class="form-msg"></div>
  <form id="form-login">
    <input id="login-email" value="" />
    <input id="login-password" value="" />
    <button id="login-btn" type="submit">ENTER THE ARENA</button>
  </form>
  <form id="form-signup">
    <input id="signup-username" value="" />
    <input id="signup-email" value="" />
    <input id="signup-password" value="" />
    <select id="dob-month"><option value="6">June</option></select>
    <select id="dob-day"><option value="15">15</option></select>
    <select id="dob-year"><option value="1990">1990</option></select>
    <input type="checkbox" id="tos-check" />
    <button id="signup-btn" type="submit">CREATE ACCOUNT</button>
  </form>
  <button class="login-tab" data-tab="login">Login</button>
  <button class="login-tab" data-tab="signup">Sign Up</button>
  <div id="form-login" class="login-form"></div>
  <div id="form-signup-tab" class="login-form"></div>
`;

import {
  showMsg, clearMsg,
  loginAttempts, MAX_ATTEMPTS, LOCKOUT_MS,
  checkRateLimit, recordFailedAttempt,
  wireLoginForm, wireSignupForm,
  isPlaceholderMode,
} from '../src/pages/login.forms.ts';

beforeEach(() => {
  vi.clearAllMocks();
  // Reset rate limit state
  loginAttempts.count = 0;
  loginAttempts.lastAttempt = 0;
  loginAttempts.lockedUntil = 0;
  // Reset form elements
  (document.getElementById('login-email') as HTMLInputElement).value = '';
  (document.getElementById('login-password') as HTMLInputElement).value = '';
  (document.getElementById('login-btn') as HTMLButtonElement).disabled = false;
  (document.getElementById('login-btn') as HTMLButtonElement).textContent = 'ENTER THE ARENA';
  (document.getElementById('signup-username') as HTMLInputElement).value = '';
  (document.getElementById('signup-email') as HTMLInputElement).value = '';
  (document.getElementById('signup-password') as HTMLInputElement).value = '';
  (document.getElementById('tos-check') as HTMLInputElement).checked = false;
  document.getElementById('login-msg')!.textContent = '';
  document.getElementById('login-msg')!.className = 'form-msg';
  document.getElementById('signup-msg')!.textContent = '';
  document.getElementById('signup-msg')!.className = 'form-msg';
});

describe('showMsg — sets class and text', () => {
  it('TC1: sets error class and text', () => {
    showMsg('login-msg', 'Bad login', 'error');
    const el = document.getElementById('login-msg')!;
    expect(el.className).toBe('form-msg error');
    expect(el.textContent).toBe('Bad login');
  });

  it('TC2: sets success class and text', () => {
    showMsg('login-msg', 'Welcome!', 'success');
    expect(document.getElementById('login-msg')!.className).toBe('form-msg success');
  });

  it('TC3: no-ops when element not found', () => {
    expect(() => showMsg('nonexistent', 'text', 'error')).not.toThrow();
  });
});

describe('clearMsg — resets class and text', () => {
  it('TC4: resets className and textContent', () => {
    showMsg('login-msg', 'Error', 'error');
    clearMsg('login-msg');
    const el = document.getElementById('login-msg')!;
    expect(el.className).toBe('form-msg');
    expect(el.textContent).toBe('');
  });
});

describe('checkRateLimit — allows when count is low', () => {
  it('TC5: returns allowed:true when no lockout', () => {
    const result = checkRateLimit();
    expect(result.allowed).toBe(true);
  });
});

describe('checkRateLimit — blocks when locked out', () => {
  it('TC6: returns allowed:false with message when lockedUntil is in the future', () => {
    loginAttempts.lockedUntil = Date.now() + 30000;
    const result = checkRateLimit();
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('Try again');
  });
});

describe('recordFailedAttempt — increments count', () => {
  it('TC7: increments count on each call', () => {
    recordFailedAttempt();
    expect(loginAttempts.count).toBe(1);
  });

  it('TC8: sets lockedUntil after MAX_ATTEMPTS', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) recordFailedAttempt();
    expect(loginAttempts.lockedUntil).toBeGreaterThan(Date.now());
    expect(loginAttempts.count).toBe(0);
  });
});

describe('wireLoginForm — empty fields shows error', () => {
  it('TC9: submit with empty email shows error message', async () => {
    wireLoginForm(() => '/index.html', false);
    document.getElementById('form-login')!.dispatchEvent(new Event('submit', { bubbles: true }));
    await Promise.resolve();
    expect(document.getElementById('login-msg')!.textContent).toContain('fill in all fields');
  });
});

describe('wireLoginForm — calls logIn on valid submit', () => {
  it('TC10: calls logIn with email and password', async () => {
    mockLogIn.mockResolvedValue({ success: true });
    wireLoginForm(() => '/index.html', false);
    (document.getElementById('login-email') as HTMLInputElement).value = 'user@example.com';
    (document.getElementById('login-password') as HTMLInputElement).value = 'password123';
    document.getElementById('form-login')!.dispatchEvent(new Event('submit', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    expect(mockLogIn).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password123' });
  });
});

describe('wireLoginForm — shows error on login failure', () => {
  it('TC11: shows error message when logIn returns !success', async () => {
    mockLogIn.mockResolvedValue({ success: false, error: 'Invalid credentials' });
    wireLoginForm(() => '/index.html', false);
    (document.getElementById('login-email') as HTMLInputElement).value = 'user@example.com';
    (document.getElementById('login-password') as HTMLInputElement).value = 'password123';
    document.getElementById('form-login')!.dispatchEvent(new Event('submit', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.getElementById('login-msg')!.textContent).toContain('Invalid credentials');
  });
});

describe('wireSignupForm — validates required fields', () => {
  it('TC12: submit with missing fields shows error', async () => {
    wireSignupForm(() => '/index.html', false);
    document.getElementById('form-signup')!.dispatchEvent(new Event('submit', { bubbles: true }));
    await Promise.resolve();
    expect(document.getElementById('signup-msg')!.textContent).toContain('fill in all fields');
  });
});

describe('wireSignupForm — validates username format', () => {
  it('TC13: username with special chars shows error', async () => {
    wireSignupForm(() => '/index.html', false);
    (document.getElementById('signup-username') as HTMLInputElement).value = 'bad user!';
    (document.getElementById('signup-email') as HTMLInputElement).value = 'a@b.com';
    (document.getElementById('signup-password') as HTMLInputElement).value = 'password123';
    (document.getElementById('tos-check') as HTMLInputElement).checked = true;
    document.getElementById('form-signup')!.dispatchEvent(new Event('submit', { bubbles: true }));
    await Promise.resolve();
    expect(document.getElementById('signup-msg')!.textContent).toContain('letters, numbers');
  });
});

describe('wireSignupForm — calls signUp on valid submit', () => {
  it('TC14: calls signUp with all required fields', async () => {
    mockSignUp.mockResolvedValue({ success: true });
    wireSignupForm(() => '/index.html', false);
    (document.getElementById('signup-username') as HTMLInputElement).value = 'gladiator1';
    (document.getElementById('signup-email') as HTMLInputElement).value = 'user@example.com';
    (document.getElementById('signup-password') as HTMLInputElement).value = 'password123';
    (document.getElementById('tos-check') as HTMLInputElement).checked = true;
    document.getElementById('form-signup')!.dispatchEvent(new Event('submit', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    expect(mockSignUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'user@example.com',
      username: 'gladiator1',
    }));
  });
});

describe('isPlaceholderMode — exported constant', () => {
  it('TC15: isPlaceholderMode is a boolean', () => {
    expect(typeof isPlaceholderMode).toBe('boolean');
  });
});

describe('ARCH — src/pages/login.forms.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../config.ts', './login.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/login.forms.ts'),
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
