/**
 * THE MODERATOR — Token Types
 */

export type MilestoneKey =
  | 'first_hot_take' | 'first_debate' | 'first_vote' | 'first_reaction'
  | 'first_ai_sparring' | 'first_prediction'
  | 'profile_3_sections' | 'profile_6_sections' | 'profile_12_sections'
  | 'verified_gladiator' | 'streak_7' | 'streak_30' | 'streak_100';

export interface MilestoneDefinition {
  readonly tokens: number;
  readonly label: string;
  readonly icon: string;
  readonly freezes?: number;
}

export interface ClaimResult {
  success: boolean;
  error?: string;
  tokens_earned?: number;
  new_balance?: number;
  freezes_earned?: number;
  is_winner?: boolean;
  upset_bonus?: number;
  freeze_used?: boolean;
  streak_bonus?: number;
  login_streak?: number;
  token_balance?: number;
  fate_bonus?: number;
  fate_pct?: number;
}

export interface MilestoneListItem extends MilestoneDefinition {
  key: string;
  claimed: boolean;
}

export interface TokenSummary {
  success: boolean;
  token_balance?: number;
  [key: string]: unknown;
}
