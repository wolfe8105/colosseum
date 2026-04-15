/**
 * THE MODERATOR — Cosmetics Types and Constants
 */

export type Category =
  | 'badge' | 'title' | 'border'
  | 'entrance_animation' | 'reaction_effect' | 'profile_background';

export interface CosmeticItem {
  cosmetic_id: string;
  name: string;
  category: Category;
  tier: number | null;
  unlock_type: 'auto' | 'token' | 'depth';
  token_cost: number | null;
  depth_threshold: number | null;
  unlock_condition: string | null;
  asset_url: string | null;
  sort_order: number;
  owned: boolean;
  equipped: boolean;
  acquired_via: string | null;
  metadata: Record<string, unknown> | null;
}

export const TABS: { key: Category; label: string; icon: string }[] = [
  { key: 'badge',              label: 'Badges',      icon: '🏅' },
  { key: 'title',              label: 'Titles',      icon: '👑' },
  { key: 'border',             label: 'Borders',     icon: '⬡'  },
  { key: 'entrance_animation', label: 'Entrance',    icon: '⚡' },
  { key: 'reaction_effect',    label: 'Reactions',   icon: '🔥' },
  { key: 'profile_background', label: 'Backgrounds', icon: '🖼️' },
];

export const DEPTH_LABEL: Record<string, string> = {
  '0.1': '10%', '0.25': '25%', '0.35': '35%',
  '0.5': '50%', '0.6': '60%', '0.75': '75%',
  '0.9': '90%', '1': '100%',
};
