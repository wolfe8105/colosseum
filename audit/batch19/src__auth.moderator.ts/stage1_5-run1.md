# Anchor List — auth.moderator.ts

1. toggleModerator  (line 12)
2. toggleModAvailable  (line 37)
3. updateModCategories  (line 56)
4. submitReference  (line 75)
5. ruleOnReference  (line 99)
6. scoreModerator  (line 118)
7. assignModerator  (line 132)
8. getAvailableModerators  (line 152)
9. getDebateReferences  (line 169)

## Resolution notes
- All five agents unanimously identified the same 9 exported async functions; no disagreement on anchors.
- Imports (`getIsPlaceholderMode`, `getCurrentUser`, `getCurrentProfile`, `isUUID`, `_notify`, `safeRpc`) excluded — not callable bindings defined in this file.
- Type-only imports excluded.
- JSDoc and inline SESSION 134 comments excluded — not function definitions.
- No inner helpers, inline callbacks, class methods, or overload signatures present.
- All 9 anchors are top-level `export async function` declarations.
