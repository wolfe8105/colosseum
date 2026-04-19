# Stage 1 — Primitive Inventory: home.nav.ts

## Consensus Inventory (18 named bindings)

### Value Imports

| Line | Kind | Name | Source |
|------|------|------|--------|
| 4 | import | destroyArena | ../arena.ts (aliased from `destroy`) |
| 4 | import | showPowerUpShop | ../arena.ts |
| 5 | import | registerNavigate | ../navigation.ts |
| 6 | import | shareProfile | ../share.ts |
| 6 | import | inviteFriend | ../share.ts (imported, unused in body) |
| 7 | import | subscribe | ../payments.ts |
| 8 | import | getCurrentProfile | ../auth.ts |
| 8 | import | getCurrentUser | ../auth.ts |
| 9 | import | ModeratorAsync | ../async.ts |
| 10 | import | renderFeed | ./home.feed.ts |
| 11 | import | loadArsenalScreen | ./home.arsenal.ts |
| 12 | import | loadInviteScreen | ./home.invite.ts |
| 12 | import | cleanupInviteScreen | ./home.invite.ts (imported, not called in body) |
| 13 | import | loadFollowCounts | ./home.profile.ts |
| 14 | import | loadDebateArchive | ../profile-debate-archive.ts |
| 15 | import | state | ./home.state.ts |

### Declarations

| Line | Kind | Name | Description |
|------|------|------|-------------|
| 17 | const | VALID_SCREENS | string[] — `['home', 'arena', 'profile', 'shop', 'leaderboard', 'arsenal', 'invite']` |
| 19 | export function | navigateTo | Screen navigation dispatcher, accepts `screenId: string` |

**Total: 18 named bindings** (16 value imports + 1 const + 1 exported function)

No type imports. No side-effect-only imports.

---

## Agent Variance Notes

- **Agent 06**: Received abbreviated source with renumbered lines; names were all correct but line numbers differed.
- **Agent 09**: Count header said "12 imports" but their actual list has 16 — arithmetic error in header, list is correct.
- All 11 agents correctly identified all 18 names including the two unused imports (`inviteFriend`, `cleanupInviteScreen`) and the renamed import (`destroyArena`).
