/**
 * Private lobby / challenge types.
 */

export interface PrivateLobbyResult {
  debate_id: string;
  join_code: string | null;
}

export interface PendingChallenge {
  debate_id: string;
  mode: string;
  topic: string | null;
  ranked: boolean;
  challenger_name: string;
  challenger_id: string;
  challenger_elo: number;
  created_at: string;
}

export interface CheckPrivateLobbyResult {
  status: string;
  opponent_id: string | null;
  opponent_name: string | null;
  opponent_elo: number | null;
  player_b_ready: boolean | null;
  total_rounds?: number;
  language?: string;
}

export interface JoinPrivateLobbyResult {
  debate_id: string;
  status: string;
  topic: string | null;
  mode: string;
  opponent_name: string;
  opponent_id: string;
  opponent_elo: number;
  ruleset?: string;
  total_rounds?: number;
  language?: string;
}
