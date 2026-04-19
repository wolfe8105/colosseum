# Anchor List — home.invite.ts

1. loadInviteScreen  (line 20)
2. cleanupInviteScreen  (line 43)

## Resolution notes

- `_sheetCleanup` — excluded; it is a `let` binding to a value (`null`), not a function definition. All five agents correctly classified it as "bind name to value."
- Inner arrow `() => { _sheetCleanup = null; }` (line 37) — excluded; inline callback passed to `openClaimSheet`, not a top-level named binding.
- Inner arrow `() => { loadInviteScreen(container); }` (line 38) — excluded; inline callback passed to `openClaimSheet`, not a top-level named binding.
- `.catch(e => console.error(...))` (line 39) — excluded; inline callback, not a top-level named binding.
