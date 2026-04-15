/**
 * arena-feed-state.ts — Shared mutable state for the live debate feed room.
 *
 * Extracted from arena-feed-room.ts so the room module and the realtime
 * module can both read/write the same state without circular import games.
 *
 * Pattern: ES module `let` exports + `set_*` setters (matches arena-state.ts).
 * Mutable collections (Set, Record) are exported directly — they're mutated
 * in place and don't need rebinding.
 */

import type { FeedTurnPhase } from './arena-types-feed-room.ts';

// ============================================================
// TURN STATE MACHINE
// ============================================================

export let phase: FeedTurnPhase = 'pre_round';
export let round = 1;
export let timeLeft = 0;
export let scoreA = 0;
export let scoreB = 0;

export function set_phase(v: FeedTurnPhase) { phase = v; }
export function set_round(v: number) { round = v; }
export function set_timeLeft(v: number) { timeLeft = v; }
export function set_scoreA(v: number) { scoreA = v; }
export function set_scoreB(v: number) { scoreB = v; }

// ============================================================
// FEED EVENT DEDUP + PIN STATE
// ============================================================

/** Set of feed event keys we've already rendered (dedup across optimistic + Realtime). */
export const renderedEventIds = new Set<string>();

/** Set of pinned event IDs (moderator-only local state). */
export const pinnedEventIds = new Set<string>();

// ============================================================
// PHASE 2: PER-VALUE SCORING BUDGET
// ============================================================

/** scoreUsed[pts] = number of times mod has scored this point value this round. */
export const scoreUsed: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
export let budgetRound = 1;
export function set_budgetRound(v: number) { budgetRound = v; }

// ============================================================
// PHASE 5: SPECTATOR SENTIMENT
// ============================================================

export let sentimentA = 0;
export let sentimentB = 0;
export const votedRounds = new Set<number>();
export let hasVotedFinal = false;
export let pendingSentimentA = 0;
export let pendingSentimentB = 0;

export function set_sentimentA(v: number) { sentimentA = v; }
export function set_sentimentB(v: number) { sentimentB = v; }
export function set_hasVotedFinal(v: boolean) { hasVotedFinal = v; }
export function set_pendingSentimentA(v: number) { pendingSentimentA = v; }
export function set_pendingSentimentB(v: number) { pendingSentimentB = v; }

// ============================================================
// PHASE 5: BROADCAST HEARTBEAT + DISCONNECT DETECTION
// ============================================================

export const HEARTBEAT_INTERVAL_MS = 10_000;  // send every 10s
export const HEARTBEAT_STALE_MS = 30_000;     // 30s = disconnected

export let heartbeatSendTimer: ReturnType<typeof setInterval> | null = null;
export let heartbeatCheckTimer: ReturnType<typeof setInterval> | null = null;

/** lastSeen[role] = timestamp ms — tracks heartbeat freshness per participant. */
export const lastSeen: Record<string, number> = {};

export let disconnectHandled = false;

export function set_heartbeatSendTimer(v: ReturnType<typeof setInterval> | null) { heartbeatSendTimer = v; }
export function set_heartbeatCheckTimer(v: ReturnType<typeof setInterval> | null) { heartbeatCheckTimer = v; }
export function set_disconnectHandled(v: boolean) { disconnectHandled = v; }

// ============================================================
// PURE HELPERS
// ============================================================

/** Spec: odd rounds A first, even rounds B first. */
export function firstSpeaker(round: number): 'a' | 'b' {
  return round % 2 === 1 ? 'a' : 'b';
}

export function secondSpeaker(round: number): 'a' | 'b' {
  return round % 2 === 1 ? 'b' : 'a';
}

// ============================================================
// RESET — called by cleanupFeedRoom() to zero everything
// ============================================================

export function resetFeedRoomState(): void {
  // Turn machine
  phase = 'pre_round';
  round = 1;
  timeLeft = 0;
  scoreA = 0;
  scoreB = 0;

  // Dedup + pin
  renderedEventIds.clear();
  pinnedEventIds.clear();

  // Budget
  budgetRound = 1;
  for (let pts = 1; pts <= 5; pts++) scoreUsed[pts] = 0;

  // Sentiment
  sentimentA = 0;
  sentimentB = 0;
  pendingSentimentA = 0;
  pendingSentimentB = 0;
  votedRounds.clear();
  hasVotedFinal = false;

  // Heartbeat
  if (heartbeatSendTimer) { clearInterval(heartbeatSendTimer); heartbeatSendTimer = null; }
  if (heartbeatCheckTimer) { clearInterval(heartbeatCheckTimer); heartbeatCheckTimer = null; }
  delete lastSeen['a'];
  delete lastSeen['b'];
  delete lastSeen['mod'];
  disconnectHandled = false;
}
