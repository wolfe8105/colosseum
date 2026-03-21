# LAND MINE MAP — SESSION 91 ADDITIONS
# Append these entries to THE-COLOSSEUM-LAND-MINE-MAP.md
# Also update LM-149 NOTE section.

---

## UPDATE TO LM-149: leg2Bluesky flag missing from bot-config.js flags block

Add to end of existing LM-149 entry, before the closing ```:

```
NOTE (Session 91): Hit this AGAIN. Session 90 fixed the flag in the .env but
  the bot-config.js on GitHub (which was the basis for VPS copy) never had
  the bluesky flags OR the bluesky config block. Root cause: setup-bluesky.js
  patched bot-config.js on VPS to add both, but the GitHub version was never
  updated. When a fresh bot-config.js was uploaded from GitHub, it overwrote
  the patched version. Three-way fix required:
  1. Added bluesky: { handle, appPassword, maxPostsPerDay: 12, ... } config block via sed
  2. Added leg1Bluesky, leg2Bluesky, leg3BlueskyPost to flags block via sed
  3. Removed leg2Lemmy, leg3LemmyPost from flags block via sed
  Crash error was: "Cannot read properties of undefined (reading 'maxPostsPerDay')"
  because leg2-bluesky-poster.js v2 referenced config.bluesky.maxPostsPerDay
  but config.bluesky didn't exist.
SESSION: 58, recurred 77, recurred 90/91.
```

---

## LM-166: bot-config.js GitHub version diverges from VPS — VPS is authoritative
```
DECISION (Session 42): setup-bluesky.js patches bot-config.js on VPS to add
  a bluesky: { handle, appPassword, maxPostsPerDay, ... } config block.
  This patch was never committed back to GitHub.
BITES YOU WHEN: You upload bot-config.js from GitHub to VPS (via SCP or
  any other method). The GitHub version is missing the bluesky config block.
  The Bluesky poster crashes with "Cannot read properties of undefined
  (reading 'maxPostsPerDay')". Debates still get created in Supabase but
  never post to Bluesky — silent failure except for one error log line.
SYMPTOM: `pm2 logs` shows "Leg 2 pipeline failed for headline: Cannot read
  properties of undefined (reading 'maxPostsPerDay')" after every headline.
  Features line may or may not show L2-Bluesky depending on whether flags
  block was also lost.
FIX: Either:
  (a) Use sed to patch bot-config.js directly on VPS (preferred), or
  (b) Sync the VPS version back to GitHub so both match.
  Never upload GitHub → VPS for bot-config.js without verifying the bluesky
  block exists.
RULE: VPS bot-config.js is the authoritative version. GitHub is stale.
  When making bot-config changes, patch on VPS first, verify, then optionally
  push to GitHub.
SESSION: 42 (created divergence), 91 (burned by it).
```

---

## LM-167: SCP from multiple machines delivers stale files
```
DECISION: Pat switches between multiple computers at random times.
  Downloads from Claude land on whichever machine is active.
BITES YOU WHEN: Pat downloads a file on Machine A, switches to Machine B,
  runs SCP from Machine B's Downloads folder. Machine B has an older version
  of the file (or no file at all, and Windows serves a cached/renamed copy).
  SCP reports 100% success with correct byte count, but the content is wrong.
SYMPTOM: `grep "Session 91" /path/to/file.js` returns nothing after SCP
  reported success. File header shows an older session number.
  Extension of LM-152 (Windows browser cache) but with multi-machine twist.
FIX: After ANY SCP transfer, verify content on VPS:
  grep "UNIQUE_STRING" /path/to/file.js
  If wrong file, prefer sed patches directly on VPS instead of re-downloading.
RULE: For bot army files, default to sed patches on VPS. Reserve SCP for
  large new files that don't exist on VPS yet.
SESSION: 91 (SCP reported success, file was Session 75 not Session 91).
```

---

## LM-168: APP_BASE_URL default in bot-config.js pointed to Vercel not mirror
```
DECISION: bot-config.js app.baseUrl defaults to colosseum-six.vercel.app
  if APP_BASE_URL env var is not set or still has the old value.
  NT says all bot links should go to colosseum-f30.pages.dev (mirror).
BITES YOU WHEN: .env has APP_BASE_URL=https://colosseum-six.vercel.app
  (the original value). Every bot post links to Vercel instead of the
  static mirror. Mirror gets zero bot traffic.
SYMPTOM: Bluesky posts contain colosseum-six.vercel.app links instead of
  colosseum-f30.pages.dev links.
FIX: Set APP_BASE_URL=https://colosseum-f30.pages.dev in .env.
  Also update the hardcoded default in bot-config.js to match.
  Run pm2 restart all after .env change.
SESSION: 91 (found and fixed).
```

---

## LM-169: Three parallel debate tables — consolidation in progress (Session 101)
```
DECISION: The app has three debate table systems that evolved independently:
  - arena_debates (active, arena/matchmaking/AI sparring)
  - debates (legacy, original schema, still referenced by 8+ RPCs)
  - async_debates (hot-take-spawned, separate system — out of scope)
  The legacy `debates` table has 5 FK dependents: debate_votes, predictions,
  reports, debate_references, moderator_scores.
BITES YOU WHEN: Any new feature that touches debate outcomes (staking,
  replays, reference tracking, tournaments, leaderboard stats) has to know
  which table to query. Wrong table = silent data mismatch, not a crash.
  Leaderboard shows 12-3 but profile shows 8-3. Token staking settles
  against one table while the result lives in the other.
SYMPTOM: Stats don't match across screens. No error messages — just
  inconsistent numbers that erode user trust.
SCHEMA DIFFERENCES:
  - winner: UUID in debates, TEXT ('a'/'b'/'draw') in arena_debates
  - votes: votes_a/votes_b in debates, vote_count_a/vote_count_b in arena
  - status values differ (waiting/matched/completed/canceled vs pending/round_break/complete/cancelled)
  - format (debates) vs mode (arena_debates) — different enum values
  - debates has elo_change_a/b, recording_url, transcript — arena doesn't
  - arena has score_a/score_b — debates doesn't
CLIENT VIOLATIONS: colosseum-scoring.js L195 and L215 query `debates`
  table directly (bypassing castle defense RPC pattern).
FIX: Session 101 consolidation plan (DEBATE-TABLE-CONSOLIDATION-PLAN.md):
  Expand arena_debates schema → migrate data → re-point FKs → update all
  RPCs and client queries → drop legacy table.
  After Session 101: this entry becomes historical. Single table: arena_debates.
SESSION: 100 (identified), 101 (fix). RESOLVED Session 101.
```

---

## LM-170: landing_vote_counts table — anonymous votes on debate-landing page
```
DECISION (Session 103): colosseum-debate-landing.html was localStorage-only for
  voting. Added landing_vote_counts table + 2 SECURITY DEFINER RPCs
  (cast_landing_vote, get_landing_votes), both granted to anon role.
  RLS enabled with zero policies (deny all direct access).
BITES YOU WHEN: You add new demo debates to the hardcoded DEBATES object in
  colosseum-debate-landing.html but don't seed them in landing_vote_counts.
  The page will work fine (optimistic +1 render) but the counts won't persist
  server-side until someone actually votes.
ALSO BITES YOU WHEN: You test in Claude.ai artifact preview and see
  "[landing] fetch votes error: [object Object]" — that's the sandboxed iframe
  blocking external network requests. Not a real bug.
SYMPTOM: Vote counts reset on page reload (if no seed data and no real votes).
  Or: console warning in artifact preview only.
FIX: For new topics, either seed them in landing_vote_counts or let the first
  real vote create the row (cast_landing_vote uses INSERT ON CONFLICT).
PATTERN: voteCounted flag in the JS prevents double-counting between
  optimistic render (+1 before backend responds) and real counts from RPC.
  Both render() and downloadCard() check this flag.
SESSION: 103.
```

---

## LM-171: guard_profile_columns — actual columns protected (corrected Session 117)
```
DECISION (Session 117): Previous documentation (LM-001, LM-085, NT) incorrectly
  listed 21 columns as trigger-protected. The actual trigger only guards 4 columns:
  level, xp, streak_freezes, questions_answered.
  Session 117 added questions_answered to the trigger.
  The trigger uses RAISE EXCEPTION (not silent revert) when a direct client
  UPDATE attempts to modify these columns. SECURITY DEFINER RPCs bypass the
  trigger because they run as postgres.
BITES YOU WHEN: You assume other columns (elo_rating, token_balance, etc.) are
  trigger-protected when they are not. Those columns rely on RLS policies and
  RPC-only access patterns, not the trigger.
ALSO BITES YOU WHEN: You try to backfill questions_answered via a direct UPDATE
  from the Supabase dashboard — the trigger will block it. Disable the trigger
  first, update, re-enable.
FIX: If adding new protected columns, update the guard_profile_columns function
  body (CREATE OR REPLACE FUNCTION). No DROP needed — function signature is stable.
SESSION: 77 (streak_freezes added), 117 (questions_answered added, docs corrected).
```

---

## LM-172: questions_answered — tier thresholds vs available questions
```
DECISION (Session 117): Tier system has 6 tiers at 0/10/25/50/75/100 questions.
  Current questionnaire has only 39 questions across 12 sections.
  Users can reach Tier 2 (Contender, 25 questions) but NOT Tier 3+ (Gladiator
  needs 50, Champion 75, Legend 100).
BITES YOU WHEN: Marketing or UI implies users can reach Legend tier. They can't
  yet. The tier banner correctly shows progress but the goal posts are unreachable.
FIX: Either add more questions to the questionnaire, or recalibrate thresholds
  to fit 39 questions (e.g., 5/10/20/30/39). Thresholds are defined in two places:
  1. colosseum-tiers.js TIER_THRESHOLDS array (client display)
  2. RPCs that enforce server-side (place_stake, purchase_power_up — Phase 2+)
  Both must change together.
SESSION: 117.
```

---

## LM-173: increment_questions_answered — double-counting prevention
```
DECISION (Session 117): The profile-depth page tracks which questions were
  already answered before the current page session (previouslyAnsweredIds Set).
  Only newly answered questions get sent to increment_questions_answered.
BITES YOU WHEN: User opens profile-depth, answers 5 questions, saves, then
  answers 3 more in the same section and re-saves. The second save correctly
  sends only 3 (the new ones). BUT if user refreshes the page between saves,
  the previouslyAnsweredIds re-snapshots from localStorage — already-counted
  questions won't be double-counted because they're in the snapshot.
ALSO BITES YOU WHEN: Migration sync fires incorrectly. On init, if server
  questions_answered=0 but localStorage has answers, a one-time catch-up
  increment fires. This is correct for pre-existing users but could over-count
  if the user already had server-side questions_answered > 0 from a previous
  device. Low risk at current scale.
FIX: If ever a concern, add a server-side flag (e.g., tier_synced boolean) to
  prevent duplicate migration syncs.
SESSION: 117.
```

---

## LM-174: tokens vs token_balance — Session 109 RPC column mismatch
```
DECISION (Session 118): Session 109 RPCs (place_stake, buy_power_up) were written
  referencing a `tokens` column on profiles. The actual column is `token_balance`.
  Both RPCs had the bug in two places: SELECT (reading balance) and UPDATE (deducting).
  Fixed in Session 118 by patching both RPCs in Supabase.
BITES YOU WHEN: Any new SECURITY DEFINER RPC that reads or writes the user's token
  balance. If you write `tokens` instead of `token_balance`, the RPC will fail with
  "column tokens does not exist" — a runtime error, not a compile-time catch.
ALSO BITES YOU WHEN: You copy-paste from an existing RPC that was written before this
  fix. Always verify column names against the actual profiles table schema.
SYMPTOM: RPC returns error: "column 'tokens' does not exist". Staking and power-up
  purchases silently fail.
FIX: The column is `token_balance`. Always verify with:
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name LIKE '%token%';
PATTERN: Session 109 was a planning+build session that created RPCs against an
  assumed schema without testing. The column name was wrong from day one but nobody
  caught it because the frontend staking flow was never tested end-to-end until
  Session 118.
SESSION: 109 (introduced), 118 (fixed).
```

---

## LM-175: settle_stakes — pool_id vs debate_id join mismatch
```
DECISION (Session 118): settle_stakes RPC line 29 queried:
  `SELECT * FROM stakes WHERE pool_id = v_pool.id AND user_id = v_user_id`
  But the stakes table has no `pool_id` column — it has `debate_id`.
  This meant settlement would NEVER find the user's stake, silently returning
  "No stake placed" and marking the pool as settled with zero payouts.
  Fixed to: `WHERE debate_id = p_debate_id AND user_id = v_user_id`.
BITES YOU WHEN: A debate completes and settle_stakes is called. Users who staked
  tokens would lose them permanently — deducted on place_stake but never returned
  on settlement because the lookup failed silently.
SYMPTOM: settle_stakes returns {success: true, payout: 0, message: "No stake placed"}
  even when the user definitely placed a stake. No error — just silent data loss.
FIX: Always join stakes on debate_id (the column that actually exists), not pool_id.
  The stake_pools table has its own id, but stakes reference debates directly.
SESSION: 109 (introduced), 118 (fixed).
```

---

## LM-176: activate_power_up — missing activated boolean flag
```
DECISION (Session 118): activate_power_up RPC set `activated_at = now()` but
  never set `activated = true`. The debate_power_ups table has both columns:
  `activated` (boolean) and `activated_at` (timestamp). The get_my_power_ups RPC
  reads the `activated` boolean to show UI state. Without setting the boolean,
  power-ups would appear un-activated in the frontend after being used.
  Fixed to: `SET activated = true, activated_at = now()`.
BITES YOU WHEN: A user activates a power-up during a debate. The timestamp gets
  set but the boolean stays false. Frontend shows the power-up as still available.
  User could potentially re-activate (the activated_at IS NULL check would fail,
  so the RPC would correctly reject — but the UI would be misleading).
SYMPTOM: Power-up shows as not activated in the UI after activation. No crash,
  just confusing UX.
FIX: Always set both `activated = true` AND `activated_at = now()` together.
  If you add new boolean+timestamp pairs, make sure the RPC updates both.
SESSION: 109 (introduced), 118 (fixed).
```

---

## LM-177: settle_stakes requires stake_pools.winner column
```
DECISION (Session 123): settle_stakes RPC writes the winner value to
  stake_pools.winner for record-keeping. But the column didn't exist.
BITES YOU WHEN: settle_stakes fires after a debate completes. Without the
  column, the RPC fails with "column winner does not exist".
SYMPTOM: Stakes placed successfully, tokens deducted, but settlement fails.
  Tokens locked in pool forever. Post-debate screen may or may not show
  staking results depending on error handling.
FIX: ALTER TABLE stake_pools ADD COLUMN IF NOT EXISTS winner TEXT.
  Already applied Session 123.
SESSION: 123 (found and fixed).
```

---

## LM-178: claim_action_tokens — log_event must use named parameters
```
DECISION (Session 123): claim_action_tokens called log_event with positional
  args: log_event(v_user_id, 'token_earn', json_build_object(...)).
  Actual log_event signature is (p_event_type text, p_user_id uuid, ...,
  p_metadata jsonb). Positional args were in wrong order with wrong types.
BITES YOU WHEN: Any token claim action fires. The log_event call fails,
  which may or may not cascade depending on whether the RPC wraps it in
  a BEGIN/EXCEPTION block.
SYMPTOM: Token claim succeeds but event not logged. Analytics views that
  read from event_log show no token_earn events.
FIX: Use named parameters: log_event(p_event_type := 'token_earn',
  p_user_id := v_user_id, p_metadata := jsonb_build_object(...)).
  Already applied Session 123.
SESSION: 123 (found and fixed).
```

---

## LM-179: token_earn_log column is earn_type not action
```
DECISION (Session 124): get_my_milestones and claim_milestone RPCs both
  referenced a column called `action` on token_earn_log. The actual column
  is `earn_type`. Second bug: claim_milestone tried to store text milestone
  keys (like 'first_hot_take') in `reference_id` which is UUID type.
BITES YOU WHEN: Any page loads (get_my_milestones fires on every page load
  via colosseum-tokens.js init). Console shows 400 error on every page.
SYMPTOM: "column action does not exist" 400 error in console on every page
  load. Milestones never load, milestone toasts never fire.
FIX: Milestones stored as earn_type = 'milestone:key_name' pattern.
  reference_id set to NULL for milestones (it's UUID, can't hold text).
  get_my_milestones reads earn_type LIKE 'milestone:%' and strips prefix.
PATTERN: When writing RPCs against tables you haven't opened recently,
  always verify column names with:
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'token_earn_log';
SESSION: 124 (found and fixed).
```

---

## LM-180: PostgREST 404s on untyped record returns
```
DECISION (Session 124): get_category_counts RPC returned bare `record` type.
  PostgREST will not expose functions that return untyped `record` — it
  returns 404 even though the function exists with correct permissions.
BITES YOU WHEN: Any RPC uses `RETURNS record` or `RETURNS SETOF record`.
  The function compiles fine in SQL Editor but PostgREST never serves it.
SYMPTOM: RPC call returns 404. Function exists in pg_proc. Permissions are
  correct. But PostgREST acts like the function doesn't exist.
FIX: Use RETURNS TABLE(col1 TYPE, col2 TYPE, ...) instead of RETURNS record.
  Note: changing return type requires DROP FUNCTION first — can't use
  CREATE OR REPLACE to change a function's return type.
RULE: Never use bare `record` return type for RPCs that PostgREST exposes.
  Always use RETURNS TABLE(...) or RETURNS a named composite type.
SESSION: 124 (found and fixed).
```

---

## LM-181: get_category_counts was last debates table holdout
```
DECISION (Session 101): Legacy `debates` table eliminated, all code migrated
  to `arena_debates`. But get_category_counts still queried `public.debates`
  with old status values (live, waiting, matched).
BITES YOU WHEN: get_category_counts is called (home page carousel counts).
  If debates table still exists, returns stale/wrong counts. If debates
  table was dropped, returns error.
SYMPTOM: Category counts show 0 or wrong numbers. Combined with LM-180
  (record return type), the function was double-broken — 404 before the
  query even ran.
FIX: Rewritten to query arena_debates with correct status values (live,
  pending, lobby, matched). Legacy table elimination now truly complete.
SESSION: 101 (thought it was done), 124 (last holdout found and fixed).
```

---

## LM-182: Double settle_stakes call in endCurrentDebate
```
DECISION (Session 123): endCurrentDebate() in colosseum-arena.js called
  ColosseumStaking.settleStakes() twice — once from Session 109 (no
  multiplier param) and once from Session 110 (with power-up multiplier).
  Session 110 added the multiplier-aware version but didn't remove the
  Session 109 version.
BITES YOU WHEN: A debate ends with a stake placed. Settlement fires twice.
  Second call may double-pay winners or error depending on idempotency.
SYMPTOM: settle_stakes returns success twice. If no idempotency guard,
  winners get double payout. The idempotency guard (checks pool.status =
  'settled') catches this — second call returns "already settled" — but
  it's still a wasted RPC call and potential race condition.
FIX: Delete the Session 109 settle_stakes call. Keep only the Session 110
  version with multiplier support.
RULE: When adding a replacement function call, always search for and remove
  the original. Use Ctrl+F for the function name across the whole file.
SESSION: 109 (original), 110 (added duplicate), 123 (found and fixed).
```

---

## LM-183: Arena popstate — replaceState for forward, arrow wrapping required
```
DECISION (Session 121): Rewrote arena navigation to eliminate _skipNextPop
  boolean which caused race conditions with dual overlays.
  New pattern: Forward navigation uses history.replaceState (no history
  entry created). Back/cancel uses history.back().
  closeRankedPicker(forward) and closeModeSelect(forward) both take a
  boolean param — forward=true means replaceState, forward=falsy means
  history.back().
BITES YOU WHEN: Event listener callbacks are NOT wrapped in arrow functions.
  Example: btn.addEventListener('click', closeModeSelect) — the click
  Event object passes as the forward parameter, which is truthy, so it
  calls replaceState instead of history.back(). User presses CANCEL but
  doesn't go back.
SYMPTOM: Cancel/back buttons don't navigate back. The overlay closes but
  the URL doesn't change. Pressing browser back goes to a stale state.
FIX: Always wrap: () => closeModeSelect() not closeModeSelect.
  This applies to any function with a boolean parameter used as a
  click handler.
SESSION: 121 (introduced and documented).
```

---

## LM-184: AI debates must be created as 'pending' not 'live'
```
DECISION (Session 121): create_ai_debate RPC was inserting debates with
  status = 'live'. Changed to status = 'pending'. The flip to 'live'
  happens in enterRoom() which calls update_arena_debate({p_status:'live'}).
BITES YOU WHEN: Someone reverts create_ai_debate to insert as 'live'.
  place_stake requires status IN ('pending','lobby','matched'). If the
  debate is already 'live' at creation, the staking window doesn't exist.
  Users can never stake on AI debates.
ALSO BITES YOU WHEN: enterRoom() fails or is bypassed. The debate stays
  'pending' forever. Staking settlement looks for 'completed' status —
  'pending' debates never settle, tokens locked in pool forever.
SYMPTOM: "Cannot stake on this debate" error for AI sparring. Or: debate
  shows as pending indefinitely in the database.
FIX: AI debates must always be created as 'pending'. enterRoom() flips
  to 'live'. endCurrentDebate() flips to 'complete'. The full status flow
  is: pending → live → complete.
SESSION: 121 (found and fixed).
```

---

## LM-185: IIFE modules must use ColosseumAuth.safeRpc not bare safeRpc
```
DECISION (Session 121): colosseum-staking.js and colosseum-powerups.js are
  IIFEs (Immediately Invoked Function Expressions) that don't expose window
  globals. They call safeRpc() but safeRpc doesn't exist at window scope —
  it's a method on ColosseumAuth.
BITES YOU WHEN: An IIFE module calls bare safeRpc('rpc_name', params).
  This throws "safeRpc is not defined" at runtime when the function is
  invoked.
SYMPTOM: "safeRpc is not defined" error in console when staking or
  power-up functions fire. Feature silently fails.
FIX: Always use ColosseumAuth.safeRpc('rpc_name', params) in IIFE
  modules. The TypeScript migration (Phase 2) eliminates this class of
  bug permanently — import { safeRpc } from './auth' makes the
  dependency explicit and compile-time checked.
NOTE: This is structurally impossible after TypeScript migration Phase 2
  (Session 126). Only applies to the original .js files.
SESSION: 121 (documented). TypeScript fix: Session 126.
```

---

## LM-186: verify_reference rivals column names — challenger_id/target_id not user_id/rival_id
```
DECISION (Session 147): The reference-arsenal-migration.sql from Session 146
  had wrong column names for the rivals table query inside verify_reference RPC.
  Used `user_id` and `rival_id` — actual columns are `challenger_id` and `target_id`.
  Caught by querying information_schema.columns before running migration.
  Fixed in the SQL before execution.
BITES YOU WHEN: Any new RPC that queries the rivals table. The column names
  are not intuitive — `challenger_id` is the user who declared the rivalry,
  `target_id` is who they declared against. Rivalries are one-directional
  (Session 23 design), so both directions must be checked to find ANY rivalry
  between two users.
ALSO BITES YOU WHEN: You assume rivals have a `status = 'accepted'` gate.
  The declare_rival RPC creates rows with status 'pending' by default, but
  the current UX does not have an accept flow — the row just exists.
  verify_reference currently counts ALL rival rows regardless of status.
  If an accept flow is added later, update verify_reference to filter
  by status = 'accepted'.
PATTERN: Same class of bug as LM-174 (tokens vs token_balance). Schema
  assumptions without verification. Rule: always query information_schema
  before writing any RPC that touches a table.
SESSION: 146 (introduced), 147 (caught and fixed before execution).
```
