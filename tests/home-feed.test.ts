// ============================================================
// HOME FEED — tests/home-feed.test.ts
// Source: src/pages/home.feed.ts
//
// CLASSIFICATION:
//   renderFeed(): DOM behavioral orchestrator — fetches, renders, wires events
//
// IMPORTS:
//   { safeRpc, getCurrentUser, getIsPlaceholderMode, getSupabaseClient } from '../auth.ts'
//   { create_debate_card, cancel_debate_card, react_debate_card } from '../contracts/rpc-schemas.ts'
//   { clampVercel }       from '../contracts/dependency-clamps.ts'
//   { escapeHTML, showToast } from '../config.ts'
//   { renderFeedCard, renderFeedEmpty, renderModeratorCard, injectOpenCardCSS,
//     injectFeedCardHeroCSS, startFeedCountdowns } from '../feed-card.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc               = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [], error: null }));
const mockGetCurrentUser        = vi.hoisted(() => vi.fn(() => null));
const mockGetIsPlaceholderMode  = vi.hoisted(() => vi.fn(() => false));
const mockGetSupabaseClient     = vi.hoisted(() => vi.fn(() => null));
const mockInjectOpenCardCSS     = vi.hoisted(() => vi.fn());
const mockInjectFeedCardHeroCSS = vi.hoisted(() => vi.fn());
const mockStartFeedCountdowns   = vi.hoisted(() => vi.fn());
const mockRenderFeedCard        = vi.hoisted(() => vi.fn(() => '<div class="feed-card"></div>'));
const mockRenderFeedEmpty       = vi.hoisted(() => vi.fn(() => '<div class="feed-empty"></div>'));
const mockRenderModeratorCard   = vi.hoisted(() => vi.fn(() => ''));
const mockClampVercel           = vi.hoisted(() => vi.fn((n: number) => n));
const mockShowToast             = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc:             mockSafeRpc,
  getCurrentUser:      mockGetCurrentUser,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getSupabaseClient:   mockGetSupabaseClient,
  onChange:            vi.fn(),
  ready:               Promise.resolve(),
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  create_debate_card: {},
  cancel_debate_card: {},
  react_debate_card:  {},
  get_unified_feed:   {},
}));

vi.mock('../src/contracts/dependency-clamps.ts', () => ({
  clampVercel: mockClampVercel,
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  escapeHTML: (s: string) => s,
  FEATURES: {},
}));

vi.mock('../src/feed-card.ts', () => ({
  renderFeedCard:        mockRenderFeedCard,
  renderFeedEmpty:       mockRenderFeedEmpty,
  renderModeratorCard:   mockRenderModeratorCard,
  injectOpenCardCSS:     mockInjectOpenCardCSS,
  injectFeedCardHeroCSS: mockInjectFeedCardHeroCSS,
  startFeedCountdowns:   mockStartFeedCountdowns,
}));

import { renderFeed } from '../src/pages/home.feed.ts';

// ── Helpers ───────────────────────────────────────────────────

function buildDOM() {
  document.body.innerHTML = `<div id="screen-home"></div>`;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  mockSafeRpc.mockResolvedValue({ data: [], error: null });
  mockGetIsPlaceholderMode.mockReturnValue(false);
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — renderFeed calls injectOpenCardCSS and injectFeedCardHeroCSS', () => {
  it('both CSS injectors are called', async () => {
    await renderFeed();
    expect(mockInjectOpenCardCSS).toHaveBeenCalled();
    expect(mockInjectFeedCardHeroCSS).toHaveBeenCalled();
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — renderFeed returns early when #screen-home is absent', () => {
  it('does not call safeRpc when screen-home not in DOM', async () => {
    document.body.innerHTML = '';
    await renderFeed();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — renderFeed creates #home-feed-container if not present', () => {
  it('appends #home-feed-container to #screen-home', async () => {
    await renderFeed();
    expect(document.getElementById('home-feed-container')).not.toBeNull();
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — renderFeed calls safeRpc get_unified_feed to fetch cards', () => {
  it('calls safeRpc with "get_unified_feed"', async () => {
    await renderFeed();
    expect(mockSafeRpc).toHaveBeenCalledWith(
      'get_unified_feed',
      expect.any(Object)
    );
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — renderFeed calls startFeedCountdowns after rendering', () => {
  it('startFeedCountdowns is called once after render', async () => {
    await renderFeed();
    expect(mockStartFeedCountdowns).toHaveBeenCalled();
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — renderFeed renders #unified-feed element', () => {
  it('DOM contains #unified-feed after renderFeed', async () => {
    await renderFeed();
    expect(document.getElementById('unified-feed')).not.toBeNull();
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — renderFeed renders feed cards when safeRpc returns cards', () => {
  it('calls renderFeedCard for each returned card', async () => {
    mockSafeRpc.mockResolvedValue({
      data: [{ id: 'c1', status: 'open' }, { id: 'c2', status: 'live' }],
      error: null,
    });
    await renderFeed();
    expect(mockRenderFeedCard).toHaveBeenCalled();
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — renderFeed skips fetch in placeholder mode', () => {
  it('does not call safeRpc when getIsPlaceholderMode returns true', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    await renderFeed();
    // safeRpc may not be called for feed fetch in placeholder mode
    const feedFetchCalls = mockSafeRpc.mock.calls.filter(c => c[0] === 'get_unified_feed');
    expect(feedFetchCalls.length).toBe(0);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/home.feed.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      '../contracts/dependency-clamps.ts',
      '../config.ts',
      '../feed-card.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.feed.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
