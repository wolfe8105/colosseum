/**
 * THE MODERATOR — F-57 Modifier & Power-Up System (Phase 1)
 * Session 267 | April 12, 2026
 *
 * Phase 1 scope: catalog, buy, socket, equip, inventory reads.
 * Phase 2 (next session): scoring integration in score_debate_comment.
 *
 * Depends on: auth.ts (safeRpc), config.ts (escapeHTML, showToast)
 */

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type ModifierTiming = 'end_of_debate' | 'in_debate';

export type ModifierCategory =
  | 'token' | 'point' | 'reference' | 'elo_xp' | 'crowd' | 'survival'
  | 'self_mult' | 'self_flat' | 'opponent_debuff' | 'cite_triggered'
  | 'conditional' | 'special';

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';

export interface ModifierEffect {
  id: string;
  effect_num: number;
  name: string;
  description: string;
  category: ModifierCategory;
  timing: ModifierTiming;
  tier_gate: RarityTier;
  mod_cost: number;
  pu_cost: number;
}

export interface OwnedModifier {
  modifier_id: string;
  effect_id: string;
  name: string;
  description: string;
  category: ModifierCategory;
  timing: ModifierTiming;
  tier_gate: RarityTier;
  acquired_at: string;
  acquisition_type: 'purchase' | 'drop' | 'reward';
}

export interface PowerUpStock {
  effect_id: string;
  name: string;
  description: string;
  category: ModifierCategory;
  timing: ModifierTiming;
  tier_gate: RarityTier;
  quantity: number;
  pu_cost: number;
}

export interface EquippedLoadoutEntry {
  effect_id: string;
  name: string;
  description: string;
  category: ModifierCategory;
  timing: ModifierTiming;
  consumed: boolean;
  equipped_at: string;
}

export interface UserInventory {
  unsocketed_modifiers: OwnedModifier[];
  powerup_stock: PowerUpStock[];
  equipped_loadout: EquippedLoadoutEntry[];
}
