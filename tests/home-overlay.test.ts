/**
 * Tests for src/pages/home.overlay.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockFetchPredictions = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockFetchStandaloneQuestions = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRenderPredictions = vi.hoisted(() => vi.fn());
const mockRenderFeedCard = vi.hoisted(() => vi.fn((c: unknown) => `<div class="card"></div>`));
const mockRenderFeedEmpty = vi.hoisted(() => vi.fn(() => '<div class="empty">No takes</div>'));
const mockState = vi.hoisted(() => ({ currentOverlayCat: null as unknown }));
const mockCategories = vi.hoisted(() => [
  { id: 'sports', label: 'Sports', section: 'Sports Section' },
  { id: 'politics', label: 'Politics', section: null },
]);

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock('../src/async.ts', () => ({
  ModeratorAsync: {
    get fetchPredictions() { return mockFetchPredictions; },
    get fetchStandaloneQuestions() { return mockFetchStandaloneQuestions; },
    get renderPredictions() { return mockRenderPredictions; },
  },
}));

vi.mock('../src/pages/home.state.ts', () => ({
  get state() { return mockState; },
  CATEGORIES: mockCategories,
}));

vi.mock('../src/feed-card.ts', () => ({
  renderFeedCard: mockRenderFeedCard,
  renderFeedEmpty: mockRenderFeedEmpty,
}));

function buildDOM() {
  document.body.innerHTML = `
    <div id="categoryOverlay"></div>
    <div id="overlayTitle"></div>
    <div id="overlayContent"></div>
    <button id="overlayClose"></button>
    <div id="overlayTabs">
      <button class="overlay-tab" data-tab="takes">Takes</button>
      <button class="overlay-tab" data-tab="predictions">Predictions</button>
    </div>
    <div id="overlay-takes-tab"></div>
    <div id="overlay-predictions-tab"></div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  mockState.currentOverlayCat = null;
});

describe('openCategory — sets title and opens overlay', () => {
  it('TC1: sets overlayTitle and adds open class to overlay', async () => {
    const { openCategory } = await import('../src/pages/home.overlay.ts');
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const cat = { id: 'sports', label: 'Sports', section: 'Sports Section' };
    await openCategory(cat as never);
    expect(document.getElementById('overlayTitle')!.textContent).toBe('Sports Section');
    expect(document.getElementById('categoryOverlay')!.classList.contains('open')).toBe(true);
  });
});

describe('openCategory — calls safeRpc for unified feed', () => {
  it('TC2: calls safeRpc("get_unified_feed") with category and limit', async () => {
    const { openCategory } = await import('../src/pages/home.overlay.ts');
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const cat = { id: 'sports', label: 'Sports', section: 'Sports Section' };
    await openCategory(cat as never);
    expect(mockSafeRpc).toHaveBeenCalledWith('get_unified_feed', { p_limit: 30, p_category: 'sports' });
  });
});

describe('openCategory — renders empty state when no cards', () => {
  it('TC3: calls renderFeedEmpty when data is empty', async () => {
    const { openCategory } = await import('../src/pages/home.overlay.ts');
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const cat = { id: 'sports', label: 'Sports', section: 'Sports Section' };
    await openCategory(cat as never);
    expect(mockRenderFeedEmpty).toHaveBeenCalled();
  });
});

describe('openCategory — renders feed cards when data present', () => {
  it('TC4: calls renderFeedCard for each returned card', async () => {
    const { openCategory } = await import('../src/pages/home.overlay.ts');
    const cards = [{ id: 'c1' }, { id: 'c2' }];
    mockSafeRpc.mockResolvedValue({ data: cards, error: null });
    const cat = { id: 'sports', label: 'Sports', section: 'Sports Section' };
    await openCategory(cat as never);
    expect(mockRenderFeedCard).toHaveBeenCalledTimes(2);
  });
});

describe('openCategory — calls ModeratorAsync for predictions', () => {
  it('TC5: calls fetchPredictions and renderPredictions', async () => {
    const { openCategory } = await import('../src/pages/home.overlay.ts');
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const cat = { id: 'sports', label: 'Sports', section: 'Sports Section' };
    await openCategory(cat as never);
    expect(mockFetchPredictions).toHaveBeenCalled();
    expect(mockRenderPredictions).toHaveBeenCalled();
  });
});

describe('openCategoryTab — returns early when catId unknown', () => {
  it('TC6: does not throw or call safeRpc for unknown catId', async () => {
    const { openCategoryTab } = await import('../src/pages/home.overlay.ts');
    openCategoryTab('nonexistent', 'takes');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('initPullToRefresh — does not throw', () => {
  it('TC7: initPullToRefresh can be called without throwing', async () => {
    const { initPullToRefresh } = await import('../src/pages/home.overlay.ts');
    expect(() => initPullToRefresh()).not.toThrow();
  });
});

describe('ARCH — src/pages/home.overlay.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../async.ts',
      '../auth.ts',
      './home.state.ts',
      './home.types.ts',
      '../feed-card.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.overlay.ts'),
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
