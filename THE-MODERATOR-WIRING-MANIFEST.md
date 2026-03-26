# THE COLOSSEUM — WIRING MANIFEST
### Last Updated: Session 178 (March 26, 2026)

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

## 3.7 MODERATOR SYSTEM

### Moderator Toggle (Session 39)
- DEFINED IN: colosseum-settings.html (moderator toggle in settings)
- RPCs (4, Session 39): set_moderator_mode, submit_evidence, rule_on_reference, get_moderator_scores
- All SECURITY DEFINER, all via ColosseumAuth.safeRpc

### set_moderator_mode(p_enabled) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Toggle whether user acts as moderator in debates
- CALLED FROM: colosseum-settings.html moderator toggle
- BLAST RADIUS: Low — user preference flag.

### submit_evidence(p_debate_id, p_reference_url, p_claim, p_supports_side) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Submit a reference/evidence during a debate
- CALLED FROM: colosseum-arena.js → evidence form in moderator panel
- VALIDATES: auth, sanitize_url on reference, sanitize_text on claim
- WRITES TO: debate_references table (6 RPCs total for reference system, Session 33)
- BLAST RADIUS: If sanitize_url bypassed, malicious URLs stored in DB.

### rule_on_reference(p_reference_id, p_ruling, p_reason) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Moderator allows or denies a submitted reference
- CALLED FROM: colosseum-arena.js → ruling panel (allow/deny buttons)
- AUTO-ALLOW: 60-second countdown timer. If moderator doesn't rule, reference auto-allowed.
- AI RULING: ai-moderator Edge Function can auto-generate ruling (optional, not in main flow)
- BLAST RADIUS: Low per ruling. But if auto-allow timer leaks (LM from Session 63 — fixed), overlay floats.

### Moderator Scoring (Post-Debate)
- 100-point system: 50 from debaters (25 each, happy/not-happy binary) + 50 from fans (1-50 scale, averaged)
- CALLED FROM: Post-debate screen moderator rating UI
- WRITES TO: moderator_scores table via get_moderator_scores/submit rating RPCs

---

## 3.8 WEBRTC / VOICE MEMO

### colosseum-webrtc.js (window.ColosseumWebRTC)
- DEFINED IN: colosseum-webrtc.js
- PURPOSE: WebRTC audio for live debate mode
- USES: Supabase Realtime channels for signaling (no separate signaling server)
- PROVIDES: .joinDebate(debateId, role), .leaveDebate(), .toggleMute(), .createWaveform()
- EVENTS: micReady, connected, disconnected, muteChanged, tick, debateEnd
- AUDIO CONFIG: echoCancellation, noiseSuppression, autoGainControl, sampleRate 48000
- ICE SERVERS: Google STUN + configured TURN server
- WIRED INTO: colosseum-arena.js → initLiveAudio() (called in enterRoom for live audio mode)
- CLEANUP: ColosseumWebRTC.leaveDebate() called in endCurrentDebate()
- BLAST RADIUS: If mic permissions denied, audio fails silently (shows error message). If Realtime channel fails, signaling breaks — no peer connection established.
- NOTE: Live audio mode is built but not heavily tested with real users. AI Sparring uses text, not audio.

### colosseum-voicememo.js (window.ColosseumVoiceMemo)
- DEFINED IN: colosseum-voicememo.js
- PURPOSE: Record and send voice memos in async voice debate mode
- PROVIDES: Voice recording, playback, send via RPC
- WIRED INTO: colosseum-arena.js → wireVoiceMemoControls() (record/cancel/send buttons)
- BLAST RADIUS: Low — async mode. If recording fails, user can retry.

---

## 3.9 AUTO-DEBATE STAKING (Session 99)

### auto_debate_stakes (Table)
- DEFINED IN: Supabase (Session 99)
- PURPOSE: Token staking on auto-debate (AI vs AI) outcomes
- SEPARATE FROM: arena stakes (stakes/stake_pools tables). Auto-debates use their own table.

### place_auto_debate_stake(p_debate_id, p_amount, p_predicted_winner) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Stake tokens on an auto-debate outcome
- CALLED FROM: colosseum-auto-debate.html staking UI
- EXPECTS: Valid auto_debate ID, sufficient token_balance
- STATUS: Backend live. Frontend staking UI on auto-debate page.

### get_auto_debate_stakes(p_debate_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Get current stake totals for an auto-debate
- BLAST RADIUS: Low — read-only.

### resolve_auto_debate_stakes(p_debate_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Settle auto-debate stakes after debate completes
- BLAST RADIUS: Same as settle_stakes — if called twice, double payout.

### settle_auto_debate_stakes(p_debate_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Parimutuel payout for auto-debate stakes
- NOTE: 4 RPCs total for auto-debate staking system (Session 99)

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

## 4.8 ACHIEVEMENT / MILESTONE SYSTEM

### colosseum-tokens.js Milestone Subsystem
- DEFINED IN: colosseum-tokens.js (within ColosseumTokens module)
- 13 ONE-TIME MILESTONES:
  - first_hot_take (25 tokens), first_debate (50), first_vote (10), first_reaction (5)
  - first_ai_sparring (15), first_prediction (10)
  - profile_3_sections (30), profile_6_sections (75), profile_12_sections (150)
  - verified_gladiator (100)
  - streak_7 (+1 streak freeze), streak_30 (+3 freezes), streak_100 (+5 freezes)
- DEDUP: Via token_earn_log table. milestoneClaimed Set in JS prevents duplicate RPC calls per session.
- ANIMATION: Gold coin fly-up on token earn, milestone unlock toast (big reveal) on milestones

### claim_milestone(p_milestone_key) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER, Session 72)
- PURPOSE: Award one-time milestone reward (tokens and/or streak freezes)
- CALLED FROM: colosseum-tokens.js → claimMilestone(key)
- DEDUP: Checks token_earn_log for existing claim. Returns "Already claimed" if duplicate.
- BLAST RADIUS: If dedup breaks, users claim milestones multiple times → token inflation.

### get_my_milestones() (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER, Session 72)
- PURPOSE: Returns list of claimed milestone keys + streak freeze count
- CALLED FROM: colosseum-tokens.js → _loadMilestones() on init
- BLAST RADIUS: Low — read-only. But if it returns wrong list, milestones re-fire (caught by server dedup).

### Streak Freeze Mechanic
- COLUMN: profiles.streak_freezes (integer, NOT trigger-protected — relies on RPC-only access)
- EARNED AT: Streak milestones (7-day = 1 freeze, 30-day = 3, 100-day = 5)
- CONSUMED BY: claim_daily_login RPC — if user missed exactly 1 day and has freezes, auto-consumes one, preserves streak
- BLAST RADIUS: If freeze count wrong, user loses streak when they shouldn't (or keeps it when they shouldn't).

### Profile Milestone Checks
- CALLED FROM: colosseum-profile-depth.html → after saveSection() succeeds
- checkProfileMilestones() checks section count against 3/6/12 thresholds
- BLAST RADIUS: Low — awards tokens for completing profile sections.

---

## 4.9 COSMETICS SHOP

### cosmetics (Table)
- DEFINED IN: Supabase (seeded in schema-production.sql)
- 45 ITEMS: 15 borders, 15 badges, 15 effects
- RARITY: common, rare, legendary
- PRICE RANGE: 30-1000 tokens
- COLUMNS: id, name, description, type (border/badge/effect), rarity, price_tokens, css_class, sort_order

### user_cosmetics (Table)
- DEFINED IN: Supabase
- PURPOSE: Tracks which cosmetics a user owns and has equipped
- COLUMNS: user_id, cosmetic_id, equipped (boolean), purchased_at

### purchase_cosmetic(p_cosmetic_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Buy a cosmetic with tokens
- EXPECTS: auth, sufficient token_balance, cosmetic exists, not already owned
- DEBITS: token_balance by cosmetic price
- BLAST RADIUS: If price lookup wrong, user overpays or underpays. If ownership check bypassed, duplicate purchase.

### equip_cosmetic(p_cosmetic_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Equip an owned cosmetic (activate its visual effect)
- EXPECTS: User owns the cosmetic
- UNEQUIP: Equipping in same category auto-unequips previous (one border, one badge, one effect active at a time)
- BLAST RADIUS: Low — visual only. If equip without ownership, visual appears but shouldn't.

### Shop UI
- DEFINED IN: index.html shop screen (inline JS, not a separate module)
- TABS: Borders, Badges, Effects
- SHOWS: Token balance, owned indicator on purchased items, buy buttons
- ALSO SHOWS: Coaching booking (150 tokens), Moderator booking (75 tokens)
- BLAST RADIUS: Low — display + purchase actions. Token balance visible here feeds from same profiles.token_balance.

---

## 4.10 REFERENCE ARSENAL (Session 147)

### arsenal_references (Table)
- DEFINED IN: Supabase (Session 147)
- COLUMNS: id, user_id, claim, url, domain, author, publication_year, source_type, power_ceiling, category, verification_points, current_power, citation_count, win_count, loss_count, challenge_count, challenge_wins, challenge_losses, xp, rarity, created_at
- RLS: SELECT all authenticated. INSERT own rows only. No direct UPDATE/DELETE — RPCs only.
- INDEXES: user_id, category, source_type, current_power DESC

### reference_verifications (Table)
- DEFINED IN: Supabase (Session 147)
- COLUMNS: id, reference_id, voter_id, voter_type (clan/outside/rival), vote_value (0.5/1.0/2.0), created_at
- UNIQUE: (reference_id, voter_id) — one vote per user per reference
- RLS: SELECT all authenticated. INSERT own rows only.

### forge_reference (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- CALLED FROM: src/reference-arsenal.ts → forgeReference()
- VALIDATES: auth, source_type, category, URL format, claim length, author length
- LOGS: log_event('reference_forged')
- RETURNS: UUID
- BLAST RADIUS: Low — creates a row.

### verify_reference (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- CALLED FROM: src/reference-arsenal.ts → verifyReference()
- DETERMINES: voter_type via group_members (clan 0.5) + rivals (rival 2.0), else outside 1.0
- UPDATES: verification_points, recalculates current_power
- BLAST RADIUS: If group_members or rivals schema changes, voter_type detection breaks. LM-186.

### cite_reference (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- CALLED FROM: src/reference-arsenal.ts → citeReference() (not wired to debate room yet)
- OUTCOME null=cite, 'win'=XP award, 'loss'=loss count
- BLAST RADIUS: Must be called from debate settle flow when wired.

### challenge_reference (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- CALLED FROM: src/reference-arsenal.ts → challengeReference() (not wired to moderator yet)
- REJECTED: -10 verification_points, power recalculated. LOGS: log_event('reference_challenge_lost')
- BLAST RADIUS: Currently callable by anyone — needs moderator-only gate when wired.

### get_my_arsenal / get_reference_library (RPCs)
- DEFINED IN: Supabase RPCs (SECURITY DEFINER)
- CALLED FROM: src/reference-arsenal.ts → renderArsenal() / renderLibrary()
- BLAST RADIUS: Low — read-only.

---

# SECTION 4C: WIRING MANIFEST — LIVE DEBATE FEED LAYER (Session 178)

## 4C.1 FEED TABLE

### debate_feed_events (Table)
- DEFINED IN: Supabase (moderator-feed-table-migration.sql, Session 178)
- PURPOSE: Append-only permanent B2B archive. One row per event in a moderated debate feed.
- EVENT TYPES: speech, reference_cite, reference_challenge, point_award, mod_ruling, round_divider, sentiment_vote, power_up
- KEY COLUMNS: id BIGSERIAL, debate_id (FK arena_debates), user_id (FK profiles — NULL for round_divider system events), event_type, round INT (0-10), side TEXT (a/b/mod), content TEXT, score INT (1-5 for point_award only), reference_id (FK debate_references — nullable), metadata JSONB, created_at TIMESTAMPTZ (server-assigned)
- RLS: SELECT public (debates are public). INSERT/UPDATE/DELETE all blocked (SECURITY DEFINER only).
- EXCEPTION: pin_feed_event() does UPDATE on metadata.pinned — the ONLY update allowed. See LM-192.
- REAL-TIME: feed_event_broadcast_trigger → broadcast_feed_event() → realtime.broadcast_changes('debate:<debate_id>'). Trigger fires AFTER INSERT only — does NOT fire on pin_feed_event UPDATE.
- INDEXES: (debate_id, created_at ASC) for live feed + replay. (event_type, created_at DESC) for B2B. (user_id, event_type) partial for debater analytics. Partial GIN on metadata->>'scored_event_id' WHERE event_type='point_award' for double-scoring check.
- DEPENDS ON: arena_debates, profiles, debate_references, log_event()
- BLAST RADIUS: B2B archive integrity. Mutation of existing rows corrupts the historical record. Default: never update, always append.
- LAND MINES: LM-191 (score_debate_comment bypasses insert_feed_event), LM-192 (append-only exception), LM-193 (broadcast auth)

### broadcast_feed_event() (Trigger Function)
- DEFINED IN: Supabase (SECURITY DEFINER, AFTER INSERT on debate_feed_events)
- PURPOSE: Calls realtime.broadcast_changes on topic 'debate:<debate_id>'
- FAILURE MODE: EXCEPTION block catches all errors, raises WARNING. Never blocks the INSERT. Client backfills on reconnect via get_feed_events.
- BLAST RADIUS: If broadcast fails silently, clients miss live events but data is safe in table.

---

## 4C.2 FEED RPCs

### insert_feed_event(p_debate_id, p_event_type, p_round, p_side, p_content, p_score, p_reference_id, p_metadata) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Single entry point for all feed events except point_award (which goes through score_debate_comment).
- ROLE VALIDATION:
  - speech, reference_cite, reference_challenge, power_up → debater_a or debater_b only
  - point_award, mod_ruling → moderator only
  - sentiment_vote → any authenticated user
  - round_divider → any debate participant (debater or moderator)
- CALLED FROM: arena.ts client (not yet wired — wire when building debate room UI)
- DOUBLE-WRITE: Calls log_event() for analytics pipeline after INSERT.
- BLAST RADIUS: If role validation wrong, wrong participants can inject events into the feed.
- LAND MINES: LM-191 (does NOT handle point_award — use score_debate_comment for those)

### get_feed_events(p_debate_id, p_after, p_limit) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Backfill on reconnect, initial load for late-joining spectators, full replay.
- PARAMS: p_after=NULL returns all events (replay). p_after=<timestamp> returns events after that time (reconnect gap-fill). Hard cap: 1000 rows.
- CALLED FROM: arena.ts client on channel reconnect; spectator page on join
- BLAST RADIUS: Low — read-only. If called with wrong debate_id, returns empty array.

### score_debate_comment(p_debate_id, p_feed_event_id, p_score) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Moderator live-scores a speech event (1-5 points).
- FLOW: Validates moderator → validates speech event → double-scoring guard → atomically UPDATE score_a or score_b on arena_debates → INSERT point_award into debate_feed_events (fires broadcast) → log_event double-write
- GUARDS:
  - Caller must be debate's moderator
  - Debate status must be 'live' or 'round_break'
  - Target must be a speech event
  - Double-scoring prevention: EXISTS check on metadata->>'scored_event_id'
  - Budget: if arena_debates.scoring_budget_per_round is non-null, enforces count cap per round
- RETURNS: { success, id, score, side, round, score_a, score_b } — score_a/score_b are new running totals
- BLAST RADIUS: Increments scoreboard directly. If called twice on same event, double-scoring guard catches it. If score_a/score_b start drifting from sum of point_awards, scoreboard is wrong.
- LAND MINES: LM-191 (writes directly to debate_feed_events, not via insert_feed_event — new logic in insert_feed_event does NOT auto-apply here)
- CALLED FROM: arena.ts (moderator scoring UI — not yet wired)

### pin_feed_event(p_debate_id, p_feed_event_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Toggle metadata.pinned on a speech event. Moderator uses this to mark comments for scoring during ad breaks.
- MODERATOR-PRIVATE: Broadcast trigger does NOT fire on this UPDATE. No other clients see pin state.
- ONLY UPDATE on append-only table — bypasses USING(false) RLS via SECURITY DEFINER.
- RETURNS: { success, feed_event_id, pinned: true/false }
- BLAST RADIUS: Low — metadata-only toggle. No broadcast.
- LAND MINES: LM-192

---

## 4C.3 MODERATOR DROPOUT SYSTEM

### mod_dropout_log (Table)
- DEFINED IN: Supabase (moderator-dropout-penalties-migration.sql, Session 178)
- PURPOSE: Append-only log of moderator dropouts. One row per dropout.
- COLUMNS: id BIGSERIAL, moderator_id (FK profiles), debate_id (FK arena_debates, CASCADE), cooldown_minutes INT, offense_number INT, created_at TIMESTAMPTZ
- RLS: SELECT public. INSERT/UPDATE/DELETE blocked (SECURITY DEFINER only).
- "DAILY RESET" PATTERN: No cron, no columns to reset. Offense count = COUNT WHERE created_at >= date_trunc('day', now() UTC). Resets automatically at midnight UTC.
- INDEXES: (moderator_id, created_at DESC) for cooldown queries. (debate_id) for cascade.
- BLAST RADIUS: If this table grows unbounded, cooldown queries slow down. Low risk at current scale.

### record_mod_dropout(p_debate_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Called by a debater when moderator presence disappears from signaling channel. Nulls the debate and applies dropout penalty.
- CALLER: Debater (debater_a or debater_b) only. Human-moderated live/round_break debates only.
- FLOW:
  1. Idempotency check: if debate already 'cancelled', return { already_processed: true }
  2. Validate caller is a debater, debate is live/round_break, moderator_type = 'human'
  3. UPDATE arena_debates SET status='cancelled', ended_at=now(), winner=NULL
  4. Count today's dropouts → v_offense = count + 1
  5. INSERT into mod_dropout_log
  6. INSERT 0-score into moderator_scores (ON CONFLICT DO NOTHING on debate_id, scorer_id)
  7. Recalculate mod_approval_pct on profiles
  8. log_event('moderator_dropout')
- RETURNS: { success, moderator_id, offense_number, cooldown_minutes, cooldown_expires_at, new_approval }
- IDEMPOTENT: Both debaters may call simultaneously. First processes; second returns { already_processed: true }.
- BLAST RADIUS: Cancels the debate permanently. Affects mod_approval_pct. One 0-score per dropout (not two). See LM-194.
- LAND MINES: LM-194 (ON CONFLICT DO NOTHING — one 0-score per dropout)
- CALLED FROM: arena.ts (on Realtime presence disappearance — not yet wired)

### check_mod_cooldown(p_moderator_id) (RPC)
- DEFINED IN: Supabase RPC (SECURITY DEFINER)
- PURPOSE: Check whether a moderator is currently in a dropout cooldown.
- RETURNS: { in_cooldown, dropouts_today, cooldown_expires_at, cooldown_remaining_seconds, next_offense_cooldown_minutes }
- CALLED FROM: arena.ts client-side before showing "Accept" button on browse_mod_queue results.
- NOTE: Not yet wired into request_to_moderate RPC server-side — add later if desired.
- BLAST RADIUS: Low — read-only. If this returns wrong in_cooldown, a penalized mod can accept debates during cooldown.

### get_mod_cooldown_minutes(p_offense_number) (Helper Function)
- DEFINED IN: Supabase (IMMUTABLE SQL function)
- PURPOSE: Returns cooldown duration for a given offense number. 1→10min, 2→60min, 3+→1440min.
- NOT CALLED DIRECTLY by client. Used internally by record_mod_dropout and check_mod_cooldown.

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

> **TypeScript migration (Session 131):** All bot army files migrated from CommonJS .js to TypeScript .ts. PM2 runs compiled JS from `dist/`. Source files are .ts (in repo), runtime files are `dist/*.js` (on VPS). Original .js kept as rollback. Vitest tests added Session 132 (97 passing). Category classifier substring bug + content filter regex bug fixed Session 132.

### Service Role Client
- DEFINED IN: /opt/colosseum/bot-army/colosseum-bot-army/supabase-client.ts (VPS, compiled to dist/supabase-client.js)
- USES: service_role key (bypasses RLS entirely)
- PROVIDES: createHotTake(), logBotAction(), CATEGORY_TO_SLUG mapping
- CATEGORY_TO_SLUG: Handles mismatch between bot categories and mirror slugs (e.g., `couples` → `couples-court`)
- BLAST RADIUS: If this key leaks, attacker has full DB access. Key is in .env on VPS only.
- IN REPO: Yes (as .ts source, Session 131)

### bot-engine.ts (Orchestrator)
- DEFINED IN: VPS (/opt/colosseum/bot-army/colosseum-bot-army/bot-engine.ts → compiled to dist/bot-engine.js)
- PURPOSE: PM2-managed cron scheduler. Runs leg1, leg2, leg3 cycles.
- CONSUMES: bot-config.ts for flags, env vars for credentials
- REQUIRES: leg2-news-scanner, leg2-debate-creator, leg2-bluesky-poster, leg3-auto-debate, ai-generator
- STATS: Logs daily summary via bot_stats_24h view. Tracks autoDebates count per day.
- BLAST RADIUS: If this crashes, all automated content stops. PM2 auto-restarts.

### bot-config.ts
- DEFINED IN: BOTH repo root AND VPS
- PURPOSE: Env loader, validator, platform flags, timing config
- CRITICAL: maxPerDay default is 3 (matched to .env). Bluesky config section + flags + credential validation.
- FLAGS BLOCK: leg1Bluesky, leg2Bluesky, leg3BlueskyPost (active). leg2Reddit, leg3Reddit (pending API). Discord hardcoded false.
- LAND MINES: LM-149 (repo and VPS copies must stay in sync), LM-166 (VPS authoritative), LM-167 (SCP stale files)

### ecosystem.config.js
- DEFINED IN: VPS only (/opt/colosseum/bot-army/colosseum-bot-army/)
- PURPOSE: PM2 process config. Daily restart at 4am via cron_restart.
- CRITICAL: script path is `dist/bot-engine.js` (TypeScript compiled output, Session 131). env block stripped of all platform flags (Session 94). `.env` is the single source of truth for flags.
- ROLLBACK: `sed -i "s|script: 'dist/bot-engine.js',|script: 'bot-engine.js',|" ecosystem.config.js && pm2 restart all`
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

# SECTION 6B: PAGE LOAD MAP (HTML → JS Module Loading Order)

> Every page follows the same head pattern: Supabase CDN → config.js → auth.js → page-specific modules.
> SRI hashes pin supabase-js to @2.98.0 on 6 pages. Must regenerate when upgrading.
> Auth gate: pages that require login check ColosseumAuth.ready → if no session → redirect to Plinko.

## index.html (Home — Spoke Carousel)
```
HEAD SCRIPTS (blocking):
  1. @supabase/supabase-js@2.98.0 (CDN, SRI hash)
  2. colosseum-config.js (credentials, flags, escHtml, showToast)
  3. colosseum-auth.js (ColosseumAuth global)

BODY SCRIPTS (defer/end):
  4. colosseum-tokens.js (ColosseumTokens — milestones, streaks, claims)
  5. colosseum-notifications.js (ColosseumNotifications — bell polling)
  6. colosseum-async.js (ColosseumAsync — hot takes, predictions, challenges)
  7. colosseum-leaderboard.js (ColosseumLeaderboard)
  8. colosseum-share.js (ColosseumShare)
  9. colosseum-analytics.js (auto page_view)

INIT:
  await ColosseumAuth.ready → if no session → redirect to Plinko
  appInit() → renders spoke carousel, wires category overlays, pull-to-refresh
  Carousel counts loaded via inline ColosseumAuth.safeRpc()

AUTH GATE: YES — redirects to Plinko if not logged in
```

## colosseum-arena.html (Arena)
```
HEAD SCRIPTS:
  1-3. Same head trio (Supabase CDN, config, auth)

BODY SCRIPTS:
  4. colosseum-tokens.js
  5. colosseum-tiers.js (getTier, renderTierBadge — display only)
  6. colosseum-staking.js (IIFE — renderStakingPanel, placeStake)
  7. colosseum-powerups.js (IIFE — shop, equip, activate)
  8. colosseum-arena.js (ColosseumArena — lobby, modes, debate room, pre-debate)
  9. colosseum-analytics.js

INIT:
  await ColosseumAuth.ready → renderLobby()
  Arena.js orchestrates staking.js and powerups.js calls

AUTH GATE: YES
DEPENDS ON: staking.js and powerups.js MUST use ColosseumAuth.safeRpc (LM-185)
```

## colosseum-groups.html (Groups)
```
HEAD SCRIPTS:
  1-3. Same head trio

BODY SCRIPTS:
  4. colosseum-analytics.js
  (groups logic is INLINE in the HTML, not a separate .js module)

INIT:
  Uses ColosseumAuth for RPC calls (was broken pre-Session 67 — used createClient directly)
  Tabs: Discover, My Groups, Rankings
  Group detail view loads on openGroup()
  URL param support: ?group=UUID opens group directly

AUTH GATE: NO — loads for guests. Auth-gated actions (create, join) redirect to Plinko.
```

## colosseum-settings.html (Settings)
```
HEAD SCRIPTS:
  1-3. Same head trio

BODY SCRIPTS:
  4. colosseum-analytics.js

INIT:
  await ColosseumAuth.ready → loads settings toggles, account management, bio edit
  Delete account flow: type "DELETE" → soft_delete_account RPC

AUTH GATE: YES
```

## colosseum-profile-depth.html (Questionnaire)
```
HEAD SCRIPTS:
  1-3. Same head trio

BODY SCRIPTS:
  4. colosseum-tiers.js (tier banner rendering)
  5. colosseum-analytics.js

INIT:
  await ColosseumAuth.ready → loads 12 sections, renders tier banner
  saveSection() → counts new answers → increment_questions_answered RPC → updates tier live
  Migration sync on load: if server questions_answered=0 but localStorage has answers, one-time catch-up

AUTH GATE: YES
LAND MINES: LM-172 (tier thresholds), LM-173 (double-counting prevention)
```

## colosseum-plinko.html (Signup Gate)
```
HEAD SCRIPTS:
  1-3. Same head trio

BODY SCRIPTS:
  4. colosseum-analytics.js

INIT:
  4-step signup: Step 1 OAuth (Google/Apple/email) → Step 2 Age Gate → Step 3 Username → Step 4 Done
  On successful auth → redirects to index.html (or returnTo param)

AUTH GATE: NO — this IS the auth gate. Logged-in users skip to home.
```

## colosseum-login.html (Login)
```
HEAD SCRIPTS:
  1-3. Same head trio

BODY SCRIPTS:
  4. colosseum-analytics.js

INIT:
  OAuth dominant (Google, Apple). Email collapsed behind toggle.
  Password reset modal.
  On success → redirect to returnTo or index.html

AUTH GATE: NO
```

## colosseum-spectate.html (Spectator View)
```
HEAD SCRIPTS:
  1-3. Same head trio

BODY SCRIPTS:
  4. colosseum-analytics.js

INIT:
  Reads debate ID from URL params
  get_arena_debate_spectator RPC → loads debate + profiles
  bump_spectator_count RPC → increments viewer count
  5-second polling for live debates

AUTH GATE: NO — spectating is open to all
```

## colosseum-auto-debate.html (AI vs AI Debate Page)
```
HEAD SCRIPTS:
  1-3. Same head trio

BODY SCRIPTS:
  4. colosseum-tokens.js (claimVote on voting)
  5. colosseum-analytics.js

INIT:
  Auto-fetches latest debate ID if none in URL (Session 68 fix)
  Loads auto_debate data from Supabase
  Renders rounds, scorecard, judge's take
  Voting via cast_auto_debate_vote RPC (ungated)
  More Debates discovery section (E279/E280, Session 97)

AUTH GATE: NO — ungated voting, rage-click funnel
```

## colosseum-debate-landing.html (Landing Page)
```
HEAD SCRIPTS:
  1-3. Same head trio

BODY SCRIPTS:
  4. colosseum-analytics.js

INIT:
  Hardcoded DEBATES object with demo topics
  Vote buttons → cast_landing_vote RPC (anon, fingerprint dedup)
  get_landing_vote_counts RPC → real vote counts (falls back to placeholders)
  Category pills link to /?cat=slug
  downloadCard() for share card generation

AUTH GATE: NO — fully ungated, designed for anonymous traffic from bot links
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
- Load scripts in order: Supabase CDN → config.js → auth.js → page-specific modules. Never reorder.
- Keep SRI hashes on Supabase CDN script tags — pins to @2.98.0. Regenerate if upgrading SDK version.
- Call `await supabase.realtime.setAuth()` BEFORE subscribing to any private broadcast channel (LM-193)
- Subscribe to debate feed channel with `{ config: { private: true } }` — omitting this = no events received (LM-193)
- Call `check_mod_cooldown` before showing "Accept" on browse_mod_queue — do not let penalized mods accept debates
- Use `score_debate_comment` for point_award events — never `insert_feed_event` (different transaction requirements, LM-191)
- When adding new logic to `insert_feed_event`, manually apply same logic to `score_debate_comment` if it should apply to point_award (LM-191)

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
- Load page-specific modules before auth.js — auth.js must resolve .ready before anything else runs
- Render auth-gated content before ColosseumAuth.ready resolves — use await, never setTimeout
- Call `log_event()` with positional args — MUST use named parameters (p_event_type :=, p_user_id :=, p_debate_id :=, p_category :=, p_side :=, p_metadata :=). LM-188 closed Session 151.
- Subscribe to a private Supabase Realtime channel without calling `supabase.realtime.setAuth()` first — events will never arrive (LM-193)
- Subscribe to the debate feed channel without `{ config: { private: true } }` — events will never arrive (LM-193)
- Update rows in `debate_feed_events` except via `pin_feed_event` — it is an append-only archive (LM-192)
- Use `insert_feed_event` for point_award events — use `score_debate_comment` instead (LM-191)
- Assume `record_mod_dropout` inserts two 0-scores when both debaters call — ON CONFLICT DO NOTHING ensures one (LM-194)

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
| colosseum-webrtc.js | Arena | window.ColosseumWebRTC (live audio via Supabase Realtime) | Supabase Realtime |
| colosseum-voicememo.js | Arena | window.ColosseumVoiceMemo (async voice recording) | None |
| colosseum-scoring.js | Arena | window.ColosseumScoring (Elo, XP, leveling — SELECT only) | None |
| colosseum-home.js | Foundation | Home screen logic (legacy, superseded by inline carousel) | auth.js |
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
| colosseum-spectate.html | Arena | Standalone spectator view page | auth.js, config.js |
| colosseum-auto-debate.html | Growth | AI vs AI debate page, ungated voting | auth.js, tokens.js |
| colosseum-debate-landing.html | Growth | Landing page, anonymous votes, fingerprint dedup | auth.js (anon RPCs) |
| colosseum-plinko.html | Defense | 4-step signup gate | auth.js, config.js |
| colosseum-groups.html | Social | Groups discover/detail/challenges (inline JS) | auth.js, config.js |
| src/reference-arsenal.ts | Social | window.ColosseumArsenal (forgeReference, verifyReference, citeReference, challengeReference, showForgeForm, renderArsenal, renderLibrary) | auth.ts (safeRpc), config.ts (escapeHTML, showToast) |

---

# MAINTENANCE LOG

| Session | Entries Changed | What Happened |
|---------|----------------|---------------|
| 122 | Initial draft | Defense layer, arena basics, flows, contracts |
| 122 | Arena expansion | Power-ups (4 RPCs + tables + state), debate room wiring (showPreDebate, AI round loop, endCurrentDebate full trace), spectator system (3 RPCs + page), scoring, 2 new flows |
| 122 | Social expansion | Predictions (2 tables, 3 RPCs, standalone + debate-linked), Groups (7 RPCs, GvG challenges with status flow), Profile CRUD (update, delete, avatar, bio), Follows/Rivals (3 RPCs), Leaderboard, Notifications detail, 3 new flows |
| 122 | Payments + Edge Functions | Stripe checkout/webhook Edge Functions (template status, idempotency, HMAC), payments.js, paywall.js, ai-sparring + ai-moderator Edge Functions, Groq model note |
| 122 | Growth layer | Bot army leg-by-leg (Leg 1 reactive, Leg 2 proactive, Leg 3 rage engine), all VPS files mapped, mirror generator, analytics (log_event, 9 views, daily_snapshots, funnel tracking), landing page votes, category classifier |
| 122 | Page load map | All 9 HTML pages: script loading order, init sequence, auth gate status, key dependencies. Head trio pattern documented. |
| 122 | Final gaps filled | Moderator system (4 RPCs, ruling panel, auto-allow timer, scoring), WebRTC/voice memo, auto-debate staking (4 RPCs), achievements/milestones (13 milestones, streak freeze, 2 RPCs), cosmetics shop (45 items, 2 RPCs, 2 tables). ALL SECTIONS COMPLETE. |
| 125-128 | No wiring changes | TypeScript migration Phases 0-4. All `.ts` mirrors created for 16 modules + 10 page modules. Original `.js` untouched. No new RPCs, tables, or flows. Wiring unchanged — file paths will update when Vite build is enabled. |
| 130 | No wiring changes | Vite build enabled on Vercel. 3 cosmetic bugs fixed (NaN powerups, NaN ELO, slider). Power-up shop entry points added (arena lobby + profile). All TS modules now live in production. |
| 131 | Bot army TS migration | All bot .js files migrated to .ts. PM2 runs `dist/bot-engine.js`. ecosystem.config.js script path updated. Source files are .ts, runtime is compiled dist/*.js. |
| 132 | No wiring changes | Vitest installed. 97 bot army tests. 2 classifier bugs fixed (substring match, regex ordering). Phase 6 steps 4-5 reassessed as full cutover. |
| 133-134 | set_profile_dob RPC added | Security audit Phases 1-3. Auth fixes (requireAuth bypass, UUID validation, _notify removed). DOB-in-JWT fix (trigger strips metadata, new RPC). Audit CLOSED. |
| 142 | Script tag removal | 76 legacy `<script>` tags removed across 11 HTML pages. All pages now single `<script type="module">` entry point via Vite. Dead .js files still in repo root but unreferenced by any HTML. |
| 147 | Section 4.10 added, Source Map row added | Reference Arsenal: 2 tables, 6 RPCs, 1 TS module. Column name bug caught (LM-186). |
| 150 | No wiring changes | edit_reference log_event bug fixed (named params). Verify flow confirmed end-to-end. Login/signup flow problems identified (LM-189). |
| 151 | No wiring changes | Full log_event named-param audit. 29 calls fixed across 26 RPCs. LM-188 closed. Zero positional calls remain. |
| 178 | Section 4C added | Live Debate Feed layer: debate_feed_events table (append-only B2B archive, broadcast trigger, 4 RPCs: insert_feed_event, get_feed_events, score_debate_comment, pin_feed_event). Moderator Dropout system: mod_dropout_log table, 3 RPCs (record_mod_dropout, check_mod_cooldown, get_mod_cooldown_minutes). arena_debates.scoring_budget_per_round column added. LM-191/192/193/194 added. 8 new ALWAYS rules + 4 new NEVER rules. |

---

> **STATUS: COMPLETE.** All layers mapped. Session 122 initial build. Updated through Session 178.
> Future additions: As new features are built, add entries here. Update affected entries at end of each session.
