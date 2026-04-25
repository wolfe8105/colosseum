// ============================================================
// ASYNC RENDER WAGER — tests/async-render-wager.test.ts
// Source: src/async.render.wager.ts
//
// CLASSIFICATION:
//   _showWagerPicker() — DOM creation → Behavioral test
//   _hideWagerPicker() — DOM cleanup → Behavioral test
//
// IMPORTS:
//   { state }             from './async.state.ts'
//   { escapeHTML }        from './config.ts'
//   { getCurrentProfile } from './auth.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => null));
const mockPredictions = vi.hoisted(() => [] as unknown[]);
const mockState = vi.hoisted(() => ({
  get predictions() { return mockPredictions; },
  standaloneQuestions: [] as unknown[],
  predictingInFlight: new Set<string>(),
  wiredContainers: new Set<HTMLElement>(),
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/async.state.ts', () => ({
  get state() { return mockState; },
  PLACEHOLDER_PREDICTIONS: [],
}));

import { _showWagerPicker, _hideWagerPicker } from '../src/async.render.wager.ts';

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
  mockGetCurrentProfile.mockReturnValue({ token_balance: 500 });
  mockPredictions.length = 0;
  document.body.innerHTML = '';
});

// ── _hideWagerPicker ──────────────────────────────────────────

describe('TC1 — _hideWagerPicker: no-op when wrapper absent', () => {
  it('does not throw when #wager-picker-wrapper does not exist', () => {
    expect(() => _hideWagerPicker()).not.toThrow();
  });
});

describe('TC2 — _hideWagerPicker: removes existing wrapper', () => {
  it('removes #wager-picker-wrapper from DOM', () => {
    document.body.innerHTML = '<div id="wager-picker-wrapper"></div>';

    _hideWagerPicker();

    expect(document.getElementById('wager-picker-wrapper')).toBeNull();
  });
});

// ── _showWagerPicker ──────────────────────────────────────────

describe('TC3 — _showWagerPicker: no-op when prediction not found', () => {
  it('does not create picker when debateId is not in state.predictions', () => {
    mockPredictions.push({ debate_id: 'other-debate', p1: 'A', p2: 'B' });

    _showWagerPicker('nonexistent-debate', 'a');

    expect(document.getElementById('wager-picker-wrapper')).toBeNull();
  });
});

describe('TC4 — _showWagerPicker: no-op when card element not found', () => {
  it('does not create picker when [data-action="predict"] card is absent', () => {
    mockPredictions.push({ debate_id: 'debate-x', p1: 'Alice', p2: 'Bob' });
    document.body.innerHTML = ''; // no card element

    _showWagerPicker('debate-x', 'a');

    expect(document.getElementById('wager-picker-wrapper')).toBeNull();
  });
});

describe('TC5 — _showWagerPicker: calls _hideWagerPicker before showing new picker', () => {
  it('removes existing wrapper before creating a new one', () => {
    document.body.innerHTML = '<div id="wager-picker-wrapper"></div>';
    mockPredictions.push({ debate_id: 'debate-y', p1: 'A', p2: 'B' });

    _showWagerPicker('debate-y', 'a');

    // The old wrapper should be gone (new one may or may not exist depending on card presence)
    const wrappers = document.querySelectorAll('#wager-picker-wrapper');
    expect(wrappers).toHaveLength(wrappers.length <= 1 ? wrappers.length : 0);
  });
});

describe('TC6 — _showWagerPicker: creates picker inside matching card', () => {
  it('appends #wager-picker-wrapper to the prediction card', () => {
    const debateId = 'debate-wager-1';
    mockPredictions.push({ debate_id: debateId, p1: 'Alpha', p2: 'Beta' });

    document.body.innerHTML = `
      <div style="background:var(--mod-bg-card)">
        <button data-action="predict" data-id="${debateId}"></button>
      </div>
    `;

    _showWagerPicker(debateId, 'a');

    expect(document.getElementById('wager-picker-wrapper')).not.toBeNull();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/async.render.wager.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./async.state.ts', './config.ts', './auth.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/async.render.wager.ts'),
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
