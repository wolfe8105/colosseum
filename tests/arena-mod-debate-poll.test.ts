import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn().mockReturnValue(null));
const mockDEBATE = vi.hoisted(() => ({ defaultRounds: 3 }));

const mockView = vi.hoisted(() => ({ value: 'modDebateWaiting' as string }));
const mockModDebatePollTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockSet_modDebatePollTimer = vi.hoisted(() => vi.fn((v: ReturnType<typeof setInterval> | null) => { mockModDebatePollTimer.value = v; }));
const mockSet_modDebateId = vi.hoisted(() => vi.fn());

const mockEnterRoom = vi.hoisted(() => vi.fn());
const mockShowMatchFound = vi.hoisted(() => vi.fn());
const mockShowModQueue = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/config.ts', () => ({
  get DEBATE() { return mockDEBATE; },
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get view() { return mockView.value; },
  get modDebatePollTimer() { return mockModDebatePollTimer.value; },
  set_modDebatePollTimer: mockSet_modDebatePollTimer,
  set_modDebateId: mockSet_modDebateId,
}));

vi.mock('../src/arena/arena-room-enter.ts', () => ({
  enterRoom: mockEnterRoom,
}));

vi.mock('../src/arena/arena-match-found.ts', () => ({
  showMatchFound: mockShowMatchFound,
}));

vi.mock('../src/arena/arena-mod-queue-browse.ts', () => ({
  showModQueue: mockShowModQueue,
}));

import { startModDebatePoll, stopModDebatePoll, onModDebateReady, cancelModDebate } from '../src/arena/arena-mod-debate-poll.ts';

const baseResult = {
  status: 'waiting',
  topic: 'AI Ethics',
  debater_a_id: 'user-a',
  debater_b_id: 'user-b',
  debater_a_name: 'Alice',
  debater_b_name: 'Bob',
  total_rounds: 3,
  ruleset: 'amplified',
  language: 'en',
};

describe('TC1 — stopModDebatePoll clears timer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockModDebatePollTimer.value = null;
  });

  it('does nothing when timer is null', () => {
    stopModDebatePoll();
    expect(mockSet_modDebatePollTimer).not.toHaveBeenCalled();
  });

  it('clears interval and sets timer to null when active', () => {
    mockModDebatePollTimer.value = setInterval(() => {}, 99999);
    stopModDebatePoll();
    expect(mockSet_modDebatePollTimer).toHaveBeenCalledWith(null);
  });
});

describe('TC2 — startModDebatePoll sets an interval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockModDebatePollTimer.value = null;
    mockView.value = 'modDebateWaiting';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls set_modDebatePollTimer with an interval', () => {
    startModDebatePoll('d-1', 'text', false);
    expect(mockSet_modDebatePollTimer).toHaveBeenCalledWith(expect.any(Object));
  });

  it('calls stopModDebatePoll first (clears previous timer)', () => {
    const prev = setInterval(() => {}, 99999);
    mockModDebatePollTimer.value = prev;
    startModDebatePoll('d-1', 'text', false);
    // stopModDebatePoll runs first, setting to null, then new timer is set
    expect(mockSet_modDebatePollTimer).toHaveBeenCalledWith(null);
    expect(mockSet_modDebatePollTimer).toHaveBeenCalledTimes(2);
  });

  it('stops polling when view changes away from modDebateWaiting', async () => {
    mockView.value = 'lobby';
    mockSafeRpc.mockResolvedValue({ data: { status: 'waiting' }, error: null });
    startModDebatePoll('d-1', 'text', false);
    await vi.advanceTimersByTimeAsync(4001);
    expect(mockSet_modDebatePollTimer).toHaveBeenCalledWith(null);
  });

  it('calls safeRpc check_mod_debate on tick', async () => {
    mockSafeRpc.mockResolvedValue({ data: { status: 'waiting' }, error: null });
    startModDebatePoll('d-1', 'text', false);
    await vi.advanceTimersByTimeAsync(4001);
    expect(mockSafeRpc).toHaveBeenCalledWith('check_mod_debate', { p_debate_id: 'd-1' });
  });

  it('calls onModDebateReady when status is matched', async () => {
    mockGetCurrentProfile.mockReturnValue({ id: 'mod-user' });
    mockSafeRpc.mockResolvedValue({ data: { ...baseResult, status: 'matched' }, error: null });
    startModDebatePoll('d-1', 'text', false);
    await vi.advanceTimersByTimeAsync(4001);
    expect(mockEnterRoom).toHaveBeenCalled();
  });
});

describe('TC3 — onModDebateReady routes moderator to enterRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls enterRoom with modView=true when profile is not a debater', () => {
    mockGetCurrentProfile.mockReturnValue({ id: 'mod-user' });
    onModDebateReady('d-1', baseResult as never, 'text', false);
    expect(mockEnterRoom).toHaveBeenCalledWith(expect.objectContaining({ modView: true }));
  });

  it('calls showMatchFound when profile is debater_a', () => {
    mockGetCurrentProfile.mockReturnValue({ id: 'user-a' });
    onModDebateReady('d-1', baseResult as never, 'text', false);
    expect(mockShowMatchFound).toHaveBeenCalledWith(expect.objectContaining({ role: 'a' }));
  });

  it('calls showMatchFound with role b when profile is debater_b', () => {
    mockGetCurrentProfile.mockReturnValue({ id: 'user-b' });
    onModDebateReady('d-1', baseResult as never, 'text', false);
    expect(mockShowMatchFound).toHaveBeenCalledWith(expect.objectContaining({ role: 'b' }));
  });

  it('uses DEBATE.defaultRounds when total_rounds is null', () => {
    mockGetCurrentProfile.mockReturnValue({ id: 'mod-user' });
    onModDebateReady('d-1', { ...baseResult, total_rounds: null } as never, 'text', false);
    expect(mockEnterRoom).toHaveBeenCalledWith(expect.objectContaining({ totalRounds: 3 }));
  });
});

describe('TC4 — cancelModDebate stops poll and calls RPC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockModDebatePollTimer.value = null;
  });

  it('calls safeRpc cancel_mod_debate', async () => {
    await cancelModDebate('d-1');
    expect(mockSafeRpc).toHaveBeenCalledWith('cancel_mod_debate', { p_debate_id: 'd-1' });
  });

  it('calls set_modDebateId(null)', async () => {
    await cancelModDebate('d-1');
    expect(mockSet_modDebateId).toHaveBeenCalledWith(null);
  });

  it('calls showModQueue after cancel', async () => {
    await cancelModDebate('d-1');
    await new Promise(r => setTimeout(r, 0));
    expect(mockShowModQueue).toHaveBeenCalled();
  });
});

describe('ARCH — arena-mod-debate-poll.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-moderator.ts',
      './arena-room-enter.ts',
      './arena-match-found.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-mod-debate-poll.ts'),
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
