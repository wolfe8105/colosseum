# Anchor List — modifiers-catalog.ts

1. getModifierCatalog  (line 17)
2. getEffect  (line 35)
3. getEndOfDebateEffects  (line 41)
4. getInDebateEffects  (line 46)

## Resolution notes

All five agents agreed unanimously on the same four function definitions. All four are exported `async function` declarations at the top level. No arrow-function bindings, inner helpers, or class methods. The three `let`/`const` variable bindings (`_catalogCache`, `_catalogFetchedAt`, `CATALOG_TTL_MS`) are data, not functions, and are correctly excluded.
