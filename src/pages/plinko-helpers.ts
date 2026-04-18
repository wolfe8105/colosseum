/**
 * plinko-helpers.ts — Shared utilities + DOB select population.
 */

import { currentStep, TOTAL_STEPS, set_currentStep } from './plinko-state.ts';

/** Return destination — SESSION 50 Bug 3 fix, SESSION 64 backslash fix */
export function getReturnTo(): string {
  const params = new URLSearchParams(window.location.search);
  const dest = params.get('returnTo');
  if (dest && dest.startsWith('/') && !dest.startsWith('//') && !dest.includes('\\')) return dest;
  return 'index.html?screen=arena';
}

export function updateProgress(): void {
  const bar = document.getElementById('progress');
  if (bar) bar.style.width = ((currentStep) / TOTAL_STEPS) * 100 + '%';
}

export function goToStep(n: number): void {
  document.querySelectorAll('.plinko-step').forEach(s => s.classList.remove('active'));
  const step = document.getElementById('step-' + n);
  if (step) step.classList.add('active');
  set_currentStep(n);
  updateProgress();

  // F-59: On step-5, fetch & show invite link nudge.
  // Dynamic import preserves dependency direction (invite-nudge is downstream of helpers).
  if (n === 5) {
    void import('./plinko-invite-nudge.ts').then(m => m.injectInviteNudge()).catch(e => console.error('[plinko]', e));
  }
}

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

export function getAge(month: number, day: number, year: number): number {
  const today = new Date();
  // Clamp day to the actual last day of the given month to prevent silent Date overflow
  // (e.g. Feb 31 rolling into March, which can mis-gate the 13-year-old age check)
  const lastDay = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(day, lastDay);
  const birth = new Date(year, month - 1, clampedDay);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ============================================================
// DOB SELECT POPULATION (runs once at module eval, after body parse)
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
