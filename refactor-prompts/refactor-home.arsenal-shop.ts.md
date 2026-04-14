# Refactor Prompt — home.arsenal-shop.ts (369 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/home.arsenal-shop.ts (369 lines).

Read CLAUDE.md first, then read src/pages/home.arsenal-shop.ts in full before touching anything. The file is the F-10 Power-Up Shop — modifier/power-up catalog rendered inside the Arsenal "Shop" tab. Has module-level state, a loadScreen entry, filters, chip wiring, a bottom-sheet confirm flow, and cleanup.

SPLIT MAP (verify against the file before executing):

1. home.arsenal-shop.ts (orchestrator, ~75 lines)
   Keeps: module-level _state, _container, _sheetCleanup, ShopState interface, CATEGORIES, RARITIES constants, the exported loadShopScreen and cleanupShopScreen entry points. loadShopScreen calls out to render() from the render module.

2. home.arsenal-shop-filters.ts (~40 lines)
   `export function applyFilters(catalog: ModifierEffect[], state: ShopState): ModifierEffect[]` — pulls the catalog filtering logic out into a pure function that takes state as a parameter instead of reading module state directly. Clean separation, easy to test.

3. home.arsenal-shop-render.ts (~100 lines)
   `export function renderShop(container: HTMLElement, state: ShopState, catalog: ModifierEffect[]): void` — builds the full shop HTML (product toggle, balance pill, category chips, rarity/timing/afford chips, result count, card grid) and delegates event wiring. Keeps the CATEGORIES/RARITIES imports from the orchestrator.

4. home.arsenal-shop-wiring.ts (~80 lines)
   `export function wireShopEvents(container: HTMLElement, onStateChange: () => void): void` — wires product toggle, category chips, rarity chips, timing chips, afford toggle, card tap (opens bottom sheet), and buy button direct tap. Accepts an onStateChange callback that triggers re-render so the wiring file doesn't need to import render directly (breaks a potential cycle).

5. home.arsenal-shop-sheet.ts (~100 lines)
   `export function openBottomSheet(effect: ModifierEffect, state: ShopState, onBuySuccess: () => void): () => void` — the full bottom-sheet flow: builds the sheet DOM, wires close/cancel/confirm handlers, calls handleBuyModifier or handleBuyPowerup on confirm, returns a cleanup function. File-local helper: `rarityClass` (the current inline rarityClass).

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- `import type` for all type-only imports (ModifierEffect, ModifierCategory, RarityTier, ShopState).
- Dependency direction: orchestrator imports render + wiring + sheet. Wiring imports sheet. Render imports filters. No cross-imports between leaf modules.
- Target under 300 lines, preference 150. Every file lands under 110.
- Run `npm run build` after the split, report chunk sizes and line counts.
- Run `npm run typecheck` and confirm zero NEW errors in home.arsenal-shop* files.

LANDMINES — log these as `// LANDMINE [LM-SHOP-NNN]: description` comments. Do NOT fix them:

- LM-SHOP-001 (in home.arsenal-shop.ts at loadShopScreen, already catalogued as L-F1 in AUDIT-FINDINGS.md): The `_state.tokenBalance = inventory?.powerup_stock != null ? _readTokenBalance() : _readTokenBalance();` ternary has IDENTICAL branches — both call `_readTokenBalance()`. `getUserInventory()` is awaited and assigned to `inventory`, but `inventory` is never actually read. Dead ternary. Likely an incomplete implementation where one branch was meant to read from `inventory.powerup_stock` directly.

- LM-SHOP-002 (in home.arsenal-shop-wiring.ts near the `.mod-buy-btn` handler, already catalogued as L-F2 and L-F4 in AUDIT-FINDINGS.md): The in-code comment says "Buy button (direct tap, bypasses sheet)" but the handler calls `openBottomSheet(effect)` — identical to the card tap path. Comment is factually wrong. The handler is also declared `async` but never `await`s anything — dead `async` keyword.

- LM-SHOP-003 (in home.arsenal-shop-sheet.ts at openBottomSheet confirm handler, already catalogued as M-F1 in AUDIT-FINDINGS.md, member of the disable-button-no-finally family): Confirm button handler sets `confirmBtn.disabled = true` before calling `handleBuyModifier`/`handleBuyPowerup`. On rejection, `close()` is never reached. Sheet stays open, button permanently stuck in 'Purchasing…'. Fifth confirmed instance of the disable-button-no-finally pattern (M-B5, M-C2, M-D1, M-E1, M-F1). Fix requires try/finally around the await.

- LM-SHOP-004 (in home.arsenal-shop.ts near cleanupShopScreen, already catalogued as L-F6): Module-level `_state` (productType, categoryFilter, rarityFilter, timingFilter, affordableOnly) is never cleared by cleanupShopScreen. Filter selections from a previous visit persist when the shop tab is revisited. May be intentional, but undocumented.

- LM-SHOP-005 (in home.arsenal-shop-sheet.ts at rarityClass): The inline `rarityClass` helper in this file duplicates `rarityClass` exported from modifiers.ts. The file-top comment acknowledges it: "Inline helper to avoid re-importing (mirrors modifiers.ts rarityClass)". Unnecessary duplication since modifiers.ts already exports it — import instead of duplicating.

- LM-SHOP-006 (in home.arsenal-shop-render.ts at the balance pill template, already catalogued as L-F5): `${_state.tokenBalance}` interpolated directly into innerHTML without `Number()` cast. CLAUDE.md rule violation.

- LM-SHOP-007 (in home.arsenal-shop.ts near the import block, already catalogued as L-F3): `showToast` is imported from `config.ts` but never called anywhere in the file. Dead import.

Do NOT fix landmines — they're tracked in AUDIT-FINDINGS.md for Phase 2 cleanup. Refactor only.

Wait for approval of the split map before writing any code.
```
