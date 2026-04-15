/**
 * Arsenal Shop — Event wiring
 * Mutates state on filter interactions; delegates bottom-sheet open to sheet module.
 */

import type { ModifierEffect, ModifierCategory, RarityTier } from '../modifiers.ts';
import type { ShopState } from './home.arsenal-shop-types.ts';
import { openBottomSheet } from './home.arsenal-shop-sheet.ts';

type ProductType = 'modifier' | 'powerup';

/**
 * Wire all interactive elements in the rendered shop container.
 * @param onStateChange  Called after any state mutation — triggers re-render in the orchestrator.
 * @param onSheetOpen    Called with the sheet cleanup fn so the orchestrator can track _sheetCleanup.
 */
export function wireShopEvents(
  container: HTMLElement,
  state: ShopState,
  onStateChange: () => void,
  onSheetOpen: (cleanup: () => void) => void,
): void {

  // Product type toggle
  container.querySelectorAll<HTMLButtonElement>('[data-product]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.productType = btn.dataset.product as ProductType;
      onStateChange();
    });
  });

  // Category chips
  container.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.categoryFilter = btn.dataset.cat as ModifierCategory | 'all';
      onStateChange();
    });
  });

  // Rarity chips
  container.querySelectorAll<HTMLButtonElement>('[data-rarity]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.rarityFilter = btn.dataset.rarity as RarityTier | 'all';
      onStateChange();
    });
  });

  // Timing chips (toggle — click active chip to deselect back to 'all')
  container.querySelectorAll<HTMLButtonElement>('[data-timing]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.timing as 'in_debate' | 'end_of_debate';
      state.timingFilter = state.timingFilter === t ? 'all' : t;
      onStateChange();
    });
  });

  // Afford toggle
  const affordBtn = container.querySelector<HTMLButtonElement>('[data-afford]');
  if (affordBtn) {
    affordBtn.addEventListener('click', () => {
      state.affordableOnly = !state.affordableOnly;
      onStateChange();
    });
  }

  // Card tap → bottom sheet
  container.querySelectorAll<HTMLElement>('.mod-effect-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.mod-buy-btn')) return;
      const effectId = card.dataset.effectId;
      if (!effectId) return;
      const effect = state.catalog.find((ef: ModifierEffect) => ef.id === effectId);
      if (!effect) return;
      onSheetOpen(openBottomSheet(effect, state, onStateChange));
    });
  });

  // LANDMINE [LM-SHOP-002]: Comment says "bypasses sheet" but handler calls openBottomSheet —
  // identical to the card tap path. Comment is factually wrong.
  // Handler is declared `async` but never awaits anything — dead async keyword.
  // Buy button (direct tap, bypasses sheet)
  container.querySelectorAll<HTMLButtonElement>('.mod-buy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const effectId = btn.dataset.effectId;
      if (!effectId) return;
      const effect = state.catalog.find((ef: ModifierEffect) => ef.id === effectId);
      if (!effect) return;
      onSheetOpen(openBottomSheet(effect, state, onStateChange));
    });
  });
}
