// ============================================================
// GK — F-17 GROUP ENTRY REQUIREMENTS
// tests/gk-groups-detail.test.ts
// Source: src/pages/groups.detail.ts
//
// SPEC: docs/THE-MODERATOR-PUNCH-LIST.md row F-17
//   Active only when join_mode = 'requirements'.
//   Three gates: min global Elo, min staking tier, profile_complete.
//   AND logic across all set gates.
//   Non-members on a gated group: see member list, Join button HIDDEN ENTIRELY.
//   No explanation of why — prevents gate-farming.
//   Enforced inside join_group RPC (single entry point).
//   Generic client error message; specific failure stays server-side.
//   Stored as JSONB on groups.entry_requirements.
//
// TC-F17-1  updateJoinBtn hides Join button entirely for requirements-mode non-member
// TC-F17-2  updateJoinBtn shows Join button for open-mode non-member (control case)
// TC-F17-3  toggleMembership calls join_group as sole RPC — no client-side gate check
// TC-F17-4  toggleMembership shows generic error toast on join_group failure
// ARCH      src/pages/groups.detail.ts only imports from the allowed list
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc             = vi.hoisted(() => vi.fn());
const mockShowToast           = vi.hoisted(() => vi.fn());
const mockRenderGroupBanner   = vi.hoisted(() => vi.fn());
const mockLoadGroupHotTakes   = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLoadGroupMembers    = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLoadGroupChallenges = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLoadPendingAuditions = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockSwitchDetailTab     = vi.hoisted(() => vi.fn());

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
  get currentUser()   { return mockCurrentUser; },
  get currentGroupId() { return mockCurrentGroupId; },
  get isMember()      { return mockIsMember; },
  get callerRole()    { return mockCallerRole; },
  setCurrentGroupId:  mockSetCurrentGroupId,
  setIsMember:        mockSetIsMember,
  setCallerRole:      mockSetCallerRole,
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

// ── TC-F17-1 ─────────────────────────────────────────────────
// Spec: "Non-members on a gated group see member list but the Join button
// is hidden entirely — no explanation of why, prevents gate-farming."
// When join_mode = 'requirements' and user is not a member,
// updateJoinBtn must set btn.style.display = 'none'.

describe('TC-F17-1 — updateJoinBtn hides Join button entirely for requirements-mode non-member', () => {
  it('btn.style.display is "none" when join_mode is requirements and user is not a member', () => {
    mockCurrentUser = { id: 'u1' };
    updateJoinBtn(makeGroup({ is_member: false, join_mode: 'requirements' }));
    const btn = document.getElementById('join-btn') as HTMLButtonElement;
    expect(btn.style.display).toBe('none');
  });
});

// ── TC-F17-2 ─────────────────────────────────────────────────
// Spec: Entry requirements are active only when join_mode = 'requirements'.
// Open-mode non-member must still see the Join button (control case).

describe('TC-F17-2 — updateJoinBtn shows Join button for open-mode non-member (control)', () => {
  it('btn.style.display is not "none" when join_mode is open and user is not a member', () => {
    mockCurrentUser = { id: 'u1' };
    updateJoinBtn(makeGroup({ is_member: false, join_mode: 'open' }));
    const btn = document.getElementById('join-btn') as HTMLButtonElement;
    expect(btn.style.display).not.toBe('none');
    expect(btn.textContent).toBe('JOIN GROUP');
  });
});

// ── TC-F17-3 ─────────────────────────────────────────────────
// Spec: "Enforced inside join_group RPC (single entry point)."
// toggleMembership must call safeRpc exactly once, with 'join_group',
// and must not make any pre-flight RPC to evaluate gates client-side.

describe('TC-F17-3 — toggleMembership calls join_group as sole RPC — no client gate check', () => {
  it('calls safeRpc exactly once with join_group and p_group_id when non-member joins', async () => {
    mockCurrentUser = { id: 'u1' };
    mockCurrentGroupId = 'g1';
    mockIsMember = false;
    mockSafeRpc.mockResolvedValue({ error: null });
    (document.getElementById('detail-members') as HTMLElement).textContent = '5';
    await toggleMembership();
    expect(mockSafeRpc).toHaveBeenCalledOnce();
    expect(mockSafeRpc).toHaveBeenCalledWith('join_group', { p_group_id: 'g1' });
  });
});

// ── TC-F17-4 ─────────────────────────────────────────────────
// Spec: "Generic client error message; specific failure stays server-side."
// On join_group error, the client must show a toast with 'error' severity.
// The client must NOT inspect entry_requirements to construct a specific
// gate-failure explanation — any string message is acceptable (generic).

describe('TC-F17-4 — toggleMembership shows generic error toast on join_group failure', () => {
  it('calls showToast with a string message and error severity when join_group fails', async () => {
    mockCurrentUser = { id: 'u1' };
    mockCurrentGroupId = 'g1';
    mockIsMember = false;
    mockSafeRpc.mockResolvedValue({ error: new Error('min_elo_not_met') });
    await toggleMembership();
    expect(mockShowToast).toHaveBeenCalledOnce();
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
