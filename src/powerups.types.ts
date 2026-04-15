/**
 * THE MODERATOR — Power-Up Types and Catalog
 */

export type PowerUpId = 'multiplier_2x' | 'silence' | 'shield' | 'reveal';

export interface PowerUpCatalogEntry {
  readonly name: string;
  readonly icon: string;
  readonly cost: number;
  readonly desc: string;
}

export interface PowerUpResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface InventoryItem {
  power_up_id: string;
  name?: string;
  icon?: string;
  quantity: number;
  [key: string]: unknown;
}

export interface EquippedItem {
  power_up_id: string;
  slot_number: number;
  name?: string;
  icon?: string;
  activated?: boolean;
  activated_at?: string | null;
  [key: string]: unknown;
}

export interface MyPowerUpsResult {
  success: boolean;
  inventory: InventoryItem[];
  equipped: EquippedItem[];
  questions_answered: number;
}

export interface ActivationCallbacks {
  onSilence?: () => void;
  onShield?: () => void;
  onReveal?: () => void;
}

export const CATALOG: Readonly<Record<PowerUpId, PowerUpCatalogEntry>> = {
  multiplier_2x: { name: '2x Multiplier', icon: '⚡', cost: 15, desc: 'Double your staking payout if you win' },
  silence:       { name: 'Silence',        icon: '🤫', cost: 20, desc: 'Mute opponent for 10 seconds' },
  shield:        { name: 'Shield',         icon: '🛡️', cost: 25, desc: 'Block one reference challenge' },
  reveal:        { name: 'Reveal',         icon: '👁️', cost: 10, desc: "See opponent's equipped power-ups" },
} as const;
