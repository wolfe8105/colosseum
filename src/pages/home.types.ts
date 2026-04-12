/** Shape of entries in the CATEGORIES array */
export interface Category {
  id: string;
  icon: string;
  label: string;
  section: string;
  count: string;
  hasLive: boolean;
}

export interface LiveDebate {
  id: string;
  topic: string;
  category: string;
  status: string;
  mode: string;
  spectator_count: number;
  current_round: number;
  max_rounds: number;
  debater_a_name?: string;
  debater_b_name?: string;
}
