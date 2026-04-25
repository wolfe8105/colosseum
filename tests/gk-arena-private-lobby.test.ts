// ============================================================
// GK — F-46 PRIVATE LOBBY TESTS
// Tests createAndWaitPrivateLobby, startPrivateLobbyPoll,
// onPrivateLobbyMatched, cancelPrivateLobby from
// src/arena/arena-private-lobby.ts.
// Spec: docs/product/F-46-private-lobby.md
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── hoisted mocks ────────────────────────────────────────────

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockFriendlyError = vi.hoisted(() => vi.fn((e: unknown) => String(e)));
const mockDEBATE = vi.hoisted(() => ({ defaultRounds: 3 }));

const mockView = vi.hoisted(() => ({ value: 'lobby' as string }));
const mockSelectedMode = vi.hoisted(() => ({ value: 'text' as string }));
const mockSelectedRanked = vi.hoisted(() => ({ value: false }));
const mockSelectedRuleset = vi.hoisted(() => ({ value: 'amplified' as string }));
const mockSelectedRounds = vi.hoisted(() => ({ value: 3 }));
const mockSelectedCategory = vi.hoisted(() => ({ value: null as string | null }));
const mockPrivateLobbyPollTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockPrivateLobbyDebateId = vi.hoisted(() => ({ value: null as string | null }));
const mockScreenEl = vi.hoisted(() => ({ value: null as HTMLElement | null }));

const mockSet_view = vi.hoisted(() => vi.fn((v: string) => { mockView.value = v; }));
const mockSet_privateLobbyPollTimer = vi.hoisted(() => vi.fn((v: ReturnType<typeof setInterval> | null) => { mockPrivateLobbyPollTimer.value = v; }));
const mockSet_privateLobbyDebateId = vi.hoisted(() => vi.fn((v: string | null) => { mockPrivateLobbyDebateId.value = v; }));

const mockIsPlaceholder = vi.hoisted(() => ({ value: false }));
const mockRandomFrom = vi.hoisted(() => vi.fn().mockReturnValue('Random Topic'));
const mockPushArenaState = vi.hoisted(() => vi.fn());
const mockShowMatchFound = vi.hoisted(() => vi.fn());
const mockRenderLobby = vi.hoisted(() => vi.fn());

// ── vi.mock factories ─────────────────────────────────────────

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: mockShowToast,
  friendlyError: mockFriendlyError,
  get DEBATE() { return mockDEBATE; },
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get view() { return mockView.value; },
  get selectedMode() { return mockSelectedMode.value; },
  get selectedRanked() { return mockSelectedRanked.value; },
  get selectedRuleset() { return mockSelectedRuleset.value; },
  get selectedRounds() { return mockSelectedRounds.value; },
  get selectedCategory() { return mockSelectedCategory.value; },
  get privateLobbyPollTimer() { return mockPrivateLobbyPollTimer.value; },
  get privateLobbyDebateId() { return mockPrivateLobbyDebateId.value; },
  get screenEl() { return mockScreenEl.value; },
  set_view: mockSet_view,
  set_privateLobbyPollTimer: mockSet_privateLobbyPollTimer,
  set_privateLobbyDebateId: mockSet_privateLobbyDebateId,
}));

vi.mock('../src/arena/arena-constants.ts', () => ({
  AI_TOPICS: ['Topic A'],
  TEXT_MAX_CHARS: 500,
  OPPONENT_POLL_MS: 3000,
  OPPONENT_POLL_TIMEOUT_SEC: 30,
  ROUND_DURATION: 60,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  get isPlaceholder() { return () => mockIsPlaceholder.value; },
  randomFrom: mockRandomFrom,
  pushArenaState: mockPushArenaState,
}));

vi.mock('../src/arena/arena-match-found.ts', () => ({
  showMatchFound: mockShowMatchFound,
}));

vi.mock('../src/arena/arena-lobby.ts', () => ({
  renderLobby: mockRenderLobby,
}));

import { createAndWaitPrivateLobby, startPrivateLobbyPoll, onPrivateLobbyMatched, cancelPrivateLobby } from '../src/arena/arena-private-lobby.ts';

// ── helpers ───────────────────────────────────────────────────

function setupDOM() {
  document.body.innerHTML = '<div id="app"></div>';
  mockScreenEl.value = document.getElementById('app');
}

function defaultRpcResult(overrides: Record<string, unknown> = {}) {
  return {
    data: [{ debate_id: 'gk-d-1', join_code: 'XY9ABC', total_rounds: 3, ...overrides }],
    error: null,
  };
}

// ─────────────────────────────────────────────────────────────
// TC-GK1 — create_private_lobby called with all 9 spec params
// ─────────────────────────────────────────────────────────────

describe('TC-GK1 — create_private_lobby RPC called with all 9 spec params', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDOM();
    mockIsPlaceholder.value = false;
    mockPrivateLobbyPollTimer.value = null;
    mockSelectedCategory.value = 'politics';
    mockSelectedRanked.value = true;
    mockSelectedRuleset.value = 'strict';
    mockSelectedRounds.value = 5;
    mockSafeRpc.mockResolvedValue(defaultRpcResult());
  });

  it('passes p_mode', async () => {
    await createAndWaitPrivateLobby('video', 'Climate', 'code');
    const call = mockSafeRpc.mock.calls.find(c => c[0] === 'create_private_lobby');
    expect(call).toBeDefined();
    expect(call![1]).toMatchObject({ p_mode: 'video' });
  });

  it('passes p_topic', async () => {
    await createAndWaitPrivateLobby('text', 'Climate change', 'code');
    const call = mockSafeRpc.mock.calls.find(c => c[0] === 'create_private_lobby');
    expect(call![1]).toMatchObject({ p_topic: 'Climate change' });
  });

  it('passes p_category from selectedCategory', async () => {
    await createAndWaitPrivateLobby('text', 'Topic', 'code');
    const call = mockSafeRpc.mock.calls.find(c => c[0] === 'create_private_lobby');
    expect(call![1]).toMatchObject({ p_category: 'politics' });
  });

  it('passes p_ranked from selectedRanked', async () => {
    await createAndWaitPrivateLobby('text', 'Topic', 'code');
    const call = mockSafeRpc.mock.calls.find(c => c[0] === 'create_private_lobby');
    expect(call![1]).toMatchObject({ p_ranked: true });
  });

  it('passes p_ruleset from selectedRuleset', async () => {
    await createAndWaitPrivateLobby('text', 'Topic', 'code');
    const call = mockSafeRpc.mock.calls.find(c => c[0] === 'create_private_lobby');
    expect(call![1]).toMatchObject({ p_ruleset: 'strict' });
  });

  it('passes p_visibility', async () => {
    await createAndWaitPrivateLobby('text', 'Topic', 'group');
    const call = mockSafeRpc.mock.calls.find(c => c[0] === 'create_private_lobby');
    expect(call![1]).toMatchObject({ p_visibility: 'group' });
  });

  it('passes p_total_rounds from selectedRounds', async () => {
    await createAndWaitPrivateLobby('text', 'Topic', 'code');
    const call = mockSafeRpc.mock.calls.find(c => c[0] === 'create_private_lobby');
    expect(call![1]).toMatchObject({ p_total_rounds: 5 });
  });
});

// ─────────────────────────────────────────────────────────────
// TC-GK2 — null coercion for optional params
// ─────────────────────────────────────────────────────────────

describe('TC-GK2 — null coercion: p_topic, p_invited_user_id, p_group_id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDOM();
    mockIsPlaceholder.value = false;
    mockPrivateLobbyPollTimer.value = null;
    mockSafeRpc.mockResolvedValue(defaultRpcResult());
  });

  it('p_topic is null when topic is empty string', async () => {
    await createAndWaitPrivateLobby('text', '', 'code');
    const call = mockSafeRpc.mock.calls.find(c => c[0] === 'create_private_lobby');
    expect(call![1]).toMatchObject({ p_topic: null });
  });

  it('p_invited_user_id is null when invitedUserId not provided', async () => {
    await createAndWaitPrivateLobby('text', 'Topic', 'code');
    const call = mockSafeRpc.mock.calls.find(c => c[0] === 'create_private_lobby');
    expect(call![1]).toMatchObject({ p_invited_user_id: null });
  });

  it('p_invited_user_id is passed through when provided', async () => {
    await createAndWaitPrivateLobby('text', 'Topic', 'private', 'user-123', 'Alice');
    const call = mockSafeRpc.mock.calls.find(c => c[0] === 'create_private_lobby');
    expect(call![1]).toMatchObject({ p_invited_user_id: 'user-123' });
  });

  it('p_group_id is null when groupId not provided', async () => {
    await createAndWaitPrivateLobby('text', 'Topic', 'code');
    const call = mockSafeRpc.mock.calls.find(c => c[0] === 'create_private_lobby');
    expect(call![1]).toMatchObject({ p_group_id: null });
  });

  it('p_group_id is passed through when provided', async () => {
    await createAndWaitPrivateLobby('text', 'Topic', 'group', undefined, undefined, 'grp-456');
    const call = mockSafeRpc.mock.calls.find(c => c[0] === 'create_private_lobby');
    expect(call![1]).toMatchObject({ p_group_id: 'grp-456' });
  });
});

// ─────────────────────────────────────────────────────────────
// TC-GK3 — code visibility: waiting screen text
// ─────────────────────────────────────────────────────────────

describe('TC-GK3 — code visibility: title and status text', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setupDOM();
    mockIsPlaceholder.value = false;
    mockPrivateLobbyPollTimer.value = null;
    mockSafeRpc.mockResolvedValue(defaultRpcResult({ join_code: 'CODE99' }));
    await createAndWaitPrivateLobby('text', 'Topic', 'code');
  });

  it('sets title to SHARE THIS CODE', () => {
    expect(document.getElementById('arena-private-title')?.textContent).toBe('SHARE THIS CODE');
  });

  it('sets status to Waiting for someone to join...', () => {
    expect(document.getElementById('arena-private-status')?.textContent).toBe('Waiting for someone to join...');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-GK4 — code visibility: join code shown + copy button rendered
// ─────────────────────────────────────────────────────────────

describe('TC-GK4 — code visibility: join code in DOM and copy button present', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setupDOM();
    mockIsPlaceholder.value = false;
    mockPrivateLobbyPollTimer.value = null;
    mockSafeRpc.mockResolvedValue(defaultRpcResult({ join_code: 'ABCDEF' }));
    await createAndWaitPrivateLobby('text', 'Topic', 'code');
  });

  it('join code text appears somewhere in code display', () => {
    const codeDisplay = document.getElementById('arena-private-code-display');
    expect(codeDisplay?.textContent).toContain('ABCDEF');
  });

  it('COPY CHALLENGE LINK button is rendered', () => {
    expect(document.getElementById('arena-challenge-link-btn')).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// TC-GK5 — challenge link format
// ─────────────────────────────────────────────────────────────

describe('TC-GK5 — challenge link is https://themoderator.app/challenge?code=<encoded_code>', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setupDOM();
    mockIsPlaceholder.value = false;
    mockPrivateLobbyPollTimer.value = null;
    mockSafeRpc.mockResolvedValue(defaultRpcResult({ join_code: 'ZZ1234' }));
    await createAndWaitPrivateLobby('text', 'Topic', 'code');
  });

  it('clicking copy button writes correct challenge link to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const btn = document.getElementById('arena-challenge-link-btn') as HTMLButtonElement;
    btn.click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(
      `https://themoderator.app/challenge?code=${encodeURIComponent('ZZ1234')}`
    );
  });
});

// ─────────────────────────────────────────────────────────────
// TC-GK6 — private visibility: waiting screen text
// ─────────────────────────────────────────────────────────────

describe('TC-GK6 — private visibility: title and status text with invitedUserName', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setupDOM();
    mockIsPlaceholder.value = false;
    mockPrivateLobbyPollTimer.value = null;
    mockSafeRpc.mockResolvedValue(defaultRpcResult());
    await createAndWaitPrivateLobby('text', 'Topic', 'private', 'user-1', 'Alice');
  });

  it('sets title to CHALLENGE SENT', () => {
    expect(document.getElementById('arena-private-title')?.textContent).toBe('CHALLENGE SENT');
  });

  it('sets status to Waiting for [name] to accept...', () => {
    expect(document.getElementById('arena-private-status')?.textContent).toBe('Waiting for Alice to accept...');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-GK7 — private visibility: fallback to "them" when no name
// ─────────────────────────────────────────────────────────────

describe('TC-GK7 — private visibility: status fallback to "them" when invitedUserName absent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setupDOM();
    mockIsPlaceholder.value = false;
    mockPrivateLobbyPollTimer.value = null;
    mockSafeRpc.mockResolvedValue(defaultRpcResult());
    await createAndWaitPrivateLobby('text', 'Topic', 'private', 'user-1');
  });

  it('status contains "them" when invitedUserName is not provided', () => {
    expect(document.getElementById('arena-private-status')?.textContent).toBe('Waiting for them to accept...');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-GK8 — group visibility: waiting screen text
// ─────────────────────────────────────────────────────────────

describe('TC-GK8 — group visibility: title and status text', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setupDOM();
    mockIsPlaceholder.value = false;
    mockPrivateLobbyPollTimer.value = null;
    mockSafeRpc.mockResolvedValue(defaultRpcResult());
    await createAndWaitPrivateLobby('text', 'Topic', 'group', undefined, undefined, 'grp-1');
  });

  it('sets title to GROUP LOBBY OPEN', () => {
    expect(document.getElementById('arena-private-title')?.textContent).toBe('GROUP LOBBY OPEN');
  });

  it('sets status to Waiting for a group member to join...', () => {
    expect(document.getElementById('arena-private-status')?.textContent).toBe('Waiting for a group member to join...');
  });
});

// ─────────────────────────────────────────────────────────────
// TC-GK9 — create RPC error: showToast + renderLobby
// ─────────────────────────────────────────────────────────────

describe('TC-GK9 — create_private_lobby RPC error shows toast and renders lobby', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setupDOM();
    mockIsPlaceholder.value = false;
    mockPrivateLobbyPollTimer.value = null;
    mockSafeRpc.mockResolvedValue({ data: null, error: new Error('Server down') });
    await createAndWaitPrivateLobby('text', 'Topic', 'code');
  });

  it('calls showToast with friendlyError result on RPC error', () => {
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('calls renderLobby on RPC error', () => {
    expect(mockRenderLobby).toHaveBeenCalled();
  });

  it('does NOT call set_privateLobbyDebateId on error', () => {
    expect(mockSet_privateLobbyDebateId).not.toHaveBeenCalledWith(expect.stringContaining(''));
  });
});

// ─────────────────────────────────────────────────────────────
// TC-GK10 — poll stops when view is no longer privateLobbyWaiting
// ─────────────────────────────────────────────────────────────

describe('TC-GK10 — poll stops immediately when view is not privateLobbyWaiting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockPrivateLobbyPollTimer.value = null;
    mockView.value = 'lobby'; // already changed away
    mockSafeRpc.mockResolvedValue({ data: [{ status: 'waiting' }], error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call check_private_lobby when view is not privateLobbyWaiting', async () => {
    startPrivateLobbyPoll('d-stop', 'text', 'Topic');
    await vi.advanceTimersByTimeAsync(3000);
    const checkCalls = mockSafeRpc.mock.calls.filter(c => c[0] === 'check_private_lobby');
    expect(checkCalls).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-GK11 — poll auto-cancels after 600 seconds
// ─────────────────────────────────────────────────────────────

describe('TC-GK11 — poll auto-cancels at 600s timeout with toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockPrivateLobbyPollTimer.value = null;
    mockPrivateLobbyDebateId.value = 'd-timeout';
    mockIsPlaceholder.value = false;
    mockView.value = 'privateLobbyWaiting';
    mockSafeRpc.mockResolvedValue({ data: [{ status: 'waiting' }], error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "Lobby expired — no one joined" toast after 600 seconds', async () => {
    startPrivateLobbyPoll('d-timeout', 'text', 'Topic');
    await vi.advanceTimersByTimeAsync(600_000);
    expect(mockShowToast).toHaveBeenCalledWith('Lobby expired — no one joined');
  });

  it('clears poll timer after 600 second timeout', async () => {
    startPrivateLobbyPoll('d-timeout', 'text', 'Topic');
    await vi.advanceTimersByTimeAsync(600_000);
    expect(mockSet_privateLobbyPollTimer).toHaveBeenLastCalledWith(null);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-GK12 — poll on status === 'cancelled': toast + renderLobby
// ─────────────────────────────────────────────────────────────

describe('TC-GK12 — poll detects cancelled status: shows toast and renders lobby', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockPrivateLobbyPollTimer.value = null;
    mockView.value = 'privateLobbyWaiting';
    mockSafeRpc.mockResolvedValue({
      data: [{ status: 'cancelled' }],
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "Lobby cancelled" toast when poll detects cancelled', async () => {
    startPrivateLobbyPoll('d-cancel', 'text', 'Topic');
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockShowToast).toHaveBeenCalledWith('Lobby cancelled');
  });

  it('calls renderLobby when poll detects cancelled', async () => {
    startPrivateLobbyPoll('d-cancel', 'text', 'Topic');
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockRenderLobby).toHaveBeenCalled();
  });

  it('clears poll timer when poll detects cancelled', async () => {
    startPrivateLobbyPoll('d-cancel', 'text', 'Topic');
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockSet_privateLobbyPollTimer).toHaveBeenLastCalledWith(null);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-GK13 — onPrivateLobbyMatched defaults
// ─────────────────────────────────────────────────────────────

describe('TC-GK13 — onPrivateLobbyMatched applies spec defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedMode.value = 'text';
    mockSelectedRanked.value = false;
    mockSelectedRuleset.value = 'amplified';
  });

  it('role defaults to "a" when not provided', () => {
    onPrivateLobbyMatched({
      debate_id: 'd-def',
      topic: 'Topic',
      opponent_name: 'Bob',
      opponent_elo: 1200,
      opponent_id: 'opp-1',
    });
    const call = mockShowMatchFound.mock.calls[0][0];
    expect(call.role).toBe('a');
  });

  it('totalRounds defaults to DEBATE.defaultRounds when total_rounds not provided', () => {
    onPrivateLobbyMatched({
      debate_id: 'd-def',
      topic: 'Topic',
      opponent_name: 'Bob',
      opponent_elo: 1200,
      opponent_id: 'opp-1',
    });
    const call = mockShowMatchFound.mock.calls[0][0];
    expect(call.totalRounds).toBe(mockDEBATE.defaultRounds);
  });

  it('language defaults to "en" when not provided', () => {
    onPrivateLobbyMatched({
      debate_id: 'd-def',
      topic: 'Topic',
      opponent_name: 'Bob',
      opponent_elo: 1200,
      opponent_id: 'opp-1',
    });
    const call = mockShowMatchFound.mock.calls[0][0];
    expect(call.language).toBe('en');
  });

  it('role, totalRounds, language use provided values when present', () => {
    onPrivateLobbyMatched({
      debate_id: 'd-def',
      topic: 'Topic',
      role: 'b',
      opponent_name: 'Bob',
      opponent_elo: 1200,
      opponent_id: 'opp-1',
      total_rounds: 5,
      language: 'fr',
    });
    const call = mockShowMatchFound.mock.calls[0][0];
    expect(call.role).toBe('b');
    expect(call.totalRounds).toBe(5);
    expect(call.language).toBe('fr');
  });

  it('round is always 1', () => {
    onPrivateLobbyMatched({
      debate_id: 'd-def',
      topic: 'Topic',
      opponent_name: 'Bob',
      opponent_elo: 1200,
      opponent_id: 'opp-1',
    });
    const call = mockShowMatchFound.mock.calls[0][0];
    expect(call.round).toBe(1);
  });

  it('mode comes from selectedMode', () => {
    mockSelectedMode.value = 'video';
    onPrivateLobbyMatched({
      debate_id: 'd-def',
      topic: 'Topic',
      opponent_name: 'Bob',
      opponent_elo: 1200,
      opponent_id: 'opp-1',
    });
    const call = mockShowMatchFound.mock.calls[0][0];
    expect(call.mode).toBe('video');
  });

  it('messages is empty array', () => {
    onPrivateLobbyMatched({
      debate_id: 'd-def',
      topic: 'Topic',
      opponent_name: 'Bob',
      opponent_elo: 1200,
      opponent_id: 'opp-1',
    });
    const call = mockShowMatchFound.mock.calls[0][0];
    expect(call.messages).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// TC-GK14 — cancelPrivateLobby skips safeRpc in placeholder mode
// ─────────────────────────────────────────────────────────────

describe('TC-GK14 — cancelPrivateLobby skips cancel RPC in placeholder mode', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockIsPlaceholder.value = true;
    mockPrivateLobbyDebateId.value = 'd-placeholder';
    mockPrivateLobbyPollTimer.value = null;
    await cancelPrivateLobby();
  });

  it('does NOT call cancel_private_lobby RPC in placeholder mode', () => {
    const cancelCalls = mockSafeRpc.mock.calls.filter(c => c[0] === 'cancel_private_lobby');
    expect(cancelCalls).toHaveLength(0);
  });

  it('still calls set_privateLobbyDebateId(null) in placeholder mode', () => {
    expect(mockSet_privateLobbyDebateId).toHaveBeenCalledWith(null);
  });

  it('still calls renderLobby in placeholder mode', () => {
    expect(mockRenderLobby).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// TC-GK15 — cancelPrivateLobby skips safeRpc when debateId is null
// ─────────────────────────────────────────────────────────────

describe('TC-GK15 — cancelPrivateLobby skips cancel RPC when privateLobbyDebateId is null', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockIsPlaceholder.value = false;
    mockPrivateLobbyDebateId.value = null;
    mockPrivateLobbyPollTimer.value = null;
    await cancelPrivateLobby();
  });

  it('does NOT call cancel_private_lobby RPC when debateId is null', () => {
    const cancelCalls = mockSafeRpc.mock.calls.filter(c => c[0] === 'cancel_private_lobby');
    expect(cancelCalls).toHaveLength(0);
  });

  it('still calls set_privateLobbyDebateId(null)', () => {
    expect(mockSet_privateLobbyDebateId).toHaveBeenCalledWith(null);
  });

  it('still calls renderLobby', () => {
    expect(mockRenderLobby).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// ARCH — arena-private-lobby.ts only imports from allowed list
// ─────────────────────────────────────────────────────────────

describe('ARCH — arena-private-lobby.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-private-lobby.ts',
      './arena-constants.ts',
      './arena-core.utils.ts',
      './arena-match-found.ts',
      './arena-lobby.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-private-lobby.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
