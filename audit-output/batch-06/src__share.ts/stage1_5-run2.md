# Anchor List — share.ts

1. getBaseUrl  (line 58)
2. getStableInviteUrl  (line 66)
3. share  (line 83)
4. shareResult  (line 114)
5. shareProfile  (line 128)
6. inviteFriend  (line 143)
7. shareTake  (line 150)
8. showPostDebatePrompt  (line 157)
9. handleDeepLink  (line 228)

## Resolution notes

- `ModeratorShare` (line 267): top-level exported const bound to object literal referencing already-listed functions, not a new function definition; excluded.
- Inline arrow callbacks inside `showPostDebatePrompt` (addEventListener ×3, lines 203–221): inner callbacks, excluded.
- Arrow callback inside `inviteFriend` (.then(url => ...), line 144): inline callback, excluded.
- Arrow callback inside `handleDeepLink` (.then({ safeRpc }) => ..., line 239): inline callback, excluded.
- `ready.then(() => handleDeepLink())` (line 281): top-level expression, not a named callable binding; excluded.
- Interface declarations (ShareResultParams, ShareProfileParams, ShareData): type definitions, not functions; excluded.
