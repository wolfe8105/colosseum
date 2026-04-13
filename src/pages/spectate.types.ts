/**
 * THE MODERATOR — Spectator View Types
 *
 * All interfaces for the spectate module. No imports from other spectate files.
 * F-05 (S277): Added ReplayPointAward, ReplaySpeechEvent, PointAwardMeta.
 *              Updated ReplayData (point_awards + speech_events buckets).
 *              Updated TimelineEntry ('speech' + 'score' entry types).
 */

/** Debate shape returned by get_arena_debate_spectator RPC or direct query */
export interface SpectateDebate {
  status: string | null;
  mode: string | null;
  topic: string | null;
  debater_a_name: string | null;
  debater_a_elo: number | null;
  debater_a_avatar: string | null;
  debater_b_name: string | null;
  debater_b_elo: number | null;
  debater_b_avatar: string | null;
  moderator_type: string | null;
  moderator_id: string | null;
  moderator_name: string | null;
  ruleset: string | null;
  spectator_count: number | null;
  current_round: number | null;
  total_rounds: number | null;
  vote_count_a: number | null;
  vote_count_b: number | null;
  score_a: number | null;
  score_b: number | null;
  winner: string | null;
  ai_scorecard: AIScorecard | null;
}

/** AI scorecard criterion (Logic/Evidence/Delivery/Rebuttal) */
export interface AICriterion {
  score: number;
  reason: string;
}

/** AI scorecard side scores */
export interface AISideScores {
  logic: AICriterion;
  evidence: AICriterion;
  delivery: AICriterion;
  rebuttal: AICriterion;
}

/** AI scorecard persisted in arena_debates.ai_scorecard */
export interface AIScorecard {
  side_a: AISideScores;
  side_b: AISideScores;
  overall_winner: string;
  verdict: string;
}

/** Power-up activation event from replay data */
export interface ReplayPowerUp {
  power_up_id: string;
  user_id: string;
  activated_at: string;
  power_up_name: string;
  power_up_icon: string;
  user_name: string;
  side: string;
}

/** Reference citation from replay data */
export interface ReplayReference {
  id: string;
  submitter_id: string;
  round: number | null;
  url: string;
  description: string;
  supports_side: string;
  ruling: string;
  ruling_reason: string | null;
  created_at: string;
  ruled_at: string | null;
  submitter_name: string;
  side: string;
}

/** Moderator score from replay data */
export interface ReplayModScore {
  scorer_id: string;
  scorer_role: string;
  score: number;
  created_at: string;
  scorer_name: string;
}

/**
 * F-05: Modifier math carried in a point_award event's metadata.
 * Written by score_debate_comment (S267 F-57 Phase 2).
 * scored_event_id links to the debate_feed_events.id of the speech event scored.
 */
export interface PointAwardMeta {
  scored_event_id: string;
  score_a_after: number;
  score_b_after: number;
  base_score: number;
  in_debate_multiplier: number;
  in_debate_flat: number;
  final_contribution: number;
}

/**
 * F-05: Point award event from get_debate_replay_data point_awards bucket.
 * Represents a moderator scoring a specific speech event during the debate.
 */
export interface ReplayPointAward {
  id: string;
  created_at: string;
  round: number | null;
  side: string;
  base_score: number;
  metadata: PointAwardMeta;
}

/**
 * F-05: Speech event from get_debate_replay_data speech_events bucket.
 * F-51 live moderated debates store dialogue in debate_feed_events (type='speech'),
 * not in debate_messages. This interface matches those rows for replay rendering.
 */
export interface ReplaySpeechEvent {
  id: string;
  created_at: string;
  round: number | null;
  side: string;
  content: string | null;
  user_id: string | null;
  debater_name: string;
}

/** Combined replay enrichment data (all 5 buckets from get_debate_replay_data) */
export interface ReplayData {
  power_ups: ReplayPowerUp[];
  references: ReplayReference[];
  mod_scores: ReplayModScore[];
  /** F-05: mod-scored point award events with modifier math in metadata */
  point_awards: ReplayPointAward[];
  /** F-05: debater speech events for F-51 debates (empty for older AI/private debates) */
  speech_events: ReplaySpeechEvent[];
}

/**
 * Unified timeline entry for rendering.
 * 'message'  — from debate_messages (older AI sparring / private lobby debates)
 * 'speech'   — from debate_feed_events type=speech (F-51 live moderated debates)
 * 'power_up' — activated power-up event
 * 'reference'— reference citation with ruling
 * 'score'    — standalone point award (older debates without speech event linkage)
 */
export interface TimelineEntry {
  type: 'message' | 'speech' | 'power_up' | 'reference' | 'score';
  timestamp: string;
  round: number | null;
  side: string | null;
  data: DebateMessage | ReplaySpeechEvent | ReplayPowerUp | ReplayReference | ReplayPointAward;
}

/** Single debate message (argument in a round) */
export interface DebateMessage {
  round: number | null;
  side: string | null;
  is_ai: boolean | null;
  content: string | null;
  created_at: string | null;
}

/** Spectator chat message */
export interface SpectatorChatMessage {
  display_name: string | null;
  message: string | null;
  created_at: string | null;
  user_id: string | null;
}
