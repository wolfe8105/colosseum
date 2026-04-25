// ============================================================
// SETTINGS HELPERS — tests/settings-helpers.test.ts
// Source: src/pages/settings.helpers.ts
//
// CLASSIFICATION:
//   VALID_TIERS   — Constant data → value test
//   TIER_LABELS   — Constant data → value test
//   toast()       — DOM event wiring + setTimeout → Behavioral test
//   getEl()       — Behavioral: DOM query → Behavioral test
//   getChecked()  — Behavioral: DOM query → Behavioral test
//   setChecked()  — DOM event wiring → Behavioral test
//   validateTier() — Pure calculation → Unit test
//
// IMPORTS: none — zero external dependencies.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  VALID_TIERS,
  TIER_LABELS,
  toast,
  getEl,
  getChecked,
  setChecked,
  validateTier,
} from '../src/pages/settings.helpers.ts';

beforeEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

// ── VALID_TIERS ───────────────────────────────────────────────

describe('TC1 — VALID_TIERS: contains all 4 expected tiers', () => {
  it('has free, contender, champion, creator', () => {
    expect(VALID_TIERS).toContain('free');
    expect(VALID_TIERS).toContain('contender');
    expect(VALID_TIERS).toContain('champion');
    expect(VALID_TIERS).toContain('creator');
    expect(VALID_TIERS).toHaveLength(4);
  });
});

// ── TIER_LABELS ───────────────────────────────────────────────

describe('TC2 — TIER_LABELS: every tier has a non-empty label', () => {
  it('each VALID_TIER maps to an uppercase non-empty string', () => {
    for (const tier of VALID_TIERS) {
      expect(typeof TIER_LABELS[tier]).toBe('string');
      expect(TIER_LABELS[tier].length).toBeGreaterThan(0);
      expect(TIER_LABELS[tier]).toBe(TIER_LABELS[tier].toUpperCase());
    }
  });
});

// ── validateTier ──────────────────────────────────────────────

describe('TC3 — validateTier: valid tiers pass through', () => {
  it('returns each valid tier unchanged', () => {
    expect(validateTier('free')).toBe('free');
    expect(validateTier('contender')).toBe('contender');
    expect(validateTier('champion')).toBe('champion');
    expect(validateTier('creator')).toBe('creator');
  });
});

describe('TC4 — validateTier: invalid tier falls back to "free"', () => {
  it('returns "free" for unknown tier strings', () => {
    expect(validateTier('admin')).toBe('free');
    expect(validateTier('')).toBe('free');
    expect(validateTier(undefined)).toBe('free');
  });
});

// ── getEl ─────────────────────────────────────────────────────

describe('TC5 — getEl: returns element when it exists', () => {
  it('finds an element by ID', () => {
    const el = document.createElement('div');
    el.id = 'test-el';
    document.body.appendChild(el);

    expect(getEl('test-el')).toBe(el);
  });
});

describe('TC6 — getEl: returns null when element does not exist', () => {
  it('returns null for missing ID', () => {
    expect(getEl('missing-id')).toBeNull();
  });
});

// ── getChecked / setChecked ───────────────────────────────────

describe('TC7 — getChecked: returns false for unchecked checkbox', () => {
  it('returns false for an unchecked input', () => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'cb-test';
    input.checked = false;
    document.body.appendChild(input);

    expect(getChecked('cb-test')).toBe(false);
  });
});

describe('TC8 — getChecked: returns true for checked checkbox', () => {
  it('returns true for a checked input', () => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'cb-checked';
    input.checked = true;
    document.body.appendChild(input);

    expect(getChecked('cb-checked')).toBe(true);
  });
});

describe('TC9 — getChecked: returns false for missing element', () => {
  it('returns false when element does not exist', () => {
    expect(getChecked('nonexistent-cb')).toBe(false);
  });
});

describe('TC10 — setChecked: sets checkbox to true', () => {
  it('sets checked = true on the target input', () => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'cb-set';
    input.checked = false;
    document.body.appendChild(input);

    setChecked('cb-set', true);
    expect(input.checked).toBe(true);
  });
});

describe('TC11 — setChecked: sets checkbox to false', () => {
  it('sets checked = false on the target input', () => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'cb-unset';
    input.checked = true;
    document.body.appendChild(input);

    setChecked('cb-unset', false);
    expect(input.checked).toBe(false);
  });
});

describe('TC12 — setChecked: no-op when element missing', () => {
  it('does not throw when target element is missing', () => {
    expect(() => setChecked('ghost-id', true)).not.toThrow();
  });
});

// ── toast ─────────────────────────────────────────────────────

describe('TC13 — toast: sets textContent and adds "show" class', () => {
  it('updates toast element text and makes it visible', () => {
    const toastEl = document.createElement('div');
    toastEl.id = 'toast';
    document.body.appendChild(toastEl);
    vi.useFakeTimers();

    toast('Test message');

    expect(toastEl.textContent).toBe('Test message');
    expect(toastEl.classList.contains('show')).toBe(true);
  });
});

describe('TC14 — toast: removes "show" class after 2500ms', () => {
  it('hides toast after 2500ms', () => {
    const toastEl = document.createElement('div');
    toastEl.id = 'toast';
    document.body.appendChild(toastEl);
    vi.useFakeTimers();

    toast('Disappear me');
    vi.advanceTimersByTime(2500);

    expect(toastEl.classList.contains('show')).toBe(false);
  });
});

describe('TC15 — toast: no-op when toast element missing', () => {
  it('does not throw when #toast is absent', () => {
    expect(() => toast('oops')).not.toThrow();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/pages/settings.helpers.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed: string[] = [];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/settings.helpers.ts'),
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
