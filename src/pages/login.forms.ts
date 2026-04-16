/**
 * login.forms.ts — Login/Signup form logic
 * showMsg, clearMsg, getAge, DOB select population,
 * rate limiting, login form handler, signup form handler.
 * Extracted from login.ts (Session 254 track).
 */

import { logIn, signUp } from '../auth.ts';
import { isAnyPlaceholder } from '../config.ts';
import type { RateLimitState, RateLimitCheck } from './login.types.ts';

// ============================================================
// HELPERS
// ============================================================

export function showMsg(id: string, text: string, type: 'success' | 'error'): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'form-msg ' + type;
  el.textContent = text;
}

export function clearMsg(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'form-msg';
  el.textContent = '';
}

function getAge(month: number, day: number, year: number): number {
  const today = new Date();
  const birth = new Date(year, month - 1, day);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ============================================================
// DOB SELECT POPULATION
// ============================================================

const daySelect = document.getElementById('dob-day') as HTMLSelectElement | null;
if (daySelect) {
  for (let i = 1; i <= 31; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = String(i);
    daySelect.appendChild(opt);
  }
}

const yearSelect = document.getElementById('dob-year') as HTMLSelectElement | null;
if (yearSelect) {
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 10; y >= currentYear - 100; y--) {
    const opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = String(y);
    yearSelect.appendChild(opt);
  }
}

// ============================================================
// RATE LIMITING (Item 14.4.1.16)
// ============================================================

export const loginAttempts: RateLimitState = { count: 0, lastAttempt: 0, lockedUntil: 0 };
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 60000;

export function checkRateLimit(): RateLimitCheck {
  const now = Date.now();
  if (now < loginAttempts.lockedUntil) {
    const secsLeft = Math.ceil((loginAttempts.lockedUntil - now) / 1000);
    return { allowed: false, message: `Too many attempts. Try again in ${secsLeft}s.` };
  }
  if (now - loginAttempts.lastAttempt > 300000) { loginAttempts.count = 0; }
  return { allowed: true };
}

export function recordFailedAttempt(): void {
  loginAttempts.count++;
  loginAttempts.lastAttempt = Date.now();
  if (loginAttempts.count >= MAX_ATTEMPTS) {
    loginAttempts.lockedUntil = Date.now() + LOCKOUT_MS;
    loginAttempts.count = 0;
  }
}

// ============================================================
// LOGIN FORM
// ============================================================

// getReturnTo is defined in login.ts; we accept it as a param to avoid circular dep
export function wireLoginForm(getReturnTo: () => string, isPlaceholder: boolean): void {
  const loginForm = document.getElementById('form-login');
  loginForm?.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    clearMsg('login-msg');
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) { showMsg('login-msg', rateCheck.message ?? 'Rate limited.', 'error'); return; }

    const email = (document.getElementById('login-email') as HTMLInputElement | null)?.value.trim() ?? '';
    const password = (document.getElementById('login-password') as HTMLInputElement | null)?.value ?? '';
    if (!email || !password) { showMsg('login-msg', 'Please fill in all fields.', 'error'); return; }

    if (isPlaceholder) {
      showMsg('login-msg', 'Demo mode — entering the arena...', 'success');
      setTimeout(() => { window.location.href = getReturnTo(); }, 800);
      return;
    }

    const btn = document.getElementById('login-btn') as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = 'ENTERING...'; }

    try {
      const result = await logIn({ email, password });
      if (!result.success) {
        recordFailedAttempt();
        showMsg('login-msg', result.error ?? 'Login failed.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'ENTER THE ARENA'; }
      } else {
        showMsg('login-msg', 'Welcome back, gladiator.', 'success');
        setTimeout(() => { window.location.href = getReturnTo(); }, 600);
      }
    } catch {
      showMsg('login-msg', 'Something went wrong. Try again.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ENTER THE ARENA'; }
    }
  });
}

// ============================================================
// SIGNUP FORM
// ============================================================

export function wireSignupForm(getReturnTo: () => string, isPlaceholder: boolean): void {
  const signupForm = document.getElementById('form-signup');
  signupForm?.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    clearMsg('signup-msg');

    const username = (document.getElementById('signup-username') as HTMLInputElement | null)?.value.trim() ?? '';
    const email = (document.getElementById('signup-email') as HTMLInputElement | null)?.value.trim() ?? '';
    const password = (document.getElementById('signup-password') as HTMLInputElement | null)?.value ?? '';
    const month = (document.getElementById('dob-month') as HTMLSelectElement | null)?.value ?? '';
    const day = (document.getElementById('dob-day') as HTMLSelectElement | null)?.value ?? '';
    const year = (document.getElementById('dob-year') as HTMLSelectElement | null)?.value ?? '';
    const tos = (document.getElementById('tos-check') as HTMLInputElement | null)?.checked ?? false;

    if (!username || !email || !password || !month || !day || !year) {
      showMsg('signup-msg', 'Please fill in all fields.', 'error'); return;
    }
    if (username.length < 3 || username.length > 20) {
      showMsg('signup-msg', 'Username must be 3-20 characters.', 'error'); return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      showMsg('signup-msg', 'Username: letters, numbers, and underscores only.', 'error'); return;
    }
    if (password.length < 8) {
      showMsg('signup-msg', 'Password must be at least 8 characters.', 'error'); return;
    }
    if (!tos) {
      showMsg('signup-msg', 'You must agree to the Terms of Service.', 'error'); return;
    }

    const age = getAge(Number.parseInt(month), Number.parseInt(day), Number.parseInt(year));
    if (age < 13) {
      showMsg('signup-msg', 'You must be at least 13 years old to use The Moderator.', 'error'); return;
    }

    if (isPlaceholder) {
      showMsg('signup-msg', 'Demo mode — account created! Entering arena...', 'success');
      setTimeout(() => { window.location.href = getReturnTo(); }, 800);
      return;
    }

    const btn = document.getElementById('signup-btn') as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = 'CREATING...'; }

    try {
      const dob = `${year}-${String(Number.parseInt(month)).padStart(2, '0')}-${String(Number.parseInt(day)).padStart(2, '0')}`;
      const result = await signUp({ email, password, username, displayName: username, dob });

      if (!result.success) {
        showMsg('signup-msg', result.error ?? 'Signup failed.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'CREATE ACCOUNT'; }
      } else {
        showMsg('signup-msg', 'Account created! Check your email to confirm.', 'success');
        setTimeout(() => { window.location.href = getReturnTo(); }, 1200);
      }
    } catch {
      showMsg('signup-msg', 'Something went wrong. Try again.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'CREATE ACCOUNT'; }
    }
  });
}

// Wire tab switching (side-effectful init)
document.querySelectorAll('.login-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    const tabName = (tab as HTMLElement).dataset.tab;
    if (tabName) {
      const form = document.getElementById('form-' + tabName);
      if (form) form.classList.add('active');
    }
  });
});

// Expose isAnyPlaceholder for login.ts to use
export const isPlaceholderMode: boolean = isAnyPlaceholder;
