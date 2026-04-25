// ============================================================
// ASYNC RIVALS — tests/async-rivals.test.ts
// Source: src/async.rivals.ts
//
// CLASSIFICATION:
//   _registerRivalWiring() — Sets callback reference → Unit test
//   renderRivals()         — DOM orchestration + fetch → Integration test
//   refreshRivals()        — DOM wrapper → Behavioral test
//
// IMPORTS:
//   { state }          from './async.state.ts'
//   { escapeHTML }     from './config.ts'
//   { getMyRivals }    from './auth.ts'
//   import type { ... } — type-only
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));
const mockGetMyRivals = vi.hoisted(() => vi.fn(async () => []));
const mockWiredContainers = vi.hoisted(() => new Set<HTMLElement>());
const mockState = vi.hoisted(() => ({
  predictions: [] as unknown[],
  standaloneQuestions: [] as unknown[],
  predictingInFlight: new Set<string>(),
  get wiredContainers() { return mockWiredContainers; },
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/auth.ts', () => ({
  getMyRivals: mockGetMyRivals,
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/async.state.ts', () => ({
  get state() { return mockState; },
  PLACEHOLDER_PREDICTIONS: [],
}));

import { _registerRivalWiring, renderRivals, refreshRivals } from '../src/async.rivals.ts';

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
  mockGetMyRivals.mockReset();
  mockGetMyRivals.mockResolvedValue([]);
  mockWiredContainers.clear();
  document.body.innerHTML = '';
});

// ── _registerRivalWiring ──────────────────────────────────────

describe('TC1 — _registerRivalWiring: stores wiring callback', () => {
  it('can register a wiring function without throwing', () => {
    expect(() => _registerRivalWiring(vi.fn())).not.toThrow();
  });
});

// ── renderRivals ──────────────────────────────────────────────

describe('TC2 — renderRivals: shows empty state for no rivals', () => {
  it('renders "No rivals yet" when getMyRivals returns empty array', async () => {
    mockGetMyRivals.mockResolvedValue([]);
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderRivals(container);

    expect(container.innerHTML).toContain('No rivals yet');
  });
});

describe('TC3 — renderRivals: calls getMyRivals to load data', () => {
  it('invokes getMyRivals on render', async () => {
    const container = document.createElement('div');

    await renderRivals(container);

    expect(mockGetMyRivals).toHaveBeenCalled();
  });
});

describe('TC4 — renderRivals: renders rival entries when data returned', () => {
  it('shows rival names in container when rivals exist', async () => {
    mockGetMyRivals.mockResolvedValue([{
      id: 'r-1',
      rival_id: 'user-rival-1',
      rival_username: 'AliceRival',
      rival_display_name: 'Alice Rival',
      rival_elo: 1300,
      rival_wins: 5,
      rival_losses: 2,
      status: 'accepted',
      direction: 'sent',
    }]);
    const container = document.createElement('div');

    await renderRivals(container);

    expect(container.innerHTML).toContain('ALICE RIVAL');
  });
});

describe('TC5 — renderRivals: wires container only once', () => {
  it('does not call wiring fn twice for the same container', async () => {
    const wireFn = vi.fn();
    _registerRivalWiring(wireFn);
    const container = document.createElement('div');

    await renderRivals(container);
    await renderRivals(container);

    expect(wireFn).toHaveBeenCalledTimes(1);
  });
});

// ── refreshRivals ─────────────────────────────────────────────

describe('TC6 — refreshRivals: no-op when #rivals-feed is absent', () => {
  it('does not throw when #rivals-feed does not exist', async () => {
    document.body.innerHTML = '';
    await expect(refreshRivals()).resolves.not.toThrow();
    expect(mockGetMyRivals).not.toHaveBeenCalled();
  });
});

describe('TC7 — refreshRivals: renders into #rivals-feed when present', () => {
  it('calls renderRivals with the #rivals-feed element', async () => {
    document.body.innerHTML = '<div id="rivals-feed"></div>';

    await refreshRivals();

    expect(mockGetMyRivals).toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/async.rivals.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./async.state.ts', './async.types.ts', './config.ts', './auth.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/async.rivals.ts'),
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
