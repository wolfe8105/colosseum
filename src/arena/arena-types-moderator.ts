/**
 * Moderator-related types.
 */

export interface AvailableModerator {
  id: string;
  display_name?: string;
  username?: string;
  mod_rating: number;
  mod_debates_total: number;
  mod_approval_pct: number;
}

export interface ModQueueItem {
  debate_id: string;
  topic: string;
  category: string;
  mode: string;
  created_at: string;
  debater_a_name: string | null;
  debater_b_name: string | null;
  mod_status: string;
}

export interface ModDebateJoinResult {
  debate_id: string;
  role: string;
  status: string;
  topic: string;
  mode: string;
  ranked: boolean;
  moderator_name: string;
  opponent_name: string | null;
  opponent_id: string | null;
  opponent_elo: number | null;
  ruleset?: string;
  total_rounds?: number;
  language?: string;
}

export interface ModDebateCheckResult {
  status: string;
  debater_a_id: string | null;
  debater_a_name: string;
  debater_b_id: string | null;
  debater_b_name: string;
  topic: string | null;
  ruleset: string | null;
  total_rounds?: number;
  language?: string;
}

export interface ModStatusResult {
  mod_status: string;
  mod_requested_by: string | null;
  moderator_id: string | null;
  moderator_display_name: string;
}
