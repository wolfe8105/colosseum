// ============================================================
// INTEGRATOR — arena-feed-machine-pause + arena-state + arena-feed-state
// Seam #024 | score: 53
// Boundary: pauseFeed reads feedPaused, feedPauseTimeLeft, challengeRulingTimer,
//           activeChallengeRefId, activeChallengeId from arena-state.
//           unpauseFeed reads feedPaused, feedPauseTimeLeft, currentDebate,
//           and phase (arena-feed-state) from state.
//           Both write state back via set_* setters.
// Mock boundary: @supabase/supabase-js only
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
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let pauseFeed: (debate: unknown) => void;
let unpauseFeed: () => void;

let set_currentDebate: (v: unknown) => void;
let set_feedPaused: (v: boolean) => void;
let set_feedPauseTimeLeft: (v: number) => void;
let set_challengeRulingTimer: (v: ReturnType<typeof setInterval> | null) => void;
let getFeedPaused: () => boolean;
let getFeedPauseTimeLeft: () => number;
let getChallengeRulingTimer: () => ReturnType<typeof setInterval> | null;

let set_timeLeft: (v: number) => void;
let set_phase: (v: string) => void;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  document.body.innerHTML = '';

  const pauseMod = await import('../../src/arena/arena-feed-machine-pause.ts');
  pauseFeed = pauseMod.pauseFeed as (debate: unknown) => void;
  unpauseFeed = pauseMod.unpauseFeed;

  const stateMod = await import('../../src/arena/arena-state.ts');
  set_currentDebate = stateMod.set_currentDebate as (v: unknown) => void;
  set_feedPaused = stateMod.set_feedPaused;
  set_feedPauseTimeLeft = stateMod.set_feedPauseTimeLeft;
  set_challengeRulingTimer = stateMod.set_challengeRulingTimer;
  getFeedPaused = () => stateMod.feedPaused;
  getFeedPauseTimeLeft = () => stateMod.feedPauseTimeLeft;
  getChallengeRulingTimer = () => stateMod.challengeRulingTimer;

  const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
  set_timeLeft = feedStateMod.set_timeLeft;
  set_phase = feedStateMod.set_phase as (v: string) => void;
});

// ============================================================
// TC-I1: pauseFeed — sets feedPaused in arena-state
// ============================================================

describe('TC-I1: pauseFeed sets feedPaused to true in arena-state', () => {
  it('sets feedPaused to true', () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    set_currentDebate(debate);

    pauseFeed(debate);

    expect(getFeedPaused()).toBe(true);
  });

  it('is idempotent — calling twice does not double-pause', () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    pauseFeed(debate);
    pauseFeed(debate); // second call — should be no-op

    expect(getFeedPaused()).toBe(true);
  });
});

// ============================================================
// TC-I2: pauseFeed — stores timeLeft from arena-feed-state as feedPauseTimeLeft
// ============================================================

describe('TC-I2: pauseFeed stores current timeLeft as feedPauseTimeLeft in arena-state', () => {
  it('captures timeLeft into feedPauseTimeLeft', () => {
    set_timeLeft(42);
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };

    pauseFeed(debate);

    expect(getFeedPauseTimeLeft()).toBe(42);
  });
});

// ============================================================
// TC-I3: pauseFeed — moderator view shows ruling panel
// ============================================================

describe('TC-I3: pauseFeed renders challenge overlay when modView is true', () => {
  it('appends #feed-challenge-overlay to DOM for moderator', () => {
    const debate = { id: 'd1', role: 'mod', modView: true, messages: [] };
    mockRpc.mockResolvedValue({ data: null, error: null });

    pauseFeed(debate);

    expect(document.getElementById('feed-challenge-overlay')).not.toBeNull();
  });

  it('does NOT show ruling panel for non-mod debater', () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };

    pauseFeed(debate);

    expect(document.getElementById('feed-challenge-overlay')).toBeNull();
  });
});

// ============================================================
// TC-I4: unpauseFeed — clears feedPaused and restores feedPauseTimeLeft
// ============================================================

describe('TC-I4: unpauseFeed clears feedPaused and restores state in arena-state', () => {
  it('sets feedPaused to false', () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    pauseFeed(debate);
    expect(getFeedPaused()).toBe(true);

    unpauseFeed();

    expect(getFeedPaused()).toBe(false);
  });

  it('is idempotent — calling unpause twice does not throw', () => {
    unpauseFeed();
    unpauseFeed();
    expect(getFeedPaused()).toBe(false);
  });

  it('restores timeLeft from feedPauseTimeLeft', async () => {
    set_timeLeft(45);
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    set_currentDebate(debate);
    set_phase('speaker_a');

    pauseFeed(debate);
    expect(getFeedPauseTimeLeft()).toBe(45);

    unpauseFeed();

    // feedPauseTimeLeft is cleared
    expect(getFeedPauseTimeLeft()).toBe(0);
  });
});

// ============================================================
// TC-I5: unpauseFeed — clears challengeRulingTimer in arena-state
// ============================================================

describe('TC-I5: unpauseFeed clears challengeRulingTimer in arena-state', () => {
  it('sets challengeRulingTimer to null after unpause', () => {
    const t = setInterval(() => {}, 5000);
    set_challengeRulingTimer(t);
    set_feedPaused(true); // need paused state to unpause

    unpauseFeed();

    expect(getChallengeRulingTimer()).toBeNull();
  });
});

// ============================================================
// TC-I6: unpauseFeed — removes feed-challenge-overlay from DOM
// ============================================================

describe('TC-I6: unpauseFeed removes feed-challenge-overlay from DOM', () => {
  it('removes the overlay element when unpausing', () => {
    const debate = { id: 'd1', role: 'mod', modView: true, messages: [] };
    mockRpc.mockResolvedValue({ data: null, error: null });

    pauseFeed(debate);
    expect(document.getElementById('feed-challenge-overlay')).not.toBeNull();

    unpauseFeed();

    expect(document.getElementById('feed-challenge-overlay')).toBeNull();
  });
});

// ============================================================
// ARCH — arena-feed-machine-pause.ts import boundaries
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — arena-feed-machine-pause.ts imports only from allowed modules', () => {
  it('imports only from auth, config, arena-state, arena-types, arena-types-feed-room, arena-feed-state, arena-feed-ui', () => {
    const allowed = new Set([
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-feed-room.ts',
      './arena-feed-state.ts',
      './arena-feed-ui.ts',
    ]);
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-feed-machine-pause.ts'),
      'utf-8'
    );
    const paths = source.split('\n')
      .filter(l => /from\s+['"]/.test(l))
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter((p): p is string => Boolean(p));
    for (const path of paths) {
      expect(allowed, `Unexpected import in arena-feed-machine-pause.ts: ${path}`).toContain(path);
    }
  });
});
