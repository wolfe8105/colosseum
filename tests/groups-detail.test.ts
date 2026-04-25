// ============================================================
// GROUPS DETAIL — tests/groups-detail.test.ts
// Source: src/pages/groups.detail.ts
//
// CLASSIFICATION:
//   openGroup():        RPC behavioral — fetches group details, populates DOM
//   updateJoinBtn():    Pure DOM behavioral — sets button state
//   toggleMembership(): RPC behavioral — join/leave group
//
// IMPORTS:
//   { safeRpc }                from '../auth.ts'
//   { get_group_details }      from '../contracts/rpc-schemas.ts'
//   { showToast }              from '../config.ts'
//   { renderGroupBanner }      from './group-banner.ts'
//   { loadGroupHotTakes }      from './groups.feed.ts'
//   { loadGroupMembers }       from './groups.members.ts'
//   { loadGroupChallenges }    from './groups.challenges.ts'
//   { loadPendingAuditions }   from './groups.auditions.ts'
//   state setters              from './groups.state.ts'
//   { switchDetailTab }        from './groups.nav.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc           = vi.hoisted(() => vi.fn());
const mockShowToast         = vi.hoisted(() => vi.fn());
const mockRenderGroupBanner = vi.hoisted(() => vi.fn());
const mockLoadGroupHotTakes = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLoadGroupMembers  = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLoadGroupChallenges = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLoadPendingAuditions = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockSwitchDetailTab   = vi.hoisted(() => vi.fn());

let mockCurrentUser: unknown = null;
let mockCurrentGroupId: string | null = null;
let mockIsMember = false;
let mockCallerRole: string | null = null;

const mockSetCurrentGroupId = vi.hoisted(() => vi.fn((id: string) => { mockCurrentGroupId = id; }));
const mockSetIsMember       = vi.hoisted(() => vi.fn((v: boolean) => { mockIsMember = v; }));
const mockSetCallerRole     = vi.hoisted(() => vi.fn((r: string | null) => { mockCallerRole = r; }));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  onChange: vi.fn(),
  ready: Promise.resolve(),
  getCurrentUser: vi.fn(),
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_group_details: {},
  create_debate_card: {},
  get_unified_feed: {},
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  escapeHTML: (s: string) => s,
  FEATURES: {},
}));

vi.mock('../src/pages/group-banner.ts', () => ({
  renderGroupBanner: mockRenderGroupBanner,
}));

vi.mock('../src/pages/groups.feed.ts', () => ({
  loadGroupHotTakes: mockLoadGroupHotTakes,
  loadGroupFeed: mockLoadGroupHotTakes,
}));

vi.mock('../src/pages/groups.members.ts', () => ({
  loadGroupMembers: mockLoadGroupMembers,
}));

vi.mock('../src/pages/groups.challenges.ts', () => ({
  loadGroupChallenges: mockLoadGroupChallenges,
}));

vi.mock('../src/pages/groups.auditions.ts', () => ({
  loadPendingAuditions: mockLoadPendingAuditions,
  renderAuditionsList: vi.fn(),
}));

vi.mock('../src/pages/groups.state.ts', () => ({
  get currentUser() { return mockCurrentUser; },
  get currentGroupId() { return mockCurrentGroupId; },
  get isMember() { return mockIsMember; },
  get callerRole() { return mockCallerRole; },
  setCurrentGroupId: mockSetCurrentGroupId,
  setIsMember: mockSetIsMember,
  setCallerRole: mockSetCallerRole,
}));

vi.mock('../src/pages/groups.nav.ts', () => ({
  switchDetailTab: mockSwitchDetailTab,
}));

vi.mock('../src/pages/groups.types.ts', () => ({}));

import { updateJoinBtn, toggleMembership } from '../src/pages/groups.detail.ts';
import type { GroupDetail } from '../src/pages/groups.types.ts';

// ── Helpers ───────────────────────────────────────────────────

function makeGroup(overrides: Partial<GroupDetail> = {}): GroupDetail {
  return {
    id: 'g1',
    name: 'Test Group',
    description: 'A test group',
    avatar_emoji: '⚔️',
    member_count: 10,
    elo_rating: 1200,
    is_member: false,
    my_role: null,
    join_mode: 'open',
    shared_fate_pct: 0,
    ...overrides,
  } as GroupDetail;
}

function buildDOM() {
  document.body.innerHTML = `
    <div id="view-lobby" style="display:block"></div>
    <div id="view-detail" style="display:none;"></div>
    <div id="detail-top-name"></div>
    <div id="detail-name">Loading…</div>
    <div id="detail-emoji"></div>
    <div id="detail-desc"></div>
    <div id="detail-members"></div>
    <div id="detail-elo"></div>
    <div id="detail-feed"></div>
    <div id="detail-challenges"></div>
    <div id="detail-members-list"></div>
    <div id="detail-banner"></div>
    <div id="detail-fate"></div>
    <div id="detail-gear-btn" style="display:none"></div>
    <div id="detail-auditions-tab" style="display:none"></div>
    <button id="join-btn" class="join-btn join">JOIN GROUP</button>
    <div id="gvg-challenge-btn" style="display:none"></div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCurrentUser = null;
  mockCurrentGroupId = null;
  mockIsMember = false;
  mockCallerRole = null;
  buildDOM();
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — updateJoinBtn shows SIGN IN when no currentUser', () => {
  it('sets btn text to "SIGN IN TO JOIN" when currentUser is null', () => {
    mockCurrentUser = null;
    updateJoinBtn(makeGroup({ is_member: false }));
    const btn = document.getElementById('join-btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('SIGN IN TO JOIN');
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — updateJoinBtn shows LEAVE GROUP when user is member', () => {
  it('sets btn text to "LEAVE GROUP" when is_member is true', () => {
    mockCurrentUser = { id: 'u1' };
    updateJoinBtn(makeGroup({ is_member: true, my_role: 'member' }));
    const btn = document.getElementById('join-btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('LEAVE GROUP');
    expect(btn.className).toContain('leave');
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — updateJoinBtn shows JOIN GROUP for non-member with open join mode', () => {
  it('sets btn text to "JOIN GROUP" for open group', () => {
    mockCurrentUser = { id: 'u1' };
    updateJoinBtn(makeGroup({ is_member: false, join_mode: 'open' }));
    const btn = document.getElementById('join-btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('JOIN GROUP');
    expect(btn.className).toContain('join');
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — updateJoinBtn hides button for invite_only group', () => {
  it('sets btn style.display to "none" for invite_only mode', () => {
    mockCurrentUser = { id: 'u1' };
    updateJoinBtn(makeGroup({ is_member: false, join_mode: 'invite_only' }));
    const btn = document.getElementById('join-btn') as HTMLButtonElement;
    expect(btn.style.display).toBe('none');
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — updateJoinBtn shows REQUEST AUDITION for audition mode', () => {
  it('sets btn text to "REQUEST AUDITION" for audition mode', () => {
    mockCurrentUser = { id: 'u1' };
    updateJoinBtn(makeGroup({ is_member: false, join_mode: 'audition' }));
    const btn = document.getElementById('join-btn') as HTMLButtonElement;
    expect(btn.textContent).toBe('REQUEST AUDITION');
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — updateJoinBtn disables button for leader', () => {
  it('btn.disabled is true when user is the group leader', () => {
    mockCurrentUser = { id: 'u1' };
    updateJoinBtn(makeGroup({ is_member: true, my_role: 'leader' }));
    const btn = document.getElementById('join-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — toggleMembership calls leave_group when isMember is true', () => {
  it('calls safeRpc("leave_group") when already a member', async () => {
    mockCurrentUser = { id: 'u1' };
    mockCurrentGroupId = 'g1';
    mockIsMember = true;
    mockSafeRpc.mockResolvedValue({ error: null });
    // Need to provide member count in DOM
    (document.getElementById('detail-members') as HTMLElement).textContent = '10';
    await toggleMembership();
    expect(mockSafeRpc).toHaveBeenCalledWith('leave_group', { p_group_id: 'g1' });
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — toggleMembership calls join_group when not a member', () => {
  it('calls safeRpc("join_group") when not a member', async () => {
    mockCurrentUser = { id: 'u1' };
    mockCurrentGroupId = 'g1';
    mockIsMember = false;
    mockSafeRpc.mockResolvedValue({ error: null });
    (document.getElementById('detail-members') as HTMLElement).textContent = '10';
    await toggleMembership();
    expect(mockSafeRpc).toHaveBeenCalledWith('join_group', { p_group_id: 'g1' });
  });
});

// ── TC9 ───────────────────────────────────────────────────────

describe('TC9 — toggleMembership shows error toast on RPC failure', () => {
  it('calls showToast with error type when safeRpc throws', async () => {
    mockCurrentUser = { id: 'u1' };
    mockCurrentGroupId = 'g1';
    mockIsMember = false;
    mockSafeRpc.mockRejectedValue(new Error('network'));
    await toggleMembership();
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/groups.detail.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      '../config.ts',
      './group-banner.ts',
      './groups.feed.ts',
      './groups.members.ts',
      './groups.challenges.ts',
      './groups.auditions.ts',
      './groups.state.ts',
      './groups.nav.ts',
      './groups.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/groups.detail.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
