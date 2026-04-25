// ============================================================
// LEADERBOARD BARREL — tests/leaderboard.test.ts
// Source: src/leaderboard.ts
//
// CLASSIFICATION:
//   init(): Behavioral — sets up MutationObserver + delegated search handler
//
// IMPORTS:
//   { FEATURES }              from './config.ts'
//   { ready }                 from './auth.ts'
//   { render }                from './leaderboard.render.ts'
//   { fetchLeaderboard, ... } from './leaderboard.fetch.ts'
//   { showEloExplainer }      from './leaderboard.elo.ts'
//
// NOTE: leaderboard.ts calls ready.then(() => init()) at module level.
// Tests verify init() behaviour by calling it directly after mocking deps.
// The module-level click handler for [data-action] is tested via TC7-TC9.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockRender           = vi.hoisted(() => vi.fn());
const mockFetchLeaderboard = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockSetTab           = vi.hoisted(() => vi.fn());
const mockSetTime          = vi.hoisted(() => vi.fn());
const mockLoadMore         = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockSearchLeaderboard = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockClearSearch      = vi.hoisted(() => vi.fn());
const mockShowEloExplainer = vi.hoisted(() => vi.fn());

const mockLeaderboardFeature = vi.hoisted(() => ({ value: true }));
const mockReady = vi.hoisted(() => Promise.resolve());

vi.mock('../src/config.ts', () => ({
  get FEATURES() { return { leaderboard: mockLeaderboardFeature.value }; },
  showToast: vi.fn(),
  escapeHTML: (s: string) => s,
}));

vi.mock('../src/auth.ts', () => ({
  get ready() { return mockReady; },
  getCurrentUser: vi.fn(),
  getCurrentProfile: vi.fn(),
  getIsPlaceholderMode: vi.fn(() => false),
  safeRpc: vi.fn(),
  onChange: vi.fn(),
}));

vi.mock('../src/leaderboard.render.ts', () => ({
  render: mockRender,
}));

vi.mock('../src/leaderboard.fetch.ts', () => ({
  fetchLeaderboard: mockFetchLeaderboard,
  setTab: mockSetTab,
  setTime: mockSetTime,
  loadMore: mockLoadMore,
  searchLeaderboard: mockSearchLeaderboard,
  clearSearch: mockClearSearch,
}));

vi.mock('../src/leaderboard.elo.ts', () => ({
  showEloExplainer: mockShowEloExplainer,
}));

vi.mock('../src/leaderboard.types.ts', () => ({}));

import { init } from '../src/leaderboard.ts';

beforeEach(() => {
  vi.clearAllMocks();
  mockLeaderboardFeature.value = true;
  document.body.innerHTML = '';
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — init does nothing when FEATURES.leaderboard is false', () => {
  it('init returns early without creating observer', () => {
    mockLeaderboardFeature.value = false;
    const MutationObserverSpy = vi.spyOn(global, 'MutationObserver');
    init();
    expect(MutationObserverSpy).not.toHaveBeenCalled();
    MutationObserverSpy.mockRestore();
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — init creates a MutationObserver when leaderboard feature is enabled', () => {
  it('MutationObserver constructor is called', () => {
    const MutationObserverSpy = vi.spyOn(global, 'MutationObserver').mockImplementation((cb) => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn(() => []),
    }));
    init();
    expect(MutationObserverSpy).toHaveBeenCalled();
    MutationObserverSpy.mockRestore();
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — init observes screen-leaderboard element when it exists', () => {
  it('calls observer.observe on the #screen-leaderboard element', () => {
    const screen = document.createElement('div');
    screen.id = 'screen-leaderboard';
    document.body.appendChild(screen);

    const observeMock = vi.fn();
    vi.spyOn(global, 'MutationObserver').mockImplementation((cb) => ({
      observe: observeMock,
      disconnect: vi.fn(),
      takeRecords: vi.fn(() => []),
    }));

    init();
    expect(observeMock).toHaveBeenCalledWith(screen, { attributes: true, attributeFilter: ['class'] });

    vi.restoreAllMocks();
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — MutationObserver callback renders and fetches when screen becomes active', () => {
  it('calls render then fetchLeaderboard when screen gains "active" class with no children', async () => {
    const screen = document.createElement('div');
    screen.id = 'screen-leaderboard';
    screen.classList.add('active');
    document.body.appendChild(screen);

    let observerCallback: MutationCallback | null = null;
    vi.spyOn(global, 'MutationObserver').mockImplementation((cb) => {
      observerCallback = cb;
      return { observe: vi.fn(), disconnect: vi.fn(), takeRecords: vi.fn(() => []) };
    });

    init();
    expect(observerCallback).not.toBeNull();

    mockFetchLeaderboard.mockResolvedValue(undefined);
    observerCallback!([], {} as MutationObserver);

    expect(mockRender).toHaveBeenCalled();
    await vi.waitFor(() => expect(mockFetchLeaderboard).toHaveBeenCalled());

    vi.restoreAllMocks();
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — document click handler dispatches set-tab action', () => {
  it('calls setTab when [data-action="set-tab"] is clicked', () => {
    const btn = document.createElement('button');
    btn.dataset.action = 'set-tab';
    btn.dataset.tab = 'wins';
    document.body.appendChild(btn);
    btn.click();
    expect(mockSetTab).toHaveBeenCalledWith('wins');
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — document click handler dispatches set-time action', () => {
  it('calls setTime when [data-action="set-time"] is clicked', () => {
    const btn = document.createElement('button');
    btn.dataset.action = 'set-time';
    btn.dataset.time = 'week';
    document.body.appendChild(btn);
    btn.click();
    expect(mockSetTime).toHaveBeenCalledWith('week');
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — document click handler dispatches load-more action', () => {
  it('calls loadMore when [data-action="load-more"] is clicked', () => {
    const btn = document.createElement('button');
    btn.dataset.action = 'load-more';
    document.body.appendChild(btn);
    btn.click();
    expect(mockLoadMore).toHaveBeenCalled();
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — document click handler dispatches show-elo-explainer action', () => {
  it('calls showEloExplainer when [data-action="show-elo-explainer"] is clicked', () => {
    const btn = document.createElement('button');
    btn.dataset.action = 'show-elo-explainer';
    document.body.appendChild(btn);
    btn.click();
    expect(mockShowEloExplainer).toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/leaderboard.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './config.ts',
      './auth.ts',
      './leaderboard.render.ts',
      './leaderboard.fetch.ts',
      './leaderboard.elo.ts',
      './leaderboard.types.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/leaderboard.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
