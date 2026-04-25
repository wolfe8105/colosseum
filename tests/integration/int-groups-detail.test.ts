// int-groups-detail.test.ts
// Seam #156 — src/pages/groups.detail.ts → groups.state
// Tests: openGroup, updateJoinBtn, toggleMembership — state reads and safeRpc calls.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// ── ARCH ──────────────────────────────────────────────────────────────────────
describe('Seam #156 — groups.detail.ts → groups.state', () => {
  it('ARCH: groups.detail.ts imports currentUser, isMember, callerRole and setters from ./groups.state.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/pages/groups.detail.ts?raw');
    const raw: string = (src as unknown as { default: string }).default;
    // Collapse multi-line import blocks into single lines for matching
    const collapsed = raw.replace(/\{[^}]*\}/gs, (m) => m.replace(/\s+/g, ' '));
    const lines: string[] = collapsed
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasStateImport = lines.some(
      (l: string) =>
        l.includes('./groups.state') &&
        l.includes('currentUser') &&
        l.includes('isMember') &&
        l.includes('setCurrentGroupId')
    );
    expect(hasStateImport).toBe(true);
  });

  // ── openGroup ────────────────────────────────────────────────────────────
  describe('openGroup', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC2: openGroup calls safeRpc("get_group_details", { p_group_id }) and populates #detail-name', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const fakeGroup = {
        id: 'group-abc',
        name: 'Test Debaters',
        avatar_emoji: '🔥',
        description: 'Hot takes only',
        member_count: 12,
        elo_rating: 1350,
        is_member: false,
        my_role: null,
        join_mode: 'open',
        shared_fate_pct: 0,
      };
      const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: null,
        currentGroupId: null,
        isMember: false,
        callerRole: null,
        setCurrentGroupId: vi.fn(),
        setIsMember: vi.fn(),
        setCallerRole: vi.fn(),
      }));
      vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
      vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
      vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
      vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
      vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
      vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
      vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

      document.body.innerHTML = `
        <div id="view-lobby"></div>
        <div id="view-detail"></div>
        <div id="detail-name"></div>
        <div id="detail-emoji"></div>
        <div id="detail-desc"></div>
        <div id="detail-members"></div>
        <div id="detail-elo"></div>
        <div id="detail-feed"></div>
        <div id="detail-challenges"></div>
        <div id="detail-members-list"></div>
        <button id="gvg-challenge-btn"></button>
        <button id="join-btn"></button>
        <div id="detail-top-name"></div>
      `;

      const mod = await import('../../src/pages/groups.detail.ts');
      await mod.openGroup('group-abc');

      expect(safeRpcMock).toHaveBeenCalledWith(
        'get_group_details',
        { p_group_id: 'group-abc' },
        expect.anything()
      );
      expect(document.getElementById('detail-name')!.textContent).toBe('Test Debaters');
    });

    it('TC3: openGroup on RPC error sets #detail-name to "Error loading group"', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: new Error('db timeout') });

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: null,
        currentGroupId: null,
        isMember: false,
        callerRole: null,
        setCurrentGroupId: vi.fn(),
        setIsMember: vi.fn(),
        setCallerRole: vi.fn(),
      }));
      vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
      vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
      vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
      vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
      vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
      vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
      vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

      document.body.innerHTML = `
        <div id="view-lobby"></div>
        <div id="view-detail"></div>
        <div id="detail-name"></div>
        <div id="detail-emoji"></div>
        <div id="detail-desc"></div>
        <div id="detail-members"></div>
        <div id="detail-elo"></div>
        <div id="detail-feed"></div>
        <div id="detail-challenges"></div>
        <div id="detail-members-list"></div>
        <button id="gvg-challenge-btn"></button>
        <button id="join-btn"></button>
        <div id="detail-top-name"></div>
      `;

      const mod = await import('../../src/pages/groups.detail.ts');
      await mod.openGroup('group-bad');

      expect(document.getElementById('detail-name')!.textContent).toBe('Error loading group');
    });
  });

  // ── updateJoinBtn ─────────────────────────────────────────────────────────
  describe('updateJoinBtn', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC4: updateJoinBtn with no currentUser sets button to "SIGN IN TO JOIN"', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: vi.fn() }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: null,
        currentGroupId: null,
        isMember: false,
        callerRole: null,
        setCurrentGroupId: vi.fn(),
        setIsMember: vi.fn(),
        setCallerRole: vi.fn(),
      }));
      vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
      vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
      vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
      vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
      vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
      vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
      vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

      document.body.innerHTML = '<button id="join-btn"></button>';

      const mod = await import('../../src/pages/groups.detail.ts');
      const fakeGroup = {
        id: 'g-1', name: 'G', is_member: false, my_role: null, join_mode: 'open',
      } as Parameters<typeof mod.updateJoinBtn>[0];
      mod.updateJoinBtn(fakeGroup);

      const btn = document.getElementById('join-btn') as HTMLButtonElement;
      expect(btn.textContent).toBe('SIGN IN TO JOIN');
      expect(btn.className).toContain('join');
    });

    it('TC5: updateJoinBtn — is_member=true, my_role="leader" disables btn with "YOU OWN THIS GROUP"', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: vi.fn() }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: { id: 'user-leader', email: 'leader@test.com' },
        currentGroupId: 'g-leader',
        isMember: true,
        callerRole: 'leader',
        setCurrentGroupId: vi.fn(),
        setIsMember: vi.fn(),
        setCallerRole: vi.fn(),
      }));
      vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
      vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
      vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
      vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
      vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
      vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
      vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

      document.body.innerHTML = '<button id="join-btn"></button>';

      const mod = await import('../../src/pages/groups.detail.ts');
      const fakeGroup = {
        id: 'g-leader', name: 'Leaders', is_member: true, my_role: 'leader', join_mode: 'open',
      } as Parameters<typeof mod.updateJoinBtn>[0];
      mod.updateJoinBtn(fakeGroup);

      const btn = document.getElementById('join-btn') as HTMLButtonElement;
      expect(btn.textContent).toBe('YOU OWN THIS GROUP');
      expect(btn.disabled).toBe(true);
      expect(btn.className).toContain('leave');
    });
  });

  // ── toggleMembership ──────────────────────────────────────────────────────
  describe('toggleMembership', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC6: toggleMembership — isMember=true calls safeRpc("leave_group") and hides gvg-challenge-btn', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
      const setIsMemberMock = vi.fn();
      const setCallerRoleMock = vi.fn();
      const loadGroupMembersMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: { id: 'user-member', email: 'member@test.com' },
        currentGroupId: 'group-xyz',
        isMember: true,
        callerRole: 'member',
        setCurrentGroupId: vi.fn(),
        setIsMember: setIsMemberMock,
        setCallerRole: setCallerRoleMock,
      }));
      vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
      vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
      vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: loadGroupMembersMock }));
      vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
      vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
      vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
      vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

      document.body.innerHTML = `
        <button id="join-btn">LEAVE GROUP</button>
        <button id="gvg-challenge-btn" style="display:block"></button>
        <div id="detail-members">5</div>
      `;

      const mod = await import('../../src/pages/groups.detail.ts');
      await mod.toggleMembership();

      expect(safeRpcMock).toHaveBeenCalledWith('leave_group', { p_group_id: 'group-xyz' });
      expect(setIsMemberMock).toHaveBeenCalledWith(false);
      expect(setCallerRoleMock).toHaveBeenCalledWith(null);
      expect((document.getElementById('gvg-challenge-btn') as HTMLElement).style.display).toBe('none');
      expect(loadGroupMembersMock).toHaveBeenCalledWith('group-xyz');
    });

    it('TC7: toggleMembership — isMember=false calls safeRpc("join_group") and shows gvg-challenge-btn', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
      const setIsMemberMock = vi.fn();
      const setCallerRoleMock = vi.fn();
      const loadGroupMembersMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: { id: 'user-guest', email: 'guest@test.com' },
        currentGroupId: 'group-xyz',
        isMember: false,
        callerRole: null,
        setCurrentGroupId: vi.fn(),
        setIsMember: setIsMemberMock,
        setCallerRole: setCallerRoleMock,
      }));
      vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
      vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
      vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: loadGroupMembersMock }));
      vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
      vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
      vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
      vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

      document.body.innerHTML = `
        <button id="join-btn">JOIN GROUP</button>
        <button id="gvg-challenge-btn" style="display:none"></button>
        <div id="detail-members">4</div>
      `;

      const mod = await import('../../src/pages/groups.detail.ts');
      await mod.toggleMembership();

      expect(safeRpcMock).toHaveBeenCalledWith('join_group', { p_group_id: 'group-xyz' });
      expect(setIsMemberMock).toHaveBeenCalledWith(true);
      expect(setCallerRoleMock).toHaveBeenCalledWith('member');
      expect((document.getElementById('gvg-challenge-btn') as HTMLElement).style.display).toBe('block');
      expect(loadGroupMembersMock).toHaveBeenCalledWith('group-xyz');
    });
  });
});
