// ============================================================
// INTEGRATOR — src/arena.ts → arena-state (seam #049)
// Boundary: arena.ts re-exports state variables from arena-state.ts
//           arena-state is a pure state module (no Supabase calls)
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let view: string;
let selectedMode: string | null;
let selectedRanked: boolean;
let selectedRuleset: string;
let selectedRounds: number;
let shieldActive: boolean;
let pendingReferences: unknown[];
let activatedPowerUps: Set<string>;
let equippedForDebate: unknown[];
let challengesRemaining: number;
let feedPaused: boolean;
let vmRecording: boolean;
let vmSeconds: number;
let queueSeconds: number;

let set_view: (v: string) => void;
let set_selectedMode: (v: string | null) => void;
let set_selectedRanked: (v: boolean) => void;
let set_selectedRuleset: (v: 'amplified' | 'unplugged') => void;
let set_selectedRounds: (v: number) => void;
let set_shieldActive: (v: boolean) => void;
let set_pendingReferences: (v: unknown[]) => void;
let set_activatedPowerUps: (v: Set<string>) => void;
let set_queuePollTimer: (v: ReturnType<typeof setInterval> | null) => void;
let set_challengesRemaining: (v: number) => void;
let set_feedPaused: (v: boolean) => void;
let set_vmRecording: (v: boolean) => void;
let set_vmSeconds: (v: number) => void;
let set_queueSeconds: (v: number) => void;
let set_modQueuePollTimer: (v: ReturnType<typeof setInterval> | null) => void;
let resetState: () => void;

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (_cb: (event: string, session: null) => void) => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  );
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = '<div id="screen-main"></div>';

  const mod = await import('../../src/arena/arena-state.ts');
  // Re-read live bindings after import
  view = mod.view;
  selectedMode = mod.selectedMode;
  selectedRanked = mod.selectedRanked;
  selectedRuleset = mod.selectedRuleset;
  selectedRounds = mod.selectedRounds;
  shieldActive = mod.shieldActive;
  pendingReferences = mod.pendingReferences;
  activatedPowerUps = mod.activatedPowerUps;
  equippedForDebate = mod.equippedForDebate;
  challengesRemaining = mod.challengesRemaining;
  feedPaused = mod.feedPaused;
  vmRecording = mod.vmRecording;
  vmSeconds = mod.vmSeconds;
  queueSeconds = mod.queueSeconds;

  set_view = mod.set_view;
  set_selectedMode = mod.set_selectedMode;
  set_selectedRanked = mod.set_selectedRanked;
  set_selectedRuleset = mod.set_selectedRuleset;
  set_selectedRounds = mod.set_selectedRounds;
  set_shieldActive = mod.set_shieldActive;
  set_pendingReferences = mod.set_pendingReferences;
  set_activatedPowerUps = mod.set_activatedPowerUps;
  set_queuePollTimer = mod.set_queuePollTimer;
  set_challengesRemaining = mod.set_challengesRemaining;
  set_feedPaused = mod.set_feedPaused;
  set_vmRecording = mod.set_vmRecording;
  set_vmSeconds = mod.set_vmSeconds;
  set_queueSeconds = mod.set_queueSeconds;
  set_modQueuePollTimer = mod.set_modQueuePollTimer;
  resetState = mod.resetState;
});

// ============================================================
// TC-1: Initial state defaults
// ============================================================
describe('TC-1 — initial state defaults', () => {
  it('view defaults to lobby', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.view).toBe('lobby');
  });

  it('selectedMode defaults to null', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.selectedMode).toBeNull();
  });

  it('selectedRanked defaults to false', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.selectedRanked).toBe(false);
  });

  it('selectedRuleset defaults to amplified', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.selectedRuleset).toBe('amplified');
  });

  it('selectedRounds defaults to DEBATE.defaultRounds (5)', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.selectedRounds).toBe(5);
  });

  it('shieldActive defaults to false', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.shieldActive).toBe(false);
  });

  it('pendingReferences defaults to empty array', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(Array.isArray(mod.pendingReferences)).toBe(true);
    expect(mod.pendingReferences).toHaveLength(0);
  });

  it('activatedPowerUps defaults to empty Set', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.activatedPowerUps).toBeInstanceOf(Set);
    expect(mod.activatedPowerUps.size).toBe(0);
  });

  it('challengesRemaining defaults to 3', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.challengesRemaining).toBe(3);
  });

  it('vmRecording defaults to false', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.vmRecording).toBe(false);
  });

  it('vmSeconds defaults to 0', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.vmSeconds).toBe(0);
  });
});

// ============================================================
// TC-2: Setters mutate state
// ============================================================
describe('TC-2 — setters mutate live state', () => {
  it('set_view updates view', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_view('room');
    expect(mod.view).toBe('room');
  });

  it('set_selectedMode updates selectedMode', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedMode('text');
    expect(mod.selectedMode).toBe('text');
  });

  it('set_selectedRanked toggles to true', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedRanked(true);
    expect(mod.selectedRanked).toBe(true);
  });

  it('set_selectedRuleset updates to unplugged', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedRuleset('unplugged');
    expect(mod.selectedRuleset).toBe('unplugged');
  });

  it('set_selectedRounds updates round count', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedRounds(3);
    expect(mod.selectedRounds).toBe(3);
  });

  it('set_shieldActive sets to true', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_shieldActive(true);
    expect(mod.shieldActive).toBe(true);
  });

  it('set_pendingReferences stores items', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    const refs = [{ id: 'ref-1' }, { id: 'ref-2' }];
    mod.set_pendingReferences(refs);
    expect(mod.pendingReferences).toHaveLength(2);
    expect(mod.pendingReferences).toEqual(refs);
  });

  it('set_activatedPowerUps stores a Set', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    const s = new Set(['speed-boost', 'shield']);
    mod.set_activatedPowerUps(s);
    expect(mod.activatedPowerUps.has('speed-boost')).toBe(true);
    expect(mod.activatedPowerUps.has('shield')).toBe(true);
  });

  it('set_challengesRemaining updates count', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_challengesRemaining(1);
    expect(mod.challengesRemaining).toBe(1);
  });

  it('set_feedPaused toggles to true', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_feedPaused(true);
    expect(mod.feedPaused).toBe(true);
  });

  it('set_vmRecording sets to true', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_vmRecording(true);
    expect(mod.vmRecording).toBe(true);
  });

  it('set_vmSeconds stores elapsed time', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_vmSeconds(42);
    expect(mod.vmSeconds).toBe(42);
  });

  it('set_queueSeconds accumulates queue time', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_queueSeconds(15);
    expect(mod.queueSeconds).toBe(15);
  });
});

// ============================================================
// TC-3: resetState() zeroes values
// ============================================================
describe('TC-3 — resetState() zeroes mutable state', () => {
  it('resets view to lobby', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_view('room');
    mod.resetState();
    expect(mod.view).toBe('lobby');
  });

  it('resets selectedMode to null', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedMode('text');
    mod.resetState();
    expect(mod.selectedMode).toBeNull();
  });

  it('resets selectedRanked to false', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedRanked(true);
    mod.resetState();
    expect(mod.selectedRanked).toBe(false);
  });

  it('resets selectedRuleset to amplified', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedRuleset('unplugged');
    mod.resetState();
    expect(mod.selectedRuleset).toBe('amplified');
  });

  it('resets selectedRounds to DEBATE.defaultRounds (5)', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedRounds(3);
    mod.resetState();
    expect(mod.selectedRounds).toBe(5);
  });

  it('resets shieldActive to false', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_shieldActive(true);
    mod.resetState();
    expect(mod.shieldActive).toBe(false);
  });

  it('resets pendingReferences to empty array', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_pendingReferences([{ id: 'ref-1' }]);
    mod.resetState();
    expect(mod.pendingReferences).toHaveLength(0);
  });

  it('resets activatedPowerUps to empty Set', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_activatedPowerUps(new Set(['shield']));
    mod.resetState();
    expect(mod.activatedPowerUps.size).toBe(0);
  });

  it('resets challengesRemaining to 3', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_challengesRemaining(0);
    mod.resetState();
    expect(mod.challengesRemaining).toBe(3);
  });

  it('resets feedPaused to false', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_feedPaused(true);
    mod.resetState();
    expect(mod.feedPaused).toBe(false);
  });

  it('resets vmRecording to false', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_vmRecording(true);
    mod.resetState();
    expect(mod.vmRecording).toBe(false);
  });

  it('resets vmSeconds to 0', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_vmSeconds(30);
    mod.resetState();
    expect(mod.vmSeconds).toBe(0);
  });

  it('resets queueSeconds to 0', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_queueSeconds(60);
    mod.resetState();
    expect(mod.queueSeconds).toBe(0);
  });
});

// ============================================================
// TC-4: resetState() clears active intervals
// ============================================================
describe('TC-4 — resetState() clears active intervals', () => {
  it('clears queuePollTimer on reset', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const mod = await import('../../src/arena/arena-state.ts');
    const timer = setInterval(() => {}, 1000);
    mod.set_queuePollTimer(timer);
    expect(mod.queuePollTimer).not.toBeNull();
    mod.resetState();
    expect(mod.queuePollTimer).toBeNull();
    vi.useRealTimers();
  });

  it('clears modQueuePollTimer on reset', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const mod = await import('../../src/arena/arena-state.ts');
    const timer = setInterval(() => {}, 500);
    mod.set_modQueuePollTimer(timer);
    expect(mod.modQueuePollTimer).not.toBeNull();
    mod.resetState();
    expect(mod.modQueuePollTimer).toBeNull();
    vi.useRealTimers();
  });

  it('clears vmTimer on reset', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const mod = await import('../../src/arena/arena-state.ts');
    const timer = setInterval(() => {}, 1000);
    mod.set_vmTimer(timer);
    expect(mod.vmTimer).not.toBeNull();
    mod.resetState();
    expect(mod.vmTimer).toBeNull();
    vi.useRealTimers();
  });
});

// ============================================================
// TC-5: currentDebate starts null, set/reset works
// ============================================================
describe('TC-5 — currentDebate lifecycle', () => {
  it('currentDebate defaults to null', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.currentDebate).toBeNull();
  });

  it('set_currentDebate stores debate object', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    const debate = { id: 'debate-abc', topic: 'Test topic' } as unknown as Parameters<typeof mod.set_currentDebate>[0];
    mod.set_currentDebate(debate);
    expect(mod.currentDebate).not.toBeNull();
    expect((mod.currentDebate as unknown as { id: string }).id).toBe('debate-abc');
  });

  it('resetState nulls currentDebate', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    const debate = { id: 'debate-abc' } as unknown as Parameters<typeof mod.set_currentDebate>[0];
    mod.set_currentDebate(debate);
    mod.resetState();
    expect(mod.currentDebate).toBeNull();
  });
});

// ============================================================
// TC-6: selectedCategory default and setter
// ============================================================
describe('TC-6 — selectedCategory state', () => {
  it('selectedCategory defaults to null', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.selectedCategory).toBeNull();
  });

  it('set_selectedCategory stores a category string', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedCategory('politics');
    expect(mod.selectedCategory).toBe('politics');
  });

  it('resetState clears selectedCategory to null', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedCategory('sports');
    mod.resetState();
    expect(mod.selectedCategory).toBeNull();
  });
});

// ============================================================
// TC-7: screenEl and cssInjected are preserved across resetState
// ============================================================
describe('TC-7 — screenEl and cssInjected preserved on reset', () => {
  it('screenEl is NOT cleared by resetState (intentional)', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    const el = document.getElementById('screen-main');
    mod.set_screenEl(el);
    expect(mod.screenEl).not.toBeNull();
    mod.resetState();
    // screenEl intentionally NOT reset per arena-state.ts comment
    expect(mod.screenEl).not.toBeNull();
  });

  it('cssInjected is NOT cleared by resetState (intentional)', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_cssInjected(true);
    expect(mod.cssInjected).toBe(true);
    mod.resetState();
    // cssInjected intentionally NOT reset — CSS only injected once
    expect(mod.cssInjected).toBe(true);
  });
});

// ============================================================
// ARCH — seam #049
// ============================================================
describe('ARCH — seam #049', () => {
  it('src/arena.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});

// ============================================================
// INTEGRATION — seam #285 | src/arena.ts → arena-room-live-poll
// Boundary: submitTextArgument, startOpponentPoll, advanceRound, startLiveRoundTimer
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================
describe('seam #285 | arena.ts → arena-room-live-poll', () => {
  const OPPONENT_POLL_MS = 3000;
  const OPPONENT_POLL_TIMEOUT_SEC = 120;
  const ROUND_DURATION = 120;

  let submitTextArgument: () => Promise<void>;
  let startOpponentPoll: (debateId: string, myRole: 'a' | 'b', round: number) => void;
  let stopOpponentPoll: () => void;
  let advanceRound: () => void;
  let startLiveRoundTimer: () => void;

  // arena-state setters / getters we need to seed currentDebate
  let set_currentDebate: (d: unknown) => void;
  let set_opponentPollElapsed: (n: number) => void;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: null });
    vi.resetModules();

    // Seed DOM
    document.body.innerHTML = `
      <textarea id="arena-text-input"></textarea>
      <span id="arena-char-count">5</span>
      <button id="arena-send-btn"></button>
      <button id="arena-record-btn"></button>
      <div id="arena-room-timer">2:00</div>
      <div id="arena-round-label">ROUND 1/3</div>
      <div id="arena-messages"></div>
    `;
    // jsdom doesn't implement scrollTo on elements — stub it
    document.querySelectorAll('*').forEach(el => {
      (el as HTMLElement & { scrollTo?: () => void }).scrollTo = () => {};
    });

    const pollMod = await import('../../src/arena/arena-room-live-poll.ts');
    submitTextArgument = pollMod.submitTextArgument;
    startOpponentPoll = pollMod.startOpponentPoll;
    stopOpponentPoll = pollMod.stopOpponentPoll;
    advanceRound = pollMod.advanceRound;
    startLiveRoundTimer = pollMod.startLiveRoundTimer;

    const stateMod = await import('../../src/arena/arena-state.ts');
    set_currentDebate = (stateMod as unknown as Record<string, (v: unknown) => void>).set_currentDebate;
    set_opponentPollElapsed = stateMod.set_opponentPollElapsed;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // TC-285-01 — empty input → no RPC fired
  it('TC-285-01: submitTextArgument with empty input fires no RPC', async () => {
    const input = document.getElementById('arena-text-input') as HTMLTextAreaElement;
    input.value = '   ';

    await submitTextArgument();

    expect(mockRpc).not.toHaveBeenCalled();
  });

  // TC-285-02 — real debate → submit_debate_message called
  it('TC-285-02: submitTextArgument for real debate calls submit_debate_message', async () => {
    set_currentDebate({
      id: 'debate-real-001',
      role: 'a',
      round: 1,
      totalRounds: 3,
      mode: 'text',
    });

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'submit_debate_message') return Promise.resolve({ data: {}, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const input = document.getElementById('arena-text-input') as HTMLTextAreaElement;
    input.value = 'My argument here';

    await submitTextArgument();

    expect(mockRpc).toHaveBeenCalledWith(
      'submit_debate_message',
      expect.objectContaining({
        p_debate_id: 'debate-real-001',
        p_round: 1,
        p_side: 'a',
        p_content: 'My argument here',
      }),
    );

    expect(input.value).toBe('');
    const sendBtn = document.getElementById('arena-send-btn') as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(true);
  });

  // TC-285-03 — placeholder debate skips RPC
  it('TC-285-03: submitTextArgument for placeholder debate skips submit_debate_message', async () => {
    set_currentDebate({
      id: 'placeholder-abc',
      role: 'b',
      round: 1,
      totalRounds: 3,
      mode: 'text',
    });

    const input = document.getElementById('arena-text-input') as HTMLTextAreaElement;
    input.value = 'My take';

    await submitTextArgument();

    const submitCalls = mockRpc.mock.calls.filter(
      (c: unknown[]) => c[0] === 'submit_debate_message',
    );
    expect(submitCalls.length).toBe(0);
    expect(input.value).toBe('');
  });

  // TC-285-04 — startOpponentPoll fires get_debate_messages after one tick and re-enables input when opponent found
  it('TC-285-04: startOpponentPoll fires get_debate_messages and re-enables input on opponent found', async () => {
    set_currentDebate({
      id: 'debate-poll-001',
      role: 'a',
      round: 2,
      totalRounds: 3,
      mode: 'text',
    });

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'get_debate_messages') {
        return Promise.resolve({
          data: [{ side: 'b', round: 2, content: 'Counter argument', is_ai: false, created_at: '2026-01-01T00:00:00Z' }],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const input = document.getElementById('arena-text-input') as HTMLTextAreaElement;
    input.disabled = true;

    startOpponentPoll('debate-poll-001', 'a', 2);

    await vi.advanceTimersByTimeAsync(OPPONENT_POLL_MS);

    expect(mockRpc).toHaveBeenCalledWith(
      'get_debate_messages',
      expect.objectContaining({ p_debate_id: 'debate-poll-001' }),
    );

    expect(input.disabled).toBe(false);
  });

  // TC-285-05 — startOpponentPoll timeout re-enables input after OPPONENT_POLL_TIMEOUT_SEC
  it('TC-285-05: startOpponentPoll timeout re-enables input when no opponent response', async () => {
    set_currentDebate({
      id: 'debate-timeout-001',
      role: 'a',
      round: 1,
      totalRounds: 3,
      mode: 'text',
    });

    // Return empty array (no opponent message) every tick
    mockRpc.mockResolvedValue({ data: [], error: null });

    const input = document.getElementById('arena-text-input') as HTMLTextAreaElement;
    input.disabled = true;

    startOpponentPoll('debate-timeout-001', 'a', 1);

    // Advance tick by tick (async interval: wait for each async callback to complete)
    const ticksNeeded = Math.ceil(OPPONENT_POLL_TIMEOUT_SEC / (OPPONENT_POLL_MS / 1000)) + 2;
    for (let i = 0; i < ticksNeeded; i++) {
      await vi.advanceTimersByTimeAsync(OPPONENT_POLL_MS);
    }

    expect(input.disabled).toBe(false);
  });

  // TC-285-06 — advanceRound on final round calls endCurrentDebate via setTimeout (mocked end)
  it('TC-285-06: advanceRound on final round does not call close_debate_round', async () => {
    set_currentDebate({
      id: 'debate-final-001',
      role: 'a',
      round: 3,
      totalRounds: 3,
      mode: 'text',
    });

    advanceRound();

    const closeCalls = mockRpc.mock.calls.filter(
      (c: unknown[]) => c[0] === 'close_debate_round',
    );
    expect(closeCalls.length).toBe(0);
  });

  // TC-285-07 — startLiveRoundTimer updates #arena-room-timer each second
  it('TC-285-07: startLiveRoundTimer decrements timer display each second', async () => {
    set_currentDebate({
      id: 'debate-timer-001',
      role: 'a',
      round: 1,
      totalRounds: 3,
      mode: 'live',
    });

    const timerEl = document.getElementById('arena-room-timer') as HTMLDivElement;

    startLiveRoundTimer();

    // After 1 second, display should show ROUND_DURATION - 1
    await vi.advanceTimersByTimeAsync(1000);

    // formatTimer(119) => '1:59'
    expect(timerEl.textContent).toBe('1:59');
    expect(timerEl.classList.contains('warning')).toBe(false);
  });

  // ARCH — seam #285
  it('ARCH: src/arena.ts exports submitTextArgument from arena-room-live-poll', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-room-live-poll'))).toBe(true);
  });
});

// ============================================================
// SEAM #386 | src/arena.ts → arena-types-moderator
// Boundary: arena.ts re-exports AvailableModerator, ModQueueItem,
//           ModDebateJoinResult, ModDebateCheckResult from
//           arena-types-moderator.ts
// Consumers tested: arena-mod-queue-browse, arena-mod-queue-status,
//                   arena-mod-debate-picker
// Mock boundary: @supabase/supabase-js only
// ============================================================
describe('seam #386 | arena.ts → arena-types-moderator', () => {

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockFrom.mockReset();
    vi.resetModules();

    document.body.innerHTML = `
      <div id="screen-main"></div>
      <div id="mod-queue-list"></div>
      <div id="mod-invite-section" style="display:none;"></div>
      <div id="mod-invite-list"></div>
    `;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.getElementById('mod-request-modal')?.remove();
  });

  // TC-386-01 — ARCH: arena.ts re-exports types from arena-types-moderator
  it('TC-386-01: ARCH — arena.ts imports from arena-types-moderator', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-types-moderator'))).toBe(true);
  });

  // TC-386-02 — loadModQueue calls browse_mod_queue RPC and renders rows
  it('TC-386-02: loadModQueue calls browse_mod_queue and renders items into #mod-queue-list', async () => {
    const rows: import('../../src/arena/arena-types-moderator.ts').ModQueueItem[] = [
      {
        debate_id: 'debate-001',
        topic: 'Pineapple belongs on pizza',
        category: 'Food',
        mode: 'text',
        created_at: new Date(Date.now() - 90000).toISOString(),
        debater_a_name: 'Alice',
        debater_b_name: 'Bob',
        mod_status: 'waiting',
      },
    ];

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'browse_mod_queue') return Promise.resolve({ data: rows, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { loadModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');
    await loadModQueue();

    expect(mockRpc).toHaveBeenCalledWith('browse_mod_queue', expect.anything());
    const listEl = document.getElementById('mod-queue-list')!;
    expect(listEl.innerHTML).toContain('debate-001');
    expect(listEl.innerHTML).toContain('REQUEST TO MOD');
  });

  // TC-386-03 — claimModRequest calls request_to_moderate with p_debate_id
  it('TC-386-03: claimModRequest calls request_to_moderate with correct p_debate_id', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { claimModRequest } = await import('../../src/arena/arena-mod-queue-browse.ts');

    const btn = document.createElement('button');
    document.body.appendChild(btn);

    await claimModRequest('debate-999', btn);

    expect(mockRpc).toHaveBeenCalledWith(
      'request_to_moderate',
      expect.objectContaining({ p_debate_id: 'debate-999' }),
    );
  });

  // TC-386-04 — loadPendingModInvites calls get_pending_mod_invites and shows section
  it('TC-386-04: loadPendingModInvites calls get_pending_mod_invites and shows #mod-invite-section', async () => {
    const invites = [
      {
        debate_id: 'debate-inv-001',
        topic: 'Best OS ever',
        category: 'Tech',
        mode: 'text',
        inviter_id: 'user-abc',
        inviter_name: 'Charlie',
        created_at: new Date().toISOString(),
      },
    ];

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'get_pending_mod_invites') return Promise.resolve({ data: invites, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { loadPendingModInvites } = await import('../../src/arena/arena-mod-queue-browse.ts');
    await loadPendingModInvites();

    expect(mockRpc).toHaveBeenCalledWith('get_pending_mod_invites', expect.anything());
    const section = document.getElementById('mod-invite-section')!;
    expect(section.style.display).toBe('block');
    const listEl = document.getElementById('mod-invite-list')!;
    expect(listEl.innerHTML).toContain('Charlie');
  });

  // TC-386-05 — startModStatusPoll calls get_debate_mod_status periodically
  it('TC-386-05: startModStatusPoll calls get_debate_mod_status and shows modal when status is requested', async () => {
    const modStatus: import('../../src/arena/arena-types-moderator.ts').ModStatusResult = {
      mod_status: 'requested',
      mod_requested_by: 'user-mod',
      moderator_id: 'mod-id-001',
      moderator_display_name: 'Judge Joe',
    };

    // Seed view = 'room' so the poll doesn't self-cancel
    const stateMod = await import('../../src/arena/arena-state.ts');
    stateMod.set_view('room');

    // Also need currentDebate set so modal can reference it
    (stateMod as unknown as Record<string, (v: unknown) => void>).set_currentDebate({
      id: 'debate-status-001',
      role: 'a',
      round: 1,
      totalRounds: 3,
      mode: 'text',
    });

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'get_debate_mod_status') return Promise.resolve({ data: modStatus, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { startModStatusPoll, stopModStatusPoll } = await import('../../src/arena/arena-mod-queue-status.ts');
    startModStatusPoll('debate-status-001');

    await vi.advanceTimersByTimeAsync(4000);

    expect(mockRpc).toHaveBeenCalledWith(
      'get_debate_mod_status',
      expect.objectContaining({ p_debate_id: 'debate-status-001' }),
    );
    expect(document.getElementById('mod-request-modal')).not.toBeNull();

    stopModStatusPoll();
  });

  // TC-386-06 — handleModResponse calls respond_to_mod_request with accept=true
  it('TC-386-06: handleModResponse accept=true calls respond_to_mod_request', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const modal = document.createElement('div');
    modal.id = 'mod-request-modal';
    document.body.appendChild(modal);

    const acceptBtn = document.createElement('button');
    acceptBtn.id = 'mod-req-accept';
    modal.appendChild(acceptBtn);
    const declineBtn = document.createElement('button');
    declineBtn.id = 'mod-req-decline';
    modal.appendChild(declineBtn);

    const { handleModResponse } = await import('../../src/arena/arena-mod-queue-status.ts');
    await handleModResponse(true, 'debate-resp-001', modal, 'mod-id-001', 'Judge Joe');

    expect(mockRpc).toHaveBeenCalledWith(
      'respond_to_mod_request',
      expect.objectContaining({ p_debate_id: 'debate-resp-001', p_accept: true }),
    );
    // Modal removed
    expect(document.getElementById('mod-request-modal')).toBeNull();
  });

  // TC-386-07 — createModDebate calls create_mod_debate with all params
  it('TC-386-07: createModDebate calls create_mod_debate with mode, topic, category, ranked, ruleset', async () => {
    document.body.innerHTML += `
      <select id="mod-debate-mode"><option value="text" selected>Text</option></select>
      <select id="mod-debate-category"><option value="sports" selected>Sports</option></select>
      <input id="mod-debate-topic" type="text" value="GOAT debate" />
      <input id="mod-debate-ranked" type="checkbox" />
      <select id="mod-debate-ruleset"><option value="amplified" selected>Amplified</option></select>
      <button id="mod-debate-create-btn">CREATE</button>
    `;

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'create_mod_debate') {
        return Promise.resolve({
          data: { debate_id: 'debate-new-001', join_code: 'ABC123' },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { createModDebate } = await import('../../src/arena/arena-mod-debate-picker.ts');
    await createModDebate();

    expect(mockRpc).toHaveBeenCalledWith(
      'create_mod_debate',
      expect.objectContaining({
        p_mode: 'text',
        p_topic: 'GOAT debate',
        p_category: 'sports',
        p_ranked: false,
        p_ruleset: 'amplified',
      }),
    );
  });
});

// ============================================================
// SEAM #429 — src/arena.ts → arena-types-ai-scoring
// Boundary: arena.ts re-exports AIScoreResult and SideScores types
// ============================================================

describe('seam #429 — arena-types-ai-scoring type shapes', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockAuth.onAuthStateChange.mockReset();
    mockAuth.onAuthStateChange.mockImplementation(
      (_cb: (event: string, session: null) => void) => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    );
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC-429-1: ARCH — arena.ts imports from arena-types-ai-scoring.ts', () => {
    const src = readFileSync(resolve('src/arena.ts'), 'utf-8');
    const imports = src.split('\n').filter((l) => /from\s+['"]/.test(l));
    expect(imports.some((l) => l.includes('arena-types-ai-scoring'))).toBe(true);
  });

  it('TC-429-2: arena.ts re-exports AIScoreResult type from arena-types-ai-scoring.ts', () => {
    const src = readFileSync(resolve('src/arena.ts'), 'utf-8');
    expect(src).toMatch(/AIScoreResult/);
    expect(src).toMatch(/arena-types-ai-scoring/);
  });

  it('TC-429-3: arena.ts re-exports SideScores type from arena-types-ai-scoring.ts', () => {
    const src = readFileSync(resolve('src/arena.ts'), 'utf-8');
    expect(src).toMatch(/SideScores/);
  });

  it('TC-429-4: AIScoreResult interface has required fields', () => {
    const src = readFileSync(resolve('src/arena/arena-types-ai-scoring.ts'), 'utf-8');
    expect(src).toMatch(/side_a/);
    expect(src).toMatch(/side_b/);
    expect(src).toMatch(/overall_winner/);
    expect(src).toMatch(/verdict/);
  });

  it('TC-429-5: SideScores interface has the four scoring criteria', () => {
    const src = readFileSync(resolve('src/arena/arena-types-ai-scoring.ts'), 'utf-8');
    expect(src).toMatch(/logic/);
    expect(src).toMatch(/evidence/);
    expect(src).toMatch(/delivery/);
    expect(src).toMatch(/rebuttal/);
  });

  it('TC-429-6: CriterionScore has score (number) and reason (string) fields', () => {
    const src = readFileSync(resolve('src/arena/arena-types-ai-scoring.ts'), 'utf-8');
    expect(src).toMatch(/score:\s*number/);
    expect(src).toMatch(/reason:\s*string/);
  });
});

// ============================================================
// SEAM #430 — src/arena.ts → arena-queue
// Boundary: arena.ts re-exports enterQueue, leaveQueue
// RPCs: join_debate_queue, check_queue_status, leave_debate_queue, get_arena_feed
// ============================================================

describe('seam #430 — arena-queue: enterQueue / leaveQueue', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockAuth.onAuthStateChange.mockReset();
    mockAuth.onAuthStateChange.mockImplementation(
      (_cb: (event: string, session: null) => void) => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    );
    mockRpc.mockResolvedValue({ data: null, error: null });
    document.body.innerHTML = '<div id="screen-main"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC-430-1: ARCH — arena.ts imports enterQueue and leaveQueue from arena-queue.ts', () => {
    const src = readFileSync(resolve('src/arena.ts'), 'utf-8');
    const imports = src.split('\n').filter((l) => /from\s+['"]/.test(l));
    expect(imports.some((l) => l.includes('arena-queue'))).toBe(true);
    expect(src).toMatch(/enterQueue/);
    expect(src).toMatch(/leaveQueue/);
  });

  it('TC-430-2: enterQueue with mode=ai skips join_debate_queue RPC', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'get_arena_feed') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });
    const { enterQueue } = await import('../../src/arena/arena-queue.ts');
    // mode=ai goes to startAIDebate, not join_debate_queue
    enterQueue('ai', 'Is pineapple on pizza acceptable?');
    await vi.runAllTimersAsync();
    const rpcCalls = mockRpc.mock.calls.map((c: unknown[]) => c[0]);
    expect(rpcCalls).not.toContain('join_debate_queue');
  });

  it('TC-430-3: enterQueue (non-ai) renders queue DOM elements', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'join_debate_queue') return Promise.resolve({ data: { status: 'waiting' }, error: null });
      if (fn === 'get_arena_feed') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });
    const stateMod = await import('../../src/arena/arena-state.ts');
    stateMod.set_screenEl(document.getElementById('screen-main') as HTMLElement);

    const { enterQueue } = await import('../../src/arena/arena-queue.ts');
    enterQueue('text', 'Hot take topic');
    await vi.runAllTimersAsync();

    expect(document.querySelector('.arena-queue')).not.toBeNull();
    expect(document.getElementById('arena-queue-cancel')).not.toBeNull();
  });

  it('TC-430-4: joinServerQueue calls join_debate_queue RPC with correct params', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'join_debate_queue') return Promise.resolve({ data: { status: 'waiting' }, error: null });
      return Promise.resolve({ data: null, error: null });
    });
    const { joinServerQueue } = await import('../../src/arena/arena-queue.ts');
    await joinServerQueue('text', 'Is remote work better?');

    expect(mockRpc).toHaveBeenCalledWith('join_debate_queue', expect.objectContaining({
      p_mode: 'text',
      p_topic: 'Is remote work better?',
    }));
  });

  it('TC-430-5: clearQueueTimers clears poll and elapsed timers without throwing', async () => {
    const { clearQueueTimers } = await import('../../src/arena/arena-queue.ts');
    const stateMod = await import('../../src/arena/arena-state.ts');

    // Set up fake timers
    const fakeTimer = setInterval(() => {/* noop */}, 1000);
    stateMod.set_queuePollTimer(fakeTimer as unknown as ReturnType<typeof setInterval>);
    stateMod.set_queueElapsedTimer(fakeTimer as unknown as ReturnType<typeof setInterval>);

    expect(() => clearQueueTimers()).not.toThrow();
    // After clearing, timers should be null
    expect(stateMod.queuePollTimer).toBeNull();
    expect(stateMod.queueElapsedTimer).toBeNull();
  });

  it('TC-430-6: onQueueTimeout stops timers and shows timeout options', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const stateMod = await import('../../src/arena/arena-state.ts');
    stateMod.set_screenEl(document.getElementById('screen-main') as HTMLElement);

    // Render a queue screen first so the DOM exists
    document.getElementById('screen-main')!.innerHTML = `<div class="arena-queue"></div>`;

    const { onQueueTimeout } = await import('../../src/arena/arena-queue.ts');
    onQueueTimeout();
    await vi.runAllTimersAsync();

    expect(document.querySelector('.arena-queue-timeout-options')).not.toBeNull();
    expect(document.getElementById('arena-try-ai')).not.toBeNull();
    expect(document.getElementById('arena-try-again')).not.toBeNull();
  });

  it('TC-430-7: updateQueueStatus reflects correct status text at different elapsed times', async () => {
    document.body.innerHTML = '<div id="screen-main"><div id="arena-queue-status"></div></div>';
    const { updateQueueStatus } = await import('../../src/arena/arena-queue.ts');

    updateQueueStatus(5);
    expect(document.getElementById('arena-queue-status')!.textContent).toMatch(/worthy opponent/i);

    updateQueueStatus(20);
    expect(document.getElementById('arena-queue-status')!.textContent).toMatch(/expanding/i);

    updateQueueStatus(40);
    expect(document.getElementById('arena-queue-status')!.textContent).toMatch(/regions/i);

    updateQueueStatus(60);
    expect(document.getElementById('arena-queue-status')!.textContent).toMatch(/still/i);
  });
});

// ============================================================
// SEAM #431 — src/arena.ts → arena-mod-refs
// Boundary: arena.ts re-exports assignSelectedMod, addReferenceButton,
//           showReferenceForm, hideReferenceForm, showRulingPanel, startReferencePoll
// arena-mod-refs is a thin orchestrator over sub-files
// ============================================================

describe('seam #431 — arena-mod-refs: reference form and ruling panel', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockAuth.onAuthStateChange.mockReset();
    mockAuth.onAuthStateChange.mockImplementation(
      (_cb: (event: string, session: null) => void) => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    );
    mockRpc.mockResolvedValue({ data: null, error: null });
    document.body.innerHTML = '<div id="screen-main"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC-431-1: ARCH — arena.ts imports from arena-mod-refs.ts', () => {
    const src = readFileSync(resolve('src/arena.ts'), 'utf-8');
    const imports = src.split('\n').filter((l) => /from\s+['"]/.test(l));
    expect(imports.some((l) => l.includes('arena-mod-refs'))).toBe(true);
  });

  it('TC-431-2: arena.ts re-exports assignSelectedMod, showReferenceForm, hideReferenceForm, showRulingPanel', () => {
    const src = readFileSync(resolve('src/arena.ts'), 'utf-8');
    expect(src).toMatch(/assignSelectedMod/);
    expect(src).toMatch(/showReferenceForm/);
    expect(src).toMatch(/hideReferenceForm/);
    expect(src).toMatch(/showRulingPanel/);
  });

  it('TC-431-3: hideReferenceForm removes arena-ref-form from DOM', async () => {
    document.body.innerHTML = '<div id="arena-ref-form">form</div>';
    const { hideReferenceForm } = await import('../../src/arena/arena-mod-refs-form.ts');
    expect(document.getElementById('arena-ref-form')).not.toBeNull();
    hideReferenceForm();
    expect(document.getElementById('arena-ref-form')).toBeNull();
  });

  it('TC-431-4: showReferenceForm creates form element with URL input and textarea', async () => {
    // Set up a fake current debate in arena-state
    const stateMod = await import('../../src/arena/arena-state.ts');
    stateMod.set_currentDebate({
      id: 'debate-ref-test',
      topic: 'Test topic',
      role: 'a',
      mode: 'text',
      round: 1,
      totalRounds: 3,
      status: 'live',
      opponentName: 'Opponent',
      opponentElo: 1200,
      moderatorType: null,
      messages: [],
    } as unknown as Parameters<typeof stateMod.set_currentDebate>[0]);
    stateMod.set_screenEl(document.getElementById('screen-main') as HTMLElement);

    const { showReferenceForm } = await import('../../src/arena/arena-mod-refs-form.ts');
    showReferenceForm();

    expect(document.getElementById('arena-ref-form')).not.toBeNull();
    expect(document.getElementById('arena-ref-url')).not.toBeNull();
    expect(document.getElementById('arena-ref-desc')).not.toBeNull();
    expect(document.getElementById('arena-ref-submit-btn')).not.toBeNull();
    expect(document.getElementById('arena-ref-cancel-btn')).not.toBeNull();
  });

  it('TC-431-5: showRulingPanel creates overlay with allow and deny buttons', async () => {
    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');
    showRulingPanel({
      id: 'ref-001',
      debate_id: 'debate-001',
      submitter_name: 'Alice',
      url: 'https://example.com',
      description: 'A solid argument',
      supports_side: 'a',
      round: 2,
    } as unknown as Parameters<typeof showRulingPanel>[0]);

    expect(document.getElementById('mod-ruling-overlay')).not.toBeNull();
    expect(document.getElementById('mod-ruling-allow')).not.toBeNull();
    expect(document.getElementById('mod-ruling-deny')).not.toBeNull();
  });

  it('TC-431-6: startReferencePoll is a no-op (F-55 retired)', async () => {
    const { startReferencePoll } = await import('../../src/arena/arena-mod-refs-ruling.ts');
    // Should not throw and not call any RPCs
    startReferencePoll('debate-any-id');
    await vi.runAllTimersAsync();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('TC-431-7: addReferenceButton is a no-op (F-55 retired)', async () => {
    const { addReferenceButton } = await import('../../src/arena/arena-mod-refs-form.ts');
    // Should not throw and DOM should be unchanged
    const before = document.body.innerHTML;
    addReferenceButton();
    expect(document.body.innerHTML).toBe(before);
  });
});

// ============================================================
// seam #541 — src/arena.ts → arena-room-predebate
// Boundary: arena.ts re-exports showPreDebate from arena-room-predebate.ts
// Mock boundary: @supabase/supabase-js only
// ============================================================

describe('seam #541 — arena-room-predebate: showPreDebate', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockFrom.mockReset();
    mockAuth.onAuthStateChange.mockReset();
    mockAuth.onAuthStateChange.mockImplementation(
      (_cb: (event: string, session: null) => void) => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    );
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    document.body.innerHTML = '<div id="screen-main"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC-541-1: ARCH — arena.ts imports showPreDebate from arena-room-predebate.ts', () => {
    const src = readFileSync(resolve('src/arena.ts'), 'utf-8');
    const imports = src.split('\n').filter((l) => /from\s+['"]/.test(l));
    expect(imports.some((l) => l.includes('arena-room-predebate'))).toBe(true);
  });

  it('TC-541-2: arena.ts re-exports showPreDebate', () => {
    const src = readFileSync(resolve('src/arena.ts'), 'utf-8');
    expect(src).toContain('showPreDebate');
  });

  it('TC-541-3: showPreDebate appends .arena-pre-debate element to screenEl', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';
    const stateMod = await import('../../src/arena/arena-state.ts');
    stateMod.set_screenEl(document.getElementById('screen-main'));

    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue({ side_a: 0, side_b: 0, total: 0 }),
      renderStakingPanel: vi.fn().mockReturnValue('<div>staking</div>'),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn().mockReturnValue('<div>loadout</div>'),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      renderLoadoutPicker: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-loadout-presets.ts', () => ({
      renderPresetBar: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-bounty-claim.ts', () => ({
      renderBountyClaimDropdown: vi.fn().mockResolvedValue(undefined),
      resetBountyClaim: vi.fn(),
    }));
    vi.doMock('../../src/bounties.ts', () => ({
      bountyDot: vi.fn().mockReturnValue(''),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: vi.fn(),
    }));

    const { showPreDebate } = await import('../../src/arena/arena-room-predebate.ts');
    const debateData = {
      id: 'debate-abc',
      topic: 'Is pineapple on pizza acceptable?',
      mode: 'text',
      ranked: false,
      ruleset: 'amplified',
      opponentName: 'Alice',
      opponentId: 'user-alice',
      opponentElo: 1300,
    } as Parameters<typeof showPreDebate>[0];

    await showPreDebate(debateData);

    const pre = document.querySelector('.arena-pre-debate');
    expect(pre).not.toBeNull();
  });

  it('TC-541-4: showPreDebate renders opponent name and topic (XSS-escaped) in innerHTML', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';
    const stateMod = await import('../../src/arena/arena-state.ts');
    stateMod.set_screenEl(document.getElementById('screen-main'));

    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue(null),
      renderStakingPanel: vi.fn().mockReturnValue(''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn().mockReturnValue(''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      renderLoadoutPicker: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-loadout-presets.ts', () => ({
      renderPresetBar: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-bounty-claim.ts', () => ({
      renderBountyClaimDropdown: vi.fn().mockResolvedValue(undefined),
      resetBountyClaim: vi.fn(),
    }));
    vi.doMock('../../src/bounties.ts', () => ({
      bountyDot: vi.fn().mockReturnValue(''),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: vi.fn(),
    }));

    const { showPreDebate } = await import('../../src/arena/arena-room-predebate.ts');
    const debateData = {
      id: 'debate-xyz',
      topic: 'Hot takes are overrated',
      mode: 'text',
      ranked: false,
      ruleset: 'amplified',
      opponentName: 'Bob',
      opponentId: 'user-bob',
      opponentElo: 1100,
    } as Parameters<typeof showPreDebate>[0];

    await showPreDebate(debateData);

    const html = document.body.innerHTML;
    expect(html).toContain('Hot takes are overrated');
    expect(html).toContain('Bob');
  });

  it('TC-541-5: showPreDebate sets view to "room" via set_view', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';
    const stateMod = await import('../../src/arena/arena-state.ts');
    stateMod.set_screenEl(document.getElementById('screen-main'));

    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue(null),
      renderStakingPanel: vi.fn().mockReturnValue(''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn().mockReturnValue(''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      renderLoadoutPicker: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-loadout-presets.ts', () => ({
      renderPresetBar: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-bounty-claim.ts', () => ({
      renderBountyClaimDropdown: vi.fn().mockResolvedValue(undefined),
      resetBountyClaim: vi.fn(),
    }));
    vi.doMock('../../src/bounties.ts', () => ({
      bountyDot: vi.fn().mockReturnValue(''),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: vi.fn(),
    }));

    const { showPreDebate } = await import('../../src/arena/arena-room-predebate.ts');
    const debateData = {
      id: 'debate-view-test',
      topic: 'Test topic',
      mode: 'text',
      ranked: false,
      ruleset: 'amplified',
      opponentName: 'Carol',
      opponentId: 'user-carol',
      opponentElo: 1200,
    } as Parameters<typeof showPreDebate>[0];

    await showPreDebate(debateData);

    const { view } = await import('../../src/arena/arena-state.ts');
    expect(view).toBe('room');
  });

  it('TC-541-6: showPreDebate renders RANKED badge when ranked=true', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';
    const stateMod = await import('../../src/arena/arena-state.ts');
    stateMod.set_screenEl(document.getElementById('screen-main'));

    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue(null),
      renderStakingPanel: vi.fn().mockReturnValue(''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn().mockReturnValue(''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      renderLoadoutPicker: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-loadout-presets.ts', () => ({
      renderPresetBar: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-bounty-claim.ts', () => ({
      renderBountyClaimDropdown: vi.fn().mockResolvedValue(undefined),
      resetBountyClaim: vi.fn(),
    }));
    vi.doMock('../../src/bounties.ts', () => ({
      bountyDot: vi.fn().mockReturnValue(''),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: vi.fn(),
    }));

    const { showPreDebate } = await import('../../src/arena/arena-room-predebate.ts');
    const debateData = {
      id: 'debate-ranked',
      topic: 'Ranked debate topic',
      mode: 'text',
      ranked: true,
      ruleset: 'amplified',
      opponentName: 'Dave',
      opponentId: 'user-dave',
      opponentElo: 1500,
    } as Parameters<typeof showPreDebate>[0];

    await showPreDebate(debateData);

    const badge = document.querySelector('.arena-rank-badge.ranked');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('RANKED');
  });

  it('TC-541-7: showPreDebate renders UNPLUGGED badge when ruleset=unplugged', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';
    const stateMod = await import('../../src/arena/arena-state.ts');
    stateMod.set_screenEl(document.getElementById('screen-main'));

    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue(null),
      renderStakingPanel: vi.fn().mockReturnValue(''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn().mockReturnValue(''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      renderLoadoutPicker: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-loadout-presets.ts', () => ({
      renderPresetBar: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-bounty-claim.ts', () => ({
      renderBountyClaimDropdown: vi.fn().mockResolvedValue(undefined),
      resetBountyClaim: vi.fn(),
    }));
    vi.doMock('../../src/bounties.ts', () => ({
      bountyDot: vi.fn().mockReturnValue(''),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: vi.fn(),
    }));

    const { showPreDebate } = await import('../../src/arena/arena-room-predebate.ts');
    const debateData = {
      id: 'debate-unplugged',
      topic: 'Unplugged topic',
      mode: 'text',
      ranked: false,
      ruleset: 'unplugged',
      opponentName: 'Eve',
      opponentId: 'user-eve',
      opponentElo: 1400,
    } as Parameters<typeof showPreDebate>[0];

    await showPreDebate(debateData);

    const badge = document.querySelector('.arena-rank-badge.unplugged');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('UNPLUGGED');
  });
});

// ============================================================
// seam #543 — arena.ts → arena-config-mode-select
// Boundary: showModeSelect, closeModeSelect, wireModPicker,
//           loadAvailableModerators
// Mock boundary: @supabase/supabase-js only
// ============================================================

describe('seam #543 — arena-config-mode-select: mode picker sheet', () => {
  // Each test gets its own module graph via resetModules in global beforeEach
  // plus fake timers to guard any interval inside dynamically-imported deps.

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '<div id="screen-main"></div>';
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    // Remove any lingering overlay the test may have created
    document.getElementById('arena-mode-overlay')?.remove();
    vi.useRealTimers();
  });

  it('TC-543-1: ARCH — arena.ts imports showModeSelect and closeModeSelect from arena-config-mode-select.ts', () => {
    const src = readFileSync(resolve(__dirname, '../../src/arena.ts'), 'utf-8');
    const imports = src.split('\n').filter((l) => /from\s+['"]/.test(l));
    const line = imports.find((l) => l.includes('arena-config-mode-select'));
    expect(line).toBeTruthy();
    expect(line).toContain('showModeSelect');
    expect(line).toContain('closeModeSelect');
  });

  it('TC-543-2: showModeSelect appends #arena-mode-overlay to document.body when user is authenticated', async () => {
    const { showModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    // Patch getCurrentUser to return a fake user so the auth guard passes
    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentUser').mockReturnValue({ id: 'user-001' } as ReturnType<typeof authMod.getCurrentUser>);

    showModeSelect();

    expect(document.getElementById('arena-mode-overlay')).not.toBeNull();
  });

  it('TC-543-3: showModeSelect renders one .arena-mode-card per MODES entry (4 cards)', async () => {
    const { showModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentUser').mockReturnValue({ id: 'user-001' } as ReturnType<typeof authMod.getCurrentUser>);

    showModeSelect();

    const cards = document.querySelectorAll('.arena-mode-card');
    expect(cards.length).toBe(4);
    const modes = Array.from(cards).map((c) => (c as HTMLElement).dataset.mode);
    expect(modes).toContain('live');
    expect(modes).toContain('voicememo');
    expect(modes).toContain('text');
    expect(modes).toContain('ai');
  });

  it('TC-543-4: closeModeSelect removes #arena-mode-overlay from DOM', async () => {
    const { showModeSelect, closeModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentUser').mockReturnValue({ id: 'user-001' } as ReturnType<typeof authMod.getCurrentUser>);

    showModeSelect();
    expect(document.getElementById('arena-mode-overlay')).not.toBeNull();

    closeModeSelect();
    expect(document.getElementById('arena-mode-overlay')).toBeNull();
  });

  it('TC-543-5: closeModeSelect(true) calls history.replaceState with arenaView=lobby', async () => {
    const { showModeSelect, closeModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentUser').mockReturnValue({ id: 'user-001' } as ReturnType<typeof authMod.getCurrentUser>);
    const replaceSpy = vi.spyOn(history, 'replaceState');

    showModeSelect();
    closeModeSelect(true);

    expect(replaceSpy).toHaveBeenCalledWith({ arenaView: 'lobby' }, '');
  });

  it('TC-543-6: closeModeSelect() (no forward) calls history.back()', async () => {
    const { showModeSelect, closeModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentUser').mockReturnValue({ id: 'user-001' } as ReturnType<typeof authMod.getCurrentUser>);
    const backSpy = vi.spyOn(history, 'back');

    showModeSelect();
    closeModeSelect();

    expect(backSpy).toHaveBeenCalled();
  });

  it('TC-543-7: wireModPicker selects clicked option and clears previous selection', async () => {
    const { wireModPicker } = await import('../../src/arena/arena-config-mode-select.ts');

    // Build a minimal container with two mod-picker-opt elements
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="mod-picker-opt" data-mod-type="none">
        <div class="mod-picker-check"></div>
      </div>
      <div class="mod-picker-opt" data-mod-type="ai">
        <div class="mod-picker-check"></div>
      </div>
    `;
    document.body.appendChild(container);

    wireModPicker(container);

    const [opt1, opt2] = Array.from(container.querySelectorAll('.mod-picker-opt')) as HTMLElement[];

    // Click first option
    opt1.click();
    expect(opt1.classList.contains('selected')).toBe(true);
    expect(opt2.classList.contains('selected')).toBe(false);
    expect(opt1.querySelector('.mod-picker-check')!.textContent).toBe('✓');

    // Click second option — first should be deselected
    opt2.click();
    expect(opt2.classList.contains('selected')).toBe(true);
    expect(opt1.classList.contains('selected')).toBe(false);
    expect(opt1.querySelector('.mod-picker-check')!.textContent).toBe('');
    expect(opt2.querySelector('.mod-picker-check')!.textContent).toBe('✓');
  });
});
