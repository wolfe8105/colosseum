// int-groups-load.test.ts
// Seam #154 — src/pages/groups.load.ts → groups.state
// Tests: loadDiscover, loadMyGroups, loadLeaderboard — state reads and safeRpc calls.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// ── ARCH ──────────────────────────────────────────────────────────────────────
describe('Seam #154 — groups.load.ts → groups.state', () => {
  it('ARCH: groups.load.ts imports activeCategory and currentUser from ./groups.state.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/pages/groups.load.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasStateImport = lines.some(
      (l: string) => l.includes('./groups.state') && l.includes('activeCategory') && l.includes('currentUser')
    );
    expect(hasStateImport).toBe(true);
  });

  // ── loadDiscover ─────────────────────────────────────────────────────────
  describe('loadDiscover', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC2: loadDiscover calls safeRpc("discover_groups") with p_limit:30 and current activeCategory', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const renderGroupListMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        activeCategory: 'sports',
        currentUser: null,
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: vi.fn(() => '<div>empty</div>'),
        renderGroupList: renderGroupListMock,
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        discover_groups: {},
        get_my_groups: {},
        get_group_leaderboard: {},
      }));

      // Set up DOM
      document.body.innerHTML = '<div id="discover-list"></div>';

      const mod = await import('../../src/pages/groups.load.ts');
      await mod.loadDiscover();

      expect(safeRpcMock).toHaveBeenCalledWith(
        'discover_groups',
        { p_limit: 30, p_category: 'sports' },
        expect.anything()
      );
    });

    it('TC3: loadDiscover on RPC error renders renderEmpty fallback in #discover-list', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: new Error('network failure') });
      const renderEmptyMock = vi.fn(() => '<div class="empty-fallback">Could not load groups</div>');

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        activeCategory: null,
        currentUser: null,
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: renderEmptyMock,
        renderGroupList: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        discover_groups: {},
        get_my_groups: {},
        get_group_leaderboard: {},
      }));

      document.body.innerHTML = '<div id="discover-list"></div>';

      const mod = await import('../../src/pages/groups.load.ts');
      await mod.loadDiscover();

      const el = document.getElementById('discover-list')!;
      expect(renderEmptyMock).toHaveBeenCalled();
      expect(el.innerHTML).toContain('Could not load groups');
    });

    it('TC7: loadDiscover JSON-parses string data from RPC and calls renderGroupList', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const fakeGroups = [{ id: 'g-1', name: 'Test Group' }];
      const safeRpcMock = vi.fn().mockResolvedValue({ data: JSON.stringify(fakeGroups), error: null });
      const renderGroupListMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        activeCategory: null,
        currentUser: null,
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: vi.fn(() => '<div>empty</div>'),
        renderGroupList: renderGroupListMock,
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        discover_groups: {},
        get_my_groups: {},
        get_group_leaderboard: {},
      }));

      document.body.innerHTML = '<div id="discover-list"></div>';

      const mod = await import('../../src/pages/groups.load.ts');
      await mod.loadDiscover();

      // _openGroup is null by default (no callback injected); JSON parsing verified by correct groups array
      expect(renderGroupListMock).toHaveBeenCalledWith(
        'discover-list',
        fakeGroups,
        false,
        false,
        null
      );
    });
  });

  // ── loadMyGroups ─────────────────────────────────────────────────────────
  describe('loadMyGroups', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC4: loadMyGroups with currentUser=null renders sign-in prompt without calling safeRpc', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn();
      const renderEmptyMock = vi.fn(() => '<div class="sign-in-prompt">Sign in to see your groups</div>');

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        activeCategory: null,
        currentUser: null,
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: renderEmptyMock,
        renderGroupList: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        discover_groups: {},
        get_my_groups: {},
        get_group_leaderboard: {},
      }));

      document.body.innerHTML = '<div id="mine-list"></div>';

      const mod = await import('../../src/pages/groups.load.ts');
      await mod.loadMyGroups();

      expect(safeRpcMock).not.toHaveBeenCalled();
      const el = document.getElementById('mine-list')!;
      expect(el.innerHTML).toContain('Sign in to see your groups');
    });

    it('TC5: loadMyGroups with user and empty groups array renders empty-group message', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const renderEmptyMock = vi.fn((icon: string, msg: string, _sub: string) => `<div>${msg}</div>`);

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        activeCategory: null,
        currentUser: { id: 'user-abc', email: 'test@test.com' },
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: renderEmptyMock,
        renderGroupList: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        discover_groups: {},
        get_my_groups: {},
        get_group_leaderboard: {},
      }));

      document.body.innerHTML = '<div id="mine-list"></div>';

      const mod = await import('../../src/pages/groups.load.ts');
      await mod.loadMyGroups();

      const el = document.getElementById('mine-list')!;
      expect(el.innerHTML).toContain("haven't joined any groups yet");
    });
  });

  // ── loadLeaderboard ───────────────────────────────────────────────────────
  describe('loadLeaderboard', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC6: loadLeaderboard calls safeRpc("get_group_leaderboard") with p_limit:20; on error renders fallback', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: new Error('db error') });
      const renderEmptyMock = vi.fn(() => '<div class="fallback">Could not load rankings</div>');

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        activeCategory: null,
        currentUser: null,
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: renderEmptyMock,
        renderGroupList: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        discover_groups: {},
        get_my_groups: {},
        get_group_leaderboard: {},
      }));

      document.body.innerHTML = '<div id="leaderboard-list"></div>';

      const mod = await import('../../src/pages/groups.load.ts');
      await mod.loadLeaderboard();

      expect(safeRpcMock).toHaveBeenCalledWith(
        'get_group_leaderboard',
        { p_limit: 20 },
        expect.anything()
      );
      const el = document.getElementById('leaderboard-list')!;
      expect(renderEmptyMock).toHaveBeenCalled();
      expect(el.innerHTML).toContain('Could not load rankings');
    });
  });
});
