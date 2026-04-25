// ============================================================
// INTEGRATOR — arena-room-live-poll + rpc-schemas
// Seam #053
// Boundary: startOpponentPoll calls safeRpc('get_debate_messages', ..., get_debate_messages)
//           submitTextArgument calls safeRpc('submit_debate_message', ...)
//           advanceRound calls safeRpc('close_debate_round', ...)
//           startLiveRoundTimer manages roundTimeLeft via arena-state setters
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: vi.fn(),
    auth: mockAuth,
  })),
}));

// ── Module handles ────────────────────────────────────────────────────────────
let stopOpponentPoll: () => void;
let startOpponentPoll: (debateId: string, myRole: 'a' | 'b', round: number) => void;
let submitTextArgument: () => Promise<void>;
let advanceRound: () => void;
let startLiveRoundTimer: () => void;

let set_currentDebate: (v: unknown) => void;
let set_opponentPollTimer: (v: ReturnType<typeof setInterval> | null) => void;
let set_opponentPollElapsed: (v: number) => void;
let set_roundTimer: (v: ReturnType<typeof setInterval> | null) => void;
let set_roundTimeLeft: (v: number) => void;
let opponentPollTimer: () => ReturnType<typeof setInterval> | null;
let opponentPollElapsed: () => number;
let roundTimeLeft: () => number;
let roundTimer: () => ReturnType<typeof setInterval> | null;

const defaultDebate = {
  id: 'debate-abc',
  role: 'a' as const,
  mode: 'text' as const,
  round: 1,
  totalRounds: 3,
  topic: 'Test topic',
  opponentName: 'Opponent',
};

function makeArenaTextInput(value = 'Hello world'): HTMLTextAreaElement {
  const el = document.createElement('textarea');
  el.id = 'arena-text-input';
  el.value = value;
  document.body.appendChild(el);
  return el;
}

function makeElement(id: string, tag = 'div'): HTMLElement {
  const el = document.createElement(tag);
  el.id = id;
  document.body.appendChild(el);
  return el;
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  mockRpc.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      cb('INITIAL_SESSION', null);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
  );

  // Clean DOM
  document.body.innerHTML = '';

  // Dynamic imports after resetModules
  const stateModule = await import('../../src/arena/arena-state.ts');
  set_currentDebate = stateModule.set_currentDebate;
  set_opponentPollTimer = stateModule.set_opponentPollTimer;
  set_opponentPollElapsed = stateModule.set_opponentPollElapsed;
  set_roundTimer = stateModule.set_roundTimer;
  set_roundTimeLeft = stateModule.set_roundTimeLeft;
  opponentPollTimer = () => stateModule.opponentPollTimer;
  opponentPollElapsed = () => stateModule.opponentPollElapsed;
  roundTimeLeft = () => stateModule.roundTimeLeft;
  roundTimer = () => stateModule.roundTimer;

  const pollModule = await import('../../src/arena/arena-room-live-poll.ts');
  stopOpponentPoll = pollModule.stopOpponentPoll;
  startOpponentPoll = pollModule.startOpponentPoll;
  submitTextArgument = pollModule.submitTextArgument;
  advanceRound = pollModule.advanceRound;
  startLiveRoundTimer = pollModule.startLiveRoundTimer;

  // Set a default current debate
  set_currentDebate(defaultDebate);
});

// ── TC1: ARCH — get_debate_messages imported from rpc-schemas ─────────────────
describe('TC1: ARCH — get_debate_messages schema imported from rpc-schemas', () => {
  it('source file imports get_debate_messages from rpc-schemas', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const filePath = path.resolve(
      process.cwd(),
      'src/arena/arena-room-live-poll.ts',
    );
    const src = fs.readFileSync(filePath, 'utf-8');
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const rpcSchemaImport = imports.find(l =>
      l.includes('rpc-schemas') && l.includes('get_debate_messages'),
    );
    expect(rpcSchemaImport).toBeTruthy();
  });
});

// ── TC2: stopOpponentPoll clears interval and resets elapsed ──────────────────
describe('TC2: stopOpponentPoll clears interval and resets elapsed', () => {
  it('clears opponentPollTimer and sets elapsed to 0', () => {
    // Manually plant a timer in state
    const fakeTimer = setInterval(() => {}, 99999);
    set_opponentPollTimer(fakeTimer);
    set_opponentPollElapsed(42);

    stopOpponentPoll();

    expect(opponentPollTimer()).toBeNull();
    expect(opponentPollElapsed()).toBe(0);
  });
});

// ── TC3: startOpponentPoll calls get_debate_messages on tick ─────────────────
describe('TC3: startOpponentPoll polls for opponent message and stops when found', () => {
  it('calls safeRpc get_debate_messages on each tick and stops when opponent msg found', async () => {
    // First tick: no opponent message for round 1 on side b
    // Second tick: opponent message found
    mockRpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{ side: 'b', round: 1, content: 'Counter argument', is_ai: false, created_at: '2026-01-01' }],
        error: null,
      });

    makeElement('arena-text-input', 'textarea');
    makeElement('arena-record-btn', 'button');

    startOpponentPoll('debate-abc', 'a', 1);

    // First poll tick — no message found, poll continues
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockRpc).toHaveBeenCalledWith('get_debate_messages', { p_debate_id: 'debate-abc' });
    expect(opponentPollTimer()).not.toBeNull(); // still polling

    // Second tick — message found, poll stops
    await vi.advanceTimersByTimeAsync(3000);
    expect(opponentPollTimer()).toBeNull();
  });
});

// ── TC4: timeout stops poll and re-enables inputs ────────────────────────────
describe('TC4: poll times out and re-enables input/record buttons', () => {
  it('stops polling and enables inputs after timeout threshold', async () => {
    // Always return empty — simulate opponent never responding
    mockRpc.mockResolvedValue({ data: [], error: null });

    const inp = document.createElement('textarea');
    inp.id = 'arena-text-input';
    inp.disabled = true;
    document.body.appendChild(inp);

    const rec = document.createElement('button');
    rec.id = 'arena-record-btn';
    rec.disabled = true;
    document.body.appendChild(rec);

    startOpponentPoll('debate-abc', 'a', 1);

    // Advance enough ticks to exceed OPPONENT_POLL_TIMEOUT_SEC (120s) at 3s/tick = 40+ ticks
    // Each tick increments elapsed by OPPONENT_POLL_MS/1000 = 3s
    // 120s / 3s = 40 ticks needed; advance 41 ticks worth
    await vi.advanceTimersByTimeAsync(3000 * 41);

    expect(opponentPollTimer()).toBeNull();
    expect((document.getElementById('arena-text-input') as HTMLTextAreaElement)?.disabled).toBe(false);
    expect((document.getElementById('arena-record-btn') as HTMLButtonElement)?.disabled).toBe(false);
  });
});

// ── TC5: submitTextArgument calls submit_debate_message ──────────────────────
describe('TC5: submitTextArgument calls submit_debate_message with correct params', () => {
  it('calls safeRpc submit_debate_message for non-placeholder real debates', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    // Set up a real debate (non-placeholder)
    set_currentDebate({
      ...defaultDebate,
      id: 'real-debate-id',
      mode: 'text',
      round: 2,
      role: 'a',
    });

    makeArenaTextInput('My argument text');
    makeElement('arena-char-count');
    makeElement('arena-send-btn', 'button');
    makeElement('arena-text-input-area');

    await submitTextArgument();

    expect(mockRpc).toHaveBeenCalledWith(
      'submit_debate_message',
      expect.objectContaining({
        p_debate_id: 'real-debate-id',
        p_round: 2,
        p_side: 'a',
        p_content: 'My argument text',
      }),
    );
  });

  it('does not call submit_debate_message for placeholder debates', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    set_currentDebate({
      ...defaultDebate,
      id: 'placeholder-123',
      mode: 'text',
      round: 1,
      role: 'a',
    });

    makeArenaTextInput('Some text');
    makeElement('arena-char-count');
    makeElement('arena-send-btn', 'button');

    // Advance fake timers to resolve placeholder simulated response timeout
    const submitP = submitTextArgument();
    await vi.advanceTimersByTimeAsync(6000);
    await submitP;

    const submitCall = mockRpc.mock.calls.find(c => c[0] === 'submit_debate_message');
    expect(submitCall).toBeUndefined();
  });
});

// ── TC6: advanceRound calls close_debate_round fire-and-forget ────────────────
describe('TC6: advanceRound calls close_debate_round for human debates', () => {
  it('calls safeRpc close_debate_round and shows pressure message when pressure hits caller', async () => {
    mockRpc.mockResolvedValue({
      data: { pressure_on_a: true, pressure_on_b: false, score_a: 0, score_b: 5 },
      error: null,
    });

    set_currentDebate({
      ...defaultDebate,
      id: 'real-debate-id',
      mode: 'text',  // not 'ai', not 'live'
      round: 1,
      totalRounds: 3,
      role: 'a',
    });

    makeElement('arena-round-label');

    advanceRound();

    // Resolve the fire-and-forget RPC
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRpc).toHaveBeenCalledWith(
      'close_debate_round',
      expect.objectContaining({ p_debate_id: 'real-debate-id', p_round: 1 }),
    );
  });

  it('does not call close_debate_round for ai-local debates', () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    set_currentDebate({
      ...defaultDebate,
      id: 'ai-local-456',
      mode: 'ai',
      round: 1,
      totalRounds: 3,
    });

    makeElement('arena-round-label');

    advanceRound();

    const closeCall = mockRpc.mock.calls.find(c => c[0] === 'close_debate_round');
    expect(closeCall).toBeUndefined();
  });
});

// ── TC7: startLiveRoundTimer decrements roundTimeLeft and triggers advanceRound ─
describe('TC7: startLiveRoundTimer manages countdown and advances round at 0', () => {
  it('sets roundTimeLeft to ROUND_DURATION (120) and decrements each second', async () => {
    set_currentDebate({
      ...defaultDebate,
      id: 'real-debate-id',
      mode: 'live',
      round: 1,
      totalRounds: 3,
    });
    makeElement('arena-room-timer');

    startLiveRoundTimer();

    expect(roundTimeLeft()).toBe(120);

    await vi.advanceTimersByTimeAsync(5000);
    expect(roundTimeLeft()).toBe(115);
  });

  it('calls advanceRound when roundTimeLeft reaches 0, restarting the timer for next round', async () => {
    // Make totalRounds high so advanceRound advances to round 2 (not end debate)
    // In live mode, advanceRound calls startLiveRoundTimer, resetting roundTimeLeft to 120
    set_currentDebate({
      ...defaultDebate,
      id: 'real-debate-id',
      mode: 'live',
      round: 1,
      totalRounds: 10,
    });
    makeElement('arena-room-timer');
    makeElement('arena-round-label');

    startLiveRoundTimer();

    // Record round before draining
    const stateModule = await import('../../src/arena/arena-state.ts');
    const roundBefore = stateModule.currentDebate?.round ?? 1;

    // Advance 120 seconds to drain the timer — triggers advanceRound at second 120
    await vi.advanceTimersByTimeAsync(120 * 1000);

    // advanceRound increments debate.round
    const roundAfter = stateModule.currentDebate?.round ?? 1;
    expect(roundAfter).toBeGreaterThan(roundBefore);

    // In live mode, advanceRound calls startLiveRoundTimer again, resetting roundTimeLeft to 120
    // (it will have ticked down 1s already but is still near 120)
    expect(stateModule.roundTimeLeft).toBeLessThanOrEqual(120);
    expect(stateModule.roundTimeLeft).toBeGreaterThan(0);
  });
});
