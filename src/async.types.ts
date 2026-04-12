/**
 * THE MODERATOR — Async Module: Type Definitions
 *
 * All shared interfaces and types for the async subsystem.
 * No imports needed — pure type declarations.
 */

export interface HotTake {
  id: string;
  user_id: string;
  username?: string;
  user: string;
  elo: number;
  tokens?: number;
  text: string;
  section: string;
  reactions: number;
  challenges: number;
  time: string;
  userReacted: boolean;
  verified_gladiator?: boolean;
}

export interface Prediction {
  debate_id: string;
  topic: string;
  p1: string;
  p2: string;
  p1_elo: number;
  p2_elo: number;
  total: number;
  pct_a: number;
  pct_b: number;
  user_pick: 'a' | 'b' | null;
  status: string;
}

export interface StandaloneQuestion {
  id: string;
  topic: string;
  side_a_label: string;
  side_b_label: string;
  category: string | null;
  picks_a: number;
  picks_b: number;
  total_picks?: number;
  creator_display_name?: string;
  creator_username?: string;
  _userPick?: 'a' | 'b' | null;
}

export interface RivalEntry {
  id: string;
  rival_id: string;
  rival_username?: string;
  rival_display_name?: string;
  rival_elo?: number;
  rival_wins?: number;
  rival_losses?: number;
  status: 'pending' | 'active';
  direction: 'sent' | 'received';
}

export interface ReactResult {
  reaction_count: number;
  reacted: boolean;
}

export interface CreateHotTakeResult {
  id: string;
}

export type CategoryFilter =
  | 'all'
  | 'politics'
  | 'sports'
  | 'entertainment'
  | 'trending'
  | 'technology'
  | string;
