/**
 * plinko-step1-method.ts — Step 1: OAuth + email method selection.
 */

import { oauthLogin } from '../auth.ts';
import { isAnyPlaceholder } from '../config.ts';
import { clearMsg, goToStep, showMsg } from './plinko-helpers.ts';
import { validatePasswordComplexity, checkHIBP } from './plinko-password.ts';
import { set_signupEmail, set_signupMethod, set_signupPassword } from './plinko-state.ts';

const isPlaceholder = isAnyPlaceholder;

function handleOAuth(provider: string): void {
  if (isPlaceholder) {
    showMsg('step1-msg', 'Demo mode — OAuth not available.', 'error');
    return;
  }
  set_signupMethod('oauth');
  oauthLogin(provider, window.location.href);
}

export function attachStep1(): void {
  document.getElementById('btn-google')?.addEventListener('click', () => handleOAuth('google'));
  document.getElementById('btn-apple')?.addEventListener('click', () => handleOAuth('apple'));

  document.getElementById('email-toggle')?.addEventListener('click', function (this: HTMLElement) {
    const fields = document.getElementById('email-fields');
    if (!fields) return;
    fields.classList.toggle('open');
    this.textContent = fields.classList.contains('open') ? 'Hide email signup ▴' : 'Use email instead ▾';
    if (fields.classList.contains('open')) {
      setTimeout(() => {
        document.getElementById('btn-email-next')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 350);
    }
  });

  document.getElementById('btn-email-next')?.addEventListener('click', async () => {
    clearMsg('step1-msg');
    const email = (document.getElementById('signup-email') as HTMLInputElement | null)?.value.trim() ?? '';
    const password = (document.getElementById('signup-password') as HTMLInputElement | null)?.value ?? '';

    if (!email) { showMsg('step1-msg', 'Please enter your email.', 'error'); return; }

    // Layer 1: Client-side complexity check (matches Supabase password rules)
    const complexityError = validatePasswordComplexity(password);
    if (complexityError) { showMsg('step1-msg', complexityError, 'error'); return; }

    // Layer 2: HIBP leaked password check (k-anonymity, 3s timeout, non-blocking on failure)
    const btn = document.getElementById('btn-email-next') as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = 'CHECKING...'; }

    const isPwned = await checkHIBP(password);
    if (isPwned) {
      showMsg('step1-msg', 'This password has appeared in a data breach. Please choose a different one.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'CONTINUE'; }
      return;
    }

    if (btn) { btn.disabled = false; btn.textContent = 'CONTINUE'; }

    set_signupMethod('email');
    set_signupEmail(email);
    set_signupPassword(password);
    goToStep(2);
  });
}
