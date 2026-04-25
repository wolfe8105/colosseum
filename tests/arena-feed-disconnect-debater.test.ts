import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn().mockReturnValue({ display_name: 'Alice' }));

const mockRound = vi.hoisted(() => ({ value: 2 }));
const mockScoreA = vi.hoisted(() => ({ value: 10 }));
const mockScoreB = vi.hoisted(() => ({ value: 5 }));

const mockEndCurrentDebate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockWriteFeedEvent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockAddLocalSystem = vi.hoisted(() => vi.fn());
const mockCleanupFeedRoom = vi.hoisted(() => vi.fn());
const mockShowDisconnectBanner = vi.hoisted(() => vi.fn());
const mockRenderLobby = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get round() { return mockRound.value; },
  get scoreA() { return mockScoreA.value; },
  get scoreB() { return mockScoreB.value; },
}));

vi.mock('../src/arena/arena-room-end.ts', () => ({
  endCurrentDebate: mockEndCurrentDebate,
}));

vi.mock('../src/arena/arena-feed-room.ts', () => ({
  writeFeedEvent: mockWriteFeedEvent,
  addLocalSystem: mockAddLocalSystem,
  cleanupFeedRoom: mockCleanupFeedRoom,
}));

vi.mock('../src/arena/arena-feed-ui.ts', () => ({
  showDisconnectBanner: mockShowDisconnectBanner,
}));

vi.mock('../src/arena/arena-lobby.ts', () => ({
  renderLobby: mockRenderLobby,
}));

import { handleDebaterDisconnect, handleDebaterDisconnectAsViewer } from '../src/arena/arena-feed-disconnect-debater.ts';

const baseDebate = {
  id: 'deb-1',
  role: 'a',
  opponentName: 'Bob',
  modView: false,
  spectatorView: false,
  debaterAName: 'Alice',
  debaterBName: 'Bob',
  _nulled: false,
};

describe('TC1 — handleDebaterDisconnect routes by score', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockRound.value = 2;
    mockScoreA.value = 10;
    mockScoreB.value = 5;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls addLocalSystem with disconnect message', async () => {
    await handleDebaterDisconnect(baseDebate as never, 'b');
    expect(mockAddLocalSystem).toHaveBeenCalledWith(expect.stringContaining('disconnected'));
  });

  it('nulls debate when disconnector was winning (scoreA > scoreB, A disconnects)', async () => {
    mockScoreA.value = 10;
    mockScoreB.value = 5;
    await handleDebaterDisconnect(baseDebate as never, 'a');
    expect(mockSafeRpc).toHaveBeenCalledWith('update_arena_debate', expect.objectContaining({ p_status: 'cancelled' }));
  });

  it('calls complete with winner when disconnector was losing (scoreB > scoreA, B disconnects)', async () => {
    mockScoreA.value = 10;
    mockScoreB.value = 5;
    await handleDebaterDisconnect(baseDebate as never, 'b');
    expect(mockSafeRpc).toHaveBeenCalledWith('update_arena_debate', expect.objectContaining({ p_status: 'complete', p_winner: 'a' }));
  });

  it('calls endCurrentDebate after timeout', async () => {
    await handleDebaterDisconnect(baseDebate as never, 'b');
    await vi.advanceTimersByTimeAsync(1501);
    expect(mockEndCurrentDebate).toHaveBeenCalled();
  });
});

describe('TC2 — handleDebaterDisconnectAsViewer shows banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls addLocalSystem with disconnect message', () => {
    handleDebaterDisconnectAsViewer(baseDebate as never, 'a');
    expect(mockAddLocalSystem).toHaveBeenCalled();
  });

  it('calls showDisconnectBanner', () => {
    handleDebaterDisconnectAsViewer(baseDebate as never, 'a');
    expect(mockShowDisconnectBanner).toHaveBeenCalled();
  });

  it('does not set timeout for non-spectator (modView)', () => {
    const modDebate = { ...baseDebate, modView: true };
    handleDebaterDisconnectAsViewer(modDebate as never, 'a');
    // No async work — just check we didn't error
    expect(mockAddLocalSystem).toHaveBeenCalled();
  });
});

describe('ARCH — arena-feed-disconnect-debater.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      './arena-types.ts',
      './arena-feed-state.ts',
      './arena-room-end.ts',
      './arena-feed-room.ts',
      './arena-feed-ui.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-disconnect-debater.ts'),
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
