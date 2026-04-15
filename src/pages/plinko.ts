/**
 * THE MODERATOR — Plinko Gate Orchestrator (TypeScript)
 *
 * Linear 5-step signup: OAuth/Email → Age Gate → Username → Mod Opt-in → Enter.
 *
 * Migration: Session 128 (Phase 4)
 * Session 134: OAuth path now calls set_profile_dob RPC (DOB-in-JWT fix)
 */

import { getCurrentUser, ready } from '../auth.ts';
import { isAnyPlaceholder } from '../config.ts';
import { getReturnTo, updateProgress } from './plinko-helpers.ts';
import { attachStep1 } from './plinko-step1-method.ts';
import { attachStep2 } from './plinko-step2-age.ts';
import { attachStep3 } from './plinko-step3-username.ts';
import { attachStep4, attachStep5 } from './plinko-step4-step5.ts';
import { attachAuthReturnHandler } from './plinko-auth-return.ts';

const isPlaceholder: boolean = isAnyPlaceholder;

if (isPlaceholder) {
  const banner = document.getElementById('placeholder-banner');
  if (banner) banner.style.display = 'block';
}

window.addEventListener('DOMContentLoaded', () => {
  updateProgress();
  attachStep1();
  attachStep2();
  attachStep3();
  attachStep4();
  attachStep5();
  attachAuthReturnHandler();

  // If already logged in, go straight to app
  // SESSION 63: Use readyPromise so INITIAL_SESSION has time to fire.
  ready.then(() => {
    if (getCurrentUser() && !isPlaceholder) {
      window.location.href = getReturnTo();
    }
  });
});
