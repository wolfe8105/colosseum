# Bug Fix Patterns — All Findings Grouped by Root Cause

**Source:** Complete audit of 57 files (Batches 1–16R). Full finding details in `AUDIT-FINDINGS.md`.
**Purpose:** Execute fixes by pattern, not by batch. One sweep per pattern = fewer PRs, more correlation visibility.

---

## Pattern 1: Disable-button-no-finally (7 instances, 7 files)

Same fix template everywhere: wrap handler in `try/finally`, re-enable in `finally`.

| ID | File | Function |
|---|---|---|
| M-B5 | `arena-feed-wiring.ts` | `wireModControls` score button |
| M-C2 | `groups.settings.ts` | `submitDeleteGroup` |
| M-D1 | `reference-arsenal.render.ts` | `renderArmory` Second button |
| M-E1 | `arena-loadout-presets.ts` | `handleSave` |
| M-F1 | `home.arsenal-shop-sheet.ts` | `openBottomSheet` confirm handler |
| M-F3 | `home.invite-sheet.ts` | `openClaimSheet` rejection |
| M-J3 | `arena-bounty-claim.ts` | `selectBountyClaim` |

**Fix strategy:** One CC prompt, one grep sweep across all 7 files. Same `try/finally` fix at each site. Single PR touching all 7.

---

## Pattern 2: Number() cast missing before innerHTML (4 instances, 4 files)

Same CLAUDE.md rule violation. Same 9-character fix at each site: wrap value in `Number()`.

| ID | File | Value |
|---|---|---|
| M-D2 | `modifiers.ts:363` | `pu.quantity` |
| L-F5 | `home.arsenal-shop-render.ts` | `effect.mod_cost` / `effect.pu_cost` |
| L-F7 | `home.invite-html.ts` | `stats.converts`, `stats.total_signups`, `stats.total_clicks` |
| L-L3 | `async.render.ts` | `total`, `pctA`, `pctB` at interpolation sites |

**Fix strategy:** Grep for `innerHTML` across these 4 files, add `Number()` at every numeric interpolation. All four in one PR.

---

## Pattern 3: escapeHTML() missing / incomplete escape (4 instances, 4 files)

Real XSS surfaces. H-K1 (the High) is already fixed; these are the remaining ones.

| ID | File | Surface |
|---|---|---|
| M-E4 | `rivals-presence-popup.ts` | `safeName` → innerHTML; missing `"`, `'`, `&` |
| M-J4 | `arena-bounty-claim.ts` | `b.bounty_id`, `b.amount`, `b.attempt_fee` → innerHTML |
| L-N2 | `intro-music.ts` | `t.icon`, `t.id` → innerHTML; hardcoded now but injection-point if server-sourced |
| L-O1 | `arena-entrance.ts:403` | `_esc` helper missing apostrophe — same vuln class as H-K1 |

**Fix strategy:** Replace missing `escapeHTML()` calls and replace `_esc()` with the project-standard helper. Note: M-J4 numeric fields also connect to Pattern 2 — fix both at the same site.

---

## Pattern 4: Unawaited promises / missing .catch() (7 instances, 5 files)

Same defensive coding gap. Throws become unhandled rejections.

| ID | File | Call |
|---|---|---|
| M-B3 | `arena-room-live-poll.ts` | `submitTextArgument` catch block has `/* warned */` with no actual log |
| M-C5 | `home.ts` | `loadFollowCounts()`, `initTournaments()` — bare calls |
| M-C6 | `home.ts` | Drip card error handler is bare `() => {}` |
| L-C6 | `home.nav.ts` | `loadArsenalScreen()` — no `.catch`, no try |
| L-E1 | `rivals-presence-channel.ts` | `track()` inside subscribe callback — no try/catch |
| L-F9 | `home.invite-wiring.ts` | `openClaimSheet()` — fire-and-forget |
| L-F11 | `plinko.ts` | `void injectInviteNudge()` — no `.catch` |

**Fix strategy:** `.catch(e => console.error('[module-name]', e))` at each callsite, or add try/catch. Mechanical fix, high coverage per PR.

---

## Pattern 5: Dead imports (5 instances, 5 files)

One ESLint `no-unused-vars` rule catches all of these permanently.

| ID | File | Import |
|---|---|---|
| L-A6 | `arena-types.ts`, `groups.ts` | Multiple (`view`, `equippedForDebate`, `pauseFeed`, etc.) |
| L-F3 | `home.arsenal-shop.ts` | `showToast` |
| L-G2 | `arena-room-setup.ts` | `removeShieldIndicator`, possibly `TEXT_MAX_CHARS` |
| L-H1 | `profile-debate-archive.ts` | `getCurrentUser` |
| L-E6 | `arena-loadout-presets.ts` | Redundant dynamic import of `auth.ts` |

**Fix strategy:** Enable ESLint `no-unused-vars` and run once. Or CC sweep with grep for each import name.

---

## Pattern 6: Hardcoded hex colors (3 instances, 3 files)

Violates CLAUDE.md token policy. One lint rule catches all future instances.

| ID | File | Colors |
|---|---|---|
| L-A3 | `arena-css.ts` | Multiple in feed room section |
| L-A7 | `arena-types.ts` | Hex in `MODES` |
| L-J7 | `arena-bounty-claim.ts` | `#F5A623`, `#0A1128` |

**Fix strategy:** Grep for `#[0-9a-fA-F]{3,6}` across the codebase. Replace with CSS var tokens. One PR.

---

## Pattern 7: Timer/cleanup gaps (5 instances, 5 files)

Same root cause: async resources created, not stored, not cancelled on cleanup.

| ID | File | Resource |
|---|---|---|
| M-B4 | `arena-room-live-audio.ts` | `onWebRTC` handlers stack with no deregistration |
| M-E6 | `rivals-presence-popup.ts` | 300ms/600ms setTimeout handles anonymous, can't cancel |
| M-I2 | `arena-ads.ts` | `setInterval tick` — no `destroy()` exposed |
| L-K2 | `arena-feed-spec-chat.ts` | 3s error-hide setTimeout not stored |
| L-O2 | `arena-entrance.ts` | Second `playSound` in `setTimeout` outside try/catch |

**Fix strategy:** Store handles in module state; clear in `destroy()`. CLAUDE.md already requires this. Add `destroy()` to `arena-ads.ts`; fix the others to store/clear their handles.

---

## Pattern 8: Stale module state (5 instances, 5 files)

Module-level state not reset or improperly scoped, leaking across UI transitions.

| ID | File | State |
|---|---|---|
| M-C1 | `groups.auditions.ts` | Modal fields not cleared between groups |
| M-E5 | `rivals-presence-channel.ts` | `rivalSet` keeps stale data when re-init fails |
| M-J5 | `arena-bounty-claim.ts` | `_attemptFeePaid` not reset between renders |
| L-A5 | `arena-feed-room.ts` | `cleanupFeedRoom` missing `set_currentDebate(null)` |
| L-F6 | `home.arsenal-shop.ts` | `_state` filter not reset by `cleanupShopScreen` |

---

## Pattern 9: safeRpc bypassed or return value discarded (2 instances, 2 files)

Same structural error — `safeRpc` exists to surface errors without throwing, but callers either bypass it or ignore its return.

| ID | File | Issue |
|---|---|---|
| M-B1 | `arena-room-end.ts:262` | Uses raw `_sb.rpc()` instead of `safeRpc` |
| M-E3 | `arena-loadout-presets.ts` | `handleDelete` awaits `safeRpc` but discards the result |

---

## Pattern 10: Race conditions / ordering bugs (6 instances, 6 files)

Different manifestations, but all timing/sequencing errors.

| ID | File | Race |
|---|---|---|
| M-A1 | `arena-feed-machine.ts` | `unpauseFeed()` fires before RPCs resolve |
| M-B7 | `arena-feed-wiring.ts` | `startFinalAdBreak` fires before `writeFeedEvent` completes |
| M-C4 | `home.ts` | 6s auth race silently demotes logged-in user to plinko |
| M-J1 | `arena-core.ts` | Both `joinCode` and `spectate` paths co-execute with no else branch |
| M-K1 | `arena-feed-spec-chat.ts` | Timestamp dedup assumes ascending server sort |
| L-N1 | `intro-music.ts` | `opacity` set before `transition` — CSS fade never animates |

---

## Pattern 11: Dead / vestigial code (12+ instances across many files)

Fields fetched but never used, hardcodes masking incomplete wiring.

| ID | File | Dead thing |
|---|---|---|
| L-A1 | `arena-feed-wiring.ts` | Challenge button count never updated |
| L-A4 | `arena-feed-ui.ts` | `setSpectatorVotingEnabled` — permanent no-op |
| L-F1 | `home.arsenal-shop.ts` | `getUserInventory()` result never used; dead ternary |
| L-F2 | `home.arsenal-shop.ts` | Wrong comment on buy button |
| L-F4 | `home.arsenal-shop.ts` | Dead `async` keyword |
| L-F8 | `home.invite.ts` | `!grid` guard — always false |
| L-I3 | `leaderboard.ts` | `currentTime` written, never read; time-filter tab non-functional |
| L-O3 | `async.fetch.ts` | `display_name` selected from DB, never mapped |
| L-O4 | `async.fetch.ts` | `tokens: 0` hardcoded on every hot-take |
| L-D2 | `reference-arsenal.rpc.ts` | `citeReference` may be server-side no-op under F-55 |
| L-E5 | `share.ts` | `_cachedRefCode` written, never read back |
| L-G5 | `auth.profile.ts` | `profile.error` check on type that has no `.error` field |

---

## Same-file clusters — fixes that naturally travel together

Open the file once, fix everything in it.

| File | Findings |
|---|---|
| `arena-feed-wiring.ts` | M-B5, M-B6, M-B7, L-A1 |
| `rivals-presence-popup.ts` | M-E4, M-E6, M-E7 |
| `rivals-presence-channel.ts` | M-E5, L-E1 |
| `home.arsenal-shop-sheet.ts` | M-F1 |
| `home.arsenal-shop-render.ts` | L-F5 |
| `home.arsenal-shop.ts` | L-F1, L-F2, L-F4, L-F6 |
| `home.invite-sheet.ts` | M-F3 |
| `home.invite-wiring.ts` | L-F9 |
| `home.invite-html.ts` | M-F2, L-F7, L-F8 |
| `arena-core.ts` | M-J1, M-J2, L-J1, L-J2, L-J3, L-J4, L-J5 |
| `arena-bounty-claim.ts` | M-J3, M-J4, M-J5, L-J6, L-J7 |
| `arena-ads.ts` | M-I1, M-I2, L-I1, L-I2 |
| `arena-room-end.ts` | M-B1, M-B2, L-A10, L-A11, L-A12 |
| `intro-music.ts` | L-N1, L-N2, L-N3, L-N4 |
| `api/invite.js` | M-E8, M-E9, L-E2, L-E3, L-E4 |
| `arena-entrance.ts` | L-O1, L-O2 |
| `async.fetch.ts` | L-O3, L-O4 |
| `arena-feed-spec-chat.ts` | M-K1, L-K1, L-K2, L-K3 |
| `modifiers.ts` | M-D2, M-D3 |
| `arena-room-live-poll.ts` | M-B3 |
| `arena-room-live-audio.ts` | M-B4 |
| `leaderboard.ts` | M-I3, L-I3, L-I4 |
| `arena-loadout-presets.ts` | M-E1, M-E2, M-E3, L-E6 |
| `bounties.ts` | L-M1, L-M2, L-M3 |
| `async.render.ts` | L-L2, L-L3 |
| `groups.auditions.ts` | M-C1, L-C1, L-C2 |
| `home.ts` | M-C4, M-C5, M-C6 |
| `plinko.ts` | M-F4, L-F10, L-F11 |

---

## The big sweeps — cross-file PRs that hit multiple patterns at once

**Sweep A — disable-button-no-finally + .catch()**
Opens 7 files for the finally fix. While each is open, add missing `.catch()` where present.
`home.invite-sheet.ts` covers both M-F3 and L-F9. `home.arsenal-shop-sheet.ts` covers M-F1.

**Sweep B — Number() + escapeHTML() violations**
Both are CLAUDE.md rule violations caught by scanning innerHTML interpolations.
Opening each file for `Number()` means catching `escapeHTML()` gaps in the same pass.
Hits: `modifiers.ts`, `home.arsenal-shop-render.ts`, `home.invite-html.ts`, `async.render.ts`, `rivals-presence-popup.ts`, `arena-bounty-claim.ts`.

**Sweep C — Dead imports + dead code**
One ESLint pass or one CC prompt across all files. Low effort, high cleanliness.

**Sweep D — Hardcoded hex**
Grep-and-replace pass, one PR. Probably 20 minutes.
