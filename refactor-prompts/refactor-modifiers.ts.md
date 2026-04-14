# Refactor Prompt — modifiers.ts (415 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/modifiers.ts (415 lines).

Read CLAUDE.md first, then read src/modifiers.ts in full before touching anything. The file is the F-57 Modifier & Power-Up System — types, catalog cache, RPC wrappers for buy/socket/equip/inventory, render helpers for 3 card types, and 3 handler functions with toast feedback.

SPLIT MAP (verify against the file before executing):

1. modifiers.ts (types + orchestrator, ~80 lines)
   Keeps: ModifierTiming, ModifierCategory, RarityTier, ModifierEffect, OwnedModifier, PowerUpStock, EquippedLoadoutEntry, UserInventory — every type in the current file stays here so consumers can still do `import type { ModifierEffect } from './modifiers.ts'` without churn.
   Also keeps the file header comment.

2. modifiers-catalog.ts (~50 lines)
   Public exports: getModifierCatalog, getEffect, getEndOfDebateEffects, getInDebateEffects
   File-local: _catalogCache, _catalogFetchedAt, CATALOG_TTL_MS (the 60-min cache module state)

3. modifiers-rpc.ts (~120 lines)
   Public exports: buyModifier, buyPowerup, socketModifier, equipPowerupForDebate, getUserInventory
   Pure safeRpc wrappers. No DOM, no rendering, no toasts.

4. modifiers-render.ts (~150 lines — largest section, acceptable)
   Public exports: tierLabel, timingLabel, categoryLabel, rarityClass, renderEffectCard, renderModifierRow, renderPowerupRow
   All HTML-returning functions and their label helpers. Stays together because renderEffectCard / renderModifierRow / renderPowerupRow share the tier/timing/category label helpers and extracting them into a fourth file (labels.ts) creates noise for no benefit.

5. modifiers-handlers.ts (~55 lines)
   Public exports: handleBuyModifier, handleBuyPowerup, handleEquip
   The thin UX wrappers that call the RPC layer and fire toast feedback. Imports from modifiers-rpc.ts.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- `import type` for all type-only imports. Types stay in modifiers.ts, so type-only imports always point there.
- Dependency direction: modifiers.ts (types) → modifiers-rpc.ts → modifiers-catalog.ts (catalog uses safeRpc directly, doesn't depend on modifiers-rpc.ts) → modifiers-render.ts → modifiers-handlers.ts. The orchestrator (modifiers.ts) has no imports from the split files.
- Target under 300 lines, preference 150. Render at ~150 is right at the preference ceiling.
- Run `npm run build` after the split, report chunk sizes and line counts for every new file.
- Run `npm run typecheck` and confirm zero NEW errors.

CONSUMER IMPORT UPDATE:

Run `grep -rn "from.*modifiers" src/` to find consumers. Most will import both types and functions; split each import statement into (a) a `import type { ... } from './modifiers.ts'` line for the types and (b) one or more value-import lines from the new split files. A single consumer may end up with 2-3 import lines.

LANDMINES — log these as `// LANDMINE [LM-MODS-NNN]: description` comments. Do NOT fix them:

- LM-MODS-001 (in modifiers-catalog.ts at getModifierCatalog): The 60-minute catalog cache never invalidates on auth state change. If a user logs out and a different user logs in, the cached catalog persists across the session boundary. Catalog is probably not user-specific so this is likely benign, but worth flagging for a follow-up auth-hook wiring.
- LM-MODS-002 (in modifiers-rpc.ts at buyModifier/buyPowerup/socketModifier/equipPowerupForDebate/getUserInventory): Every function casts `result.data as T` without runtime validation. If the RPC response shape ever drifts from the TS interface, consumers will crash with confusing "undefined is not a function" errors instead of clean "shape mismatch" errors. Candidate for Zod runtime validators in a follow-up.
- LM-MODS-003 (in modifiers-render.ts at rarityClass): `rarityClass(tier: RarityTier): string { return tier; }` is an identity function. The comment says it's the CSS class helper "for use later if more complex mapping is needed." Fine to keep for forward compat, but if the comment is still accurate 6 months from now, inline it.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
