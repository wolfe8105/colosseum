# Anchor List — share.ts

Source: src/share.ts
Produced by: stage 1.5 (arbiter runs 1 and 2 agreed; no reconciliation)
Unresolved items: 0

1. getBaseUrl  (line 51)
2. getStableInviteUrl  (line 58)
3. share  (line 74)
4. shareResult  (line 105)
5. shareProfile  (line 119)
6. inviteFriend  (line 134)
7. shareTake  (line 141)
8. handleDeepLink  (line 152)

## Resolution notes

- `ShareResultParams`, `ShareProfileParams`, `ShareData`: excluded — TypeScript interfaces, not callable bindings.
- `_cachedInviteUrl` (L56): excluded — `let` binding to a value (initialized `null`), not a function.
- `ModeratorShare` (L191–197): excluded — const object literal aggregating already-anchored functions; not itself a function definition.
- `ready.then(() => handleDeepLink())` (L204): excluded — top-level statement with an inline callback; not a named binding.
- Inline arrow callbacks inside `inviteFriend`, `handleDeepLink`, `getStableInviteUrl` (e.g. dynamic `import(...).then(...)`, `setTimeout`, promise chains): excluded — inline callbacks, not top-level function definitions.
- Both arbiter runs independently produced the same 8-entry anchor list.
