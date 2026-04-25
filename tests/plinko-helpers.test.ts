// ============================================================
// PLINKO HELPERS — tests/plinko-helpers.test.ts
// Source: src/pages/plinko-helpers.ts
//
// CLASSIFICATION:
//   getReturnTo()   — Behavioral: reads window.location.search → Behavioral test
//   updateProgress() — DOM event wiring → Behavioral test
//   goToStep()      — Multi-step orchestration (DOM + state) → Integration test
//   showMsg()       — DOM event wiring → Behavioral test
//   clearMsg()      — DOM event wiring → Behavioral test
//   getAge()        — Pure calculation → Unit test
//
// IMPORTS:
//   { currentStep, TOTAL_STEPS, set_currentStep } from './plinko-state.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetCurrentStep = vi.hoisted(() => vi.fn());
const mockCurrentStep = vi.hoisted(() => ({ value: 1 }));

vi.mock('../src/pages/plinko-state.ts', () => ({
  get currentStep() { return mockCurrentStep.value; },
  TOTAL_STEPS: 5,
  set_currentStep: mockSetCurrentStep,
  signupMethod: null,
  signupEmail: '',
  set_signupMethod: vi.fn(),
  set_signupEmail: vi.fn(),
}));

import {
  getReturnTo,
  updateProgress,
  goToStep,
  showMsg,
  clearMsg,
  getAge,
} from '../src/pages/plinko-helpers.ts';

beforeEach(() => {
  document.body.innerHTML = '';
  mockSetCurrentStep.mockReset();
  mockCurrentStep.value = 1;
});

// ── getReturnTo ───────────────────────────────────────────────

describe('TC1 — getReturnTo: returns default when no returnTo param', () => {
  it('returns "index.html?screen=arena" when location has no returnTo', () => {
    // Default jsdom URL is about:blank with no search params
    const result = getReturnTo();
    expect(result).toBe('index.html?screen=arena');
  });
});

describe('TC2 — getReturnTo: accepts a safe relative path', () => {
  it('returns the returnTo value for a valid path starting with /', () => {
    const origLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { search: '?returnTo=/arena' },
      configurable: true,
    });

    const result = getReturnTo();
    expect(result).toBe('/arena');

    Object.defineProperty(window, 'location', {
      value: origLocation,
      configurable: true,
    });
  });
});

describe('TC3 — getReturnTo: rejects double-slash paths', () => {
  it('returns default for paths starting with //', () => {
    const origLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { search: '?returnTo=//evil.com' },
      configurable: true,
    });

    const result = getReturnTo();
    expect(result).toBe('index.html?screen=arena');

    Object.defineProperty(window, 'location', {
      value: origLocation,
      configurable: true,
    });
  });
});

describe('TC4 — getReturnTo: rejects paths with backslash', () => {
  it('returns default for paths containing backslash', () => {
    const origLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { search: '?returnTo=/path\\evil' },
      configurable: true,
    });

    const result = getReturnTo();
    expect(result).toBe('index.html?screen=arena');

    Object.defineProperty(window, 'location', {
      value: origLocation,
      configurable: true,
    });
  });
});

// ── updateProgress ────────────────────────────────────────────

describe('TC5 — updateProgress: sets progress bar width', () => {
  it('sets #progress width proportional to currentStep / TOTAL_STEPS', () => {
    const bar = document.createElement('div');
    bar.id = 'progress';
    document.body.appendChild(bar);

    mockCurrentStep.value = 2;
    updateProgress();

    expect(bar.style.width).toBe('40%'); // (2/5)*100 = 40
  });
});

describe('TC6 — updateProgress: no-op when #progress element missing', () => {
  it('does not throw when #progress is absent', () => {
    expect(() => updateProgress()).not.toThrow();
  });
});

// ── goToStep ──────────────────────────────────────────────────

describe('TC7 — goToStep: activates the target step element', () => {
  it('adds "active" class to #step-N', () => {
    const step2 = document.createElement('div');
    step2.id = 'step-2';
    step2.classList.add('plinko-step');
    document.body.appendChild(step2);

    const progress = document.createElement('div');
    progress.id = 'progress';
    document.body.appendChild(progress);

    goToStep(2);

    expect(step2.classList.contains('active')).toBe(true);
  });
});

describe('TC8 — goToStep: calls set_currentStep (import contract)', () => {
  it('set_currentStep is called with the step number', () => {
    const progress = document.createElement('div');
    progress.id = 'progress';
    document.body.appendChild(progress);

    goToStep(3);

    expect(mockSetCurrentStep).toHaveBeenCalledWith(3);
  });
});

describe('TC9 — goToStep: removes active from other steps', () => {
  it('removes active class from previously active steps', () => {
    const step1 = document.createElement('div');
    step1.id = 'step-1';
    step1.classList.add('plinko-step', 'active');
    const step2 = document.createElement('div');
    step2.id = 'step-2';
    step2.classList.add('plinko-step');
    const progress = document.createElement('div');
    progress.id = 'progress';
    document.body.append(step1, step2, progress);

    goToStep(2);

    expect(step1.classList.contains('active')).toBe(false);
    expect(step2.classList.contains('active')).toBe(true);
  });
});

// ── showMsg ───────────────────────────────────────────────────

describe('TC10 — showMsg: sets className and textContent', () => {
  it('updates element class and text for "success" type', () => {
    const el = document.createElement('div');
    el.id = 'msg-el';
    document.body.appendChild(el);

    showMsg('msg-el', 'All good!', 'success');

    expect(el.className).toBe('form-msg success');
    expect(el.textContent).toBe('All good!');
  });
});

describe('TC11 — showMsg: sets error class for "error" type', () => {
  it('applies form-msg error class for error type', () => {
    const el = document.createElement('div');
    el.id = 'err-el';
    document.body.appendChild(el);

    showMsg('err-el', 'Something went wrong', 'error');

    expect(el.className).toBe('form-msg error');
  });
});

describe('TC12 — showMsg: no-op when element missing', () => {
  it('does not throw when element is not found', () => {
    expect(() => showMsg('ghost', 'text', 'success')).not.toThrow();
  });
});

// ── clearMsg ──────────────────────────────────────────────────

describe('TC13 — clearMsg: resets className and textContent', () => {
  it('sets class to "form-msg" and clears text', () => {
    const el = document.createElement('div');
    el.id = 'clear-el';
    el.className = 'form-msg error';
    el.textContent = 'Old error';
    document.body.appendChild(el);

    clearMsg('clear-el');

    expect(el.className).toBe('form-msg');
    expect(el.textContent).toBe('');
  });
});

describe('TC14 — clearMsg: no-op when element missing', () => {
  it('does not throw when element is not found', () => {
    expect(() => clearMsg('missing')).not.toThrow();
  });
});

// ── getAge ────────────────────────────────────────────────────

describe('TC15 — getAge: correct age for today birthdate (happy path)', () => {
  it('returns correct age for a birthday from 25 years ago today', () => {
    const today = new Date();
    const age = getAge(today.getMonth() + 1, today.getDate(), today.getFullYear() - 25);
    expect(age).toBe(25);
  });
});

describe('TC16 — getAge: birthday not yet reached this year', () => {
  it('returns one less year when birthday is in the future this year', () => {
    const today = new Date();
    // Birthday is one day after today, 18 years ago
    const future = new Date(today);
    future.setDate(future.getDate() + 1);
    const age = getAge(future.getMonth() + 1, future.getDate(), today.getFullYear() - 18);
    expect(age).toBe(17);
  });
});

describe('TC17 — getAge: Feb 31 clamps to Feb 28/29', () => {
  it('does not throw for invalid day 31 in February', () => {
    expect(() => getAge(2, 31, 2000)).not.toThrow();
    const age = getAge(2, 31, 2000);
    expect(typeof age).toBe('number');
  });
});

describe('TC18 — getAge: returns non-negative integer', () => {
  it('returns a non-negative number for valid birthdate', () => {
    const age = getAge(1, 15, 1990);
    expect(age).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(age)).toBe(true);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/pages/plinko-helpers.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./plinko-state.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/plinko-helpers.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
