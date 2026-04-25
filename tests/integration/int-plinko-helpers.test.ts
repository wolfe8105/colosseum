/**
 * int-plinko-helpers.test.ts
 * Seam #172 | src/pages/plinko-helpers.ts → plinko-state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// plinko-helpers has top-level DOM side-effects (populating dob-day / dob-year selects).
// We must set up those elements in the DOM before each dynamic import.

function buildDOM() {
  document.body.innerHTML = `
    <div id="progress" style="width:0%"></div>
    <div class="plinko-step" id="step-1"></div>
    <div class="plinko-step" id="step-2"></div>
    <div class="plinko-step" id="step-3"></div>
    <div class="plinko-step" id="step-4"></div>
    <div class="plinko-step" id="step-5"></div>
    <select id="dob-day"></select>
    <select id="dob-month"></select>
    <select id="dob-year"></select>
    <div id="msg-test" class="form-msg"></div>
  `;
}

// ─── TC1: updateProgress sets #progress width from currentStep/TOTAL_STEPS ─────────

describe('TC1: updateProgress reflects currentStep/TOTAL_STEPS', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    buildDOM();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets #progress width to (currentStep/TOTAL_STEPS)*100%', async () => {
    const state = await import('../../src/pages/plinko-state.ts');
    state.set_currentStep(2);
    const { updateProgress } = await import('../../src/pages/plinko-helpers.ts');
    updateProgress();
    const bar = document.getElementById('progress') as HTMLElement;
    // currentStep=2, TOTAL_STEPS=5 → 40%
    expect(bar.style.width).toBe('40%');
  });
});

// ─── TC2: goToStep adds/removes .active and updates state ────────────────────────

describe('TC2: goToStep activates correct step panel and updates state', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    buildDOM();
    // Pre-activate step-1 to confirm removal
    document.getElementById('step-1')!.classList.add('active');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('removes active from all steps and adds to target step', async () => {
    const state = await import('../../src/pages/plinko-state.ts');
    const { goToStep } = await import('../../src/pages/plinko-helpers.ts');
    goToStep(3);
    expect(document.getElementById('step-1')!.classList.contains('active')).toBe(false);
    expect(document.getElementById('step-3')!.classList.contains('active')).toBe(true);
    expect(state.currentStep).toBe(3);
  });

  it('updates #progress bar after goToStep', async () => {
    const { goToStep } = await import('../../src/pages/plinko-helpers.ts');
    goToStep(5);
    const bar = document.getElementById('progress') as HTMLElement;
    // currentStep=5, TOTAL_STEPS=5 → 100%
    expect(bar.style.width).toBe('100%');
  });
});

// ─── TC3: goToStep(5) activates step-5 panel (invite nudge fires async) ─────────

describe('TC3: goToStep(5) activates step-5 and does not throw', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    buildDOM();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('activates step-5 panel and sets state without error', async () => {
    // Stub the invite nudge module so the dynamic import resolves cleanly
    vi.doMock('../../src/pages/plinko-invite-nudge.ts', () => ({
      injectInviteNudge: vi.fn().mockResolvedValue(undefined),
    }));
    const state = await import('../../src/pages/plinko-state.ts');
    const { goToStep } = await import('../../src/pages/plinko-helpers.ts');
    goToStep(5);
    expect(document.getElementById('step-5')!.classList.contains('active')).toBe(true);
    expect(state.currentStep).toBe(5);
    // Flush microtasks so the dynamic import promise settles without timing out
    await vi.advanceTimersByTimeAsync(0);
  });
});

// ─── TC4: showMsg sets className and textContent ─────────────────────────────────

describe('TC4: showMsg populates message element', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    buildDOM();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets className to form-msg success and textContent', async () => {
    const { showMsg } = await import('../../src/pages/plinko-helpers.ts');
    showMsg('msg-test', 'All good!', 'success');
    const el = document.getElementById('msg-test')!;
    expect(el.className).toBe('form-msg success');
    expect(el.textContent).toBe('All good!');
  });

  it('sets className to form-msg error and textContent', async () => {
    const { showMsg } = await import('../../src/pages/plinko-helpers.ts');
    showMsg('msg-test', 'Something went wrong', 'error');
    const el = document.getElementById('msg-test')!;
    expect(el.className).toBe('form-msg error');
    expect(el.textContent).toBe('Something went wrong');
  });

  it('does nothing when element does not exist', async () => {
    const { showMsg } = await import('../../src/pages/plinko-helpers.ts');
    expect(() => showMsg('nonexistent-id', 'hello', 'success')).not.toThrow();
  });
});

// ─── TC5: clearMsg resets className and textContent ──────────────────────────────

describe('TC5: clearMsg resets message element', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    buildDOM();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resets className to form-msg and empties textContent', async () => {
    const { showMsg, clearMsg } = await import('../../src/pages/plinko-helpers.ts');
    showMsg('msg-test', 'error happened', 'error');
    clearMsg('msg-test');
    const el = document.getElementById('msg-test')!;
    expect(el.className).toBe('form-msg');
    expect(el.textContent).toBe('');
  });
});

// ─── TC6: getAge calculates age correctly with leap/overflow clamping ─────────────

describe('TC6: getAge computes correct integer age', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    buildDOM();
    // Fix "today" to 2026-04-25 for deterministic assertions
    vi.setSystemTime(new Date('2026-04-25T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns correct age for a birthday already passed this year', async () => {
    const { getAge } = await import('../../src/pages/plinko-helpers.ts');
    // Born 2000-03-10 → turned 26 in March 2026
    expect(getAge(3, 10, 2000)).toBe(26);
  });

  it('returns correct age for a birthday not yet reached this year', async () => {
    const { getAge } = await import('../../src/pages/plinko-helpers.ts');
    // Born 2000-06-15 → still 25 in April 2026
    expect(getAge(6, 15, 2000)).toBe(25);
  });

  it('clamps Feb 31 to Feb 28 without rolling into March', async () => {
    const { getAge } = await import('../../src/pages/plinko-helpers.ts');
    // Feb 31 should clamp to Feb 28 — still treated as a February birthday
    // Born 2000-02-31 (clamped to 2000-02-28) → already turned 26 in Feb 2026
    const age = getAge(2, 31, 2000);
    expect(age).toBe(26);
  });

  it('returns 13 for a user who just crossed the age gate', async () => {
    const { getAge } = await import('../../src/pages/plinko-helpers.ts');
    // Born 2013-03-01 → 13 in April 2026
    expect(getAge(3, 1, 2013)).toBe(13);
  });
});

// ─── TC7: getReturnTo validates and sanitises returnTo param ──────────────────────

describe('TC7: getReturnTo validates returnTo query param', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    buildDOM();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Reset location
    window.history.replaceState({}, '', '/');
  });

  it('returns default when no returnTo param', async () => {
    window.history.replaceState({}, '', '/moderator-plinko.html');
    const { getReturnTo } = await import('../../src/pages/plinko-helpers.ts');
    expect(getReturnTo()).toBe('index.html?screen=arena');
  });

  it('returns valid relative path', async () => {
    window.history.replaceState({}, '', '/moderator-plinko.html?returnTo=/moderator-settings.html');
    const { getReturnTo } = await import('../../src/pages/plinko-helpers.ts');
    expect(getReturnTo()).toBe('/moderator-settings.html');
  });

  it('blocks double-slash open redirect', async () => {
    window.history.replaceState({}, '', '/moderator-plinko.html?returnTo=//evil.com');
    const { getReturnTo } = await import('../../src/pages/plinko-helpers.ts');
    expect(getReturnTo()).toBe('index.html?screen=arena');
  });

  it('blocks backslash in returnTo', async () => {
    window.history.replaceState({}, '', '/moderator-plinko.html?returnTo=/foo\\bar');
    const { getReturnTo } = await import('../../src/pages/plinko-helpers.ts');
    expect(getReturnTo()).toBe('index.html?screen=arena');
  });

  it('blocks non-relative path (no leading slash)', async () => {
    window.history.replaceState({}, '', '/moderator-plinko.html?returnTo=http://evil.com');
    const { getReturnTo } = await import('../../src/pages/plinko-helpers.ts');
    expect(getReturnTo()).toBe('index.html?screen=arena');
  });
});

// ─── TC8: DOB select population at module eval ───────────────────────────────────

describe('TC8: DOB select options populated at module load', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    buildDOM();
    vi.setSystemTime(new Date('2026-04-25T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('populates #dob-day with 31 options', async () => {
    await import('../../src/pages/plinko-helpers.ts');
    const daySelect = document.getElementById('dob-day') as HTMLSelectElement;
    expect(daySelect.options.length).toBe(31);
    expect(daySelect.options[0].value).toBe('1');
    expect(daySelect.options[30].value).toBe('31');
  });

  it('populates #dob-year with 90 options starting from currentYear-10', async () => {
    await import('../../src/pages/plinko-helpers.ts');
    const yearSelect = document.getElementById('dob-year') as HTMLSelectElement;
    // currentYear=2026, from 2016 down to 1926 = 91 options
    expect(yearSelect.options.length).toBe(91);
    expect(yearSelect.options[0].value).toBe('2016');
    expect(yearSelect.options[yearSelect.options.length - 1].value).toBe('1926');
  });
});

// ─── ARCH: import lines filter check ─────────────────────────────────────────────

describe('ARCH: plinko-helpers.ts only imports from plinko-state (seam #172)', () => {
  it('all import lines are from expected modules', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve(__dirname, '../../src/pages/plinko-helpers.ts');
    const source: string = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    for (const line of importLines) {
      // Dynamic import of plinko-invite-nudge is allowed (no wall imports)
      const isAllowed =
        line.includes('plinko-state') ||
        line.includes('plinko-invite-nudge');
      expect(isAllowed, `Unexpected import: ${line.trim()}`).toBe(true);
    }
  });
});
