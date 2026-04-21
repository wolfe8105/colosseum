# Anchor List — share.ts

1. getBaseUrl  (line 51)
2. getStableInviteUrl  (line 58)
3. share  (line 74)
4. shareResult  (line 105)
5. shareProfile  (line 119)
6. inviteFriend  (line 134)
7. shareTake  (line 141)
8. handleDeepLink  (line 152)

## Resolution notes

- `ShareResultParams` (L21–29) — excluded: interface (type signature), not a callable binding.
- `ShareProfileParams` (L31–39) — excluded: interface (type signature), not a callable binding.
- `ShareData` (L41–45) — excluded: interface (type signature), not a callable binding.
- `_cachedInviteUrl` (L56) — excluded: module-scope `let` bound to `null`, not a callable.
- `ModeratorShare` (L191–197) — excluded: const object literal aggregating already-anchored functions; not itself a function definition.
- `ready.then(() => handleDeepLink())` (L204) — excluded: top-level statement with inline callback, not a named binding.
- Arrow inside `ready.then(...)` at L204 — excluded: inline callback.
- Arrow inside `getStableInviteUrl` dynamic `import(...).then(...)` / `inviteFriend` `getStableInviteUrl().then(...)` / `handleDeepLink` `setTimeout` and `import(...).then(...)` callbacks — excluded: inline callbacks inside function bodies.
