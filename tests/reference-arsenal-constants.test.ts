// ============================================================
// REFERENCE ARSENAL CONSTANTS — tests/reference-arsenal-constants.test.ts
// Source: src/reference-arsenal.constants.ts
//
// CLASSIFICATION: No runtime functions — constant data exports only.
// Tests verify shape and key values of the exported constants.
//
// IMPORTS:
//   import type { ... } from './reference-arsenal.types.ts' — type-only, no mock needed.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  SOURCE_TYPES,
  CATEGORIES,
  CATEGORY_LABELS,
  RARITY_COLORS,
  CHALLENGE_STATUS_LABELS,
} from '../src/reference-arsenal.constants.ts';

// ── SOURCE_TYPES ──────────────────────────────────────────────

describe('TC1 — SOURCE_TYPES: primary has highest ceiling (5)', () => {
  it('primary source type has ceiling 5', () => {
    expect(SOURCE_TYPES['primary'].ceiling).toBe(5);
  });
});

describe('TC2 — SOURCE_TYPES: all 5 source types present', () => {
  it('contains primary, academic, book, news, other', () => {
    const keys = Object.keys(SOURCE_TYPES);
    expect(keys).toContain('primary');
    expect(keys).toContain('academic');
    expect(keys).toContain('book');
    expect(keys).toContain('news');
    expect(keys).toContain('other');
    expect(keys).toHaveLength(5);
  });
});

describe('TC3 — SOURCE_TYPES: each entry has label, ceiling, tier', () => {
  it('every entry has all three required fields', () => {
    for (const [, val] of Object.entries(SOURCE_TYPES)) {
      expect(typeof val.label).toBe('string');
      expect(typeof val.ceiling).toBe('number');
      expect(typeof val.tier).toBe('string');
    }
  });
});

describe('TC4 — SOURCE_TYPES: ceilings descend from primary to news', () => {
  it('primary ceiling > academic ceiling > book ceiling >= news ceiling', () => {
    expect(SOURCE_TYPES['primary'].ceiling).toBeGreaterThan(SOURCE_TYPES['academic'].ceiling);
    expect(SOURCE_TYPES['academic'].ceiling).toBeGreaterThan(SOURCE_TYPES['book'].ceiling);
    expect(SOURCE_TYPES['book'].ceiling).toBeGreaterThanOrEqual(SOURCE_TYPES['news'].ceiling);
  });
});

// ── CATEGORIES ────────────────────────────────────────────────

describe('TC5 — CATEGORIES: is a non-empty array', () => {
  it('CATEGORIES has at least one entry', () => {
    expect(Array.isArray(CATEGORIES)).toBe(true);
    expect(CATEGORIES.length).toBeGreaterThan(0);
  });
});

describe('TC6 — CATEGORIES: contains politics and sports', () => {
  it('includes politics and sports', () => {
    expect(CATEGORIES).toContain('politics');
    expect(CATEGORIES).toContain('sports');
  });
});

// ── CATEGORY_LABELS ───────────────────────────────────────────

describe('TC7 — CATEGORY_LABELS: every CATEGORIES entry has a label', () => {
  it('each category key maps to a non-empty string label', () => {
    for (const cat of CATEGORIES) {
      expect(typeof CATEGORY_LABELS[cat]).toBe('string');
      expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    }
  });
});

// ── RARITY_COLORS ─────────────────────────────────────────────

describe('TC8 — RARITY_COLORS: all 5 rarities present', () => {
  it('contains common, uncommon, rare, legendary, mythic', () => {
    expect(RARITY_COLORS['common']).toBeTruthy();
    expect(RARITY_COLORS['uncommon']).toBeTruthy();
    expect(RARITY_COLORS['rare']).toBeTruthy();
    expect(RARITY_COLORS['legendary']).toBeTruthy();
    expect(RARITY_COLORS['mythic']).toBeTruthy();
  });
});

describe('TC9 — RARITY_COLORS: values are hex strings', () => {
  it('every color value starts with #', () => {
    for (const color of Object.values(RARITY_COLORS)) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

// ── CHALLENGE_STATUS_LABELS ───────────────────────────────────

describe('TC10 — CHALLENGE_STATUS_LABELS: none maps to empty string', () => {
  it('none status returns empty string', () => {
    expect(CHALLENGE_STATUS_LABELS['none']).toBe('');
  });
});

describe('TC11 — CHALLENGE_STATUS_LABELS: all 4 statuses present', () => {
  it('has none, disputed, heavily_disputed, frozen', () => {
    expect('none' in CHALLENGE_STATUS_LABELS).toBe(true);
    expect('disputed' in CHALLENGE_STATUS_LABELS).toBe(true);
    expect('heavily_disputed' in CHALLENGE_STATUS_LABELS).toBe(true);
    expect('frozen' in CHALLENGE_STATUS_LABELS).toBe(true);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/reference-arsenal.constants.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./reference-arsenal.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/reference-arsenal.constants.ts'),
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
