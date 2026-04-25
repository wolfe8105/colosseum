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

// ============================================================
// Seam #128 — arena-feed-machine-pause → arena-feed-ui
// TC-U1 through TC-U7: verifying DOM mutations via arena-feed-ui helpers
// ============================================================

// Additional module handles needed for arena-feed-ui seam
let set_activeChallengeRefId: (v: string | null) => void;
let set_activeChallengeId: (v: string | null) => void;
let set_loadedRefs: (v: unknown[]) => void;
let set_opponentCitedRefs: (v: unknown[]) => void;
let set_challengesRemaining: (v: number) => void;

// Re-declare beforeEach to get extra state handles
// (vi.resetModules() in the parent beforeEach already resets modules each test)
beforeEach(async () => {
  const stateMod = await import('../../src/arena/arena-state.ts');
  set_activeChallengeRefId = stateMod.set_activeChallengeRefId;
  set_activeChallengeId = stateMod.set_activeChallengeId;
  // loadedRefs and opponentCitedRefs are mutable arrays — reassign via direct mutation helper
  const arenaState = stateMod;
  set_loadedRefs = (refs: unknown[]) => {
    arenaState.loadedRefs.length = 0;
    for (const r of refs) arenaState.loadedRefs.push(r as never);
  };
  set_opponentCitedRefs = (refs: unknown[]) => {
    arenaState.opponentCitedRefs.length = 0;
    for (const r of refs) arenaState.opponentCitedRefs.push(r as never);
  };
  set_challengesRemaining = stateMod.set_challengesRemaining;
});

// Helper: build minimal DOM for arena-feed-ui
function buildFeedDOM() {
  document.body.innerHTML = `
    <div id="feed-timer">0:00</div>
    <div id="feed-turn-label"></div>
    <div id="feed-round-label"></div>
    <button id="feed-finish-turn"></button>
    <button id="feed-cite-btn"></button>
    <button id="feed-challenge-btn"></button>
    <textarea id="feed-debater-input"></textarea>
    <button id="feed-debater-send-btn"></button>
  `;
}

// ============================================================
// TC-U1: pauseFeed calls updateTurnLabel with challenge text
// ============================================================

describe('TC-U1: pauseFeed sets #feed-turn-label to challenge-in-progress text', () => {
  it('updates #feed-turn-label to ⚔️ CHALLENGE IN PROGRESS', () => {
    buildFeedDOM();
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };

    pauseFeed(debate);

    const label = document.getElementById('feed-turn-label');
    expect(label?.textContent).toContain('CHALLENGE IN PROGRESS');
  });
});

// ============================================================
// TC-U2: pauseFeed calls setDebaterInputEnabled(false) — disables #feed-debater-input
// ============================================================

describe('TC-U2: pauseFeed disables #feed-debater-input via setDebaterInputEnabled(false)', () => {
  it('sets feed-debater-input.disabled to true on pause', () => {
    buildFeedDOM();
    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    input.disabled = false;
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };

    pauseFeed(debate);

    expect(input.disabled).toBe(true);
  });

  it('freezes the input placeholder text', () => {
    buildFeedDOM();
    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };

    pauseFeed(debate);

    expect(input.placeholder).toBe('Waiting for opponent...');
  });
});

// ============================================================
// TC-U3: pauseFeed disables #feed-finish-turn button
// ============================================================

describe('TC-U3: pauseFeed disables #feed-finish-turn button', () => {
  it('sets feed-finish-turn.disabled to true on pause', () => {
    buildFeedDOM();
    const btn = document.getElementById('feed-finish-turn') as HTMLButtonElement;
    btn.disabled = false;
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };

    pauseFeed(debate);

    expect(btn.disabled).toBe(true);
  });
});

// ============================================================
// TC-U4: pauseFeed disables #feed-cite-btn via updateCiteButtonState (feedPaused = true)
// ============================================================

describe('TC-U4: pauseFeed disables #feed-cite-btn when feed is paused', () => {
  it('disables cite button after pause regardless of uncited refs', async () => {
    buildFeedDOM();
    const btn = document.getElementById('feed-cite-btn') as HTMLButtonElement;
    btn.disabled = false;

    // Give a debate where it's the debater's turn so the only disable reason is feedPaused
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    set_currentDebate(debate);
    set_phase('speaker_a');

    // Populate loadedRefs with an uncited ref so the cite button would otherwise be enabled
    set_loadedRefs([{ reference_id: 'ref1', cited: false, url: 'http://a.com', claim: 'x', domain: 'a.com', author: 'A', source_type: 'article', current_power: 1, power_ceiling: 5, rarity: 'common', verification_points: 1, citation_count: 0, win_count: 0, loss_count: 0, cited_at: null }]);

    pauseFeed(debate);

    // feedPaused is now true — updateCiteButtonState should disable the button
    expect(btn.disabled).toBe(true);
  });
});

// ============================================================
// TC-U5: pauseFeed disables #feed-challenge-btn via updateChallengeButtonState
// ============================================================

describe('TC-U5: pauseFeed disables #feed-challenge-btn when feed is paused', () => {
  it('disables challenge button after pause even when challenges remain', async () => {
    buildFeedDOM();
    const btn = document.getElementById('feed-challenge-btn') as HTMLButtonElement;
    btn.disabled = false;

    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    set_currentDebate(debate);
    set_phase('speaker_a');
    set_challengesRemaining(3);
    set_opponentCitedRefs([{ reference_id: 'ref2', already_challenged: false }]);

    pauseFeed(debate);

    expect(btn.disabled).toBe(true);
  });

  it('sets challenge button text to include remaining count', () => {
    buildFeedDOM();
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    set_challengesRemaining(2);

    pauseFeed(debate);

    const btn = document.getElementById('feed-challenge-btn') as HTMLButtonElement;
    expect(btn.textContent).toContain('CHALLENGE (2)');
  });
});

// ============================================================
// TC-U6: unpauseFeed calls updateTimerDisplay — #feed-timer reflects restored timeLeft
// ============================================================

describe('TC-U6: unpauseFeed calls updateTimerDisplay to restore timer display', () => {
  it('updates #feed-timer text after unpausing', () => {
    buildFeedDOM();
    set_timeLeft(30);
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    set_currentDebate(debate);
    set_phase('speaker_a');

    pauseFeed(debate);   // stores timeLeft=30 as feedPauseTimeLeft, resets to 0 visually
    unpauseFeed();       // restores timeLeft from feedPauseTimeLeft, calls updateTimerDisplay

    const timerEl = document.getElementById('feed-timer');
    // formatTimer(30) → "0:30"
    expect(timerEl?.textContent).toBe('0:30');
  });
});

// ============================================================
// TC-U7: unpauseFeed calls updateTurnLabel with correct speaker label
// ============================================================

describe('TC-U7: unpauseFeed restores #feed-turn-label based on current phase', () => {
  it('shows "Side A\'s turn" when phase is speaker_a', () => {
    buildFeedDOM();
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], modView: false };
    set_currentDebate(debate);
    set_phase('speaker_a');

    pauseFeed(debate);
    unpauseFeed();

    const label = document.getElementById('feed-turn-label');
    expect(label?.textContent).toBe("Side A's turn");
  });

  it('shows "Side B\'s turn" when phase is speaker_b', () => {
    buildFeedDOM();
    const debate = { id: 'd1', role: 'b', opponentName: 'Alice', messages: [], modView: false };
    set_currentDebate(debate);
    set_phase('speaker_b');

    pauseFeed(debate);
    unpauseFeed();

    const label = document.getElementById('feed-turn-label');
    expect(label?.textContent).toBe("Side B's turn");
  });
});
