/**
 * Arena lobby feed list item types.
 */

export interface ArenaFeedItem {
  id: string;
  topic?: string;
  status: string;
  source?: string;
  vote_count_a?: number;
  vote_count_b?: number;
  score_a?: number | null;
  score_b?: number | null;
  debater_a_name?: string;
  debater_b_name?: string;
  ruleset?: string;
  total_rounds?: number;
}

export interface AutoDebateItem {
  id: string;
  topic: string;
  side_a_label: string;
  side_b_label: string;
  score_a: number;
  score_b: number;
  status: string;
  created_at: string;
}
