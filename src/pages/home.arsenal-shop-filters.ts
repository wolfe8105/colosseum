/**
 * Arsenal Shop — Filter logic
 * Pure function: no module state, no DOM access.
 */

import type { ModifierEffect } from '../modifiers.ts';
import type { ShopState } from './home.arsenal-shop-types.ts';

export function applyFilters(catalog: ModifierEffect[], state: ShopState): ModifierEffect[] {
  return catalog.filter(e => {
    if (state.categoryFilter !== 'all' && e.category  !== state.categoryFilter) return false;
    if (state.rarityFilter   !== 'all' && e.tier_gate !== state.rarityFilter)   return false;
    if (state.timingFilter   !== 'all' && e.timing    !== state.timingFilter)   return false;
    if (state.affordableOnly) {
      const cost = state.productType === 'modifier' ? e.mod_cost : e.pu_cost;
      if (cost > state.tokenBalance) return false;
    }
    return true;
  });
}
