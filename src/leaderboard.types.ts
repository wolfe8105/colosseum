/**
 * THE MODERATOR — Leaderboard Types
 */

export type LeaderboardTab = 'elo' | 'wins' | 'streak';
export type LeaderboardTimeFilter = 'all' | 'week' | 'month';
export type LeaderboardTier = 'free' | 'contender' | 'champion' | 'creator';

export interface LeaderboardEntry {
  rank: number;
  id?: string;
  username?: string;
  user: string;
  elo: number;
  wins: number;
  losses: number;
  streak: number;
  level: number;
  tier: LeaderboardTier | string;
  debates?: number;
  verified_gladiator?: boolean;
}

export interface LeaderboardRpcRow {
  id: string;
  username: string | null;
  display_name: string | null;
  elo_rating: number;
  wins: number;
  losses: number;
  current_streak: number;
  level: number;
  subscription_tier: string | null;
  debates_completed: number;
  verified_gladiator?: boolean;
}
