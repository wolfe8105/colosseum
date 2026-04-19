# Refactor Prompt — cosmetics.ts (489 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/cosmetics.ts (489 lines).

Read CLAUDE.md first, then read src/pages/cosmetics.ts in full before touching anything. The file is the Cosmetics Shop — badge cabinet, item grid, confirm purchase modal, equip handler, and info modal.

SPLIT MAP (verify against the file before executing):

1. cosmetics.ts (orchestrator, ~55 lines)
   Keeps: module-level state, loadShopScreen and cleanupShopScreen entry points, renderShell, showLoading, all imports. Replaces local escHtml with escapeHTML imported from config.ts.

2. cosmetics.types.ts (~30 lines)
   CosmeticItem interface, Category type, and any other type definitions. No logic.

3. cosmetics.fetch.ts (~25 lines)
   loadShop async function. Fetches catalog via RPC, populates module state.

4. cosmetics.render.ts (~130 lines)
   renderTab, renderBadgeCabinet, renderItemGrid, renderItemCard, itemPreview, badgeIcon, depthLabel. All HTML-building render helpers. Uses escapeHTML from config.ts (not the local escHtml).

5. cosmetics.modal.ts (~90 lines)
   openConfirmModal, closeConfirmModal, executePurchase, handleEquip, showInfoModal, closeInfoModal. Purchase flow and info modal.

6. cosmetics.wiring.ts (~50 lines)
   Event delegation setup — all click/tap handlers wired to the cosmetics container. Called from loadShopScreen after renderShell.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (CosmeticItem, Category).
- Delete the local escHtml function. Replace all escHtml(...) calls with escapeHTML from config.ts.
- Dependency direction: orchestrator imports all 5. render imports types. modal imports types and render helpers. wiring imports modal and fetch. fetch is standalone.
- Target under 135 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in cosmetics* files.

LANDMINES — log these as // LANDMINE [LM-COS-NNN]: description comments. Do NOT fix them:

- LM-COS-001 (fixed during refactor): Local escHtml is a duplicate of escapeHTML from config.ts. Being replaced as part of this refactor — no landmine comment needed.

- LM-COS-002 (in cosmetics.modal.ts at executePurchase): Purchase button is disabled before the RPC call but re-enabled only on the success/error paths inside the try block. No finally block — if the RPC throws, the button stays permanently disabled. Disable-button-no-finally pattern.

- LM-COS-003 (in cosmetics.modal.ts at handleEquip): equip button is disabled on click, re-enabled in the finally-like catch, but the success path calls renderTab which rebuilds the DOM — the button reference is stale after re-render. Not a bug today (button is removed from DOM) but fragile if renderTab stops doing a full rebuild.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
