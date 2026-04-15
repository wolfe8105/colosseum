/**
 * End-of-debate result types.
 */

export interface PowerUpEquipped {
  power_up_id: string;
  name: string;
  type: string;
  activated: boolean;
}

export interface RankedCheckResult {
  eligible: boolean;
  profile_pct: number;
}

export interface UpdateDebateResult {
  ranked?: boolean;
  winner?: string;
  elo_change_a?: number;
  elo_change_b?: number;
  vote_count_a?: number;
  vote_count_b?: number;
}

// F-57 Phase 3: end-of-debate modifier breakdown
// One entry per fired inventory effect (mirror/burn_notice/parasite/chain_reaction)
export type InventoryEffect =
  | { effect: 'mirror';         copied_effect_id: string;      from_ref_id: string; new_modifier_id: string }
  | { effect: 'burn_notice';    burned_effect_id: string;      from_ref_id: string }
  | { effect: 'parasite';       stolen_effect_id: string;      source: 'free_inventory' | 'socketed'; modifier_id: string; from_ref_id?: string }
  | { effect: 'chain_reaction'; regenerated_effect: string;    new_powerup_qty: number };

export interface EndOfDebateBreakdown {
  debater_a: { raw_score: number; adjustments: { effect_name: string; delta: number; source?: string }[]; final_score: number };
  debater_b: { raw_score: number; adjustments: { effect_name: string; delta: number; source?: string }[]; final_score: number };
  inventory_effects?: InventoryEffect[];
}

export interface ReferenceItem {
  id: string;
  ruling: string;
  ruling_reason?: string;
  submitter_name?: string;
  url?: string;
  description?: string;
  round?: number;
  supports_side?: string;
}
