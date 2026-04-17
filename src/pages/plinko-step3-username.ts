/**
 * plinko-step3-username.ts — Step 3: username/display name.
 * Two branches: email signup (signUp RPC) and OAuth (update_profile + set_profile_dob).
 */

import { signUp, getSupabaseClient, safeRpc } from '../auth.ts';
import { isAnyPlaceholder } from '../config.ts';
import { nudge } from '../nudge.ts';
import { clearMsg, goToStep, showMsg } from './plinko-helpers.ts';
import {
  signupMethod, signupEmail, signupPassword, signupDob,
  set_signupEmail, set_signupPassword,
} from './plinko-state.ts';

const isPlaceholder = isAnyPlaceholder;

export function attachStep3(): void {
  document.getElementById('btn-create')?.addEventListener('click', async () => {
    clearMsg('step3-msg');
    const username = (document.getElementById('signup-username') as HTMLInputElement | null)?.value.trim() ?? '';
    const displayName = (document.getElementById('signup-display') as HTMLInputElement | null)?.value.trim() || username;

    if (!username || username.length < 3 || username.length > 20) {
      showMsg('step3-msg', 'Username must be 3-20 characters.', 'error'); return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      showMsg('step3-msg', 'Letters, numbers, and underscores only.', 'error'); return;
    }

    if (isPlaceholder) {
      showMsg('step3-msg', 'Demo mode — account created!', 'success');
      setTimeout(() => goToStep(5), 600);
      return;
    }

    const btn = document.getElementById('btn-create') as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = 'CREATING...'; }

    try {
      if (signupMethod === 'email') {
        if (!signupEmail || !signupPassword) {
          showMsg('step3-msg', 'Session expired. Please start over.', 'error');
          if (btn) { btn.disabled = false; btn.textContent = 'CREATE ACCOUNT'; }
          setTimeout(() => goToStep(1), 1500);
          return;
        }

        const result = await signUp({
          email: signupEmail,
          password: signupPassword,
          username,
          displayName,
          dob: signupDob,
        });

        if (!result.success) {
          const err = result.error ?? 'Signup failed.';
          // Layer 3: If password-related error slipped past client validation,
          // show clean message and send user back to step 1 where the password field is
          if (err.toLowerCase().includes('password')) {
            showMsg('step1-msg', 'Please choose a stronger password.', 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'CREATE ACCOUNT'; }
            goToStep(1);
            return;
          }
          showMsg('step3-msg', err, 'error');
          if (btn) { btn.disabled = false; btn.textContent = 'CREATE ACCOUNT'; }
          return;
        }

        // Clear credentials from memory after confirmed success
        set_signupPassword('');
        set_signupEmail('');

        // Email signup: check if Supabase returned a session
        // If Confirm email is enabled, session is null — user must confirm first
        if (!result.session) {
          // No session — skip step 4 (mod opt-in RPC would fail without auth)
          // Modify step 5 for email confirmation flow
          const title = document.querySelector('#step-5 .step-title');
          if (title) title.textContent = 'CHECK YOUR EMAIL';

          const welcome = document.getElementById('welcome-text');
          const emailForDisplay = (document.getElementById('signup-email') as HTMLInputElement | null)?.value.trim() ?? 'your email';
          if (welcome) welcome.textContent = 'We sent a confirmation link to ' + emailForDisplay + '. Click the link to activate your account.';

          // Hide ENTER button — user has no session, arena would bounce them
          const enterBtn = document.getElementById('btn-enter');
          if (enterBtn) enterBtn.style.display = 'none';

          // Add resend button if not already present
          if (!document.getElementById('btn-resend-email')) {
            const step5 = document.getElementById('step-5');
            if (step5) {
              const resendBtn = document.createElement('button');
              resendBtn.type = 'button';
              resendBtn.className = 'btn-primary';
              resendBtn.id = 'btn-resend-email';
              resendBtn.style.marginTop = '12px';
              resendBtn.textContent = 'RESEND CONFIRMATION EMAIL';
              resendBtn.addEventListener('click', async () => {
                const resendEmail = (document.getElementById('signup-email') as HTMLInputElement | null)?.value.trim() ?? '';
                if (!resendEmail) return;
                resendBtn.disabled = true;
                resendBtn.textContent = 'SENDING...';
                try {
                  // LANDMINE [LM-PLINKO-002]: only `as any` in this file. Everything else uses shaped
                  // type assertions. Replace with a proper shape in a follow-up.
                  const sbClient = getSupabaseClient() as any;
                  if (sbClient) {
                    const { error: resendError } = await sbClient.auth.resend({
                      type: 'signup',
                      email: resendEmail,
                    });
                    if (resendError) throw resendError;
                    resendBtn.textContent = 'EMAIL SENT ✓';
                    setTimeout(() => { resendBtn.disabled = false; resendBtn.textContent = 'RESEND CONFIRMATION EMAIL'; }, 30000);
                  }
                } catch {
                  resendBtn.disabled = false;
                  resendBtn.textContent = 'RESEND CONFIRMATION EMAIL';
                  const w = document.getElementById('welcome-text');
                  if (w) w.textContent = 'Could not resend. Try again in a moment.';
                }
              });
              step5.appendChild(resendBtn);
            }
          }

          goToStep(5);
        } else {
          // Session exists (email confirmation disabled or auto-confirmed) — normal flow
          const welcome = document.getElementById('welcome-text');
          if (welcome) welcome.textContent = 'Welcome to the arena, ' + displayName + '. Check your email to confirm your account.';
          goToStep(4);
        }

      } else if (signupMethod === 'oauth') {
        // OAuth user returned — update their profile with username/dob
        const supabaseClient = getSupabaseClient() as { rpc: (fn: string, args: Record<string, string>) => Promise<unknown> } | null;
        if (supabaseClient) {
          try {
            await safeRpc('update_profile', {
              p_display_name: displayName,
              p_username: username,
            });
          } catch { /* non-critical */ }

          // SESSION 134: Write DOB to profiles via RPC (OAuth bypasses signUp metadata)
          if (signupDob) {
            try {
              await safeRpc('set_profile_dob', { p_dob: signupDob });
            } catch { /* non-critical — DOB missing is better than blocking signup */ }
          }
        }

        const welcome = document.getElementById('welcome-text');
        if (welcome) welcome.textContent = 'Welcome to the arena, ' + displayName + '!';
        nudge('first_signup', '🎉 Welcome to the arena. Your journey starts now.', 'success');
        // F-36: Day 1 — showed up
        import('../onboarding-drip.ts').then(({ triggerDripDay }) => triggerDripDay(1)).catch(() => {});
        goToStep(4);
      } else {
        showMsg('step3-msg', 'Session expired. Please start over.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'CREATE ACCOUNT'; }
        setTimeout(() => goToStep(1), 1500);
        return;
      }
    } catch {
      // SESSION 64: Clear credentials on error path too
      set_signupPassword('');
      set_signupEmail('');
      showMsg('step3-msg', 'Something went wrong. Try again.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'CREATE ACCOUNT'; }
    }
  });
}
