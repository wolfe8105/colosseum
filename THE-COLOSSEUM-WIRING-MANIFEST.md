# THE COLOSSEUM — WIRING MANIFEST
### Last Updated: Session 122 (Initial Draft)

> **What this is:** A plain-text architecture model inspired by Scryer's C4 hierarchy.
> Maps every touchpoint so Claude can answer: "If I change X, what breaks?"
> Organized by layer: Defense → Tokens → Arena → Social → Bot Army.
>
> **How to read it:** Each RPC/global/flow entry has CALLED FROM, EXPECTS, BLAST RADIUS.
> Search any function name, RPC name, or status value to find everything that touches it.
>
> **How to maintain it:** End of each session, update affected entries. Add new RPCs/flows as built.

---

# SECTION 1: CONTAINERS (C4 Level 2 — The Big Picture)

```
┌─────────────────────────────────────────────────────────────────┐
│                        THE COLOSSEUM                            │
├──────────────┬──────────────┬───────────────┬───────────────────┤
│  FRONTEND    │  BACKEND     │  BOT ARMY     │  MIRRORS          │
│  (Vercel)    │  (Supabase)  │  (VPS/PM2)    │  (Cloudflare)     │
│              │              │               │                   │
│  9 HTML      │  Auth        │  bot-engine   │  mirror-generator │
│  pages       │  PostgreSQL  │  6 leg files  │  50+ static pages │
│  13 JS       │  30+ RPCs    │  ai-generator │  analytics beacon │
│  modules     │  RLS policies│  card-gen     │                   │
│              │  Edge Funcs  │  PM2 crons    │                   │
│              │  Realtime    │               │                   │
└──────────────┴──────────────┴───────────────┴───────────────────┘

Communication:
  Frontend → Backend: supabase.rpc() calls only (no direct table writes)
  Frontend → Backend: supabase.auth for session management
  Bot Army → Backend: supabase service_role client (bypasses RLS)
  Mirrors → Frontend: links only (static HTML → Vercel app)
  Frontend → External: Groq (via Edge Functions only, never client-direct)
```

---

# SECTION 2: WIRING MANIFEST — DEFENSE LAYER

## 2.1 AUTH SYSTEM (colosseum-auth.js → window.ColosseumAuth)

### ColosseumAuth (Global)
- DEFINED IN: colosseum-auth.js (IIFE, exposes window.ColosseumAuth)
- PROVIDES: .ready (Promise), .safeRpc(), .getUser(), .getProfile(), .signIn(), .signOut(), .updateProfile(), .showUserProfile(), follows/rivals RPCs, moderator RPCs
- CONSUMED BY: Every other JS module. This is the god object.
- INIT SEQUENCE: createClient() with noOpLock config → onAuthStateChange(INITIAL_SESSION) → resolves .ready → 5s safety timeout fallback
- LAND MINES: LM-031 (noOpLock required), LM-078 (INITIAL_SESSION sole path), LM-185 (IIFE modules must use ColosseumAuth.safeRpc not bare safeRpc)

### ColosseumAuth.safeRpc(rpcName, params)
- DEFINED IN: colosseum-auth.js
- PURPOSE: Wrapper around supabase.rpc() with 401 recovery (auto-refresh session on auth failure)
- CALLED FROM: Every module that talks to Supabase. This is THE entry point for all RPC calls from the frontend.
  - colosseum-auth.js (internal profile/follow/rival/moderator calls)
  - colosseum-async.js (hot takes, predictions, challenges)
  - colosseum-arena.js (arena RPCs, debate lifecycle)
  - colosseum-staking.js (place_stake, get_stake_pool, settle_stakes)
  - colosseum-powerups.js (power-up inventory RPCs)
  - colosseum-notifications.js (mark_notifications_read)
  - colosseum-leaderboard.js (leaderboard queries)
  - colosseum-tokens.js (claim_action_tokens)
  - colosseum-payments.js (Stripe-related RPCs)
  - index.html inline scripts (carousel counts, etc.)
- EXPECTS: Valid Supabase session. If 401, attempts session refresh then retries once.
- BLAST RADIUS: If this breaks, THE ENTIRE APP stops talking to the backend. Every feature dies.
- LAND MINES: LM-185 (IIFE modules MUST use ColosseumAuth.safeRpc(), never bare safeRpc() — it doesn't exist at window scope)

### ColosseumAuth.ready (Promise)
- DEFINED IN: colosseum-auth.js
- PURPOSE: Resolves when auth state is known (logged in or anonymous). All modules await this before rendering.
- CONSUMED BY: Every HTML page's init script (await ColosseumAuth.ready)
- BLAST RADIUS: If this never resolves, the entire app hangs on loading screen. 5s safety timeout exists as fallback.
- LAND MINES: LM-031 (noOpLock), LM-078 (INITIAL_SESSION)

### supabase.auth.onAuthStateChange
- DEFINED IN: colosseum-auth.js (inside createClient setup)
- PURPOSE: Sole entry point for auth initialization. Listens for INITIAL_SESSION event only.
- EXPECTS: Supabase client with noOpLock: true in auth config (prevents navigator.locks API which blocks in some browsers)
- BLAST RADIUS: If the event name changes or Supabase SDK updates the event system, auth breaks for all users.
- LAND MINES: LM-031, LM-078. Do NOT add other auth state listeners. Do NOT await inside the callback.

---

## 2.2 RLS + SECURITY DEFINER PATTERN

### Castle Defense Architecture
- RULE: All client writes go through SECURITY DEFINER RPCs. No direct table inserts/updates from frontend.
- RLS provides read-side access control. RPCs provide write-side validation + business logic.
- SECURITY DEFINER RPCs run as `postgres` role — they bypass RLS and the guard trigger.
- Client JS calls ColosseumAuth.safeRpc() → hits the RPC → RPC validates auth.uid() internally → performs write.

### guard_profile_columns (Trigger)
- DEFINED IN: Supabase (on profiles table, BEFORE UPDATE)
- PROTECTS: level, xp, streak_freezes, questions_answered (4 columns only)
- ACTION: RAISE EXCEPTION if a non-service-role UPDATE touches these columns
- BYPASSED BY: SECURITY DEFINER RPCs (they run as postgres)
- BLAST RADIUS: If you need to backfill any of these 4 columns via Supabase dashboard, you must disable the trigger first, update, re-enable.
- DOES NOT PROTECT: elo_rating, token_balance, wins, losses, tier, stripe fields — these rely on RLS + RPC-only patterns, NOT the trigger
- LAND MINES: LM-171 (corrected list — was documented as 21 columns, actually 4), LM-001, LM-085

### check_rate_limit(p_action, p_identifier, p_max, p_window)
- DEFINED IN: Supabase RPC
- PURPOSE: Atomic rate limiting with pg_advisory_xact_lock to prevent race conditions
- CALLED FROM: Multiple RPCs internally (create_hot_take, place_stake, create_group_challenge, etc.)
- EXPECTS: Action name string, user ID or fingerprint, max count, time window
- BLAST RADIUS: If advisory lock logic changes, rate limits become raceable. Session 56 specifically locked this down.
- LAND MINES: LM-056

### sanitize_text(input) / sanitize_url(input)
- DEFINED IN: Supabase (utility functions)
- PURPOSE: XSS prevention at DB boundary. Strips dangerous characters/tags.
- CALLED FROM: Every RPC that accepts user text input (create_hot_take, update_profile_section, etc.)
- BLAST RADIUS: If bypassed, stored XSS becomes possible. Frontend also has escapeHTML() but DB layer is the real gate.

---

## 2.3 TOKEN SYSTEM

### profiles.token_balance (Column)
- DEFINED IN: profiles table
- MODIFIED BY: award_tokens (credit), debit_tokens (debit), place_stake (debit), claim_action_tokens (credit)
- READ BY: Every module that shows token count, staking panel, power-up shop, paywall gates
- BLAST RADIUS: This is the single source of truth for user wealth. If any RPC miscounts, the entire economy breaks.
- NOT trigger-protected — relies on RPC-only access pattern

### award_tokens(p_user_id, p_amount, p_reason) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Credit tokens to a user
- CALLED FROM: settle_stakes (payout winners), achievement system, daily claims, admin tools
- EXPECTS: Valid user ID, positive amount, reason string for audit
- BLAST RADIUS: If called with wrong amount or wrong user, tokens appear from nowhere. Economy inflation.

### debit_tokens(p_user_id, p_amount) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER, service_role ONLY)
- PURPOSE: Remove tokens from a user
- CALLED FROM: Server-side only. Staking debit goes through place_stake which handles its own debit internally.
- LOCKED TO: service_role — cannot be called from frontend. This was a critical Session 46 fix (was callable by any auth user = unlimited tokens).
- BLAST RADIUS: If this ever becomes callable from anon/authenticated role, users can drain anyone's tokens.
- LAND MINES: LM-046

### claim_action_tokens(p_action, p_ref_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Award tokens for user actions (hot_take, reaction, prediction, vote, debate). Daily cap enforced server-side.
- CALLED FROM: colosseum-tokens.js via ColosseumAuth.safeRpc()
  - claimHotTake() → p_action: 'hot_take'
  - claimReaction() → p_action: 'reaction'
  - claimPrediction() → p_action: 'prediction'
  - claimVote() → p_action: 'vote'
- EXPECTS: Valid auth, action type string, reference ID (take/debate/prediction ID)
- BLAST RADIUS: If daily cap logic breaks, users farm infinite tokens.
- LAND MINES: LM-011, LM-160

---

## 2.4 STAKING SYSTEM

### place_stake(p_debate_id, p_user_id, p_amount, p_predicted_winner) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: User bets tokens on a debate outcome
- CALLED FROM: colosseum-staking.js → ColosseumAuth.safeRpc('place_stake', {...})
- EXPECTS:
  - debate status IN ('pending', 'lobby', 'matched') — NOT 'live'
  - user has sufficient token_balance
  - amount within tier limit (tier system gates max stake)
- DEBITS: Tokens immediately on stake placement
- BLAST RADIUS:
  - If status check changes → staking breaks for any debate type that doesn't match
  - AI debates start as 'pending' (LM-184), flip to 'live' in enterRoom(). Staking window = between creation and enterRoom().
  - If enterRoom() is bypassed, debate stays 'pending' forever, stakes never settle
- LAND MINES: LM-184 (pending vs live), LM-185 (safeRpc scope)

### get_stake_pool(p_debate_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Returns current pool totals for a debate (side_a amount, side_b amount, stake count)
- CALLED FROM: colosseum-staking.js → renderStakingPanel()
- EXPECTS: Valid debate ID
- BLAST RADIUS: Low — read-only. But if it returns stale data, UI shows wrong pool size.

### settle_stakes(p_debate_id, p_winner) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER, service_role recommended)
- PURPOSE: Parimutuel payout. Winners split losers' pool proportionally.
- CALLED FROM: colosseum-arena.js → endCurrentDebate() (settlement call after debate completes)
- EXPECTS: Debate must be completed, winner must be 'a' or 'b'
- TRIGGERS: award_tokens for each winner, creates stake_won/stake_lost notifications
- STATUS: NOT FULLY TESTED as of Session 121 — staking places correctly, settlement untested
- BLAST RADIUS: If called twice, double payout. If called with wrong winner, wrong people get paid. If never called, tokens locked in limbo forever.
- LAND MINES: LM-184

---

## 2.5 QUESTIONNAIRE TIER SYSTEM

### profiles.questions_answered (Column)
- DEFINED IN: profiles table (added Session 117)
- MODIFIED BY: increment_questions_answered RPC only
- PROTECTED BY: guard_profile_columns trigger (RAISE EXCEPTION on direct UPDATE)
- READ BY: colosseum-tiers.js, staking tier checks, power-up slot gates
- BLAST RADIUS: Controls staking limits and power-up access. If inflated, users bypass tier gates.

### increment_questions_answered(p_count) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Safely increment questions_answered by batch count
- CALLED FROM: colosseum-profile-depth.html → saveSection() (counts newly answered questions only)
- EXPECTS: auth.uid() valid, p_count between 1 and 50
- DOUBLE-COUNT PREVENTION: Frontend tracks previouslyAnsweredIds Set. Only new answers sent.
- BLAST RADIUS: If double-counted, user reaches higher tiers faster → gets staking/power-up access early.
- LAND MINES: LM-172 (tier thresholds vs available questions), LM-173 (double-counting prevention)

### Tier Thresholds
- Tier 0 Unranked: 0 questions
- Tier 1 Spectator+: 10 questions (5 token max stake, 0 power-up slots)
- Tier 2 Contender: 25 questions (25 token max, 1 slot)
- Tier 3 Gladiator: 50 questions (100 token max, 2 slots) — UNREACHABLE (only 39 questions exist)
- Tier 4 Champion: 75 questions — UNREACHABLE
- Tier 5 Legend: 100 questions — UNREACHABLE
- DEFINED IN TWO PLACES: colosseum-tiers.js (client display) AND server RPCs (enforcement). BOTH MUST CHANGE TOGETHER.
- LAND MINES: LM-172

---

# SECTION 3: WIRING MANIFEST — ARENA LAYER

## 3.1 DEBATE LIFECYCLE

### arena_debates (Table — SINGLE CANONICAL TABLE)
- DEFINED IN: Supabase
- STATUS FLOW: pending → lobby → matched → live → completed
- AI DEBATES: Created as 'pending' (not 'live'). Flip to 'live' happens in enterRoom().
- LEGACY: Old `debates` table eliminated Session 101. ALL code uses arena_debates.
- LAND MINES: LM-184 (pending vs live for AI debates), LM-101 (single table)

### create_ai_debate(p_topic, p_category, p_user_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Creates an AI sparring debate
- CALLED FROM: colosseum-arena.js → when user selects AI Sparring mode
- INSERTS WITH: status = 'pending' (was 'live' before Session 121 fix)
- BLAST RADIUS: If status reverts to 'live', place_stake breaks for AI debates (status not in allowed set)
- LAND MINES: LM-184

### enterRoom(debateId) (JS Function)
- DEFINED IN: colosseum-arena.js
- PURPOSE: Transitions from pre-debate screen to active debate room
- DOES:
  1. Calls update_arena_debate({p_status: 'live'}) for AI debates
  2. Renders debate room UI
  3. Starts AI sparring rounds (if AI mode)
- BLAST RADIUS: If this function is bypassed or the status update RPC fails, the debate stays 'pending' forever. Staking settlement looks for 'completed' status — 'pending' debates never settle.
- LAND MINES: LM-184

### update_arena_debate(params) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: General-purpose debate field updater (status, scores, winner, etc.)
- CALLED FROM: colosseum-arena.js (status transitions, score updates, end-of-debate)
- EXPECTS: Caller must be debate participant or have appropriate role
- BLAST RADIUS: Wide — controls the entire debate state machine. Wrong status = broken staking, broken settlement, broken spectator queries.

---

## 3.2 NAVIGATION / POPSTATE (Session 121 Rewrite)

### History State Management
- PATTERN: Forward navigation uses replaceState (no history.back race). Back/cancel uses history.back().
- REMOVED: _skipNextPop boolean (was causing race conditions with dual overlays)
- closeRankedPicker(forward) — forward=true uses replaceState, forward=falsy uses history.back()
- closeModeSelect(forward) — same pattern
- CRITICAL: Event listener callbacks MUST be wrapped in arrow functions: `() => closeModeSelect()` — NOT `closeModeSelect` directly. The click Event object would pass as truthy `forward` param.
- LAND MINES: LM-183

---

## 3.3 POWER-UP SYSTEM

### Tables
- power_ups: Catalog of 4 power-ups (2x Multiplier, Silence, Shield, Reveal). id, name, description, cost, type.
- user_power_ups: User inventory. user_id, power_up_id, quantity. Purchased from shop.
- debate_power_ups: Equipped for a specific debate. user_id, debate_id, power_up_id, activated (boolean), activated_at (timestamp).

### buy_power_up(p_power_up_id, p_quantity) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Purchase a power-up from shop, deduct token_balance
- CALLED FROM: colosseum-powerups.js → ColosseumAuth.safeRpc('buy_power_up', {...})
- EXPECTS: auth.uid() valid, sufficient token_balance, valid power_up_id
- COLUMN: Uses `token_balance` (NOT `tokens` — LM-174 fix)
- BLAST RADIUS: If column name wrong, RPC fails with "column does not exist". Silent purchase failure.
- LAND MINES: LM-174 (token_balance not tokens)

### equip_power_up(p_debate_id, p_power_up_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Move a power-up from inventory into debate loadout
- CALLED FROM: colosseum-powerups.js → ColosseumAuth.safeRpc('equip_power_up', {...})
- EXPECTS: User owns the power-up (user_power_ups.quantity > 0), debate exists, slot available per tier
- INSERTS INTO: debate_power_ups with activated=false, activated_at=NULL
- BLAST RADIUS: Low — equip is reversible pre-debate.

### activate_power_up(p_debate_power_up_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Fire a power-up during active debate
- CALLED FROM: colosseum-powerups.js → ColosseumAuth.safeRpc('activate_power_up', {...})
- EXPECTS: debate_power_ups row exists with activated=false, activated_at IS NULL
- SETS: activated = true AND activated_at = now() (BOTH — LM-176 fix)
- BLAST RADIUS: If only activated_at set without activated=true, frontend shows power-up as still available after use.
- LAND MINES: LM-176 (must set both boolean AND timestamp)

### get_my_power_ups(p_debate_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Returns user's equipped power-ups for a debate with activation state
- CALLED FROM: colosseum-powerups.js → ColosseumAuth.safeRpc('get_my_power_ups', {...})
- READS: debate_power_ups.activated boolean to show UI state
- BLAST RADIUS: Low — read-only.

### Power-Up Types
- 2x Multiplier: Passive. Doubles staking payout on win. No activation button.
- Silence: Active. Mutes opponent for 10 seconds. Tap to activate during debate.
- Shield: Active. Blocks one reference challenge. Tap to activate.
- Reveal: Active. Shows opponent's equipped loadout. Tap to activate.

### Power-Up Frontend State (colosseum-powerups.js)
- DEFINED IN: colosseum-powerups.js (IIFE, no global — called from arena.js)
- DEPENDS ON: ColosseumAuth.safeRpc (LM-185 — must use full path, not bare safeRpc)
- STATE: activatedPowerUps Set, shieldActive flag, silenceTimer ref
- CLEANUP: All state cleared in renderLobby() and endCurrentDebate()
- RENDERS: Shop screen, equip screen (pre-debate loadout), in-debate activation bar
- BLAST RADIUS: If state not cleaned up, power-ups carry over between debates.

---

## 3.4 DEBATE ROOM WIRING

### showPreDebate(debateId) (JS Function)
- DEFINED IN: colosseum-arena.js
- PURPOSE: Renders pre-debate screen between matchmaking/creation and room entry
- DOES:
  1. Loads staking panel via colosseum-staking.js → renderStakingPanel()
  2. Loads power-up loadout via colosseum-powerups.js → renderLoadout()
  3. Shows ENTER BATTLE button → wired to enterRoom()
- BLAST RADIUS: This is the gate between creation and combat. If bypassed, no staking window exists.

### AI Sparring Round Loop
- DEFINED IN: colosseum-arena.js (inside enterRoom flow)
- FLOW:
  1. enterRoom() sets status to 'live' via update_arena_debate RPC
  2. First AI response fetched from Groq via ai-sparring Edge Function
  3. User types response → addMessage() renders in stream
  4. advanceRound() increments round counter
  5. When round >= totalRounds → 1.5s delay → endCurrentDebate()
- EDGE FUNCTION: ai-sparring (Supabase Edge Function, Deno.serve)
  - Uses Groq Llama 3.3 70B (not 3.1 — decommissioned)
  - Populist personality, full conversation memory, round-aware
  - GROQ_API_KEY stored as Supabase secret
- ROUND TIMER: startLiveRoundTimer() → counts down ROUND_DURATION (120s) → calls advanceRound()
- BLAST RADIUS: If Edge Function fails, AI never responds. Debate hangs. No timeout/fallback currently.

### endCurrentDebate() (JS Function)
- DEFINED IN: colosseum-arena.js
- PURPOSE: Terminates debate, generates scores, triggers settlement, renders post-debate
- DOES:
  1. Sets view = 'postDebate', clears roundTimer
  2. Cleans up WebRTC (if live audio mode)
  3. Generates scores (scoreA, scoreB — currently random 60-90 range)
  4. Determines winner ('a' or 'b' — higher score)
  5. Calls update_arena_debate RPC: p_status='complete', p_winner, p_score_a, p_score_b
  6. Calls settle_stakes(debate.id, winner) for staking payout
  7. Claims debate tokens via ColosseumTokens
  8. Cleans up power-up state (activatedPowerUps, shieldActive, silenceTimer)
  9. Renders post-debate screen (verdict, scores, rematch/share/lobby buttons)
- BLAST RADIUS: WIDE — this is where money moves. settle_stakes pays out tokens. If scores are wrong, wrong person wins. If RPC fails silently, tokens stuck in pool forever.
- LAND MINES: LM-175 (settle_stakes was joining on pool_id not debate_id — fixed Session 118)

### Post-Debate Screen
- DEFINED IN: colosseum-arena.js (rendered inside endCurrentDebate)
- SHOWS: Win/loss verdict, score display, opponent info
- BUTTONS:
  - Rematch → enterQueue(debate.mode, debate.topic) — re-enters general queue, does NOT preserve opponent
  - Share Result → ColosseumShare.shareDebateResult() — NOTE: share.js exports shareResult not shareDebateResult (known bug, fallback to navigator.share)
  - Back to Lobby → renderLobby()
  - Transcript → opens bottom sheet with full message history (Session 113)
  - Add Rival → wired Session 97 (E144/E145/E149), degrades gracefully when opponentId null
- BLAST RADIUS: Low — display only. But if settle_stakes already failed, the post-debate screen shows a result that doesn't match the token reality.

---

## 3.5 SPECTATOR SYSTEM

### colosseum-spectate.html (Standalone Page)
- DEFINED IN: colosseum-spectate.html (Session 114)
- PURPOSE: Watch a live or completed debate without participating
- LOADS: auth.js, config.js — uses ColosseumAuth.safeRpc for RPCs
- ROUTING: Arena lobby feed cards with data-link attribute → navigate to this page (arena debates) or auto-debate page (auto debates)

### get_arena_debate_spectator(p_debate_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Fetch debate + both participant profiles (names, elo, avatars) for spectator view
- CALLED FROM: colosseum-spectate.html on load
- EXPECTS: Valid debate ID
- RETURNS: Debate data + joined profile data for both sides
- BLAST RADIUS: Low — read-only. If profiles missing, names show as fallback.

### bump_spectator_count(p_debate_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Increment spectator count on arena_debates
- CALLED FROM: colosseum-spectate.html on load
- BLAST RADIUS: Low — counter only. But visible to debaters if they check.

### vote_arena_debate(p_debate_id, p_side) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Spectator votes for side A or B
- CALLED FROM: colosseum-spectate.html vote buttons
- BLAST RADIUS: Low — advisory votes, don't affect scoring directly.

### Spectator Features (Sessions 114-115)
- Message stream with round dividers, auto-polling (5-second interval for live debates)
- Spectator chat (Session 115) — live chat sidebar for spectators
- Audience pulse gauge (Session 115) — real-time sentiment visual showing which side is winning
- Share buttons, CTA for non-users
- LAND MINE: Arena lobby feed cards — only auto-debate cards have data-link set. User debate "SPECTATE" button renders but clicking does nothing (partially unwired).

---

## 3.6 SCORING SYSTEM

### colosseum-scoring.js
- DEFINED IN: colosseum-scoring.js (window.ColosseumScoring)
- PURPOSE: Elo calculation, XP awards, level progression
- READS: profiles table (SELECT only — no writes from this module)
- BLAST RADIUS: Low in isolation — display calculations. But Elo values feed into Ranked mode matchmaking.
- NOTE: Elo only moves in Ranked mode. Casual = Elo frozen.

### Score Generation (Current State)
- IN endCurrentDebate(): scoreA and scoreB are random (60 + Math.floor(Math.random() * 30))
- Winner = higher score
- THIS IS PLACEHOLDER SCORING — not skill-based. Will need replacement before real competitive play.
- AI moderator Edge Function (ai-moderator) exists for more nuanced scoring but is not wired into the main flow.

---

# SECTION 4: WIRING MANIFEST — SOCIAL LAYER

## 4.1 HOT TAKES

### create_hot_take(p_body, p_category) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- CALLED FROM: colosseum-async.js → postTake()
- VALIDATES: auth, rate limit, sanitize_text on body, category enum
- TOKEN GATE: 25 tokens required
- BLAST RADIUS: If rate limit breaks, spam floods the feed. If sanitize skipped, XSS in feed.

### react_hot_take(p_take_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Toggle fire reaction (add/remove in one RPC)
- CALLED FROM: colosseum-async.js → toggle handler
- BLAST RADIUS: Low — self-contained toggle. But token claim fires only on add (data.reacted===true).

---

## 4.2 NOTIFICATIONS

### ColosseumNotifications (Global)
- DEFINED IN: colosseum-notifications.js (window.ColosseumNotifications)
- POLLS: Every 30 seconds for unread count
- CATEGORIES: challenge, stake_won, stake_lost, follow, rival, group, system
- mark_notifications_read RPC: Bulk mark via ColosseumAuth.safeRpc()
- BLAST RADIUS: If polling breaks, users never see notifications. Bell stays stale.

---

# SECTION 5: WIRING MANIFEST — BOT ARMY LAYER

## 5.1 BOT ARCHITECTURE

### Service Role Client
- DEFINED IN: /opt/colosseum/bot-army/colosseum-bot-army/supabase-client.js (VPS)
- USES: service_role key (bypasses RLS entirely)
- BLAST RADIUS: If this key leaks, attacker has full DB access. Key is in .env on VPS only.
- NOT IN REPO: VPS-only file

### bot-engine.js (Orchestrator)
- DEFINED IN: VPS only (/opt/colosseum/bot-army/colosseum-bot-army/)
- PURPOSE: PM2-managed cron scheduler. Runs leg1, leg2, leg3 cycles.
- CONSUMES: bot-config.js for flags, env vars for credentials
- BLAST RADIUS: If this crashes, all automated content stops. PM2 auto-restarts.

### bot-config.js
- DEFINED IN: BOTH repo root AND VPS
- PURPOSE: Env loader, validator, platform flags, timing config
- CRITICAL: maxPerDay default is 3 (matched to .env). Bluesky config section + flags + credential validation.
- LAND MINES: LM-149 (repo and VPS copies must stay in sync)

---

# SECTION 6: FLOWS (Key User Journeys)

## FLOW 1: Anonymous User → First Stake
```
1. User arrives via Bluesky link → mirror page (Cloudflare)
2. Clicks CTA → colosseum-plinko.html (signup)
3. Signs up → onAuthStateChange INITIAL_SESSION fires → ColosseumAuth.ready resolves
4. Lands on index.html → spoke carousel renders
5. Clicks ARENA tile → colosseum-arena.html loads
6. Clicks AI SPARRING → renderAISparring()
7. Picks mode → closeModeSelect(forward=true) → replaceState [NO history.back]
8. Pre-debate screen renders → showPreDebate()
9. loadStakingPanel() renders in pre-debate → colosseum-staking.js
10. Panel shows "Answer 10 more questions to unlock staking" (tier gate)
11. User goes to profile-depth → answers 10 questions → increment_questions_answered
12. Returns to arena → now Tier 1 (5 token max)
13. Places stake → ColosseumAuth.safeRpc('place_stake') → tokens deducted
14. Clicks ENTER BATTLE → enterRoom() → update_arena_debate({p_status:'live'})
15. AI debate plays through → rounds via Groq Edge Function
16. Debate ends → endCurrentDebate() → settle_stakes → award_tokens to winner
17. Notification: stake_won/stake_lost appears in bell
```

## FLOW 2: Bot Content Pipeline
```
1. PM2 cron triggers bot-engine.js cycle
2. Leg 2: leg2-news-scanner.js fetches RSS → headlines
3. ai-generator.js sends headline to Groq → gets hot take text
4. leg2-debate-creator.js → supabase service_role → create debate in arena_debates
5. card-generator.js → generates ESPN-style share card image
6. leg2-bluesky-poster.js → posts image + link to Bluesky
7. Leg 3: leg3-auto-debate.js → full AI debate pipeline
8. Auto-debate saved → mirror-generator picks it up on next 5-min cron
9. Mirror page deployed to Cloudflare Pages
```

## FLOW 3: Auth Init (Every Page Load)
```
1. HTML loads → <script> tags load config.js, auth.js, then page-specific modules
2. createClient() called with noOpLock: true in auth config
3. onAuthStateChange listener registered — ONLY listens for INITIAL_SESSION
4. INITIAL_SESSION fires → _checkSession() runs → fetches profile if logged in
5. ColosseumAuth.ready resolves
6. If no event in 5s → safety timeout resolves .ready anyway (anonymous mode)
7. All other modules' init code runs (they were awaiting ColosseumAuth.ready)
8. Page renders
```

## FLOW 4: AI Debate Room Lifecycle (Full Detail)
```
1. User on pre-debate screen → showPreDebate(debateId)
2. Staking panel loads → renderStakingPanel() [colosseum-staking.js]
3. Power-up loadout loads → renderLoadout() [colosseum-powerups.js]
4. User optionally stakes tokens → place_stake RPC (status must be 'pending')
5. User optionally equips power-ups → equip_power_up RPC
6. User clicks ENTER BATTLE → enterRoom(debateId)
7. enterRoom() calls update_arena_debate({p_status: 'live'}) → status flips
8. AI sparring: first AI response fetched from Groq via ai-sparring Edge Function
9. User types response → addMessage() → advanceRound()
10. Round timer (120s) auto-advances if user doesn't respond
11. User may activate power-ups mid-debate → activate_power_up RPC
12. When round >= totalRounds → 1.5s delay → endCurrentDebate()
13. endCurrentDebate(): generates scores (random 60-90), picks winner
14. update_arena_debate RPC: p_status='complete', p_winner, p_score_a, p_score_b
15. settle_stakes(debate.id, winner) → parimutuel payout via award_tokens
16. Token claim via ColosseumTokens
17. Power-up state cleanup (activatedPowerUps, shieldActive, silenceTimer)
18. Post-debate screen renders (verdict, buttons: Rematch/Share/Lobby/Transcript)
19. Notifications created: stake_won or stake_lost in bell
```

## FLOW 5: Spectator Journey
```
1. User on arena lobby → sees active/recent debate cards
2. Card has data-link → click navigates to colosseum-spectate.html?id=<debate_id>
3. Page loads → get_arena_debate_spectator RPC (fetches debate + profiles)
4. bump_spectator_count RPC (increments viewer counter)
5. Message stream renders with round dividers
6. If debate is live → 5-second polling for new messages
7. Vote buttons → vote_arena_debate RPC (side A or B)
8. Spectator chat sidebar (if enabled)
9. Audience pulse gauge shows real-time sentiment
10. CTA for non-users → links to Plinko signup
```

---

# SECTION 7: CONTRACTS (Always / Never Rules)

## ALWAYS
- Use `ColosseumAuth.safeRpc()` for all frontend RPC calls — never bare `supabase.rpc()`
- Use `ColosseumAuth.safeRpc()` in IIFE modules — never bare `safeRpc()` (doesn't exist at window scope)
- Use `replaceState` for forward navigation in overlays — never `history.back()` for forward
- Wrap event listener callbacks in arrow functions when target function has boolean params: `() => fn()` not `fn`
- Use `escHtml()` from colosseum-config.js for HTML escaping — never duplicate the function
- Insert new debates as status `'pending'` — flip to `'live'` in `enterRoom()` only
- Gate all table writes behind SECURITY DEFINER RPCs — never direct INSERT/UPDATE from client
- Run `sanitize_text()` on all user-provided text inside RPCs before storage
- Use `check_rate_limit()` in any RPC that creates content or performs a significant action
- Await `ColosseumAuth.ready` before rendering auth-gated content
- Keep `noOpLock: true` in Supabase createClient auth config
- Set BOTH `activated = true` AND `activated_at = now()` when activating power-ups — never one without the other
- Clean up power-up state (activatedPowerUps, shieldActive, silenceTimer) in both `renderLobby()` and `endCurrentDebate()`
- Use `token_balance` as the column name in all RPCs — never `tokens` (LM-174)
- Join stakes on `debate_id` — never `pool_id` (LM-175)

## NEVER
- Call `debit_tokens()` from frontend — it's locked to service_role for a reason
- Add auth state listeners beyond INITIAL_SESSION — it breaks the init sequence
- Reference window-scope functions from inside IIFE modules without going through their exposed global
- Insert debates with status `'live'` directly — always start as `'pending'`
- Trust the guard trigger to protect columns beyond its actual 4 (level, xp, streak_freezes, questions_answered)
- Assume the drawio edge map is current — use THIS document instead
- Modify tier thresholds in only one place — client (colosseum-tiers.js) AND server RPCs must match
- Use `history.back()` in forward navigation — replaceState only
- Set `activated_at` without also setting `activated = true` — frontend reads the boolean
- Reference column `tokens` in any RPC — the column is `token_balance`

## ASK PAT FIRST
- Any change to RLS policies
- Any change to the guard trigger's protected column list
- Any new SECURITY DEFINER RPC
- Any change to the auth init sequence
- Any change to the status flow (pending → lobby → matched → live → completed)
- Any new Edge Function deployment

---

# SECTION 8: SOURCE MAP (File → Responsibility)

| File | Layer | Exposes | Key Dependencies |
|------|-------|---------|-----------------|
| colosseum-config.js | Foundation | window.ColosseumConfig, escHtml(), showToast() | None (loaded first) |
| colosseum-auth.js | Defense | window.ColosseumAuth (.ready, .safeRpc, .getUser, .getProfile) | config.js, Supabase SDK |
| colosseum-tokens.js | Defense | window.ColosseumTokens (.claimHotTake, .claimReaction, etc.) | auth.js (safeRpc) |
| colosseum-tiers.js | Defense | window.ColosseumTiers (.getTier, .renderTierBadge) | None (pure utility) |
| colosseum-staking.js | Arena | IIFE (no global) — called from arena.js | auth.js (ColosseumAuth.safeRpc) |
| colosseum-powerups.js | Arena | IIFE (no global) — called from arena.js | auth.js (ColosseumAuth.safeRpc) |
| colosseum-arena.js | Arena | window.ColosseumArena (lobby, matchmaking, debate room, pre-debate) | auth.js, staking.js, powerups.js, tokens.js |
| colosseum-async.js | Social | window.ColosseumAsync (hot takes, predictions, challenges) | auth.js, tokens.js |
| colosseum-notifications.js | Social | window.ColosseumNotifications | auth.js |
| colosseum-leaderboard.js | Social | window.ColosseumLeaderboard | auth.js |
| colosseum-payments.js | Payments | window.ColosseumPayments | auth.js, Stripe SDK |
| colosseum-paywall.js | Payments | window.ColosseumPaywall (.gate) | auth.js |
| colosseum-share.js | Growth | window.ColosseumShare | config.js |
| colosseum-cards.js | Growth | window.ColosseumCards (canvas share card gen) | None |
| colosseum-analytics.js | Growth | window.ColosseumAnalytics (page_view, events) | Supabase anon client |

---

# MAINTENANCE LOG

| Session | Entries Changed | What Happened |
|---------|----------------|---------------|
| 122 | Initial draft | Defense layer, arena basics, flows, contracts |
| 122 | Arena expansion | Power-ups (4 RPCs + tables + state), debate room wiring (showPreDebate, AI round loop, endCurrentDebate full trace), spectator system (3 RPCs + page), scoring, 2 new flows |

---

> **GAPS IN THIS DRAFT (to fill as we touch them):**
> - Groups RPCs (create_group, join_group, create_group_challenge, respond, resolve)
> - Moderator RPCs (set_moderator_mode, submit_evidence, etc.)
> - Edge Functions detail (ai-sparring params, ai-moderator, stripe-checkout, stripe-webhook)
> - Profile CRUD RPCs (update_profile_section, soft_delete_account, etc.)
> - Predictions system (place_prediction, create_prediction_question, resolve_predictions)
> - Achievement system (scan_achievements)
> - Cosmetics shop RPCs (purchase_cosmetic, equip_cosmetic)
> - Analytics layer (log_event, daily_snapshots, 9 views)
> - Payments layer (Stripe products, checkout flow, webhook handling)
> - Full HTML page → JS module loading order for each page
> - Bot army leg-by-leg detail (which RPCs each leg calls on the backend)
