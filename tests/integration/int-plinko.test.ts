/**
 * Integration tests: src/pages/plinko.ts → plinko-helpers
 * Seam #380
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @supabase/supabase-js only
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

// ── helpers ──────────────────────────────────────────────────────────────────

function setWindowLocation(search: string) {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { search, href: '' },
  });
}

function makeDomEnv() {
  document.body.innerHTML = `
    <div id="progress" style="width:0%"></div>
    <div class="plinko-step active" id="step-1"></div>
    <div class="plinko-step" id="step-2"></div>
    <div class="plinko-step" id="step-3"></div>
    <div id="step-4"></div>
    <div id="step-5"></div>
    <select id="dob-day"></select>
    <select id="dob-year"></select>
    <div id="test-msg" class="form-msg"></div>
  `;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('plinko-helpers — getReturnTo', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    makeDomEnv();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('TC1: returns the returnTo param when it is a safe relative path', async () => {
    setWindowLocation('?returnTo=/dashboard');
    vi.resetModules();
    const { getReturnTo } = await import('../../src/pages/plinko-helpers.ts');
    expect(getReturnTo()).toBe('/dashboard');
  });

  it('TC2: returns default when no returnTo param is present', async () => {
    setWindowLocation('');
    vi.resetModules();
    const { getReturnTo } = await import('../../src/pages/plinko-helpers.ts');
    expect(getReturnTo()).toBe('index.html?screen=arena');
  });

  it('TC3: rejects double-slash open-redirect and returns default', async () => {
    setWindowLocation('?returnTo=//evil.com/steal');
    vi.resetModules();
    const { getReturnTo } = await import('../../src/pages/plinko-helpers.ts');
    expect(getReturnTo()).toBe('index.html?screen=arena');
  });

  it('TC4: rejects backslash in returnTo and returns default', async () => {
    setWindowLocation('?returnTo=/foo\\bar');
    vi.resetModules();
    const { getReturnTo } = await import('../../src/pages/plinko-helpers.ts');
    expect(getReturnTo()).toBe('index.html?screen=arena');
  });
});

describe('plinko-helpers — updateProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    makeDomEnv();
    setWindowLocation('');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('TC5: updateProgress sets #progress bar width based on currentStep/TOTAL_STEPS', async () => {
    vi.resetModules();
    const state = await import('../../src/pages/plinko-state.ts');
    state.set_currentStep(2);
    const { updateProgress } = await import('../../src/pages/plinko-helpers.ts');
    updateProgress();
    const bar = document.getElementById('progress') as HTMLDivElement;
    // currentStep=2, TOTAL_STEPS=5 → 40%
    expect(bar.style.width).toBe('40%');
  });
});

describe('plinko-helpers — goToStep', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    makeDomEnv();
    setWindowLocation('');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('TC6: goToStep(2) removes active from step-1 and adds it to step-2', async () => {
    vi.resetModules();
    const { goToStep } = await import('../../src/pages/plinko-helpers.ts');
    goToStep(2);
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    expect(step1?.classList.contains('active')).toBe(false);
    expect(step2?.classList.contains('active')).toBe(true);
  });
});

describe('plinko-helpers — showMsg / clearMsg', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    makeDomEnv();
    setWindowLocation('');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('TC7: showMsg sets className and textContent on the target element', async () => {
    vi.resetModules();
    const { showMsg } = await import('../../src/pages/plinko-helpers.ts');
    showMsg('test-msg', 'Username taken', 'error');
    const el = document.getElementById('test-msg');
    expect(el?.className).toBe('form-msg error');
    expect(el?.textContent).toBe('Username taken');
  });

  it('TC8: clearMsg resets className and textContent', async () => {
    vi.resetModules();
    const { showMsg, clearMsg } = await import('../../src/pages/plinko-helpers.ts');
    showMsg('test-msg', 'Username taken', 'error');
    clearMsg('test-msg');
    const el = document.getElementById('test-msg');
    expect(el?.className).toBe('form-msg');
    expect(el?.textContent).toBe('');
  });
});

describe('plinko-helpers — getAge', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    makeDomEnv();
    setWindowLocation('');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('TC9: getAge clamps day overflow — Feb 31 should not roll into March', async () => {
    vi.resetModules();
    // Use a fixed "today" so the age calc is deterministic
    vi.setSystemTime(new Date('2026-04-25'));
    const { getAge } = await import('../../src/pages/plinko-helpers.ts');
    // Feb 31 for someone born in 2010 — clamped to Feb 28, age should be 16
    const age = getAge(2, 31, 2010);
    expect(age).toBe(16);
  });

  it('TC10: getAge returns correct age for straightforward birthday', async () => {
    vi.resetModules();
    vi.setSystemTime(new Date('2026-04-25'));
    const { getAge } = await import('../../src/pages/plinko-helpers.ts');
    // Born March 1, 2008 → age 18 (birthday already passed this year)
    const age = getAge(3, 1, 2008);
    expect(age).toBe(18);
  });
});
