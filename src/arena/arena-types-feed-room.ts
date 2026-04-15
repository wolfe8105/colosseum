/**
 * Feed room types (F-51 Phase 1).
 */

export type FeedEventType =
  | 'speech'
  | 'round_divider'
  | 'point_award'
  | 'reference_cite'
  | 'reference_challenge'
  | 'mod_ruling'
  | 'power_up'
  | 'sentiment_vote'   // legacy rows — keep for historical replay compat
  | 'sentiment_tip'   // F-58: paid tip (replaces free vote)
  | 'disconnect';

export interface FeedEvent {
  id: string;
  debate_id: string;
  event_type: FeedEventType;
  round: number;
  side: 'a' | 'b' | 'mod' | null;
  content: string;
  score?: number | null;
  reference_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  author_name?: string;
}

/** Reference loaded for a debate via pre-debate loadout picker */
export interface LoadoutReference {
  reference_id: string;
  cited: boolean;
  cited_at: string | null;
  claim: string;
  url: string;
  domain: string;
  author: string;
  source_type: string;
  current_power: number;
  power_ceiling: number;
  rarity: string;
  verification_points: number;
  citation_count: number;
  win_count: number;
  loss_count: number;
}

/** Opponent's cited reference tracked in state for challenge dropdown */
export interface OpponentCitedRef {
  reference_id: string;
  claim: string;
  url: string;
  domain: string;
  source_type: string;
  feed_event_id: string;
  already_challenged: boolean;
}

/** Per-value scoring budget limits per round (Session 235) */
export const FEED_SCORE_BUDGET: Readonly<Record<number, number>> = {
  5: 2,
  4: 3,
  3: 4,
  2: 5,
  1: 6,
};

// LANDMINE [LM-TYPES-003]: The comment on the legacy 'sentiment_vote' member of
// FeedEventType says "keep for historical replay compat". If no live code still
// emits this type, it can be narrowed to a replay-only type in a follow-up; don't touch now.
export type FeedTurnPhase =
  | 'pre_round'       // countdown before first speaker
  | 'speaker_a'       // debater A's turn
  | 'pause_ab'        // 10s pause between A→B
  | 'speaker_b'       // debater B's turn
  | 'pause_ba'        // 10s pause between B→A (between rounds)
  | 'ad_break'        // 60s ad break between rounds (Phase 5)
  | 'final_ad_break'  // 30s ad break after last round (Phase 5)
  | 'vote_gate'       // spectators vote to see results (Phase 5)
  | 'finished';       // debate over

export const FEED_TURN_DURATION = 120;  // 2 minutes per turn
export const FEED_PAUSE_DURATION = 10;  // 10s between turns
export const FEED_TOTAL_ROUNDS = 4;
export const FEED_MAX_CHALLENGES = FEED_TOTAL_ROUNDS - 1;  // 3 challenges per debater per debate
export const FEED_CHALLENGE_RULING_SEC = 60;  // mod has 60s to rule on a challenge
export const FEED_AD_BREAK_DURATION = 60;       // 60s ad break between rounds
export const FEED_FINAL_AD_BREAK_DURATION = 30; // 30s final ad break before vote gate
export const FEED_VOTE_GATE_DURATION = 30;      // 30s vote gate countdown
