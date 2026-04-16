# STAGE 2.3 — FAILURE AND TIMING
### Attack Plan Stage 2.3 | Run as a standalone CC session. Do NOT mix with 2.1 or 2.2.

---

## YOUR JOB

Find every way the app fails under real runtime conditions — double-taps, leaked polls, async errors, WebRTC failure paths, cleanup gaps, navigation corruption, and balance timing bugs. These bugs only appear at runtime, not in static review. Your job is to find them statically.

Run all 7 checks below plus the LM hunting list. One combined report at the end.

Key files: `src/*.ts`, `src/pages/*.ts`, `src/arena/*.ts`

---

## 7 CHECKS

**Check 1 — Double-tap**
For every button click handler in the codebase:
- Is the button disabled synchronously (before the first `await`) OR is there a synchronous boolean guard variable set before the await?
- Neither = double-tap vulnerability.
- Focus specifically on: vote buttons, queue join, token-spending (buy modifier, buy powerup, place stake, sentiment tip), match accept/decline, follow/rival, modal confirm buttons, claim buttons (daily login, milestone, bounty).
- A disable that happens AFTER an await is not sufficient.

**Check 2 — Polling leaks**
For every `setInterval`, polling `setTimeout`, and Supabase `.subscribe()` / `.channel().on()`:
- Is there a matching `clearInterval` / `clearTimeout` / `removeChannel` / `unsubscribe`?
- Is cleanup called when the user navigates away from the page/screen?
- Can the poll or subscription be started twice (e.g. user navigates back, init runs again)? If so, do they stack?
- Does a failing poll silently continue forever, or does it eventually stop?
- Check specifically: tournament match poll, mod queue poll, presence channel, arena feed channel, heartbeat interval.

**Check 3 — Async error handling**
For every `await safeRpc(...)` and `await supabase.from(...).select(...)`:
- Is the returned `error` checked?
- What does the user see if the call fails — toast, error state, or silently nothing?
- Is the loading state / spinner cleaned up in the error path (not just the success path)?
- Can the user retry, or is the UI permanently stuck after a failure?
- Flag any `try { await rpc() } catch {}` that swallows errors without user feedback.

**Check 4 — WebRTC failures**
In `src/webrtc.ts`, `src/webrtc.peer.ts`, `src/webrtc.signaling.ts`, `src/webrtc.audio.ts`, `src/webrtc.ice.ts`:
- What happens when TURN credential fetch fails (`supabase/functions/turn-credentials`)? Does the debate start anyway on STUN only, or hang?
- What happens when `RTCPeerConnection` times out before connection? 30s timeout — does cleanup fire?
- ICE restart exhaustion — after max retries, is the user notified and returned to lobby?
- Mid-debate disconnect — does `endCurrentDebate` fire, or does the UI hang on a dead call?
- Track and stream cleanup — when the call ends, are all `MediaStreamTrack.stop()` calls made?

**Check 5 — Realtime subscription cleanup**
For every `.channel()` / `.subscribe()` in the codebase:
- Is there a matching `supabase.removeChannel()` called on cleanup?
- Is cleanup triggered on page navigation (popstate, visibility change, beforeunload)?
- Is `setAuth(accessToken)` called before subscribing to any private/authenticated channel?
- Can the same channel be subscribed twice? (User reopens a screen without cleanup firing)
- Check specifically: arena feed channel, spectator chat channel, presence channel, mod queue channel, private lobby channel.

**Check 6 — Navigation state corruption**
- Back button during an async operation: if the user hits back while an RPC is in-flight, does the response try to update DOM that's been destroyed?
- Back from debate room: does `endCurrentDebate()` / cleanup fire on popstate?
- Manual URL change mid-state: if user types a new URL while in the arena, does the old arena state get cleaned up?
- Tab background/foreground: when tab is backgrounded, do polls pause or continue? When foregrounded, do they resume correctly without stacking?
- Arena-specific: does navigating away from the arena room cleanly disconnect WebRTC and remove all Realtime subscriptions?

**Check 7 — Balance timing**
- Find every place the client reads `token_balance` from `currentProfile` and then uses that value to decide whether to allow a spend.
- Between the read and the RPC call: can a second tab spend those tokens first (TOCTOU)?
- Is there any optimistic UI (balance shown decremented before RPC confirms)? If yes, is there rollback on RPC failure?
- Check `src/tokens.ts`, `src/staking.rpc.ts`, `src/modifiers-rpc.ts`, `src/powerups.rpc.ts`, `src/arena/arena-bounty-claim.ts`.

---

## LM HUNTING LIST — CHECK EVERY ONE OF THESE

**LM-009:** `join_debate_queue` — find where queue join is called. If the RPC returns a duplicate key error (user already in queue), is it handled gracefully as "already queued, proceed to polling" or does the UI show an error and get stuck?

**LM-022:** `navigator.locks` — find `createClient` config in `src/config.ts`. Does it include `auth: { storage: ..., lock: noOpLock }`? If the `noOpLock` is missing, the auth session can deadlock on Safari/WebView.

**LM-024:** `.rpc()` usage — grep for `supabase.rpc(` (without `safeRpc`). Every direct `.rpc()` call is a missing error handler. List them all. Any in the arena or token paths are HIGH severity.

**LM-081:** `onAuthStateChange` callback — find the callback in `src/auth.core.ts` or `src/auth.ts`. Is there any `await` inside it? Any async operation inside the callback blocks the auth state machine. Flag any `await` found inside the callback body.

**LM-087:** 60-second reference auto-allow timeout — find the timer in reference ruling code. When the user navigates away before the 60s fires: does the timeout get cleared? If not, the callback fires against destroyed DOM.

**LM-140:** `safeRpc` wrapper coverage — confirm that `safeRpc` is the standard RPC wrapper and that it handles 401 (session expired) gracefully. If `safeRpc` does NOT handle 401 specially (e.g. trigger re-auth), direct RPC calls during an expired session will silently fail.

**LM-159:** `claim_daily_login` — find where it's called. This RPC uses a DROP + CREATE pattern internally. If called concurrently (two tabs), can both succeed? Is there a guard on the client side to prevent concurrent calls?

**LM-173:** `increment_questions_answered` — find where it's called. Can the same question be answered twice (browser back, form resubmit)? Is there client-side prevention of double-counting?

**LM-176:** `activate_power_up` — find the power-up activation handler. Before the activation RPC resolves, is the `activated` boolean set synchronously on the UI to prevent double-activation? If it waits for the response, a double-tap can activate twice.

**LM-190:** `player_a_ready` / `player_b_ready` — find the match accept handler. Is there a timing gap between the user clicking Accept and the RPC setting `player_a_ready = true`? Can the match be cancelled between user click and RPC completion?

**LM-191:** `score_debate_comment` and `insert_feed_event` — find both in `src/arena/`. These must always be called together. If one succeeds and the other fails, feed state diverges from score state. Is there any try/catch pattern that could let one succeed without the other?

**LM-194:** `record_mod_dropout` — find where it's called. On moderator dropout, exactly one 0-score must be recorded. Is there any retry logic, any error handler that retries on failure, that could result in two 0-scores?

**LM-225:** `arena-lobby.ts` chunk splitting — this was already checked in 2.1 wiring. Here, check the runtime side: if `arena-lobby.ts` is dynamically imported, is the import awaited before its functions are called? A missing `await` on a dynamic import will throw silently.

---

## OUTPUT FORMAT

**Per finding:**
```
TIMING-XX: [CRITICAL/HIGH/MEDIUM/LOW]
FILE: filename.ts:line
CATEGORY: (double-tap | polling-leak | async-error | webrtc | realtime-sub | nav-corruption | balance-timing)
WHAT: One sentence describing the bug
SCENARIO: The exact sequence of user actions that triggers this failure
FIX: The specific code change needed
```

**Summary block:**
```
TIMING SUMMARY
CRITICAL: N
HIGH: N
MEDIUM: N
LOW: N

BY CATEGORY:
- double-tap: N findings
- polling-leak: N findings
- async-error: N findings
- webrtc: N findings
- realtime-sub: N findings
- nav-corruption: N findings
- balance-timing: N findings

TOP 5 MOST LIKELY TO HIT A REAL USER:
1. TIMING-XX — [why it's likely]
2. ...

LM SUMMARY
✅ Clean: N — list them
❌ Broken: N — list them with TIMING reference number
```

---

## RULES

- Do NOT fix anything. Report only.
- Do NOT run wiring or security checks — those are 2.1 and 2.2.
- These are runtime bugs. Think about what happens under real conditions: slow network, fast fingers, tab switching, phone calls interrupting, battery saver mode.
- If you find a CRITICAL, flag it at the top before the full findings list.
- When done, save full output to `AUDIT-RESULTS-2-3-TIMING.md` in repo root and push to GitHub.
