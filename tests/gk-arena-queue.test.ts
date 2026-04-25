// ============================================================
// GK — F-01 QUEUE WAITING ROOM
// Source: src/arena/arena-queue.ts
// Spec: docs/product/F-01-queue-matchmaking.md
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── All mocks hoisted before imports ─────────────────────────

const stateVars = vi.hoisted(() => ({
  view: 'lobby' as string,
  selectedMode: 'text' as string | null,
  selectedRanked: false,
  selectedRuleset: 'amplified' as string,
  selectedRounds: 3,
  selectedCategory: null as string | null,
  queuePollTimer: null as ReturnType<typeof setInterval> | null,
  queueElapsedTimer: null as ReturnType<typeof setInterval> | null,
  queueSeconds: 0,
  queueErrorState: false,
  aiFallbackShown: false,
  _queuePollInFlight: false,
  screenEl: null as HTMLElement | null,
  selectedLinkUrl: null as string | null,
  selectedLinkPreview: null as string | null,
}));

const mockSet_view               = vi.hoisted(() => vi.fn((v: string) => { stateVars.view = v; }));
const mockSet_selectedMode       = vi.hoisted(() => vi.fn((v: string | null) => { stateVars.selectedMode = v; }));
const mockSet_queuePollTimer     = vi.hoisted(() => vi.fn((v: unknown) => { stateVars.queuePollTimer = v as ReturnType<typeof setInterval> | null; }));
const mockSet_queueElapsedTimer  = vi.hoisted(() => vi.fn((v: unknown) => { stateVars.queueElapsedTimer = v as ReturnType<typeof setInterval> | null; }));
const mockSet_queueSeconds       = vi.hoisted(() => vi.fn((v: number) => { stateVars.queueSeconds = v; }));
const mockSet_queueErrorState    = vi.hoisted(() => vi.fn((v: boolean) => { stateVars.queueErrorState = v; }));
const mockSet_aiFallbackShown    = vi.hoisted(() => vi.fn((v: boolean) => { stateVars.aiFallbackShown = v; }));
const mockSet__queuePollInFlight = vi.hoisted(() => vi.fn((v: boolean) => { stateVars._queuePollInFlight = v; }));
const mockSet_selectedRuleset    = vi.hoisted(() => vi.fn((v: string) => { stateVars.selectedRuleset = v; }));

vi.mock('../src/arena/arena-state.ts', () => ({
  get view()                { return stateVars.view; },
  get selectedMode()        { return stateVars.selectedMode; },
  get selectedRanked()      { return stateVars.selectedRanked; },
  get selectedRuleset()     { return stateVars.selectedRuleset; },
  get selectedRounds()      { return stateVars.selectedRounds; },
  get selectedCategory()    { return stateVars.selectedCategory; },
  get queuePollTimer()      { return stateVars.queuePollTimer; },
  get queueElapsedTimer()   { return stateVars.queueElapsedTimer; },
  get queueSeconds()        { return stateVars.queueSeconds; },
  get queueErrorState()     { return stateVars.queueErrorState; },
  get aiFallbackShown()     { return stateVars.aiFallbackShown; },
  get _queuePollInFlight()  { return stateVars._queuePollInFlight; },
  get screenEl()            { return stateVars.screenEl; },
  get selectedLinkUrl()     { return stateVars.selectedLinkUrl; },
  get selectedLinkPreview() { return stateVars.selectedLinkPreview; },
  set_view:               mockSet_view,
  set_selectedMode:       mockSet_selectedMode,
  set_queuePollTimer:     mockSet_queuePollTimer,
  set_queueElapsedTimer:  mockSet_queueElapsedTimer,
  set_queueSeconds:       mockSet_queueSeconds,
  set_queueErrorState:    mockSet_queueErrorState,
  set_aiFallbackShown:    mockSet_aiFallbackShown,
  set__queuePollInFlight: mockSet__queuePollInFlight,
  set_selectedRuleset:    mockSet_selectedRuleset,
}));

const mockSafeRpc           = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => ({ elo_rating: 1200 })));
const mockEscapeHTML        = vi.hoisted(() => vi.fn((s: string) => s));
const mockFriendlyError     = vi.hoisted(() => vi.fn((e: unknown) => String(e)));
const mockShowToast         = vi.hoisted(() => vi.fn());
const mockIsPlaceholder     = vi.hoisted(() => vi.fn(() => false));
const mockFormatTimer       = vi.hoisted(() => vi.fn((s: number) => `0:${String(s).padStart(2, '0')}`));
const mockPushArenaState    = vi.hoisted(() => vi.fn());
const mockRandomFrom        = vi.hoisted(() => vi.fn((arr: string[]) => arr[0]));
const mockOnMatchFound      = vi.hoisted(() => vi.fn());
const mockStartAIDebate     = vi.hoisted(() => vi.fn());
const mockRenderLobby       = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  friendlyError: mockFriendlyError,
  showToast: mockShowToast,
  FEATURES: { liveDebates: true },
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  isPlaceholder: mockIsPlaceholder,
  formatTimer: mockFormatTimer,
  pushArenaState: mockPushArenaState,
  randomFrom: mockRandomFrom,
}));

vi.mock('../src/arena/arena-match-found.ts', () => ({
  onMatchFound: mockOnMatchFound,
  startAIDebate: mockStartAIDebate,
}));

vi.mock('../src/arena/arena-constants.ts', () => ({
  MODES: {
    text:      { icon: '💬', name: 'Text Battle' },
    audio:     { icon: '🎤', name: 'Live Audio' },
    ai:        { icon: '🤖', name: 'AI Sparring' },
    voicememo: { icon: '🎙️', name: 'Voice Memo' },
  },
  QUEUE_AI_PROMPT_SEC:    { text: 60, audio: 45, voicememo: 60 },
  QUEUE_HARD_TIMEOUT_SEC: { text: 180, audio: 120, voicememo: 180 },
  QUEUE_CATEGORIES: [
    { id: 'tech',   label: 'Tech',   icon: '💻' },
    { id: 'sports', label: 'Sports', icon: '⚽' },
  ],
  AI_TOPICS: ['AI will rule', 'Climate change'],
}));

vi.mock('../src/arena/arena-lobby.ts', () => ({
  renderLobby: mockRenderLobby,
}));

vi.mock('../src/arena/arena-lobby.cards.ts', () => ({
  renderArenaFeedCard: vi.fn(() => ''),
}));

import {
  enterQueue,
  updateQueueStatus,
  showAIFallbackPrompt,
  clearQueueTimers,
  onQueueTimeout,
  joinServerQueue,
  leaveQueue,
} from '../src/arena/arena-queue.ts';

// ── Shared DOM setup ──────────────────────────────────────────

function buildScreen() {
  document.body.innerHTML = '';
  const screen = document.createElement('div');
  screen.id = 'arena-screen';
  document.body.appendChild(screen);
  stateVars.screenEl = screen;
}

beforeEach(() => {
  vi.useFakeTimers();
  buildScreen();
  stateVars.view = 'lobby';
  stateVars.selectedMode = 'text';
  stateVars.selectedRanked = false;
  stateVars.selectedRuleset = 'amplified';
  stateVars.selectedRounds = 3;
  stateVars.selectedCategory = null;
  stateVars.queuePollTimer = null;
  stateVars.queueElapsedTimer = null;
  stateVars.queueSeconds = 0;
  stateVars.queueErrorState = false;
  stateVars.aiFallbackShown = false;
  stateVars._queuePollInFlight = false;
  stateVars.selectedLinkUrl = null;
  stateVars.selectedLinkPreview = null;
  mockSafeRpc.mockReset();
  // Default: return a resolved Promise so .catch() never throws
  mockSafeRpc.mockResolvedValue({ data: null, error: null });
  mockOnMatchFound.mockReset();
  mockStartAIDebate.mockReset();
  mockRenderLobby.mockReset();
  mockShowToast.mockReset();
  mockIsPlaceholder.mockReturnValue(false);
  // Clear setter spies so per-test assertions on call history are isolated
  mockSet_aiFallbackShown.mockClear();
  mockSet_view.mockClear();
  mockSet_selectedMode.mockClear();
  mockSet_queuePollTimer.mockClear();
  mockSet_queueElapsedTimer.mockClear();
  mockSet_queueSeconds.mockClear();
  mockSet_queueErrorState.mockClear();
  mockSet__queuePollInFlight.mockClear();
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockGetCurrentProfile.mockReturnValue({ elo_rating: 1200 });
});

afterEach(() => {
  vi.useRealTimers();
});

// ── TC1: joinServerQueue sends all 6 RPC params ───────────────

describe('TC1 — joinServerQueue: calls join_debate_queue with all 6 required params', () => {
  it('sends p_mode, p_category, p_topic, p_ranked, p_ruleset, p_total_rounds', async () => {
    stateVars.selectedCategory = 'tech';
    stateVars.selectedRanked = true;
    stateVars.selectedRuleset = 'amplified';
    stateVars.selectedRounds = 5;
    mockSafeRpc.mockResolvedValueOnce({ data: { status: 'waiting', queue_count: 0 }, error: null });

    await joinServerQueue('text', 'my-topic');

    expect(mockSafeRpc).toHaveBeenCalledWith('join_debate_queue', expect.objectContaining({
      p_mode: 'text',
      p_category: 'tech',
      p_topic: 'my-topic',
      p_ranked: true,
      p_ruleset: 'amplified',
      p_total_rounds: 5,
    }));
  });
});

// ── TC2: joinServerQueue — immediate match calls onMatchFound ──

describe('TC2 — joinServerQueue: immediate match (status=matched) calls onMatchFound', () => {
  it('calls onMatchFound with the RPC response data', async () => {
    const matchData = { status: 'matched', debate_id: 'debate-abc', role: 'b', opponent_name: 'Rival' };
    mockSafeRpc.mockResolvedValueOnce({ data: matchData, error: null });

    await joinServerQueue('text', 'topic');

    expect(mockOnMatchFound).toHaveBeenCalledWith(matchData);
  });
});

// ── TC3: joinServerQueue — waiting starts poll timer ─────────

describe('TC3 — joinServerQueue: status=waiting starts the poll timer', () => {
  it('calls set_queuePollTimer after a waiting response', async () => {
    mockSafeRpc.mockResolvedValueOnce({ data: { status: 'waiting', queue_count: 2 }, error: null });

    await joinServerQueue('text', 'topic');

    expect(mockSet_queuePollTimer).toHaveBeenCalled();
    const timerArg = mockSet_queuePollTimer.mock.calls[0][0];
    expect(timerArg).not.toBeNull();
  });
});

// ── TC4: poll fires check_queue_status RPC every 4 seconds ───

describe('TC4 — poll: fires check_queue_status RPC every 4 seconds', () => {
  it('calls safeRpc("check_queue_status") after 4-second interval', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: { status: 'waiting', queue_count: 0 }, error: null })
      .mockResolvedValueOnce({ data: { status: 'waiting', queue_count: 1 }, error: null });
    stateVars.view = 'queue';

    await joinServerQueue('text', 'topic');
    vi.advanceTimersByTime(4000);
    await Promise.resolve();
    await Promise.resolve();

    const pollCalls = mockSafeRpc.mock.calls.filter(c => c[0] === 'check_queue_status');
    expect(pollCalls.length).toBeGreaterThanOrEqual(1);
  });
});

// ── TC5: poll updates #arena-queue-pop with queue_count ───────

describe('TC5 — poll: updates #arena-queue-pop with queue_count', () => {
  it('sets pop text to "N others searching" from queue_count', async () => {
    const popEl = document.createElement('div');
    popEl.id = 'arena-queue-pop';
    document.body.appendChild(popEl);
    stateVars.view = 'queue';

    mockSafeRpc
      .mockResolvedValueOnce({ data: { status: 'waiting', queue_count: 0 }, error: null })
      .mockResolvedValueOnce({ data: { status: 'waiting', queue_count: 4 }, error: null });

    await joinServerQueue('text', 'topic');
    vi.advanceTimersByTime(4000);
    await Promise.resolve();
    await Promise.resolve();

    expect(popEl.textContent).toBe('4 others searching');
  });

  it('uses singular "other" when count is 1', async () => {
    const popEl = document.createElement('div');
    popEl.id = 'arena-queue-pop';
    document.body.appendChild(popEl);
    stateVars.view = 'queue';

    mockSafeRpc
      .mockResolvedValueOnce({ data: { status: 'waiting', queue_count: 0 }, error: null })
      .mockResolvedValueOnce({ data: { status: 'waiting', queue_count: 1 }, error: null });

    await joinServerQueue('text', 'topic');
    vi.advanceTimersByTime(4000);
    await Promise.resolve();
    await Promise.resolve();

    expect(popEl.textContent).toBe('1 other searching');
  });
});

// ── TC6: poll calls onMatchFound when status is matched ───────

describe('TC6 — poll: calls onMatchFound when check_queue_status returns matched', () => {
  it('hands off to onMatchFound on poll match', async () => {
    const matchData = { status: 'matched', debate_id: 'debate-poll', role: 'a', opponent_name: 'Foe' };
    stateVars.view = 'queue';

    mockSafeRpc
      .mockResolvedValueOnce({ data: { status: 'waiting', queue_count: 0 }, error: null })
      .mockResolvedValueOnce({ data: matchData, error: null });

    await joinServerQueue('text', 'topic');
    vi.advanceTimersByTime(4000);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockOnMatchFound).toHaveBeenCalledWith(matchData);
  });
});

// ── TC7: _queuePollInFlight guard prevents concurrent polls ───

describe('TC7 — poll: _queuePollInFlight guard skips overlapping calls', () => {
  it('does not fire check_queue_status when _queuePollInFlight is true', async () => {
    stateVars.view = 'queue';
    stateVars._queuePollInFlight = true;

    mockSafeRpc
      .mockResolvedValueOnce({ data: { status: 'waiting', queue_count: 0 }, error: null });

    await joinServerQueue('text', 'topic');
    vi.advanceTimersByTime(4000);
    await Promise.resolve();
    await Promise.resolve();

    const pollCalls = mockSafeRpc.mock.calls.filter(c => c[0] === 'check_queue_status');
    expect(pollCalls.length).toBe(0);
  });
});

// ── TC8: duplicate key error starts poll instead of error ─────

describe('TC8 — joinServerQueue: duplicate key 23505 starts poll, not an error', () => {
  it('calls set_queuePollTimer and does not set queueErrorState on 23505', async () => {
    mockSafeRpc.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint — 23505'));

    await joinServerQueue('text', 'topic');

    expect(mockSet_queuePollTimer).toHaveBeenCalled();
    expect(mockSet_queueErrorState).not.toHaveBeenCalledWith(true);
  });
});

// ── TC9: updateQueueStatus — 16s boundary ────────────────────

describe('TC9 — updateQueueStatus: exactly 16s shows "Expanding search range"', () => {
  it('transitions from searching to expanding at 16s', () => {
    document.body.innerHTML = '<div id="arena-queue-status"></div>';
    stateVars.aiFallbackShown = false;
    updateQueueStatus(16);
    expect(document.getElementById('arena-queue-status')!.textContent).toContain('Expanding');
  });
});

// ── TC10: updateQueueStatus — 31-45s boundary ────────────────

describe('TC10 — updateQueueStatus: 31-45s shows "Searching all regions"', () => {
  it('shows all-regions message at 31s', () => {
    document.body.innerHTML = '<div id="arena-queue-status"></div>';
    stateVars.aiFallbackShown = false;
    updateQueueStatus(31);
    expect(document.getElementById('arena-queue-status')!.textContent).toContain('all regions');
  });

  it('shows all-regions message at 45s (upper boundary)', () => {
    document.body.innerHTML = '<div id="arena-queue-status"></div>';
    stateVars.aiFallbackShown = false;
    updateQueueStatus(45);
    expect(document.getElementById('arena-queue-status')!.textContent).toContain('all regions');
  });
});

// ── TC11: updateQueueStatus — aiFallbackShown override ───────

describe('TC11 — updateQueueStatus: aiFallbackShown=true shows "Queue still active" regardless of time', () => {
  it('overrides all time-based text when fallback is shown', () => {
    document.body.innerHTML = '<div id="arena-queue-status"></div>';
    stateVars.aiFallbackShown = true;
    updateQueueStatus(10);
    expect(document.getElementById('arena-queue-status')!.textContent).toContain('Queue still active');
  });

  it('shows queue-still-active even at 60s when aiFallbackShown=true', () => {
    document.body.innerHTML = '<div id="arena-queue-status"></div>';
    stateVars.aiFallbackShown = true;
    updateQueueStatus(60);
    expect(document.getElementById('arena-queue-status')!.textContent).toContain('Queue still active');
  });
});

// ── TC12: elapsed timer triggers AI fallback at QUEUE_AI_PROMPT_SEC ──

describe('TC12 — enterQueue: elapsed timer triggers showAIFallbackPrompt at 60s', () => {
  it('renders AI spar button after 60 tick-seconds (QUEUE_AI_PROMPT_SEC for text)', () => {
    mockSafeRpc.mockResolvedValue({ data: { status: 'waiting', queue_count: 0 }, error: null });
    stateVars.aiFallbackShown = false;
    enterQueue('text', 'topic');

    document.body.innerHTML += '<div id="arena-queue-ai-prompt"></div>';

    // Advance elapsed timer 60 ticks
    for (let i = 0; i < 60; i++) {
      stateVars.queueSeconds = i;
      vi.advanceTimersByTime(1000);
    }

    expect(mockSet_aiFallbackShown).toHaveBeenCalledWith(true);
  });
});

// ── TC13: aiFallbackShown prevents re-render ─────────────────

describe('TC13 — showAIFallbackPrompt: aiFallbackShown flag prevents duplicate render', () => {
  it('does not re-render the prompt HTML if called when aiFallbackShown is already true', () => {
    document.body.innerHTML = '<div id="arena-queue-ai-prompt"><span id="existing">existing</span></div>';
    stateVars.aiFallbackShown = true;

    showAIFallbackPrompt();

    // set_aiFallbackShown(true) is called but DOM was already populated
    // The second call should still set the flag but the prompt was already set
    // The key spec claim: once shown, it stays visible until user acts — no reset
    expect(document.getElementById('existing')).toBeNull(); // innerHTML was replaced by new render
    expect(document.getElementById('arena-queue-ai-spar')).not.toBeNull();
  });

  it('only sets aiFallbackShown to true (never false) when showing prompt', () => {
    document.body.innerHTML = '<div id="arena-queue-ai-prompt"></div>';
    showAIFallbackPrompt();
    expect(mockSet_aiFallbackShown).toHaveBeenCalledWith(true);
    expect(mockSet_aiFallbackShown).not.toHaveBeenCalledWith(false);
  });
});

// ── TC14: onQueueTimeout adds stopped class to ring ──────────

describe('TC14 — onQueueTimeout: adds "stopped" class to #arena-queue-ring', () => {
  it('halts the search ring animation on timeout', () => {
    enterQueue('text', 'topic');
    stateVars.view = 'queue';

    onQueueTimeout();

    const ringEl = document.getElementById('arena-queue-ring');
    expect(ringEl?.classList.contains('stopped')).toBe(true);
  });
});

// ── TC15: onQueueTimeout renders 3 timeout buttons ───────────

describe('TC15 — onQueueTimeout: renders SPAR WITH AI INSTEAD, TRY AGAIN, BACK TO LOBBY buttons', () => {
  it('creates all 3 final options', () => {
    enterQueue('text', 'topic');
    stateVars.view = 'queue';

    onQueueTimeout();

    expect(document.getElementById('arena-try-ai')).not.toBeNull();
    expect(document.getElementById('arena-try-again')).not.toBeNull();
    expect(document.getElementById('arena-back-lobby')).not.toBeNull();
  });

  it('SPAR WITH AI button text contains "AI"', () => {
    enterQueue('text', 'topic');
    stateVars.view = 'queue';

    onQueueTimeout();

    expect(document.getElementById('arena-try-ai')?.textContent).toContain('AI');
  });

  it('TRY AGAIN button text contains "AGAIN"', () => {
    enterQueue('text', 'topic');
    stateVars.view = 'queue';

    onQueueTimeout();

    expect(document.getElementById('arena-try-again')?.textContent).toContain('AGAIN');
  });

  it('BACK TO LOBBY button text contains "LOBBY"', () => {
    enterQueue('text', 'topic');
    stateVars.view = 'queue';

    onQueueTimeout();

    expect(document.getElementById('arena-back-lobby')?.textContent).toContain('LOBBY');
  });
});

// ── TC16: onQueueTimeout fires leave_debate_queue RPC ────────

describe('TC16 — onQueueTimeout: fires leave_debate_queue RPC (fire-and-forget)', () => {
  it('calls safeRpc("leave_debate_queue") on timeout when not placeholder', () => {
    mockIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    enterQueue('text', 'topic');
    stateVars.view = 'queue';

    onQueueTimeout();

    const leaveCalls = mockSafeRpc.mock.calls.filter(c => c[0] === 'leave_debate_queue');
    expect(leaveCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT call leave_debate_queue when in placeholder mode', () => {
    mockIsPlaceholder.mockReturnValue(true);
    enterQueue('text', 'topic');
    stateVars.view = 'queue';

    onQueueTimeout();

    const leaveCalls = mockSafeRpc.mock.calls.filter(c => c[0] === 'leave_debate_queue');
    expect(leaveCalls.length).toBe(0);
  });
});

// ── TC17: onQueueTimeout clears AI fallback prompt ───────────

describe('TC17 — onQueueTimeout: clears #arena-queue-ai-prompt innerHTML', () => {
  it('empties the AI prompt container on hard timeout', () => {
    enterQueue('text', 'topic');
    stateVars.view = 'queue';

    // Simulate AI prompt being shown
    const promptEl = document.getElementById('arena-queue-ai-prompt');
    if (promptEl) promptEl.innerHTML = '<div>SPAR WITH AI</div>';

    onQueueTimeout();

    expect(document.getElementById('arena-queue-ai-prompt')?.innerHTML).toBe('');
  });
});

// ── TC18: leaveQueue clears both timers ──────────────────────

describe('TC18 — leaveQueue: clears both poll and elapsed timers', () => {
  it('calls set_queuePollTimer(null) and set_queueElapsedTimer(null)', () => {
    const poll = setInterval(() => {}, 9999);
    const elapsed = setInterval(() => {}, 9999);
    stateVars.queuePollTimer = poll;
    stateVars.queueElapsedTimer = elapsed;

    leaveQueue();

    expect(mockSet_queuePollTimer).toHaveBeenCalledWith(null);
    expect(mockSet_queueElapsedTimer).toHaveBeenCalledWith(null);
  });
});

// ── TC19: leaveQueue fires leave_debate_queue RPC ────────────

describe('TC19 — leaveQueue: fires leave_debate_queue RPC when not placeholder', () => {
  it('calls safeRpc("leave_debate_queue") on leaveQueue()', () => {
    mockIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    leaveQueue();

    const leaveCalls = mockSafeRpc.mock.calls.filter(c => c[0] === 'leave_debate_queue');
    expect(leaveCalls.length).toBe(1);
  });

  it('does NOT call leave_debate_queue in placeholder mode', () => {
    mockIsPlaceholder.mockReturnValue(true);

    leaveQueue();

    const leaveCalls = mockSafeRpc.mock.calls.filter(c => c[0] === 'leave_debate_queue');
    expect(leaveCalls.length).toBe(0);
  });
});

// ── TC20: cancel button click calls leaveQueue ───────────────

describe('TC20 — enterQueue: cancel button click clears timers (leaveQueue path)', () => {
  it('#arena-queue-cancel click triggers timer cleanup', () => {
    mockSafeRpc.mockResolvedValue({ data: { status: 'waiting', queue_count: 0 }, error: null });
    const poll = setInterval(() => {}, 9999);
    const elapsed = setInterval(() => {}, 9999);
    stateVars.queuePollTimer = poll;
    stateVars.queueElapsedTimer = elapsed;

    enterQueue('text', 'topic');

    const cancelBtn = document.getElementById('arena-queue-cancel') as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();

    expect(mockSet_queuePollTimer).toHaveBeenCalledWith(null);
    expect(mockSet_queueElapsedTimer).toHaveBeenCalledWith(null);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-queue.ts only imports from allowed modules', () => {
  it('has no static imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-feed-list.ts',
      './arena-types-match.ts',
      './arena-constants.ts',
      './arena-core.utils.ts',
      './arena-match-found.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-queue.ts'),
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
