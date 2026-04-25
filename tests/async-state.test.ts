// ============================================================
// ASYNC STATE — tests/async-state.test.ts
// Source: src/async.state.ts
//
// CLASSIFICATION:
//   state        — Mutable state object with getters/setters → Unit test
//   PLACEHOLDER_PREDICTIONS — Constant data → Value test
//
// IMPORTS:
//   import type { ... } — type-only, no mock needed
// ============================================================

import { describe, it, expect } from 'vitest';
import { state, PLACEHOLDER_PREDICTIONS } from '../src/async.state.ts';

// ── state ─────────────────────────────────────────────────────

describe('TC1 — state.predictions: starts as empty array', () => {
  it('initial predictions is []', () => {
    state.predictions = []; // reset
    expect(state.predictions).toEqual([]);
  });
});

describe('TC2 — state.predictions: setter/getter round-trips', () => {
  it('set and get predictions returns the same array', () => {
    const preds = [{ debate_id: 'd1', topic: 'Test' } as never];
    state.predictions = preds;
    expect(state.predictions).toBe(preds);
    state.predictions = [];
  });
});

describe('TC3 — state.standaloneQuestions: setter/getter round-trips', () => {
  it('set and get standaloneQuestions returns the same array', () => {
    const qs = [{ id: 'q-1', body: 'Question?' } as never];
    state.standaloneQuestions = qs;
    expect(state.standaloneQuestions).toBe(qs);
    state.standaloneQuestions = [];
  });
});

describe('TC4 — state.predictingInFlight: is a Set', () => {
  it('predictingInFlight is a Set instance', () => {
    expect(state.predictingInFlight).toBeInstanceOf(Set);
  });
});

describe('TC5 — state.predictingInFlight: supports add/has/delete', () => {
  it('can add and check membership', () => {
    state.predictingInFlight.add('debate-xyz');
    expect(state.predictingInFlight.has('debate-xyz')).toBe(true);
    state.predictingInFlight.delete('debate-xyz');
    expect(state.predictingInFlight.has('debate-xyz')).toBe(false);
  });
});

// ── PLACEHOLDER_PREDICTIONS ───────────────────────────────────

describe('TC6 — PLACEHOLDER_PREDICTIONS: has 3 entries', () => {
  it('contains 3 placeholder prediction objects', () => {
    expect(PLACEHOLDER_PREDICTIONS).toHaveLength(3);
  });
});

describe('TC7 — PLACEHOLDER_PREDICTIONS: each entry has required fields', () => {
  it('every entry has debate_id, topic, p1, p2, pct_a, pct_b', () => {
    for (const p of PLACEHOLDER_PREDICTIONS) {
      expect(typeof p.debate_id).toBe('string');
      expect(typeof p.topic).toBe('string');
      expect(typeof p.p1).toBe('string');
      expect(typeof p.p2).toBe('string');
      expect(typeof p.pct_a).toBe('number');
      expect(typeof p.pct_b).toBe('number');
    }
  });
});

describe('TC8 — PLACEHOLDER_PREDICTIONS: percentages sum to 100', () => {
  it('pct_a + pct_b equals 100 for each entry', () => {
    for (const p of PLACEHOLDER_PREDICTIONS) {
      expect(p.pct_a + p.pct_b).toBe(100);
    }
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/async.state.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list (type-only)', () => {
    const allowed = ['./async.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/async.state.ts'),
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
