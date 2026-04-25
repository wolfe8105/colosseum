// ============================================================
// ASYNC RENDER PREDICTIONS — tests/async-render-predictions.test.ts
// Source: src/async.render.predictions.ts
//
// CLASSIFICATION:
//   _setWirePredictions() — sets wiring callback → Unit test
//   renderPredictions()   — DOM renderer → Integration test
//
// IMPORTS:
//   { state }           from './async.state.ts'
//   { escapeHTML, FEATURES } from './config.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));
const mockWiredContainers = vi.hoisted(() => new Set<HTMLElement>());
const mockPredictions = vi.hoisted(() => [] as unknown[]);
const mockStandaloneQuestions = vi.hoisted(() => [] as unknown[]);
const mockState = vi.hoisted(() => ({
  get predictions() { return mockPredictions; },
  get standaloneQuestions() { return mockStandaloneQuestions; },
  get wiredContainers() { return mockWiredContainers; },
  predictingInFlight: new Set<string>(),
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  FEATURES: { predictionsUI: true },
  showToast: vi.fn(),
  APP: { baseUrl: 'https://themoderator.app' },
}));

vi.mock('../src/async.state.ts', () => ({
  get state() { return mockState; },
  PLACEHOLDER_PREDICTIONS: [],
}));

import { _setWirePredictions, renderPredictions } from '../src/async.render.predictions.ts';

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
  mockPredictions.length = 0;
  mockStandaloneQuestions.length = 0;
  mockWiredContainers.clear();
  document.body.innerHTML = '';
});

// ── _setWirePredictions ───────────────────────────────────────

describe('TC1 — _setWirePredictions: can be called without throwing', () => {
  it('stores a wiring function without error', () => {
    expect(() => _setWirePredictions(vi.fn())).not.toThrow();
  });
});

// ── renderPredictions — empty state ──────────────────────────

describe('TC2 — renderPredictions: shows empty state when no predictions', () => {
  it('renders "No active predictions yet" when both arrays are empty', () => {
    const container = document.createElement('div');

    renderPredictions(container);

    expect(container.innerHTML).toContain('No active predictions yet');
  });
});

describe('TC3 — renderPredictions: shows create prediction button in empty state', () => {
  it('includes create-prediction button when empty', () => {
    const container = document.createElement('div');

    renderPredictions(container);

    expect(container.innerHTML).toContain('CREATE PREDICTION');
  });
});

// ── renderPredictions — with predictions ─────────────────────

describe('TC4 — renderPredictions: renders prediction cards when data exists', () => {
  it('shows PREDICTIONS heading with debate prediction data', () => {
    mockPredictions.push({
      debate_id: 'd-1',
      topic: 'Is AI conscious?',
      p1: 'Alice',
      p2: 'Bob',
      p1_elo: 1200,
      p2_elo: 1100,
      pct_a: 60,
      pct_b: 40,
      total: 10,
      user_pick: null,
      status: 'upcoming',
    });
    const container = document.createElement('div');

    renderPredictions(container);

    expect(container.innerHTML).toContain('PREDICTIONS');
    expect(container.innerHTML).toContain('Is AI conscious?');
  });
});

describe('TC5 — renderPredictions: escapes HTML in topic and player names', () => {
  it('calls escapeHTML for user-supplied content', () => {
    mockPredictions.push({
      debate_id: 'd-2',
      topic: '<script>xss</script>',
      p1: '<b>Player1</b>',
      p2: 'Player2',
      p1_elo: 1000, p2_elo: 1000,
      pct_a: 50, pct_b: 50, total: 0, user_pick: null, status: 'upcoming',
    });
    const container = document.createElement('div');

    renderPredictions(container);

    expect(mockEscapeHTML).toHaveBeenCalled();
  });
});

describe('TC6 — renderPredictions: wires container once', () => {
  it('calls wiring fn only on first call for a given container', () => {
    const wireFn = vi.fn();
    _setWirePredictions(wireFn);
    mockPredictions.push({
      debate_id: 'd-3', topic: 'T', p1: 'A', p2: 'B',
      p1_elo: 1000, p2_elo: 1000, pct_a: 50, pct_b: 50,
      total: 0, user_pick: null, status: 'upcoming',
    });
    const container = document.createElement('div');

    renderPredictions(container);
    renderPredictions(container);

    expect(wireFn).toHaveBeenCalledTimes(1);
  });
});

describe('TC7 — renderPredictions: renders standalone questions', () => {
  it('shows COMMUNITY label for standalone question cards', () => {
    mockStandaloneQuestions.push({
      id: 'q-1',
      topic: 'Will AI replace developers?',
      side_a_label: 'Yes',
      side_b_label: 'No',
      picks_a: 5,
      picks_b: 3,
      total_picks: 8,
      creator_display_name: 'Alice',
      _userPick: null,
    });
    const container = document.createElement('div');

    renderPredictions(container);

    expect(container.innerHTML).toContain('COMMUNITY');
    expect(container.innerHTML).toContain('Will AI replace developers?');
  });
});

describe('TC8 — renderPredictions: live status shows LIVE badge', () => {
  it('includes LIVE indicator for in_progress debates', () => {
    mockPredictions.push({
      debate_id: 'd-live', topic: 'Live debate', p1: 'X', p2: 'Y',
      p1_elo: 1000, p2_elo: 1000, pct_a: 50, pct_b: 50,
      total: 5, user_pick: null, status: 'in_progress',
    });
    const container = document.createElement('div');

    renderPredictions(container);

    expect(container.innerHTML).toContain('LIVE');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/async.render.predictions.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./async.state.ts', './async.types.ts', './config.ts'];
    const source = readFileSync(resolve(__dirname, '../src/async.render.predictions.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
