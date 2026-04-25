import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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

describe('TC1 — createAndWaitPrivateLobby sets state and renders DOM', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockIsPlaceholder.value = false;
    mockPrivateLobbyPollTimer.value = null;
    mockPrivateLobbyDebateId.value = null;
    mockSafeRpc.mockResolvedValue({
      data: [{ debate_id: 'd-1', join_code: 'ABC123', total_rounds: 3 }],
      error: null,
    });
  });

  it('calls set_view with privateLobbyWaiting', async () => {
    await createAndWaitPrivateLobby('text', 'AI debate', 'code');
    expect(mockSet_view).toHaveBeenCalledWith('privateLobbyWaiting');
  });

  it('calls pushArenaState with privateLobbyWaiting', async () => {
    await createAndWaitPrivateLobby('text', 'AI debate', 'code');
    expect(mockPushArenaState).toHaveBeenCalledWith('privateLobbyWaiting');
  });

  it('renders waiting div', async () => {
    await createAndWaitPrivateLobby('text', 'AI debate', 'code');
    expect(document.getElementById('arena-private-waiting')).not.toBeNull();
  });

  it('calls safeRpc create_private_lobby', async () => {
    await createAndWaitPrivateLobby('text', 'AI debate', 'private');
    expect(mockSafeRpc).toHaveBeenCalledWith('create_private_lobby', expect.objectContaining({
      p_mode: 'text',
      p_topic: 'AI debate',
    }));
  });

  it('calls set_privateLobbyDebateId with debate id', async () => {
    await createAndWaitPrivateLobby('text', 'AI', 'code');
    expect(mockSet_privateLobbyDebateId).toHaveBeenCalledWith('d-1');
  });
});

describe('TC2 — createAndWaitPrivateLobby placeholder simulation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockIsPlaceholder.value = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call safeRpc in placeholder mode', async () => {
    await createAndWaitPrivateLobby('text', 'AI', 'code');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  it('calls showMatchFound after timeout in placeholder mode', async () => {
    await createAndWaitPrivateLobby('text', 'AI', 'code');
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockShowMatchFound).toHaveBeenCalled();
  });
});

describe('TC3 — startPrivateLobbyPoll calls check_private_lobby', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockPrivateLobbyPollTimer.value = null;
    mockView.value = 'privateLobbyWaiting';
    mockSafeRpc.mockResolvedValue({ data: [{ status: 'waiting' }], error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls set_privateLobbyPollTimer with interval', () => {
    startPrivateLobbyPoll('d-1', 'text', 'Topic');
    expect(mockSet_privateLobbyPollTimer).toHaveBeenCalled();
  });

  it('calls safeRpc check_private_lobby on tick', async () => {
    startPrivateLobbyPoll('d-1', 'text', 'Topic');
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockSafeRpc).toHaveBeenCalledWith('check_private_lobby', { p_debate_id: 'd-1' });
  });

  it('calls showMatchFound on matched status', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: [{ status: 'matched', player_b_ready: true, opponent_id: 'opp-1', opponent_name: 'Bob', opponent_elo: 1100, total_rounds: 3 }],
      error: null,
    });
    startPrivateLobbyPoll('d-1', 'text', 'Topic');
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockShowMatchFound).toHaveBeenCalled();
  });
});

describe('TC4 — onPrivateLobbyMatched builds debate and calls showMatchFound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedMode.value = 'text';
    mockSelectedRanked.value = false;
    mockSelectedRuleset.value = 'amplified';
  });

  it('calls showMatchFound with correctly structured debate', () => {
    onPrivateLobbyMatched({
      debate_id: 'd-5',
      topic: 'Economy',
      role: 'a',
      opponent_name: 'Charlie',
      opponent_elo: 1300,
      opponent_id: 'c-uuid',
    });
    expect(mockShowMatchFound).toHaveBeenCalledWith(expect.objectContaining({
      id: 'd-5',
      topic: 'Economy',
      role: 'a',
      mode: 'text',
    }));
  });
});

describe('TC5 — cancelPrivateLobby clears timer and renders lobby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrivateLobbyDebateId.value = 'd-1';
    mockIsPlaceholder.value = false;
    mockPrivateLobbyPollTimer.value = null;
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
  });

  it('calls safeRpc cancel_private_lobby', async () => {
    await cancelPrivateLobby();
    expect(mockSafeRpc).toHaveBeenCalledWith('cancel_private_lobby', { p_debate_id: 'd-1' });
  });

  it('calls set_privateLobbyDebateId(null)', async () => {
    await cancelPrivateLobby();
    expect(mockSet_privateLobbyDebateId).toHaveBeenCalledWith(null);
  });

  it('calls renderLobby', async () => {
    await cancelPrivateLobby();
    expect(mockRenderLobby).toHaveBeenCalled();
  });
});

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
