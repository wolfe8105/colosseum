// ============================================================
// GROUPS CHALLENGES — tests/groups-challenges.test.ts
// Source: src/pages/groups.challenges.ts
//
// CLASSIFICATION:
//   openGvGModal():         DOM behavioral — opens modal, resets state
//   closeGvGModal():        DOM behavioral — removes open class
//   loadGroupChallenges():  RPC behavioral — fetches and renders challenges
//   respondToChallenge():   RPC behavioral — accept/decline
//   submitGroupChallenge(): RPC behavioral — sends challenge
//   clearGvGOpponent():     DOM behavioral
//
// IMPORTS:
//   { sb, currentUser, currentGroupId, isMember } from './groups.state.ts'
//   { escapeHTML, showToast }                      from '../config.ts'
//   { safeRpc }                                    from '../auth.ts'
//   { get_group_challenges, create_group_challenge, respond_to_group_challenge }
//                                                  from '../contracts/rpc-schemas.ts'
//   { renderEmpty }                                from './groups.utils.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc   = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [], error: null }));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockRenderEmpty = vi.hoisted(() => vi.fn(() => '<div class="empty-state"></div>'));

let mockCurrentUser: unknown = { id: 'u1' };
let mockCurrentGroupId: string | null = 'g1';
let mockIsMember = true;
const mockSb = vi.hoisted(() => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    ilike:  vi.fn().mockReturnThis(),
    neq:    vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    limit:  vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
}));

vi.mock('../src/pages/groups.state.ts', () => ({
  get sb()            { return mockSb; },
  get currentUser()   { return mockCurrentUser; },
  get currentGroupId(){ return mockCurrentGroupId; },
  get isMember()      { return mockIsMember; },
  currentGroupData: null,
  setCurrentGroupId: vi.fn(),
  setIsMember: vi.fn(),
  setCallerRole: vi.fn(),
  callerRole: null,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: (s: string) => s,
  showToast: mockShowToast,
  FEATURES: {},
}));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  onChange: vi.fn(),
  ready: Promise.resolve(),
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_group_challenges:       {},
  create_group_challenge:     {},
  respond_to_group_challenge: {},
  get_unified_feed: {},
}));

vi.mock('../src/pages/groups.utils.ts', () => ({
  renderEmpty: mockRenderEmpty,
}));

import {
  openGvGModal,
  closeGvGModal,
  loadGroupChallenges,
  respondToChallenge,
  clearGvGOpponent,
} from '../src/pages/groups.challenges.ts';

// ── Helpers ───────────────────────────────────────────────────

function buildDOM() {
  document.body.innerHTML = `
    <div id="gvg-modal"></div>
    <input id="gvg-opponent-search" value="test">
    <div id="gvg-opponent-results"></div>
    <div id="gvg-selected-opponent" style="display:block"></div>
    <input id="gvg-topic" value="">
    <div id="gvg-error" style="display:none"></div>
    <button id="gvg-submit-btn">SEND</button>
    <select id="gvg-category"><option value="general">General</option></select>
    <div class="gvg-format-pill active" data-format="1v1">1v1</div>
    <div class="gvg-format-pill" data-format="3v3">3v3</div>
    <div id="detail-challenges"></div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCurrentUser = { id: 'u1' };
  mockCurrentGroupId = 'g1';
  mockIsMember = true;
  buildDOM();
  mockSafeRpc.mockResolvedValue({ data: [], error: null });
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — openGvGModal adds "open" class to #gvg-modal', () => {
  it('modal gets "open" class', () => {
    openGvGModal();
    expect(document.getElementById('gvg-modal')?.classList.contains('open')).toBe(true);
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — openGvGModal resets search input and results', () => {
  it('clears gvg-opponent-search value and results', () => {
    openGvGModal();
    expect((document.getElementById('gvg-opponent-search') as HTMLInputElement).value).toBe('');
    expect(document.getElementById('gvg-opponent-results')?.innerHTML).toBe('');
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — closeGvGModal removes "open" class', () => {
  it('removes open class from modal', () => {
    document.getElementById('gvg-modal')!.classList.add('open');
    closeGvGModal();
    expect(document.getElementById('gvg-modal')?.classList.contains('open')).toBe(false);
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — clearGvGOpponent hides #gvg-selected-opponent', () => {
  it('sets style.display to "none"', () => {
    clearGvGOpponent();
    expect(document.getElementById('gvg-selected-opponent')?.style.display).toBe('none');
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — loadGroupChallenges calls safeRpc get_group_challenges', () => {
  it('calls safeRpc with groupId', async () => {
    await loadGroupChallenges('g1');
    expect(mockSafeRpc).toHaveBeenCalledWith(
      'get_group_challenges',
      expect.objectContaining({ p_group_id: 'g1' }),
      expect.anything()
    );
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — loadGroupChallenges renders empty state when no challenges', () => {
  it('calls renderEmpty when data is empty', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadGroupChallenges('g1');
    expect(mockRenderEmpty).toHaveBeenCalled();
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — loadGroupChallenges renders challenge cards for returned data', () => {
  it('container innerHTML contains challenge-card for each challenge', async () => {
    mockSafeRpc.mockResolvedValue({
      data: [{
        id: 'c1',
        challenger_group_id: 'g2',
        defender_group_id: 'g1',
        challenger_name: 'Rival Group',
        challenger_emoji: '🔥',
        challenger_elo: 1300,
        topic: 'Test topic',
        format: '1v1',
        status: 'pending',
      }],
      error: null,
    });
    await loadGroupChallenges('g1');
    expect(document.getElementById('detail-challenges')?.innerHTML).toContain('challenge-card');
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — respondToChallenge calls safeRpc respond_to_group_challenge', () => {
  it('calls safeRpc with challenge id and action', async () => {
    mockSafeRpc.mockResolvedValue({ data: { ok: true }, error: null });
    const validUUID = '00000000-0000-0000-0000-000000000001';
    await respondToChallenge(validUUID, 'accept');
    expect(mockSafeRpc).toHaveBeenCalledWith(
      'respond_to_group_challenge',
      expect.objectContaining({ p_challenge_id: validUUID, p_action: 'accept' }),
      expect.anything()
    );
  });
});

// ── TC9 ───────────────────────────────────────────────────────

describe('TC9 — respondToChallenge skips invalid UUID', () => {
  it('does not call safeRpc for non-UUID challenge id', async () => {
    await respondToChallenge('not-a-uuid', 'accept');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC10 ──────────────────────────────────────────────────────

describe('TC10 — loadGroupChallenges renders error state on failure', () => {
  it('sets container innerHTML with empty state on RPC error', async () => {
    mockSafeRpc.mockRejectedValue(new Error('network'));
    await loadGroupChallenges('g1');
    expect(document.getElementById('detail-challenges')?.innerHTML).toContain('empty-state');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/groups.challenges.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './groups.state.ts',
      '../config.ts',
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      './groups.utils.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/groups.challenges.ts'),
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
