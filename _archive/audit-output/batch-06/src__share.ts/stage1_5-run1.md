# Anchor List — src/share.ts

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

- ModeratorShare (line 267): const binding to an object literal (`as const`), not a function definition; excluded.
- `ready.then(() => handleDeepLink())` (line 281): top-level expression; inline callback, not a named top-level binding; excluded.
- All five agents unanimously agreed on the nine function definitions above.
