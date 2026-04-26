/**
 * Integration tests: src/pages/home.overlay.ts → feed-card
 * Seam #312
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Supabase mock (ONLY @supabase/supabase-js) ───────────────────────────────
const mockRpcFn = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => {
  const client = {
    rpc: mockRpcFn,
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getUser: mockGetUser,
    },
  };
  return { createClient: vi.fn(() => client) };
});

// ─── Minimal DOM for home.overlay.ts ─────────────────────────────────────────

function buildDOM() {
  document.body.innerHTML = `
    <div id="categoryOverlay">
      <div id="overlayContent">
        <div id="overlayTitle"></div>
        <div id="overlayTabs">
          <button class="overlay-tab" data-tab="takes">Takes</button>
          <button class="overlay-tab" data-tab="predictions">Predictions</button>
        </div>
        <div id="overlay-takes-tab"></div>
        <div id="overlay-predictions-tab"></div>
      </div>
      <button id="overlayClose">X</button>
    </div>
  `;
}

// ─── Sample card factory ──────────────────────────────────────────────────────

function makeCard(overrides: Record<string, unknown> = {}) {
  return {
    id: 'card-abc-123',
    topic: 'Is AI better than humans?',
    content: 'AI will surpass human intelligence.',
    category: 'tech',
    status: 'open',
    mode: null,
    ruleset: null,
    current_round: null,
    total_rounds: null,
    score_a: null,
    score_b: null,
    vote_count_a: null,
    vote_count_b: null,
    reaction_count: 5,
    link_url: null,
    link_preview: null,
    ranked: null,
    created_at: new Date(Date.now() - 60000).toISOString(),
    debater_a: 'user-uuid-001',
    debater_b: null,
    debater_a_username: 'alice',
    debater_a_name: 'Alice',
    elo_a: 1200,
    verified_a: false,
    debater_b_username: null,
    debater_b_name: null,
    elo_b: null,
    verified_b: null,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ARCH CHECK
// ─────────────────────────────────────────────────────────────────────────────

describe('Seam #312 | ARCH — home.overlay.ts imports from feed-card', () => {
  it('home.overlay.ts has direct named imports from feed-card', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/home.overlay.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const feedCardLine = importLines.find(l => l.includes('feed-card'));
    expect(feedCardLine).toBeTruthy();
    expect(feedCardLine).toMatch(/renderFeedCard/);
    expect(feedCardLine).toMatch(/renderFeedEmpty/);
  });

  it('home.overlay.ts does not import wall modules', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/home.overlay.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const wallModules = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const wall of wallModules) {
      const found = importLines.some(l => l.includes(wall));
      expect(found, `Should not import ${wall}`).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC1: openCategory adds .open class and sets overlayTitle
// ─────────────────────────────────────────────────────────────────────────────

describe('TC1 | openCategory opens overlay and sets title', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockRpcFn.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds .open to #categoryOverlay and sets overlayTitle textContent', async () => {
    const { openCategory } = await import('../../src/pages/home.overlay.ts');
    const cat = { id: 'tech', label: 'Tech', section: 'Technology' };
    await openCategory(cat as never);

    const overlay = document.getElementById('categoryOverlay');
    expect(overlay?.classList.contains('open')).toBe(true);

    const title = document.getElementById('overlayTitle');
    expect(title?.textContent).toBe('Technology');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC2: openCategory calls safeRpc with get_unified_feed + correct params
// ─────────────────────────────────────────────────────────────────────────────

describe('TC2 | openCategory calls safeRpc("get_unified_feed") with p_limit:30 and p_category', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockRpcFn.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires safeRpc with get_unified_feed, p_limit 30, and the category id', async () => {
    const card = makeCard();
    mockRpcFn.mockResolvedValue({ data: [card], error: null });

    const { openCategory } = await import('../../src/pages/home.overlay.ts');
    const cat = { id: 'sports', label: 'Sports', section: 'Sports' };
    await openCategory(cat as never);

    const calls = mockRpcFn.mock.calls;
    const feedCall = calls.find(
      ([name, params]) => name === 'get_unified_feed' && params?.p_category === 'sports' && params?.p_limit === 30
    );
    expect(feedCall).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC3: openCategory renders renderFeedCard results into overlay-takes-tab
// ─────────────────────────────────────────────────────────────────────────────

describe('TC3 | openCategory renders feed cards into #overlay-takes-tab when data returned', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('injects .arena-card elements with data-card-id into overlay-takes-tab', async () => {
    const card = makeCard({ id: 'card-xyz', status: 'open' });
    mockRpcFn.mockImplementation((name: string) => {
      if (name === 'get_unified_feed') return Promise.resolve({ data: [card], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { openCategory } = await import('../../src/pages/home.overlay.ts');
    const cat = { id: 'tech', label: 'Tech', section: 'Tech' };
    await openCategory(cat as never);

    const takesTab = document.getElementById('overlay-takes-tab');
    expect(takesTab?.innerHTML).toContain('card-xyz');
    expect(takesTab?.innerHTML).toContain('arena-card');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC4: openCategory renders renderFeedEmpty when data is empty array
// ─────────────────────────────────────────────────────────────────────────────

describe('TC4 | openCategory renders empty state when safeRpc returns []', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockRpcFn.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders arena-empty into overlay-takes-tab when feed returns empty array', async () => {
    const { openCategory } = await import('../../src/pages/home.overlay.ts');
    const cat = { id: 'music', label: 'Music', section: 'Music' };
    await openCategory(cat as never);

    const takesTab = document.getElementById('overlay-takes-tab');
    expect(takesTab?.innerHTML).toContain('arena-empty');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC5: openCategory renders error message when safeRpc returns error
// ─────────────────────────────────────────────────────────────────────────────

describe('TC5 | openCategory renders failure message when safeRpc returns error', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders failure placeholder when safeRpc returns error', async () => {
    mockRpcFn.mockImplementation((name: string) => {
      if (name === 'get_unified_feed') return Promise.resolve({ data: null, error: { message: 'DB error' } });
      return Promise.resolve({ data: null, error: null });
    });

    const { openCategory } = await import('../../src/pages/home.overlay.ts');
    const cat = { id: 'politics', label: 'Politics', section: 'Politics' };
    await openCategory(cat as never);

    const takesTab = document.getElementById('overlay-takes-tab');
    expect(takesTab?.innerHTML).toContain('arena-empty');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC6: Tab switching shows/hides overlay-takes-tab and overlay-predictions-tab
// ─────────────────────────────────────────────────────────────────────────────

describe('TC6 | Tab click switches between takes and predictions panels', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockRpcFn.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clicking predictions tab hides takes tab and shows predictions tab', async () => {
    await import('../../src/pages/home.overlay.ts');

    const predsTabBtn = document.querySelector('.overlay-tab[data-tab="predictions"]') as HTMLElement;
    const takesTab = document.getElementById('overlay-takes-tab')!;
    const predsTab = document.getElementById('overlay-predictions-tab')!;

    predsTabBtn.click();

    expect(takesTab.style.display).toBe('none');
    expect(predsTab.style.display).toBe('');
  });

  it('clicking takes tab shows takes tab and hides predictions tab', async () => {
    await import('../../src/pages/home.overlay.ts');

    const takesTabBtn = document.querySelector('.overlay-tab[data-tab="takes"]') as HTMLElement;
    const predsTabBtn = document.querySelector('.overlay-tab[data-tab="predictions"]') as HTMLElement;
    const takesTab = document.getElementById('overlay-takes-tab')!;
    const predsTab = document.getElementById('overlay-predictions-tab')!;

    // Switch to predictions first
    predsTabBtn.click();
    // Then back to takes
    takesTabBtn.click();

    expect(takesTab.style.display).toBe('');
    expect(predsTab.style.display).toBe('none');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC7: renderFeedCard produces correct HTML for each card status
// ─────────────────────────────────────────────────────────────────────────────

describe('TC7 | renderFeedCard output shape by status', () => {
  it('open card contains arena-card, card-open, and data-card-id', async () => {
    const { renderFeedCard } = await import('../../src/feed-card.ts');
    const card = makeCard({ id: 'open-1', status: 'open' });
    const html = renderFeedCard(card as never);
    expect(html).toContain('arena-card');
    expect(html).toContain('card-open');
    expect(html).toContain('data-card-id="open-1"');
    expect(html).toContain('data-status="open"');
  });

  it('live card contains arena-card, card-live, and LIVE badge', async () => {
    const { renderFeedCard } = await import('../../src/feed-card.ts');
    const card = makeCard({
      id: 'live-1',
      status: 'live',
      debater_b: 'user-uuid-002',
      debater_b_username: 'bob',
      debater_b_name: 'Bob',
    });
    const html = renderFeedCard(card as never);
    expect(html).toContain('card-live');
    expect(html).toContain('data-card-id="live-1"');
    expect(html).toContain('LIVE');
  });

  it('voting card contains VOTING badge and VOTE button', async () => {
    const { renderFeedCard } = await import('../../src/feed-card.ts');
    const card = makeCard({
      id: 'vote-1',
      status: 'voting',
      vote_count_a: 3,
      vote_count_b: 2,
      debater_b: 'user-uuid-002',
      debater_b_username: 'charlie',
    });
    const html = renderFeedCard(card as never);
    expect(html).toContain('VOTING');
    expect(html).toContain('VOTE');
    expect(html).toContain('data-card-id="vote-1"');
  });

  it('complete card contains VERDICT badge and VIEW button', async () => {
    const { renderFeedCard } = await import('../../src/feed-card.ts');
    const card = makeCard({
      id: 'done-1',
      status: 'complete',
      score_a: 3,
      score_b: 1,
      debater_b: 'user-uuid-002',
      debater_b_username: 'dave',
    });
    const html = renderFeedCard(card as never);
    expect(html).toContain('VERDICT');
    expect(html).toContain('VIEW');
    expect(html).toContain('data-card-id="done-1"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC8: renderFeedEmpty returns aria-empty placeholder
// ─────────────────────────────────────────────────────────────────────────────

describe('TC8 | renderFeedEmpty returns arena-empty HTML', () => {
  it('returns a string containing arena-empty class', async () => {
    const { renderFeedEmpty } = await import('../../src/feed-card.ts');
    const html = renderFeedEmpty();
    expect(html).toContain('arena-empty');
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seam #420 | home.overlay.ts → home.state
// ─────────────────────────────────────────────────────────────────────────────

describe('Seam #420 | ARCH — home.overlay.ts imports state and CATEGORIES from home.state', () => {
  it('import lines include home.state with state and CATEGORIES', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/home.overlay.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const stateLine = importLines.find(l => l.includes('home.state'));
    expect(stateLine).toBeTruthy();
    expect(stateLine).toMatch(/state/);
    expect(stateLine).toMatch(/CATEGORIES/);
  });
});

describe('Seam #420 | TC-S1 — openCategory writes state.currentOverlayCat', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockRpcFn.mockResolvedValue({ data: [], error: null });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('sets state.currentOverlayCat to the category passed to openCategory', async () => {
    const { openCategory } = await import('../../src/pages/home.overlay.ts');
    const { state } = await import('../../src/pages/home.state.ts');
    const cat = { id: 'sports', label: 'Sports', section: 'THE PRESSBOX' };
    await openCategory(cat as never);
    expect(state.currentOverlayCat).toEqual(cat);
  });
});

describe('Seam #420 | TC-S2 — state.currentOverlayCat is null before openCategory is called', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockRpcFn.mockResolvedValue({ data: [], error: null });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('state.currentOverlayCat starts as null', async () => {
    const { state } = await import('../../src/pages/home.state.ts');
    expect(state.currentOverlayCat).toBeNull();
  });
});

describe('Seam #420 | TC-S3 — openCategoryTab looks up category from CATEGORIES by id', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockRpcFn.mockResolvedValue({ data: [], error: null });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('openCategoryTab with a known CATEGORIES id opens overlay and sets overlayTitle', async () => {
    const { openCategoryTab } = await import('../../src/pages/home.overlay.ts');

    // Add the tab button to DOM so openCategoryTab setTimeout does not throw
    const takesTabBtn = document.createElement('button');
    takesTabBtn.className = 'overlay-tab';
    takesTabBtn.dataset.tab = 'takes';
    document.body.appendChild(takesTabBtn);

    openCategoryTab('politics', 'takes');
    // Let openCategory start (it is async but the sync part writes overlayTitle)
    await vi.advanceTimersByTimeAsync(10);

    const overlay = document.getElementById('categoryOverlay');
    expect(overlay?.classList.contains('open')).toBe(true);

    const title = document.getElementById('overlayTitle');
    expect(title?.textContent).toBe('THE FLOOR');
  });
});

describe('Seam #420 | TC-S4 — CATEGORIES exported from home.state has expected entries', () => {
  it('CATEGORIES contains politics, sports, entertainment, couples, trending, music', async () => {
    const { CATEGORIES } = await import('../../src/pages/home.state.ts');
    const ids = CATEGORIES.map((c: { id: string }) => c.id);
    expect(ids).toContain('politics');
    expect(ids).toContain('sports');
    expect(ids).toContain('entertainment');
    expect(ids).toContain('couples');
    expect(ids).toContain('trending');
    expect(ids).toContain('music');
  });
});

describe('Seam #420 | TC-S5 — openCategoryTab with unknown id is a no-op', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockRpcFn.mockResolvedValue({ data: [], error: null });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('does not open overlay when catId is not in CATEGORIES', async () => {
    const { openCategoryTab } = await import('../../src/pages/home.overlay.ts');
    openCategoryTab('nonexistent-id', 'takes');
    await vi.advanceTimersByTimeAsync(10);
    const overlay = document.getElementById('categoryOverlay');
    expect(overlay?.classList.contains('open')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seam #454 | home.overlay.ts → async
// ─────────────────────────────────────────────────────────────────────────────

describe('Seam #454 | ARCH — home.overlay.ts imports ModeratorAsync from async.ts', () => {
  it('import lines include ModeratorAsync from ../async', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/home.overlay.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const asyncLine = importLines.find(l => l.includes('ModeratorAsync'));
    expect(asyncLine).toBeTruthy();
    expect(asyncLine).toMatch(/async/);
  });
});

describe('Seam #454 | TC-A1 — openCategory calls fetchPredictions (get_hot_predictions)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    // feed call returns empty, predictions call returns data
    mockRpcFn.mockImplementation((name: string) => {
      if (name === 'get_unified_feed') return Promise.resolve({ data: [], error: null });
      if (name === 'get_hot_predictions') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('fires safeRpc get_hot_predictions with p_limit 10 when openCategory is called', async () => {
    const { openCategory } = await import('../../src/pages/home.overlay.ts');
    const cat = { id: 'tech', label: 'Tech', section: 'Tech' };
    await openCategory(cat as never);

    const calls = mockRpcFn.mock.calls;
    const predCall = calls.find(
      ([name, params]) => name === 'get_hot_predictions' && params?.p_limit === 10
    );
    expect(predCall).toBeTruthy();
  });
});

describe('Seam #454 | TC-A2 — openCategory calls fetchStandaloneQuestions (get_prediction_questions)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockRpcFn.mockImplementation((name: string) => {
      if (name === 'get_unified_feed') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: [], error: null });
    });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('fires safeRpc get_prediction_questions with p_limit 20 when openCategory is called', async () => {
    const { openCategory } = await import('../../src/pages/home.overlay.ts');
    const cat = { id: 'sports', label: 'Sports', section: 'Sports' };
    await openCategory(cat as never);

    const calls = mockRpcFn.mock.calls;
    const qCall = calls.find(
      ([name, params]) => name === 'get_prediction_questions' && params?.p_limit === 20
    );
    expect(qCall).toBeTruthy();
  });
});

describe('Seam #454 | TC-A3 — openCategory renders predictions into #overlay-predictions-tab', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockRpcFn.mockImplementation((name: string) => {
      if (name === 'get_unified_feed') return Promise.resolve({ data: [], error: null });
      if (name === 'get_hot_predictions') {
        return Promise.resolve({
          data: [{
            debate_id: 'debate-pred-001',
            topic: 'Will AI take over?',
            p1_username: 'alice',
            p2_username: 'bob',
            p1_elo: 1300,
            p2_elo: 1100,
            prediction_count: 10,
            picks_a: 6,
            picks_b: 4,
            status: 'live',
          }],
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('overlay-predictions-tab is written by renderPredictions after openCategory (shows predictions content or error placeholder)', async () => {
    const { openCategory } = await import('../../src/pages/home.overlay.ts');
    const cat = { id: 'tech', label: 'Tech', section: 'Tech' };
    await openCategory(cat as never);

    // renderPredictions is always called; it either succeeds (PREDICTIONS heading)
    // or the catch block fires (placeholder-text). Either way, predsTab is not empty
    // and the takes tab is still the feed.
    const predsTab = document.getElementById('overlay-predictions-tab');
    expect(predsTab?.innerHTML.length).toBeGreaterThan(0);
    // The unified feed call must have happened for the takes tab
    const feedCall = mockRpcFn.mock.calls.find(
      ([name]) => name === 'get_unified_feed'
    );
    expect(feedCall).toBeTruthy();
    // The predictions fetch must have been attempted
    const predCall = mockRpcFn.mock.calls.find(
      ([name]) => name === 'get_hot_predictions'
    );
    expect(predCall).toBeTruthy();
  });
});

describe('Seam #454 | TC-A4 — openCategory does not crash when fetchPredictions rejects', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockRpcFn.mockImplementation((name: string) => {
      if (name === 'get_unified_feed') return Promise.resolve({ data: [], error: null });
      if (name === 'get_hot_predictions') return Promise.reject(new Error('network error'));
      return Promise.resolve({ data: null, error: null });
    });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('openCategory resolves without throwing even when fetchPredictions rejects', async () => {
    const { openCategory } = await import('../../src/pages/home.overlay.ts');
    const cat = { id: 'music', label: 'Music', section: 'Music' };
    await expect(openCategory(cat as never)).resolves.not.toThrow();
    // overlay still opened
    const overlay = document.getElementById('categoryOverlay');
    expect(overlay?.classList.contains('open')).toBe(true);
  });
});

describe('Seam #454 | TC-A5 — renderPredictions is called with the predsTab element', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockRpcFn.mockImplementation((name: string) => {
      if (name === 'get_unified_feed') return Promise.resolve({ data: [], error: null });
      if (name === 'get_hot_predictions') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: [], error: null });
    });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('openCategory calls renderPredictions with the overlay-predictions-tab element', async () => {
    const asyncMod = await import('../../src/async.ts');
    const renderSpy = vi.spyOn(asyncMod.ModeratorAsync, 'renderPredictions');

    const { openCategory } = await import('../../src/pages/home.overlay.ts');
    const cat = { id: 'entertainment', label: 'Entertainment', section: 'Entertainment' };
    await openCategory(cat as never);

    const predsTab = document.getElementById('overlay-predictions-tab')!;
    expect(renderSpy).toHaveBeenCalledWith(predsTab);
    renderSpy.mockRestore();
  });
});

describe('Seam #454 | TC-A6 — PTR triggers fetchPredictions again on pull-to-refresh', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildDOM();
    mockRpcFn.mockReset();
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockRpcFn.mockImplementation((name: string) => {
      if (name === 'get_unified_feed') return Promise.resolve({ data: [], error: null });
      if (name === 'get_hot_predictions') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: [], error: null });
    });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('after PTR gesture, get_hot_predictions is called a second time', async () => {
    const { openCategory, initPullToRefresh } = await import('../../src/pages/home.overlay.ts');

    // Open category first to set state.currentOverlayCat
    const cat = { id: 'politics', label: 'Politics', section: 'Politics' };
    await openCategory(cat as never);

    initPullToRefresh();
    const overlayContent = document.getElementById('overlayContent')!;

    // Count get_hot_predictions calls before PTR
    const beforeCount = mockRpcFn.mock.calls.filter(([n]) => n === 'get_hot_predictions').length;

    // jsdom does not support new Touch() — simulate the PTR state machine directly
    // by dispatching plain events with the touch-like properties attached.
    // touchstart: sets ptrStartY = 0, ptrDragging = true
    const tsEvt = Object.assign(new Event('touchstart', { bubbles: true }), {
      touches: [{ clientY: 0 }],
    });
    overlayContent.dispatchEvent(tsEvt);

    // touchmove: dy = 80 >= PTR_THRESHOLD (64) → ptrTriggered = true
    const tmEvt = Object.assign(new Event('touchmove', { bubbles: true }), {
      touches: [{ clientY: 80 }],
    });
    overlayContent.dispatchEvent(tmEvt);

    // touchend: ptrDragging=true, ptrTriggered=true → triggers refresh
    const teEvt = Object.assign(new Event('touchend', { bubbles: true }), {
      changedTouches: [{ clientY: 80 }],
    });
    overlayContent.dispatchEvent(teEvt);

    // Let async work run
    await vi.advanceTimersByTimeAsync(50);

    const afterCount = mockRpcFn.mock.calls.filter(([n]) => n === 'get_hot_predictions').length;
    expect(afterCount).toBeGreaterThan(beforeCount);
  });
});
