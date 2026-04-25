// ============================================================
// ARENA ROOM END AFTER EFFECTS — tests/arena-room-end-after-effects.test.ts
// Source: src/arena/arena-room-end-after-effects.ts
//
// CLASSIFICATION:
//   renderAfterEffects() — HTML string builder → Snapshot test
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

import { renderAfterEffects } from '../src/arena/arena-room-end-after-effects.ts';

const makeBreakdown = (overrides = {}) => ({
  debater_a: {
    raw_score: 7,
    final_score: 9,
    adjustments: [
      { delta: 2, effect_name: 'Point Surge' },
    ],
  },
  debater_b: {
    raw_score: 6,
    final_score: 5,
    adjustments: [
      { delta: -1, effect_name: 'Point Siphon' },
    ],
  },
  inventory_effects: [],
  ...overrides,
});

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: string) => s);
});

// ── TC1: null breakdown returns empty string ──────────────────

describe('TC1 — renderAfterEffects: null breakdown returns ""', () => {
  it('returns empty string for null breakdown', () => {
    expect(renderAfterEffects(null, 'a')).toBe('');
  });
});

// ── TC2: no adjustments returns empty string ─────────────────

describe('TC2 — renderAfterEffects: no adjustments returns ""', () => {
  it('returns empty string when all adjustment arrays are empty', () => {
    const breakdown = {
      debater_a: { raw_score: 7, final_score: 7, adjustments: [] },
      debater_b: { raw_score: 6, final_score: 6, adjustments: [] },
      inventory_effects: [],
    };
    expect(renderAfterEffects(breakdown as never, 'a')).toBe('');
  });
});

// ── TC3: returns HTML with AFTER EFFECTS title ────────────────

describe('TC3 — renderAfterEffects: returns HTML with AFTER EFFECTS title', () => {
  it('contains "AFTER EFFECTS" in output', () => {
    const html = renderAfterEffects(makeBreakdown() as never, 'a');
    expect(html).toContain('AFTER EFFECTS');
  });
});

// ── TC4: renders "You" chain for debater_a (myRole=a) ────────

describe('TC4 — renderAfterEffects: renders "You" for myRole=a', () => {
  it('contains ae-label with You', () => {
    const html = renderAfterEffects(makeBreakdown() as never, 'a');
    expect(html).toContain('You');
  });
});

// ── TC5: escapes effect_name ──────────────────────────────────

describe('TC5 — renderAfterEffects: escapes effect_name', () => {
  it('passes effect_name through escapeHTML', () => {
    renderAfterEffects(makeBreakdown() as never, 'a');
    expect(mockEscapeHTML).toHaveBeenCalledWith('Point Surge');
  });
});

// ── TC6: positive delta has class ae-step--positive ──────────

describe('TC6 — renderAfterEffects: positive delta gets ae-step--positive class', () => {
  it('contains ae-step--positive for delta=2', () => {
    const html = renderAfterEffects(makeBreakdown() as never, 'a');
    expect(html).toContain('ae-step--positive');
  });
});

// ── TC7: negative delta has class ae-step--negative ──────────

describe('TC7 — renderAfterEffects: negative delta gets ae-step--negative class', () => {
  it('contains ae-step--negative for delta=-1 (opponent chain)', () => {
    const html = renderAfterEffects(makeBreakdown() as never, 'a');
    expect(html).toContain('ae-step--negative');
  });
});

// ── TC8: inventory effects render ae-inv-section ─────────────

describe('TC8 — renderAfterEffects: inventory effects render ae-inv-section', () => {
  it('contains ae-inv-section when inventory_effects present', () => {
    const breakdown = makeBreakdown({
      inventory_effects: [{ effect: 'mirror', copied_effect_id: 'fire_blade' }],
    });
    const html = renderAfterEffects(breakdown as never, 'a');
    expect(html).toContain('ae-inv-section');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-room-end-after-effects.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../config.ts', './arena-types-results.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-end-after-effects.ts'),
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
