/**
 * plinko-auth-return.ts — OAuth + email-confirmation return handlers.
 */

import { getCurrentUser, getSupabaseClient } from '../auth.ts';
import { isAnyPlaceholder } from '../config.ts';
import { goToStep } from './plinko-helpers.ts';
import { set_signupMethod } from './plinko-state.ts';

const isPlaceholder = isAnyPlaceholder;

/**
 * Restore the default step-5 "YOU'RE IN" UI after email confirmation.
 * LM-PLINKO-003 resolution: dedups two byte-identical blocks that were previously inlined
 * in both the onAuthStateChange handler and the hash-based handler.
 */
function restoreStep5UI(): void {
  const title = document.querySelector('#step-5 .step-title');
  if (title) title.textContent = "YOU'RE IN";
  const enterBtn = document.getElementById('btn-enter');
  if (enterBtn) enterBtn.style.display = '';
  const resendBtn = document.getElementById('btn-resend-email');
  if (resendBtn) resendBtn.style.display = 'none';
}

// LANDMINE [LM-PLINKO-004]: the `ready.then(...)` already-logged-in redirect in the orchestrator
// runs in parallel with the onAuthStateChange SIGNED_IN handler registered here. If a user is
// already signed in AND an INITIAL_SESSION event fires shortly after, both paths race — one
// redirects to getReturnTo(), the other advances to step 2. Verify intent; may be benign if
// the redirect always wins.
export function attachAuthReturnHandler(): void {
  const supabaseClient = getSupabaseClient() as { auth: { onAuthStateChange: (cb: (event: string, session: { user?: unknown } | null) => void) => void } } | null;

  if (!isPlaceholder && supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event: string, session: { user?: unknown } | null) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const hash = window.location.hash;

        // Email confirmation return — skip mod step (step 5 = YOU'RE IN)
        if (hash && (hash.includes('type=signup') || hash.includes('type=email'))) {
          const welcome = document.getElementById('welcome-text');
          if (welcome) welcome.textContent = 'Email confirmed! Welcome to the arena.';
          restoreStep5UI();
          // SESSION 64: Clear hash to remove tokens from URL
          if (window.history?.replaceState) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
          goToStep(5);
          return;
        }

        // OAuth return — complete profile
        set_signupMethod('oauth');
        goToStep(2);
      }
    });
  }

  // Handle hash-based auth callbacks
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const params = new URLSearchParams(hash.substring(1));
    const type = params.get('type');
    if (type === 'signup' || type === 'email') {
      // SESSION 64: Verify real session before showing confirmation
      const hasRealSession = !!getCurrentUser();
      if (hasRealSession) {
        const welcome = document.getElementById('welcome-text');
        if (welcome) welcome.textContent = 'Email confirmed! Welcome to the arena.';
        restoreStep5UI();
        goToStep(5);
      }
    }
    // SESSION 64: Clear hash immediately — tokens in URL leak via Referer
    if (window.history?.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }
}
