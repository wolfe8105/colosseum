# THE MODERATOR — FRICTION-RIGHT SECURITY STRATEGY
### F-66 | Session 295 | April 21, 2026

> **What this is:** The security philosophy for The Moderator. Four defense layers, zero CAPTCHAs, zero false friction. Every gate earns its place by stopping a real attack vector without punishing legitimate users.
>
> **Guiding principle:** Security should be invisible to good actors and invisible to bad actors (until it's too late).

---

## THE FOUR LAYERS

### L1 — Cloudflare Turnstile (signup gate)

**Where:** Plinko signup flow, before OAuth redirect.

**What it stops:** Bot account creation. Turnstile is Cloudflare's invisible CAPTCHA replacement — no puzzles, no checkboxes. It runs a browser challenge in the background and returns a token. Server validates the token before allowing signup to proceed.

**Status:** NOT YET IMPLEMENTED. Requires adding Turnstile widget to `moderator-plinko.html` and server-side token validation (Vercel serverless function or Supabase Edge Function calling Cloudflare's `/siteverify` endpoint).

**Why Turnstile, not reCAPTCHA:**
- Zero user friction (invisible by default, escalates to non-interactive challenge only if suspicious)
- No Google tracking/data collection
- Free tier covers our scale
- Cloudflare is already in our stack

**Implementation plan:**
1. Create Turnstile site in Cloudflare dashboard → get site key + secret key
2. Add `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` to `moderator-plinko.html`
3. Add invisible widget div before OAuth button
4. On OAuth click: wait for Turnstile token → pass token to server → validate via Cloudflare API → proceed with OAuth redirect
5. Store secret key in Vercel environment variables (never client-side)

---

### L2 — SQL Depth Gates (participation gates)

**Where:** Server-side RPCs. Enforced in Postgres, bypassing the client is impossible.

**What it stops:** Low-effort throwaway accounts from poisoning data. A user must invest real time completing their profile (25%+ depth) before they can participate in ranked debates, tip, stake, or chat.

**Status:** SHIPPED (Session 295).

**Coverage:**

| RPC | Gate | Feature |
|-----|------|---------|
| `join_debate_queue` (ranked) | `profile_depth_pct >= 25` | F-64 |
| `cast_sentiment_tip` | `profile_depth_pct >= 25` | F-63 |
| `place_stake` | `profile_depth_pct >= 25` + tier gate | F-63 |
| `send_spectator_chat` | `profile_depth_pct >= 25` | F-63 |
| `check_ranked_eligible` | `profile_depth_pct >= 25` (advisory) | Pre-existing |

**Client pre-flight:** `src/depth-gate.ts` exports `isDepthBlocked()` which checks `getCurrentProfile()?.profile_depth_pct` and shows a confirm dialog redirecting to the profile-depth page. This is UX polish — the server enforces regardless.

**Design decision — why 25%, not higher:**
- 25% is roughly 3 questionnaire sections completed (out of 12)
- Takes 2-3 minutes of genuine effort — enough to deter drive-by accounts
- Low enough that legitimate new users aren't frustrated
- Can be raised later without breaking anything (all gates read from the same column)

**Threshold sync warning:** The 25% threshold appears in 7 places (see LM-227). Grep for `profile_depth_pct.*25` in SQL and `DEPTH_THRESHOLD` in TS before changing.

---

### L3 — Invisible Velocity Detection (fraud flagging)

**Where:** Inside `vote_arena_debate()` RPC. Runs on every vote. Zero client awareness.

**What it stops:** Coordinated vote manipulation — bot farms or multi-account vote stuffing where many votes for the same side arrive in a suspiciously short window.

**Status:** SHIPPED (Session 295).

**How it works:**
1. After each vote INSERT, count same-side votes in the last 10 seconds
2. If count > 5: flag the debate (`velocity_flagged_at`, increment `velocity_flag_count`), log `vote_velocity_flag` event
3. Vote still goes through — zero friction, zero user awareness
4. Flagged debates are reviewed manually via admin query

**Why flag-and-log instead of block:**
- False positives are inevitable (a viral debate could legitimately get 6+ votes in 10 seconds)
- Blocking votes creates visible friction and tips off attackers
- Log data builds a pattern library for future automated response
- Manual review at our scale (pre-launch) is feasible and more accurate

**Tuning:** Threshold (>5) and window (10s) live only in `vote_arena_debate()`. See LM-230. Start conservative, tighten based on real data.

**Future escalation path (not building now):**
- Auto-quarantine: if a debate gets flagged 3+ times, hold new votes in a `pending_review` state
- IP correlation: cross-reference flagged votes with IP addresses from `event_log` metadata
- Account age weighting: votes from accounts < 24 hours old count for less in flag calculations

---

### L4 — Rate Limit Coverage Audit

**Where:** `check_rate_limit()` function in `admin.sql`. Shared infrastructure used by individual RPCs.

**How it works:** Sliding window counter per (user, action) pair. Each RPC that calls `check_rate_limit` specifies its own window (minutes) and max count. Expired windows are cleaned up on each call.

**Current coverage:**

| Action Key | Window | Max | RPC | Notes |
|-----------|--------|-----|-----|-------|
| `vote` | 60 min | 60 | `cast_vote` | Legacy path (uses `debates` table) |
| `create_debate` | 60 min | 5 | `create_debate` | Legacy |
| `debate_card` | 60 min | 10 | `create_debate_card` | F-68 unified feed |
| `challenge` | 60 min | 5 | `create_challenge` | Legacy (hot-takes.sql, RPCs dropped) |
| `hot_take` | 60 min | 10 | `create_hot_take` | Legacy (dropped) |
| `prediction_create` | 60 min | 10 | `create_prediction_question` | |
| `prediction_pick` | 60 min | 30 | `pick_prediction` | |
| `prediction` | 60 min | 20 | `place_prediction` | |
| `profile_update` | 60 min | 20 | `update_profile` (×2 overloads) | |
| `report` | 60 min | 5 | `submit_report` | |

**Gap analysis — write RPCs WITHOUT rate limits:**

| RPC | Risk | Recommendation |
|-----|------|----------------|
| `vote_arena_debate` | Medium | Has F-65 velocity detection but no per-user rate limit. Add `check_rate_limit(v_uid, 'arena_vote', 60, 120)`. |
| `cast_sentiment_tip` | Low | Token cost is natural rate limit. Optional: add `check_rate_limit` for abuse. |
| `send_spectator_chat` | Medium | Has 3-second cooldown per debate but no global limit. Add `check_rate_limit(v_user_id, 'spectator_chat', 60, 200)`. |
| `react_debate_card` | Low | Toggle pattern (add/remove) limits abuse. Fine as-is. |
| `cancel_debate_card` | Low | Can only cancel own open cards. Fine as-is. |
| `accept_challenge` | Low | One per card (status transition). Fine as-is. |
| `forge_reference` | Medium | No rate limit found. Add `check_rate_limit(v_uid, 'forge_reference', 60, 10)`. |
| `follow_user` / `declare_rival` | Low | Social actions, low-impact. Fine for now. |
| `join_debate_queue` | Low | Queue cleanup on re-join prevents stacking. Fine as-is. |
| `place_stake` | Low | Token cost + one-per-debate. Fine as-is. |
| `create_group` | Medium | No rate limit found. Add `check_rate_limit(v_uid, 'create_group', 1440, 3)` (3 per day). |

**Priority additions (do next):**
1. `vote_arena_debate` — 120/hour
2. `send_spectator_chat` — 200/hour
3. `forge_reference` — 10/hour
4. `create_group` — 3/day

---

## PRINCIPLES

**No CAPTCHAs.** Ever. CAPTCHAs punish humans more than bots. Modern bots solve CAPTCHAs faster than humans do. Turnstile's invisible challenge is the only acceptable signup gate.

**Fail closed, not open.** Every depth gate and rate limit defaults to blocking if the check errors. The ranked picker in `arena-config-settings.ts` catches errors and blocks entry (`console.warn... blocking ranked entry to prevent fail-open`). This pattern must be followed everywhere.

**Defense in depth, not defense in one place.** Client gates are UX polish. Server gates are enforcement. Both exist for every protected action. If either fails, the other catches it.

**Invisible to legitimate users.** None of the four layers should ever be noticed by a real user playing normally. Turnstile is invisible. Depth gates prompt profile completion (positive action). Velocity detection is silent. Rate limits are set high enough that normal usage never hits them.

**Log everything, block selectively.** At our scale, false positives are more damaging than false negatives. Log suspicious activity aggressively, flag for review, and only auto-block when the signal is unambiguous (like a user exceeding 120 votes in an hour).

---

## WHAT THIS DOC IS NOT

This is not a penetration test. This is not a compliance checklist. This is the security philosophy that guides implementation decisions. For specific technical details, see:

- `THE-MODERATOR-SECURITY-ROADMAP.md` — phased rollout by user count
- `THE-MODERATOR-LAND-MINE-MAP.md` — LM-226 through LM-230 for threshold sync warnings
- `AUDIT-FINDINGS.md` — full 63-file audit results
