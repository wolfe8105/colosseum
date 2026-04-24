/**
 * THE MODERATOR — Notification Types and Constants
 */

export type NotificationType =
  | 'challenge' | 'debate_start' | 'result' | 'rank_up'
  | 'follow' | 'follow_online' | 'follow_debate'
  | 'reaction' | 'system' | 'stake_won' | 'stake_lost'
  | 'power_up' | 'tier_up'
  | 'mod_invite' | 'mod_declined' | 'mod_accepted' | 'challenged';

export interface NotificationTypeInfo { readonly icon: string; readonly label: string; }

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time?: string;
  created_at?: string;
  read: boolean;
  user_id?: string;
  data?: Record<string, unknown>;
}

export type NotificationFilter = 'all' | 'challenge' | 'result' | 'reaction' | 'economy';

export const TYPES: Readonly<Record<NotificationType, NotificationTypeInfo>> = {
  challenge:     { icon: '⚔️',  label: 'Challenge' },
  debate_start:  { icon: '🔴',  label: 'Debate Starting' },
  result:        { icon: '🏆',  label: 'Result' },
  rank_up:       { icon: '📈',  label: 'Rank Up' },
  follow:        { icon: '👤',  label: 'New Follower' },
  follow_online: { icon: '🟢',  label: 'Online Now' },
  follow_debate: { icon: '📋',  label: 'New Debate' },
  reaction:      { icon: '🔥',  label: 'Reaction' },
  system:        { icon: '📢',  label: 'System' },
  stake_won:     { icon: '🪙',  label: 'Stake Won' },
  stake_lost:    { icon: '💸',  label: 'Stake Lost' },
  power_up:      { icon: '⚡',  label: 'Power-Up' },
  tier_up:       { icon: '🏅',  label: 'Tier Up' },
  mod_invite:    { icon: '⚖️',  label: 'Mod Invite' },
  mod_declined:  { icon: '❌',  label: 'Mod Declined' },
  mod_accepted:  { icon: '✅',  label: 'Mod Accepted' },
  challenged:    { icon: '⚔️',  label: 'Challenged' },
} as const;

export const ECONOMY_TYPES: ReadonlySet<NotificationType> = new Set([
  'stake_won', 'stake_lost', 'power_up', 'tier_up',
]);
