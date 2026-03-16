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
- TRIGGERS: claim_action_tokens (p_action: 'hot_take') on success
- BLAST RADIUS: If rate limit breaks, spam floods the feed. If sanitize skipped, XSS in feed.

### react_hot_take(p_take_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Toggle fire reaction (add/remove in one RPC)
- CALLED FROM: colosseum-async.js → toggle handler
- TRIGGERS: claim_action_tokens (p_action: 'reaction') only on ADD (data.reacted===true), not on remove
- BLAST RADIUS: Low — self-contained toggle.

### Challenge Flow (Hot Take → Arena)
- DEFINED IN: colosseum-async.js → _showChallengeModal()
- FLOW: User taps ⚔️ BET button on a hot take → modal with counter-argument textarea → creates challenge record → challenge→arena wiring (Session 97, E83)
- TOKEN GATE: 50 tokens required for challenge
- BLAST RADIUS: Creates DB record only. Does not auto-navigate to arena. Opponent must accept.

---

## 4.2 PREDICTIONS SYSTEM

### Debate-Linked Predictions
- DEFINED IN: colosseum-async.js → placePrediction()
- PURPOSE: Side bet on an existing arena debate outcome
- FLOW: Predictions tab → vote buttons (side a/b) → place_prediction RPC → optimistic UI
- TOKEN GATE: 100 tokens to place prediction
- AUTH GATE: Must be logged in
- TRIGGERS: claim_action_tokens (p_action: 'prediction') on success

### Standalone Predictions (Session 113)

### prediction_questions (Table)
- DEFINED IN: Supabase (Session 113)
- COLUMNS: id, creator_id, topic, side_a_label, side_b_label, category, status (open/closed/resolved), resolved_winner (a/b/null), picks_a, picks_b, created_at, resolved_at
- RLS: SELECT open to all. INSERT only own rows. Writes via SECURITY DEFINER RPCs.

### prediction_picks (Table)
- DEFINED IN: Supabase (Session 113)
- COLUMNS: id, question_id, user_id, pick (a/b), created_at
- UNIQUE CONSTRAINT: (question_id, user_id) — one pick per user per question
- SUPPORTS SIDE-SWITCHING: User can change pick; counts adjust both sides.

### create_prediction_question(p_topic, p_side_a_label, p_side_b_label, p_category) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- CALLED FROM: colosseum-async.js → openCreatePredictionForm() → submit handler
- VALIDATES: auth, rate limit (10/hr), sanitize_text on all inputs, topic 10-200 chars, labels 1-50 chars
- BLAST RADIUS: Low — creates a question. If rate limit breaks, prediction spam.

### get_prediction_questions() (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- CALLED FROM: colosseum-async.js → fetchStandaloneQuestions()
- RETURNS: Open prediction questions sorted by recency
- BLAST RADIUS: Low — read-only.

### pick_prediction(p_question_id, p_pick) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- CALLED FROM: colosseum-async.js → pickStandaloneQuestion()
- VALIDATES: auth, rate limit (30/hr), question must be open, pick must be 'a' or 'b'
- SIDE-SWITCH: If user already picked, swaps side and adjusts both pick counts atomically
- BLAST RADIUS: Low. But if pick counts drift from actual picks rows, UI shows wrong percentages.

---

## 4.3 GROUPS SYSTEM

### colosseum-groups.html (Standalone Page)
- DEFINED IN: colosseum-groups.html (Session 49, expanded Session 105/116)
- ROUTE: /groups via vercel.json
- TABS: Discover, My Groups, Rankings (3 tabs in lobby view)
- GROUP DETAIL VIEW: Shows header, members, hot takes, challenges

### create_group(p_name, p_description, p_category, p_is_public, p_avatar_emoji) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- CALLED FROM: colosseum-groups.html → submitCreateGroup()
- VALIDATES: auth, name min 2 chars, sanitize_text
- AUTO-OPENS: On success, calls openGroup(result.group_id)
- BLAST RADIUS: Low — creates group, user becomes owner.

### join_group(p_group_id) / leave_group(p_group_id) (RPCs)
- DEFINED IN: Supabase RPCs (SECURITY DEFINER)
- CALLED FROM: colosseum-groups.html → toggleMembership()
- AUTH GATE: Unauthenticated → plinko redirect with returnTo param
- OWNER PROTECTION: Owner cannot leave (button disabled, "YOU OWN THIS GROUP")
- BLAST RADIUS: Low — membership toggle. Adjusts member count display optimistically.

### get_group_details(p_group_id) / get_group_members(p_group_id, p_limit) / get_my_groups() / get_group_leaderboard() (RPCs)
- DEFINED IN: Supabase RPCs (SECURITY DEFINER)
- CALLED FROM: colosseum-groups.html (various tab/detail loaders)
- BLAST RADIUS: Low — all read-only.

### Group Hot Takes (Session 105)
- GROUP DETAIL has a hot take composer for group-scoped takes
- Takes stored in hot_takes table with section = groupId
- loadGroupHotTakes() reads and displays them
- BLAST RADIUS: Low — uses existing hot_takes infrastructure.

### Group vs Group Challenges (Session 116)

### group_challenges (Table)
- DEFINED IN: Supabase (Session 116)
- STATUS FLOW: pending → accepted/declined/expired → live → completed
- AUTO-EXPIRY: 48 hours for pending challenges
- SELF-PREVENTION: Group cannot challenge itself

### create_group_challenge(p_challenger_group_id, p_defender_group_id, p_topic, p_category, p_format) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- CALLED FROM: colosseum-groups.html → GvG challenge modal
- VALIDATES: auth, rate limit (3 pending/group), duplicate detection, self-challenge prevention
- FORMAT: 1v1, 3v3, or 5v5
- BLAST RADIUS: Creates challenge record. Does not start debate.

### respond_to_group_challenge(p_challenge_id, p_response) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- CALLED FROM: colosseum-groups.html → accept/decline buttons via data-* attributes + event delegation
- EXPECTS: Defender-only (auth check), challenge not expired, response = 'accepted' or 'declined'
- BLAST RADIUS: If accepted, challenge transitions to matchable state. If logic allows non-defender to respond, challenges can be hijacked.

### resolve_group_challenge(p_challenge_id, p_winner_group_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER, admin-only)
- PURPOSE: End challenge, calculate Group Elo changes
- BLAST RADIUS: Moves Group Elo. If called with wrong winner, wrong group gets Elo boost.

### get_group_challenges(p_group_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Priority-sorted challenge list for a group
- BLAST RADIUS: Low — read-only.

---

## 4.4 PROFILE SYSTEM

### colosseum-auth.js Profile Methods (via window.ColosseumAuth)
- updateProfile(updates) — Updates display_name, avatar_url, bio, username via safeRpc('update_profile', {...})
  - Only safe fields: display_name, avatar_url, bio, username
  - Updates local currentProfile cache after success
- getProfile() — Returns cached currentProfile
- showUserProfile(userId) — Opens modal showing another user's profile (elo, wins, bio, follow/rival buttons)
- deleteAccount() — Calls safeRpc('soft_delete_account') → clears local state → signs out

### update_profile_section(p_section, p_answers) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Save profile depth questionnaire answers for a section
- CALLED FROM: colosseum-profile-depth.html → saveSection()
- VALIDATES: auth, sanitize_text on answers
- BLAST RADIUS: Low — writes to profile_depth_answers. But saveSection also calls increment_questions_answered which affects tier.

### soft_delete_account() (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Mark account as deleted (soft delete, data retained)
- CALLED FROM: colosseum-settings.html → deleteAccount flow (type "DELETE" to confirm)
- BLAST RADIUS: User loses access. Data preserved for legal retention.

### Avatar System (Session 113)
- FORMAT: avatar_url stores either a URL or 'emoji:⚔️' format
- PARSING: parseEmojiAvatar(avatarUrl) → returns emoji string or null
- PICKER: 20 emoji options in bottom sheet on profile page
- RENDERED IN: Profile screen, nav bar avatar, showUserProfile modal, public /u/username page (api/profile.js), hot takes feed (async.js)
- BLAST RADIUS: If emoji format changes, every avatar render point breaks. 6+ locations parse this format.

### Bio System (Session 113)
- 500 character limit, inline edit on profile page
- Saved via updateProfile({ bio }) → update_profile RPC
- Displayed via textContent (XSS-safe) in profile, _escHtml() in innerHTML contexts

---

## 4.5 FOLLOWS & RIVALS

### follow_user(p_target_id) / unfollow_user(p_target_id) (RPCs)
- DEFINED IN: Supabase RPCs (SECURITY DEFINER)
- CALLED FROM: colosseum-auth.js → followUser() / unfollowUser() → safeRpc
- UI: Follow button in showUserProfile() modal, follower/following lists on profile page
- BLAST RADIUS: Low — social graph edges. No token implications.

### declare_rival(p_target_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- CALLED FROM: colosseum-auth.js → declareRival() → used in showUserProfile modal and post-debate screen
- UI: ⚔️ RIVAL button. One-directional (you declare, they don't have to accept).
- BLAST RADIUS: Low — creates social graph edge. Feeds rival display in async.js.

### Followers/Following List (Session 113)
- Tap follower/following count on profile → bottom sheet with list
- Each row: initial avatar, name, elo. Tap → showUserProfile(userId)
- Uses existing getFollowers()/getFollowing() methods

---

## 4.6 NOTIFICATIONS

### ColosseumNotifications (Global)
- DEFINED IN: colosseum-notifications.js (window.ColosseumNotifications)
- POLLS: Every 30 seconds for unread count
- CATEGORIES: challenge, stake_won, stake_lost, follow, rival, group, system
- mark_notifications_read RPC: Bulk mark via ColosseumAuth.safeRpc()
- BLAST RADIUS: If polling breaks, users never see notifications. Bell stays stale.
- CREATED BY: Various RPCs server-side (settle_stakes creates stake_won/stake_lost, follow_user creates follow notification, etc.)

---

## 4.7 LEADERBOARD

### colosseum-leaderboard.js (window.ColosseumLeaderboard)
- DEFINED IN: colosseum-leaderboard.js
- TABS: Elo, Wins, Streak
- TIME FILTERS: All time, This week, Today
- MY RANK: Shows current user's position
- DATA: Reads from profiles via ColosseumAuth.safeRpc (leaderboard query RPCs)
- ROW CLICKS: data-username delegation → showUserProfile()
- BLAST RADIUS: Low — display only. But if Elo values are wrong in profiles, leaderboard is wrong.

---

# SECTION 4B: WIRING MANIFEST — PAYMENTS LAYER

## 4B.1 STRIPE INTEGRATION

### Current Status
- MODE: Sandbox (not live). Deploy for real when Stripe goes live.
- PRODUCTS: 3 subscription tiers (Contender $9.99/mo, Champion $19.99/mo, Creator $29.99/mo) + 4 token packs (50/$0.99, 250/$3.99, 600/$7.99, 1500/$14.99)
- NOTE: Token packs are in the UI but tokens are currently earned-only, never purchased. Revenue model pivoted to B2B data licensing. Consumer purchases may reactivate later.

### colosseum-payments.js (window.ColosseumPayments)
- DEFINED IN: colosseum-payments.js
- PURPOSE: Client-side module. Redirects to Stripe-hosted checkout. No payment logic on client — ever.
- PROVIDES: .subscribe(tier, billing), .buyTokens(packId)
- FLOW: User clicks UPGRADE/BUY → JS calls Edge Function → Edge Function creates Stripe Checkout session → user redirected to Stripe-hosted page → Stripe handles payment → webhook fires back
- DEPENDS ON: ColosseumAuth (needs user ID for checkout session)
- BLAST RADIUS: If Edge Function down, checkout fails silently. User sees nothing happen.

### colosseum-paywall.js (window.ColosseumPaywall)
- DEFINED IN: colosseum-paywall.js
- PURPOSE: 4 contextual paywall variants. gate() helper checks if user can access a feature.
- PROVIDES: .gate(feature) → returns true (allowed) or shows paywall modal (blocked)
- CALLED FROM: Various modules before gated actions
- BLAST RADIUS: Low — display/gating only. If gate logic wrong, users see paywall when they shouldn't (or don't when they should).

## 4B.2 EDGE FUNCTIONS (STRIPE)

### stripe-checkout (Supabase Edge Function)
- DEFINED IN: Supabase Edge Functions (Deno.serve)
- PURPOSE: Creates Stripe Checkout session server-side
- EXPECTS: User ID, product type (subscription/token pack), tier/billing info
- RETURNS: Stripe Checkout URL for redirect
- SECURITY: CORS allowlist (Vercel domain only). Stripe secret key lives in Supabase secrets — never in client code.
- STATUS: Template only — NOT deployed. Deploy when activating Stripe for real users.
- LAND MINES: Templates use old imports (noted in NT Known Bugs). Must update imports before deploy.

### stripe-webhook (Supabase Edge Function)
- DEFINED IN: Supabase Edge Functions (Deno.serve)
- PURPOSE: Receives Stripe webhook events, processes payments
- SECURITY:
  - Raw body via req.text() for HMAC signature verification (not req.json() — destroys signature)
  - Idempotency via stripe_processed_events table (INSERT ON CONFLICT DO NOTHING) — prevents double-processing
  - Webhook signing secret stored in Supabase secrets
- HANDLES 4 EVENT TYPES:
  1. checkout.session.completed → activates subscription OR credits tokens
  2. invoice.paid → renews subscription (extends period)
  3. invoice.payment_failed → flags account for grace period
  4. customer.subscription.deleted → downgrades to free tier
- WRITES TO: profiles (subscription fields), token_balance (via award_tokens), payments table (transaction log)
- STATUS: Template only — NOT deployed.
- BLAST RADIUS: CRITICAL when live. If webhook fails, user pays but gets nothing. If idempotency breaks, double-credit. If signature verification removed, fake payments possible.
- LAND MINES: req.text() not req.json() for HMAC. Session 48 hardened this specifically.

### stripe_processed_events (Table)
- DEFINED IN: Supabase (Migration 21, Session 48)
- PURPOSE: Idempotency guard. Stores processed Stripe event IDs.
- PATTERN: INSERT ON CONFLICT DO NOTHING — if event already processed, skip silently
- BLAST RADIUS: If this table is cleared or dropped, all historical events could reprocess on retry.

## 4B.3 EDGE FUNCTIONS (AI)

### ai-sparring (Supabase Edge Function)
- DEFINED IN: Supabase Edge Functions (Deno.serve)
- PURPOSE: Proxy between frontend and Groq API for AI debate opponent
- MODEL: Groq Llama 3.3 70B Versatile (NOT 3.1 — decommissioned)
- PERSONALITY: Populist, full conversation memory, round-aware
- CALLED FROM: colosseum-arena.js during AI sparring rounds
- SECURITY: CORS allowlist (Vercel domain only). GROQ_API_KEY in Supabase secrets.
- BLAST RADIUS: If Groq key invalid or quota exceeded, AI never responds. Debate hangs with no fallback.
- NOTE: Groq free tier 100k tokens/day. Bot army also consumes from this quota.

### ai-moderator (Supabase Edge Function)
- DEFINED IN: Supabase Edge Functions (Deno.serve)
- PURPOSE: AI-powered debate scoring and ruling generation
- CALLED FROM: Moderator UI panel (colosseum-arena.js moderator flow)
- STATUS: Deployed but NOT wired into main scoring flow. endCurrentDebate() uses random scoring, not this.
- BLAST RADIUS: Low currently — it's an optional tool, not in the critical path.

---

# SECTION 5: WIRING MANIFEST — BOT ARMY LAYER

## 5.1 BOT ARCHITECTURE

### Service Role Client
- DEFINED IN: /opt/colosseum/bot-army/colosseum-bot-army/supabase-client.js (VPS)
- USES: service_role key (bypasses RLS entirely)
- PROVIDES: createHotTake(), logBotAction(), CATEGORY_TO_SLUG mapping
- CATEGORY_TO_SLUG: Handles mismatch between bot categories and mirror slugs (e.g., `couples` → `couples-court`)
- BLAST RADIUS: If this key leaks, attacker has full DB access. Key is in .env on VPS only.
- NOT IN REPO: VPS-only file
- LAND MINES: LM-166 (VPS is authoritative, GitHub is stale)

### bot-engine.js (Orchestrator)
- DEFINED IN: VPS only (/opt/colosseum/bot-army/colosseum-bot-army/)
- PURPOSE: PM2-managed cron scheduler. Runs leg1, leg2, leg3 cycles.
- CONSUMES: bot-config.js for flags, env vars for credentials
- REQUIRES: leg2-news-scanner, leg2-debate-creator, leg2-bluesky-poster, leg3-auto-debate, ai-generator
- STATS: Logs daily summary via bot_stats_24h view. Tracks autoDebates count per day.
- BLAST RADIUS: If this crashes, all automated content stops. PM2 auto-restarts.

### bot-config.js
- DEFINED IN: BOTH repo root AND VPS
- PURPOSE: Env loader, validator, platform flags, timing config
- CRITICAL: maxPerDay default is 3 (matched to .env). Bluesky config section + flags + credential validation.
- FLAGS BLOCK: leg1Bluesky, leg2Bluesky, leg3BlueskyPost (active). leg2Reddit, leg3Reddit (pending API). Discord hardcoded false.
- LAND MINES: LM-149 (repo and VPS copies must stay in sync), LM-166 (VPS authoritative), LM-167 (SCP stale files)

### ecosystem.config.js
- DEFINED IN: VPS only (/opt/colosseum/bot-army/colosseum-bot-army/)
- PURPOSE: PM2 process config. Daily restart at 4am via cron_restart.
- CRITICAL: env block was stripped of all platform flags (Session 94). `.env` is the single source of truth for flags. If flags reappear in ecosystem.config.js, they override `.env`.
- LAND MINES: LM-149 (env block overrides .env)

---

## 5.2 LEG 1 — REACTIVE (Reply Guy)

### leg1-bluesky.js
- DEFINED IN: VPS only
- PURPOSE: Finds trending argument posts on Bluesky, replies with opinionated take + link to mirror
- FREQUENCY: 10 replies/day
- STATUS: ENABLED (Session 98). Only audience-building mechanism running.
- WRITES TO: bot_activity table via logBotAction()
- LINKS TO: colosseum-f30.pages.dev (mirror)
- BLAST RADIUS: If account banned, sole organic growth channel dies. Content guardrails needed (LM in NT).

### Other Leg 1 Files (inactive)
- leg1-reddit.js: 13 subreddits targeted. DISABLED — pending API approval since March 4.
- leg1-twitter.js: DISABLED — needs Basic API ($100/mo).
- leg1-discord.js: DISABLED — hardcoded false in bot-config.js (Session 111).

---

## 5.3 LEG 2 — PROACTIVE (Content Creation)

### leg2-news-scanner.js
- DEFINED IN: VPS only
- PURPOSE: Fetches 7 RSS feeds, scores headlines by debate-worthiness, returns ranked list
- CALLED FROM: bot-engine.js (Leg 2 cycle AND Leg 3 cycle — shared scanner)
- RETURNS: Array of { title, link, source, category, score }
- BLAST RADIUS: If RSS feeds change URLs or go down, no fresh headlines. Bot creates nothing.

### ai-generator.js
- DEFINED IN: VPS only
- PURPOSE: Sends headline to Groq → gets hot take text OR full auto-debate content
- MODEL: Groq Llama 3.3 70B Versatile (100k tokens/day free tier)
- FALLBACK: When Groq quota exceeded, falls back to 10 diverse headline-aware templates (125 combos per side, Session 95)
- ALSO PROVIDES: fallbackAutoDebateSetup() for Leg 3 template content
- BLAST RADIUS: If Groq key invalid, all AI-generated content falls back to templates. Quality degrades but doesn't stop.

### category-classifier.js
- DEFINED IN: VPS only (lib/)
- PURPOSE: Keyword-based headline → category router. Replaces hardcoded `category: 'general'`.
- USES: Word-boundary regex for short keywords (≤4 chars) to prevent false positives
- CALLED FROM: ai-generator.js line 1 via require
- BLAST RADIUS: If classifier wrong, content lands in wrong mirror category page. Not fatal but reduces relevance.

### leg2-debate-creator.js
- DEFINED IN: VPS only
- PURPOSE: Full pipeline: headline → AI topic → hot take → Supabase insert → shareable URL
- FLOW: headline → generateHotTake() → createHotTake() via service_role → returns { id, url }
- WRITES TO: hot_takes table via supabase-client.js (service_role, bypasses RLS)
- LINKS: URL built from config.app.baseUrl → should point to mirror (colosseum-f30.pages.dev)
- BLAST RADIUS: If baseUrl wrong, all bot posts link to wrong domain. LM-168.
- LAND MINES: LM-168 (APP_BASE_URL must be mirror, not Vercel)

### leg2-bluesky-poster.js (v2)
- DEFINED IN: VPS only
- PURPOSE: Posts ESPN-style share card image + link to Bluesky
- FLOW: card-generator.js creates PNG → uploadBlob() to Bluesky → creates post with embedded image
- DEPENDS ON: config.bluesky block in bot-config.js (handle, appPassword, maxPostsPerDay)
- BLAST RADIUS: If config.bluesky missing, crash with "Cannot read properties of undefined (reading 'maxPostsPerDay')". Debates created in Supabase but never posted. Silent failure except one error log line.
- LAND MINES: LM-149, LM-166 (bluesky config only exists on VPS version of bot-config.js)

### card-generator.js
- DEFINED IN: VPS only
- PURPOSE: Server-side ESPN-style share card PNG generation using canvas npm package
- CALLED FROM: leg2-bluesky-poster.js, leg3 pipeline
- BLAST RADIUS: If canvas npm fails to install (native dependency), no images generated. Posts go text-only.

---

## 5.4 LEG 3 — RAGE ENGINE (Auto-Debates)

### leg3-auto-debate.js
- DEFINED IN: VPS only
- PURPOSE: Full AI-vs-AI debate pipeline: headline → setup → 3 rounds → lopsided score → save → rage hook
- FREQUENCY: 3/day (reduced from 6 in Session 94 to stay within Groq free tier)
- SCORING: 40% landslide, 45% clear, 15% split — AI deliberately picks the unpopular winner (controversial scoring IS the marketing)
- WRITES TO: auto_debates + auto_debate_votes tables via service_role
- URL: Built from config.app.mirrorUrl → individual debate page (/debate/{id}.html)
- TRIGGERS: card-generator → leg2-bluesky-poster (image post), mirror-generator picks up on next 5-min cycle
- BLAST RADIUS: If pipeline fails mid-debate, partial data in Supabase. No cleanup mechanism.

---

## 5.5 MIRROR GENERATOR

### colosseum-mirror-generator.js
- DEFINED IN: /opt/colosseum/colosseum-mirror-generator.js (NOT inside bot-army dir — LM in NT)
- PURPOSE: Static site generator. Reads debates/hot takes from Supabase, generates pure HTML pages, deploys to Cloudflare Pages.
- SCHEDULE: 5-minute cron. Sources /opt/colosseum/mirror.env for credentials.
- DEPLOYS TO: colosseum-f30.pages.dev via wrangler (must use --branch=production for production)
- OUTPUT: 50+ pages per build. Home, category pages (/category/sports.html etc), individual debate pages (/debate/{id}.html)
- INCLUDES: Cloudflare Web Analytics beacon (Session 96), colosseum-analytics.js script tag (Session 94)
- USES: Supabase anon key (not service_role) for reads
- BLAST RADIUS: If cron fails, mirror goes stale. Bot posts link to pages that exist but have old content. If mirror.env has wrong credentials, builds fail silently.
- LAND MINES: File is NOT in bot-army dir. Updating the bot-army copy does nothing. Cron runs from /opt/colosseum/.

---

# SECTION 5B: WIRING MANIFEST — ANALYTICS LAYER

## 5B.1 FUNNEL ANALYTICS

### colosseum-analytics.js (window.ColosseumAnalytics)
- DEFINED IN: colosseum-analytics.js (auto-executes on load)
- PURPOSE: Funnel tracking for both mirror and app
- AUTO-FIRES: page_view event on every page load
- CAPTURES: Visitor UUID (generated + stored in localStorage), referrer, UTM params (source, medium, campaign), page URL
- SIGNUP DETECTION: Fires signup event when auth state transitions from anonymous to authenticated
- USES: Supabase anon client (direct, not ColosseumAuth — this module loads independently)
- INCLUDED ON: All 9 app HTML pages + all mirror pages (via mirror generator script tag)
- BLAST RADIUS: If this script fails to load, zero analytics. If Supabase anon key wrong, events silently fail.

### log_event(p_event_type, p_metadata) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Universal event logger. Writes to event_log table.
- CALLED FROM:
  - colosseum-analytics.js (page_view, signup)
  - 20+ other RPCs internally (wired Session 34) — every significant server action logs an event
- BLAST RADIUS: Low — event logging. If it breaks, analytics go dark but no user-facing features fail.

### event_log (Table)
- DEFINED IN: Supabase
- PURPOSE: Central event store. All user and system events.
- COLUMNS: id, user_id (nullable for anon), event_type, metadata (JSONB), created_at
- QUERIED BY: 9 analytics views, daily_snapshots cron

### Analytics Views (9 total)
- DEFINED IN: Supabase (created Session 33)
- PURPOSE: Pre-computed analytics queries over event_log
- INCLUDES: daily active users, event counts by type, signup funnel, referrer breakdown, etc.
- QUERIED BY: Admin/monitoring only. Not user-facing.

### daily_snapshots
- DEFINED IN: Supabase (scheduled function or manual)
- PURPOSE: Aggregates daily stats from event_log into snapshot table
- BLAST RADIUS: Low — historical record. If missed, gap in daily data.

### bot_stats_24h (View)
- DEFINED IN: Supabase
- PURPOSE: Bot activity summary over last 24 hours (leg1/leg2/leg3 counts, auto_debate counts)
- QUERIED BY: bot-engine.js daily summary log, monitoring

### auto_debate_stats (View)
- DEFINED IN: Supabase
- PURPOSE: Auto-debate pipeline metrics (created, posted, vote counts)
- QUERIED BY: monitoring

## 5B.2 LANDING PAGE VOTES

### landing_votes (Table)
- DEFINED IN: Supabase (Session 107)
- PURPOSE: Persist anonymous votes on colosseum-debate-landing.html
- COLUMNS: id, topic_slug, side, fingerprint, created_at
- UNIQUE INDEX: (topic_slug, fingerprint) — one vote per fingerprint per topic
- RLS: Enabled with zero policies (RPC-only access)

### cast_landing_vote(p_topic_slug, p_side, p_fingerprint) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER, granted to anon role)
- PURPOSE: Record anonymous vote with fingerprint dedup
- PATTERN: INSERT ON CONFLICT — duplicate fingerprint silently ignored
- BLAST RADIUS: Low — anonymous votes. If fingerprinting breaks, one person can vote multiple times.

### get_landing_vote_counts(p_topic_slug) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER, granted to anon role)
- RETURNS: Vote counts per side for a topic
- FALLBACK: colosseum-debate-landing.html falls back to hardcoded placeholders if no real votes exist

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

## FLOW 6: Group vs Group Challenge
```
1. User in group detail → taps GvG Challenge button (member-only)
2. Challenge modal opens → opponent search (350ms debounce), topic input, category, format pills (1v1/3v3/5v5)
3. Submit → create_group_challenge RPC (rate limited 3 pending/group, duplicate detection)
4. Challenge record created → status 'pending'
5. Defender group sees challenge in "Challenges" tab → get_group_challenges RPC
6. Defender accepts → respond_to_group_challenge({p_response: 'accepted'})
7. Challenge status → 'accepted' (matchable)
8. [FUTURE: matching into actual debates not fully wired]
9. Admin resolves → resolve_group_challenge → Group Elo updated
10. If no response in 48 hours → auto-expired
```

## FLOW 7: Hot Take → Challenge → Arena
```
1. User reads hot take in feed (index.html → category overlay)
2. Taps ⚔️ BET button → _showChallengeModal() [colosseum-async.js]
3. Writes counter-argument → submit → create_challenge RPC (50 token gate)
4. Challenge record created (DB only — no auto-navigation)
5. Opponent receives notification (challenge category)
6. Opponent accepts → challenge transitions → enters arena queue
7. [E83 wiring, Session 97 — challenge→arena path]
```

## FLOW 8: Standalone Prediction Creation
```
1. User on index.html → category overlay → Predictions tab
2. Taps ➕ CREATE button → openCreatePredictionForm() bottom sheet
3. Fills topic (10-200 chars), side A label, side B label, category
4. Submit → create_prediction_question RPC (rate limited 10/hr)
5. New prediction appears in list → fetchStandaloneQuestions()
6. Other users pick sides → pick_prediction RPC (rate limited 30/hr)
7. Pick counts update optimistically + server-confirmed
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
- Parse avatar_url for 'emoji:' prefix before rendering — 6+ locations render avatars
- Use `sanitize_text()` on all user text in RPCs: hot take body, prediction topic/labels, group name/description, bio, challenge counter-argument
- Use `req.text()` (not `req.json()`) in Stripe webhook Edge Function — preserves raw body for HMAC verification
- Verify Stripe webhook signature before processing any event — never trust unverified webhook payloads
- Use Groq model `llama-3.3-70b-versatile` — the 3.1 version is decommissioned
- Set APP_BASE_URL to mirror domain (colosseum-f30.pages.dev) not Vercel — all bot links go to mirror
- Use `\cp` (backslash prefix) for file copies on VPS — bypasses `cp -i` alias
- Verify file content on VPS with grep after any SCP transfer — stale files from wrong machine are common (LM-167)
- Patch bot-config.js on VPS first, verify, then optionally push to GitHub — VPS is authoritative (LM-166)
- Use `--branch=production` for Cloudflare Pages wrangler deploys — `--branch=main` routes to Preview

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
- Allow non-defender to respond to a group challenge — defender-only check required
- Render user-provided text via innerHTML without escaping — use textContent or _escHtml()
- Put Stripe secret key or Groq API key in client-side code — secrets live in Supabase Edge Function secrets only
- Use `req.json()` in Stripe webhook handler — it destroys the raw body needed for HMAC signature verification
- Deploy Stripe Edge Functions without updating old imports first (known tech debt in NT)
- Upload bot-config.js from GitHub to VPS without verifying bluesky block exists — GitHub version is stale (LM-166)
- Edit the mirror generator copy in the bot-army directory — the live copy is at /opt/colosseum/ (not bot-army)
- Put platform flags in ecosystem.config.js env block — .env is the single source of truth (Session 94)
- Trust SCP success messages — always grep for unique content after transfer (LM-167)

## ASK PAT FIRST
- Any change to RLS policies
- Any change to the guard trigger's protected column list
- Any new SECURITY DEFINER RPC
- Any change to the auth init sequence
- Any change to the status flow (pending → lobby → matched → live → completed)
- Any new Edge Function deployment
- Any change to bot posting frequency or platform flags
- Any change to APP_BASE_URL or mirror domain

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
| colosseum-payments.js | Payments | window.ColosseumPayments (.subscribe, .buyTokens) | auth.js, Stripe SDK |
| colosseum-paywall.js | Payments | window.ColosseumPaywall (.gate) | auth.js |
| colosseum-share.js | Growth | window.ColosseumShare | config.js |
| colosseum-cards.js | Growth | window.ColosseumCards (canvas share card gen) | None |
| colosseum-analytics.js | Growth | window.ColosseumAnalytics (page_view, events) | Supabase anon client |
| ai-sparring (Edge Func) | Arena | Groq proxy for AI debate opponent | GROQ_API_KEY secret |
| ai-moderator (Edge Func) | Arena | AI scoring/ruling generation | GROQ_API_KEY secret |
| stripe-checkout (Edge Func) | Payments | Creates Stripe Checkout sessions | STRIPE_SECRET_KEY secret |
| stripe-webhook (Edge Func) | Payments | Processes Stripe webhook events | STRIPE_WEBHOOK_SECRET secret |
| bot-engine.js (VPS) | Bot Army | PM2 orchestrator, leg1/2/3 cron cycles | bot-config.js, all leg files |
| bot-config.js | Bot Army | Env loader, flags, platform config | .env (VPS authoritative, LM-166) |
| leg2-news-scanner.js (VPS) | Bot Army | RSS headline scanner, 7 feeds | None |
| leg2-debate-creator.js (VPS) | Bot Army | Headline → hot take → Supabase → URL | ai-generator, supabase-client |
| leg2-bluesky-poster.js (VPS) | Bot Army | Image post to Bluesky | card-generator, config.bluesky |
| leg3-auto-debate.js (VPS) | Bot Army | Full AI debate pipeline → rage bait | ai-generator, supabase-client |
| ai-generator.js (VPS) | Bot Army | Groq AI content + template fallback | GROQ_API_KEY |
| card-generator.js (VPS) | Bot Army | ESPN-style PNG share cards | canvas npm |
| category-classifier.js (VPS) | Bot Army | Headline → category routing | None |
| supabase-client.js (VPS) | Bot Army | Service role client + CATEGORY_TO_SLUG | SUPABASE_SERVICE_KEY |
| mirror-generator.js (VPS) | Growth | Static site generator → Cloudflare Pages | mirror.env, wrangler |

---

# MAINTENANCE LOG

| Session | Entries Changed | What Happened |
|---------|----------------|---------------|
| 122 | Initial draft | Defense layer, arena basics, flows, contracts |
| 122 | Arena expansion | Power-ups (4 RPCs + tables + state), debate room wiring (showPreDebate, AI round loop, endCurrentDebate full trace), spectator system (3 RPCs + page), scoring, 2 new flows |
| 122 | Social expansion | Predictions (2 tables, 3 RPCs, standalone + debate-linked), Groups (7 RPCs, GvG challenges with status flow), Profile CRUD (update, delete, avatar, bio), Follows/Rivals (3 RPCs), Leaderboard, Notifications detail, 3 new flows |
| 122 | Payments + Edge Functions | Stripe checkout/webhook Edge Functions (template status, idempotency, HMAC), payments.js, paywall.js, ai-sparring + ai-moderator Edge Functions, Groq model note |
| 122 | Growth layer | Bot army leg-by-leg (Leg 1 reactive, Leg 2 proactive, Leg 3 rage engine), all VPS files mapped, mirror generator, analytics (log_event, 9 views, daily_snapshots, funnel tracking), landing page votes, category classifier |

---

> **GAPS IN THIS DRAFT (to fill as we touch them):**
> - Moderator RPCs (set_moderator_mode, submit_evidence, ruling panel flow)
> - Achievement system (scan_achievements, 25 conditions)
> - Cosmetics shop RPCs (purchase_cosmetic, equip_cosmetic, 45 items)
> - Full HTML page → JS module loading order for each page
> - WebRTC/Realtime wiring (colosseum-webrtc.js, voice memo mode)
> - Auto-debate staking (auto_debate_stakes table, 4 RPCs — Session 99)
