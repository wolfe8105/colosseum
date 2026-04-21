/**
 * Arsenal Shop — HTML render
 * Builds shop HTML from state; delegates event wiring.
 */

import type { ModifierCategory, RarityTier } from '../modifiers.ts';
import type { ShopState } from './home.arsenal-shop-types.ts';
import { renderEffectCard } from '../modifiers-render.ts';
import { escapeHTML } from '../config.ts';
import { applyFilters } from './home.arsenal-shop-filters.ts';
import { wireShopEvents } from './home.arsenal-shop-wiring.ts';

const CATEGORIES: Array<{ value: ModifierCategory | 'all'; label: string }> = [
  { value: 'all',             label: 'All' },
  { value: 'point',           label: 'Point' },
  { value: 'token',           label: 'Token' },
  { value: 'reference',       label: 'Reference' },
  { value: 'elo_xp',          label: 'Elo+XP' },
  { value: 'survival',        label: 'Survival' },
  { value: 'self_mult',       label: 'Multiplier' },
  { value: 'opponent_debuff', label: 'Debuff' },
  { value: 'conditional',     label: 'Conditional' },
  { value: 'special',         label: 'Special' },
];

const RARITIES: Array<{ value: RarityTier | 'all'; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'common',    label: 'Common' },
  { value: 'uncommon',  label: 'Uncommon' },
  { value: 'rare',      label: 'Rare' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'mythic',    label: 'Mythic' },
];

export function renderShop(
  container: HTMLElement,
  state: ShopState,
  onRerender: () => void,
  onSheetOpen: (cleanup: () => void) => void,
): void {
  const filtered = applyFilters(state.catalog, state);

  container.innerHTML = `
    <div class="shop-wrap">

      <!-- Product toggle -->
      <div class="shop-toggle-row">
        <button class="shop-toggle-btn ${state.productType === 'powerup'  ? 'active' : ''}"
                data-product="powerup">⚡ Power-Ups</button>
        <button class="shop-toggle-btn ${state.productType === 'modifier' ? 'active' : ''}"
                data-product="modifier">🔮 Modifiers</button>
      </div>

      <!-- Token balance pill -->
      <div class="shop-balance-pill">
        <span class="shop-balance-pill__icon">🪙</span>
        <span class="shop-balance-pill__val" id="shop-balance-display">${Number(state.tokenBalance)}</span>
        <span class="shop-balance-pill__lbl">tokens</span>
      </div>

      <!-- Filter row 1: category chips -->
      <div class="shop-filter-row" id="shop-cat-chips">
        ${CATEGORIES.map(c => `
          <button class="shop-chip ${state.categoryFilter === c.value ? 'active' : ''}"
                  data-cat="${escapeHTML(c.value)}">${escapeHTML(c.label)}</button>
        `).join('')}
      </div>

      <!-- Filter row 2: rarity + timing chips + afford toggle -->
      <div class="shop-filter-row" id="shop-rarity-chips">
        ${RARITIES.map(r => `
          <button class="shop-chip ${state.rarityFilter === r.value ? 'active' : ''}"
                  data-rarity="${escapeHTML(r.value)}">${escapeHTML(r.label)}</button>
        `).join('')}
        <button class="shop-chip shop-chip--timing ${state.timingFilter === 'in_debate'     ? 'active' : ''}"
                data-timing="in_debate">In-Debate</button>
        <button class="shop-chip shop-chip--timing ${state.timingFilter === 'end_of_debate' ? 'active' : ''}"
                data-timing="end_of_debate">Post-Match</button>
        <button class="shop-chip shop-chip--afford ${state.affordableOnly ? 'active' : ''}"
                data-afford="1">Can Afford</button>
      </div>

      <!-- Result count -->
      <div class="shop-result-count">${filtered.length} effect${filtered.length !== 1 ? 's' : ''}</div>

      <!-- Card grid -->
      <div class="shop-card-grid" id="shop-card-grid">
        ${filtered.length === 0
          ? '<div class="shop-empty">No effects match your filters.</div>'
          : filtered.map(e => renderEffectCard(e, {
              showModButton: state.productType === 'modifier',
              showPuButton:  state.productType === 'powerup',
            })).join('')
        }
      </div>

    </div>
  `;

  wireShopEvents(container, state, onRerender, onSheetOpen);
}
