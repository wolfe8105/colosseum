/**
 * Integration tests — src/pages/groups.nav.ts → groups.state
 * Seam #138
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── ARCH FILTER ───────────────────────────────────────────────────────────────
describe('ARCH: groups.nav.ts import surface', () => {
  it('imports only from groups.state and groups.auditions (static)', async () => {
    const src = await import('fs').then(fs =>
      fs.readFileSync('src/pages/groups.nav.ts', 'utf-8')
    );
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const staticImports = imports.map(l => l.match(/from\s+['"](.*)['"]/)?.[1] ?? '');
    expect(staticImports.every(i =>
      i.includes('groups.state') || i.includes('groups.auditions')
    )).toBe(true);
  });
});

// ── MOCKS (hoisted — no local variables in factories) ─────────────────────────
vi.mock('../../src/pages/groups.state.ts', () => ({
  activeCategory: 'sports',
  currentGroupId: 'grp-123',
  callerRole: 'member',
  setActiveTab: vi.fn(),
  setActiveDetailTab: vi.fn(),
  setActiveCategory: vi.fn(),
  setCurrentGroupId: vi.fn(),
  setCallerRole: vi.fn(),
  setSb: vi.fn(),
  setCurrentUser: vi.fn(),
  setSelectedEmoji: vi.fn(),
  setIsMember: vi.fn(),
  activeTab: 'discover',
  activeDetailTab: 'feed',
  selectedEmoji: '⚔️',
  isMember: false,
  sb: null,
  currentUser: null,
  CATEGORY_LABELS: {},
}));

vi.mock('../../src/pages/groups.auditions.ts', () => ({
  loadPendingAuditions: vi.fn(),
}));

vi.mock('../../src/pages/groups.load.ts', () => ({
  loadMyGroups: vi.fn(),
  loadLeaderboard: vi.fn(),
  loadDiscover: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}));

// ── INTEGRATION TESTS ─────────────────────────────────────────────────────────
describe('groups.nav.ts → groups.state integration', () => {
  let switchTab: (tab: string) => void;
  let switchDetailTab: (tab: string) => void;
  let filterCategory: (cat: string | null, el: HTMLElement) => void;
  let showLobby: () => void;
  let stateMock: typeof import('../../src/pages/groups.state.ts');
  let auditionsMock: typeof import('../../src/pages/groups.auditions.ts');

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    // Set up minimal DOM
    document.body.innerHTML = `
      <div id="lobby-tabs">
        <button class="tab-btn">discover</button>
        <button class="tab-btn">mine</button>
        <button class="tab-btn">leaderboard</button>
      </div>
      <div id="tab-discover"></div>
      <div id="tab-mine"></div>
      <div id="tab-leaderboard"></div>
      <div id="detail-tabs">
        <button class="tab-btn">feed</button>
        <button class="tab-btn">challenges</button>
        <button class="tab-btn">members</button>
        <button class="tab-btn">auditions</button>
      </div>
      <div id="detail-feed"></div>
      <div id="detail-challenges"></div>
      <div id="detail-members-list"></div>
      <div id="detail-auditions"></div>
      <div id="view-detail"></div>
      <div id="view-lobby"></div>
      <span class="cat-pill active"></span>
    `;

    stateMock = await import('../../src/pages/groups.state.ts');
    auditionsMock = await import('../../src/pages/groups.auditions.ts');

    // Clear all mocks before each test
    vi.mocked(stateMock.setActiveTab).mockClear();
    vi.mocked(stateMock.setActiveDetailTab).mockClear();
    vi.mocked(stateMock.setActiveCategory).mockClear();
    vi.mocked(stateMock.setCurrentGroupId).mockClear();
    vi.mocked(stateMock.setCallerRole).mockClear();
    vi.mocked(auditionsMock.loadPendingAuditions).mockClear();

    const mod = await import('../../src/pages/groups.nav.ts');
    switchTab = mod.switchTab;
    switchDetailTab = mod.switchDetailTab;
    filterCategory = mod.filterCategory;
    showLobby = mod.showLobby;
  });

  // TC1: switchTab calls setActiveTab with the tab string
  it('TC1: switchTab("mine") calls setActiveTab with "mine"', () => {
    switchTab('mine');
    expect(vi.mocked(stateMock.setActiveTab)).toHaveBeenCalledWith('mine');
  });

  // TC2: switchDetailTab calls setActiveDetailTab with the tab string
  it('TC2: switchDetailTab("challenges") calls setActiveDetailTab with "challenges"', () => {
    switchDetailTab('challenges');
    expect(vi.mocked(stateMock.setActiveDetailTab)).toHaveBeenCalledWith('challenges');
  });

  // TC3: filterCategory calls setActiveCategory with the category
  it('TC3: filterCategory("politics", el) calls setActiveCategory("politics")', () => {
    const el = document.createElement('span');
    el.classList.add('cat-pill');
    document.body.appendChild(el);
    filterCategory('politics', el);
    expect(vi.mocked(stateMock.setActiveCategory)).toHaveBeenCalledWith('politics');
  });

  // TC4: showLobby calls setCurrentGroupId(null)
  it('TC4: showLobby() calls setCurrentGroupId(null)', () => {
    showLobby();
    expect(vi.mocked(stateMock.setCurrentGroupId)).toHaveBeenCalledWith(null);
  });

  // TC5: showLobby calls setCallerRole(null)
  it('TC5: showLobby() calls setCallerRole(null)', () => {
    showLobby();
    expect(vi.mocked(stateMock.setCallerRole)).toHaveBeenCalledWith(null);
  });

  // TC6: switchDetailTab('auditions') calls loadPendingAuditions when currentGroupId is set
  it('TC6: switchDetailTab("auditions") calls loadPendingAuditions with currentGroupId and callerRole', () => {
    switchDetailTab('auditions');
    expect(vi.mocked(auditionsMock.loadPendingAuditions)).toHaveBeenCalledWith('grp-123', 'member');
  });

  // TC7: switchDetailTab for non-auditions tab does NOT call loadPendingAuditions
  it('TC7: switchDetailTab("members") does NOT call loadPendingAuditions', () => {
    switchDetailTab('members');
    expect(vi.mocked(auditionsMock.loadPendingAuditions)).not.toHaveBeenCalled();
  });
});
