import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── ARCH FILTER ──────────────────────────────────────────────────────────────
const source = readFileSync(resolve('src/pages/groups.nav.ts'), 'utf-8');
const imports = source.split('\n').filter(l => /from\s+['"]/.test(l));

// ── MOCKS ─────────────────────────────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, auth: mockAuth })),
}));

// Mock dynamic imports used inside groups.nav.ts
vi.mock('../../src/pages/groups.load.ts', () => ({
  loadMyGroups: vi.fn().mockResolvedValue(undefined),
  loadLeaderboard: vi.fn().mockResolvedValue(undefined),
  loadDiscover: vi.fn().mockResolvedValue(undefined),
}));

// Mock groups.auditions.ts — we only need loadPendingAuditions here
vi.mock('../../src/pages/groups.auditions.ts', () => ({
  loadPendingAuditions: vi.fn().mockResolvedValue(undefined),
}));

// ── HELPERS ───────────────────────────────────────────────────────────────────
function buildLobbyDOM(): void {
  document.body.innerHTML = `
    <div id="view-lobby" style="display:block"></div>
    <div id="view-detail" style="display:none"></div>

    <div id="lobby-tabs">
      <button class="tab-btn"></button>
      <button class="tab-btn"></button>
      <button class="tab-btn"></button>
    </div>
    <div id="tab-discover" style="display:block"></div>
    <div id="tab-mine" style="display:none"></div>
    <div id="tab-leaderboard" style="display:none"></div>

    <div id="detail-tabs">
      <button class="tab-btn"></button>
      <button class="tab-btn"></button>
      <button class="tab-btn"></button>
      <button class="tab-btn"></button>
    </div>
    <div id="detail-feed" style="display:block"></div>
    <div id="detail-challenges" style="display:none"></div>
    <div id="detail-members-list" style="display:none"></div>
    <div id="detail-auditions" style="display:none"></div>

    <span class="cat-pill active"></span>
    <span class="cat-pill"></span>
  `;
}

// ── ARCH TEST ─────────────────────────────────────────────────────────────────
describe('ARCH — groups.nav.ts imports', () => {
  it('imports from groups.auditions and groups.state only', () => {
    const fromLines = imports.join('\n');
    expect(fromLines).toContain('groups.auditions');
    expect(fromLines).toContain('groups.state');
  });
});

// ── TC1 ───────────────────────────────────────────────────────────────────────
describe('TC1 — switchDetailTab("auditions") shows auditions panel and calls loadPendingAuditions', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: [], error: null });
    buildLobbyDOM();
  });

  it('shows #detail-auditions and calls loadPendingAuditions when currentGroupId is set', async () => {
    // Seed state with a group id
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentGroupId('group-abc');
    state.setCallerRole('leader');

    const { loadPendingAuditions } = await import('../../src/pages/groups.auditions.ts');
    const { switchDetailTab } = await import('../../src/pages/groups.nav.ts');

    switchDetailTab('auditions');

    const auditionsEl = document.getElementById('detail-auditions') as HTMLElement;
    expect(auditionsEl.style.display).toBe('block');

    const feedEl = document.getElementById('detail-feed') as HTMLElement;
    expect(feedEl.style.display).toBe('none');

    expect(loadPendingAuditions).toHaveBeenCalledWith('group-abc', 'leader');
  });
});

// ── TC2 ───────────────────────────────────────────────────────────────────────
describe('TC2 — switchDetailTab("feed") shows feed panel and does NOT call loadPendingAuditions', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    buildLobbyDOM();
  });

  it('shows #detail-feed and leaves auditions hidden', async () => {
    const { loadPendingAuditions } = await import('../../src/pages/groups.auditions.ts');
    vi.mocked(loadPendingAuditions).mockClear();
    const { switchDetailTab } = await import('../../src/pages/groups.nav.ts');

    switchDetailTab('feed');

    const feedEl = document.getElementById('detail-feed') as HTMLElement;
    expect(feedEl.style.display).toBe('block');

    const auditionsEl = document.getElementById('detail-auditions') as HTMLElement;
    expect(auditionsEl.style.display).toBe('none');

    expect(loadPendingAuditions).not.toHaveBeenCalled();
  });
});

// ── TC3 ───────────────────────────────────────────────────────────────────────
describe('TC3 — switchTab("mine") shows mine panel and triggers loadMyGroups', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildLobbyDOM();
  });

  it('shows #tab-mine and hides others, and calls loadMyGroups', async () => {
    const { switchTab } = await import('../../src/pages/groups.nav.ts');
    switchTab('mine');

    expect((document.getElementById('tab-mine') as HTMLElement).style.display).toBe('block');
    expect((document.getElementById('tab-discover') as HTMLElement).style.display).toBe('none');
    expect((document.getElementById('tab-leaderboard') as HTMLElement).style.display).toBe('none');

    // Flush dynamic import microtasks
    await vi.runAllTimersAsync();

    const { loadMyGroups } = await import('../../src/pages/groups.load.ts');
    expect(loadMyGroups).toHaveBeenCalled();
  });
});

// ── TC4 ───────────────────────────────────────────────────────────────────────
describe('TC4 — switchTab("discover") shows discover panel only', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildLobbyDOM();
    // Set mine as current so we can switch back
    (document.getElementById('tab-mine') as HTMLElement).style.display = 'block';
    (document.getElementById('tab-discover') as HTMLElement).style.display = 'none';
  });

  it('shows #tab-discover, hides others', async () => {
    const { switchTab } = await import('../../src/pages/groups.nav.ts');
    switchTab('discover');

    expect((document.getElementById('tab-discover') as HTMLElement).style.display).toBe('block');
    expect((document.getElementById('tab-mine') as HTMLElement).style.display).toBe('none');
    expect((document.getElementById('tab-leaderboard') as HTMLElement).style.display).toBe('none');
  });
});

// ── TC5 ───────────────────────────────────────────────────────────────────────
describe('TC5 — filterCategory sets active pill and calls loadDiscover', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildLobbyDOM();
  });

  it('removes active from all pills, adds to clicked one, triggers loadDiscover', async () => {
    const { filterCategory } = await import('../../src/pages/groups.nav.ts');
    const pills = document.querySelectorAll('.cat-pill');
    const targetPill = pills[1] as HTMLElement;

    filterCategory('sports', targetPill);

    expect(pills[0].classList.contains('active')).toBe(false);
    expect(targetPill.classList.contains('active')).toBe(true);

    await vi.runAllTimersAsync();

    const { loadDiscover } = await import('../../src/pages/groups.load.ts');
    expect(loadDiscover).toHaveBeenCalled();
  });
});

// ── TC6 ───────────────────────────────────────────────────────────────────────
describe('TC6 — showLobby hides detail view and shows lobby view', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildLobbyDOM();
    // Start in detail view
    (document.getElementById('view-detail') as HTMLElement).style.display = 'block';
    (document.getElementById('view-lobby') as HTMLElement).style.display = 'none';
  });

  it('shows #view-lobby and hides #view-detail', async () => {
    const { showLobby } = await import('../../src/pages/groups.nav.ts');
    showLobby();

    expect((document.getElementById('view-lobby') as HTMLElement).style.display).toBe('block');
    expect((document.getElementById('view-detail') as HTMLElement).style.display).toBe('none');
  });
});

// ── TC7 ───────────────────────────────────────────────────────────────────────
describe('TC7 — switchDetailTab("auditions") with null currentGroupId does NOT call loadPendingAuditions', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    buildLobbyDOM();
  });

  it('skips loadPendingAuditions when no group is active', async () => {
    // Ensure currentGroupId is null
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentGroupId(null);

    const { loadPendingAuditions } = await import('../../src/pages/groups.auditions.ts');
    vi.mocked(loadPendingAuditions).mockClear();
    const { switchDetailTab } = await import('../../src/pages/groups.nav.ts');

    switchDetailTab('auditions');

    expect(loadPendingAuditions).not.toHaveBeenCalled();
  });
});
