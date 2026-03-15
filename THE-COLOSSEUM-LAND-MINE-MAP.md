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
