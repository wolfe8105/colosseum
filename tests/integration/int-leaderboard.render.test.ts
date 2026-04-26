import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Supabase mock ──────────────────────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ── Shared reset ───────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  document.body.innerHTML = '';
});

// ── ARCH filter ────────────────────────────────────────────────────────────────
// TC1: leaderboard.render.ts only imports from allowed modules
describe('TC1 — ARCH: leaderboard.render.ts imports only allowed sources', () => {
  it('imports only config, auth, leaderboard.state, leaderboard.list', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/leaderboard.render.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    for (const line of importLines) {
      expect(line).toMatch(/from\s+['"](\.\/config|\.\/auth|\.\/leaderboard\.state|\.\/leaderboard\.list)/);
    }
  });
});

// TC2: render() returns silently when container is absent (no throw)
describe('TC2 — render() exits cleanly when #screen-leaderboard is missing', () => {
  it('does not throw and does not mutate DOM', async () => {
    document.body.innerHTML = '<div id="other"></div>';
    const { render } = await import('../../src/leaderboard.render.ts');
    expect(() => render()).not.toThrow();
    expect(document.getElementById('lb-list')).toBeNull();
  });
});

// TC3: isLoading=true, searchResults=null → shimmer rendered in #lb-list
describe('TC3 — isLoading=true renders shimmer markup in #lb-list', () => {
  it('contains colo-shimmer elements when isLoading is true and searchResults is null', async () => {
    document.body.innerHTML = '<div id="screen-leaderboard"></div>';

    // Set state before importing render
    const state = await import('../../src/leaderboard.state.ts');
    state.setIsLoading(true);
    state.setSearchResults(null);
    state.setLiveData(null);

    const { render } = await import('../../src/leaderboard.render.ts');
    render();

    const lbList = document.getElementById('lb-list');
    expect(lbList).not.toBeNull();
    expect(lbList!.innerHTML).toContain('colo-shimmer');
  });
});

// TC4: searchResults non-null array → renderSearchResults path; rows carry data-username
describe('TC4 — searchResults non-null renders search result rows', () => {
  it('renders data-username rows matching the searchResults entries', async () => {
    document.body.innerHTML = '<div id="screen-leaderboard"></div>';

    const state = await import('../../src/leaderboard.state.ts');
    state.setIsLoading(false);
    state.setSearchResults([
      { rank: 1, user: 'Alice', username: 'alice', elo: 1300, wins: 5, losses: 2, streak: 3, level: 4, tier: 'free' },
      { rank: 2, user: 'Bob', username: 'bob', elo: 1250, wins: 3, losses: 1, streak: 1, level: 2, tier: 'free' },
    ]);

    const { render } = await import('../../src/leaderboard.render.ts');
    render();

    const lbList = document.getElementById('lb-list');
    expect(lbList).not.toBeNull();
    const rows = lbList!.querySelectorAll('[data-username]');
    expect(rows.length).toBe(2);
    const usernames = Array.from(rows).map(r => (r as HTMLElement).dataset['username']);
    expect(usernames).toContain('alice');
    expect(usernames).toContain('bob');
  });
});

// TC5: myRank null → displays '#--'; myRank set → displays '#42'
describe('TC5 — myRank state drives rank display text', () => {
  it('shows #-- when myRank is null', async () => {
    document.body.innerHTML = '<div id="screen-leaderboard"></div>';

    const state = await import('../../src/leaderboard.state.ts');
    state.setMyRank(null);
    state.setIsLoading(false);
    state.setSearchResults(null);
    state.setLiveData(null);

    const { render } = await import('../../src/leaderboard.render.ts');
    render();

    const container = document.getElementById('screen-leaderboard');
    expect(container!.innerHTML).toContain('#--');
  });

  it('shows #42 when myRank is 42', async () => {
    document.body.innerHTML = '<div id="screen-leaderboard"></div>';

    const state = await import('../../src/leaderboard.state.ts');
    state.setMyRank(42);
    state.setIsLoading(false);
    state.setSearchResults(null);
    state.setLiveData(null);

    const { render } = await import('../../src/leaderboard.render.ts');
    render();

    const container = document.getElementById('screen-leaderboard');
    expect(container!.innerHTML).toContain('#42');
  });
});

// TC6: currentTab drives active class on the matching tab button
describe('TC6 — currentTab state drives active class on tab buttons', () => {
  it('only the wins tab button has class "active" when currentTab is wins', async () => {
    document.body.innerHTML = '<div id="screen-leaderboard"></div>';

    const state = await import('../../src/leaderboard.state.ts');
    state.setCurrentTab('wins');
    state.setIsLoading(false);
    state.setSearchResults(null);
    state.setLiveData(null);

    const { render } = await import('../../src/leaderboard.render.ts');
    render();

    const tabs = Array.from(document.querySelectorAll('.lb-tab'));
    expect(tabs.length).toBe(3);
    const activeTab = tabs.find(t => t.classList.contains('active')) as HTMLElement | undefined;
    expect(activeTab).not.toBeUndefined();
    expect(activeTab!.dataset['tab']).toBe('wins');
  });
});

// TC7: searchQuery pre-fills #lb-search-input value
describe('TC7 — searchQuery state pre-fills the search input value', () => {
  it('input value matches the searchQuery from state', async () => {
    document.body.innerHTML = '<div id="screen-leaderboard"></div>';

    const state = await import('../../src/leaderboard.state.ts');
    state.setSearchQuery('testuser');
    state.setIsLoading(false);
    state.setSearchResults(null);
    state.setLiveData(null);

    const { render } = await import('../../src/leaderboard.render.ts');
    render();

    const input = document.getElementById('lb-search-input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe('testuser');
  });
});
