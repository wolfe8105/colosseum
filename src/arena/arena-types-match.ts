/**
 * Arena match-found handshake types.
 */

import type { DebateRole } from './arena-types.ts';

export interface MatchData {
  debate_id: string;
  topic?: string;
  role?: DebateRole;
  opponent_name?: string;
  opponent_id?: string | null;
  opponent_elo?: number;
  status?: string;
  ruleset?: string;
  total_rounds?: number;
  language?: string;
}

export interface MatchAcceptResponse {
  player_a_ready: boolean | null;
  player_b_ready: boolean | null;
  status: string;
}
