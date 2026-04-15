/**
 * Arsenal Shop — Bottom-sheet confirm flow
 */

import type { ModifierEffect, RarityTier } from '../modifiers.ts';
import type { ShopState } from './home.arsenal-shop-types.ts';
import { handleBuyModifier, handleBuyPowerup } from '../modifiers-handlers.ts';
import { tierLabel, categoryLabel } from '../modifiers-render.ts';
import { escapeHTML } from '../config.ts';

type ProductType = 'modifier' | 'powerup';

// LANDMINE [LM-SHOP-005]: duplicates rarityClass exported from modifiers.ts — import instead.
// Inline helper to avoid re-importing (mirrors modifiers.ts rarityClass)
function rarityClass(tier: RarityTier): string {
  const map: Record<RarityTier, string> = {
    common: 'common', uncommon: 'uncommon', rare: 'rare',
    legendary: 'legendary', mythic: 'mythic',
  };
  return map[tier] ?? 'common';
}

/**
 * Opens the purchase bottom sheet for a given effect.
 * Returns a cleanup function that removes the overlay.
 */
export function openBottomSheet(
  effect: ModifierEffect,
  state: ShopState,
  onBuySuccess: () => void,
): () => void {
  const cost = state.productType === 'modifier' ? effect.mod_cost : effect.pu_cost;
  const productLabel = state.productType === 'modifier' ? 'Modifier' : 'Power-Up';
  const socketNote = state.productType === 'modifier'
    ? `<p class="sheet-socket-note">🔌 Socketable into <strong>${tierLabel(effect.tier_gate)}</strong> references and higher.<br>Socketing is permanent and cannot be undone.</p>`
    : `<p class="sheet-socket-note">⚡ One-shot consumable. Equip pre-debate (max 3 per debate). Consumed on debate start.</p>`;

  const canAfford = state.tokenBalance >= cost;

  const overlay = document.createElement('div');
  overlay.className = 'bottom-sheet-overlay';
  overlay.innerHTML = `
    <div class="bottom-sheet" role="dialog" aria-modal="true">
      <div class="sheet-handle"></div>
      <div class="sheet-title">${escapeHTML(effect.name)}</div>

      <div class="sheet-badges">
        <span class="mod-rarity-badge mod-rarity-badge--${rarityClass(effect.tier_gate)}">${tierLabel(effect.tier_gate)}</span>
        <span class="mod-timing-badge mod-timing-badge--${effect.timing === 'in_debate' ? 'live' : 'post'}">
          ${effect.timing === 'in_debate' ? 'In-Debate' : 'Post-Match'}
        </span>
        <span class="mod-category-tag">${categoryLabel(effect.category)}</span>
      </div>

      <p class="sheet-desc">${escapeHTML(effect.description)}</p>

      ${socketNote}

      <div class="sheet-cost-row">
        <span class="sheet-cost-label">Cost</span>
        <span class="sheet-cost-val ${canAfford ? '' : 'sheet-cost-val--broke'}">
          🪙 ${cost} tokens
        </span>
      </div>

      ${!canAfford ? '<p class="sheet-broke-note">Not enough tokens. Win debates to earn more.</p>' : ''}

      <button class="sheet-confirm-btn ${canAfford ? '' : 'disabled'}"
              id="sheet-confirm"
              ${canAfford ? '' : 'disabled'}
              data-effect-id="${escapeHTML(effect.id)}"
              data-product="${state.productType}">
        Buy ${productLabel} · ${cost} tokens
      </button>

      <button class="sheet-cancel-btn" id="sheet-cancel">Cancel</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = (): void => { overlay.remove(); };

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#sheet-cancel')?.addEventListener('click', close);

  const confirmBtn = overlay.querySelector<HTMLButtonElement>('#sheet-confirm');
  if (confirmBtn && canAfford) {
    // LANDMINE [LM-SHOP-003]: confirm button disabled before async with no finally block.
    // On rejection, close() is never reached — sheet stays open, button permanently stuck.
    // Fix requires try/finally around the await. Fifth instance of disable-button-no-finally (M-F1).
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Purchasing…';

      const productType = confirmBtn.dataset.product as ProductType;
      let ok = false;
      if (productType === 'modifier') {
        ok = await handleBuyModifier(effect.id, effect.name);
      } else {
        ok = await handleBuyPowerup(effect.id, effect.name);
      }

      close();
      if (ok) onBuySuccess();
    });
  }

  return close;
}
