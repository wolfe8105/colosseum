/**
 * THE MODERATOR — Auth Type Definitions
 *
 * Pure types — no runtime code, no imports needed.
 * All auth sub-modules import from here.
 */

import type { User, Session } from '@supabase/supabase-js';

/** Supabase RPC result shape — matches what supabase.rpc() actually returns */
export interface SafeRpcResult<T = unknown> {
  data: T | null;
  error: { message: string; code?: string; status?: number } | null;
}

/** Auth operation result — success or failure with error message */
export interface AuthResult<T = Record<string, unknown>> {
  success: boolean;
  placeholder?: boolean;
  error?: string;
  user?: User;
  session?: Session | null;
  url?: string;
  data?: T;
  count?: number;
}

/** Profile row from the profiles table */
export interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  elo_rating: number;
  token_balance: number;
  level: number;
  xp: number;
  streak_freezes: number;
  questions_answered: number;
  wins: number;
  losses: number;
  draws: number;
  current_streak: number;
  debates_completed: number;
  subscription_tier: string;
  profile_depth_pct: number;
  trust_score: number;
  is_minor: boolean;
  is_moderator: boolean;
  mod_available: boolean;
  mod_rating: number;
  mod_debates_total: number;
  mod_rulings_total: number;
  mod_approval_pct: number;
  created_at: string;
  updated_at?: string;
  /** Profile may have additional columns not listed here */
  [key: string]: unknown;
}

/** Public profile returned by get_public_profile RPC */
export interface PublicProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  elo_rating: number;
  wins: number;
  losses: number;
  current_streak: number;
  level: number;
  debates_completed: number;
  followers: number;
  following: number;
  is_following: boolean;
  subscription_tier: string;
  created_at: string;
  is_private?: boolean;
  verified_gladiator?: boolean;
  error?: string;
}

/** Follow data row with joined profile */
export interface FollowRow {
  follower_id?: string;
  following_id?: string;
  profiles?: Array<{
    username: string | null;
    display_name: string | null;
    elo_rating: number;
  }>;
}

/** Moderator data for available moderators list */
export interface ModeratorInfo {
  id: string;
  display_name: string | null;
  mod_rating: number;
  mod_debates_total: number;
  mod_approval_pct: number;
}

/** Reference/evidence row */
export interface DebateReference {
  id: string;
  debate_id: string;
  content: string | null;
  reference_type: string | null;
  supports_side: string | null;
  ruling: string | null;
  [key: string]: unknown;
}

/** Rival data */
export interface RivalData {
  id: string;
  target_id: string;
  message: string | null;
  status: string;
  [key: string]: unknown;
}

/** Profile update fields — only safe client-writable fields */
export interface ProfileUpdate {
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  username?: string | null;
  preferred_language?: string | null;
  is_private?: boolean | null;
}

/** Auth state change listener */
export type AuthListener = (user: User | null, profile: Profile | null) => void;

/** Sign-up parameters */
export interface SignUpParams {
  email: string;
  password: string;
  username: string;
  displayName: string;
  dob: string;
}

/** Log-in parameters */
export interface LogInParams {
  email: string;
  password: string;
}
