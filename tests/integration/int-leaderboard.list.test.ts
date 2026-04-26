/**
 * Integration tests — src/leaderboard.list.ts → badge
 * SEAM #424
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// ARCH filter
// ---------------------------------------------------------------------------
describe('ARCH: leaderboard.list.ts imports only allowed modules', () => {
  it('contains no wall dependencies', async () => {
    const src = await import('../../src/leaderboard.list.ts?raw').then((m) => m.default);
    const imports = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const bad = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of imports) {
      for (const wall of bad) {
        expect(line).not.toContain(wall);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Module-level mocks (vi.mock hoisted before imports)
// ---------------------------------------------------------------------------
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal LeaderboardEntry for test use. */
function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    rank: 1,
    id: 'user-001',
    username: 'testuser',
    user: 'TESTUSER',
    elo: 1500,
    wins: 10,
    losses: 5,
    streak: 3,
    level: 8,
    tier: 'free',
    verified_gladiator: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// TC1 — renderShimmer returns 6 shimmer rows
// ---------------------------------------------------------------------------
describe('TC1: renderShimmer — 6 shimmer rows', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('produces exactly 6 colo-shimmer elements', async () => {
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo',
      liveData: null,
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({
      getData: vi.fn(() => []),
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderShimmer } = await import('../../src/leaderboard.list.ts');
    const html = renderShimmer();
    const matches = html.match(/colo-shimmer/g) ?? [];
    // Each row has 5 shimmer divs × 6 rows = 30 occurrences
    expect(matches.length).toBeGreaterThanOrEqual(6);
    expect(matches.length).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// TC2 — renderList returns error div when liveData is null and not loading
// ---------------------------------------------------------------------------
describe('TC2: renderList — error state', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('returns error message when liveData is null and isLoading is false', async () => {
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo',
      liveData: null,
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({
      getData: vi.fn(() => []),
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();
    expect(html).toContain("Couldn't load rankings");
  });
});

// ---------------------------------------------------------------------------
// TC3 — renderList renders rows sorted by elo descending
// ---------------------------------------------------------------------------
describe('TC3: renderList — elo sorting', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('renders rows in elo descending order, assigning rank 1 to highest elo', async () => {
    const entries = [
      makeEntry({ user: 'BETA', elo: 1200, rank: 1 }),
      makeEntry({ user: 'ALPHA', elo: 1900, rank: 2 }),
      makeEntry({ user: 'GAMMA', elo: 1500, rank: 3 }),
    ];
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo',
      liveData: entries,
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({
      getData: vi.fn(() => entries),
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();
    const alphaPos = html.indexOf('ALPHA');
    const gammaPos = html.indexOf('GAMMA');
    const betaPos = html.indexOf('BETA');
    // ALPHA (1900 elo) should appear first, GAMMA second, BETA last
    expect(alphaPos).toBeLessThan(gammaPos);
    expect(gammaPos).toBeLessThan(betaPos);
    // Rank 1 medal emoji (🥇) should appear for highest elo
    expect(html).toContain('🥇');
  });
});

// ---------------------------------------------------------------------------
// TC4 — renderList applies magenta color to high-streak entries (>=5)
// ---------------------------------------------------------------------------
describe('TC4: renderList — streak tab high-streak coloring', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('uses mod-magenta for streak >= 5, mod-accent for streak < 5', async () => {
    const entries = [
      makeEntry({ user: 'HOT', streak: 10, elo: 1400, rank: 1 }),
      makeEntry({ user: 'COOL', streak: 2, elo: 1200, rank: 2 }),
    ];
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'streak',
      liveData: entries,
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({
      getData: vi.fn(() => entries),
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();
    expect(html).toContain('var(--mod-magenta)');
    expect(html).toContain('var(--mod-accent)');
  });
});

// ---------------------------------------------------------------------------
// TC5 — vgBadge is called; verified users get .vg-badge in rendered row
// ---------------------------------------------------------------------------
describe('TC5: renderList — vgBadge for verified users', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('renders vg-badge for verified_gladiator users, nothing for unverified', async () => {
    const entries = [
      makeEntry({ user: 'VERIFIED', verified_gladiator: true, elo: 1800, rank: 1 }),
      makeEntry({ user: 'PLAIN', verified_gladiator: false, elo: 1400, rank: 2 }),
    ];
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo',
      liveData: entries,
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({
      getData: vi.fn(() => entries),
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({
      vgBadge: (verified: boolean | null | undefined) => {
        if (!verified) return '';
        return '<span title="Verified Gladiator" aria-label="Verified Gladiator" class="vg-badge">🎖️</span>';
      },
    }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();
    expect(html).toContain('vg-badge');
    expect(html).toContain('Verified Gladiator');
  });
});

// ---------------------------------------------------------------------------
// TC6 — renderList includes LOAD MORE button when hasMore is true
// ---------------------------------------------------------------------------
describe('TC6: renderList — LOAD MORE button', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('appends load-more button when hasMore=true, omits it when hasMore=false', async () => {
    const entries = [makeEntry()];

    // hasMore = true
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo', liveData: entries, isLoading: false, hasMore: true, searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({ getData: vi.fn(() => entries) }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const mod1 = await import('../../src/leaderboard.list.ts');
    expect(mod1.renderList()).toContain('data-action="load-more"');
    expect(mod1.renderList()).toContain('LOAD MORE');

    vi.resetModules();

    // hasMore = false
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo', liveData: entries, isLoading: false, hasMore: false, searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({ getData: vi.fn(() => entries) }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const mod2 = await import('../../src/leaderboard.list.ts');
    expect(mod2.renderList()).not.toContain('data-action="load-more"');
  });
});

// ---------------------------------------------------------------------------
// TC7 — renderSearchResults: empty and populated
// ---------------------------------------------------------------------------
describe('TC7: renderSearchResults — empty and populated', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('returns "No users found" when searchResults is empty', async () => {
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo', liveData: null, isLoading: false, hasMore: false, searchResults: [],
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({ getData: vi.fn(() => []) }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderSearchResults } = await import('../../src/leaderboard.list.ts');
    expect(renderSearchResults()).toContain('No users found');
  });

  it('renders search result rows including vgBadge for verified users', async () => {
    const results = [
      makeEntry({ user: 'FOUND', username: 'found_user', verified_gladiator: true, elo: 1750 }),
    ];
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo', liveData: null, isLoading: false, hasMore: false, searchResults: results,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({ getData: vi.fn(() => []) }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({
      vgBadge: (verified: boolean | null | undefined) => {
        if (!verified) return '';
        return '<span title="Verified Gladiator" aria-label="Verified Gladiator" class="vg-badge">🎖️</span>';
      },
    }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderSearchResults } = await import('../../src/leaderboard.list.ts');
    const html = renderSearchResults();
    expect(html).toContain('FOUND');
    expect(html).toContain('vg-badge');
    expect(html).toContain('found_user');
  });
});

// ---------------------------------------------------------------------------
// SEAM #461 — src/leaderboard.list.ts → leaderboard.state
// Verifies that renderList/renderShimmer/renderSearchResults correctly read
// from leaderboard.state exports: currentTab, liveData, isLoading, hasMore,
// searchResults.
// ---------------------------------------------------------------------------

// TC8 — currentTab='wins' causes wins sorting and WINS label
describe('TC8 [#461]: renderList — wins tab sorting and label', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('sorts by wins descending and uses WINS stat label when currentTab is wins', async () => {
    const entries = [
      makeEntry({ user: 'FEWWINS', wins: 5, elo: 1600, rank: 1 }),
      makeEntry({ user: 'MANYWINS', wins: 80, elo: 1400, rank: 2 }),
    ];
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'wins',
      liveData: entries,
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({ getData: vi.fn(() => entries) }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();
    // MANYWINS (80 wins) should appear before FEWWINS (5 wins)
    expect(html.indexOf('MANYWINS')).toBeLessThan(html.indexOf('FEWWINS'));
    // Label should be WINS
    expect(html).toContain('WINS');
  });
});

// TC9 — currentTab='streak' causes streak sorting and 🔥 label
describe('TC9 [#461]: renderList — streak tab sorting and label', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('sorts by streak descending and uses 🔥 label when currentTab is streak', async () => {
    const entries = [
      makeEntry({ user: 'LOWSTREAK', streak: 1, elo: 1600, rank: 1 }),
      makeEntry({ user: 'HIGHSTREAK', streak: 15, elo: 1400, rank: 2 }),
    ];
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'streak',
      liveData: entries,
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({ getData: vi.fn(() => entries) }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();
    expect(html.indexOf('HIGHSTREAK')).toBeLessThan(html.indexOf('LOWSTREAK'));
    expect(html).toContain('🔥');
  });
});

// TC10 — liveData non-null with isLoading=false renders rows (not error state)
describe('TC10 [#461]: renderList — liveData present renders rows, not error', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('renders player rows when liveData is populated', async () => {
    const entries = [makeEntry({ user: 'PLAYER_ONE', elo: 1700, rank: 1 })];
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo',
      liveData: entries,
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({ getData: vi.fn(() => entries) }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();
    expect(html).not.toContain("Couldn't load rankings");
    expect(html).toContain('PLAYER_ONE');
    expect(html).toContain('data-username=');
  });
});

// TC11 — tier borders: creator gets mod-accent, champion gets mod-magenta, contender gets mod-side-b
describe('TC11 [#461]: renderList — tier border colors from state data', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('applies correct tier border variable per tier value', async () => {
    const entries = [
      makeEntry({ user: 'CREATOR_USER', tier: 'creator', elo: 1900, rank: 1 }),
      makeEntry({ user: 'CHAMPION_USER', tier: 'champion', elo: 1800, rank: 2 }),
      makeEntry({ user: 'CONTENDER_USER', tier: 'contender', elo: 1700, rank: 3 }),
    ];
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo',
      liveData: entries,
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({ getData: vi.fn(() => entries) }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();
    expect(html).toContain('var(--mod-accent)');   // creator border
    expect(html).toContain('var(--mod-magenta)');  // champion border
    expect(html).toContain('var(--mod-side-b)');   // contender border
  });
});

// TC12 — rank <= 3 gets gold background tint; rank > 3 gets transparent
describe('TC12 [#461]: renderList — top-3 gold background, rest transparent', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('applies gold tint background to top-3 ranks and transparent to others', async () => {
    const entries = [
      makeEntry({ user: 'FIRST',  elo: 2000, rank: 1 }),
      makeEntry({ user: 'SECOND', elo: 1800, rank: 2 }),
      makeEntry({ user: 'THIRD',  elo: 1600, rank: 3 }),
      makeEntry({ user: 'FOURTH', elo: 1300, rank: 4 }),
    ];
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo',
      liveData: entries,
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({ getData: vi.fn(() => entries) }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();
    expect(html).toContain('rgba(212,168,67,0.04)');
    expect(html).toContain('transparent');
  });
});

// ---------------------------------------------------------------------------
// SEAM #517 — src/leaderboard.list.ts → leaderboard.fetch (getData)
// Verifies renderList/renderSearchResults consume getData() from fetch module.
// ---------------------------------------------------------------------------

// TC13 — getData returning empty array yields empty row output (no player rows)
describe('TC13 [#517]: renderList — getData() empty → no player rows', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('produces no player rows when getData returns empty array', async () => {
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo',
      liveData: [],   // non-null → no error state
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({
      getData: vi.fn(() => []),
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();
    expect(html).not.toContain("Couldn't load rankings");
    expect(html).not.toContain('data-username=');
  });
});

// TC14 — getData is called by renderList (spy confirms invocation)
describe('TC14 [#517]: renderList — getData() is invoked on each render', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('calls getData exactly once per renderList call', async () => {
    const getDataSpy = vi.fn(() => [
      { rank: 1, user: 'SPYCHECK', elo: 1500, wins: 10, losses: 5, streak: 2, level: 5, tier: 'free' },
    ]);
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo',
      liveData: [{ rank: 1, user: 'SPYCHECK', elo: 1500, wins: 10, losses: 5, streak: 2, level: 5, tier: 'free' }],
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({
      getData: getDataSpy,
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    renderList();
    expect(getDataSpy).toHaveBeenCalledTimes(1);
  });
});

// TC15 — getData returning PLACEHOLDER_DATA (10 entries) renders 10 rows
describe('TC15 [#517]: renderList — getData() with 10 placeholder entries renders 10 rows', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('renders exactly 10 data-username rows for 10 entries from getData', async () => {
    const placeholders = Array.from({ length: 10 }, (_, i) => ({
      rank: i + 1,
      user: `USER${i + 1}`,
      username: `user${i + 1}`,
      elo: 1500 - i * 10,
      wins: 50 - i,
      losses: 20 + i,
      streak: 5 - (i % 5),
      level: 10 - i,
      tier: 'free' as const,
      verified_gladiator: false,
    }));
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo',
      liveData: placeholders,
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({
      getData: vi.fn(() => placeholders),
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();
    const rowCount = (html.match(/data-username=/g) ?? []).length;
    expect(rowCount).toBe(10);
  });
});

// TC16 — renderList re-ranks entries from getData regardless of pre-existing rank
describe('TC16 [#517]: renderList — rank is reassigned by renderList sort, not from getData', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('assigns rank=1 to highest elo entry regardless of getData rank field', async () => {
    // Intentionally set rank=99 on the high-elo entry to confirm it gets overridden
    const entries = [
      { rank: 99, user: 'LOELO', username: 'loelo', elo: 1200, wins: 5, losses: 3, streak: 1, level: 4, tier: 'free' as const },
      { rank: 1,  user: 'HIELO', username: 'hielo', elo: 2000, wins: 80, losses: 10, streak: 5, level: 20, tier: 'creator' as const },
    ];
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo',
      liveData: entries,
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({
      getData: vi.fn(() => entries),
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();
    // HIELO should appear before LOELO (highest elo = rank 1)
    expect(html.indexOf('HIELO')).toBeLessThan(html.indexOf('LOELO'));
    // Rank 1 medal (🥇) must appear since highest elo gets rank=1
    expect(html).toContain('🥇');
  });
});

// TC17 — renderList tolerates entries missing optional fields (id, username, verified_gladiator)
describe('TC17 [#517]: renderList — getData() entries without optional fields do not throw', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('renders without error when getData entries lack id, username, verified_gladiator', async () => {
    const minimalEntries = [
      { rank: 1, user: 'MINIMAL', elo: 1400, wins: 8, losses: 4, streak: 2, level: 5, tier: 'free' as const },
    ];
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'elo',
      liveData: minimalEntries,
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({
      getData: vi.fn(() => minimalEntries),
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    expect(() => renderList()).not.toThrow();
    const html = renderList();
    expect(html).toContain('MINIMAL');
  });
});

// TC18 — wins tab: getData() entries sorted by wins, stat value shown is wins count
describe('TC18 [#517]: renderList — getData() wins tab shows wins stat from each entry', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] }); vi.resetModules(); });

  it('displays wins value from getData entries under wins tab', async () => {
    const entries = [
      { rank: 1, user: 'CHAMP', username: 'champ', elo: 1500, wins: 200, losses: 30, streak: 3, level: 15, tier: 'champion' as const },
    ];
    vi.doMock('../../src/leaderboard.state.ts', () => ({
      currentTab: 'wins',
      liveData: entries,
      isLoading: false,
      hasMore: false,
      searchResults: null,
    }));
    vi.doMock('../../src/leaderboard.fetch.ts', () => ({
      getData: vi.fn(() => entries),
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
    vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();
    expect(html).toContain('200');  // wins value rendered in stat column
    expect(html).toContain('WINS'); // label
  });
});
