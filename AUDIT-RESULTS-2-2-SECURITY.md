# AUDIT RESULTS — STAGE 2.2: ADVERSARIAL SECURITY SCAN
**Date:** 2026-04-16
**Auditor:** Claude Code (adversarial black-hat pass)
**Scope:** `src/`, `api/`, arena sub-modules, auth sub-modules, token economy, realtime subscriptions

---

## ⚠️ CRITICAL FLAGS (none — see HIGH below)

No CRITICAL findings. One HIGH finding with a clear exploit path.

---

## FULL FINDINGS

---

### SEC-01: HIGH
**FILE:** `src/arena/arena-mod-refs-ai.ts:56-58`
**WHAT:** Any exception from the AI moderator Edge Function causes the reference to be automatically allowed.
**EXPLOIT:**
1. Attacker submits a reference (URL + description) that forces an Anthropic API error — e.g., a description string containing ~8,000 tokens of text, exceeding the context limit.
2. The `fetch()` to `/functions/v1/ai-moderator` returns a non-2xx status or throws.
3. The `catch` block fires: `ruleOnReference(referenceId, 'allowed', '🤖 Auto-allowed (AI moderator unavailable)', 'ai')`.
4. Reference is unconditionally allowed. Repeat for every reference. Attacker gets unlimited fabricated evidence accepted in live ranked debates.
**CHAIN:** SEC-01 + SEC-02 = attacker uses bogus references with forged "human" ruling type to obscure the AI-allow signature in logs.
**FIX:** In the `catch` block of `requestAIModRuling`, default to `'denied'` instead of `'allowed'`, or queue for human review instead of auto-allowing. Auto-allow is the wrong safe-fallback direction for a moderation system.

---

### SEC-02: MEDIUM
**FILE:** `src/auth.moderator.ts:107-111`
**WHAT:** `p_ruled_by_type` is fully client-controlled in the `ruleOnReference` call. A moderator can forge a "human" ruling type on any ruling, including rulings produced by the AI path.
**EXPLOIT:**
1. Authenticated moderator calls `ruleOnReference(refId, 'allowed', 'reason', 'human')` directly via browser console.
2. The `rule_on_reference` RPC receives `p_ruled_by_type = 'human'` from the client.
3. If the RPC stores this value without override, the ruling log shows a human decision instead of an AI decision — masking automation or eliminating accountability in disputed rulings.
**CHAIN:** SEC-01 + SEC-02 = auto-allow from AI error gets re-stamped as human ruling for audit trail evasion.
**FIX:** Remove `p_ruled_by_type` from the client-facing RPC signature. The DB should determine `ruled_by_type` based on the calling role or a separate trusted path. Client should never set ruling provenance.

---

### SEC-03: MEDIUM
**FILE:** `src/arena/arena-feed-realtime.ts:41-71`
**WHAT:** Private Realtime channel is subscribed without an explicit `setAuth(session.access_token)` call. The Supabase client passes the JWT implicitly only if a session exists at subscription time.
**EXPLOIT:**
1. `subscribeRealtime(debateId)` is called during debate initialization, potentially before `INITIAL_SESSION` resolves if timing is tight.
2. The channel is created with `{ config: { private: true } }` but no explicit auth token set.
3. If the client subscribes before the JWT is available, the Realtime server receives the subscription without auth context.
4. Depending on Supabase Realtime RLS policy for `debate_feed_events`, an unauthenticated subscriber may receive feed messages from private live debates.
**CHAIN:** Standalone — information disclosure from live debate transcripts.
**FIX:** Add `channel.setAuth(getSupabaseClient()?.auth.getSession()?.access_token)` before `.subscribe()`, or ensure `subscribeRealtime` is only ever called after `ready` resolves.

---

### SEC-04: MEDIUM
**FILE:** `src/arena/arena-config-settings.ts:65-77`
**WHAT:** The 25% profile depth check for ranked mode is client-side only. An attacker can bypass the UI picker and enter ranked queues without meeting the requirement.
**EXPLOIT:**
1. Open browser DevTools console.
2. Execute: `import('/src/arena/arena-state.ts').then(m => m.set_selectedRanked(true))` — or simply manipulate the in-memory state after module load.
3. Call `joinServerQueue(mode, topic)` directly. `p_ranked: true` is sent with no server-side check.
4. The `join_debate_queue` RPC does not call `check_ranked_eligible` — that check only exists in the UI picker flow.
5. User enters ranked debate with 0% profile depth.
**CHAIN:** SEC-04 + SEC-01 = under-profiled attacker enters ranked, spams AI-moderated references with forced ALLOW, games ELO.
**FIX:** Add `check_ranked_eligible` enforcement inside the `join_debate_queue` SQL function (not just in the picker UI). The RPC should refuse `p_ranked = true` if `profile_depth_pct < 25`.

---

### SEC-05: MEDIUM
**FILE:** `src/arena/arena-room-end.ts:23` / `src/arena/arena-room-end-finalize.ts:138,146`
**WHAT:** `endCurrentDebate()` has no idempotency guard. If called twice concurrently (e.g., round-timer expiry fires while an opponent-disconnect event also triggers end), `settleStakes` and `settle_sentiment_tips` may execute twice for the same debate.
**EXPLOIT:**
1. In a live debate, a race condition can be triggered if both the hard round timer fires and the opponent disconnects within the same JS event loop tick.
2. Both paths call `endCurrentDebate()` before the first sets `view = 'postDebate'` (the state update is synchronous but the guard check happens at the top of the function — async execution continues).
3. Two calls to `settleStakes(debate.id)` reach the server. If `settle_stakes` lacks a DB-level idempotency lock, winners are paid out twice.
**CHAIN:** Standalone — token economy double-spend.
**FIX:** Add an in-flight guard at the top of `endCurrentDebate()`:
```typescript
if (view === 'postDebate') return;
set_view('postDebate'); // move this to top, before all async work
```
Also add a DB-level unique constraint or status check in `settle_stakes` to prevent double settlement.

---

### SEC-06: LOW
**FILE:** `src/arena/arena-feed-realtime.ts:42-43`
**WHAT:** `debate_feed_events` Postgres changes subscription uses a filter `debate_id=eq.${debateId}` where `debateId` is a runtime value. If `debateId` is not UUID-validated before being interpolated into the filter string, malformed values could corrupt the subscription filter.
**EXPLOIT:** Unlikely to escalate to RCE but could cause filter parsing errors or subscribe to unintended rows.
**CHAIN:** Low standalone risk.
**FIX:** Assert `isUUID(debateId)` before creating the channel.

---

### SEC-07: LOW
**FILE:** `src/pages/groups.members.ts:72`
**WHAT:** `avatar_url` is rendered into an `<img src>` attribute using `esc()` (HTML escape only) without an `https://` protocol validation. Allows rendering of `http://` tracking images or `data:` URIs from Supabase.
**EXPLOIT:**
1. A user sets their avatar to an `http://attacker.com/pixel.gif?id=USER_ID` URL via direct Supabase API manipulation (bypassing client-side URL validation).
2. The URL gets stored in the `profiles` table.
3. When the group members list renders, an `<img src="http://attacker.com/pixel.gif">` is injected, leaking the viewer's IP to the attacker.
4. `javascript:` URIs in `<img src>` are inert in modern browsers — no XSS risk.
**CHAIN:** Low standalone.
**FIX:** Apply `sanitizeAvatarUrl()` (from `api/profile.helpers.js`) logic in client-side rendering: only allow `https://` URLs or `emoji:` prefix for `avatar_url` in `<img>` tags.

---

### SEC-08: LOW
**FILE:** `src/async.actions-react.ts:12-46` (LM-015)
**WHAT:** The react button is not DOM-disabled during the RPC call. The `reactingIds` Set prevents re-entrancy but the button remains visually interactive.
**EXPLOIT:** Rapid double-clicks within the same JS microtask are guarded by `state.reactingIds.has(takeId)` check synchronously. The guard is synchronous before `await`, so actual double-sends are blocked. No exploitable double-reaction. However, UX deception: button appears clickable while guarded.
**CHAIN:** Low/informational.
**FIX:** Add `btn.disabled = true` synchronously on click, remove on completion. This matches the spectate vote pattern which does this correctly.

---

### SEC-09: LOW
**FILE:** `src/auth.follows.ts:9` (LM-055)
**WHAT:** `followUser(targetUserId)` validates UUID format but does not check `targetUserId !== getCurrentUser()?.id` client-side. A user can call `followUser(own_id)` from the console.
**EXPLOIT:** User follows themselves. Follow count increments. Self-follows in the `follows` table skew follower/following displays.
**CHAIN:** Low — social engineering / fake popularity signal.
**FIX:** Add `if (targetUserId === getCurrentUser()?.id) return { success: false, error: 'Cannot follow yourself' }` before the RPC call. Server RPC should also have this guard.

---

### SEC-10: LOW
**FILE:** `src/auth.rivals.ts:9-20` (LM-016)
**WHAT:** `declareRival` goes straight to the RPC without checking the local rival count against the 5-cap. The button rendering does not verify cap before display.
**EXPLOIT:** In the standard UI flow, the Rival button UI may check the cap separately. However, if a user calls `declareRival()` directly 6+ times from the console, the server RPC is the only gate.
**CHAIN:** Low — social spam.
**FIX:** Check `rivals.length >= 5` client-side before showing the button and before calling `declareRival()`. The RPC already enforces server-side; this is defense-in-depth.

---

### SEC-11: LOW
**FILE:** `src/arena/arena-room-end-finalize.ts:160-161`
**WHAT:** `_sb.rpc('resolve_audition_from_debate', ...)` is called via a dynamic import of `getSupabaseClient()` while a module-level `safeRpc` is already in scope (see LM-END-003 comment). The redundant dynamic import adds latency and may resolve a stale/different client instance.
**EXPLOIT:** Not a security vulnerability per se, but the pattern creates a footgun: if auth state changes between the module-level import and the dynamic import, two different Supabase client instances may be used in the same finalize sequence, leading to token state inconsistency.
**CHAIN:** Low — potential auth token mismatch on long-running debates.
**FIX:** Replace all three redundant dynamic imports in `finalizeDebate` with the already-imported module-level `safeRpc`.

---

### SEC-12: LOW / INFORMATIONAL
**FILE:** `src/config.ts:75`
**WHAT:** Supabase anon key is hardcoded as a fallback constant. The key is the public anon key (designed to be client-visible), not a service_role key.
**EXPLOIT:** Not exploitable beyond its design intent — anon key has no elevated privileges.
**CHAIN:** None.
**FIX:** The pattern is correct. Note: ensure `DEEPGRAM_API_KEY` remains a placeholder and is never committed with a real key.

---

## STEP 1 — ATTACK SURFACE MAP SUMMARY

### RPC calls with user-controlled params:
| RPC | User-Controlled Params | Source |
|-----|------------------------|--------|
| `react_hot_take` | `p_hot_take_id` (from DOM `data-id`) | Rendered take IDs from Supabase |
| `join_debate_queue` | `p_ranked`, `p_category`, `p_topic`, `p_ruleset` | UI state vars |
| `rule_on_reference` | `p_reference_id`, `p_ruling`, `p_reason`, **`p_ruled_by_type`** | Direct function param |
| `place_stake` | `p_debate_id`, `p_side`, `p_amount` | Form input |
| `submit_reference` | `p_debate_id`, `p_content` (URL), `p_reference_type` | Form input |
| `forge_reference` | All forge fields | Form inputs (no cost param — server calculates) |
| `follow_user` | `p_target_user_id` | DOM `data-user-id` attribute |
| `declare_rival` | `p_target_id`, `p_message` | DOM + optional text |
| `vote_arena_debate` | `p_vote` (`'a'`/`'b'`) | Button click |

### Direct `.from()` calls (not going through RPC):
- `auth.follows.ts`: `.from('follows').select()` — read-only, filtered by `following_id` / `follower_id` — OK
- `async.fetch.ts`: `.from('hot_takes').select()` and `.from('hot_take_reactions').select()` — read-only — OK
- `arena-room-end-finalize.ts:160`: `_sb.rpc()` dynamic import — see SEC-11

### User input entry points:
- URL params: `?spectate=` (UUID-validated ✅), `?returnTo=` (path-validated ✅), `?group=`, `?id=`, `?screen=`
- Forms: hot-take textarea, forge form fields, profile bio/username/display_name
- DOM data-attributes: `data-id`, `data-user-id`, `data-username`, `data-side`
- localStorage: auth session JWT, profile depth answers, vote key

### HTML render points assessed:
- `async.render.takes.ts`: All user content uses `esc()` alias for `escapeHTML` ✅
- `groups.members.ts:72`: avatar_url in `<img src>` — HTML-escaped but no https:// validation ⚠️ (SEC-07)
- `home.profile.ts`: emoji/initial rendering via `escapeHTML` ✅
- `api/profile.html.js`: `escapeHtml()` on all string fields + `sanitizeAvatarUrl()` ✅

---

## STEP 4 — PRIVILEGE ESCALATION SUMMARY

| Attack Vector | Client Guard | Server Enforcement |
|---------------|-------------|-------------------|
| Non-moderator calling moderator RPCs | UI-only (is_moderator profile check) | RPC must enforce — untested |
| Setting `p_ruled_by_type = 'human'` as AI | None — fully client-controlled | RPC trusts client param ⚠️ |
| Entering ranked without 25% profile | UI picker only | Not enforced in `join_debate_queue` ⚠️ |
| `credit_tokens` from client | No client call found ✅ | Service-role only |
| User A affecting User B tokens | No direct RPC path | Server enforces auth.uid() ✅ |
| `settleStakes` called by debater | Indirect (only via debate end flow) | Server enforces debate ownership |

---

## LM SUMMARY

✅ **Clean (10 items):**
- LM-011 — No `credit_tokens` call anywhere in `src/`
- LM-012 — Balance checked in `placeStake` + `requireTokens` before RPC
- LM-015 — `reactingIds` Set guard synchronous before await (no double-send); button UX is LOW concern
- LM-086 — `forge_reference` cost is server-calculated, not client-passed
- LM-128 — Actually checked via `check_ranked_eligible` RPC in UI… but NOT enforced in `join_debate_queue` server RPC ⚠️ → see SEC-04
- LM-142 — `returnTo` validated to relative paths only in both `login.ts` and `plinko-helpers.ts`
- LM-158 — Server-side rendering uses `sanitizeAvatarUrl` (https-only). Client-side groups uses esc() only (LOW, see SEC-07)
- LM-182 — `settle_stakes` called once in normal flow; double-call requires concurrent `endCurrentDebate()` (see SEC-05)
- LM-207 — No `is_bot` or bot-UUID parameter exposed in any client citation call
- LM-055 — Self-follow not blocked client-side (LOW, see SEC-09)

❌ **Broken/Flagged (7 items):**
- LM-010 — **Not applicable as written** — `arena_votes` table/RPC not found in client code. Vote button in spectate IS disabled synchronously ✅. Vote in debate-landing uses render-state guard (no DOM disable) — LOW
- LM-016 — `declare_rival` has no client-side cap check before call (SEC-10)
- LM-110 — AI mod auto-allows on ANY exception (SEC-01) — **HIGH**
- LM-112 — `p_ruled_by_type` is client-controlled (SEC-02) — MEDIUM
- LM-128 — Client-side 25% check only; `join_debate_queue` RPC does not enforce (SEC-04) — MEDIUM
- LM-141 — Cannot verify from client source; requires SQL review of `group_members` RLS policy
- LM-193 — No `setAuth()` before `.subscribe()` on private channel (SEC-03) — MEDIUM

---

## SECURITY SUMMARY

```
SECURITY SUMMARY
CRITICAL: 0
HIGH:     1
MEDIUM:   4
LOW:      7

TOP 3 ATTACK CHAINS:

1. SEC-01 + SEC-04 = Under-profiled attacker bypasses ranked gate,
   then guarantees all their evidence is accepted by triggering AI
   moderator API errors with oversized payloads. Earns ELO from
   debates they would not legitimately qualify for.

2. SEC-01 + SEC-02 = Attacker forces AI mod to auto-allow fabricated
   references, then re-stamps the ruling as type='human' to obscure
   the automation in moderation logs. Audit trail integrity destroyed.

3. SEC-03 + (future) = Private live debate channels subscribed without
   explicit JWT setAuth. If Supabase Realtime RLS is misconfigured
   or absent on debate_feed_events, unauthenticated browser tabs can
   subscribe to private debate feeds by guessing debate IDs.
```
