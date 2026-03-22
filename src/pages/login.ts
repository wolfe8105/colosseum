/**
 * THE COLOSSEUM — Login Page Controller (TypeScript)
 *
 * Extracted from colosseum-login.html inline script.
 * OAuth-dominant login, email collapsed behind toggle, password reset modal.
 *
 * Migration: Session 128 (Phase 4)
 */

// ES imports (replaces window globals)
import { logIn, signUp, oauthLogin, resetPassword, updatePassword, getCurrentUser, getSupabaseClient, ready } from '../auth.ts';
import { isAnyPlaceholder } from '../config.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface RateLimitState {
  count: number;
  lastAttempt: number;
  lockedUntil: number;
}

interface RateLimitCheck {
  allowed: boolean;
  message?: string;
}

// ============================================================
// HELPERS
// ============================================================

const isPlaceholder: boolean = isAnyPlaceholder;

if (isPlaceholder) {
  const banner = document.getElementById('placeholder-banner');
  if (banner) banner.style.display = 'block';
}

/** Return destination — SESSION 50 Bug 3 fix, SESSION 64 backslash fix */
function getReturnTo(): string {
  const params = new URLSearchParams(window.location.search);
  const dest = params.get('returnTo');
  if (dest && dest.startsWith('/') && !dest.startsWith('//') && !dest.includes('\\')) return dest;
  return 'index.html?screen=arena';
}

function showMsg(id: string, text: string, type: 'success' | 'error'): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'form-msg ' + type;
  el.textContent = text;
}

function clearMsg(id: string): void {
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
// TAB SWITCHING
// ============================================================

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

// ============================================================
// RATE LIMITING (Item 14.4.1.16)
// ============================================================

const loginAttempts: RateLimitState = { count: 0, lastAttempt: 0, lockedUntil: 0 };
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60000;

function checkRateLimit(): RateLimitCheck {
  const now = Date.now();
  if (now < loginAttempts.lockedUntil) {
    const secsLeft = Math.ceil((loginAttempts.lockedUntil - now) / 1000);
    return { allowed: false, message: `Too many attempts. Try again in ${secsLeft}s.` };
  }
  if (now - loginAttempts.lastAttempt > 300000) { loginAttempts.count = 0; }
  return { allowed: true };
}

function recordFailedAttempt(): void {
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

// ============================================================
// SIGNUP FORM
// ============================================================

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

  const age = getAge(parseInt(month), parseInt(day), parseInt(year));
  if (age < 13) {
    showMsg('signup-msg', 'You must be at least 13 years old to use The Colosseum.', 'error'); return;
  }

  if (isPlaceholder) {
    showMsg('signup-msg', 'Demo mode — account created! Entering arena...', 'success');
    setTimeout(() => { window.location.href = getReturnTo(); }, 800);
    return;
  }

  const btn = document.getElementById('signup-btn') as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.textContent = 'CREATING...'; }

  try {
    const dob = `${year}-${String(parseInt(month)).padStart(2, '0')}-${String(parseInt(day)).padStart(2, '0')}`;
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

// ============================================================
// EMAIL SECTION TOGGLES
// ============================================================

document.getElementById('login-email-toggle')?.addEventListener('click', function (this: HTMLElement) {
  const section = document.getElementById('login-email-section');
  if (!section) return;
  section.classList.toggle('open');
  this.textContent = section.classList.contains('open') ? 'Hide email login ▴' : 'Use email instead ▾';
});

document.getElementById('signup-email-toggle')?.addEventListener('click', function (this: HTMLElement) {
  const section = document.getElementById('signup-email-section');
  if (!section) return;
  section.classList.toggle('open');
  this.textContent = section.classList.contains('open') ? 'Hide email signup ▴' : 'Use email instead ▾';
});

// ============================================================
// OAUTH
// ============================================================

function handleOAuth(provider: string): void {
  if (isPlaceholder) {
    const formActive = document.querySelector('.login-form.active');
    const msgId = formActive?.id === 'form-login' ? 'login-msg' : 'signup-msg';
    showMsg(msgId, `Demo mode — ${provider} OAuth not available without Supabase.`, 'error');
    return;
  }
  oauthLogin(provider);
}

document.getElementById('oauth-google')?.addEventListener('click', () => handleOAuth('google'));
document.getElementById('oauth-apple-login')?.addEventListener('click', () => handleOAuth('apple'));
document.getElementById('oauth-google-signup')?.addEventListener('click', () => handleOAuth('google'));
document.getElementById('oauth-apple-signup')?.addEventListener('click', () => handleOAuth('apple'));

// ============================================================
// PASSWORD RESET MODAL
// ============================================================

document.getElementById('forgot-link')?.addEventListener('click', (e: Event) => {
  e.preventDefault();
  document.getElementById('reset-modal')?.classList.add('open');
  const resetEmail = document.getElementById('reset-email') as HTMLInputElement | null;
  const loginEmail = document.getElementById('login-email') as HTMLInputElement | null;
  if (resetEmail && loginEmail) resetEmail.value = loginEmail.value;
});

document.getElementById('reset-close')?.addEventListener('click', () => {
  document.getElementById('reset-modal')?.classList.remove('open');
});

document.getElementById('reset-modal')?.addEventListener('click', (e: Event) => {
  if (e.target === e.currentTarget) (e.currentTarget as HTMLElement).classList.remove('open');
});

document.getElementById('reset-btn')?.addEventListener('click', async () => {
  const email = (document.getElementById('reset-email') as HTMLInputElement | null)?.value.trim() ?? '';
  if (!email) { showMsg('reset-msg', 'Enter your email.', 'error'); return; }
  if (isPlaceholder) { showMsg('reset-msg', 'Demo mode — no email sent.', 'error'); return; }

  try {
    await resetPassword(email);
    showMsg('reset-msg', 'Reset link sent! Check your inbox.', 'success');
  } catch {
    showMsg('reset-msg', 'Could not send reset link.', 'error');
  }
});

// ============================================================
// SET NEW PASSWORD
// ============================================================

document.getElementById('newpw-btn')?.addEventListener('click', async () => {
  const pw = (document.getElementById('newpw-password') as HTMLInputElement | null)?.value ?? '';
  const confirm = (document.getElementById('newpw-confirm') as HTMLInputElement | null)?.value ?? '';

  if (!pw || pw.length < 8) { showMsg('newpw-msg', 'Password must be at least 8 characters.', 'error'); return; }
  if (pw !== confirm) { showMsg('newpw-msg', 'Passwords do not match.', 'error'); return; }

  const btn = document.getElementById('newpw-btn') as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.textContent = 'UPDATING...'; }

  try {
    const result = await updatePassword(pw);
    if (!result.success) {
      showMsg('newpw-msg', result.error ?? 'Could not update password.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'UPDATE PASSWORD'; }
    } else {
      showMsg('newpw-msg', '✅ Password updated! Entering the arena...', 'success');
      setTimeout(() => { window.location.href = getReturnTo(); }, 1200);
    }
  } catch {
    showMsg('newpw-msg', 'Something went wrong. Try again.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'UPDATE PASSWORD'; }
  }
});

// ============================================================
// AUTH STATE + AUTO-REDIRECT
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
  const supabaseClient = getSupabaseClient() as { auth: { onAuthStateChange: (cb: (event: string, session: { user?: unknown } | null) => void) => void } } | null;

  if (!isPlaceholder && supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event: string, session: { user?: unknown } | null) => {
      if (event === 'PASSWORD_RECOVERY') {
        document.getElementById('newpw-modal')?.classList.add('open');
      } else if (event === 'SIGNED_IN' && session?.user) {
        const hash = window.location.hash;
        if (hash && (hash.includes('type=signup') || hash.includes('type=email'))) {
          showMsg('login-msg', '✅ Email confirmed! Entering the arena...', 'success');
          setTimeout(() => { window.location.href = getReturnTo(); }, 1200);
        }
      }
    });
  }

  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const params = new URLSearchParams(hash.substring(1));
    const type = params.get('type');
    if (type === 'signup' || type === 'email') {
      showMsg('login-msg', '✅ Email confirmed! Entering the arena...', 'success');
      setTimeout(() => { window.location.href = getReturnTo(); }, 1200);
      return;
    }
    if (type === 'recovery') return;
  }

  // SESSION 37: Await readyPromise so INITIAL_SESSION has time to fire.
  ready.then(() => {
    if (getCurrentUser() && !isPlaceholder) {
      window.location.href = getReturnTo();
    }
  });
});
