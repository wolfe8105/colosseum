# Audit Findings — Consolidated

**Source:** Four-stage code audit method v3 runs (see `THE-MODERATOR-AUDIT-METHOD-V3.md`).
**Coverage:** 15 of 57 files audited (Batches 1–3 of 12).
**Last updated:** 2026-04-13, end of Batch 3.

This is the working punch list of every real code finding from the v3 audit. Source-of-truth audit output lives in `audit-output/batch-NN/<file>/stage3.md` for verification — this file is the human-readable index. Findings are grouped by severity, then by file. Each finding includes the file, function, batch, and a one-line description plus enough context to act on it.

When a finding is fixed: strike it through and add a `FIXED in commit <sha>` note. Do not delete entries.

---

## HIGH severity — needs answer or fix before more auditing

### ~~H-A2. `arena-room-end.ts` — `apply_end_of_debate_modifiers` non-idempotent~~ — **FIXED 2026-04-13**
**Batch 2. SQL inspected and fix applied 2026-04-13.** Original finding confirmed: zero idempotency protection, every call reads current stored scores and compounds adjustments on top, `_apply_inventory_effects` called unconditionally.

**Fix applied in production** via `supabase/fix-apply-end-of-debate-modifiers-idempotency.sql`:
- Added `arena_debates.modifiers_applied BOOLEAN NOT NULL DEFAULT FALSE`
- Backfilled `TRUE` for existing complete debates (1 row)
- Replaced function with idempotent version — early-return guard after participant check returns `already_applied: true` with stored scores and empty adjustment arrays; `modifiers_applied = TRUE` set in the same UPDATE that writes the final scores
- Verified: column exists, backfill correct, function body contains guard

Historical damage scope: exactly 1 complete debate existed in production at fix time, so real-world rating inflation was minimal. Going forward, all new PvP debates are protected.

*(No HIGH findings currently open.)*

---

## MEDIUM severity — real bugs, schedule fixes

### M-A1. `arena-feed-machine.ts` — `pauseFeed` race condition (~line 463)
**Batch 1.** Calls `unpauseFeed()` synchronously before the `insert_feed_event` and `rule_on_reference` RPC promises resolve. Real bug — feed unpaused before its causes have actually completed.

### M-B1. `arena-room-end.ts:262` — `resolve_audition_from_debate` bypasses `safeRpc`
**Batch 2.** Uses raw `_sb.rpc()` instead of `safeRpc`. Session expiry during long debates → silent failure, no retry. The whole point of `safeRpc` is to handle this; one-line fix.

### M-B2. `arena-room-end.ts:248/254/260` — dynamic `import('../auth.ts')` for already-imported functions
**Batch 2.** Three dynamic imports of functions that are already statically imported at the top of the file. Copy-paste cruft, wasteful async work on the end-of-debate path.

### M-B3. `arena-room-live.ts` — `submitTextArgument` silently swallows RPC failures
**Batch 2.** Catch block has `/* warned */` comment but no actual logging. Opponent's poll then times out waiting for nothing. Same family as several other silent-catch findings below.

### M-B4. `arena-room-live.ts` — `initLiveAudio` stacks `onWebRTC` handlers with no deregistration
**Batch 2.** Each call adds a new `debateEnd` handler. Multiple calls → `endCurrentDebate` fires multiple times. Memory leak + behavioral bug if init is ever re-entered.

### M-B5. `arena-feed-wiring.ts` — `wireModControls` score button permanently disabled after one successful score
**Batch 2.** Contradicts the entire `FEED_SCORE_BUDGET` system, which exists specifically to allow multiple scores. Almost certainly unintentional.

### M-B6. `arena-feed-wiring.ts` — `submitDebaterMessage` / `submitModComment` no rollback on `writeFeedEvent` failure
**Batch 2.** Optimistic render, no undo. If `writeFeedEvent` fails the message is on screen but never persisted — ghost messages.

### M-B7. `arena-feed-wiring.ts` — concede handler fires `startFinalAdBreak` before `writeFeedEvent` completes
**Batch 2.** Visual race only (no data corruption), but the ad break can start before the concede event is recorded.

### M-C1. `groups.auditions.ts` — `openAuditionModal` stale field state in `allowed_by_leader` mode
**Batch 3.** `_populateAuditionFields()` is called **only when `needsDebate` is true** (rule !== 'allowed_by_leader'). Open the modal for an audition group → fields populated. Close. Open for an `allowed_by_leader` group → fields keep previous values. UI state leak between groups.

### M-C2. `groups.settings.ts` — `submitDeleteGroup` button never re-enabled on success
**Batch 3.** Try/catch with **no finally**. Success path hides `view-settings` and fires `onGroupDeleted?.()` but never resets `btn.disabled` or `btn.textContent`. If the callback doesn't navigate away or unmount, the delete button is permanently stuck in `'DELETING…'`. Inconsistent with `submitGroupSettings`, which has a proper finally. Trivial fix.

### M-C4. `home.ts` — `appInit` 6-second auth race silently demotes to plinko
**Batch 3.** `Promise.race([authReady, setTimeout(6000)])`. If auth is slow (flaky network, cold Supabase), the race resolves with timeout, `getCurrentUser()` returns null, the `!getCurrentUser() && !getIsPlaceholderMode()` check trips, user is redirected to `moderator-plinko.html` with no error, no toast, no log. A logged-in user on a slow connection gets silently bumped to a placeholder screen.

### M-C5. `home.ts` — `appInit` unawaited post-init calls with no `.catch`
**Batch 3.** `loadFollowCounts()` and `initTournaments()` are called bare — no await, no `.catch()` at the callsite. Any throw becomes an unhandled promise rejection. `renderFeed()` and `loadBountyDotSet()` at least log via `.catch`. Same family as M-B3.

### M-C6. `home.ts` — `appInit` drip card silent error handler
**Batch 3.** Error handler is bare `() => {}` — no logging, no telemetry. If drip card init breaks, you'll never know. Same family as M-B3.

### M-D1. `reference-arsenal.render.ts` — `renderArmory` Second button stays permanently disabled after success
**Batch 5.** In the "Second a reference" handler, the button is disabled on click. Error path re-enables; success path updates `btn.textContent = '✓ Seconded'` but never resets `btn.disabled`. User cannot un-second even if that's a valid action, and the button visually remains in its disabled state forever. **Third confirmed instance of the disable-button-no-finally pattern** (see M-B5 `wireModControls` score button, M-C2 `submitDeleteGroup`). Worth a file-wide grep sweep.

### M-D2. `modifiers.ts` — `renderPowerupRow` injects numeric `pu.quantity` into innerHTML without `Number()` cast
**Batch 5.** Line 363: `×${pu.quantity}` written directly into innerHTML. CLAUDE.md explicitly requires any numeric value displayed via innerHTML to be cast with `Number()` first. **Direct project-rule violation.** No Stage 2 agent flagged this; Stage 3 Agent 01's needs_review section caught it — exactly the kind of hole the verifier pass exists for. Fix: `×${Number(pu.quantity)}`.

### M-D3. `modifiers.ts` — `handleEquip` toast shows `"slot undefined/3"` on missing `res.slots_used`
**Batch 5.** Line 409: `` `${effectName} equipped (slot ${res.slots_used}/3)` `` with no null guard. If the server response omits `slots_used` for any reason (RPC error, shape drift, older function version), user sees literal "undefined" text. Fix: `slot ${res.slots_used ?? '?'}/3`.

### M-E1. `arena-loadout-presets.ts` — `handleSave` save button permanently disabled on failure
**Batch 6.** Button disabled at line 208 before RPC. Success path works (DOM gets replaced by `renderBar`). On `result.error` branch (alert + return) and on catch block: button is never re-enabled. User cannot retry save without page reload. **Fourth confirmed instance of the disable-button-no-finally pattern** (M-B5, M-C2, M-D1, M-E1). Pattern is definitive — stop fixing one-off, do a grep sweep.

### M-E2. `arena-loadout-presets.ts` — `renderBar` pointercancel handler leaves `didLongPress` stale
**Batch 6.** On a preset chip: long-press sets `didLongPress = true`, then a scroll fires pointercancel. The handler clears the press timer but doesn't reset the flag. Next tap on the same chip is silently suppressed because the tap handler sees `didLongPress` still true and treats it as long-press tail. Not a crash, a UI dead-spot. One-line fix: `didLongPress = false` in pointercancel handler. Agent 04 noted pointerup has the same gap.

### M-E3. `arena-loadout-presets.ts` — `handleDelete` `safeRpc` return value discarded
**Batch 6.** Line 247 awaits `safeRpc('delete_loadout_preset', ...)` without capturing or checking the result. If the RPC returns `{ error }` without throwing (which is `safeRpc`'s whole point — it converts throws to error objects), the UI removes the preset from the displayed list while the DB record still exists. Inconsistent with `handleSave` which does check `result.error`.

### M-E4. `rivals-presence.ts` — `_showNext` incomplete XSS sanitization on `safeName`
**Batch 6.** User-supplied `display_name`/`username` has `<` and `>` stripped via regex replace, then interpolated directly into innerHTML. Missing `escapeHTML()` — `"`, `'`, and `&` are not encoded. CLAUDE.md explicitly requires `escapeHTML()` on all user content entering innerHTML. **Direct project rule violation and a real XSS surface** — same family as M-D2 (the missing `Number()` cast violation in modifiers.ts). Second confirmed Stage 2 miss caught by Stage 3's verifier pass.

### M-E5. `rivals-presence.ts` — `_buildRivalSet` stale rivalSet on fetch failure
**Batch 6.** All Stage 2 agents described this wrong in unison; Stage 3 caught the error. Actual behavior: if `getMyRivals()` rejects, `rivalSet.clear()` (on the line *after* the failed await) never runs. `rivalSet` keeps whatever data it had from the previous init cycle. Subtle because on a fresh page load the set is empty so the bug is invisible, but on re-init after destroy+init (or on reconnect), stale rival IDs persist across the failure. **Unanimous Stage 2 failure — first of its kind in the audit so far.** Normally at least one agent catches things; here all five got it wrong in the same way.

### M-E6. `rivals-presence.ts` — `_dismissPopup` timers not cancellable, can fire after `destroy()`
**Batch 6.** The 300ms and 600ms setTimeout handles are anonymous — never stored in module state. If `destroy()` is called while a dismiss animation is in flight, the timers still fire and call `_showNext()` against torn-down state. Class: cleanup doesn't cleanup all the things.

### M-E7. `rivals-presence.ts` — `_dismissPopup` queue permanently stalls if popup element is missing
**Batch 6.** If `getElementById('rival-alert-popup')` returns null, the function early-returns without setting `alertActive = false`. Any subsequent `_queueAlert` call sees `alertActive === true` and silently queues without showing. Only recovery is calling `destroy()`. Edge case but real.

### M-E8. `api/invite.js` — IP spoofing via `x-forwarded-for[0]`
**Batch 6.** The handler records `x-forwarded-for[0].trim()` (leftmost) as the client IP. On Vercel, the platform *appends* the real client IP to the right of whatever chain came in, so `[0]` is attacker-controlled. Any attacker can forge arbitrary IPs in click-record entries. Recognized anti-pattern. Scope is limited to click-record poisoning (not auth/access control), but still: **fix by using `req.headers['x-real-ip']` or taking the rightmost entry of `x-forwarded-for`**.

### M-E9. `api/invite.js` — misleading `await` on "non-blocking" RPC
**Batch 6.** Comment at line 37 says "Non-blocking — click recording failure should not break the invite flow" but the code does `await supabase.rpc(...)`, which blocks the redirect on the full Supabase round-trip. Every invite click pays the latency tax. Comment describes failure-tolerance, not execution semantics. Fix: either remove the `await` (true fire-and-forget via `void supabase.rpc(...)`) or update the comment to match what the code actually does.

---

## LOW severity — defensive coding gaps, dead code, smells

### L-A12. `arena-room-end.ts` — `update_arena_debate` accepts client-provided scores in PvP (downgraded from H-A1)
**Batch 2. SQL inspected 2026-04-13.** The original HIGH finding claimed AI debates were deterministically broken by a last-write-wins race. **SQL inspection overturned this.** The function uses `SELECT ... FOR UPDATE` to serialize concurrent calls and short-circuits on a second call via `IF v_debate.status = 'complete' AND p_status = 'complete' THEN ... 'already_finalized'`, so there is no race. In PvP the server computes the winner from `vote_count_a`/`vote_count_b` and ignores client-provided `p_winner`. In AI mode there is only one client, so no race is possible.

The residual concern: in PvP the server still writes `score_a = COALESCE(p_score_a, score_a)` and `score_b = COALESCE(p_score_b, score_b)` — whichever debater's client call lands first wins the `FOR UPDATE` race and commits its locally-computed scores, and the second call is rejected by the already-finalized branch. Scores are therefore deterministic per network state but depend on which client reaches the DB first. This is surprising, not broken. If scores were intended to be server-computed for PvP, this is a minor design gap worth closing; if client-computed scores are intentional, no action.

### L-A1. `arena-feed-wiring.ts` — challenge button count label set once via innerHTML, never updated
**Batch 2.**

### L-A2. `arena-css.ts` — `livePulse` animation referenced but `@keyframes livePulse` not defined in this file
**Batch 1.** Presumably defined elsewhere; worth verifying.

### L-A3. `arena-css.ts` — hardcoded hex colors in feed room section
**Batch 1.** Violates CLAUDE.md token policy.

### L-A4. `arena-feed-ui.ts` — `setSpectatorVotingEnabled` is a permanent no-op
**Batch 1.** Either remove it or implement it.

### L-A5. `arena-feed-room.ts` — `cleanupFeedRoom` missing `set_currentDebate(null)`
**Batch 1.** Cleanup leaves stale `currentDebate` reference.

### L-A6. `arena-types.ts` and `groups.ts` — assorted dead imports
**Batch 2.** `view`, `equippedForDebate`, `set_roundTimer`, `friendlyError`, `leaveDebate`, `screenEl`, `FEED_MAX_CHALLENGES`, `pauseFeed` (and others — list is across all three room files in Batch 2).

### L-A7. `arena-types.ts` — hex colors in `MODES`
**Batch 2.** Violates CLAUDE.md token policy. Same family as L-A3.

### L-A8. `arena-types.ts` — `DebateStatus` dual values tech debt
**Batch 2.**

### L-A9. `groups.ts` — positional array tab coupling; `alert()` instead of `showToast()`
**Batch 2.** Two separate Low items, both in `groups.ts`.

### L-A10. `arena-room-end.ts` / `arena-room-live.ts` — share result hardcodes `spectators: 0`
**Batch 2.**

### L-A11. `arena-room-end.ts` — copy-paste dead branches in role check; `roundTimer` cleared but not nulled
**Batch 2.**

### L-C1. `groups.auditions.ts` — asymmetric null guards in `openAuditionModal`
**Batch 3.** Guards on `#audition-rule-desc` and `#audition-debate-params`, but NOT on `#audition-error`, `#audition-submit-btn` (read twice), or `#audition-modal`. Same gap in `submitAuditionRequest` (4 unguarded reads) and `_populateAuditionFields` (input/select reads unguarded; only `*-row` wrappers guarded). File-wide pattern.

### L-C2. `groups.auditions.ts` — `handleAuditionAction` full-page reload via `window.location.href`
**Batch 3.** Uses `window.location.href = 'index.html?screen=arena&lobby=...'` instead of an SPA navigation helper. Causes a full document reload — losing in-memory state, re-running module init, re-fetching everything. If the rest of the app uses a navigate helper, this is inconsistent.

### L-C3. `groups.settings.ts` — `submitGroupSettings` cannot unset boolean entry requirements
**Batch 3.** `entryReq.require_profile_complete` is **only** included if the checkbox is checked. Unchecking a previously-required profile sends a payload missing the field entirely. If `update_group_settings` does a partial merge server-side (likely, given the conditional `entry_requirements`/`audition_config` passing), the old `true` value persists and the user can't clear it. Worth checking the SQL.

### L-C4. `home.nav.ts` — `navigateTo` invalid screen IDs silently coerced to `'home'`
**Batch 3.** `if (!VALID_SCREENS.includes(screenId)) screenId = 'home';` — no console warning, no log. Typo'd or stale screen names just bounce home with zero diagnostic.

### L-C5. `home.nav.ts` — `navigateTo` `rivals-feed` element passed without null guard
**Batch 3.** `ModeratorAsync?.renderRivals?.(document.getElementById('rivals-feed'))` — the `?.` chain is on `ModeratorAsync` and `renderRivals`, not on the element. If `#rivals-feed` is missing, `null` gets passed into `renderRivals`.

### L-C6. `home.nav.ts` — `navigateTo` `loadArsenalScreen()` bare call
**Batch 3.** No null guard, no `.catch()`, no try. Any throw becomes an unhandled rejection. Same family as M-C5.

### L-C7. `groups.auditions.ts` — non-leader members get no action buttons in `_renderAuditionsList` else branch
**Batch 3. INTENTIONAL per Pat.** Logged here so future audits don't re-flag it.

### ~~L-C8. `groups.auditions.ts` — `handleAuditionAction` withdraw branch uses wrong group ID~~ — **FIXED 2026-04-13**
**Batch 3 (originally filed as M-C3, downgraded and fixed same session).** Two module-level group-ID variables exist for legitimate reasons: `currentGroupId` tracks "the group whose detail page is open" (leader/member view), while `currentAuditionGroupId` tracks "the group whose audition modal was opened" (candidate view). `submitAuditionRequest` and `openAuditionModal` correctly use `currentAuditionGroupId`; `handleAuditionAction` correctly uses `currentGroupId` for `approve`/`deny` (leader actions from a group detail page). However, the same line also runs for `withdraw` — a **candidate-side** action where the user may be in the audition modal without having a group detail page open, so `currentGroupId` may be null or stale.

Concrete failure modes: withdraw with `currentGroupId = null` throws at the non-null assertion and the catch shows "Action failed" on a successful withdrawal; withdraw with `currentGroupId` pointing at a previously-browsed group refreshes the wrong group's audition list.

**Fix applied:** one-line conditional at `handleAuditionAction` — `const refreshGroupId = action === 'withdraw' ? currentAuditionGroupId : currentGroupId;` then pass `refreshGroupId!` to `loadPendingAuditions`.

### L-D1. `reference-arsenal.render.ts` — `renderArmory` bottom sheet singleton check uses inner div ID, not host ID
**Batch 5.** Singleton guard reads `document.getElementById('armory-sheet')` but the host element has `id="armory-sheet-host"`. Works today because the inner `armory-sheet` div is always inside the host, but if the sheet internals are ever restructured the singleton check silently fails and duplicate sheets get created. Brittle ID coupling.

### L-D2. `reference-arsenal.rpc.ts` — `citeReference` suspected server-side no-op under F-55
**Batch 5.** Multiple Stage 2 agents independently noted that `citeReference` forwards `_outcome` (underscore prefix indicates intentionally-unused) and flagged the RPC as "may be a no-op server-side under F-55." Not verifiable from client code alone. **Worth an SQL check** — if the server function is a no-op the whole client path is dead weight.

### L-D3. `reference-arsenal.render.ts` — `renderReferenceCard` potential TypeError on missing `SOURCE_TYPES` key
**Batch 5.** If `ref.source_type` isn't in the `SOURCE_TYPES` constant map, the lookup returns undefined and any subsequent `.label`/`.icon` access throws. Depends on upstream data integrity. Low unless you've seen it happen.

### L-E1. `rivals-presence.ts` — `_startPresence` subscribe callback missing try/catch on `await track()`
**Batch 6.** Line 263-267: inside the `status === 'SUBSCRIBED'` branch, the `await presenceChannel!.track(...)` call is not wrapped. Network failure causes an unhandled promise rejection inside the async callback. No Stage 2 agent flagged this.

### L-E2. `api/invite.js` — no HTTP method guard
**Batch 6.** HEAD or OPTIONS request to `/i/:code` executes the full handler body, triggering click recording. Vercel's routing layer may handle some of this, but the source has no explicit `if (req.method !== 'GET') return` check.

### L-E3. `api/invite.js` — no 404 vs redirect distinction
**Batch 6.** Invalid-format codes and valid-format-but-nonexistent codes both redirect to plinko without `?ref=`. Users who click a typo'd or expired link are silently dropped to the bare home page with no feedback. Product question more than a code bug.

### L-E4. `api/invite.js` — regex hardcodes invite code format
**Batch 6.** `/^[a-z0-9]{5}$/` requires lowercase, exactly 5 chars. If the generator ever produces uppercase or a different length, valid invites silently fall through to bare plinko (losing referral credit). Worth confirming the generator matches.

### L-E5. `share.ts` — `_cachedRefCode` set but never read in this file
**Batch 6.** `getStableInviteUrl` writes to `_cachedRefCode` on success but no function in the file reads it back. Either consumed externally (check other files) or vestigial dead state. Only Agent 05 caught the downstream consumption question.

### L-E6. `arena-loadout-presets.ts` — `applyPreset` redundant dynamic import of `auth.ts`
**Batch 6.** Line 166 does `(await import('./auth.ts')).getCurrentProfile()` but `auth.ts` is already statically imported. `getCurrentProfile` could be added to the static import at line 9. Purely cosmetic. (The `powerups.ts` dynamic import is *not* redundant — `renderLoadout`/`wireLoadout` aren't in the static import list.)

---

## Cross-cutting patterns

These are not individual findings but families that recur across files. Worth single sweep PRs rather than file-by-file fixes.

1. **Unawaited promises with no `.catch`** — M-C5, L-C6, M-B3, L-E1. Promises started bare; throws become unhandled rejections. Pattern: bare `someAsync()` instead of `someAsync().catch(e => console.error(...))`.
2. **Silent catch blocks** — M-B3, M-C6, M-E9 (misleading comment). `catch { /* warned */ }` or `catch(() => {})`. Loses diagnostic signal.
3. **Asymmetric null guards** — L-C1, plus several Batch 1 findings. Some DOM reads in a function are guarded, others are not, with no clear reason. Either guard all or none.
4. **Disable-button-no-finally pattern** — M-B5 (`wireModControls` score), M-C2 (`submitDeleteGroup`), M-D1 (`renderArmory` second button), **M-E1 (`handleSave` preset)**. **FOUR confirmed instances across FOUR different files. Definitive pattern.** Disable button → do work → success or error path forgets to re-enable. This is no longer an observation, it's a file-wide systemic issue. **Recommend immediate grep-sweep PR**: search for `btn.disabled = true`, verify each match has a matching re-enable on every code path including catch and early-return branches.
5. **Hardcoded hex colors** — L-A3, L-A7. Violates CLAUDE.md token policy. Should be enforceable via a lint rule.
6. **Dead imports** — L-A6 and others. Easy to clean up; ESLint rule would catch all of them.
7. **CLAUDE.md rule violations not caught by Stage 2, surfaced by Stage 3 verifier** — M-D2 (missing `Number()` cast), **M-E4 (missing `escapeHTML()`)**. Two confirmed instances now. The Stage 3 verifier is reliably catching real project-rule violations that all 5 Stage 2 agents describe without flagging. Strong argument for keeping the verifier stage even if we compress elsewhere.
8. **Unanimous Stage 2 misdescription** — **M-E5** (`_buildRivalSet` stale set on error path). First case in the audit where all 5 Stage 2 agents described the same thing wrong in the same way. Caught by Stage 3's consensus verification against source. Fits the general pattern that the verifier pass matters most on **counterintuitive control flow** where the intuitive reading is wrong.

---

## Audit progress

| Batch | Files | Status | High | Med | Low |
|---|---|---|---|---|---|
| 1 | 5 (`arena-css`, `arena-feed-events`, `arena-feed-machine`, `arena-feed-room`, `arena-feed-ui`) | done | 0 | 1 | 5 |
| 2 | 5 (`arena-feed-wiring`, `arena-room-end`, `arena-room-live`, `arena-types`, `groups`) | done | 1 | 7 | 7 |
| 3 | 5 (`groups.types`, `groups.settings`, `groups.auditions`, `home`, `home.nav`) | done | 0 | 5 | 8 |
| 4 | 4 (restructured from 5; TBD) | pending — never successfully run | — | — | — |
| 5 | 5 (`modifiers`, `reference-arsenal`, `reference-arsenal.types`, `reference-arsenal.rpc`, `reference-arsenal.render`) | done | 0 | 3 | 3 |
| 6 | 4 of 5 (`rivals-presence`, `share`, `invite`, `arena-loadout-presets`; `arena-room-setup` deferred) | **partial** | 0 | 9 | 6 |
| 7R–14R | 29 | pending (restructured to 4-file batches) | — | — | — |

**24 of 57 files audited (Batches 1–3, 5, partial 6; Batch 4 still pending, `arena-room-setup.ts` in Batch 7R). 0 High, 25 Medium, 29 Low. 2 findings FIXED (H-A2, L-C8).**

**Batch 6 notes:** hit CC context compaction on file 5 of 5 at 5-agent/5-file config. Disable-button-no-finally pattern hit instance #4 across 4 different files — now definitive. Stage 3 verifier caught another CLAUDE.md rule violation (missing `escapeHTML` in rivals-presence) plus the first unanimous Stage 2 misdescription in the audit's history (`_buildRivalSet` stale set on error). Remaining batches cut to 4 files for compaction headroom.
