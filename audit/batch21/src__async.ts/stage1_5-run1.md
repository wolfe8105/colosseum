# Anchor List — async.ts (Arbiter Run 1)

1. init  (line 108)
2. getComposerHTML  (line 118)
3. _onDocClick  (line 165)
4. destroy  (line 176)

## Resolution notes

- `init` (line 108): Exported function. Feature-gated initializer — sets state.hotTakes and state.predictions from placeholder consts.
- `getComposerHTML` (line 118): Exported function. Returns hardcoded HTML string for the hot-take composer. No user data.
- `_onDocClick` (line 165): Non-exported module-scope named const arrow function. Delegates document-level clicks to `postTake()` via `[data-action="post-take"]` selector. Registered by `document.addEventListener` side effect at line 170.
- `destroy` (line 176): Exported function. Full teardown: removes `_onDocClick` listener, hides wager picker, clears all state fields.
- All import bindings (lines 24–59): Excluded — imported from sub-modules.
- Re-exports (lines 64–102): Excluded — pass-through, not defined here.
- `ModeratorAsync` const object (line 141): Excluded — facade aggregating already-defined functions; same pattern as `ModeratorShare` exclusion.
- Side effects (lines 170, 194): Not callable bindings.
