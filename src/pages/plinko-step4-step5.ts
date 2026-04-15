/**
 * plinko-step4-step5.ts — Step 4: moderator opt-in. Step 5: enter.
 */

import { toggleModerator } from '../auth.ts';
import { getReturnTo, goToStep } from './plinko-helpers.ts';

export function attachStep4(): void {
  document.getElementById('btn-enable-mod')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-enable-mod') as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = 'ENABLING...'; }
    try {
      await toggleModerator(true);
    } catch { /* non-critical — proceed to step 5 regardless */ }
    goToStep(5);
  });

  document.getElementById('btn-skip-mod')?.addEventListener('click', () => {
    goToStep(5);
  });
}

export function attachStep5(): void {
  document.getElementById('btn-enter')?.addEventListener('click', () => {
    window.location.href = getReturnTo();
  });
}
