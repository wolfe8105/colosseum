# Anchor List — async.ts (Arbiter Run 2)

1. init  (line 108)
2. getComposerHTML  (line 118)
3. _onDocClick  (line 165)
4. destroy  (line 176)

## Resolution notes

- `init` (line 108): Confirmed exported function. FEATURES.asyncDebates guard; initializes placeholder state.
- `getComposerHTML` (line 118): Confirmed exported function. Returns fully hardcoded HTML composer string.
- `_onDocClick` (line 165): Confirmed non-exported named const arrow function at module scope. Click delegator for post-take button. Referenced in destroy() for listener cleanup.
- `destroy` (line 176): Confirmed exported function. Removes event listener, clears state, hides picker.
- All imports, re-exports, `ModeratorAsync` const, and side-effect statements: Excluded.
- Both arbiter runs independently produced the same 4-entry anchor list.
