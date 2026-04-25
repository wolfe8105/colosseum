// ============================================================
// GROUPS FEED — tests/groups-feed.test.ts
// Source: src/pages/groups.feed.ts
//
// CLASSIFICATION:
//   loadGroupFeed():  RPC behavioral — fetches and renders feed
//   postGroupCard():  RPC behavioral — posts new card
//
// IMPORTS:
//   { currentUser }           from './groups.state.ts'
//   { escapeHTML, showToast } from '../config.ts'
//   { safeRpc }               from '../auth.ts'
//   { create_debate_card }    from '../contracts/rpc-schemas.ts'
//   { renderEmpty }           from './groups.utils.ts'
//   { renderFeedCard, renderFeedEmpty } from '../feed-card.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc       = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [], error: null }));
const mockShowToast     = vi.hoisted(() => vi.fn());
const mockRenderFeedCard = vi.hoisted(() => vi.fn(() => '<div class="feed-card"></div>'));
const mockRenderFeedEmpty = vi.hoisted(() => vi.fn(() => '<div class="feed-empty"></div>'));
const mockRenderEmpty   = vi.hoisted(() => vi.fn(() => '<div class="empty-state"></div>'));
let   mockCurrentUser: unknown = null;

vi.mock('../src/pages/groups.state.ts', () => ({
  get currentUser() { return mockCurrentUser; },
  currentGroupId: null,
  isMember: false,
  callerRole: null,
  setCurrentGroupId: vi.fn(),
  setIsMember: vi.fn(),
  setCallerRole: vi.fn(),
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
  getCurrentUser: vi.fn(),
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  create_debate_card: {},
  get_unified_feed: {},
}));

vi.mock('../src/pages/groups.utils.ts', () => ({
  renderEmpty: mockRenderEmpty,
}));

vi.mock('../src/feed-card.ts', () => ({
  renderFeedCard:  mockRenderFeedCard,
  renderFeedEmpty: mockRenderFeedEmpty,
}));

import { loadGroupFeed, postGroupCard } from '../src/pages/groups.feed.ts';

// ── Helpers ───────────────────────────────────────────────────

function buildDOM() {
  document.body.innerHTML = `
    <div id="detail-feed"></div>
  `;
}

function buildComposerDOM() {
  document.body.innerHTML = `
    <div id="detail-feed"></div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCurrentUser = null;
  buildDOM();
  mockSafeRpc.mockResolvedValue({ data: [], error: null });
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — loadGroupFeed renders feed cards on success', () => {
  it('calls renderFeedCard for each returned card', async () => {
    const cards = [{ id: 'c1' }, { id: 'c2' }];
    mockSafeRpc.mockResolvedValue({ data: cards, error: null });
    await loadGroupFeed('group-1');
    expect(mockRenderFeedCard).toHaveBeenCalledTimes(2);
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — loadGroupFeed renders empty state when no data', () => {
  it('calls renderEmpty when data is an empty array', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadGroupFeed('group-1');
    expect(mockRenderEmpty).toHaveBeenCalled();
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — loadGroupFeed renders error state on RPC failure', () => {
  it('sets #detail-feed innerHTML to error content when safeRpc throws', async () => {
    mockSafeRpc.mockRejectedValue(new Error('network error'));
    await loadGroupFeed('group-1');
    const container = document.getElementById('detail-feed')!;
    expect(container.innerHTML).toContain('empty-state');
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — loadGroupFeed calls safeRpc get_unified_feed with group ID', () => {
  it('passes p_category = groupId to safeRpc', async () => {
    mockSafeRpc.mockResolvedValue({ data: [{ id: 'c1' }], error: null });
    await loadGroupFeed('grp-42');
    expect(mockSafeRpc).toHaveBeenCalledWith(
      'get_unified_feed',
      expect.objectContaining({ p_category: 'grp-42' })
    );
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — postGroupCard calls safeRpc create_debate_card', () => {
  it('calls safeRpc with p_content and p_category', async () => {
    mockCurrentUser = { id: 'user-1' };
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    document.body.innerHTML = `<div id="detail-feed"></div><textarea id="group-take-input">My opinion</textarea><span id="group-take-count"></span><button id="group-take-post">POST</button>`;
    await postGroupCard('grp-1');
    expect(mockSafeRpc).toHaveBeenCalledWith(
      'create_debate_card',
      expect.objectContaining({ p_content: 'My opinion', p_category: 'grp-1' }),
      expect.anything()
    );
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — postGroupCard shows error toast when RPC fails', () => {
  it('calls showToast with "error" type on RPC error', async () => {
    mockCurrentUser = { id: 'user-1' };
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    document.body.innerHTML = `<div id="detail-feed"></div><textarea id="group-take-input">Opinion</textarea><span id="group-take-count"></span><button id="group-take-post">POST</button>`;
    await postGroupCard('grp-1');
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — postGroupCard shows success toast and clears input on success', () => {
  it('calls showToast with "success" and resets textarea', async () => {
    mockCurrentUser = { id: 'user-1' };
    mockSafeRpc.mockResolvedValueOnce({ data: null, error: null }) // postGroupCard RPC
               .mockResolvedValue({ data: [], error: null });       // loadGroupFeed re-fetch
    document.body.innerHTML = `<div id="detail-feed"></div><textarea id="group-take-input">Opinion</textarea><span id="group-take-count">7/280</span><button id="group-take-post">POST</button>`;
    await postGroupCard('grp-1');
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'success');
    expect((document.getElementById('group-take-input') as HTMLTextAreaElement).value).toBe('');
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — postGroupCard does nothing when input is empty', () => {
  it('does not call safeRpc when textarea is blank', async () => {
    mockCurrentUser = { id: 'user-1' };
    document.body.innerHTML = `<div id="detail-feed"></div><textarea id="group-take-input">   </textarea><span id="group-take-count"></span><button id="group-take-post">POST</button>`;
    await postGroupCard('grp-1');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/groups.feed.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './groups.state.ts',
      '../config.ts',
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      './groups.utils.ts',
      '../feed-card.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/groups.feed.ts'),
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
