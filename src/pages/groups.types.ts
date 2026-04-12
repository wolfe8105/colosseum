/**
 * THE MODERATOR — Groups: shared type definitions
 *
 * Part of groups decomposition (7 files):
 *   groups.types.ts, groups.state.ts, groups.utils.ts,
 *   groups.feed.ts, groups.members.ts, groups.challenges.ts, groups.ts
 */

/** Group row as returned by discover / my-groups / leaderboard RPCs */
export interface GroupListItem {
  id: string;
  name: string;
  avatar_emoji?: string | null;
  description?: string | null;
  category?: string;
  member_count?: number | string;
  elo_rating?: number | string;
  role?: string | null;
  rank?: number | string | null;
  is_member?: boolean;
  my_role?: string | null;
}

/** Extended group detail returned by get_group_details (F-16/17/18 additions) */
export interface GroupDetail extends GroupListItem {
  slug?: string | null;
  owner_id?: string | null;
  is_public?: boolean;
  created_at?: string | null;
  join_mode?: 'open' | 'requirements' | 'audition' | 'invite_only';
  entry_requirements?: {
    min_elo?: number;
    min_tier?: string;
    require_profile_complete?: boolean;
  } | null;
  audition_config?: {
    rule?: string;
    locked_topic?: string | null;
    locked_category?: string | null;
    locked_ruleset?: string | null;
    locked_total_rounds?: number | null;
  } | null;
}

/** Member row as returned by get_group_members RPC */
export interface GroupMember {
  user_id: string;
  role: string;
  joined_at?: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  elo_rating?: number | string;
  wins?: number | string;
  losses?: number | string;
  level?: number | string;
}
