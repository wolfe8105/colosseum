// ============================================================
// ARENA FEED STATE — tests/arena-feed-state.test.ts
// Source: src/arena/arena-feed-state.ts
//
// CLASSIFICATION:
//   State setters    — Pure state mutation → Pure calculation tests
//   firstSpeaker()   — Pure calculation → Pure calculation test
//   secondSpeaker()  — Pure calculation → Pure calculation test
//   resetFeedRoomState() — State reset → Behavioral test
//
// IMPORTS:
//   type { FeedTurnPhase } from './arena-types-feed-room.ts'
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import * as feedState from '../src/arena/arena-feed-state.ts';

beforeEach(() => {
  feedState.resetFeedRoomState();
});

// ── TC1: firstSpeaker — odd rounds = 'a' ─────────────────────

describe('TC1 — firstSpeaker: returns a for odd rounds', () => {
  it('returns "a" for round 1', () => {
    expect(feedState.firstSpeaker(1)).toBe('a');
  });
  it('returns "a" for round 3', () => {
    expect(feedState.firstSpeaker(3)).toBe('a');
  });
});

// ── TC2: firstSpeaker — even rounds = 'b' ────────────────────

describe('TC2 — firstSpeaker: returns b for even rounds', () => {
  it('returns "b" for round 2', () => {
    expect(feedState.firstSpeaker(2)).toBe('b');
  });
  it('returns "b" for round 4', () => {
    expect(feedState.firstSpeaker(4)).toBe('b');
  });
});

// ── TC3: secondSpeaker — opposite of firstSpeaker ────────────

describe('TC3 — secondSpeaker: returns b for odd, a for even', () => {
  it('returns "b" for round 1 (odd)', () => {
    expect(feedState.secondSpeaker(1)).toBe('b');
  });
  it('returns "a" for round 2 (even)', () => {
    expect(feedState.secondSpeaker(2)).toBe('a');
  });
});

// ── TC4: set_phase — updates phase ───────────────────────────

describe('TC4 — set_phase: updates the phase export', () => {
  it('sets phase to "speaking_a"', () => {
    feedState.set_phase('speaking_a');
    expect(feedState.phase).toBe('speaking_a');
  });
});

// ── TC5: set_round — updates round ───────────────────────────

describe('TC5 — set_round: updates the round export', () => {
  it('sets round to 3', () => {
    feedState.set_round(3);
    expect(feedState.round).toBe(3);
  });
});

// ── TC6: set_scoreA/B — update scores ────────────────────────

describe('TC6 — set_scoreA and set_scoreB: update score exports', () => {
  it('sets scoreA', () => {
    feedState.set_scoreA(42);
    expect(feedState.scoreA).toBe(42);
  });
  it('sets scoreB', () => {
    feedState.set_scoreB(17);
    expect(feedState.scoreB).toBe(17);
  });
});

// ── TC7: set_sentimentA/B — update sentiment ─────────────────

describe('TC7 — set_sentimentA and set_sentimentB: update sentiment exports', () => {
  it('sets sentimentA', () => {
    feedState.set_sentimentA(5);
    expect(feedState.sentimentA).toBe(5);
  });
  it('sets sentimentB', () => {
    feedState.set_sentimentB(3);
    expect(feedState.sentimentB).toBe(3);
  });
});

// ── TC8: resetFeedRoomState — zeros all counters ─────────────

describe('TC8 — resetFeedRoomState: resets all state to defaults', () => {
  it('resets phase, round, timeLeft, scoreA, scoreB', () => {
    feedState.set_phase('speaking_b');
    feedState.set_round(5);
    feedState.set_scoreA(10);
    feedState.set_scoreB(8);
    feedState.resetFeedRoomState();
    expect(feedState.phase).toBe('pre_round');
    expect(feedState.round).toBe(1);
    expect(feedState.scoreA).toBe(0);
    expect(feedState.scoreB).toBe(0);
  });
});

// ── TC9: resetFeedRoomState — clears renderedEventIds set ────

describe('TC9 — resetFeedRoomState: clears renderedEventIds', () => {
  it('empties renderedEventIds after add + reset', () => {
    feedState.renderedEventIds.add('evt-1');
    feedState.resetFeedRoomState();
    expect(feedState.renderedEventIds.size).toBe(0);
  });
});

// ── TC10: set_disconnectHandled — updates flag ───────────────

describe('TC10 — set_disconnectHandled: updates disconnectHandled export', () => {
  it('sets disconnectHandled to true', () => {
    feedState.set_disconnectHandled(true);
    expect(feedState.disconnectHandled).toBe(true);
  });
});

// ── TC11: HEARTBEAT_INTERVAL_MS constant ─────────────────────

describe('TC11 — HEARTBEAT_INTERVAL_MS: constant is 10000ms', () => {
  it('exports HEARTBEAT_INTERVAL_MS = 10000', () => {
    expect(feedState.HEARTBEAT_INTERVAL_MS).toBe(10_000);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-feed-state.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./arena-types-feed-room.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-state.ts'),
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
