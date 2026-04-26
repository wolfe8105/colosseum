// int-groups.load.test.ts
// Seam #367 — src/pages/groups.load.ts → groups.utils
// Tests: renderEmpty + renderGroupList from groups.utils, RPCs discover_groups / get_my_groups / get_group_leaderboard

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// ── ARCH ──────────────────────────────────────────────────────────────────────
describe('Seam #367 — groups.load.ts → groups.utils', () => {
  it('ARCH: groups.load.ts imports renderEmpty and renderGroupList from ./groups.utils.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/pages/groups.load.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const utilsImport = lines.find((l: string) => l.includes('./groups.utils'));
    expect(utilsImport).toBeDefined();
    expect(utilsImport).toContain('renderEmpty');
    expect(utilsImport).toContain('renderGroupList');
  });

  // ── TC1: loadDiscover calls safeRpc with correct params ──────────────────
  describe('TC1: loadDiscover calls discover_groups RPC with correct params', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('calls safeRpc("discover_groups", { p_limit:30, p_category }) and calls renderGroupList', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const groups = [
        { id: 'g1', name: 'Politics Group', category: 'politics', member_count: 10, elo_rating: 1200, avatar_emoji: '⚔️', description: '', role: null },
        { id: 'g2', name: 'Science Group', category: 'science', member_count: 5, elo_rating: 1100, avatar_emoji: '🔬', description: '', role: null },
      ];

      const safeRpcMock = vi.fn().mockResolvedValue({ data: groups, error: null });
      const renderGroupListMock = vi.fn();
      const renderEmptyMock = vi.fn(() => '<div class="empty-state">empty</div>');

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: null,
        activeCategory: 'politics',
        CATEGORY_LABELS: { politics: 'Politics' },
      }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        get_my_groups: {},
        get_group_leaderboard: {},
        discover_groups: {},
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: renderEmptyMock,
        renderGroupList: renderGroupListMock,
      }));

      document.body.innerHTML = '<div id="discover-list"></div>';

      const mod = await import('../../src/pages/groups.load.ts');
      const openGroupCb = vi.fn();
      mod.setLoadOpenGroupCallback(openGroupCb);
      await mod.loadDiscover();

      expect(safeRpcMock).toHaveBeenCalledWith(
        'discover_groups',
        { p_limit: 30, p_category: 'politics' },
        expect.anything()
      );
      expect(renderGroupListMock).toHaveBeenCalledWith(
        'discover-list',
        groups,
        false,
        false,
        openGroupCb
      );
    });
  });

  // ── TC2: loadMyGroups renders renderEmpty when no currentUser ─────────────
  describe('TC2: loadMyGroups renders sign-in empty state when no user', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('calls renderEmpty("🔒", ...) into #mine-list and does NOT call safeRpc', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn();
      const renderEmptyMock = vi.fn(() => '<div class="empty-state">sign-in required</div>');
      const renderGroupListMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: null,
        activeCategory: 'general',
        CATEGORY_LABELS: {},
      }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        get_my_groups: {},
        get_group_leaderboard: {},
        discover_groups: {},
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: renderEmptyMock,
        renderGroupList: renderGroupListMock,
      }));

      document.body.innerHTML = '<div id="mine-list"></div>';

      const mod = await import('../../src/pages/groups.load.ts');
      await mod.loadMyGroups();

      expect(safeRpcMock).not.toHaveBeenCalled();
      expect(renderEmptyMock).toHaveBeenCalledWith('🔒', 'Sign in to see your groups', '');
      const mineList = document.getElementById('mine-list');
      expect(mineList?.innerHTML).toContain('sign-in required');
      expect(renderGroupListMock).not.toHaveBeenCalled();
    });
  });

  // ── TC3: loadMyGroups calls get_my_groups and renderGroupList ─────────────
  describe('TC3: loadMyGroups calls get_my_groups RPC and renders group list', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('calls safeRpc("get_my_groups", {}) and passes groups to renderGroupList("mine-list", ...)', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const myGroups = [
        { id: 'm1', name: 'My Group', category: 'general', member_count: 3, elo_rating: 1050, avatar_emoji: '🏆', description: '', role: 'member' },
      ];

      const safeRpcMock = vi.fn().mockResolvedValue({ data: myGroups, error: null });
      const renderGroupListMock = vi.fn();
      const renderEmptyMock = vi.fn(() => '<div class="empty-state">empty</div>');

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: { id: 'u1', email: 'test@test.com' },
        activeCategory: 'general',
        CATEGORY_LABELS: { general: 'General' },
      }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        get_my_groups: {},
        get_group_leaderboard: {},
        discover_groups: {},
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: renderEmptyMock,
        renderGroupList: renderGroupListMock,
      }));

      document.body.innerHTML = '<div id="mine-list"></div>';

      const mod = await import('../../src/pages/groups.load.ts');
      const openGroupCb = vi.fn();
      mod.setLoadOpenGroupCallback(openGroupCb);
      await mod.loadMyGroups();

      expect(safeRpcMock).toHaveBeenCalledWith('get_my_groups', {}, expect.anything());
      expect(renderGroupListMock).toHaveBeenCalledWith(
        'mine-list',
        myGroups,
        true,
        false,
        openGroupCb
      );
    });
  });

  // ── TC4: loadLeaderboard calls get_group_leaderboard with showRank=true ───
  describe('TC4: loadLeaderboard calls get_group_leaderboard and renderGroupList with showRank=true', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('calls safeRpc("get_group_leaderboard", { p_limit:20 }) and passes showRank=true', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const rankGroups = [
        { id: 'r1', name: 'Top Group', category: 'sports', member_count: 20, elo_rating: 1800, avatar_emoji: '🥇', description: '', role: null, rank: 1 },
        { id: 'r2', name: 'Second Group', category: 'sports', member_count: 15, elo_rating: 1700, avatar_emoji: '🥈', description: '', role: null, rank: 2 },
      ];

      const safeRpcMock = vi.fn().mockResolvedValue({ data: rankGroups, error: null });
      const renderGroupListMock = vi.fn();
      const renderEmptyMock = vi.fn(() => '<div class="empty-state">empty</div>');

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: null,
        activeCategory: 'sports',
        CATEGORY_LABELS: { sports: 'Sports' },
      }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        get_my_groups: {},
        get_group_leaderboard: {},
        discover_groups: {},
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: renderEmptyMock,
        renderGroupList: renderGroupListMock,
      }));

      document.body.innerHTML = '<div id="leaderboard-list"></div>';

      const mod = await import('../../src/pages/groups.load.ts');
      const openGroupCb = vi.fn();
      mod.setLoadOpenGroupCallback(openGroupCb);
      await mod.loadLeaderboard();

      expect(safeRpcMock).toHaveBeenCalledWith(
        'get_group_leaderboard',
        { p_limit: 20 },
        expect.anything()
      );
      expect(renderGroupListMock).toHaveBeenCalledWith(
        'leaderboard-list',
        rankGroups,
        false,
        true,  // showRank = true
        openGroupCb
      );
    });
  });

  // ── TC5: loadDiscover error path → renderEmpty('⚠️', ...) ─────────────────
  describe('TC5: loadDiscover renders error empty state on RPC failure', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('calls renderEmpty("⚠️", "Could not load groups", ...) on RPC error', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockRejectedValue(new Error('Network failure'));
      const renderEmptyMock = vi.fn(() => '<div class="error-state">error</div>');
      const renderGroupListMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: null,
        activeCategory: 'general',
        CATEGORY_LABELS: {},
      }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        get_my_groups: {},
        get_group_leaderboard: {},
        discover_groups: {},
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: renderEmptyMock,
        renderGroupList: renderGroupListMock,
      }));

      document.body.innerHTML = '<div id="discover-list"></div>';

      const mod = await import('../../src/pages/groups.load.ts');
      await mod.loadDiscover();

      expect(renderGroupListMock).not.toHaveBeenCalled();
      expect(renderEmptyMock).toHaveBeenCalledWith('⚠️', 'Could not load groups', 'Try again in a moment');
      const container = document.getElementById('discover-list');
      expect(container?.innerHTML).toContain('error-state');
    });
  });
});
