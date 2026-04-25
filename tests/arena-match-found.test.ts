// ============================================================
// ARENA MATCH FOUND — tests/arena-match-found.test.ts
// Source: src/arena/arena-match-found.ts
//
// CLASSIFICATION:
//   onMatchFound()            — DOM + state → Integration test
//   showMatchFound()          — DOM builder → Integration test
//   onMatchDecline()          — RPC + state → Behavioral test
//   returnToQueueAfterDecline() — state + nav → Behavioral test
//   startAIDebate()           — async RPC + nav → Behavioral test
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const stateVars = vi.hoisted(() => ({
  selectedMode: 'text' as string | null,
  selectedRanked: false,
  selectedRuleset: 'amplified' as string,
  matchAcceptSeconds: 30,
  matchFoundDebate: null as unknown,
  screenEl: null as HTMLElement | null,
  queuePollTimer: null as ReturnType<typeof setInterval> | null,
  queueElapsedTimer: null as ReturnType<typeof setInterval> | null,
}));

const mockSet_matchAcceptTimer   = vi.hoisted(() => vi.fn());
const mockSet_matchAcceptSeconds = vi.hoisted(() => vi.fn((v: number) => { stateVars.matchAcceptSeconds = v; }));
const mockSet_matchFoundDebate   = vi.hoisted(() => vi.fn((v: unknown) => { stateVars.matchFoundDebate = v; }));
const mockSet_view               = vi.hoisted(() => vi.fn());
const mockSet_queuePollTimer     = vi.hoisted(() => vi.fn((v: unknown) => { stateVars.queuePollTimer = v as ReturnType<typeof setInterval> | null; }));
const mockSet_queueElapsedTimer  = vi.hoisted(() => vi.fn((v: unknown) => { stateVars.queueElapsedTimer = v as ReturnType<typeof setInterval> | null; }));

vi.mock('../src/arena/arena-state.ts', () => ({
  get selectedMode()       { return stateVars.selectedMode; },
  get selectedRanked()     { return stateVars.selectedRanked; },
  get selectedRuleset()    { return stateVars.selectedRuleset; },
  get matchAcceptSeconds() { return stateVars.matchAcceptSeconds; },
  get matchFoundDebate()   { return stateVars.matchFoundDebate; },
  get screenEl()           { return stateVars.screenEl; },
  get queuePollTimer()     { return stateVars.queuePollTimer; },
  get queueElapsedTimer()  { return stateVars.queueElapsedTimer; },
  set_matchAcceptTimer:   mockSet_matchAcceptTimer,
  set_matchAcceptSeconds: mockSet_matchAcceptSeconds,
  set_matchFoundDebate:   mockSet_matchFoundDebate,
  set_view:               mockSet_view,
  set_queuePollTimer:     mockSet_queuePollTimer,
  set_queueElapsedTimer:  mockSet_queueElapsedTimer,
}));

const mockSafeRpc           = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => null));
const mockEscapeHTML        = vi.hoisted(() => vi.fn((s: string) => s));
const mockIsPlaceholder     = vi.hoisted(() => vi.fn(() => true));
const mockRandomFrom        = vi.hoisted(() => vi.fn((arr: string[]) => arr[0]));
const mockPushArenaState    = vi.hoisted(() => vi.fn());
const mockEnterRoom         = vi.hoisted(() => vi.fn());
const mockShowPreDebate     = vi.hoisted(() => vi.fn());
const mockPlayIntroMusic    = vi.hoisted(() => vi.fn());
const mockClearMatchAcceptTimers = vi.hoisted(() => vi.fn());
const mockEnterQueue        = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  DEBATE: { defaultRounds: 4 },
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  isPlaceholder: mockIsPlaceholder,
  randomFrom: mockRandomFrom,
  pushArenaState: mockPushArenaState,
}));

vi.mock('../src/arena/arena-room-enter.ts', () => ({
  enterRoom: mockEnterRoom,
}));

vi.mock('../src/arena/arena-room-predebate.ts', () => ({
  showPreDebate: mockShowPreDebate,
}));

vi.mock('../src/arena/arena-sounds.ts', () => ({
  playIntroMusic: mockPlayIntroMusic,
}));

vi.mock('../src/arena/arena-match-timers.ts', () => ({
  clearMatchAcceptTimers: mockClearMatchAcceptTimers,
}));

vi.mock('../src/arena/arena-queue.ts', () => ({
  enterQueue: mockEnterQueue,
}));

vi.mock('../src/arena/arena-constants.ts', () => ({
  MATCH_ACCEPT_SEC: 30,
  AI_TOTAL_ROUNDS: 4,
  AI_TOPICS: ['AI ethics', 'Climate change'],
}));

vi.mock('../src/arena/arena-lobby.ts', () => ({
  renderLobby: vi.fn(),
}));

vi.mock('../src/arena/arena-match-flow.ts', () => ({
  onMatchAccept: vi.fn(),
}));

import {
  showMatchFound,
  onMatchDecline,
  returnToQueueAfterDecline,
  startAIDebate,
} from '../src/arena/arena-match-found.ts';
import type { CurrentDebate } from '../src/arena/arena-types.ts';

const makeDebate = (overrides = {}): CurrentDebate => ({
  id: 'd-1',
  topic: 'Hot debate topic',
  role: 'a',
  mode: 'text',
  round: 1,
  totalRounds: 4,
  opponentName: 'Bob',
  opponentId: 'user-b',
  opponentElo: 1200,
  ranked: false,
  ruleset: 'amplified',
  messages: [],
  ...overrides,
} as unknown as CurrentDebate);

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  const screen = document.createElement('div');
  screen.id = 'arena-screen';
  document.body.appendChild(screen);
  stateVars.screenEl = screen;
  stateVars.matchAcceptSeconds = 30;
  stateVars.matchFoundDebate = null;
  stateVars.selectedMode = 'text';

  mockSet_matchAcceptTimer.mockReset();
  mockSet_matchFoundDebate.mockReset();
  mockSet_view.mockReset();
  mockClearMatchAcceptTimers.mockReset();
  mockEnterRoom.mockReset();
  mockShowPreDebate.mockReset();
  mockEnterQueue.mockReset();
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockIsPlaceholder.mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

// ── TC1: showMatchFound — renders match found UI ──────────────

describe('TC1 — showMatchFound: renders .arena-match-found element', () => {
  it('appends .arena-match-found to screenEl', () => {
    showMatchFound(makeDebate());
    expect(stateVars.screenEl!.querySelector('.arena-match-found')).not.toBeNull();
  });
});

// ── TC2: showMatchFound — sets view to matchFound ─────────────

describe('TC2 — showMatchFound: calls set_view("matchFound")', () => {
  it('updates view state', () => {
    showMatchFound(makeDebate());
    expect(mockSet_view).toHaveBeenCalledWith('matchFound');
  });
});

// ── TC3: showMatchFound — shows opponent name ─────────────────

describe('TC3 — showMatchFound: displays opponent name', () => {
  it('renders opponent name in HTML', () => {
    showMatchFound(makeDebate({ opponentName: 'Alice' }));
    expect(stateVars.screenEl!.innerHTML).toContain('Alice');
  });
});

// ── TC4: showMatchFound — escapes opponent name ───────────────

describe('TC4 — showMatchFound: escapes opponentName', () => {
  it('passes opponentName through escapeHTML', () => {
    showMatchFound(makeDebate({ opponentName: '<b>Hacker</b>' }));
    expect(mockEscapeHTML).toHaveBeenCalledWith('<b>Hacker</b>');
  });
});

// ── TC5: showMatchFound — accept button exists ────────────────

describe('TC5 — showMatchFound: accept button exists', () => {
  it('renders #mf-accept-btn', () => {
    showMatchFound(makeDebate());
    expect(document.getElementById('mf-accept-btn')).not.toBeNull();
  });
});

// ── TC6: showMatchFound — sets matchFoundDebate ───────────────

describe('TC6 — showMatchFound: stores debate via set_matchFoundDebate', () => {
  it('calls set_matchFoundDebate with debate', () => {
    const debate = makeDebate();
    showMatchFound(debate);
    expect(mockSet_matchFoundDebate).toHaveBeenCalledWith(debate);
  });
});

// ── TC7: showMatchFound — starts accept timer ────────────────

describe('TC7 — showMatchFound: starts accept countdown timer', () => {
  it('calls set_matchAcceptTimer with interval', () => {
    showMatchFound(makeDebate());
    expect(mockSet_matchAcceptTimer).toHaveBeenCalledTimes(1);
  });
});

// ── TC8: onMatchDecline — calls clearMatchAcceptTimers ────────

describe('TC8 — onMatchDecline: calls clearMatchAcceptTimers', () => {
  it('clears timers on decline', () => {
    stateVars.matchFoundDebate = makeDebate();
    onMatchDecline();
    expect(mockClearMatchAcceptTimers).toHaveBeenCalledTimes(1);
  });
});

// ── TC9: returnToQueueAfterDecline — enters queue if mode set ─

describe('TC9 — returnToQueueAfterDecline: calls enterQueue when selectedMode is set', () => {
  it('calls enterQueue with selectedMode', () => {
    stateVars.selectedMode = 'text';
    returnToQueueAfterDecline();
    expect(mockEnterQueue).toHaveBeenCalledWith('text', '');
  });
});

// ── TC10: startAIDebate — calls showPreDebate in placeholder ──

describe('TC10 — startAIDebate: calls showPreDebate in placeholder mode', () => {
  it('calls showPreDebate with ai mode debate', async () => {
    mockIsPlaceholder.mockReturnValue(true);
    await startAIDebate('AI ethics');
    expect(mockShowPreDebate).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'ai', topic: 'AI ethics' })
    );
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-match-found.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-match.ts',
      './arena-constants.ts',
      './arena-core.utils.ts',
      './arena-room-enter.ts',
      './arena-room-predebate.ts',
      './arena-sounds.ts',
      './arena-match-timers.ts',
      './arena-queue.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-match-found.ts'),
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
