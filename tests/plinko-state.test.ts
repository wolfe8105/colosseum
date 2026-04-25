import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  TOTAL_STEPS,
  set_currentStep,
  set_signupMethod,
  set_signupEmail,
  set_signupPassword,
  set_signupDob,
  set_isMinor,
} from '../src/pages/plinko-state.ts';

// ── TOTAL_STEPS constant ───────────────────────────────────────

describe('TC1 — TOTAL_STEPS is 5', () => {
  it('TOTAL_STEPS equals 5', () => {
    expect(TOTAL_STEPS).toBe(5);
  });
});

// ── set_currentStep ────────────────────────────────────────────

describe('TC2 — set_currentStep updates currentStep', () => {
  it('currentStep is updated after set_currentStep', async () => {
    set_currentStep(3);
    const mod = await import('../src/pages/plinko-state.ts');
    expect(mod.currentStep).toBe(3);
  });
});

// ── set_signupMethod ───────────────────────────────────────────

describe('TC3 — set_signupMethod updates signupMethod', () => {
  it('signupMethod becomes "oauth" after set_signupMethod', async () => {
    set_signupMethod('oauth');
    const mod = await import('../src/pages/plinko-state.ts');
    expect(mod.signupMethod).toBe('oauth');
  });

  it('signupMethod becomes null after set_signupMethod(null)', async () => {
    set_signupMethod(null);
    const mod = await import('../src/pages/plinko-state.ts');
    expect(mod.signupMethod).toBeNull();
  });
});

// ── set_signupEmail ────────────────────────────────────────────

describe('TC4 — set_signupEmail updates signupEmail', () => {
  it('signupEmail is updated after set_signupEmail', async () => {
    set_signupEmail('test@example.com');
    const mod = await import('../src/pages/plinko-state.ts');
    expect(mod.signupEmail).toBe('test@example.com');
  });
});

// ── set_signupPassword ─────────────────────────────────────────

describe('TC5 — set_signupPassword updates signupPassword', () => {
  it('signupPassword is updated after set_signupPassword', async () => {
    set_signupPassword('hunter2');
    const mod = await import('../src/pages/plinko-state.ts');
    expect(mod.signupPassword).toBe('hunter2');
  });
});

// ── set_signupDob ──────────────────────────────────────────────

describe('TC6 — set_signupDob updates signupDob', () => {
  it('signupDob is updated after set_signupDob', async () => {
    set_signupDob('2000-01-15');
    const mod = await import('../src/pages/plinko-state.ts');
    expect(mod.signupDob).toBe('2000-01-15');
  });
});

// ── set_isMinor ────────────────────────────────────────────────

describe('TC7 — set_isMinor updates isMinor', () => {
  it('isMinor becomes true after set_isMinor(true)', async () => {
    set_isMinor(true);
    const mod = await import('../src/pages/plinko-state.ts');
    expect(mod.isMinor).toBe(true);
  });

  it('isMinor becomes false after set_isMinor(false)', async () => {
    set_isMinor(false);
    const mod = await import('../src/pages/plinko-state.ts');
    expect(mod.isMinor).toBe(false);
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — plinko-state.ts has no non-type imports', () => {
  it('only has type imports (no runtime imports from other modules)', () => {
    const source = readFileSync(
      resolve(__dirname, '../src/pages/plinko-state.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import ') && !line.includes('import type'));
    expect(importLines).toHaveLength(0);
  });
});
