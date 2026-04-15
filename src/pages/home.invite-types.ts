/**
 * Home — Invite Rewards shared types
 * No imports from other home.invite* files — keeps the dependency graph acyclic.
 */

export interface InviteReward {
  id: string;
  milestone: number;
  reward_type: 'legendary_powerup' | 'mythic_powerup' | 'mythic_modifier';
  pending_review: boolean;
  awarded_at: string;
}

export interface ActivityEntry {
  status: string;
  username: string | null;
  event_at: string;
}

export interface InviteStats {
  ref_code: string | null;
  invite_url: string | null;
  total_clicks: number;
  total_signups: number;
  total_converts: number;
  next_milestone: number;
  unclaimed_rewards: InviteReward[];
  activity: ActivityEntry[];
}
