/**
 * auto-debate.types.ts — Auto-Debate page type definitions
 * Extracted from auto-debate.ts (Session 254 track).
 */

export interface AutoDebateRound {
  round: number;
  sideA?: string;
  side_a?: string;
  sideB?: string;
  side_b?: string;
}

export interface AutoDebateData {
  id: string;
  topic: string;
  description?: string;
  side_a_label: string;
  side_b_label: string;
  side_a?: string;
  side_b?: string;
  winner: 'a' | 'b';
  score_a: number;
  score_b: number;
  margin: string;
  category: string;
  rounds: string | AutoDebateRound[];
  judge_reasoning?: string;
  share_hook?: string;
  votes_a: number;
  votes_b: number;
  vote_count: number;
  yes_votes?: number;
  no_votes?: number;
  is_auto?: boolean;
}
