# Anchor List — src/pages/home.profile.ts

Source: src/pages/home.profile.ts
Produced by: stage 1.5 (arbiter, runs agreed — no reconciliation needed)
Unresolved items: 0

1. _renderAvatar  (line 9)
2. _renderNavAvatar  (line 24)
3. updateUIFromProfile  (line 35)
4. loadFollowCounts  (line 76)

## Resolution notes

- `avatarBtn` (line 87): bound to an `HTMLElement | null` value, not a function.
- `dropdown` (line 88): bound to an `HTMLElement | null` value, not a function.
- Inline arrow callbacks passed to `addEventListener` on lines 89, 90, 93: inline callbacks, not top-level named bindings.
