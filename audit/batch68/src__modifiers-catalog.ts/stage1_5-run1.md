# Anchor List — modifiers-catalog.ts

1. getModifierCatalog  (line 17)
2. getEffect  (line 35)
3. getEndOfDebateEffects  (line 41)
4. getInDebateEffects  (line 46)

## Resolution notes

All five agents agreed unanimously on exactly four function definitions. All four are `export async function` declarations. No agent disagreed on any item. The three module-level `let`/`const` bindings (`_catalogCache`, `_catalogFetchedAt`, `CATALOG_TTL_MS`) are data bindings, not function definitions, and are correctly excluded.
