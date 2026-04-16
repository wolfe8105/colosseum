/**
 * tournaments.types.ts — Tournament type definitions
 *
 * Extracted from tournaments.ts (Session 254 track).
 */

export interface Tournament {
  id: string;
  title: string;
  category: string;
  entry_fee: number;
  prize_pool: number;
  player_count: number;
  max_players: number;
  starts_at: string;
  status: 'registration' | 'locked' | 'active' | 'completed' | 'cancelled';
  is_entered: boolean;
}

export interface TournamentMatch {
  match_id: string;
  tournament_id: string;
  tournament_title: string;
  round: number;
  opponent_id: string;
  opponent_name: string;
  prize_pool: number;
  forfeit_at: string | null;
}

export interface BracketMatch {
  match_id: string;
  round: number;
  match_slot: number;
  player_a_id: string | null;
  player_a_name: string | null;
  player_b_id: string | null;
  player_b_name: string | null;
  winner_id: string | null;
  is_bye: boolean;
  status: string;
  debate_id: string | null;
}
