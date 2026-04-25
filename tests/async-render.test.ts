// ============================================================
// ASYNC RENDER (barrel) — tests/async-render.test.ts
// Source: src/async.render.ts
//
// CLASSIFICATION:
//   _registerWiring() — delegates to _setWirePredictions → Behavioral test
//   ARCH              — import allowlist check
//
// IMPORTS:
//   { _setWirePredictions, renderPredictions } from './async.render.predictions.ts'
//   { _showWagerPicker, _hideWagerPicker }      from './async.render.wager.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetWirePredictions = vi.hoisted(() => vi.fn());
const mockRenderPredictions = vi.hoisted(() => vi.fn());
const mockShowWagerPicker = vi.hoisted(() => vi.fn());
const mockHideWagerPicker = vi.hoisted(() => vi.fn());

vi.mock('../src/async.render.predictions.ts', () => ({
  _setWirePredictions: mockSetWirePredictions,
  renderPredictions: mockRenderPredictions,
}));

vi.mock('../src/async.render.wager.ts', () => ({
  _showWagerPicker: mockShowWagerPicker,
  _hideWagerPicker: mockHideWagerPicker,
}));

import { _registerWiring, renderPredictions, _showWagerPicker, _hideWagerPicker } from '../src/async.render.ts';

beforeEach(() => {
  mockSetWirePredictions.mockReset();
  mockRenderPredictions.mockReset();
  mockShowWagerPicker.mockReset();
  mockHideWagerPicker.mockReset();
});

// ── _registerWiring ───────────────────────────────────────────

describe('TC1 — _registerWiring: calls _setWirePredictions with predictions fn', () => {
  it('passes the predictions WireFn to _setWirePredictions', () => {
    const takesFn = vi.fn();
    const predsFn = vi.fn();

    _registerWiring(takesFn, predsFn);

    expect(mockSetWirePredictions).toHaveBeenCalledWith(predsFn);
  });
});

describe('TC2 — _registerWiring: ignores the takes (first) argument', () => {
  it('does not call _setWirePredictions with the takes fn', () => {
    const takesFn = vi.fn();
    const predsFn = vi.fn();

    _registerWiring(takesFn, predsFn);

    expect(mockSetWirePredictions).not.toHaveBeenCalledWith(takesFn);
  });
});

// ── re-exports passthrough ────────────────────────────────────

describe('TC3 — renderPredictions is re-exported from async.render.predictions', () => {
  it('is the same function reference as the mock', () => {
    expect(renderPredictions).toBe(mockRenderPredictions);
  });
});

describe('TC4 — _showWagerPicker is re-exported from async.render.wager', () => {
  it('is the same function reference as the mock', () => {
    expect(_showWagerPicker).toBe(mockShowWagerPicker);
  });
});

describe('TC5 — _hideWagerPicker is re-exported from async.render.wager', () => {
  it('is the same function reference as the mock', () => {
    expect(_hideWagerPicker).toBe(mockHideWagerPicker);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/async.render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./async.render.predictions.ts', './async.render.wager.ts'];
    const source = readFileSync(resolve(__dirname, '../src/async.render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
