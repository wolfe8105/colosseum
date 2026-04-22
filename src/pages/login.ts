/**
 * THE MODERATOR — Login Page Controller (TypeScript)
 *
 * Extracted from moderator-login.html inline script.
 * OAuth-dominant login, email collapsed behind toggle, password reset modal.
 *
 * Migration: Session 128 (Phase 4). Refactored Session 254
 * (types → login.types.ts, forms → login.forms.ts).
 */

// ES imports (replaces window globals)
import { oauthLogin, resetPassword, updatePassword, getCurrentUser, getSupabaseClient, ready } from '../auth.ts';
import { isAnyPlaceholder } from '../config.ts';
import { showMsg, clearMsg, wireLoginForm, wireSignupForm } from './login.forms.ts';

// ============================================================
// INIT
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

// Wire login and signup forms (forms module needs getReturnTo and isPlaceholder)
wireLoginForm(getReturnTo, isPlaceholder);
wireSignupForm(getReturnTo, isPlaceholder);

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
  if (btn?.disabled) return;
  if (btn) { btn.disabled = true; btn.textContent = 'UPDATING...'; }

  try {
    const result = await updatePassword(pw);
    if (!result.success) {
      showMsg('newpw-msg', result.error ?? 'Could not update password.', 'error');
    } else {
      showMsg('newpw-msg', '✅ Password updated! Entering the arena...', 'success');
      setTimeout(() => { window.location.href = getReturnTo(); }, 1200);
    }
  } catch {
    showMsg('newpw-msg', 'Something went wrong. Try again.', 'error');
  } finally {
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

// Keep clearMsg accessible if needed
void clearMsg;
