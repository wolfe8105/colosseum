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
- `ShareResultParams` (lines 21–29) — excluded: interface (type signature), not a callable binding.
- `ShareProfileParams` (lines 31–39) — excluded: interface (type signature), not a callable binding.
- `ShareData` (lines 41–45) — excluded: interface (type signature), not a callable binding.
- `_cachedInviteUrl` (line 56) — excluded: `let` bound to `null`, not a callable.
- `ModeratorShare` (lines 191–197) — excluded: const object literal aggregating references to already-listed functions; not itself a callable binding.
- `ready.then(() => handleDeepLink())` (line 204) — excluded: top-level statement with an inline arrow callback; not a named binding.
- Inline arrow `() => handleDeepLink()` (line 204) — excluded: inline callback.
- Inline arrow `url => { ... }` inside `inviteFriend` (lines 135–138) — excluded: inline callback.
- Inline arrow `({ safeRpc }) => { ... }` inside `handleDeepLink` (lines 163–169) — excluded: inline callback.
- Inline `setTimeout` arrows inside `handleDeepLink` (lines 174–176, 184–186) — excluded: inline callbacks.
