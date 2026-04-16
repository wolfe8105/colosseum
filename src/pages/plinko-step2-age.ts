/**
 * plinko-step2-age.ts — Step 2: DOB + age gate + TOS.
 */

import { clearMsg, getAge, goToStep, showMsg } from './plinko-helpers.ts';
import { set_isMinor, set_signupDob } from './plinko-state.ts';

export function attachStep2(): void {
  document.getElementById('btn-age-next')?.addEventListener('click', () => {
    clearMsg('step2-msg');
    const month = (document.getElementById('dob-month') as HTMLSelectElement | null)?.value ?? '';
    const day = (document.getElementById('dob-day') as HTMLSelectElement | null)?.value ?? '';
    const year = (document.getElementById('dob-year') as HTMLSelectElement | null)?.value ?? '';
    const tos = (document.getElementById('tos-check') as HTMLInputElement | null)?.checked ?? false;

    if (!month || !day || !year) { showMsg('step2-msg', 'Please enter your date of birth.', 'error'); return; }
    if (!tos) { showMsg('step2-msg', 'You must agree to the Terms of Service.', 'error'); return; }

    const age = getAge(Number.parseInt(month), Number.parseInt(day), Number.parseInt(year));
    if (age < 13) {
      showMsg('step2-msg', 'You must be at least 13 years old to use The Moderator.', 'error');
      return;
    }

    set_signupDob(`${year}-${String(Number.parseInt(month)).padStart(2, '0')}-${String(Number.parseInt(day)).padStart(2, '0')}`);
    set_isMinor(age < 18);
    goToStep(3);
  });
}
