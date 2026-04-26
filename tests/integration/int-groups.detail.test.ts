/**
 * Integration tests — Seam #459
 * src/pages/groups.detail.ts → groups.auditions
 *
 * Verifies that groups.detail.ts correctly integrates with groups.auditions:
 *   - imports loadPendingAuditions
 *   - shows/hides auditions tab based on join_mode
 *   - updateJoinBtn renders REQUEST AUDITION text for audition join_mode
 *   - openGroup populates DOM and exposes auditions UI when join_mode === 'audition'
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
  })),
}));

// ── ARCH FILTER ───────────────────────────────────────────────────────────────
describe('ARCH: groups.detail.ts → groups.auditions import', () => {
  it('TC0: imports loadPendingAuditions from ./groups.auditions.ts', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.detail.ts', 'utf-8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const auditionsImport = importLines.find(l => l.includes('groups.auditions'));
    expect(auditionsImport).toBeTruthy();
    expect(auditionsImport).toMatch(/loadPendingAuditions/);
  });

  it('TC0b: does NOT import any wall modules', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.detail.ts', 'utf-8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const joined = importLines.join('\n');
    const wallPatterns = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const pat of wallPatterns) {
      expect(joined).not.toContain(pat);
    }
  });
});

// ── openGroup — auditions tab visibility ──────────────────────────────────────
describe('openGroup — auditions tab visibility', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  const BASE_DOM = `
    <div id="view-lobby"></div>
    <div id="view-detail" style="display:none"></div>
    <div id="detail-name"></div>
    <div id="detail-top-name"></div>
    <div id="detail-emoji"></div>
    <div id="detail-desc"></div>
    <div id="detail-members"></div>
    <div id="detail-elo"></div>
    <div id="detail-feed"></div>
    <div id="detail-challenges"></div>
    <div id="detail-members-list"></div>
    <div id="detail-auditions"></div>
    <div id="detail-banner"></div>
    <div id="detail-fate"></div>
    <button id="join-btn"></button>
    <button id="gvg-challenge-btn"></button>
    <button id="detail-gear-btn"></button>
    <div id="detail-auditions-tab" style="display:none"></div>
  `;

  function makeGroupData(overrides: Record<string, unknown> = {}) {
    return {
      id: 'grp-001',
      name: 'Test Group',
      avatar_emoji: '⚔️',
      description: 'A test group',
      member_count: 5,
      elo_rating: 1200,
      is_member: false,
      my_role: null,
      join_mode: 'open',
      shared_fate_pct: 0,
      audition_config: {},
      ...overrides,
    };
  }

  it('TC1: auditions tab is shown when join_mode === "audition"', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeGroup = makeGroupData({ join_mode: 'audition' });
    const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null, currentGroupId: null, isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_group_details: {}, request_audition: {}, get_pending_auditions: {},
    }));

    document.body.innerHTML = BASE_DOM;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-001');

    const audTab = document.getElementById('detail-auditions-tab')!;
    expect(audTab.style.display).toBe('inline-block');
  });

  it('TC2: auditions tab is hidden when join_mode !== "audition"', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeGroup = makeGroupData({ join_mode: 'open' });
    const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null, currentGroupId: null, isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_group_details: {}, request_audition: {}, get_pending_auditions: {},
    }));

    document.body.innerHTML = BASE_DOM;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-001');

    const audTab = document.getElementById('detail-auditions-tab')!;
    expect(audTab.style.display).toBe('none');
  });

  it('TC3: openGroup calls safeRpc("get_group_details") with correct p_group_id', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeGroup = makeGroupData({ join_mode: 'audition' });
    const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null, currentGroupId: null, isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_group_details: {}, request_audition: {}, get_pending_auditions: {},
    }));

    document.body.innerHTML = BASE_DOM;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-special');

    expect(safeRpcMock).toHaveBeenCalledWith(
      'get_group_details',
      { p_group_id: 'grp-special' },
      expect.anything()
    );
  });
});

// ── updateJoinBtn — audition mode ─────────────────────────────────────────────
describe('updateJoinBtn — audition join_mode', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC4: updateJoinBtn shows "REQUEST AUDITION" for non-member with join_mode audition', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: vi.fn() }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: { id: 'user-123' }, currentGroupId: 'grp-aud',
      isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_group_details: {}, request_audition: {}, get_pending_auditions: {},
    }));

    document.body.innerHTML = '<button id="join-btn"></button>';

    const { updateJoinBtn } = await import('../../src/pages/groups.detail.ts');
    updateJoinBtn({
      id: 'grp-aud', name: 'Audition Group', is_member: false,
      join_mode: 'audition', my_role: null,
    } as never);

    const btn = document.getElementById('join-btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('REQUEST AUDITION');
    expect(btn.style.display).toBe('block');
    expect(btn.disabled).toBe(false);
  });

  it('TC5: updateJoinBtn shows "JOIN GROUP" for non-member with join_mode open', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: vi.fn() }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: { id: 'user-123' }, currentGroupId: 'grp-open',
      isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_group_details: {}, request_audition: {}, get_pending_auditions: {},
    }));

    document.body.innerHTML = '<button id="join-btn"></button>';

    const { updateJoinBtn } = await import('../../src/pages/groups.detail.ts');
    updateJoinBtn({
      id: 'grp-open', name: 'Open Group', is_member: false,
      join_mode: 'open', my_role: null,
    } as never);

    const btn = document.getElementById('join-btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('JOIN GROUP');
  });

  it('TC6: updateJoinBtn hides join button for invite_only group', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: vi.fn() }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: { id: 'user-123' }, currentGroupId: 'grp-inv',
      isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_group_details: {}, request_audition: {}, get_pending_auditions: {},
    }));

    document.body.innerHTML = '<button id="join-btn" style="display:block"></button>';

    const { updateJoinBtn } = await import('../../src/pages/groups.detail.ts');
    updateJoinBtn({
      id: 'grp-inv', name: 'Invite Only Group', is_member: false,
      join_mode: 'invite_only', my_role: null,
    } as never);

    const btn = document.getElementById('join-btn') as HTMLButtonElement;
    expect(btn.style.display).toBe('none');
  });
});

// ── toggleMembership — join/leave RPCs ────────────────────────────────────────
describe('toggleMembership — join/leave RPCs with auditions context', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC7: toggleMembership calls safeRpc("join_group") when non-member', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: { id: 'user-abc' }, currentGroupId: 'grp-002',
      isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_group_details: {}, request_audition: {}, get_pending_auditions: {},
    }));

    document.body.innerHTML = `
      <button id="join-btn">JOIN GROUP</button>
      <button id="gvg-challenge-btn" style="display:none"></button>
      <div id="detail-members">10</div>
    `;

    const { toggleMembership } = await import('../../src/pages/groups.detail.ts');
    await toggleMembership();

    expect(safeRpcMock).toHaveBeenCalledWith('join_group', { p_group_id: 'grp-002' });
    const btn = document.getElementById('join-btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('LEAVE GROUP');
  });
});

// ── Seam #515: groups.detail.ts → groups.challenges ──────────────────────────

const BASE_DOM_515 = `
  <div id="view-lobby"></div>
  <div id="view-detail" style="display:none"></div>
  <div id="detail-name"></div>
  <div id="detail-top-name"></div>
  <div id="detail-emoji"></div>
  <div id="detail-desc"></div>
  <div id="detail-members"></div>
  <div id="detail-elo"></div>
  <div id="detail-feed"></div>
  <div id="detail-challenges"></div>
  <div id="detail-members-list"></div>
  <div id="detail-auditions"></div>
  <div id="detail-banner"></div>
  <div id="detail-fate"></div>
  <button id="join-btn"></button>
  <button id="gvg-challenge-btn" style="display:none"></button>
  <button id="detail-gear-btn"></button>
  <div id="detail-auditions-tab" style="display:none"></div>
`;

function makeGroup515(overrides: Record<string, unknown> = {}) {
  return {
    id: 'grp-515',
    name: 'Seam Group',
    avatar_emoji: '⚔️',
    description: 'Seam test',
    member_count: 3,
    elo_rating: 1200,
    is_member: false,
    my_role: null,
    join_mode: 'open',
    shared_fate_pct: 0,
    ...overrides,
  };
}

function makeMocks515(safeRpcMock: ReturnType<typeof vi.fn>, loadGroupChallengesMock: ReturnType<typeof vi.fn>) {
  vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
  vi.doMock('../../src/pages/groups.state.ts', () => ({
    currentUser: null, currentGroupId: null, isMember: false, callerRole: null,
    setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
  }));
  vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
  vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
  vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
  vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: loadGroupChallengesMock }));
  vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
  vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
  vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
  vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
    get_group_details: {}, get_group_challenges: {}, create_group_challenge: {},
    respond_to_group_challenge: {},
  }));
}

describe('ARCH: groups.detail.ts → groups.challenges import (seam #515)', () => {
  it('TC-515-ARCH-1: imports loadGroupChallenges from ./groups.challenges.ts', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.detail.ts', 'utf-8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const challengesImport = importLines.find(l => l.includes('groups.challenges'));
    expect(challengesImport).toBeTruthy();
    expect(challengesImport).toMatch(/loadGroupChallenges/);
  });

  it('TC-515-ARCH-2: groups.challenges.ts import surface contains loadGroupChallenges', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.challenges.ts', 'utf-8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const wallPatterns = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const pat of wallPatterns) {
      expect(importLines.join('\n')).not.toContain(pat);
    }
  });
});

describe('openGroup → loadGroupChallenges wiring (seam #515)', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC-515-1: openGroup calls loadGroupChallenges after successful get_group_details', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeGroup = makeGroup515();
    const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });
    const loadGroupChallengesMock = vi.fn();

    makeMocks515(safeRpcMock, loadGroupChallengesMock);
    document.body.innerHTML = BASE_DOM_515;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-515');

    expect(loadGroupChallengesMock).toHaveBeenCalledTimes(1);
  });

  it('TC-515-2: openGroup passes correct groupId to loadGroupChallenges', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeGroup = makeGroup515({ id: 'grp-unique' });
    const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });
    const loadGroupChallengesMock = vi.fn();

    makeMocks515(safeRpcMock, loadGroupChallengesMock);
    document.body.innerHTML = BASE_DOM_515;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-unique');

    expect(loadGroupChallengesMock).toHaveBeenCalledWith('grp-unique');
  });

  it('TC-515-3: openGroup sets loading placeholder in #detail-challenges before RPC resolves', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    let capturedHtml = '';
    const safeRpcMock = vi.fn().mockImplementation(async () => {
      capturedHtml = document.getElementById('detail-challenges')!.innerHTML;
      return { data: makeGroup515(), error: null };
    });
    const loadGroupChallengesMock = vi.fn();

    makeMocks515(safeRpcMock, loadGroupChallengesMock);
    document.body.innerHTML = BASE_DOM_515;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-515');

    expect(capturedHtml).toContain('loading-state');
  });

  it('TC-515-4: openGroup calls loadGroupChallenges even when get_group_details fails', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: new Error('db fail') });
    const loadGroupChallengesMock = vi.fn();

    makeMocks515(safeRpcMock, loadGroupChallengesMock);
    document.body.innerHTML = BASE_DOM_515;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-err');

    expect(loadGroupChallengesMock).toHaveBeenCalledWith('grp-err');
  });

  it('TC-515-5: openGroup shows #gvg-challenge-btn when is_member is true', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeGroup = makeGroup515({ is_member: true, my_role: 'member' });
    const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });
    const loadGroupChallengesMock = vi.fn();

    makeMocks515(safeRpcMock, loadGroupChallengesMock);
    document.body.innerHTML = BASE_DOM_515;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-member');

    const gvgBtn = document.getElementById('gvg-challenge-btn') as HTMLElement;
    expect(gvgBtn.style.display).toBe('block');
  });

  it('TC-515-6: openGroup hides #gvg-challenge-btn when is_member is false', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeGroup = makeGroup515({ is_member: false });
    const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });
    const loadGroupChallengesMock = vi.fn();

    makeMocks515(safeRpcMock, loadGroupChallengesMock);
    document.body.innerHTML = BASE_DOM_515;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-nonmember');

    const gvgBtn = document.getElementById('gvg-challenge-btn') as HTMLElement;
    expect(gvgBtn.style.display).toBe('none');
  });
});

// ── Seam #514: groups.detail.ts → groups.members ──────────────────────────────

describe('ARCH #514: groups.detail.ts → groups.members import', () => {
  it('TC514-A: imports loadGroupMembers from ./groups.members.ts', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.detail.ts', 'utf-8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const membersImport = importLines.find(l => l.includes('groups.members'));
    expect(membersImport).toBeTruthy();
    expect(membersImport).toMatch(/loadGroupMembers/);
  });
});

const BASE_DOM_514 = `
  <div id="view-lobby"></div>
  <div id="view-detail" style="display:none"></div>
  <div id="detail-name"></div>
  <div id="detail-top-name"></div>
  <div id="detail-emoji"></div>
  <div id="detail-desc"></div>
  <div id="detail-members"></div>
  <div id="detail-elo"></div>
  <div id="detail-feed"></div>
  <div id="detail-challenges"></div>
  <div id="detail-members-list"></div>
  <div id="detail-auditions"></div>
  <div id="detail-banner"></div>
  <div id="detail-fate"></div>
  <button id="join-btn"></button>
  <button id="gvg-challenge-btn"></button>
  <button id="detail-gear-btn"></button>
  <div id="detail-auditions-tab" style="display:none"></div>
`;

function makeGroup514(overrides: Record<string, unknown> = {}) {
  return {
    id: 'grp-514',
    name: 'Seam 514 Group',
    avatar_emoji: '🏟️',
    description: 'Test group for seam 514',
    member_count: 3,
    elo_rating: 1100,
    is_member: false,
    my_role: null,
    join_mode: 'open',
    shared_fate_pct: 0,
    ...overrides,
  };
}

function makeMocks514(
  safeRpcMock: ReturnType<typeof vi.fn>,
  loadGroupMembersMock: ReturnType<typeof vi.fn>,
  isMember = false,
) {
  vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
  vi.doMock('../../src/pages/groups.state.ts', () => ({
    currentUser: { id: 'user-514' },
    currentGroupId: 'grp-514',
    isMember,
    callerRole: null,
    setCurrentGroupId: vi.fn(),
    setIsMember: vi.fn(),
    setCallerRole: vi.fn(),
  }));
  vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
  vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
  vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: loadGroupMembersMock }));
  vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
  vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
  vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
  vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
  vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
    get_group_details: {}, get_group_members: {},
    request_audition: {}, get_pending_auditions: {},
  }));
}

describe('openGroup #514 — calls loadGroupMembers', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC514-B: openGroup calls loadGroupMembers(groupId) after successful RPC', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeGroup = makeGroup514();
    const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });
    const loadGroupMembersMock = vi.fn();

    makeMocks514(safeRpcMock, loadGroupMembersMock);
    document.body.innerHTML = BASE_DOM_514;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-514');

    expect(loadGroupMembersMock).toHaveBeenCalledOnce();
    expect(loadGroupMembersMock).toHaveBeenCalledWith('grp-514');
  });

  it('TC514-C: openGroup sets detail-members-list to loading placeholder before RPC resolves', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    let capturedHtml = '';
    const loadGroupMembersMock = vi.fn();
    const safeRpcMock = vi.fn().mockImplementation(async () => {
      capturedHtml = document.getElementById('detail-members-list')!.innerHTML;
      return { data: makeGroup514(), error: null };
    });

    makeMocks514(safeRpcMock, loadGroupMembersMock);
    document.body.innerHTML = BASE_DOM_514;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-514');

    expect(capturedHtml).toContain('loading-state');
  });

  it('TC514-F: openGroup calls loadGroupMembers even when get_group_details RPC returns an error', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') });
    const loadGroupMembersMock = vi.fn();

    makeMocks514(safeRpcMock, loadGroupMembersMock);
    document.body.innerHTML = BASE_DOM_514;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-514');

    // loadGroupMembers is called unconditionally after try/catch
    expect(loadGroupMembersMock).toHaveBeenCalledOnce();
    expect(loadGroupMembersMock).toHaveBeenCalledWith('grp-514');
  });
});

describe('toggleMembership #514 — calls loadGroupMembers after join/leave', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC514-D: toggleMembership calls loadGroupMembers after successful join', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const loadGroupMembersMock = vi.fn();

    makeMocks514(safeRpcMock, loadGroupMembersMock, /* isMember= */ false);
    document.body.innerHTML = `
      <button id="join-btn">JOIN GROUP</button>
      <button id="gvg-challenge-btn" style="display:none"></button>
      <div id="detail-members">5</div>
    `;

    const { toggleMembership } = await import('../../src/pages/groups.detail.ts');
    await toggleMembership();

    expect(safeRpcMock).toHaveBeenCalledWith('join_group', { p_group_id: 'grp-514' });
    expect(loadGroupMembersMock).toHaveBeenCalledOnce();
    expect(loadGroupMembersMock).toHaveBeenCalledWith('grp-514');
  });

  it('TC514-E: toggleMembership calls loadGroupMembers after successful leave', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const loadGroupMembersMock = vi.fn();

    makeMocks514(safeRpcMock, loadGroupMembersMock, /* isMember= */ true);
    document.body.innerHTML = `
      <button id="join-btn">LEAVE GROUP</button>
      <button id="gvg-challenge-btn" style="display:block"></button>
      <div id="detail-members">6</div>
    `;

    const { toggleMembership } = await import('../../src/pages/groups.detail.ts');
    await toggleMembership();

    expect(safeRpcMock).toHaveBeenCalledWith('leave_group', { p_group_id: 'grp-514' });
    expect(loadGroupMembersMock).toHaveBeenCalledOnce();
    expect(loadGroupMembersMock).toHaveBeenCalledWith('grp-514');
  });
});

// ── Seam #513: groups.detail.ts → groups.nav ─────────────────────────────────
/**
 * Integration tests — Seam #513
 * src/pages/groups.detail.ts → groups.nav
 *
 * Verifies that groups.detail.ts correctly integrates with groups.nav:
 *   - imports switchDetailTab from groups.nav.ts
 *   - openGroup calls switchDetailTab('feed') before RPC resolves
 *   - openGroup shows view-detail / hides view-lobby
 *   - openGroup populates DOM from RPC data
 *   - openGroup sets loading placeholders synchronously
 *   - openGroup fires loadGroupHotTakes, loadGroupChallenges, loadGroupMembers
 *   - updateJoinBtn shows correct text when currentUser is null
 *   - updateJoinBtn shows "LEAVE GROUP" for non-leader member
 */

describe('ARCH #513: groups.detail.ts → groups.nav import', () => {
  it('TC-513-ARCH-1: imports switchDetailTab from ./groups.nav.ts', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.detail.ts', 'utf-8');
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const navImport = importLines.find((l: string) => l.includes('groups.nav'));
    expect(navImport).toBeTruthy();
    expect(navImport).toMatch(/switchDetailTab/);
  });
});

describe('Seam #513: openGroup → switchDetailTab integration', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  const BASE_DOM_513 = `
    <div id="view-lobby"></div>
    <div id="view-detail" style="display:none"></div>
    <div id="detail-name"></div>
    <div id="detail-top-name"></div>
    <div id="detail-emoji"></div>
    <div id="detail-desc"></div>
    <div id="detail-members"></div>
    <div id="detail-elo"></div>
    <div id="detail-feed"></div>
    <div id="detail-challenges"></div>
    <div id="detail-members-list"></div>
    <div id="detail-auditions"></div>
    <div id="detail-banner"></div>
    <div id="detail-fate"></div>
    <button id="join-btn"></button>
    <button id="gvg-challenge-btn"></button>
    <button id="detail-gear-btn"></button>
    <div id="detail-auditions-tab" style="display:none"></div>
    <div id="lobby-tabs"><button class="tab-btn"></button><button class="tab-btn"></button><button class="tab-btn"></button></div>
    <div id="detail-tabs"><button class="tab-btn"></button><button class="tab-btn"></button><button class="tab-btn"></button><button class="tab-btn"></button></div>
  `;

  function makeGroup513(overrides: Record<string, unknown> = {}) {
    return {
      id: 'grp-513',
      name: 'Nav Test Group',
      avatar_emoji: '⚔️',
      description: 'Nav test',
      member_count: 3,
      elo_rating: 1100,
      is_member: false,
      my_role: null,
      join_mode: 'open',
      shared_fate_pct: 0,
      ...overrides,
    };
  }

  it('TC-513-1: openGroup calls switchDetailTab("feed") synchronously before RPC resolves', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const switchDetailTabMock = vi.fn();
    let resolveRpc!: (v: unknown) => void;
    const rpcPending = new Promise((res) => { resolveRpc = res; });
    const safeRpcMock = vi.fn().mockReturnValue(rpcPending);

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null, currentGroupId: null, isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: switchDetailTabMock }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

    document.body.innerHTML = BASE_DOM_513;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    const promise = openGroup('grp-513');
    expect(switchDetailTabMock).toHaveBeenCalledWith('feed');
    resolveRpc({ data: makeGroup513(), error: null });
    await promise;
  });

  it('TC-513-2: openGroup shows view-detail (flex) and hides view-lobby', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeGroup = makeGroup513();
    const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null, currentGroupId: null, isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

    document.body.innerHTML = BASE_DOM_513;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-513');

    expect((document.getElementById('view-lobby') as HTMLElement).style.display).toBe('none');
    expect((document.getElementById('view-detail') as HTMLElement).style.display).toBe('flex');
  });

  it('TC-513-3: openGroup populates detail-name, detail-members, detail-elo from RPC data', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeGroup = makeGroup513({ name: 'Specific Nav Group', member_count: 42, elo_rating: 1337 });
    const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null, currentGroupId: null, isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

    document.body.innerHTML = BASE_DOM_513;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-513');

    expect((document.getElementById('detail-name') as HTMLElement).textContent).toBe('Specific Nav Group');
    expect((document.getElementById('detail-members') as HTMLElement).textContent).toBe('42');
    expect((document.getElementById('detail-elo') as HTMLElement).textContent).toBe('1337');
  });

  it('TC-513-4: openGroup sets "Loading…" placeholder synchronously before RPC resolves', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    let resolveRpc!: (v: unknown) => void;
    const rpcPending = new Promise((res) => { resolveRpc = res; });
    const safeRpcMock = vi.fn().mockReturnValue(rpcPending);

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null, currentGroupId: null, isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

    document.body.innerHTML = BASE_DOM_513;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    const promise = openGroup('grp-513');

    expect((document.getElementById('detail-name') as HTMLElement).textContent).toBe('Loading…');

    resolveRpc({ data: makeGroup513(), error: null });
    await promise;
  });

  it('TC-513-5: openGroup calls loadGroupHotTakes, loadGroupChallenges, loadGroupMembers after RPC', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeGroup = makeGroup513();
    const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });
    const loadGroupHotTakesMock = vi.fn();
    const loadGroupChallengesMock = vi.fn();
    const loadGroupMembersMock = vi.fn();

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null, currentGroupId: null, isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: loadGroupHotTakesMock }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: loadGroupMembersMock }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: loadGroupChallengesMock }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

    document.body.innerHTML = BASE_DOM_513;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-513');

    expect(loadGroupHotTakesMock).toHaveBeenCalledWith('grp-513');
    expect(loadGroupChallengesMock).toHaveBeenCalledWith('grp-513');
    expect(loadGroupMembersMock).toHaveBeenCalledWith('grp-513');
  });

  it('TC-513-6: updateJoinBtn sets text "SIGN IN TO JOIN" when currentUser is null', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: vi.fn() }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null, currentGroupId: null, isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
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

    const { updateJoinBtn } = await import('../../src/pages/groups.detail.ts');
    updateJoinBtn({ id: 'grp-x', name: 'X', is_member: false, join_mode: 'open', my_role: null } as never);

    const btn = document.getElementById('join-btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('SIGN IN TO JOIN');
    expect(btn.disabled).toBe(false);
  });

  it('TC-513-7: updateJoinBtn sets "LEAVE GROUP" and enabled for non-leader member', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: vi.fn() }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: { id: 'user-123' }, currentGroupId: 'grp-m',
      isMember: true, callerRole: 'member',
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
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

    const { updateJoinBtn } = await import('../../src/pages/groups.detail.ts');
    updateJoinBtn({ id: 'grp-m', name: 'M', is_member: true, join_mode: 'open', my_role: 'member' } as never);

    const btn = document.getElementById('join-btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('LEAVE GROUP');
    expect(btn.disabled).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Seam #561 — src/pages/groups.detail.ts → groups.feed
// ═══════════════════════════════════════════════════════════════════════════════

describe('ARCH #561: groups.detail.ts → groups.feed import', () => {
  it('TC-561-0: imports loadGroupHotTakes from ./groups.feed.ts', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.detail.ts', 'utf-8');
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const feedImport = importLines.find((l: string) => l.includes('groups.feed'));
    expect(feedImport).toBeTruthy();
    expect(feedImport).toMatch(/loadGroupHotTakes/);
  });

  it('TC-561-0b: groups.feed.ts exports loadGroupHotTakes as alias for loadGroupFeed', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.feed.ts', 'utf-8');
    expect(src).toMatch(/export\s+const\s+loadGroupHotTakes\s*=\s*loadGroupFeed/);
  });
});

describe('INT #561: groups.detail.ts → groups.feed — openGroup calls loadGroupHotTakes', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('TC-561-1: openGroup calls loadGroupHotTakes with the groupId', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const loadGroupHotTakes = vi.fn();
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({
        data: {
          id: 'grp-1', name: 'Test', avatar_emoji: '⚔️', description: 'desc',
          member_count: 5, elo_rating: 1200, is_member: false, my_role: null,
          join_mode: 'open', shared_fate_pct: 0,
        },
        error: null,
      }),
    }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null, currentGroupId: null,
      isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: vi.fn() }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

    document.body.innerHTML = `
      <div id="view-lobby"></div><div id="view-detail"></div>
      <div id="detail-name"></div><div id="detail-emoji"></div>
      <div id="detail-desc"></div><div id="detail-members"></div>
      <div id="detail-elo"></div><div id="detail-feed"></div>
      <div id="detail-challenges"></div><div id="detail-members-list"></div>
      <div id="detail-top-name"></div>
      <button id="join-btn"></button>
      <button id="gvg-challenge-btn"></button>
    `;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-1');

    expect(loadGroupHotTakes).toHaveBeenCalledWith('grp-1');
  });

  it('TC-561-2: loadGroupFeed renders feed cards when get_unified_feed returns data', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockCard = {
      id: 'card-1', content: 'Hot take here', category: 'grp-1',
      status: 'open', side_a_user: null, side_b_user: null,
      reaction_count: 0, created_at: new Date().toISOString(),
    };
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: [mockCard], error: null }),
    }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null,
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s, showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: {} }));
    vi.doMock('../../src/pages/groups.utils.ts', () => ({ renderEmpty: vi.fn(() => '<div class="empty"></div>') }));
    vi.doMock('../../src/feed-card.ts', () => ({
      renderFeedCard: vi.fn(() => '<div class="feed-card">card</div>'),
      renderFeedEmpty: vi.fn(() => '<div class="feed-empty"></div>'),
    }));
    // Provide real implementation for groups.feed.ts by re-exporting via importActual
    vi.doMock('../../src/pages/groups.feed.ts', async () => {
      const actual = await vi.importActual<typeof import('../../src/pages/groups.feed.ts')>('../../src/pages/groups.feed.ts');
      return actual;
    });

    document.body.innerHTML = '<div id="detail-feed"></div>';

    const { loadGroupFeed } = await import('../../src/pages/groups.feed.ts');
    await loadGroupFeed('grp-1');

    const container = document.getElementById('detail-feed')!;
    expect(container.innerHTML).toContain('feed-card');
  });

  it('TC-561-3: loadGroupFeed renders empty state when get_unified_feed returns empty array', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null,
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s, showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: {} }));
    vi.doMock('../../src/pages/groups.utils.ts', () => ({ renderEmpty: vi.fn(() => '<div class="empty-state">No posts yet</div>') }));
    vi.doMock('../../src/feed-card.ts', () => ({
      renderFeedCard: vi.fn(),
      renderFeedEmpty: vi.fn(),
    }));
    vi.doMock('../../src/pages/groups.feed.ts', async () => {
      const actual = await vi.importActual<typeof import('../../src/pages/groups.feed.ts')>('../../src/pages/groups.feed.ts');
      return actual;
    });

    document.body.innerHTML = '<div id="detail-feed"></div>';

    const { loadGroupFeed } = await import('../../src/pages/groups.feed.ts');
    await loadGroupFeed('grp-1');

    const container = document.getElementById('detail-feed')!;
    expect(container.innerHTML).toContain('No posts yet');
  });

  it('TC-561-4: loadGroupFeed renders error state when RPC throws', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockRejectedValue(new Error('Network error')),
    }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null,
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s, showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: {} }));
    vi.doMock('../../src/pages/groups.utils.ts', () => ({ renderEmpty: vi.fn((_e: string, title: string) => `<div class="error-state">${title}</div>`) }));
    vi.doMock('../../src/feed-card.ts', () => ({
      renderFeedCard: vi.fn(),
      renderFeedEmpty: vi.fn(),
    }));
    vi.doMock('../../src/pages/groups.feed.ts', async () => {
      const actual = await vi.importActual<typeof import('../../src/pages/groups.feed.ts')>('../../src/pages/groups.feed.ts');
      return actual;
    });

    document.body.innerHTML = '<div id="detail-feed"></div>';

    const { loadGroupFeed } = await import('../../src/pages/groups.feed.ts');
    await loadGroupFeed('grp-1');

    const container = document.getElementById('detail-feed')!;
    expect(container.innerHTML).toContain('Could not load feed');
  });

  it('TC-561-5: postGroupCard calls create_debate_card with correct params and reloads feed', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: { id: 'user-abc' },
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s, showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: {} }));
    vi.doMock('../../src/pages/groups.utils.ts', () => ({ renderEmpty: vi.fn(() => '') }));
    vi.doMock('../../src/feed-card.ts', () => ({
      renderFeedCard: vi.fn(() => '<div class="feed-card"></div>'),
      renderFeedEmpty: vi.fn(() => ''),
    }));
    vi.doMock('../../src/pages/groups.feed.ts', async () => {
      const actual = await vi.importActual<typeof import('../../src/pages/groups.feed.ts')>('../../src/pages/groups.feed.ts');
      return actual;
    });

    document.body.innerHTML = `
      <div id="detail-feed"></div>
      <textarea id="group-take-input">My hot take</textarea>
      <button id="group-take-post">POST</button>
      <span id="group-take-count">13/280</span>
    `;

    const { postGroupCard } = await import('../../src/pages/groups.feed.ts');
    await postGroupCard('grp-post');

    const createCall = safeRpcMock.mock.calls.find(
      (c: unknown[]) => (c as [string])[0] === 'create_debate_card'
    );
    expect(createCall).toBeTruthy();
    expect((createCall as [string, Record<string, string>])[1]).toMatchObject({
      p_content: 'My hot take',
      p_category: 'grp-post',
    });
  });

  it('TC-561-6: postGroupCard redirects unauthenticated users to plinko', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: vi.fn() }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null,
    }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s, showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: {} }));
    vi.doMock('../../src/pages/groups.utils.ts', () => ({ renderEmpty: vi.fn(() => '') }));
    vi.doMock('../../src/feed-card.ts', () => ({
      renderFeedCard: vi.fn(),
      renderFeedEmpty: vi.fn(),
    }));
    vi.doMock('../../src/pages/groups.feed.ts', async () => {
      const actual = await vi.importActual<typeof import('../../src/pages/groups.feed.ts')>('../../src/pages/groups.feed.ts');
      return actual;
    });

    document.body.innerHTML = `
      <div id="detail-feed"></div>
      <textarea id="group-take-input">My hot take</textarea>
      <button id="group-take-post">POST</button>
      <span id="group-take-count">13/280</span>
    `;

    // Capture redirect
    let redirectHref = '';
    Object.defineProperty(window, 'location', {
      value: { pathname: '/moderator-groups.html', href: '' },
      writable: true,
    });
    Object.defineProperty(window.location, 'href', {
      set(v: string) { redirectHref = v; },
      get() { return ''; },
    });

    const { postGroupCard } = await import('../../src/pages/groups.feed.ts');
    await postGroupCard('grp-redirect');

    expect(redirectHref).toContain('moderator-plinko.html');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Seam #562 — src/pages/groups.detail.ts → group-banner
// ═══════════════════════════════════════════════════════════════════════════════

describe('ARCH #562: groups.detail.ts → group-banner import', () => {
  it('TC562-1: imports renderGroupBanner from ./group-banner.ts', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.detail.ts', 'utf-8');
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const bannerImport = importLines.find((l: string) => l.includes('group-banner'));
    expect(bannerImport).toBeTruthy();
    expect(bannerImport).toMatch(/renderGroupBanner/);
  });
});

const BASE_DOM_562 = `
  <div id="view-lobby"></div>
  <div id="view-detail" style="display:none"></div>
  <div id="detail-name"></div>
  <div id="detail-top-name"></div>
  <div id="detail-emoji"></div>
  <div id="detail-desc"></div>
  <div id="detail-members"></div>
  <div id="detail-elo"></div>
  <div id="detail-feed"></div>
  <div id="detail-challenges"></div>
  <div id="detail-members-list"></div>
  <div id="detail-auditions"></div>
  <div id="detail-banner"></div>
  <div id="detail-fate"></div>
  <button id="join-btn"></button>
  <button id="gvg-challenge-btn"></button>
  <button id="detail-gear-btn"></button>
  <div id="detail-auditions-tab" style="display:none"></div>
`;

function makeGroup562(overrides: Record<string, unknown> = {}) {
  return {
    id: 'grp-562',
    name: 'Banner Group',
    avatar_emoji: '🏆',
    description: 'Banner seam test group',
    member_count: 10,
    elo_rating: 1300,
    is_member: false,
    my_role: null,
    join_mode: 'open',
    shared_fate_pct: 0,
    banner_tier: 1,
    banner_static_url: null,
    banner_animated_url: null,
    gvg_wins: 5,
    gvg_losses: 2,
    ...overrides,
  };
}

describe('INT #562: openGroup → renderGroupBanner', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC562-2: openGroup calls renderGroupBanner with bannerEl and isLeader=false for non-leader member', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeGroup = makeGroup562({ my_role: 'member', is_member: true });
    const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });
    const renderBannerMock = vi.fn();

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: { id: 'u1' }, currentGroupId: null, isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: renderBannerMock }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

    document.body.innerHTML = BASE_DOM_562;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-562');

    expect(renderBannerMock).toHaveBeenCalledOnce();
    const [bannerEl, groupArg, isLeaderArg] = renderBannerMock.mock.calls[0];
    expect(bannerEl).toBe(document.getElementById('detail-banner'));
    expect(groupArg.id).toBe('grp-562');
    expect(isLeaderArg).toBe(false);
  });

  it('TC562-3: openGroup calls renderGroupBanner with isLeader=true for leader role', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeGroup = makeGroup562({ my_role: 'leader', is_member: true });
    const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });
    const renderBannerMock = vi.fn();

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: { id: 'u1' }, currentGroupId: null, isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: renderBannerMock }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

    document.body.innerHTML = BASE_DOM_562;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-562');

    expect(renderBannerMock).toHaveBeenCalledOnce();
    const [, , isLeaderArg] = renderBannerMock.mock.calls[0];
    expect(isLeaderArg).toBe(true);
  });

  it('TC562-4: openGroup calls renderGroupBanner with isLeader=true for co_leader role', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeGroup = makeGroup562({ my_role: 'co_leader', is_member: true });
    const safeRpcMock = vi.fn().mockResolvedValue({ data: fakeGroup, error: null });
    const renderBannerMock = vi.fn();

    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: { id: 'u1' }, currentGroupId: null, isMember: false, callerRole: null,
      setCurrentGroupId: vi.fn(), setIsMember: vi.fn(), setCallerRole: vi.fn(),
    }));
    vi.doMock('../../src/pages/group-banner.ts', () => ({ renderGroupBanner: renderBannerMock }));
    vi.doMock('../../src/pages/groups.feed.ts', () => ({ loadGroupHotTakes: vi.fn() }));
    vi.doMock('../../src/pages/groups.members.ts', () => ({ loadGroupMembers: vi.fn() }));
    vi.doMock('../../src/pages/groups.challenges.ts', () => ({ loadGroupChallenges: vi.fn() }));
    vi.doMock('../../src/pages/groups.auditions.ts', () => ({ loadPendingAuditions: vi.fn() }));
    vi.doMock('../../src/pages/groups.nav.ts', () => ({ switchDetailTab: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ showToast: vi.fn() }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ get_group_details: {} }));

    document.body.innerHTML = BASE_DOM_562;

    const { openGroup } = await import('../../src/pages/groups.detail.ts');
    await openGroup('grp-562');

    expect(renderBannerMock).toHaveBeenCalledOnce();
    const [, , isLeaderArg] = renderBannerMock.mock.calls[0];
    expect(isLeaderArg).toBe(true);
  });
});

describe('UNIT #562: renderGroupBanner', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC562-5: tier-1 fallback renders emoji and name inside container', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Override any prior mock factory for group-banner.ts so we get the real module
    vi.doMock('../../src/pages/group-banner.ts', async () => vi.importActual('../../src/pages/group-banner.ts'));
    vi.doMock('../../src/pages/group-banner-css.ts', () => ({ injectGroupBannerCSS: vi.fn() }));
    vi.doMock('../../src/pages/group-banner-upload.ts', () => ({ openBannerUploadSheet: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
      showToast: vi.fn(),
    }));

    const { renderGroupBanner } = await import('../../src/pages/group-banner.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);

    const group = makeGroup562({ banner_tier: 1, banner_static_url: null, banner_animated_url: null, avatar_emoji: '🏆', name: 'BannerTest' });
    renderGroupBanner(container, group as never, false);

    expect(container.querySelector('.group-banner-t1')).toBeTruthy();
    expect(container.querySelector('.group-banner-t1-emoji')!.textContent).toBe('🏆');
    expect(container.querySelector('.group-banner-t1-name')!.textContent).toBe('BannerTest');
  });

  it('TC562-6: tier-2 with staticUrl creates an img element with correct src', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/pages/group-banner.ts', async () => vi.importActual('../../src/pages/group-banner.ts'));
    vi.doMock('../../src/pages/group-banner-css.ts', () => ({ injectGroupBannerCSS: vi.fn() }));
    vi.doMock('../../src/pages/group-banner-upload.ts', () => ({ openBannerUploadSheet: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
      showToast: vi.fn(),
    }));

    const { renderGroupBanner } = await import('../../src/pages/group-banner.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);

    const group = makeGroup562({ banner_tier: 2, banner_static_url: 'https://example.com/banner.jpg', name: 'ImgGroup' });
    renderGroupBanner(container, group as never, false);

    const img = container.querySelector('img.group-banner-t2') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain('banner.jpg');
    expect(img.alt).toBe('ImgGroup');
  });

  it('TC562-7: isLeader=true appends edit button; isLeader=false does not', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/pages/group-banner.ts', async () => vi.importActual('../../src/pages/group-banner.ts'));
    vi.doMock('../../src/pages/group-banner-css.ts', () => ({ injectGroupBannerCSS: vi.fn() }));
    vi.doMock('../../src/pages/group-banner-upload.ts', () => ({ openBannerUploadSheet: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
      showToast: vi.fn(),
    }));

    const { renderGroupBanner } = await import('../../src/pages/group-banner.ts');

    const containerLeader = document.createElement('div');
    const containerMember = document.createElement('div');
    document.body.appendChild(containerLeader);
    document.body.appendChild(containerMember);

    const group = makeGroup562({ banner_tier: 1, id: 'grp-562' });
    renderGroupBanner(containerLeader, group as never, true);
    renderGroupBanner(containerMember, group as never, false);

    expect(containerLeader.querySelector('.group-banner-edit-btn')).toBeTruthy();
    expect(containerMember.querySelector('.group-banner-edit-btn')).toBeNull();
  });
});
