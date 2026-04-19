# Anchor List — home.invite.ts

1. loadInviteScreen  (line 20)
2. cleanupInviteScreen  (line 43)

## Resolution notes

- `_sheetCleanup` (line 16): excluded — `let` binding initialized to `null`, not a function definition; it holds a function reference at runtime but is not itself a function binding.
- All callbacks on lines 37–39 (anonymous arrow functions passed to `openClaimSheet`): excluded — inline callbacks, not top-level named bindings.
- `.then(cleanup => ...)` / `.catch(e => ...)` callbacks (line 39): excluded — inline anonymous callbacks.
