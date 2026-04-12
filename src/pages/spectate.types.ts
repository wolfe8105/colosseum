/**
 * THE MODERATOR — Spectator View Types
 *
 * All interfaces for the spectate module. No imports from other spectate files.
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

/** Combined replay enrichment data */
export interface ReplayData {
  power_ups: ReplayPowerUp[];
  references: ReplayReference[];
  mod_scores: ReplayModScore[];
}

/** Unified timeline entry for rendering */
export interface TimelineEntry {
  type: 'message' | 'power_up' | 'reference';
  timestamp: string;
  round: number | null;
  side: string | null;
  data: DebateMessage | ReplayPowerUp | ReplayReference;
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
