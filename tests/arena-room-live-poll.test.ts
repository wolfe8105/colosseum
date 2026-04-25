import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockGetDebateMessages = vi.hoisted(() => ({}));
const mockNudge = vi.hoisted(() => vi.fn());

const mockCurrentDebate = vi.hoisted(() => ({
  value: null as Record<string, unknown> | null,
}));
const mockOpponentPollTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockOpponentPollElapsed = vi.hoisted(() => ({ value: 0 }));
const mockRoundTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockRoundTimeLeft = vi.hoisted(() => ({ value: 0 }));

const mockSet_opponentPollTimer = vi.hoisted(() => vi.fn((v: ReturnType<typeof setInterval> | null) => { mockOpponentPollTimer.value = v; }));
const mockSet_opponentPollElapsed = vi.hoisted(() => vi.fn((v: number) => { mockOpponentPollElapsed.value = v; }));
const mockSet_roundTimer = vi.hoisted(() => vi.fn((v: ReturnType<typeof setInterval> | null) => { mockRoundTimer.value = v; }));
const mockSet_roundTimeLeft = vi.hoisted(() => vi.fn((v: number) => { mockRoundTimeLeft.value = v; }));

const mockIsPlaceholder = vi.hoisted(() => ({ value: false }));
const mockFormatTimer = vi.hoisted(() => vi.fn((t: number) => `${t}s`));
const mockHandleAIResponse = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockGenerateSimulatedResponse = vi.hoisted(() => vi.fn().mockReturnValue('Simulated'));
const mockEndCurrentDebate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockAddMessage = vi.hoisted(() => vi.fn());
const mockAddSystemMessage = vi.hoisted(() => vi.fn());

const mockOPPONENT_POLL_MS = vi.hoisted(() => ({ value: 3000 }));
const mockOPPONENT_POLL_TIMEOUT_SEC = vi.hoisted(() => ({ value: 30 }));
const mockROUND_DURATION = vi.hoisted(() => ({ value: 60 }));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_debate_messages: mockGetDebateMessages,
}));

vi.mock('../src/nudge.ts', () => ({
  nudge: mockNudge,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
  get opponentPollTimer() { return mockOpponentPollTimer.value; },
  get opponentPollElapsed() { return mockOpponentPollElapsed.value; },
  get roundTimer() { return mockRoundTimer.value; },
  get roundTimeLeft() { return mockRoundTimeLeft.value; },
  set_opponentPollTimer: mockSet_opponentPollTimer,
  set_opponentPollElapsed: mockSet_opponentPollElapsed,
  set_roundTimer: mockSet_roundTimer,
  set_roundTimeLeft: mockSet_roundTimeLeft,
}));

vi.mock('../src/arena/arena-constants.ts', () => ({
  get OPPONENT_POLL_MS() { return mockOPPONENT_POLL_MS.value; },
  get OPPONENT_POLL_TIMEOUT_SEC() { return mockOPPONENT_POLL_TIMEOUT_SEC.value; },
  get ROUND_DURATION() { return mockROUND_DURATION.value; },
  TEXT_MAX_CHARS: 500,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  get isPlaceholder() { return () => mockIsPlaceholder.value; },
  formatTimer: mockFormatTimer,
}));

vi.mock('../src/arena/arena-room-ai-response.ts', () => ({
  handleAIResponse: mockHandleAIResponse,
  generateSimulatedResponse: mockGenerateSimulatedResponse,
}));

vi.mock('../src/arena/arena-room-end.ts', () => ({
  endCurrentDebate: mockEndCurrentDebate,
}));

vi.mock('../src/arena/arena-room-live-messages.ts', () => ({
  addMessage: mockAddMessage,
  addSystemMessage: mockAddSystemMessage,
}));

import {
  stopOpponentPoll,
  startOpponentPoll,
  submitTextArgument,
  advanceRound,
  startLiveRoundTimer,
} from '../src/arena/arena-room-live-poll.ts';

describe('TC1 — stopOpponentPoll clears timer and resets elapsed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpponentPollTimer.value = setInterval(() => {}, 99999);
    mockOpponentPollElapsed.value = 5;
  });

  it('calls set_opponentPollTimer(null) and set_opponentPollElapsed(0)', () => {
    stopOpponentPoll();
    expect(mockSet_opponentPollTimer).toHaveBeenCalledWith(null);
    expect(mockSet_opponentPollElapsed).toHaveBeenCalledWith(0);
  });
});

describe('TC2 — startOpponentPoll sets up polling interval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockOpponentPollTimer.value = null;
    mockOpponentPollElapsed.value = 0;
    mockOPPONENT_POLL_MS.value = 3000;
    mockOPPONENT_POLL_TIMEOUT_SEC.value = 30;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls set_opponentPollTimer with a timer', () => {
    startOpponentPoll('debate-1', 'a', 1);
    expect(mockSet_opponentPollTimer).toHaveBeenCalled();
  });

  it('polls safeRpc on interval tick', async () => {
    mockSafeRpc.mockResolvedValueOnce({ data: [], error: null });
    startOpponentPoll('debate-1', 'a', 1);
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockSafeRpc).toHaveBeenCalledWith('get_debate_messages', { p_debate_id: 'debate-1' }, mockGetDebateMessages);
  });

  it('calls addMessage when opponent message found', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: [{ side: 'b', round: 1, content: 'Opponent arg', is_ai: false }],
      error: null,
    });
    startOpponentPoll('debate-1', 'a', 1);
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockAddMessage).toHaveBeenCalledWith('b', 'Opponent arg', 1, false);
  });
});

describe('TC3 — submitTextArgument does nothing if input empty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<textarea id="arena-text-input"></textarea>';
    mockCurrentDebate.value = { id: 'debate-1', role: 'a', round: 1, totalRounds: 3, mode: 'text' };
    mockIsPlaceholder.value = false;
  });

  it('returns early when input value is empty', async () => {
    await submitTextArgument();
    expect(mockAddMessage).not.toHaveBeenCalled();
  });
});

describe('TC4 — submitTextArgument submits message and polls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <textarea id="arena-text-input">Hello world</textarea>
      <button id="arena-send-btn"></button>
      <span id="arena-char-count">11</span>
    `;
    mockCurrentDebate.value = { id: 'debate-1', role: 'a', round: 1, totalRounds: 3, mode: 'text' };
    mockIsPlaceholder.value = false;
    mockOpponentPollTimer.value = null;
    mockOpponentPollElapsed.value = 0;
  });

  it('calls addMessage with the text content', async () => {
    await submitTextArgument();
    expect(mockAddMessage).toHaveBeenCalledWith('a', 'Hello world', 1, false);
  });

  it('calls safeRpc submit_debate_message for real debate', async () => {
    await submitTextArgument();
    expect(mockSafeRpc).toHaveBeenCalledWith('submit_debate_message', expect.objectContaining({
      p_debate_id: 'debate-1',
      p_content: 'Hello world',
    }));
  });

  it('does not call safeRpc for ai-local debates', async () => {
    mockCurrentDebate.value = { id: 'ai-local-123', role: 'a', round: 1, totalRounds: 3, mode: 'text' };
    await submitTextArgument();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  it('calls handleAIResponse for ai mode', async () => {
    mockCurrentDebate.value = { id: 'debate-1', role: 'a', round: 1, totalRounds: 3, mode: 'ai' };
    await submitTextArgument();
    expect(mockHandleAIResponse).toHaveBeenCalled();
  });
});

describe('TC5 — advanceRound increments round and calls nudge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockCurrentDebate.value = { id: 'debate-1', role: 'a', round: 1, totalRounds: 3, mode: 'text' };
    document.body.innerHTML = '<div id="arena-round-label"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('increments debate.round', () => {
    advanceRound();
    expect((mockCurrentDebate.value as Record<string, unknown>).round).toBe(2);
  });

  it('calls nudge', () => {
    advanceRound();
    expect(mockNudge).toHaveBeenCalledWith('round_end', expect.any(String));
  });

  it('calls addSystemMessage with round info', () => {
    advanceRound();
    expect(mockAddSystemMessage).toHaveBeenCalledWith(expect.stringContaining('Round 2'));
  });

  it('calls endCurrentDebate after timeout when all rounds done', async () => {
    mockCurrentDebate.value = { id: 'debate-1', role: 'a', round: 3, totalRounds: 3, mode: 'text' };
    advanceRound();
    await vi.advanceTimersByTimeAsync(1500);
    expect(mockEndCurrentDebate).toHaveBeenCalled();
  });
});

describe('TC6 — startLiveRoundTimer sets up countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockRoundTimer.value = null;
    mockRoundTimeLeft.value = 60;
    mockROUND_DURATION.value = 60;
    mockCurrentDebate.value = { id: 'debate-1', role: 'a', round: 1, totalRounds: 3, mode: 'live' };
    document.body.innerHTML = '<div id="arena-room-timer"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls set_roundTimeLeft with ROUND_DURATION', () => {
    startLiveRoundTimer();
    expect(mockSet_roundTimeLeft).toHaveBeenCalledWith(60);
  });

  it('calls set_roundTimer with interval', () => {
    startLiveRoundTimer();
    expect(mockSet_roundTimer).toHaveBeenCalled();
  });

  it('decrements roundTimeLeft each second', async () => {
    startLiveRoundTimer();
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockSet_roundTimeLeft).toHaveBeenCalledWith(59);
  });
});

describe('ARCH — arena-room-live-poll.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      '../nudge.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-constants.ts',
      './arena-core.utils.ts',
      './arena-room-ai-response.ts',
      './arena-room-end.ts',
      './arena-room-live-messages.ts',
      '../config.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-live-poll.ts'),
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
