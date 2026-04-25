// ============================================================
// GK — F-02 MATCH FOUND ACCEPT/DECLINE — tests/gk-arena-match-found.test.ts
// Source: src/arena/arena-match-found.ts
// Spec:   docs/product/F-02-match-found.md
//
// Agent 2 — Gatekeeper run. Tests driven by spec only.
//
// CLASSIFICATION:
//   onMatchFound()              — DOM + state + timer → Integration
//   showMatchFound()            — DOM builder + state + side effects → Integration
//   onMatchDecline()            — RPC + state → Behavioral
//   returnToQueueAfterDecline() — state + nav → Behavioral
//   startAIDebate()             — async RPC + nav → Behavioral
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── vi.hoisted state bag ──────────────────────────────────────
const stateVars = vi.hoisted(() => ({
  selectedMode:     'text' as string | null,
  selectedRanked:   false,
  selectedRuleset:  'amplified' as string,
  matchAcceptSeconds: 12,
  matchFoundDebate: null as unknown,
  screenEl:         null as HTMLElement | null,
  queuePollTimer:   null as ReturnType<typeof setInterval> | null,
  queueElapsedTimer: null as ReturnType<typeof setInterval> | null,
}));

// ── vi.hoisted setters ────────────────────────────────────────
const mockSet_matchAcceptTimer   = vi.hoisted(() => vi.fn());
const mockSet_matchAcceptSeconds = vi.hoisted(() => vi.fn((v: number) => { stateVars.matchAcceptSeconds = v; }));
const mockSet_matchFoundDebate   = vi.hoisted(() => vi.fn((v: unknown) => { stateVars.matchFoundDebate = v; }));
const mockSet_view               = vi.hoisted(() => vi.fn());
const mockSet_queuePollTimer     = vi.hoisted(() => vi.fn((v: unknown) => { stateVars.queuePollTimer = v as ReturnType<typeof setInterval> | null; }));
const mockSet_queueElapsedTimer  = vi.hoisted(() => vi.fn((v: unknown) => { stateVars.queueElapsedTimer = v as ReturnType<typeof setInterval> | null; }));

// ── dependency mocks ──────────────────────────────────────────
const mockSafeRpc            = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile  = vi.hoisted(() => vi.fn(() => null));
const mockEscapeHTML         = vi.hoisted(() => vi.fn((s: string) => s));
const mockIsPlaceholder      = vi.hoisted(() => vi.fn(() => true));
const mockRandomFrom         = vi.hoisted(() => vi.fn((arr: string[]) => arr[0]));
const mockPushArenaState     = vi.hoisted(() => vi.fn());
const mockEnterRoom          = vi.hoisted(() => vi.fn());
const mockShowPreDebate      = vi.hoisted(() => vi.fn());
const mockPlayIntroMusic     = vi.hoisted(() => vi.fn());
const mockClearMatchAcceptTimers = vi.hoisted(() => vi.fn());
const mockEnterQueue         = vi.hoisted(() => vi.fn());
const mockRenderLobby        = vi.hoisted(() => vi.fn());
const mockOnMatchAccept      = vi.hoisted(() => vi.fn());

vi.mock('../src/arena/arena-state.ts', () => ({
  get selectedMode()        { return stateVars.selectedMode; },
  get selectedRanked()      { return stateVars.selectedRanked; },
  get selectedRuleset()     { return stateVars.selectedRuleset; },
  get matchAcceptSeconds()  { return stateVars.matchAcceptSeconds; },
  get matchFoundDebate()    { return stateVars.matchFoundDebate; },
  get screenEl()            { return stateVars.screenEl; },
  get queuePollTimer()      { return stateVars.queuePollTimer; },
  get queueElapsedTimer()   { return stateVars.queueElapsedTimer; },
  set_matchAcceptTimer:     mockSet_matchAcceptTimer,
  set_matchAcceptSeconds:   mockSet_matchAcceptSeconds,
  set_matchFoundDebate:     mockSet_matchFoundDebate,
  set_view:                 mockSet_view,
  set_queuePollTimer:       mockSet_queuePollTimer,
  set_queueElapsedTimer:    mockSet_queueElapsedTimer,
}));

vi.mock('../src/auth.ts', () => ({
  safeRpc:            mockSafeRpc,
  getCurrentProfile:  mockGetCurrentProfile,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  DEBATE:     { defaultRounds: 4 },
}));

vi.mock('../src/arena/arena-constants.ts', () => ({
  MATCH_ACCEPT_SEC: 12,
  AI_TOTAL_ROUNDS:  4,
  AI_TOPICS:        ['Climate debate', 'Tech ethics'],
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  isPlaceholder:  mockIsPlaceholder,
  randomFrom:     mockRandomFrom,
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

vi.mock('../src/arena/arena-lobby.ts', () => ({
  renderLobby: mockRenderLobby,
}));

vi.mock('../src/arena/arena-match-flow.ts', () => ({
  onMatchAccept: mockOnMatchAccept,
}));

// ── import after all mocks ────────────────────────────────────
import {
  onMatchFound,
  showMatchFound,
  onMatchDecline,
  returnToQueueAfterDecline,
  startAIDebate,
} from '../src/arena/arena-match-found.ts';
import type { CurrentDebate } from '../src/arena/arena-types.ts';
import type { MatchData }     from '../src/arena/arena-types-match.ts';

// ── helpers ───────────────────────────────────────────────────

function makeDebate(overrides: Partial<CurrentDebate> = {}): CurrentDebate {
  return {
    id:           'd-gk-1',
    topic:        'Hot take topic',
    role:         'a',
    mode:         'text',
    round:        1,
    totalRounds:  4,
    opponentName: 'Alice',
    opponentId:   'user-opp-1',
    opponentElo:  1400,
    ranked:       false,
    ruleset:      'amplified',
    messages:     [],
    ...overrides,
  } as unknown as CurrentDebate;
}

function makeMatchData(overrides: Partial<MatchData> = {}): MatchData {
  return {
    debate_id:     'd-gk-match-1',
    topic:         'Hot take topic',
    role:          'a',
    opponent_id:   'user-opp-1',
    opponent_name: 'Alice',
    opponent_elo:  1400,
    total_rounds:  4,
    ruleset:       'amplified',
    language:      'en',
    ...overrides,
  } as unknown as MatchData;
}

// ── lifecycle ─────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  const screen = document.createElement('div');
  screen.id = 'arena-screen';
  document.body.appendChild(screen);
  stateVars.screenEl         = screen;
  stateVars.matchAcceptSeconds = 12;
  stateVars.matchFoundDebate = null;
  stateVars.selectedMode     = 'text';
  stateVars.queuePollTimer   = null;
  stateVars.queueElapsedTimer = null;

  mockSet_matchAcceptTimer.mockReset();
  mockSet_matchAcceptSeconds.mockReset();
  mockSet_matchAcceptSeconds.mockImplementation((v: number) => { stateVars.matchAcceptSeconds = v; });
  mockSet_matchFoundDebate.mockReset();
  mockSet_matchFoundDebate.mockImplementation((v: unknown) => { stateVars.matchFoundDebate = v; });
  mockSet_view.mockReset();
  mockSet_queuePollTimer.mockReset();
  mockSet_queuePollTimer.mockImplementation((v: unknown) => { stateVars.queuePollTimer = v as ReturnType<typeof setInterval> | null; });
  mockSet_queueElapsedTimer.mockReset();
  mockSet_queueElapsedTimer.mockImplementation((v: unknown) => { stateVars.queueElapsedTimer = v as ReturnType<typeof setInterval> | null; });
  mockClearMatchAcceptTimers.mockReset();
  mockEnterRoom.mockReset();
  mockShowPreDebate.mockReset();
  mockEnterQueue.mockReset();
  mockRenderLobby.mockReset();
  mockPlayIntroMusic.mockReset();
  mockPushArenaState.mockReset();
  mockSafeRpc.mockReset();
  mockSafeRpc.mockResolvedValue({ data: null, error: null });
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockIsPlaceholder.mockReturnValue(true);
  mockRandomFrom.mockImplementation((arr: string[]) => arr[0]);
  mockGetCurrentProfile.mockReturnValue(null);
});

afterEach(() => {
  vi.useRealTimers();
});

// ════════════════════════════════════════════════════════════
// Section 1 — onMatchFound()
// Spec: F-02 §1 "Match found — screen renders"
// ════════════════════════════════════════════════════════════

// ── TC-GK-01: clears queue poll timer ────────────────────────

describe('TC-GK-01 — onMatchFound: clears queuePollTimer', () => {
  it('calls clearInterval on a running queue poll timer', () => {
    const fakeInterval = setInterval(() => {}, 9999);
    stateVars.queuePollTimer = fakeInterval;
    const clearSpy = vi.spyOn(global, 'clearInterval');
    onMatchFound(makeMatchData());
    expect(clearSpy).toHaveBeenCalledWith(fakeInterval);
  });
});

// ── TC-GK-02: clears queue elapsed timer ─────────────────────

describe('TC-GK-02 — onMatchFound: clears queueElapsedTimer', () => {
  it('calls clearInterval on a running elapsed timer', () => {
    const fakeElapsed = setInterval(() => {}, 9999);
    stateVars.queueElapsedTimer = fakeElapsed;
    const clearSpy = vi.spyOn(global, 'clearInterval');
    onMatchFound(makeMatchData());
    expect(clearSpy).toHaveBeenCalledWith(fakeElapsed);
  });
});

// ── TC-GK-03: shows OPPONENT FOUND text ──────────────────────

describe('TC-GK-03 — onMatchFound: sets OPPONENT FOUND text in #arena-queue-status', () => {
  it('sets textContent with OPPONENT FOUND marker', () => {
    const statusEl = document.createElement('div');
    statusEl.id = 'arena-queue-status';
    document.body.appendChild(statusEl);
    onMatchFound(makeMatchData());
    expect(statusEl.textContent).toContain('OPPONENT FOUND');
  });
});

// ── TC-GK-04: gold color on status element ───────────────────

describe('TC-GK-04 — onMatchFound: sets gold color on #arena-queue-status', () => {
  it('sets style.color to the accent CSS variable', () => {
    const statusEl = document.createElement('div');
    statusEl.id = 'arena-queue-status';
    document.body.appendChild(statusEl);
    onMatchFound(makeMatchData());
    expect(statusEl.style.color).toBe('var(--mod-accent)');
  });
});

// ── TC-GK-05: AI mode calls enterRoom directly ────────────────

describe('TC-GK-05 — onMatchFound: AI mode bypasses accept screen, calls enterRoom', () => {
  it('calls enterRoom (not showMatchFound) when selectedMode is ai', () => {
    stateVars.selectedMode = 'ai';
    onMatchFound(makeMatchData({ opponent_id: 'user-opp-1' }));
    vi.advanceTimersByTime(1200);
    expect(mockEnterRoom).toHaveBeenCalledTimes(1);
  });
});

// ── TC-GK-06: missing opponent_id calls enterRoom ────────────

describe('TC-GK-06 — onMatchFound: no opponent_id bypasses accept screen, calls enterRoom', () => {
  it('calls enterRoom when opponent_id is absent', () => {
    stateVars.selectedMode = 'text';
    onMatchFound(makeMatchData({ opponent_id: undefined }));
    vi.advanceTimersByTime(1200);
    expect(mockEnterRoom).toHaveBeenCalledTimes(1);
  });
});

// ── TC-GK-07: human opponent routes to showMatchFound ─────────

describe('TC-GK-07 — onMatchFound: human opponent with opponent_id routes to showMatchFound', () => {
  it('does NOT call enterRoom; renders match-found UI', () => {
    stateVars.selectedMode = 'text';
    onMatchFound(makeMatchData({ opponent_id: 'user-opp-1' }));
    vi.advanceTimersByTime(1200);
    expect(mockEnterRoom).not.toHaveBeenCalled();
    expect(stateVars.screenEl!.querySelector('.arena-match-found')).not.toBeNull();
  });
});

// ── TC-GK-08: 1.2-second delay before routing ────────────────

describe('TC-GK-08 — onMatchFound: 1.2-second delay before showMatchFound / enterRoom', () => {
  it('does not call enterRoom or render UI before 1200ms', () => {
    stateVars.selectedMode = 'ai';
    onMatchFound(makeMatchData());
    vi.advanceTimersByTime(1199);
    expect(mockEnterRoom).not.toHaveBeenCalled();
  });
});

// ── TC-GK-09: CurrentDebate mode defaults to selectedMode ─────

describe('TC-GK-09 — onMatchFound: CurrentDebate.mode matches selectedMode', () => {
  it('passes mode=voice into enterRoom when selectedMode=voice', () => {
    stateVars.selectedMode = 'voice';
    onMatchFound(makeMatchData({ opponent_id: undefined }));
    vi.advanceTimersByTime(1200);
    expect(mockEnterRoom).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'voice' })
    );
  });
});

// ── TC-GK-10: fallback topic from randomFrom ─────────────────

describe('TC-GK-10 — onMatchFound: uses randomFrom(AI_TOPICS) when MatchData has no topic', () => {
  it('calls randomFrom when topic is absent from MatchData', () => {
    stateVars.selectedMode = 'ai';
    onMatchFound(makeMatchData({ topic: undefined }));
    vi.advanceTimersByTime(1200);
    expect(mockRandomFrom).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════
// Section 2 — showMatchFound()
// Spec: F-02 §1 "showMatchFound() renders the match-found screen"
// ════════════════════════════════════════════════════════════

// ── TC-GK-11: calls clearMatchAcceptTimers first ──────────────

describe('TC-GK-11 — showMatchFound: calls clearMatchAcceptTimers before rendering', () => {
  it('clears previous accept timers', () => {
    showMatchFound(makeDebate());
    expect(mockClearMatchAcceptTimers).toHaveBeenCalledTimes(1);
  });
});

// ── TC-GK-12: sets matchFoundDebate state ────────────────────

describe('TC-GK-12 — showMatchFound: stores debate in matchFoundDebate state', () => {
  it('calls set_matchFoundDebate with the debate object', () => {
    const debate = makeDebate();
    showMatchFound(debate);
    expect(mockSet_matchFoundDebate).toHaveBeenCalledWith(debate);
  });
});

// ── TC-GK-13: sets view to matchFound ────────────────────────

describe('TC-GK-13 — showMatchFound: sets view state to "matchFound"', () => {
  it('calls set_view("matchFound")', () => {
    showMatchFound(makeDebate());
    expect(mockSet_view).toHaveBeenCalledWith('matchFound');
  });
});

// ── TC-GK-14: pushes arena state ─────────────────────────────

describe('TC-GK-14 — showMatchFound: pushes "matchFound" to arena history', () => {
  it('calls pushArenaState("matchFound")', () => {
    showMatchFound(makeDebate());
    expect(mockPushArenaState).toHaveBeenCalledWith('matchFound');
  });
});

// ── TC-GK-15: renders opponent avatar initial ─────────────────

describe('TC-GK-15 — showMatchFound: renders opponent avatar with uppercase first initial', () => {
  it('shows "A" avatar for opponent named "alice"', () => {
    showMatchFound(makeDebate({ opponentName: 'alice' }));
    const avatar = stateVars.screenEl!.querySelector('.arena-mf-avatar');
    expect(avatar?.textContent).toBe('A');
  });
});

// ── TC-GK-16: avatar uses "?" when name is empty ─────────────

describe('TC-GK-16 — showMatchFound: avatar falls back to "?" for empty opponent name', () => {
  it('shows "?" avatar when opponentName is empty string', () => {
    showMatchFound(makeDebate({ opponentName: '' }));
    const avatar = stateVars.screenEl!.querySelector('.arena-mf-avatar');
    expect(avatar?.textContent).toBe('?');
  });
});

// ── TC-GK-17: renders opponent name via escapeHTML ────────────

describe('TC-GK-17 — showMatchFound: opponent name is rendered through escapeHTML', () => {
  it('passes opponentName through escapeHTML', () => {
    showMatchFound(makeDebate({ opponentName: '<script>xss</script>' }));
    expect(mockEscapeHTML).toHaveBeenCalledWith('<script>xss</script>');
  });
});

// ── TC-GK-18: renders opponent Elo ───────────────────────────

describe('TC-GK-18 — showMatchFound: renders opponent Elo in the UI', () => {
  it('displays opponentElo value', () => {
    showMatchFound(makeDebate({ opponentElo: 1750 }));
    expect(stateVars.screenEl!.innerHTML).toContain('1750');
  });
});

// ── TC-GK-19: renders debate topic via escapeHTML ─────────────

describe('TC-GK-19 — showMatchFound: topic is rendered through escapeHTML', () => {
  it('passes topic through escapeHTML', () => {
    showMatchFound(makeDebate({ topic: '<b>Debate topic</b>' }));
    expect(mockEscapeHTML).toHaveBeenCalledWith('<b>Debate topic</b>');
  });
});

// ── TC-GK-20: renders #mf-countdown element ───────────────────

describe('TC-GK-20 — showMatchFound: renders #mf-countdown element', () => {
  it('countdown element exists in the DOM', () => {
    showMatchFound(makeDebate());
    expect(document.getElementById('mf-countdown')).not.toBeNull();
  });
});

// ── TC-GK-21: renders ACCEPT button ──────────────────────────

describe('TC-GK-21 — showMatchFound: renders #mf-accept-btn ACCEPT button', () => {
  it('ACCEPT button is in the DOM', () => {
    showMatchFound(makeDebate());
    expect(document.getElementById('mf-accept-btn')).not.toBeNull();
  });
});

// ── TC-GK-22: renders DECLINE button ─────────────────────────

describe('TC-GK-22 — showMatchFound: renders #mf-decline-btn DECLINE button', () => {
  it('DECLINE button is in the DOM', () => {
    showMatchFound(makeDebate());
    expect(document.getElementById('mf-decline-btn')).not.toBeNull();
  });
});

// ── TC-GK-23: sets countdown to MATCH_ACCEPT_SEC ─────────────

describe('TC-GK-23 — showMatchFound: initialises countdown to MATCH_ACCEPT_SEC (12)', () => {
  it('calls set_matchAcceptSeconds(12)', () => {
    showMatchFound(makeDebate());
    expect(mockSet_matchAcceptSeconds).toHaveBeenCalledWith(12);
  });
});

// ── TC-GK-24: starts 1s interval countdown ───────────────────

describe('TC-GK-24 — showMatchFound: starts 1-second interval countdown timer', () => {
  it('calls set_matchAcceptTimer once with a timer handle', () => {
    showMatchFound(makeDebate());
    expect(mockSet_matchAcceptTimer).toHaveBeenCalledTimes(1);
    const arg = mockSet_matchAcceptTimer.mock.calls[0][0];
    expect(arg).toBeTruthy();
  });
});

// ── TC-GK-25: countdown decrements every second ───────────────

describe('TC-GK-25 — showMatchFound: countdown decrements by 1 each second', () => {
  it('calls set_matchAcceptSeconds with decremented value after 1s', () => {
    stateVars.matchAcceptSeconds = 12;
    showMatchFound(makeDebate());
    mockSet_matchAcceptSeconds.mockClear();
    vi.advanceTimersByTime(1000);
    // Should have been called with 11 (12 - 1)
    expect(mockSet_matchAcceptSeconds).toHaveBeenCalledWith(11);
  });
});

// ── TC-GK-26: countdown auto-declines at zero ─────────────────

describe('TC-GK-26 — showMatchFound: countdown auto-triggers onMatchDecline() at zero', () => {
  it('clears accept timers after full 12-second countdown expires (onMatchDecline path)', () => {
    // showMatchFound resets matchAcceptSeconds to MATCH_ACCEPT_SEC (12 in mock).
    // Advance 12 full ticks (12000ms) so the counter reaches 0 and onMatchDecline fires.
    showMatchFound(makeDebate());
    mockClearMatchAcceptTimers.mockClear();
    vi.advanceTimersByTime(12000);
    // onMatchDecline() was triggered by the countdown reaching 0 — it calls clearMatchAcceptTimers
    expect(mockClearMatchAcceptTimers).toHaveBeenCalled();
  });
});

// ── TC-GK-27: plays intro music ──────────────────────────────

describe('TC-GK-27 — showMatchFound: calls playIntroMusic with profile intro_music_id', () => {
  it('calls playIntroMusic with "gladiator" when profile has no intro_music_id', () => {
    mockGetCurrentProfile.mockReturnValue(null);
    showMatchFound(makeDebate());
    expect(mockPlayIntroMusic).toHaveBeenCalledWith('gladiator', undefined);
  });

  it('calls playIntroMusic with profile.intro_music_id when set', () => {
    mockGetCurrentProfile.mockReturnValue({ intro_music_id: 'battle-cry', custom_intro_url: null });
    showMatchFound(makeDebate());
    expect(mockPlayIntroMusic).toHaveBeenCalledWith('battle-cry', null);
  });
});

// ════════════════════════════════════════════════════════════
// Section 3 — onMatchDecline()
// Spec: F-02 §3 "User declines (or countdown expires)"
// ════════════════════════════════════════════════════════════

// ── TC-GK-28: clears accept timers on decline ─────────────────

describe('TC-GK-28 — onMatchDecline: clears accept timers via clearMatchAcceptTimers', () => {
  it('calls clearMatchAcceptTimers', () => {
    stateVars.matchFoundDebate = makeDebate();
    onMatchDecline();
    expect(mockClearMatchAcceptTimers).toHaveBeenCalledTimes(1);
  });
});

// ── TC-GK-29: fires respond_to_match with p_accept=false ──────

describe('TC-GK-29 — onMatchDecline: sends respond_to_match with p_accept=false (non-placeholder)', () => {
  it('calls safeRpc("respond_to_match", { p_debate_id, p_accept: false })', () => {
    mockIsPlaceholder.mockReturnValue(false);
    const debate = makeDebate({ id: 'debate-decline-1' });
    stateVars.matchFoundDebate = debate;
    onMatchDecline();
    expect(mockSafeRpc).toHaveBeenCalledWith('respond_to_match', {
      p_debate_id: 'debate-decline-1',
      p_accept: false,
    });
  });
});

// ── TC-GK-30: fire-and-forget — does not await decline RPC ───

describe('TC-GK-30 — onMatchDecline: respond_to_match is fire-and-forget (not awaited)', () => {
  it('does not throw when RPC rejects', () => {
    mockIsPlaceholder.mockReturnValue(false);
    stateVars.matchFoundDebate = makeDebate();
    mockSafeRpc.mockRejectedValue(new Error('network error'));
    expect(() => onMatchDecline()).not.toThrow();
  });
});

// ── TC-GK-31: placeholder skips decline RPC ───────────────────

describe('TC-GK-31 — onMatchDecline: skips respond_to_match in placeholder mode', () => {
  it('does not call safeRpc when isPlaceholder() is true', () => {
    mockIsPlaceholder.mockReturnValue(true);
    stateVars.matchFoundDebate = makeDebate();
    onMatchDecline();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC-GK-32: null matchFoundDebate skips decline RPC ─────────

describe('TC-GK-32 — onMatchDecline: skips respond_to_match when matchFoundDebate is null', () => {
  it('does not call safeRpc when no debate is stored', () => {
    mockIsPlaceholder.mockReturnValue(false);
    stateVars.matchFoundDebate = null;
    onMatchDecline();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC-GK-33: calls returnToQueueAfterDecline ─────────────────

describe('TC-GK-33 — onMatchDecline: calls returnToQueueAfterDecline (clears debate, re-queues)', () => {
  it('clears matchFoundDebate and calls enterQueue when mode is set', () => {
    mockIsPlaceholder.mockReturnValue(true);
    stateVars.matchFoundDebate = makeDebate();
    stateVars.selectedMode     = 'text';
    onMatchDecline();
    expect(mockSet_matchFoundDebate).toHaveBeenCalledWith(null);
    expect(mockEnterQueue).toHaveBeenCalledWith('text', '');
  });
});

// ════════════════════════════════════════════════════════════
// Section 4 — returnToQueueAfterDecline()
// Spec: F-02 §3 "returnToQueueAfterDecline()"
// ════════════════════════════════════════════════════════════

// ── TC-GK-34: clears matchFoundDebate state ───────────────────

describe('TC-GK-34 — returnToQueueAfterDecline: clears matchFoundDebate to null', () => {
  it('calls set_matchFoundDebate(null)', () => {
    returnToQueueAfterDecline();
    expect(mockSet_matchFoundDebate).toHaveBeenCalledWith(null);
  });
});

// ── TC-GK-35: re-enters queue with selectedMode ───────────────

describe('TC-GK-35 — returnToQueueAfterDecline: calls enterQueue(selectedMode, "") when mode is set', () => {
  it('enters queue with text mode and empty topic string', () => {
    stateVars.selectedMode = 'text';
    returnToQueueAfterDecline();
    expect(mockEnterQueue).toHaveBeenCalledWith('text', '');
  });
});

// ── TC-GK-36: calls renderLobby when no mode ─────────────────

describe('TC-GK-36 — returnToQueueAfterDecline: calls renderLobby() when selectedMode is null', () => {
  it('dynamically imports and calls renderLobby when no mode is selected', async () => {
    stateVars.selectedMode = null;
    returnToQueueAfterDecline();
    await vi.runAllTimersAsync();
    // renderLobby is called via dynamic import — the import is mocked
    expect(mockRenderLobby).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════
// Section 5 — startAIDebate()
// Spec: F-02 §1 notes "AI Sparring bypasses the accept screen entirely"
// ════════════════════════════════════════════════════════════

// ── TC-GK-37: uses provided topic ────────────────────────────

describe('TC-GK-37 — startAIDebate: uses provided topic string', () => {
  it('calls showPreDebate with the given topic', async () => {
    mockIsPlaceholder.mockReturnValue(true);
    await startAIDebate('Tech ethics');
    expect(mockShowPreDebate).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'Tech ethics' })
    );
  });
});

// ── TC-GK-38: falls back to randomFrom(AI_TOPICS) ─────────────

describe('TC-GK-38 — startAIDebate: uses randomFrom(AI_TOPICS) when topic is empty string', () => {
  it('calls randomFrom when topic is ""', async () => {
    mockIsPlaceholder.mockReturnValue(true);
    await startAIDebate('');
    expect(mockRandomFrom).toHaveBeenCalled();
  });
});

// ── TC-GK-39: mode is always ai ───────────────────────────────

describe('TC-GK-39 — startAIDebate: calls showPreDebate with mode="ai"', () => {
  it('debate data passed to showPreDebate has mode=ai', async () => {
    mockIsPlaceholder.mockReturnValue(true);
    await startAIDebate('Climate debate');
    expect(mockShowPreDebate).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'ai' })
    );
  });
});

// ── TC-GK-40: placeholder uses ai-local- prefix ───────────────

describe('TC-GK-40 — startAIDebate: uses "ai-local-" debate ID in placeholder mode', () => {
  it('debate id starts with ai-local- when isPlaceholder is true', async () => {
    mockIsPlaceholder.mockReturnValue(true);
    await startAIDebate('Climate debate');
    const call = mockShowPreDebate.mock.calls[0][0];
    expect(call.id).toMatch(/^ai-local-/);
  });
});

// ── TC-GK-41: calls create_ai_debate RPC when not placeholder ─

describe('TC-GK-41 — startAIDebate: calls create_ai_debate RPC when not placeholder', () => {
  it('calls safeRpc("create_ai_debate") with p_category and p_topic', async () => {
    mockIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: { debate_id: 'ai-server-999' }, error: null });
    await startAIDebate('Climate debate');
    expect(mockSafeRpc).toHaveBeenCalledWith('create_ai_debate', {
      p_category: 'general',
      p_topic:    'Climate debate',
    });
  });
});

// ── TC-GK-42: uses server debate_id when RPC succeeds ─────────

describe('TC-GK-42 — startAIDebate: uses server debate_id from create_ai_debate RPC', () => {
  it('passes the RPC debate_id to showPreDebate', async () => {
    mockIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: { debate_id: 'ai-server-42' }, error: null });
    await startAIDebate('Climate debate');
    expect(mockShowPreDebate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ai-server-42' })
    );
  });
});

// ── TC-GK-43: falls back to ai-local- when RPC fails ─────────

describe('TC-GK-43 — startAIDebate: falls back to ai-local- when create_ai_debate RPC fails', () => {
  it('uses ai-local- id when RPC returns an error', async () => {
    mockIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    await startAIDebate('Climate debate');
    const call = mockShowPreDebate.mock.calls[0][0];
    expect(call.id).toMatch(/^ai-local-/);
  });
});

// ── TC-GK-44: ranked=false for AI debates ────────────────────

describe('TC-GK-44 — startAIDebate: AI debates are never ranked', () => {
  it('ranked=false in debate passed to showPreDebate', async () => {
    mockIsPlaceholder.mockReturnValue(true);
    await startAIDebate('Climate debate');
    expect(mockShowPreDebate).toHaveBeenCalledWith(
      expect.objectContaining({ ranked: false })
    );
  });
});

// ── TC-GK-45: opponentName is AI Sparring Bot ────────────────

describe('TC-GK-45 — startAIDebate: opponentName is "AI Sparring Bot"', () => {
  it('showPreDebate receives opponentName="AI Sparring Bot"', async () => {
    mockIsPlaceholder.mockReturnValue(true);
    await startAIDebate('Climate debate');
    expect(mockShowPreDebate).toHaveBeenCalledWith(
      expect.objectContaining({ opponentName: 'AI Sparring Bot' })
    );
  });
});

// ── TC-GK-46: role is always "a" for AI debates ───────────────

describe('TC-GK-46 — startAIDebate: AI debate role is always "a"', () => {
  it('showPreDebate receives role="a"', async () => {
    mockIsPlaceholder.mockReturnValue(true);
    await startAIDebate('Climate debate');
    expect(mockShowPreDebate).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'a' })
    );
  });
});

// ════════════════════════════════════════════════════════════
// ARCH — Step 4: Architecture test
// Every import in src/arena/arena-match-found.ts must be on
// the allowed list derived from Step 2.
// ════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { resolve }      from 'path';

describe('ARCH — src/arena/arena-match-found.ts only imports from allowed modules', () => {
  it('has no static imports outside the allowed list', () => {
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
