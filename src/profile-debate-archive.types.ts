/**
 * THE MODERATOR — Profile Debate Archive Types
 */

export interface ArchiveEntry {
  entry_id:          string;
  debate_id:         string;
  custom_name:       string | null;
  custom_desc:       string | null;
  hide_from_public:  boolean;
  entry_created_at:  string;
  topic:             string | null;
  category:          string | null;
  debate_created_at: string;
  opponent_id:       string | null;
  opponent_name:     string | null;
  opponent_username: string | null;
  my_side:           string;
  winner:            string | null;
  my_score:          number | null;
  opp_score:         number | null;
  is_win:            boolean;
  debate_mode:       string | null;
}

export interface RecentDebate {
  debate_id:         string;
  topic:             string | null;
  category:          string | null;
  debate_created_at: string;
  opponent_name:     string | null;
  opponent_username: string | null;
  my_score:          number | null;
  opp_score:         number | null;
  is_win:            boolean;
  debate_mode:       string | null;
}
