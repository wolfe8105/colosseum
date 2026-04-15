/**
 * Home — Arsenal "Shop" tab
 * F-10 Power-Up Shop | Session 268 | April 12, 2026
 *
 * Renders the modifier/power-up catalog inside the Arsenal "Shop" tab.
 * Depends on: modifiers.ts (all catalog + buy helpers), auth.ts (safeRpc),
 *             config.ts (escapeHTML, showToast)
 *
 * Layout:
 *   [Modifiers | Power-Ups] toggle
 *   [Category chips] [Rarity chips] [Can Afford toggle]
 *   Scrollable card grid
 *   Bottom sheet confirm on card tap
 */

import type { ModifierEffect, ModifierCategory, RarityTier } from '../modifiers.ts';
import { getModifierCatalog } from '../modifiers-catalog.ts';
import { getUserInventory } from '../modifiers-rpc.ts';
import { renderEffectCard, tierLabel, categoryLabel } from '../modifiers-render.ts';
import { handleBuyModifier, handleBuyPowerup } from '../modifiers-handlers.ts';
import { escapeHTML, showToast } from '../config.ts';

// ── Types ──────────────────────────────────────────────────

type ProductType = 'modifier' | 'powerup';

interface ShopState {
  catalog: ModifierEffect[];
  productType: ProductType;
  categoryFilter: ModifierCategory | 'all';
  rarityFilter: RarityTier | 'all';
  timingFilter: 'all' | 'in_debate' | 'end_of_debate';
  affordableOnly: boolean;
  tokenBalance: number;
}

// ── Module-level state ─────────────────────────────────────

let _state: ShopState = {
  catalog: [],
  productType: 'powerup',
  categoryFilter: 'all',
  rarityFilter: 'all',
  timingFilter: 'all',
  affordableOnly: false,
  tokenBalance: 0,
};

let _container: HTMLElement | null = null;
let _sheetCleanup: (() => void) | null = null;

// ── Category labels for chips ──────────────────────────────

const CATEGORIES: Array<{ value: ModifierCategory | 'all'; label: string }> = [
  { value: 'all',      label: 'All' },
  { value: 'point',    label: 'Point' },
  { value: 'token',    label: 'Token' },
  { value: 'reference', label: 'Reference' },
  { value: 'elo_xp',  label: 'Elo+XP' },
  { value: 'survival', label: 'Survival' },
  { value: 'self_mult', label: 'Multiplier' },
  { value: 'opponent_debuff', label: 'Debuff' },
  { value: 'conditional', label: 'Conditional' },
  { value: 'special',  label: 'Special' },
];

const RARITIES: Array<{ value: RarityTier | 'all'; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'common',    label: 'Common' },
  { value: 'uncommon',  label: 'Uncommon' },
  { value: 'rare',      label: 'Rare' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'mythic',    label: 'Mythic' },
];

// ── Entry point ────────────────────────────────────────────

export async function loadShopScreen(container: HTMLElement): Promise<void> {
  _container = container;
  if (_sheetCleanup) { _sheetCleanup(); _sheetCleanup = null; }

  container.innerHTML = '<div class="shop-loading">Loading catalog…</div>';

  // Fetch catalog + token balance in parallel
  const [catalog, inventory] = await Promise.all([
    getModifierCatalog(),
    getUserInventory(),
  ]);

  _state.catalog = catalog;
  _state.tokenBalance = inventory?.powerup_stock != null
    ? _readTokenBalance()
    : _readTokenBalance();

  render(container);
}

// Read live token balance from the DOM (already kept up to date by home.ts)
function _readTokenBalance(): number {
  const el = document.querySelector<HTMLElement>('[data-token-balance]');
  return el ? parseInt(el.textContent ?? '0', 10) || 0 : 0;
}

// ── Render ─────────────────────────────────────────────────

function render(container: HTMLElement): void {
  _state.tokenBalance = _readTokenBalance();
  const filtered = applyFilters(_state.catalog);

  container.innerHTML = `
    <div class="shop-wrap">

      <!-- Product toggle -->
      <div class="shop-toggle-row">
        <button class="shop-toggle-btn ${_state.productType === 'powerup' ? 'active' : ''}"
                data-product="powerup">⚡ Power-Ups</button>
        <button class="shop-toggle-btn ${_state.productType === 'modifier' ? 'active' : ''}"
                data-product="modifier">🔮 Modifiers</button>
      </div>

      <!-- Token balance pill -->
      <div class="shop-balance-pill">
        <span class="shop-balance-pill__icon">🪙</span>
        <span class="shop-balance-pill__val" id="shop-balance-display">${_state.tokenBalance}</span>
        <span class="shop-balance-pill__lbl">tokens</span>
      </div>

      <!-- Filter row 1: category chips -->
      <div class="shop-filter-row" id="shop-cat-chips">
        ${CATEGORIES.map(c => `
          <button class="shop-chip ${_state.categoryFilter === c.value ? 'active' : ''}"
                  data-cat="${escapeHTML(c.value)}">${escapeHTML(c.label)}</button>
        `).join('')}
      </div>

      <!-- Filter row 2: rarity + timing chips + afford toggle -->
      <div class="shop-filter-row" id="shop-rarity-chips">
        ${RARITIES.map(r => `
          <button class="shop-chip ${_state.rarityFilter === r.value ? 'active' : ''}"
                  data-rarity="${escapeHTML(r.value)}">${escapeHTML(r.label)}</button>
        `).join('')}
        <button class="shop-chip shop-chip--timing ${_state.timingFilter === 'in_debate' ? 'active' : ''}"
                data-timing="in_debate">In-Debate</button>
        <button class="shop-chip shop-chip--timing ${_state.timingFilter === 'end_of_debate' ? 'active' : ''}"
                data-timing="end_of_debate">Post-Match</button>
        <button class="shop-chip shop-chip--afford ${_state.affordableOnly ? 'active' : ''}"
                data-afford="1">Can Afford</button>
      </div>

      <!-- Result count -->
      <div class="shop-result-count">${filtered.length} effect${filtered.length !== 1 ? 's' : ''}</div>

      <!-- Card grid -->
      <div class="shop-card-grid" id="shop-card-grid">
        ${filtered.length === 0
          ? '<div class="shop-empty">No effects match your filters.</div>'
          : filtered.map(e => renderEffectCard(e, {
              showModButton: _state.productType === 'modifier',
              showPuButton:  _state.productType === 'powerup',
            })).join('')
        }
      </div>

    </div>
  `;

  wireEvents(container);
}

// ── Filtering ──────────────────────────────────────────────

function applyFilters(catalog: ModifierEffect[]): ModifierEffect[] {
  return catalog.filter(e => {
    if (_state.categoryFilter !== 'all' && e.category !== _state.categoryFilter) return false;
    if (_state.rarityFilter !== 'all' && e.tier_gate !== _state.rarityFilter) return false;
    if (_state.timingFilter !== 'all' && e.timing !== _state.timingFilter) return false;
    if (_state.affordableOnly) {
      const cost = _state.productType === 'modifier' ? e.mod_cost : e.pu_cost;
      if (cost > _state.tokenBalance) return false;
    }
    return true;
  });
}

// ── Event wiring ───────────────────────────────────────────

function wireEvents(container: HTMLElement): void {

  // Product type toggle
  container.querySelectorAll<HTMLButtonElement>('[data-product]').forEach(btn => {
    btn.addEventListener('click', () => {
      _state.productType = btn.dataset.product as ProductType;
      render(container);
    });
  });

  // Category chips
  container.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      _state.categoryFilter = btn.dataset.cat as ModifierCategory | 'all';
      render(container);
    });
  });

  // Rarity chips
  container.querySelectorAll<HTMLButtonElement>('[data-rarity]').forEach(btn => {
    btn.addEventListener('click', () => {
      _state.rarityFilter = btn.dataset.rarity as RarityTier | 'all';
      render(container);
    });
  });

  // Timing chips (toggle — click active to deselect back to 'all')
  container.querySelectorAll<HTMLButtonElement>('[data-timing]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.timing as 'in_debate' | 'end_of_debate';
      _state.timingFilter = _state.timingFilter === t ? 'all' : t;
      render(container);
    });
  });

  // Afford toggle
  const affordBtn = container.querySelector<HTMLButtonElement>('[data-afford]');
  if (affordBtn) {
    affordBtn.addEventListener('click', () => {
      _state.affordableOnly = !_state.affordableOnly;
      render(container);
    });
  }

  // Card tap → bottom sheet
  container.querySelectorAll<HTMLElement>('.mod-effect-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't open sheet if user tapped the buy button directly
      if ((e.target as HTMLElement).closest('.mod-buy-btn')) return;
      const effectId = card.dataset.effectId;
      if (!effectId) return;
      const effect = _state.catalog.find(ef => ef.id === effectId);
      if (!effect) return;
      openBottomSheet(effect);
    });
  });

  // Buy button (direct tap, bypasses sheet)
  container.querySelectorAll<HTMLButtonElement>('.mod-buy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const effectId = btn.dataset.effectId;
      if (!effectId) return;
      const effect = _state.catalog.find(ef => ef.id === effectId);
      if (!effect) return;
      openBottomSheet(effect);
    });
  });
}

// ── Bottom sheet ───────────────────────────────────────────

function openBottomSheet(effect: ModifierEffect): void {
  if (_sheetCleanup) { _sheetCleanup(); _sheetCleanup = null; }

  const cost = _state.productType === 'modifier' ? effect.mod_cost : effect.pu_cost;
  const productLabel = _state.productType === 'modifier' ? 'Modifier' : 'Power-Up';
  const socketNote = _state.productType === 'modifier'
    ? `<p class="sheet-socket-note">🔌 Socketable into <strong>${tierLabel(effect.tier_gate)}</strong> references and higher.<br>Socketing is permanent and cannot be undone.</p>`
    : `<p class="sheet-socket-note">⚡ One-shot consumable. Equip pre-debate (max 3 per debate). Consumed on debate start.</p>`;

  const canAfford = _state.tokenBalance >= cost;

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
              data-product="${_state.productType}">
        Buy ${productLabel} · ${cost} tokens
      </button>

      <button class="sheet-cancel-btn" id="sheet-cancel">Cancel</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = (): void => {
    overlay.remove();
    _sheetCleanup = null;
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('#sheet-cancel')?.addEventListener('click', close);

  const confirmBtn = overlay.querySelector<HTMLButtonElement>('#sheet-confirm');
  if (confirmBtn && canAfford) {
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

      if (ok && _container) {
        // Re-render with updated balance
        render(_container);
      }
    });
  }

  _sheetCleanup = close;
}

// Inline helper to avoid re-importing (mirrors modifiers.ts rarityClass)
function rarityClass(tier: RarityTier): string {
  const map: Record<RarityTier, string> = {
    common: 'common', uncommon: 'uncommon', rare: 'rare',
    legendary: 'legendary', mythic: 'mythic',
  };
  return map[tier] ?? 'common';
}

// Cleanup when leaving the tab
export function cleanupShopScreen(): void {
  if (_sheetCleanup) { _sheetCleanup(); _sheetCleanup = null; }
  _container = null;
}
