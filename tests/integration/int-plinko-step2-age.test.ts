// ============================================================
// INTEGRATOR — plinko-step2-age + plinko-helpers
// Seam #309: plinko-step2-age.ts → plinko-helpers
// Boundary: clearMsg, getAge, goToStep, showMsg from helpers.
//           Pure DOM validation — no Supabase calls in step2.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// DOM HELPERS
// ============================================================

function buildStep2DOM(): void {
  document.body.innerHTML = `
    <div id="step-1" class="plinko-step"></div>
    <div id="step-2" class="plinko-step active">
      <div id="step2-msg" class="form-msg"></div>
      <select id="dob-month">
        <option value="">--</option>
        <option value="1">January</option>
        <option value="6">June</option>
        <option value="12">December</option>
      </select>
      <select id="dob-day">
        <option value="">--</option>
        <option value="1">1</option>
        <option value="15">15</option>
      </select>
      <select id="dob-year">
        <option value="">--</option>
        <option value="2015">2015</option>
        <option value="2000">2000</option>
        <option value="1990">1990</option>
      </select>
      <input id="tos-check" type="checkbox" />
      <button id="btn-age-next" type="button">NEXT</button>
    </div>
    <div id="step-3" class="plinko-step"></div>
    <div id="step-4" class="plinko-step"></div>
    <div id="step-5" class="plinko-step"></div>
    <div id="progress" style="width:0%"></div>
  `;
}

// ============================================================
// ARCH FILTER — TC0
// ============================================================

describe('TC0 — ARCH: plinko-step2-age.ts import boundaries', () => {
  it('imports from plinko-helpers and no banned heavy deps', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/plinko-step2-age.ts'),
      'utf-8',
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));

    const banned = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const dep of banned) {
      expect(importLines.some(l => l.includes(dep))).toBe(false);
    }

    expect(importLines.some(l => l.includes('plinko-helpers'))).toBe(true);
  });
});

// ============================================================
// beforeEach
// ============================================================

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  buildStep2DOM();
});

// ============================================================
// TC1 — Missing DOB fields shows error, no navigation
// ============================================================

describe('TC1 — missing DOB: showMsg fires error, step-3 stays inactive', () => {
  it('shows "Please enter your date of birth" when fields are empty', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    (document.getElementById('tos-check') as HTMLInputElement).checked = true;
    // Leave selects at empty default

    const { attachStep2 } = await import('../../src/pages/plinko-step2-age.ts');
    attachStep2();

    document.getElementById('btn-age-next')!.click();
    await vi.advanceTimersByTimeAsync(50);

    const msg = document.getElementById('step2-msg');
    expect(msg?.textContent).toContain('Please enter your date of birth');
    expect(msg?.className).toContain('error');

    const step3 = document.getElementById('step-3');
    expect(step3?.classList.contains('active')).toBe(false);
  });
});

// ============================================================
// TC2 — TOS not checked shows error
// ============================================================

describe('TC2 — TOS unchecked: showMsg fires error', () => {
  it('shows "You must agree to the Terms of Service" when TOS unchecked', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    (document.getElementById('dob-month') as HTMLSelectElement).value = '6';
    (document.getElementById('dob-day') as HTMLSelectElement).value = '15';
    (document.getElementById('dob-year') as HTMLSelectElement).value = '2000';
    (document.getElementById('tos-check') as HTMLInputElement).checked = false;

    const { attachStep2 } = await import('../../src/pages/plinko-step2-age.ts');
    attachStep2();

    document.getElementById('btn-age-next')!.click();
    await vi.advanceTimersByTimeAsync(50);

    const msg = document.getElementById('step2-msg');
    expect(msg?.textContent).toContain('Terms of Service');
    expect(msg?.className).toContain('error');
  });
});

// ============================================================
// TC3 — Under-13 DOB shows age gate error, stays on step 2
// ============================================================

describe('TC3 — under-13 age gate: showMsg fires error, no navigation', () => {
  it('shows "at least 13 years old" for a user born in 2015', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    (document.getElementById('dob-month') as HTMLSelectElement).value = '1';
    (document.getElementById('dob-day') as HTMLSelectElement).value = '1';
    (document.getElementById('dob-year') as HTMLSelectElement).value = '2015';
    (document.getElementById('tos-check') as HTMLInputElement).checked = true;

    const { attachStep2 } = await import('../../src/pages/plinko-step2-age.ts');
    attachStep2();

    document.getElementById('btn-age-next')!.click();
    await vi.advanceTimersByTimeAsync(50);

    const msg = document.getElementById('step2-msg');
    expect(msg?.textContent).toContain('at least 13 years old');
    expect(msg?.className).toContain('error');

    const step3 = document.getElementById('step-3');
    expect(step3?.classList.contains('active')).toBe(false);
  });
});

// ============================================================
// TC4 — Valid adult DOB + TOS → goToStep(3) and sets signupDob
// ============================================================

describe('TC4 — valid adult DOB + TOS: goToStep(3) and signupDob set', () => {
  it('step-3 becomes active and signupDob matches formatted DOB', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    (document.getElementById('dob-month') as HTMLSelectElement).value = '6';
    (document.getElementById('dob-day') as HTMLSelectElement).value = '15';
    (document.getElementById('dob-year') as HTMLSelectElement).value = '2000';
    (document.getElementById('tos-check') as HTMLInputElement).checked = true;

    const state = await import('../../src/pages/plinko-state.ts');
    const { attachStep2 } = await import('../../src/pages/plinko-step2-age.ts');
    attachStep2();

    document.getElementById('btn-age-next')!.click();
    await vi.advanceTimersByTimeAsync(50);

    const step3 = document.getElementById('step-3');
    expect(step3?.classList.contains('active')).toBe(true);

    // signupDob is YYYY-MM-DD
    expect(state.signupDob).toBe('2000-06-15');

    // No RPC calls — step2 is purely client-side
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC5 — getAge clamping: Feb 31 does not overflow into March
// ============================================================

describe('TC5 — getAge clamping: Feb 31 clamps to Feb 28/29 correctly', () => {
  it('getAge returns a sane value for day=31, month=2', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { getAge } = await import('../../src/pages/plinko-helpers.ts');
    // Feb 31 1990 — should be treated as Feb 28 1990 (1990 not a leap year)
    const age = getAge(2, 31, 1990);
    expect(age).toBeGreaterThanOrEqual(34);
    expect(age).toBeLessThanOrEqual(37); // reasonable range relative to 2026
  });
});

// ============================================================
// SEAM #364 — plinko-step2-age → plinko-state
// Boundary: set_signupDob + set_isMinor called with correct values.
// ============================================================

// TC6 — ARCH: plinko-step2-age imports plinko-state
describe('TC6 (Seam #364) — ARCH: plinko-step2-age imports plinko-state', () => {
  it('import list includes plinko-state and no banned wall deps', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/plinko-step2-age.ts'),
      'utf-8',
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    expect(importLines.some((l: string) => l.includes('plinko-state'))).toBe(true);
    for (const dep of ['webrtc', 'feed-room', 'deepgram', 'voicememo', 'arena-css', 'arena-sounds', 'peermetrics']) {
      expect(importLines.some((l: string) => l.includes(dep))).toBe(false);
    }
  });
});

// TC7 — isMinor set true for a 16-year-old (under 18)
describe('TC7 (Seam #364) — set_isMinor(true) for 16-year-old valid DOB', () => {
  it('plinko-state.isMinor is true when user is 16', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // 16-year-old: born 2010-06-15 (as of 2026)
    (document.getElementById('dob-month') as HTMLSelectElement).value = '6';
    (document.getElementById('dob-day') as HTMLSelectElement).value = '15';
    // Add 2010 option to the DOM year select for this test
    const yearSelect = document.getElementById('dob-year') as HTMLSelectElement;
    const opt = document.createElement('option');
    opt.value = '2010';
    opt.textContent = '2010';
    yearSelect.appendChild(opt);
    yearSelect.value = '2010';
    (document.getElementById('tos-check') as HTMLInputElement).checked = true;

    const state = await import('../../src/pages/plinko-state.ts');
    const { attachStep2 } = await import('../../src/pages/plinko-step2-age.ts');
    attachStep2();

    document.getElementById('btn-age-next')!.click();
    await vi.advanceTimersByTimeAsync(50);

    // 16 >= 13 so step proceeds
    const step3 = document.getElementById('step-3');
    expect(step3?.classList.contains('active')).toBe(true);
    expect(state.isMinor).toBe(true);
  });
});

// TC8 — isMinor set false for a 30-year-old (over 18)
describe('TC8 (Seam #364) — set_isMinor(false) for 30-year-old valid DOB', () => {
  it('plinko-state.isMinor is false when user is 30', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    (document.getElementById('dob-month') as HTMLSelectElement).value = '6';
    (document.getElementById('dob-day') as HTMLSelectElement).value = '15';
    (document.getElementById('dob-year') as HTMLSelectElement).value = '1990';
    (document.getElementById('tos-check') as HTMLInputElement).checked = true;

    const state = await import('../../src/pages/plinko-state.ts');
    const { attachStep2 } = await import('../../src/pages/plinko-step2-age.ts');
    attachStep2();

    document.getElementById('btn-age-next')!.click();
    await vi.advanceTimersByTimeAsync(50);

    expect(state.isMinor).toBe(false);
    expect(state.signupDob).toBe('1990-06-15');
  });
});

// TC9 — signupDob format is YYYY-MM-DD with zero-padded month and day
describe('TC9 (Seam #364) — signupDob format: single-digit month/day zero-padded', () => {
  it('signupDob is "2000-01-01" when month=1, day=1, year=2000', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    (document.getElementById('dob-month') as HTMLSelectElement).value = '1';
    (document.getElementById('dob-day') as HTMLSelectElement).value = '1';
    (document.getElementById('dob-year') as HTMLSelectElement).value = '2000';
    (document.getElementById('tos-check') as HTMLInputElement).checked = true;

    const state = await import('../../src/pages/plinko-state.ts');
    const { attachStep2 } = await import('../../src/pages/plinko-step2-age.ts');
    attachStep2();

    document.getElementById('btn-age-next')!.click();
    await vi.advanceTimersByTimeAsync(50);

    expect(state.signupDob).toBe('2000-01-01');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// TC10 — under-13 does not set signupDob or isMinor
describe('TC10 (Seam #364) — under-13 blocks navigation without mutating plinko-state', () => {
  it('signupDob remains empty and isMinor remains false on age-gate rejection', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Seed known initial state
    const state = await import('../../src/pages/plinko-state.ts');
    state.set_signupDob('');
    state.set_isMinor(false);

    (document.getElementById('dob-month') as HTMLSelectElement).value = '1';
    (document.getElementById('dob-day') as HTMLSelectElement).value = '1';
    (document.getElementById('dob-year') as HTMLSelectElement).value = '2015';
    (document.getElementById('tos-check') as HTMLInputElement).checked = true;

    const { attachStep2 } = await import('../../src/pages/plinko-step2-age.ts');
    attachStep2();

    document.getElementById('btn-age-next')!.click();
    await vi.advanceTimersByTimeAsync(50);

    // State NOT mutated on rejection
    expect(state.signupDob).toBe('');
    expect(state.isMinor).toBe(false);
  });
});
