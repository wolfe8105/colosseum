/**
 * Arsenal Shop — shared types
 * No imports from other home.arsenal-shop* files — keeps the dependency graph acyclic.
 */

import type { ModifierEffect, ModifierCategory, RarityTier } from '../modifiers.ts';

export type ProductType = 'modifier' | 'powerup';

export interface ShopState {
  catalog:        ModifierEffect[];
  productType:    ProductType;
  categoryFilter: ModifierCategory | 'all';
  rarityFilter:   RarityTier | 'all';
  timingFilter:   'all' | 'in_debate' | 'end_of_debate';
  affordableOnly: boolean;
  tokenBalance:   number;
}
