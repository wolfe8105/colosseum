// ============================================================
// ARENA QUEUE — tests/arena-queue.test.ts
// Source: src/arena/arena-queue.ts
//
// CLASSIFICATION:
//   enterQueue()           — DOM builder + state → Integration test
//   updateQueueStatus()    — DOM text update → Pure calculation test
//   showAIFallbackPrompt() — DOM builder → Integration test
//   onQueueTimeout()       — DOM update → Integration test
//   clearQueueTimers()     — Timer cleanup → Behavioral test
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const stateVars = vi.hoisted(() => ({
  view: 'lobby' as string,
  selectedMode: 'text' as string | null,
  selectedRanked: false,
  selectedRuleset: 'amplified' as string,
  selectedRounds: 4,
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

const mockSafeRpc          = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => ({ elo_rating: 1200 })));
const mockEscapeHTML       = vi.hoisted(() => vi.fn((s: string) => s));
const mockShowToast        = vi.hoisted(() => vi.fn());
const mockIsPlaceholder    = vi.hoisted(() => vi.fn(() => true));
const mockFormatTimer      = vi.hoisted(() => vi.fn((s: number) => `0:${String(s).padStart(2, '0')}`));
const mockPushArenaState   = vi.hoisted(() => vi.fn());
const mockRandomFrom       = vi.hoisted(() => vi.fn((arr: string[]) => arr[0]));
const mockOnMatchFound     = vi.hoisted(() => vi.fn());
const mockStartAIDebate    = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  friendlyError: vi.fn((e: unknown) => String(e)),
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
    text: { icon: '💬', name: 'Text Battle' },
    audio: { icon: '🎤', name: 'Live Audio' },
    ai: { icon: '🤖', name: 'AI Sparring' },
    voicememo: { icon: '🎙️', name: 'Voice Memo' },
  },
  QUEUE_AI_PROMPT_SEC: { text: 60, audio: 45 },
  QUEUE_HARD_TIMEOUT_SEC: { text: 180, audio: 120 },
  QUEUE_CATEGORIES: [
    { id: 'tech', label: 'Tech', icon: '💻' },
  ],
  AI_TOPICS: ['AI will rule', 'Climate change'],
}));

vi.mock('../src/arena/arena-lobby.ts', () => ({
  renderLobby: vi.fn(),
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
} from '../src/arena/arena-queue.ts';

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  const screen = document.createElement('div');
  screen.id = 'arena-screen';
  document.body.appendChild(screen);
  stateVars.screenEl = screen;
  stateVars.view = 'lobby';
  stateVars.selectedMode = 'text';
  stateVars.queuePollTimer = null;
  stateVars.queueElapsedTimer = null;
  stateVars.queueSeconds = 0;
  stateVars.aiFallbackShown = false;
  stateVars.queueErrorState = false;
  stateVars.selectedCategory = null;

  mockSafeRpc.mockReset();
  mockOnMatchFound.mockReset();
  mockStartAIDebate.mockReset();
  mockIsPlaceholder.mockReturnValue(true);
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockGetCurrentProfile.mockReturnValue({ elo_rating: 1200 });
});

afterEach(() => {
  vi.useRealTimers();
});

// ── TC1: enterQueue 'ai' — calls startAIDebate and returns ───

describe('TC1 — enterQueue: ai mode calls startAIDebate', () => {
  it('calls startAIDebate for ai mode', () => {
    enterQueue('ai', 'topic');
    expect(mockStartAIDebate).toHaveBeenCalledWith('topic');
  });
});

// ── TC2: enterQueue — renders .arena-queue DOM ────────────────

describe('TC2 — enterQueue: renders .arena-queue element', () => {
  it('appends .arena-queue to screenEl', () => {
    enterQueue('text', 'topic');
    expect(stateVars.screenEl!.querySelector('.arena-queue')).not.toBeNull();
  });
});

// ── TC3: enterQueue — sets view to queue ─────────────────────

describe('TC3 — enterQueue: calls set_view("queue")', () => {
  it('updates view state to queue', () => {
    enterQueue('text', 'topic');
    expect(mockSet_view).toHaveBeenCalledWith('queue');
  });
});

// ── TC4: enterQueue — shows cancel button ────────────────────

describe('TC4 — enterQueue: renders cancel button', () => {
  it('creates #arena-queue-cancel button', () => {
    enterQueue('text', 'topic');
    expect(document.getElementById('arena-queue-cancel')).not.toBeNull();
  });
});

// ── TC5: updateQueueStatus — 0-15s → searching message ───────

describe('TC5 — updateQueueStatus: 0-15s shows searching message', () => {
  it('sets status to "Searching for a worthy opponent"', () => {
    document.body.innerHTML = '<div id="arena-queue-status"></div>';
    stateVars.aiFallbackShown = false;
    updateQueueStatus(10);
    expect(document.getElementById('arena-queue-status')!.textContent).toContain('worthy opponent');
  });
});

// ── TC6: updateQueueStatus — 16-30s → expanding range ────────

describe('TC6 — updateQueueStatus: 16-30s shows expanding search', () => {
  it('sets status to "Expanding search range"', () => {
    document.body.innerHTML = '<div id="arena-queue-status"></div>';
    stateVars.aiFallbackShown = false;
    updateQueueStatus(20);
    expect(document.getElementById('arena-queue-status')!.textContent).toContain('Expanding');
  });
});

// ── TC7: updateQueueStatus — 46s+ → still looking ────────────

describe('TC7 — updateQueueStatus: 46s+ shows still looking', () => {
  it('sets status to "Still looking"', () => {
    document.body.innerHTML = '<div id="arena-queue-status"></div>';
    stateVars.aiFallbackShown = false;
    updateQueueStatus(60);
    expect(document.getElementById('arena-queue-status')!.textContent).toContain('Still looking');
  });
});

// ── TC8: showAIFallbackPrompt — renders AI spar button ───────

describe('TC8 — showAIFallbackPrompt: renders AI spar button', () => {
  it('creates #arena-queue-ai-spar button', () => {
    document.body.innerHTML = '<div id="arena-queue-ai-prompt"></div>';
    showAIFallbackPrompt();
    expect(document.getElementById('arena-queue-ai-spar')).not.toBeNull();
  });
});

// ── TC9: showAIFallbackPrompt — calls set_aiFallbackShown ────

describe('TC9 — showAIFallbackPrompt: calls set_aiFallbackShown(true)', () => {
  it('marks fallback as shown', () => {
    document.body.innerHTML = '<div id="arena-queue-ai-prompt"></div>';
    showAIFallbackPrompt();
    expect(mockSet_aiFallbackShown).toHaveBeenCalledWith(true);
  });
});

// ── TC10: clearQueueTimers — clears both timers ───────────────

describe('TC10 — clearQueueTimers: clears both poll and elapsed timers', () => {
  it('sets both timers to null via setters', () => {
    const poll = setInterval(() => {}, 9999);
    const elapsed = setInterval(() => {}, 9999);
    stateVars.queuePollTimer = poll;
    stateVars.queueElapsedTimer = elapsed;
    clearQueueTimers();
    expect(mockSet_queuePollTimer).toHaveBeenCalledWith(null);
    expect(mockSet_queueElapsedTimer).toHaveBeenCalledWith(null);
  });
});

// ── TC11: onQueueTimeout — shows no-opponents message ────────

describe('TC11 — onQueueTimeout: updates status to no opponents', () => {
  it('sets status text on timeout', () => {
    enterQueue('text', 'topic');
    stateVars.view = 'queue';
    onQueueTimeout();
    const statusEl = document.getElementById('arena-queue-status');
    expect(statusEl?.textContent).toContain('No opponents');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-queue.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
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
