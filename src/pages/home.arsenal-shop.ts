/**
 * Home — Arsenal "Shop" tab  (orchestrator)
 * F-10 Power-Up Shop | Session 268 | April 12, 2026
 *
 * Entry points: loadShopScreen, cleanupShopScreen.
 * Owns module-level state; delegates render/wire/sheet to sub-modules.
 *
 * Depends on: modifiers-catalog.ts, modifiers-rpc.ts, config.ts
 */

import { getModifierCatalog } from '../modifiers-catalog.ts';
import { renderShop } from './home.arsenal-shop-render.ts';
import type { ShopState } from './home.arsenal-shop-types.ts';

// ── Module-level state ─────────────────────────────────────────────────────

const _state: ShopState = {
  catalog:        [],
  productType:    'powerup',
  categoryFilter: 'all',
  rarityFilter:   'all',
  timingFilter:   'all',
  affordableOnly: false,
  tokenBalance:   0,
};

let _container:    HTMLElement | null = null;
let _sheetCleanup: (() => void) | null = null;

// ── Entry points ───────────────────────────────────────────────────────────

export async function loadShopScreen(container: HTMLElement): Promise<void> {
  _container = container;
  if (_sheetCleanup) { _sheetCleanup(); _sheetCleanup = null; }

  container.innerHTML = '<div class="shop-loading">Loading catalog…</div>';

  let catalog;
  try {
    catalog = await getModifierCatalog();
  } catch (e) {
    console.error('[arsenal-shop] Failed to load catalog:', e);
    container.innerHTML = '<div class="shop-error">Failed to load shop. Please try again.</div>';
    return;
  }

  _state.catalog = catalog;
  _state.tokenBalance = _readTokenBalance();

  _rerender(container);
}

export function cleanupShopScreen(): void {
  if (_sheetCleanup) { _sheetCleanup(); _sheetCleanup = null; }
  _container = null;
  _state.productType    = 'powerup';
  _state.categoryFilter = 'all';
  _state.rarityFilter   = 'all';
  _state.timingFilter   = 'all';
  _state.affordableOnly = false;
}

// ── Internal helpers ───────────────────────────────────────────────────────

function _rerender(container: HTMLElement): void {
  _state.tokenBalance = _readTokenBalance();
  renderShop(
    container,
    _state,
    () => _rerender(container),
    (cleanup) => {
      if (_sheetCleanup) { _sheetCleanup(); }
      _sheetCleanup = cleanup;
    },
  );
}

// Read live token balance from the DOM (already kept up to date by home.ts)
function _readTokenBalance(): number {
  const el = document.querySelector<HTMLElement>('[data-token-balance]');
  return el ? Number.parseInt(el.textContent ?? '0', 10) || 0 : 0;
}
