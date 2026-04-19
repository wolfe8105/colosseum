# AUDIT RESULTS — STAGE 2.3: FAILURE AND TIMING
**Audit date:** 2026-04-16  
**Auditor:** Claude Sonnet 4.6 (automated)  
**Branch:** claude/adoring-goldwasser-277ff3  

---

## ⚠️ NO CRITICAL FINDINGS

No CRITICAL-severity runtime bugs were found. One HIGH finding (LM-024 path) is called out below.

---

## FINDINGS

---

### TIMING-01: HIGH
**FILE:** `src/arena/arena-room-end-finalize.ts:157-161`  
**CATEGORY:** async-error  
**WHAT:** `resolve_audition_from_debate` is called via bare `_sb.rpc()` instead of `safeRpc`, so if the user's session has expired after a long debate, the call silently fails — audition pass/fail is never recorded.  
**SCENARIO:** User plays an audition debate that runs long (30+ minutes). Token expires mid-debate. Debate ends. `arena-room-end-finalize.ts:160` fires `_sb.rpc('resolve_audition_from_debate', ...)`. With an expired token, the Supabase SECURITY DEFINER RPC returns a 401. No 401 retry runs. The `.catch()` logs to console. The audition record stays unresolved — user sees no pass/fail, and the audition slot is wasted.  
**FIX:** Replace the bare `.rpc()` block with `safeRpc('resolve_audition_from_debate', { p_debate_id: debate.id })` using the already-imported `_safeRpc` alias directly above (line 153), matching the pattern used by every other call in that function.

```ts
// BEFORE (lines 157-161):
try {
  const { getSupabaseClient } = await import('../auth.ts');
  const _sb = getSupabaseClient();
  await _sb.rpc('resolve_audition_from_debate', { p_debate_id: debate.id });
} catch (err) { console.error('[Arena] resolve_audition_from_debate failed:', err); }

// AFTER:
try {
  const { safeRpc: _safeRpc2 } = await import('../auth.ts');
  await _safeRpc2('resolve_audition_from_debate', { p_debate_id: debate.id });
} catch (err) { console.error('[Arena] resolve_audition_from_debate failed:', err); }
```

---

### TIMING-02: MEDIUM
**FILE:** `src/arena/arena-queue.ts:200-210`  
**CATEGORY:** async-error  
**WHAT:** Queue poll errors are silently swallowed — `catch { /* handled */ }` — so if the server returns errors on repeated polls, the user receives zero feedback and the queue timer keeps ticking indefinitely.  
**SCENARIO:** Network drops or server error causes `check_queue_status` to fail. The poll continues every 4 seconds. The user sees the queue timer increment but no status change. After 3+ consecutive failures they have no way to know the queue is broken short of waiting for a timeout or refreshing.  
**FIX:** Count consecutive failures; after N≥3, show a toast ("Queue connection lost — retrying...") and optionally stop the poll after N≥10.

```ts
// BEFORE (line 200):
} catch { /* handled */ } finally {
  set__queuePollInFlight(false);
}

// AFTER:
} catch (pollError) {
  consecutivePollErrors++;
  if (consecutivePollErrors === 3) showToast('Queue connection lost — retrying...', 'error');
  console.warn('[Arena] Queue poll failed:', pollError);
} finally {
  set__queuePollInFlight(false);
}
```

---

### TIMING-03: MEDIUM
**FILE:** `src/pages/plinko-step3-username.ts:143,152`  
**CATEGORY:** async-error  
**WHAT:** OAuth signup flow uses bare `supabaseClient.rpc()` for `update_profile` and `set_profile_dob`, which have no 401 retry. If the freshly-issued OAuth token fails (edge case: token race on Safari), both RPCs fail silently and the user's display name and DOB are never saved.  
**SCENARIO:** OAuth callback completes. User is redirected to plinko step 3. On slow devices the token round-trip can be delayed. `update_profile` fires before the Supabase client has the fresh session → 401 → `catch { /* non-critical */ }` swallows it. User's username resolves but profile columns stay empty, causing downstream display bugs.  
**FIX:** Replace `supabaseClient.rpc(...)` with `safeRpc(...)` (which is available from `auth.ts`) and surface errors to the user via `showMsg`.

---

### TIMING-04: MEDIUM
**FILE:** `src/pages/auto-debate.vote.ts:47-53` + `src/pages/auto-debate.ts:151-152`  
**CATEGORY:** double-tap  
**WHAT:** Vote buttons on the auto-debate page apply a CSS class (`voted`) synchronously but never set `disabled = true`, so a double-tap fires two `cast_auto_debate_vote` RPCs before the class-based visual block takes effect.  
**SCENARIO:** User taps "Side A" rapidly twice on a mobile device. Both taps pass through the click delegator at `auto-debate.ts:152` before the `voted` class is rendered. Two `sb.rpc('cast_auto_debate_vote', ...)` calls fire. The server uses fingerprint deduplication so only one counts, but two network requests are made and the second may confuse the results display (error path shows optimistic +1 on line 66).  
**FIX:** Add `btnA?.setAttribute('disabled', 'true'); btnB?.setAttribute('disabled', 'true');` at the start of `castVoteImpl`, before the `await`.

---

### TIMING-05: MEDIUM
**FILE:** `src/arena/arena-queue.ts:205-209` (LM-009)  
**CATEGORY:** async-error  
**WHAT:** `join_debate_queue` duplicate-key errors are shown as a generic error message and the UI enters `queueErrorState`, not a "you're already queued — resuming poll" state.  
**SCENARIO:** User cancels the queue. `leave_debate_queue` is fired with `.catch(warn)` (line 254), meaning the cancel RPC can fail silently. User immediately re-enters the queue. `join_debate_queue` returns a duplicate-key constraint error. `friendlyError()` shows a generic "Queue error — try again" message. The user is stuck: they're actually still in the queue on the server but the client shows an error and stops polling.  
**FIX:** In the `catch` block at line 205, inspect `err` for a Postgres unique-violation code (`23505` or "duplicate key" string). If matched, skip the error state and start the poll directly, treating the user as already queued.

```ts
} catch (err) {
  const isDuplicate = String(err).includes('duplicate key') || String(err).includes('23505');
  if (isDuplicate) {
    // Already queued — start polling instead of showing error
    set_queuePollTimer(setInterval(...));
    return;
  }
  console.error('[Arena] Queue join error:', err);
  set_queueErrorState(true);
  ...
}
```

---

### TIMING-06: LOW
**FILE:** `src/auth.core.ts:109`  
**CATEGORY:** async-error  
**WHAT:** `get_own_profile` is called via bare `supabaseClient.rpc()` during auth init, bypassing `safeRpc`'s 401 retry. On an edge case (stale session on first load), the profile silently fails to load and `currentProfile` stays null.  
**SCENARIO:** User has a tab open for hours. They navigate back to the app. `onAuthStateChange` fires with an `INITIAL_SESSION`. `_loadProfile` calls bare `.rpc('get_own_profile')`. The old token returns 401. No retry. Profile load fails silently. The app continues in a no-profile state — the user appears logged in but `getCurrentProfile()` returns null, breaking token balance display and tier checks.  
**FIX:** This is a bootstrap case where `safeRpc` is not available yet (the client is being constructed). Acceptable mitigation: detect `error.status === 401` in the `catch` at line 114 and call `supabaseClient.auth.refreshSession()` then retry once.

---

### TIMING-07: LOW
**FILE:** `src/pages/auto-debate.ts:104`  
**CATEGORY:** async-error  
**WHAT:** `log_event` is called via bare `sb.rpc(...)` in a fire-and-forget pattern with no 401 retry.  
**SCENARIO:** Public page, anonymous session. `log_event` returns 401 → `catch { /* non-blocking */ }` discards it. Analytics event is lost.  
**FIX:** Intentional fire-and-forget for analytics. No fix required — logging failures are acceptable. Mark as accepted.

---

### TIMING-08: LOW
**FILE:** `src/pages/auto-debate.vote.ts:53` and `src/pages/debate-landing.ts:138,159`  
**CATEGORY:** async-error  
**WHAT:** Three bare `sb.rpc()` calls on public/anonymous pages — `cast_auto_debate_vote`, `cast_landing_vote`, `get_landing_votes`. None have 401 retry.  
**SCENARIO:** All three are on pages designed for unauthenticated access. `safeRpc` is designed for authenticated sessions. These bare calls are intentional. The `cast_landing_vote` call already has `.then(...).catch()` error handling (line 148). `get_landing_votes` checks error at line 160. Low risk.  
**FIX:** Intentional pattern for public/anonymous pages. No safeRpc wrapping needed. Mark as accepted.

---

## CHECK-BY-CHECK SUMMARY

### Check 1 — Double-tap
- **Match accept/decline:** ✅ `acceptBtn.disabled = true` fires at line 25 BEFORE `await safeRpc` at line 32.
- **Power-up activation:** ✅ `el.disabled = true` fires at line 39 BEFORE `await activate` at line 42.
- **Mod score button:** ✅ `(btn).disabled = true` fires at line 100 BEFORE `await safeRpc` at line 102.
- **Auto-debate vote buttons:** ❌ **TIMING-04** — CSS class applied, no `disabled` attribute.
- **Queue cancel:** ✅ `leaveQueue()` is synchronous; navigates away before second click is possible.

### Check 2 — Polling leaks
- **Queue timers (poll + elapsed):** ✅ `clearQueueTimers()` clears both; called on all navigation paths.
- **Match acceptance poll:** ✅ `clearMatchAcceptTimers()` imported and called.
- **Feed heartbeat:** ✅ `stopHeartbeat()` called from `cleanupFeedRoom()`.
- **Realtime feed channel:** ✅ `unsubscribeRealtime()` → `supabase.removeChannel()`.
- **Spec-chat poll:** ✅ `cleanupSpecChat()` → `clearInterval(pollInterval)` called from `cleanupFeedRoom()` (line 285).
- **60s challenge ruling timer:** ✅ `challengeRulingTimer` cleared in `cleanupFeedRoom()` (line 265).
- **Rivals presence channel:** ✅ `supabase.removeChannel()` wired.

### Check 3 — Async error handling
- **Queue poll swallow:** ❌ **TIMING-02** — `catch { /* handled */ }` with no user feedback.
- **resolve_audition_from_debate:** ❌ **TIMING-01** — bare `.rpc()` with no 401 retry.
- **plinko rpcs:** ❌ **TIMING-03** — bare `.rpc()` on signup state mutations.
- **arena-room-end-finalize.ts** (bounty, tournament, tips, royalties): ✅ All use `safeRpc` and `console.error` — acceptable for end-of-debate non-blocking cleanups.

### Check 4 — WebRTC failures
- **TURN credentials:** ✅ Not applicable — platform uses STUN-only, no TURN credential fetch path exists. (Deliberate design choice noted.)
- **30s connection timeout:** ✅ `disconnectTimer` and `setupTimeoutTimer` cleared in `leaveDebate()`.
- **ICE restart:** ✅ `iceRestartAttempts` reset to 0 on `leaveDebate()`.
- **Track cleanup:** ✅ `localStream.getTracks().forEach(t => t.stop())` present in `leaveDebate()`.
- **Signaling channel cleanup:** ✅ `signalingChannel.unsubscribe()` in `leaveDebate()`.

### Check 5 — Realtime subscription cleanup
- **Arena feed channel:** ✅ `unsubscribeRealtime()` → `removeChannel()`.
- **Spectator chat channel:** N/A (spec-chat uses polling, not Realtime subscribe).
- **Presence channel (rivals):** ✅ `removeChannel()` present.
- **Signaling channel:** ✅ `unsubscribe()` in `leaveDebate()`.
- **popstate → cleanupFeedRoom → all channels removed:** ✅ Chain verified.

### Check 6 — Navigation state corruption
- **popstate → cleanup:** ✅ `_onPopState` in `arena-core.ts:35-66` calls `clearQueueTimers`, `clearMatchAcceptTimers`, `stopReferencePoll`, `stopOpponentPoll`, `leaveDebate`, `cleanupFeedRoom` as appropriate per view.
- **beforeunload:** ✅ Registered in `enterFeedRoom` and removed in `cleanupFeedRoom`.
- **Back from debate room:** ✅ `endCurrentDebate()` → `cleanupFeedRoom()` called on popstate when view is `room`.
- **DOM updates after async (mount guard):** ✅ Most async handlers gate on `view !== 'queue'` / `if (!currentDebate)` checks before DOM writes. No confirmed stale-DOM writes found.

### Check 7 — Balance timing
- **TOCTOU between balance read and RPC:** No optimistic decrements exist. Client reads `token_balance`, shows it, then calls RPC. Server enforces balance check atomically. Two-tab TOCTOU is handled server-side.
- **Rollback on failure:** N/A — no optimistic UI to roll back.
- **src/tokens.ts, staking.rpc.ts, powerups.rpc.ts:** ✅ All wait for server confirmation before updating display.

---

## LM SUMMARY

| LM | Status | Finding |
|----|--------|---------|
| LM-009 | ❌ Broken | **TIMING-05** — duplicate key not handled as "already queued" |
| LM-022 | ✅ Clean | `noOpLock` present in `auth.core.ts`; passed to `createClient` auth config |
| LM-024 | ❌ Partial | 7 bare `.rpc()` calls found outside safeRpc; 1 HIGH (TIMING-01), 2 MEDIUM (TIMING-03), 4 LOW/intentional (TIMING-07/08) |
| LM-081 | ✅ Clean | `onAuthStateChange` callback uses `.then()/.catch()` chains — no `await` inside callback body |
| LM-087 | ✅ Clean | 60s `challengeRulingTimer` cleared in `cleanupFeedRoom()` (line 265); also in `unpauseFeed()` and `arena-state` reset |
| LM-140 | ✅ Clean | `safeRpc` in `auth.rpc.ts` detects 401/PGRST301/jwt-expired, refreshes session, retries once; signs out on refresh failure |
| LM-159 | ✅ Clean | `_dailyLoginInFlight` guard set synchronously before `await` (line 20); finally block resets it |
| LM-173 | ✅ Clean | `previouslyAnsweredIds.add(q.id)` is called BEFORE `await safeRpc` (line 135 then line 140), preventing double-count |
| LM-176 | ✅ Clean | `el.disabled = true` set synchronously at line 39 BEFORE `await activate(...)` at line 42 |
| LM-190 | ✅ Clean | Both `acceptBtn.disabled` and `declineBtn.disabled` set at lines 25-26 BEFORE `await safeRpc('respond_to_match')` at line 32 |
| LM-191 | ✅ Clean | `score_debate_comment` is the sole client call; `insert_feed_event` (point_award) is emitted server-side as part of the same atomic operation, delivered via Realtime |
| LM-194 | ✅ Clean | `handleModDisconnect` called only from `handleParticipantGone` which checks `disconnectHandled` guard at line 36 before calling; no retry logic; `.catch(warn)` swallows failure silently but double-call is structurally impossible |
| LM-225 | ✅ Clean | `arena-lobby.ts` imported via `void import(...).then(({ renderLobby }) => renderLobby())` — function only called inside the resolved `.then()` callback |

---

## TIMING SUMMARY

```
TIMING SUMMARY
CRITICAL: 0
HIGH: 1
MEDIUM: 4
LOW: 3

BY CATEGORY:
- double-tap: 1 finding (TIMING-04)
- polling-leak: 0 findings
- async-error: 7 findings (TIMING-01 through TIMING-03, TIMING-05 through TIMING-08)
- webrtc: 0 findings
- realtime-sub: 0 findings
- nav-corruption: 0 findings
- balance-timing: 0 findings

TOP 5 MOST LIKELY TO HIT A REAL USER:
1. TIMING-05 (LM-009 duplicate queue join) — any user who cancels and quickly rejoins on a flaky network will hit this; cancel RPC is fire-and-forget so silent failures are plausible
2. TIMING-02 (queue poll swallow) — any user on mobile in a spotty connection will silently sit in a broken queue with no feedback
3. TIMING-04 (auto-debate double-tap) — mobile users tapping voting buttons; two RPCs fire, results display shows the error-path "+1 optimistic" (line 66)
4. TIMING-01 (resolve_audition bare rpc) — less frequent but high-value bug: any audition debater whose session expires mid-debate loses their result permanently
5. TIMING-03 (plinko OAuth rpcs) — Safari users who have the auth delay bug will arrive at step 3 and silently get empty profiles

LM SUMMARY
✅ Clean: 12 — LM-022, LM-024 (4 intentional low), LM-081, LM-087, LM-140, LM-159, LM-173, LM-176, LM-190, LM-191, LM-194, LM-225
❌ Broken: 2 — LM-009 (TIMING-05), LM-024 HIGH path (TIMING-01) + MEDIUM path (TIMING-03)
```
