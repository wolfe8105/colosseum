# Audit Findings — Consolidated

**Source:** Four-stage code audit method v3 runs (see `THE-MODERATOR-AUDIT-METHOD-V3.md`).
**Coverage:** 49 of 57 files audited (Batches 1–6 partial, 4, 7R, 8R, 8Rc, 9R, 10R, 11R, 12R, 13R, 14R, 15R).
**Last updated:** 2026-04-15, end of Batch 15R.

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

### ~~H-K1. `arena-feed-spec-chat.ts:171` — Stored XSS in report button onclick via single-quote injection~~ — **FIXED 2026-04-14 (commit 4166c1e)**
**Batch 12R. FIRST HIGH SINCE H-A2. Unanimous 5/5 Stage 3 agents independently confirmed. Fixed same day.** The `renderMessages` function built a report button with an inline `onclick` attribute using double-quote outer delimiters and single-quote inner JS string delimiters, interpolating `encodeURIComponent(m.message)` into that JS string. `encodeURIComponent` does not encode the single-quote character (RFC 3986 unreserved), so a stored spectator chat message containing `'` terminated the JS string and allowed arbitrary JS execution in any spectator's browser that clicked the report button. `m.message` was fully user-controlled (spectator chat content), making this a stored XSS with worm potential.

**Fix applied:** Replaced inline `onclick` with `data-msg-id` and `data-msg-content` attributes (both passed through `escapeHTML()`), then attached click listeners after the `innerHTML` assignment that read the data attributes and construct the `mailto:` URL via `encodeURIComponent` in URL context (where it's the correct escape). The user content never enters a JS string context. Fix matches the `needs-human-review.md` NR-8 recommendation exactly. Build clean, typecheck baseline unchanged (391→391).

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

### M-F1. `home.arsenal-shop.ts` — `openBottomSheet` confirm handler no try/catch, button stuck on rejection
**Batch 4.** The confirm button handler sets `confirmBtn.disabled = true` before calling `handleBuyModifier`/`handleBuyPowerup`. On rejection, `close()` is never reached — sheet stays open, button permanently stuck in disabled 'Purchasing…' state. **Fifth confirmed instance of the disable-button-no-finally pattern** (M-B5, M-C2, M-D1, M-E1, M-F1). Fix: wrap handler in try/finally.

### M-F2. `home.invite.ts` — `rewardTypeLabel` returns `undefined`, `openClaimSheet` calls `.toUpperCase()` on it → TypeError
**Batch 4.** `rewardTypeLabel(reward_type)` returns `undefined` for any unrecognized type. `openClaimSheet` calls `rewardTypeLabel(rewardType).toUpperCase()` at the call site — throws `TypeError` at runtime on any unknown `reward_type`. Fix: `rewardTypeLabel(rewardType)?.toUpperCase() ?? 'REWARD'`.

### M-F3. `home.invite.ts` — `openClaimSheet` rejection leaves sheet stuck, button permanently disabled
**Batch 4.** On rejection in the `.mod-buy-btn` handler, `close()` is not called. Sheet stays open, confirm button stuck in disabled 'Claiming…' state. **Sixth confirmed instance of the disable-button-no-finally pattern** (M-B5, M-C2, M-D1, M-E1, M-F1, M-F3). Fix: try/finally.

### M-G1. `auth.profile.ts` — `currentProfile` undeclared inside `showUserProfile`; bounty section may receive `undefined`
**Batch 7R.** `showUserProfile` calls `getCurrentUser()` at line 91 but never calls `getCurrentProfile()`. At lines 224 and 232 it passes `currentProfile` to `renderProfileBountySection(profileId, currentProfile)` and `renderMyBountiesSection(currentProfile)` — but `currentProfile` has no local declaration inside the function. All 5 Stage 3 agents flagged this. At runtime `currentProfile` either resolves to a module-scope variable (undocumented external-state dependency) or is `undefined`, causing the bounty render functions to receive `undefined` as their profile argument. Fix: add `const currentProfile = getCurrentProfile()` inside `showUserProfile`, or verify the module-scope binding is intentional and document it.

### M-H1. `reference-arsenal.loadout.ts` — empty-state message never shown when all entries are frozen
**Batch 8R.** The `arsenal.length === 0` guard (line 31) runs before the frozen-entry filter (line 41). If the RPC returns a non-empty array that is entirely composed of frozen references, the early-return path is skipped. After line 41 filters them all out, `render()` is called on an empty array — producing a header row and empty grid, not the intended "no references forged" empty-state message. **All 5 Stage 3 agents flagged this unanimously.** Fix: move the `arsenal.length === 0` check to after the frozen filter, or add a second check post-filter.

### M-H2. `profile-debate-archive.ts:352` — `d.winner` not in `RecentDebate` interface; W/L badge permanently blank
**Batch 8R.** `_showAddPicker` computes `const result = d.winner === undefined ? '' : (d.is_win ? '✅ W' : '❌ L')` at line 352. The `RecentDebate` interface (lines 39–50) has no `winner` field — `d.winner` is a TypeScript property-not-exist error. At runtime `d.winner` is always `undefined`, so `result` is always `''` and the W/L indicator is never displayed in the add-debate picker. **All 5 Stage 3 agents confirmed.** Fix: add `winner: string | null` to `RecentDebate` and change the check to `d.winner === null`, or replace the ternary with `d.is_win ? '✅ W' : '❌ L'` directly.

### M-J1. `arena-core.ts` — `init()` co-executes `joinCode` and `spectate` paths with no `else` guard
**Batch 10R.** If both `?joinCode=X` and `?spectate=Y` are present in the URL, both `joinWithCode` and `enterFeedRoomAsSpectator` fire — no `else` branch separates them. Both execute, `window.history.replaceState` is called twice, arena state collides. Flagged by 4/5 Stage 3 agents. Fix: add `else if` before the spectate block.

### M-J2. `arena-core.ts` — `_onPopState` registered at module load regardless of `FEATURES.arena` flag
**Batch 10R.** `window.addEventListener('popstate', _onPopState)` runs at module parse time, not inside `init()`. Active even when `FEATURES.arena` is false or `init()` was never called — accesses `view`/`currentDebate` state that may be uninitialized. Fix: move registration inside `init()`.

### M-J3. `arena-bounty-claim.ts` — `selectBountyClaim` rejection leaves button permanently disabled
**Batch 10R.** `await selectBountyClaim(...)` in the lock-button handler has no try/catch. A thrown rejection leaves the button stuck in disabled spinner state with no recovery path. **Seventh confirmed instance of the disable-button-no-finally pattern** (M-B5, M-C2, M-D1, M-E1, M-F1, M-F3, M-J3). Fix: wrap in try/finally.

### M-J4. `arena-bounty-claim.ts` — XSS on bounty option content; `escapeHTML` missing
**Batch 10R.** `b.bounty_id`, `b.amount`, `b.attempt_fee` interpolated into `innerHTML` without `escapeHTML`. Values come from Supabase RPC so practical risk is low, but violates CLAUDE.md rule. All 5 agents confirmed. Fix: `escapeHTML()` or `Number()` cast as appropriate.

### M-J5. `arena-bounty-claim.ts` — `_attemptFeePaid` singleton not reset between renders
**Batch 10R.** Module-level `_attemptFeePaid` persists across calls to `renderBountyClaimDropdown`. If caller doesn't invoke `resetBountyClaim()` between renders (e.g. switching opponents), lock button silently no-ops with no feedback. Fix: reset `_attemptFeePaid = false` at top of `renderBountyClaimDropdown`.

### M-K1. `arena-feed-spec-chat.ts` — `loadMessages` timestamp deduplication assumes ascending server sort
**Batch 12R.** The dedup logic uses `msgs[msgs.length - 1].created_at === lastMessageTime` to skip re-renders. This is correct only if `get_spectator_chat` returns rows in ascending chronological order (no client-side sort is applied). Two failure modes: (1) if the RPC ever returns rows in non-ascending order, `lastMessageTime` gets set to a non-latest timestamp and subsequent polls silently skip new messages; (2) if two messages share an identical `created_at` string (likely at 1s resolution), the second message arriving in a later poll is silently dropped. All 5 Stage 3 agents flagged. Fix: iterate to find max timestamp instead of trusting array order, OR sort client-side before dedup.

### M-I1. `arena-ads.ts` — `showAdInterstitial` double-fire bug: skip click doesn't `clearInterval(tick)`
**Batch 9R.** Skip button handler calls `dismiss()` which removes the overlay but does not clear the 1-second countdown interval `tick`. Interval keeps running; when `remaining <= 0`, `dismiss()` fires again and `onDone()` is invoked a second time. `overlay.remove()` on the second call is a DOM no-op, but duplicate `onDone()` is a real functional bug — whatever the caller does on ad completion runs twice. **All 5 Stage 3 agents confirmed.** Structural note: `tick` is declared `const` after the skip listener is attached, so `dismiss()` can't reference it in its current position — fix requires moving `let tick` declaration above `dismiss()`.

### M-I2. `arena-ads.ts` — no `destroy()` exposed; `setInterval` tick has no external cancellation path
**Batch 9R.** `showAdInterstitial` starts a 1-second countdown `setInterval` but exposes no way to cancel it from outside. If the caller context is torn down before the countdown completes (navigation, component unmount, error recovery), the interval continues firing against stale DOM/state. **Direct CLAUDE.md rule violation** — the project convention is that any module owning a `setInterval` must export a `destroy()` that clears it. Same family as the cleanup gaps in `rivals-presence.ts` (M-E6).

### M-I3. `leaderboard.ts` — `renderList` mutates shared rank objects in `liveData` / `PLACEHOLDER_DATA`
**Batch 9R.** Line 269 does `[...data]` which creates a shallow copy of the array, but the objects inside are the same references as in `liveData` (or `PLACEHOLDER_DATA`). The `forEach` at line 276 runs `item.rank = i + 1`, which writes back to the original `LeaderboardEntry` objects. For `liveData`, this means ranks are silently rewritten on every render call. For `PLACEHOLDER_DATA` — a module-level `const` — repeated renders in placeholder mode mutate the constant's objects' `rank` fields, which means the "constant" isn't actually constant across calls. **All 5 Stage 2 agents missed this in unison; Stage 3 caught it.** Second case of unanimous Stage 2 misdescription (after M-E5). Fix: `data.map(row => ({ ...row }))` instead of `[...data]` to deep-copy each entry before rank assignment.

### M-F4. `plinko.ts` — `getAge` silently overflows invalid day inputs, could mis-gate 13-year-old check
**Batch 4.** `new Date(year, month - 1, day)` silently overflows out-of-range days (e.g. Feb 31 → March 2/3). Day dropdown is populated 1-31 for all months with no dynamic adjustment. In edge cases around a user's birthday this could cause `getAge` to return an off-by-days result that incorrectly passes or fails the 13-year-old age gate. Fix: clamp `day` to the actual last day of the selected month before constructing the `Date`.

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

### L-F1. `home.arsenal-shop.ts` — `loadShopScreen` dead ternary; `getUserInventory()` result never used
**Batch 4.** Both branches of `inventory?.powerup_stock != null ? _readTokenBalance() : _readTokenBalance()` call the same function. `getUserInventory()` is awaited and the result assigned to `inventory`, but `inventory` is never read. Likely an incomplete implementation where one branch was meant to use `inventory.powerup_stock` directly.

### L-F2. `home.arsenal-shop.ts` — `.mod-buy-btn` comment factually wrong
**Batch 4.** Source comment says "Buy button (direct tap, bypasses sheet)" but the implementation calls `openBottomSheet(effect)` — identical behavior to a card tap. Fix: correct the comment.

### L-F3. `home.arsenal-shop.ts` — `showToast` dead import
**Batch 4.** `showToast` is imported from `config.ts` but never called anywhere in the file.

### L-F4. `home.arsenal-shop.ts` — `async` keyword on `.mod-buy-btn` handler is dead
**Batch 4.** The handler never `await`s anything. `openBottomSheet` is synchronous. Dead `async` keyword.

### L-F5. `home.arsenal-shop.ts` — `cost` interpolated into innerHTML without `Number()` cast
**Batch 4.** `cost` (from `effect.mod_cost`/`effect.pu_cost`) is interpolated directly into `innerHTML`. CLAUDE.md requires `Number()` cast before innerHTML interpolation of numeric values. Fix: `Number(effect.mod_cost)`.

### L-F6. `home.arsenal-shop.ts` — `_state` not reset by `cleanupShopScreen`, persists across tab nav
**Batch 4.** Module-level `_state` (productType, categoryFilter, rarityFilter, timingFilter, affordableOnly) is never cleared by `cleanupShopScreen`. Filter selections from a previous visit persist when the shop tab is revisited. May be intentional but is undocumented.

### L-F7. `home.invite.ts` — `render()` missing `Number()` casts before innerHTML
**Batch 4.** `stats.converts`, `stats.total_signups`, `stats.total_clicks` are interpolated into `innerHTML` without `Number()` casts. CLAUDE.md rule violation. Same family as M-D2, L-F5.

### L-F8. `home.invite.ts` — `!grid` guard (line 274) is dead code
**Batch 4.** `overlay.querySelector('#claim-picker-grid')` queries the in-memory JS object. `overlay.remove()` does not nullify the reference — `querySelector` still succeeds. The guard only fires if the HTML template is malformed. Should be removed or replaced with a meaningful check.

### L-F9. `home.invite.ts` — claim button handler calls `openClaimSheet()` with no `.catch()`
**Batch 4.** `openClaimSheet(container, rewardType)` is called fire-and-forget in the `wireInviteScreen` click handler. Any rejection is silently swallowed. Same family as M-C5, L-C6.

### L-F10. `plinko.ts` — `document.execCommand('copy')` deprecated in clipboard fallback
**Batch 4.** The clipboard fallback path in `injectInviteNudge` uses the deprecated `execCommand('copy')` API. Not a security issue; forward-compatibility concern for future browser versions.

### L-F11. `plinko.ts` — `void injectInviteNudge()` has no `.catch()`
**Batch 4.** Called fire-and-forget from `goToStep`. If `injectInviteNudge` throws outside its internal try/catch (e.g. in DOM manipulation), produces an unhandled promise rejection. Currently safe but fragile. Same family as M-C5.

### L-G1. `arena-room-setup.ts` — `injectAdSlot` called but not imported; potential runtime ReferenceError
**Batch 7R.** All Stage 3 agents flagged that `injectAdSlot` is used in the file but not in the import list. If the bundler doesn't catch this, it's a runtime `ReferenceError` when the ad slot is injected. Verify the import exists or add it.

### L-G2. `arena-room-setup.ts` — dead imports (`removeShieldIndicator`, possibly `TEXT_MAX_CHARS`)
**Batch 7R.** `removeShieldIndicator` is imported but never called in this file. `TEXT_MAX_CHARS` may also be unused here. Same family as L-A6.

### L-G3. `spectate.ts` — `startPolling` fallback query missing `{ ascending: true }` option
**Batch 7R.** The `debate_messages` fallback inside `startPolling` (line 56) calls `.order('round').order('created_at')` with no ascending option, while the same fallback in `loadDebate` (lines 175–176) explicitly passes `{ ascending: true }`. Could produce different message ordering between initial load and polling updates.

### L-G4. `spectate.ts` — live-redirect in `loadDebate` silently skips RPCs
**Batch 7R.** When `debate.status === 'live'`, `loadDebate` redirects and returns immediately — skipping `bump_spectator_count`, `log_debate_watch`, and `log_event` RPCs. All agents described the redirect correctly but none called out the skipped RPCs. May be intentional but is undocumented.

### L-G5. `auth.profile.ts` — `profile.error` check against `PublicProfile` which has no `.error` field
**Batch 7R.** Stage 2 described a `profile.error` check in `showUserProfile`, but `PublicProfile` (defined in `auth.types.ts`) has no `.error` field. This branch may be dead code or a type mismatch. Flagged by agents 03 and 05.

### L-H1. `profile-debate-archive.ts` — `getCurrentUser` dead import
**Batch 8R.** `getCurrentUser` is imported at line 10 but never called anywhere in the module. Likely a vestige of a planned ownership-verification flow that was replaced by the `isOwner` parameter pattern. All 5 agents confirmed. Remove the import.

### L-I1. `arena-ads.ts` — `showAdInterstitial` no guard against concurrent calls; duplicate IDs
**Batch 9R.** If `showAdInterstitial` is called while an overlay already exists, a second overlay is appended with the same `id="structural-ad-interstitial"`. Duplicate IDs break `document.getElementById` lookups and leave stacked overlays in the DOM. Fix: early-return if `#structural-ad-interstitial` already exists, or replace the existing overlay.

### L-I2. `arena-ads.ts` — `injectAdSlot` and `showAdInterstitial` share the same `SLOT_ID`
**Batch 9R.** Both functions use identical `data-ad-slot="8647716209"` even though they serve different ad formats (responsive banner vs 320×250 rectangle interstitial). AdSense policy generally requires distinct slot IDs per distinct ad unit format; sharing one slot ID across two formats may cause one or both to fail to serve, or violate AdSense terms. Worth verifying against the AdSense dashboard.

### L-I3. `leaderboard.ts` — `currentTime` is a dead-write state variable
**Batch 9R.** `setTime` writes `currentTime` and resets offset/hasMore, then calls `render()`. But `currentTime` is never read by any fetch path — `fetchLeaderboard` passes no time parameter to the `get_leaderboard` RPC. The time-filter tab in the UI is non-functional (in-code comment on line 446–448 acknowledges this). Either wire the parameter through to the RPC or remove the state variable and the UI control.

### L-I4. `leaderboard.ts` — `setTab` first `render()` call shows error div, not shimmer
**Batch 9R.** `setTab` resets `liveData = null` and then calls `render()` synchronously **before** `fetchLeaderboard()` sets `isLoading = true`. At that moment `renderList()` hits its early-return error path (`liveData === null && !isLoading`) and outputs the "Couldn't load rankings" error div. The user sees a brief error flash on every tab switch before the fetch completes and the real data arrives. UX issue, not data corruption. Fix: either set `isLoading = true` before the first `render()` call, or skip the pre-fetch render entirely.

### L-I5. `arena-mod-scoring.ts` — async handlers use global `document.getElementById` instead of scoped queries
**Batch 9R.** Lines 56, 66–67, 73, 76: the button click and submit handlers look up `#mod-scored`, `#mod-score-submit`, `.mod-score-slider-row`, and related elements via `document.getElementById` rather than `section.querySelector`. Works fine in a single-render lifecycle. In a multi-render scenario (re-render or two simultaneous mod scoring sections in DOM), handlers silently target whichever element has the ID first. Latent ID-collision fragility. Fix: scope queries to the `section` root passed in.

### L-I6. `arena-ads.ts` missing from CLAUDE.md's arena sub-modules list (documentation gap)
**Batch 9R.** The CLAUDE.md project file lists 31 arena sub-module files under its arena section but omits `arena-ads.ts`. File exists and is now audited; listing is stale. Doc-only gap, no code impact. Fix: add the file to the CLAUDE.md table.

### L-J1. `arena-core.ts` — `_onPopState` double-clears `_rulingCountdownTimer`
**Batch 10R.** Timer cleared once conditionally inside `if (rulingOverlay)` and again unconditionally in the `view === 'room'` branch. `clearInterval` is idempotent so no functional bug, but undocumented duplication could mask a timer-reuse bug in future. 5/5 agents flagged.

### L-J2. `arena-core.ts` — `formatTimer` produces decimal output on float input
**Batch 10R.** `sec % 60` is not floored — fractional input (e.g. `90.5`) produces `"1:30.5"` instead of `"1:30"`. 5/5 agents confirmed. No current caller passes a float, but fragile. Fix: `Math.floor(sec % 60)`.

### L-J3. `arena-core.ts` — `injectCSS()` fires before `#screen-arena` null guard in `init()`
**Batch 10R.** CSS is injected even when the arena element is absent, potentially polluting non-arena pages. Fix: move `injectCSS()` to after the null guard.

### L-J4. `arena-core.ts` — `destroy()` listener removal depends on `_onPopState` reference identity
**Batch 10R.** `removeEventListener('popstate', _onPopState)` only works because `_onPopState` is the same exported const reference. If anything wraps or rebinds it, removal silently fails and handler leaks. 2 agents flagged.

### L-J5. `arena-core.ts` — `ready.catch(() => init())` swallows auth error reason
**Batch 10R.** Auth rejection still triggers `init()`, losing diagnostic information on auth failure. Intentional per CLAUDE.md guest-access design but undocumented.

### L-J6. `arena-bounty-claim.ts` — error div not cleared when user changes selection after failed attempt
**Batch 10R.** `#bounty-claim-error` is not hidden or cleared in the `change` listener. After a failed lock attempt, stale error message persists while user selects a different bounty. All 5 agents confirmed.

### L-J7. `arena-bounty-claim.ts` — hardcoded hex colors `#F5A623` / `#0A1128`
**Batch 10R.** Two hex values assigned directly to `style.background` / `style.color`. Violates CLAUDE.md design DNA rule. Same family as L-A3, L-A7.

### L-K1. `arena-feed-spec-chat.ts` — `initSpecChat` writes `activeDebateId` and `chatOpen` before panel null check
**Batch 12R.** Lines 47–48 set `activeDebateId = debateId` and `chatOpen = false` unconditionally. The panel null check follows at line 51 and early-returns if the panel element is absent. Result: if `initSpecChat` is called on a page where `feed-spec-chat-panel` doesn't exist, state is partially written (pointing at the new debate) with no polling started. `cleanupSpecChat` recovers it, but a caller that detects the missing panel and skips cleanup leaves stranded state. Fix: move state writes after the null check, or early-return first.

### L-K2. `arena-feed-spec-chat.ts` — `cleanupSpecChat` doesn't cancel `handleSend`'s 3s error-hide setTimeout
**Batch 12R.** `handleSend` schedules a 3-second `setTimeout` on line 204 to auto-hide the error element after showing it. The timeout handle is not stored, so `cleanupSpecChat` cannot cancel it. If cleanup runs while that timer is in flight, the callback fires against a detached element — currently a no-op (only sets `style.display = 'none'` on a captured ref) but fragile.

### L-K3. `arena-feed-spec-chat.ts` — `loadMessages` has no concurrency guard against poll + send-triggered overlap
**Batch 12R.** `loadMessages` is called from both the 5s polling interval and from `handleSend`'s success path. If a send completes while a poll is in flight (or vice versa), both calls race to update `lastMessageTime` and render the same messages twice. Low severity in practice but worth an `if (_loadingInFlight) return` guard.

### L-K4. `spectate.render.ts:481` — `state.lastRenderedMessageCount` write is outside the `if (state.app)` guard
**Batch 12R.** Line 480 guards the `innerHTML` write: `if (state.app) state.app.innerHTML = html`. Line 481 unconditionally writes `state.lastRenderedMessageCount = messages.length`. If `state.app` is null (page not ready), the DOM doesn't update but the counter advances — subsequent render skips (which compare count) may then incorrectly believe they already rendered. Fix: move the counter write inside the guard.

### L-L1. `group-banner.ts` — `_renderTier1Fallback` onerror path doesn't clear container, leaves broken `<img>` in DOM
**Batch 13R.** When `renderGroupBanner` renders a Tier 2 `<img>` and that image fails to load, `img.onerror` calls `_renderTier1Fallback(container, emoji, name)`, which does `container.appendChild(wrap)` (line 288) without first removing the broken `<img>`. Result: the container contains both the failed `<img>` element and the fallback `<div class="group-banner-t1">` simultaneously. Whether this produces a visible rendering artifact depends on browser behavior for broken images with `object-fit: cover`. Only 1 of 5 Stage 3 agents (Agent 02) flagged this; Stage 3 caught it as a latent behavioral gap. May or may not be a visible bug in practice — worth confirming in real browsers. Fix: clear or remove the `<img>` in the onerror handler before calling `_renderTier1Fallback`.

### L-L2. `async.render.ts:294` — `_showWagerPicker` double-escape on sideLabel
**Batch 13R.** Line 285: `const sideLabel = side === 'a' ? esc(pred.p1) : esc(pred.p2);` — already escaped. Line 294: `WAGER ON ${esc(sideLabel.toUpperCase())}` — calls `esc()` again. Benign from a security standpoint (no injection possible, double-escape is safe), but produces corrupted display for prediction participant names containing `&`, `<`, `>`, `"`, or `'`. Example: a name like `Rock 'n' Rollers` renders as `ROCK &#x27;N&#x27; ROLLERS` in the picker header. All 5 Stage 3 agents flagged. Fix: use `pred.p1.toUpperCase()` / `pred.p2.toUpperCase()` and escape once, or drop the second `esc()` call.

### L-L3. `async.render.ts` — `_renderStandaloneCard` missing inline `Number()` casts on total/pctA/pctB
**Batch 13R.** `total` (lines 228–229), `pctA` (230), `pctB` (231) are derived from `Number()` arithmetic — they are numerically safe. But they're interpolated into innerHTML at lines 241, 262, 264–265 **without** an explicit `Number()` wrapper at the interpolation site. No security risk (values can't be user-controlled strings), but it's a direct CLAUDE.md convention violation and inconsistent with how `_renderPredictionCard` handles the same fields (which DO have inline `Number()` casts at every interpolation). Same family as L-F5, L-F7, M-D2. Fix: add `Number()` at each interpolation site.

### L-M1. `bounties.ts:358` — `renderMyBountiesSection` has no try/catch around `getMyBounties()`
**Batch 14R.** Unlike its sibling `renderProfileBountySection` which wraps the `getMyBounties()` call in a silent try/catch, `renderMyBountiesSection` calls it bare at line 358. If `getMyBounties()` rejects, the promise propagates uncaught and the container is left stuck showing the loading placeholder indefinitely. In practice `getMyBounties()` itself catches errors and always resolves with `{ incoming: [], outgoing: [] }`, so this doesn't surface as a bug today. But the structural asymmetry is fragile — if `getMyBounties` ever stops swallowing errors, this caller breaks. All 5 Stage 3 agents flagged. Fix: add try/catch matching the sibling function.

### L-M2. `bounties.ts:258–259` — refund calculation uses `duration_days` instead of the `duration_fee` field
**Batch 14R.** The `BountyRow` interface has a dedicated `duration_fee` field (line 30) that never gets referenced. The refund calculation (`totalPaid = existingBounty.amount + existingBounty.duration_days`) uses `duration_days` as the fee proxy instead. This works today only if the two values are always equal server-side — a fragile assumption. If `duration_fee` ever diverges from `duration_days` (e.g. variable pricing tiers, promotional rates, fee adjustments), refund amounts will be wrong. 5/5 Stage 3 agents confirmed the field exists and is unused. Worth an SQL check on the server-side function: if the fee is computed from days, remove the unused field; if the fee is independent, fix the client to use it.

### L-M3. `bounties.ts:255` — `renderProfileBountySection` cancel button has dual-handler pattern
**Batch 14R.** The cancel button is wired via `document.getElementById('bounty-cancel-btn')?.addEventListener('click', ...)` at line 255. Inside that listener's first-click branch, the code assigns `btn.onclick = ...` with the confirmation handler. On the second click, both the outer `addEventListener` callback AND the newly-assigned `onclick` fire. The outer handler's first-click branch has already been consumed (via dataset flag), but the pattern is structurally weird: every click fires both layers, and the second click re-assigns `onclick` to the same closure reference. Benign (dataset flag guard prevents re-entry) but fragile. Also: if `#bounty-cancel-btn` is missing when the listener tries to attach, the `?.` silently drops it.

### L-N1. `intro-music.ts:347` — `_close` sets `opacity` before `transition`; CSS fade does not animate
**Batch 15R.** `_close` assigns `backdrop.style.opacity = '0'` on line 348, then `backdrop.style.transition = 'opacity 0.2s'` on line 349. The transition property must be registered *before* the targeted property changes for the browser to animate the change. Setting it after means the opacity jump is applied instantly with no fade. The element disappears immediately and is removed 220ms later by the `setTimeout`. 4 of 5 Stage 3 agents flagged this (Agents 02, 03, 04, 05); Stage 2 described both assignments without detecting the ordering bug. Fix: swap the two lines so `style.transition` is set first.

### L-N2. `intro-music.ts:248–258` — `t.icon` and `t.id` injected into innerHTML without `escapeHTML`
**Batch 15R.** In the `INTRO_TRACKS.map(...)` block, `t.label` and `t.description` are correctly passed through `escapeHTML()`, but `t.icon` (emoji) is interpolated raw into `<span class="im-track-icon">${t.icon}</span>` and `t.id` is interpolated raw into `data-id="${t.id}"` and `data-preview="${t.id}"` attributes. `INTRO_TRACKS` is currently a hardcoded constant in `arena-sounds.ts`, so there is no immediate XSS risk. But if track data ever becomes server-sourced or user-editable, these are injection points. 2 of 5 Stage 3 agents flagged (Agents 04, 05). Fix: pass `t.icon` and `t.id` through `escapeHTML()` at each interpolation site.

### L-N3. `intro-music.ts:276–279` — `pendingUrl` not cleared on standard track selection
**Batch 15R.** When the user clicks a standard track button, the click handler sets `selectedId = btn.dataset.id` and clears `pendingFile = null`, but does not clear `pendingUrl`. If the user previously had a custom track selected (setting `pendingUrl` to the custom signed URL from the profile), then switches to a standard track, `pendingUrl` retains the old URL in the closure. On save, `_saveIntroMusic` receives a non-null `existingUrl` even though `selectedId !== 'custom'` — however, the `if (trackId === 'custom')` branch is not entered, so `p_custom_url` is still sent as `null` to the RPC. The stale `pendingUrl` has no effect on the current save behavior, but the closure state is misleading and could become load-bearing if logic around `pendingUrl` changes. 2 of 5 Stage 3 agents flagged (Agents 03, 05). Fix: add `pendingUrl = null` alongside `pendingFile = null` in the track button click handler.

### L-N4. `intro-music.ts:394–397` — `save_intro_music` RPC sends `p_custom_url: null` for all non-custom saves, clearing stored custom URL
**Batch 15R.** For non-custom tracks, `uploadedUrl` remains `undefined` throughout `_saveIntroMusic`, so `p_custom_url: uploadedUrl ?? null` = `null`. The RPC is therefore instructed to clear `custom_intro_url` whenever the user saves a standard track — even if they previously had a custom intro uploaded. This is likely intentional (switching away from custom clears the URL to avoid orphaned storage objects), but it means a user who switches between standard tracks loses their uploaded custom audio and must re-upload it if they ever switch back to custom. The in-memory profile cache mutation at lines 404–408 consistently applies the same `null`, so cache and DB stay in sync. Only 1 of 5 Stage 3 agents flagged (Agent 05). Low priority but worth documenting for the product decision.

 — `checkHIBP` fail-open on network error undocumented
**Batch 4.** Returns `false` on any network failure, timeout, or CORS block — silently allowing potentially breached passwords through. Deliberate tradeoff per in-code comments but not documented in any spec or README.

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
4. **Disable-button-no-finally pattern** — M-B5, M-C2, M-D1, M-E1, M-F1, M-F3, **M-J3 (`selectBountyClaim` in arena-bounty-claim)**. **SEVEN confirmed instances across SEVEN different files.** Disable button → do work → rejection path never re-enables. Grep-sweep PR is overdue.
5. **Hardcoded hex colors** — L-A3, L-A7. Violates CLAUDE.md token policy. Should be enforceable via a lint rule.
6. **Dead imports** — L-A6 and others. Easy to clean up; ESLint rule would catch all of them.
7. **CLAUDE.md rule violations and Stage 2 errors caught by Stage 3 verifier** — M-D2 (missing `Number()` cast), M-E4 (missing `escapeHTML()`), L-F5, L-F7 (more Number() misses), **M-H2 (`d.winner` property-not-exist TypeScript error — Stage 2 Agent 04 also had wrong RPC param names `p_name`/`p_desc` caught in `_showEditSheet`)**, **M-I2 (`setInterval` with no `destroy()` in `arena-ads.ts`), M-I3 (`renderList` rank mutation on shared objects — all 5 Stage 2 agents missed it)**, **M-J4 (bounty option content innerHTML without escapeHTML), H-K1 (stored XSS in spec-chat report button via single-quote injection)**. Stage 3 continues to catch real bugs that all 5 Stage 2 agents miss or misdescribe. **Critically, H-K1 is the first High since H-A2 and is an actually exploitable stored XSS** — the Stage 3 verifier found it because all 5 agents independently confirmed the `encodeURIComponent` doesn't-encode-single-quotes mechanic. Strong argument for keeping the verifier stage even if we compress elsewhere.
8. **Unanimous Stage 2 misdescription** — **M-E5** (`_buildRivalSet` stale set on error path), **M-I3** (`renderList` rank mutation on shared `liveData`/`PLACEHOLDER_DATA` objects). Two cases in the audit where all 5 Stage 2 agents described the same thing wrong in the same way. Caught by Stage 3's consensus verification against source. Fits the general pattern that the verifier pass matters most on **counterintuitive control flow** where the intuitive reading is wrong — in both cases the intuitive read is "shallow copy, no shared mutation" or "await failure, clear state" and the actual behavior inverts that.

---

## Audit progress

| Batch | Files | Status | High | Med | Low |
|---|---|---|---|---|---|
| 1 | 5 (`arena-css`, `arena-feed-events`, `arena-feed-machine`, `arena-feed-room`, `arena-feed-ui`) | done | 0 | 1 | 5 |
| 2 | 5 (`arena-feed-wiring`, `arena-room-end`, `arena-room-live`, `arena-types`, `groups`) | done | 1 | 7 | 7 |
| 3 | 5 (`groups.types`, `groups.settings`, `groups.auditions`, `home`, `home.nav`) | done | 0 | 5 | 8 |
| 4 | 4 (`home.arsenal`, `home.arsenal-shop`, `home.invite`, `plinko`) | done | 0 | 4 | 12 |
| 5 | 5 (`modifiers`, `reference-arsenal`, `reference-arsenal.types`, `reference-arsenal.rpc`, `reference-arsenal.render`) | done | 0 | 3 | 3 |
| 6 | 4 of 5 (`rivals-presence`, `share`, `invite`, `arena-loadout-presets`; `arena-room-setup` deferred) | **partial** | 0 | 9 | 6 |
| 7R | 4 (`arena-room-setup`, `spectate`, `auth.types`, `auth.profile`) | done | 0 | 1 | 5 |
| 8R | 4 (`settings`, `reference-arsenal.loadout`, `badge`, `profile-debate-archive`) | done | 0 | 2 | 1 |
| 8Rc | 4 (`vite.config`, `async.types`, `home.feed`, `home.types`) | done | 0 | 0 | 0 |
| 9R | 3 (`leaderboard`, `arena-ads`, `arena-mod-scoring`) | done | 0 | 3 | 6 |
| 10R | 3 (`tokens`, `arena-core`, `arena-bounty-claim`) | done | 0 | 5 | 7 |
| 11R | 4 (`arena-sounds`, `arena-core`†, `tokens`†, `notifications`) | done | 0 | 0 | 0 |
| 12R | 2 (`spectate.render`, `arena-feed-spec-chat`) | done | **1** | 1 | 4 |
| 13R | 2 (`group-banner`, `async.render`) | done | 0 | 0 | 3 |
| 14R | 2 (`bounties`, `arena-sounds`‡) | done | 0 | 0 | 3 |
| 15R | 2 (`notifications`, `intro-music`) | done | 0 | 0 | 4 |

‡ `arena-sounds.ts` was re-audited in 14R (overlap with 11R). **Both runs agreed: no code bugs.** 11R reported "all PASS, no findings." 14R reported "25 PASS, 0 FAIL" with 6 needs_review observations — but those are design-limitation notes (synthesized tracks can't be stopped, noise/osc gain asymmetry, haptics coupled to SFX toggle, etc.), not bugs. This is a **positive** audit-method data point, unlike the 10R/11R divergence on `arena-core.ts`: two independent 5-agent runs on a pure-code-quality question (does this code have bugs?) reached the same answer. The verbosity difference between runs is real, but the verdict is consistent.

† `arena-core.ts` and `tokens.ts` were re-audited in 11R (overlap with 10R). 11R's Stage 3 on these files came back fully clean, but 10R's Stage 3 on the same `arena-core.ts` flagged M-J1 (init co-execution) and M-J2 (module-load popstate). **10R findings stand** — they are real code issues, independent of which run caught them. 11R's clean verdict on the overlap is a data point about audit method variance, not evidence the bugs don't exist. Only `arena-sounds.ts` and `notifications.ts` are net-new from 11R; both clean.

**49 of 57 files audited (all batches through 15R confirmed; arena-sounds re-audit in 14R reaffirmed 11R's clean verdict — counts it once). 0 High, 41 Medium, 74 Low. 3 findings FIXED (H-A2, H-K1, L-C8).**

**Batch 15R notes:** Two files. `notifications.ts` is clean — 14 anchors, all 5 Stage 3 agents unanimous PASS on every claim, no code bugs. One `needs_review` observation (not a finding): `(window as any).ColosseumNotifications = notificationsModule` at line 416 is a module-load side effect that Stage 2 agents universally missed; it exposes the module object globally, which is a debugging pattern but not a bug in this app context. `intro-music.ts` has 4 Lows — L-N1 (opacity-before-transition bug in `_close` means the CSS fade never animates, flagged 4/5 agents), L-N2 (`t.icon` and `t.id` unescaped in innerHTML), L-N3 (`pendingUrl` stale across standard track selection), L-N4 (`p_custom_url: null` sent for all non-custom saves, destructively clears stored custom URL). No Medium or High findings. Audit method observation: the `_close` ordering bug was missed unanimously by all 5 Stage 2 agents and caught unanimously by Stage 3 — another confirmation that the verifier pass catches real bugs that runtime-walk agents miss (consistent with the M-I3 and M-E5 precedents).

**Batch 14R notes:** Two files, both clean on code quality. `bounties.ts` has 3 Lows — L-M1 (missing try/catch around `getMyBounties()` in `renderMyBountiesSection`, works today only because getMyBounties itself never rejects), L-M2 (refund calculation uses `duration_days` instead of the unused-but-defined `duration_fee` field — fragile assumption), L-M3 (cancel button dual-handler pattern — addEventListener + onclick assignment, works but weird). All 5 Stage 3 agents unanimous on all three. `arena-sounds.ts` was a re-audit of 11R's clean verdict — both runs agree there are no code bugs. 14R's 6 needs_review items are design limitations (no stop handle on synthesized intro tracks, noise() pre-scales samples making the gain parameter non-equivalent to osc()'s gain, haptics coupled to SFX toggle, closed AudioContext edge case, silent fallback to 'gladiator' on unknown trackId). Worth logging as future-feature/accessibility backlog but not code bugs. The 11R/14R agreement on arena-sounds is a positive data point about audit method consistency, contrasting with the 10R/11R divergence on arena-core.ts.

**Batch 12R notes:** Two files. `spectate.render.ts` clean — 5 functions, all behaviorally PASS with Stage 2 wording imprecision (missing `'Human Moderator'` fallback description, missing `spectator_count || 1` floor, missing `|| 0` coercions, `state.lastRenderedMessageCount` miscategorized as a read). One real Low logged (L-K4: counter write outside null guard). `arena-feed-spec-chat.ts` has **H-K1** — the first High since H-A2 in Batch 2. Stored XSS via single-quote injection in the report button's inline onclick handler. `encodeURIComponent` does not encode `'`, which terminates the JS string in the onclick attribute and allows arbitrary JS execution. Unanimous 5/5 agents. Also M-K1 (timestamp dedup fragility) and 3 Lows. **H-K1 should be fixed immediately.**

**Batch 10R notes:** 5 Medium + 7 Low. Real finds: M-J1 init co-execution of joinCode+spectate, M-J2 module-load popstate registration, M-J3 selectBountyClaim rejection leaves button disabled (**seventh** disable-button-no-finally instance), M-J4 bounty option content XSS missing escapeHTML, M-J5 _attemptFeePaid singleton not reset. Low findings across both files.

**Batch 7R notes:** `auth.types.ts` and `arena-room-setup.ts` clean. `spectate.ts` two Lows (ascending inconsistency, live-redirect skips RPCs). `auth.profile.ts` has the headline Medium — M-G1, `currentProfile` undeclared inside `showUserProfile`, all 5 agents flagged, bounty section may receive `undefined` at runtime.

**Last updated:** 2026-04-15, end of Batch 15R.
