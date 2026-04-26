// ============================================================
// INTEGRATOR — arena-feed-wiring-debater + arena-state
// Seam #042 | score: 52
// Boundary: wireDebaterControls reads currentDebate, feedPaused,
//           challengeRulingTimer from arena-state.
//           Concede handler writes back via set_feedPaused,
//           set_challengeRulingTimer, set_activeChallengeRefId.
//           Cite/challenge buttons guard on feedPaused.
// Mock boundary: @supabase/supabase-js only.
// Complex transitive deps (deepgram, webrtc, arena-sounds,
// arena-feed-machine-turns/ads) mocked at module level.
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// Mock transitive wall deps so module loading does not crash in jsdom
vi.mock('../../src/arena/arena-deepgram.ts', () => ({
  stopTranscription: vi.fn(),
  startTranscription: vi.fn(),
}));

vi.mock('../../src/arena/arena-sounds.ts', () => ({
  playSound: vi.fn(),
}));

vi.mock('../../src/arena/arena-feed-machine-turns.ts', () => ({
  clearFeedTimer: vi.fn(),
  finishCurrentTurn: vi.fn(),
  startPreRoundCountdown: vi.fn(),
}));

vi.mock('../../src/arena/arena-feed-machine-ads.ts', () => ({
  startFinalAdBreak: vi.fn(),
}));

vi.mock('../../src/arena/arena-feed-references.ts', () => ({
  showCiteDropdown: vi.fn(),
  showChallengeDropdown: vi.fn(),
}));

vi.mock('../../src/arena/arena-feed-events.ts', () => ({
  appendFeedEvent: vi.fn(),
  writeFeedEvent: vi.fn().mockResolvedValue(undefined),
  addLocalSystem: vi.fn(),
}));

vi.mock('../../src/arena/arena-feed-ui.ts', () => ({
  setDebaterInputEnabled: vi.fn(),
}));

vi.mock('../../src/arena/arena-feed-transcript.ts', () => ({
  clearInterimTranscript: vi.fn(),
  handleDeepgramTranscript: vi.fn(),
  showInterimTranscript: vi.fn(),
  updateDeepgramStatus: vi.fn(),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let wireDebaterControls: (debate: unknown) => void;

let set_currentDebate: (v: unknown) => void;
let set_feedPaused: (v: boolean) => void;
let set_challengeRulingTimer: (v: ReturnType<typeof setInterval> | null) => void;
let set_activeChallengeRefId: (v: string | null) => void;
let getFeedPaused: () => boolean;
let getChallengeRulingTimer: () => ReturnType<typeof setInterval> | null;
let getActiveChallengeRefId: () => string | null;

let showCiteDropdownMock: ReturnType<typeof vi.fn>;
let showChallengeDropdownMock: ReturnType<typeof vi.fn>;
let startFinalAdBreakMock: ReturnType<typeof vi.fn>;
let writeFeedEventMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  document.body.innerHTML = `
    <div id="screen-main">
      <textarea id="feed-debater-input"></textarea>
      <button id="feed-debater-send-btn" disabled></button>
      <button id="feed-finish-turn"></button>
      <button id="feed-concede"></button>
      <button id="feed-cite-btn"></button>
      <button id="feed-challenge-btn"></button>
    </div>
  `;

  const wiringMod = await import('../../src/arena/arena-feed-wiring-debater.ts');
  wireDebaterControls = wiringMod.wireDebaterControls as (debate: unknown) => void;

  const stateMod = await import('../../src/arena/arena-state.ts');
  set_currentDebate = stateMod.set_currentDebate as (v: unknown) => void;
  set_feedPaused = stateMod.set_feedPaused;
  set_challengeRulingTimer = stateMod.set_challengeRulingTimer;
  set_activeChallengeRefId = stateMod.set_activeChallengeRefId;
  getFeedPaused = () => stateMod.feedPaused;
  getChallengeRulingTimer = () => stateMod.challengeRulingTimer;
  getActiveChallengeRefId = () => stateMod.activeChallengeRefId;

  const refsMod = await import('../../src/arena/arena-feed-references.ts');
  showCiteDropdownMock = refsMod.showCiteDropdown as ReturnType<typeof vi.fn>;
  showChallengeDropdownMock = refsMod.showChallengeDropdown as ReturnType<typeof vi.fn>;

  const adsMod = await import('../../src/arena/arena-feed-machine-ads.ts');
  startFinalAdBreakMock = adsMod.startFinalAdBreak as ReturnType<typeof vi.fn>;

  const eventsMod = await import('../../src/arena/arena-feed-events.ts');
  writeFeedEventMock = eventsMod.writeFeedEvent as ReturnType<typeof vi.fn>;
});

// ============================================================
// TC-I1: send button blocked when input is empty
// ============================================================

describe('TC-I1: send button is disabled when input is empty', () => {
  it('send button remains disabled when input value is empty', () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    set_currentDebate(debate);

    wireDebaterControls(debate);

    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('feed-debater-send-btn') as HTMLButtonElement;

    // Input is empty — trigger input event
    input.value = '';
    input.dispatchEvent(new Event('input'));

    expect(sendBtn.disabled).toBe(true);
  });

  it('send button is enabled after typing text', () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    set_currentDebate(debate);

    wireDebaterControls(debate);

    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('feed-debater-send-btn') as HTMLButtonElement;

    input.value = 'Hello there';
    input.dispatchEvent(new Event('input'));

    expect(sendBtn.disabled).toBe(false);
  });
});

// ============================================================
// TC-I2: cite button reads feedPaused from arena-state
// ============================================================

describe('TC-I2: cite button is blocked when feedPaused is true in arena-state', () => {
  it('does not call showCiteDropdown when feedPaused is true', () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    set_currentDebate(debate);
    set_feedPaused(true);

    wireDebaterControls(debate);

    const citeBtn = document.getElementById('feed-cite-btn') as HTMLButtonElement;
    citeBtn.click();

    expect(showCiteDropdownMock).not.toHaveBeenCalled();
  });

  it('calls showCiteDropdown when feedPaused is false', () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    set_currentDebate(debate);
    set_feedPaused(false);

    wireDebaterControls(debate);

    const citeBtn = document.getElementById('feed-cite-btn') as HTMLButtonElement;
    citeBtn.click();

    expect(showCiteDropdownMock).toHaveBeenCalledWith(debate);
  });
});

// ============================================================
// TC-I3: challenge button reads feedPaused from arena-state
// ============================================================

describe('TC-I3: challenge button is blocked when feedPaused is true in arena-state', () => {
  it('does not call showChallengeDropdown when feedPaused is true', () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    set_currentDebate(debate);
    set_feedPaused(true);

    wireDebaterControls(debate);

    const challengeBtn = document.getElementById('feed-challenge-btn') as HTMLButtonElement;
    challengeBtn.click();

    expect(showChallengeDropdownMock).not.toHaveBeenCalled();
  });

  it('calls showChallengeDropdown when feedPaused is false', () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    set_currentDebate(debate);
    set_feedPaused(false);

    wireDebaterControls(debate);

    const challengeBtn = document.getElementById('feed-challenge-btn') as HTMLButtonElement;
    challengeBtn.click();

    expect(showChallengeDropdownMock).toHaveBeenCalledWith(debate);
  });
});

// ============================================================
// TC-I4: concede when feedPaused=true clears pause state in arena-state
// ============================================================

describe('TC-I4: concede while feedPaused=true clears pause state in arena-state', () => {
  it('sets feedPaused to false, clears challengeRulingTimer, clears activeChallengeRefId', async () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false, concededBy: undefined };
    set_currentDebate(debate);
    set_feedPaused(true);
    const timer = setInterval(() => {}, 10000);
    set_challengeRulingTimer(timer);
    set_activeChallengeRefId('ref-xyz');

    // Add challenge overlay to DOM
    const overlay = document.createElement('div');
    overlay.id = 'feed-challenge-overlay';
    document.body.appendChild(overlay);

    // Mock confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    wireDebaterControls(debate);

    const concedeBtn = document.getElementById('feed-concede') as HTMLButtonElement;
    concedeBtn.click();

    // Let async handler run — advance without running infinite loops
    await vi.advanceTimersByTimeAsync(500);

    expect(getFeedPaused()).toBe(false);
    expect(getChallengeRulingTimer()).toBeNull();
    expect(getActiveChallengeRefId()).toBeNull();
  });

  it('removes #feed-challenge-overlay from DOM on concede when paused', async () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false, concededBy: undefined };
    set_currentDebate(debate);
    set_feedPaused(true);

    const overlay = document.createElement('div');
    overlay.id = 'feed-challenge-overlay';
    document.body.appendChild(overlay);

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    wireDebaterControls(debate);
    document.getElementById('feed-concede')!.click();

    await vi.advanceTimersByTimeAsync(500);

    expect(document.getElementById('feed-challenge-overlay')).toBeNull();
  });
});

// ============================================================
// TC-I5: concede when feedPaused=false does NOT mutate pause state
// ============================================================

describe('TC-I5: concede while feedPaused=false does not mutate pause state in arena-state', () => {
  it('leaves feedPaused as false when it was already false', async () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false, concededBy: undefined };
    set_currentDebate(debate);
    set_feedPaused(false);

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    wireDebaterControls(debate);
    document.getElementById('feed-concede')!.click();

    await vi.advanceTimersByTimeAsync(500);

    // feedPaused was already false — should remain false
    expect(getFeedPaused()).toBe(false);
  });
});

// ============================================================
// TC-I6: concede cancelled — no state change
// ============================================================

describe('TC-I6: concede aborts when confirm returns false — arena-state unchanged', () => {
  it('does not set concededBy or mutate state when user cancels confirm', async () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false, concededBy: undefined };
    set_currentDebate(debate);
    set_feedPaused(true);
    const timer = setInterval(() => {}, 10000);
    set_challengeRulingTimer(timer);

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    wireDebaterControls(debate);
    document.getElementById('feed-concede')!.click();

    await vi.advanceTimersByTimeAsync(500);

    // No state mutation — feedPaused still true, timer intact
    expect(getFeedPaused()).toBe(true);
    expect(getChallengeRulingTimer()).not.toBeNull();
    expect(startFinalAdBreakMock).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC-I7: currentDebate is read from arena-state by submitDebaterMessage
// ============================================================

describe('TC-I7: submitDebaterMessage reads currentDebate from arena-state', () => {
  it('does not call writeFeedEvent when currentDebate is null in arena-state', async () => {
    set_currentDebate(null);

    // Wire with a debate arg but state has null currentDebate
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    wireDebaterControls(debate);

    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('feed-debater-send-btn') as HTMLButtonElement;
    input.value = 'Hello';
    sendBtn.disabled = false;
    sendBtn.click();

    await vi.advanceTimersByTimeAsync(500);

    expect(writeFeedEventMock).not.toHaveBeenCalled();
  });

  it('calls writeFeedEvent when currentDebate is set in arena-state', async () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    set_currentDebate(debate);

    wireDebaterControls(debate);

    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('feed-debater-send-btn') as HTMLButtonElement;
    input.value = 'My argument';
    sendBtn.disabled = false;
    sendBtn.click();

    await vi.advanceTimersByTimeAsync(500);

    expect(writeFeedEventMock).toHaveBeenCalledWith('speech', 'My argument', 'a');
  });
});

// ============================================================
// ARCH — seam #042
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — seam #042', () => {
  it('src/arena/arena-feed-wiring-debater.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-feed-wiring-debater.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});

// ============================================================
// SEAM #324 — WALL
// arena-feed-wiring-debater.ts imports arena-deepgram.ts
// (wall item: deepgram). Runtime TCs skipped per wall policy.
// ARCH-only check is safe (static source read, no module load).
// ============================================================

// ============================================================
// ARCH — seam #324
// ============================================================
describe('ARCH — seam #324', () => {
  it('src/arena/arena-feed-wiring-debater.ts imports appendFeedEvent and writeFeedEvent from arena-feed-events', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-feed-wiring-debater.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-feed-events'))).toBe(true);
    expect(source).toMatch(/\bappendFeedEvent\b/);
    expect(source).toMatch(/\bwriteFeedEvent\b/);
  });
});
