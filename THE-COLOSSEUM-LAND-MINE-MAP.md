# THE COLOSSEUM — LAND MINE MAP
### The Anti-Friendly-Fire Document — Read Before Touching Anything
### Last Updated: Session 29 (March 4, 2026)

> **Purpose:** Every decision we've made has a consequence if you step on it wrong.
> This document maps cause → effect → what bites you → how to fix it.
> Read this before any SQL change, any schema migration, any auth touch, any bot config change.
> **This is a living document. Add an entry every time something burns us.**

---

## HOW TO READ THIS

```
DECISION: What we built / decided
PROTECTS / DOES: Why it exists
BITES YOU WHEN: The exact scenario that blows up
SYMPTOM: What you'll see when it goes wrong
FIX: The correct way to handle it
```

---

# SECTION 1: DATABASE TRIGGERS

---

## LM-001: guard_profile_columns trigger
```
DECISION: BEFORE UPDATE trigger on profiles table (colosseum-rls-hardened.sql)
PROTECTS: Prevents any authenticated client from directly modifying protected columns
PROTECTED COLUMNS: elo_rating, wins, losses, draws, current_streak, best_streak,
  debates_completed, level, xp, token_balance, subscription_tier,
  stripe_customer_id, stripe_subscription_id, trust_score, profile_depth_pct,
  is_minor, created_at
BITES YOU WHEN: You run any UPDATE on profiles that touches one of those columns,
  whether from SQL Editor (postgres role), client JS, or any non-service_role context.
  UPDATE succeeds (says "1 row affected") but the column silently reverts to OLD value.
SYMPTOM: "Success" with no error. Column unchanged. Extremely confusing.
BYPASS CONDITION: Only bypasses if current_setting('role') = 'postgres' OR 'service_role'.
  SQL Editor runs as 'postgres' role ONLY when connected via Dashboard.
  Some SQL Editor sessions run differently — test with a SELECT after UPDATE.
FIX: Disable trigger → UPDATE → re-enable (all in one block):
  ALTER TABLE profiles DISABLE TRIGGER guard_profile_columns;
  UPDATE profiles SET subscription_tier = 'creator' WHERE id = 'UUID';
  ALTER TABLE profiles ENABLE TRIGGER guard_profile_columns;
SESSIONS: Built Session 16/17, burned us Session 29
```

---

## LM-002: profiles_updated trigger (touch_updated_at)
```
DECISION: AFTER UPDATE trigger on profiles, calls touch_updated_at()
PROTECTS: Keeps updated_at column current
BITES YOU WHEN: Never dangerous — just be aware it fires on every UPDATE
SYMPTOM: N/A — informational only
FIX: N/A
```

---

## LM-003: handle_new_user trigger (on auth.users)
```
DECISION: Supabase auth trigger that auto-creates profile row on signup
PROTECTS: Ensures every auth user has a corresponding profiles row
BITES YOU WHEN: If the trigger fails (e.g. schema mismatch, missing column),
  user can authenticate but app crashes because _loadProfile() returns nothing.
  Also: if you add a NOT NULL column to profiles without a DEFAULT, new signups break silently.
SYMPTOM: User can log in but profile is null, app shows broken state or crashes
FIX: Always add DEFAULT values for any new column on profiles. Never add NOT NULL
  without a DEFAULT. Check trigger body matches schema after any migration.
SESSIONS: Established Session 1
```

---

# SECTION 2: RLS POLICIES

---

## LM-004: profiles table — UPDATE allowed but guard trigger controls it
```
DECISION: profiles_update_own policy allows UPDATE WHERE id = auth.uid()
PROTECTS: Users can update their own safe fields (display_name, bio, avatar_url, username)
BITES YOU WHEN: Any attempt to UPDATE protected columns from client JS will silently fail
  even though RLS says UPDATE is allowed. The guard trigger (LM-001) is the real gatekeeper.
SYMPTOM: No RLS error thrown. Update appears to succeed. Column unchanged.
FIX: All protected column updates must go through SECURITY DEFINER functions or
  the disable-trigger pattern (LM-001).
```

---

## LM-005: auto_debates — public SELECT allowed, but only for status='active'
```
DECISION: colosseum-fix-auto-debate-rls.sql — allows anonymous SELECT on auto_debates
  WHERE status = 'active' only
PROTECTS: Bot army funnel — verdict pages are ungated
BITES YOU WHEN: You query auto_debates for status='complete' or 'pending' without auth,
  or try to JOIN auto_debates with a table that has stricter RLS.
SYMPTOM: Empty result set, no error thrown. Looks like no data exists.
FIX: Remember the status filter is in the RLS policy, not the query.
  Non-auth users only see active debates regardless of what your query says.
SESSIONS: Fixed Session 23
```

---

## LM-006: auto_debate_votes — public INSERT/SELECT allowed (ungated by design)
```
DECISION: Guests can vote on auto-debates without signing in
PROTECTS: Conversion funnel — vote first, sign up later
DO NOT FIX: This is intentional. Every session someone will want to "fix" this. Don't.
BITES YOU WHEN: You add auth checks to the voting flow — kills the rage-click funnel
SYMPTOM: Conversion drops to zero if you gate voting
```

---

## LM-007: rate_limits table — service_role only
```
DECISION: rate_limits_service_only policy — only service_role can read/write rate_limits
PROTECTS: Prevents users from reading or gaming rate limit state
BITES YOU WHEN: You try to query rate_limits from client JS or SQL Editor as anon user
SYMPTOM: Permission denied or empty result
FIX: Rate limit checks go through check_rate_limit() SECURITY DEFINER function only
SESSIONS: Built Session 16
```

---

## LM-008: profiles_public view vs profiles table
```
DECISION: profiles_public view exposes safe columns. profiles_private view for owner.
PROTECTS: stripe_customer_id, stripe_subscription_id never exposed via public queries
BITES YOU WHEN: You SELECT * from profiles in client-facing code — you get Stripe IDs
  (even though RLS policy allows it, it's a data leak risk).
  Also: profiles_private only returns rows for auth.uid() match — querying it as anon = empty.
FIX: Always use profiles_public for leaderboards, user cards, opponent displays.
  Use profiles_private only for the authenticated user's own settings screen.
```

---

## LM-009: debate_queue — unique constraint on waiting entries
```
DECISION: idx_queue_one_waiting — one waiting queue entry per user at a time
PROTECTS: Prevents queue flooding, double-matching
BITES YOU WHEN: User clicks "Enter Queue" twice fast, or network retry on a successful join
  gives a unique constraint violation error
SYMPTOM: join_debate_queue() RPC returns error "duplicate key value violates unique constraint"
FIX: Handle this error gracefully in the UI — treat it as "already in queue, proceed to polling"
  rather than showing an error toast
SESSIONS: Built Session 24
```

---

## LM-010: arena_votes — unique per user per debate
```
DECISION: UNIQUE(debate_id, user_id) on arena_votes
PROTECTS: One vote per user per debate
BITES YOU WHEN: Optimistic UI lets user click vote twice before first response returns.
  Second call hits unique constraint, returns error, optimistic UI is now wrong.
SYMPTOM: Vote count looks right but a console error fires. State inconsistency if not handled.
FIX: Disable vote button immediately on first click (before response). Re-enable only on error.
SESSIONS: Built Session 24
```

---

# SECTION 3: SECURITY DEFINER FUNCTIONS

---

## LM-011: credit_tokens() — service_role ONLY
```
DECISION: credit_tokens() checks current_setting('role') = 'service_role' and throws if not
PROTECTS: The most critical vulnerability found — any auth user was previously able to
  credit unlimited tokens to any user ID.
BITES YOU WHEN: You try to call credit_tokens() from client JS, SQL Editor (as anon),
  or any Supabase RPC call that isn't from the Stripe webhook (service_role).
SYMPTOM: RAISE EXCEPTION 'credit_tokens: service_role only'
FIX: credit_tokens() is ONLY called by Stripe webhook handler (Edge Function runs as service_role).
  Never call it from client code. Never expose it in any API route.
SESSIONS: Fixed Session 16 — most dangerous vulnerability in the entire codebase
```

---

## LM-012: debit_tokens() — requires sufficient balance
```
DECISION: debit_tokens() checks balance before deducting
PROTECTS: Prevents negative token balances
BITES YOU WHEN: You call debit_tokens() without first checking balance in the UI
SYMPTOM: RPC returns error JSON {success: false, error: 'insufficient_tokens'}
FIX: Always check token_balance from currentProfile before calling any token-spending RPC.
  Show "not enough tokens" UI state before the RPC call.
```

---

## LM-013: update_profile() — safe fields only
```
DECISION: update_profile() SECURITY DEFINER function only updates display_name,
  avatar_url, bio, username
PROTECTS: Anything not in that list cannot be updated through this function
BITES YOU WHEN: You add a new "safe" field to profiles (e.g. timezone, language preference)
  and expect update_profile() to handle it — it won't. Field is silently ignored.
SYMPTOM: No error. Update appears to succeed. New field unchanged.
FIX: Add the new field to the update_profile() function body AND the allow-list in the function.
  Remember to handle NULL vs empty string properly.
```

---

## LM-014: create_hot_take() — requires auth
```
DECISION: create_hot_take() checks auth.uid() IS NULL and returns error
PROTECTS: Guests cannot post hot takes
BITES YOU WHEN: Guest mode — if you call create_hot_take() without a session,
  RPC returns {success: false, error: 'not_authenticated'}
SYMPTOM: Post silently fails or shows generic error toast
FIX: Always check currentUser before showing the post composer. If guest, trigger
  the Plinko Gate redirect instead of calling the RPC.
```

---

## LM-015: react_hot_take() — toggle function
```
DECISION: react_hot_take() is a TOGGLE — one call adds reaction, second call removes it.
  This is by design (NT 4.19).
PROTECTS: Clean like/unlike UX without separate add/remove RPCs
BITES YOU WHEN: You call it twice in rapid succession (double-tap, network retry).
  Net result: reaction added and immediately removed. User sees no reaction.
SYMPTOM: Reaction appears then disappears. Count unchanged.
FIX: Debounce the reaction button. Disable it during the RPC call. Re-enable on response.
```

---

## LM-016: declare_rival() — capped at 5 active per user
```
DECISION: declare_rival() enforces maximum 5 active rivals per user (NT 4.26)
PROTECTS: Scarcity creates value — rivals mean something
BITES YOU WHEN: User tries to add a 6th rival
SYMPTOM: RPC returns {error: 'max_rivals_reached'} or similar
FIX: Check rival count before showing the ⚔️ RIVAL button. If at cap, show "rival slots full"
  or prompt them to remove one before adding.
```

---

## LM-017: advance_round() — references non-existent moderator_id column
```
DECISION: advance_round() in colosseum-ring3-functions.sql checks if the calling user
  is debater_a, debater_b, OR moderator_id — but debates table has no moderator_id column.
PROTECTS: Nothing currently — this is a bug
BITES YOU WHEN: advance_round() is called for any live debate
SYMPTOM: PostgreSQL column-not-found error. Round never advances.
STATUS: Known bug, not yet fixed (NT 12.3.10)
FIX NEEDED: Remove moderator_id check from advance_round() OR add moderator_id column
  to debates table. Do not ship live audio debates until this is resolved.
SESSIONS: Discovered and logged Session 28/29
```

---

## LM-018: check_rate_limit() — resets per time window
```
DECISION: Rate limiting stored in rate_limits table, keyed by user_id + action
PROTECTS: Prevents spam (post flooding, reaction farming, report flooding)
BITES YOU WHEN: Testing — if you call the same RPC repeatedly you'll hit rate limits
  and get errors that look like bugs but are actually working as intended.
  Also: rate_limits is in-memory per Vercel Edge instance (middleware.js) — this
  resets on cold starts. DB rate_limits (via check_rate_limit()) persists.
SYMPTOM: RPC returns {error: 'rate_limit_exceeded'}
FIX: During testing, either wait out the window or delete the rate_limits row:
  DELETE FROM rate_limits WHERE user_id = 'YOUR-UUID' AND action = 'action_name';
```

---

## LM-019: place_prediction() — UUID vs 'a'/'b' bug, fixed Session 21
```
DECISION: place_prediction() expected 'a' or 'b' as choice, but older code passed UUID
PROTECTS: N/A — this was a bug
STATUS: FIXED Session 21 (colosseum-fix-prediction.sql)
BITES YOU WHEN: If you ever see prediction placement silently fail, verify the
  p_choice parameter is literally the string 'a' or 'b', not a UUID or side label.
SYMPTOM: No error but prediction not recorded
SESSIONS: Fixed Session 21
```

---

# SECTION 4: AUTH PATTERNS

---

## LM-020: readyPromise pattern — never use setTimeout for auth
```
DECISION: ColosseumAuth.ready is a Promise that resolves when auth state is known (NT 4.23)
PROTECTS: Prevents rendering auth-gated content before session check completes
BITES YOU WHEN: You add a new page or feature and use setTimeout(fn, 800) instead of
  await ColosseumAuth.ready — the race condition from Session 10/22 comes back.
SYMPTOM: Page renders as "guest" even for logged-in users. Random auth-dependent
  features show wrong state on first load.
FIX: Every page that needs auth state must:
  await ColosseumAuth.ready; // THEN check currentUser
  Never use setTimeout as a proxy for auth completion.
SESSIONS: Fixed properly Session 23. Original bug Session 10.
```

---

## LM-021: Double safety net — 3s + 4s timeouts
```
DECISION: _checkSession() has 3s timeout. index.html appInit() has 4s Promise.race.
  Both exist in case Supabase auth hangs (NT 4.34).
PROTECTS: App always loads even if auth is completely dead
BITES YOU WHEN: You remove or reduce these timeouts. If Supabase has an outage,
  the app hangs forever for all users simultaneously.
  Also: if you add new auth-dependent init code AFTER the timeout fires,
  that code runs against a null session — handle null gracefully.
SYMPTOM: Infinite spinner on page load during Supabase outages
FIX: Never remove these timeouts. Never shorten below 3s/4s. Never add blocking
  auth-dependent code that runs outside the readyPromise chain.
SESSIONS: Built Session 26
```

---

## LM-022: navigator.locks — mock must load BEFORE Supabase CDN
```
DECISION: colosseum-locks-fix.js mocks navigator.locks with instant-resolve functions.
  This file loads as the FIRST script tag, before the Supabase CDN.
PROTECTS: Prevents orphaned navigator locks from hanging getSession(), signOut(),
  token refresh, and every .rpc() call.
BITES YOU WHEN:
  - You remove colosseum-locks-fix.js from any HTML page's script tags
  - You move it AFTER the Supabase CDN script tag
  - You try to put the mock inside auth.js init() — TOO LATE, CDN already captured locks
  - You set locks to undefined (Session 27 approach) — breaks Supabase fallback path,
    signOut hangs, session refresh fails silently
SYMPTOM: "getSession timed out after 3s — continuing as guest" in console.
  Logout button does nothing. Session lost on tab close/reopen. Tier shows 'free'.
FIX: colosseum-locks-fix.js must be <script src> BEFORE Supabase CDN on ALL pages.
  Currently: index.html, colosseum-login.html, colosseum-plinko.html,
  colosseum-auto-debate.html, colosseum-profile-depth.html, colosseum-settings.html
HISTORY:
  Session 26: Found orphaned locks hanging getSession. Added 3s timeout (band-aid).
  Session 27: Killed locks with value: undefined in auth.js init(). Deployed untested.
  Session 30: value: undefined broke signOut + session persistence. Tried mock in init()
    — still too late, CDN captures locks at parse time. Final fix: separate file.
TRADE-OFF: No cross-tab session sync. Acceptable because app is mobile-first.
```

---

## LM-023: placeholder mode — fires when credentials missing
```
DECISION: ColosseumConfig.placeholderMode.supabase triggers if SUPABASE_URL or
  SUPABASE_ANON_KEY are missing or contain 'PASTE_'
PROTECTS: App runs on localhost or fresh clone without credentials
BITES YOU WHEN: Credentials are present but wrong/expired — app silently enters
  placeholder mode and uses hardcoded fake data. Looks like it's working but nothing
  is hitting real Supabase.
SYMPTOM: Login "works" instantly. Profile shows "Gladiator", 1200 ELO. Hot takes
  are hardcoded. No network requests to Supabase visible in DevTools.
FIX: Check DevTools Network tab. If no requests to faomczmipsccwbhpivmp.supabase.co,
  you're in placeholder mode. Verify credentials in colosseum-config.js are current.
```

---

## LM-024: Supabase rpc() returns query builder, NOT a Promise
```
DECISION: Supabase .rpc() returns a PromiseLike query builder (NT OT 10.2)
PROTECTS: N/A — this is a Supabase API quirk
BITES YOU WHEN: You chain .catch() directly on supabase.rpc(). The .catch() receives
  a TypeError, not your error. Outer try/catch silently swallows it.
SYMPTOM: "Failed to load" state with no console error. Function was called but result
  was never handled. Looks exactly like a network error.
FIX: ALWAYS wrap .rpc() in try/catch. NEVER chain .catch() directly.
  Correct:   try { const { data, error } = await supabase.rpc('fn', params); }
  Wrong:     supabase.rpc('fn', params).catch(e => console.error(e))
SESSIONS: Burned us pre-bible era (OT 10.2)
```

---

## LM-025: onAuthStateChange — PASSWORD_RECOVERY event
```
DECISION: _listenAuthChanges() handles SIGNED_IN, PASSWORD_RECOVERY, SIGNED_OUT
PROTECTS: Password reset flow works after user clicks email link
BITES YOU WHEN: You strip the PASSWORD_RECOVERY handler thinking it's dead code.
  Password reset link clicks will authenticate the user but the app won't react —
  they'll see a blank state or get redirected to login instead of the reset modal.
SYMPTOM: Password reset link works (token valid) but user isn't prompted to set password
FIX: Never remove the PASSWORD_RECOVERY branch from _listenAuthChanges().
  It's not dead code — it's the password reset UX.
```

---

## LM-026: deleteAccount() — soft delete only
```
DECISION: deleteAccount() sets deleted_at timestamp, does NOT delete the auth.users row
PROTECTS: Data preservation, potential recovery
BITES YOU WHEN: You expect deleted accounts to be fully gone. They still exist in auth.users
  and can theoretically attempt login. If you ever build an "is this email available"
  check, it will see deleted accounts as taken.
SYMPTOM: Re-registration with same email fails (email already exists in auth.users)
FIX: If you need hard deletes, must call Supabase Admin API (service_role) to delete
  from auth.users. Client-side delete only does soft delete.
```

---

# SECTION 5: SUPABASE INFRASTRUCTURE

---

## LM-027: CORS — Supabase has no CORS dashboard setting
```
DECISION: Supabase CORS is handled via RLS + auth tokens + middleware.js + Edge Function CORS
  There is NO CORS setting in the Supabase dashboard (NT 4.21)
PROTECTS: N/A — informational
BITES YOU WHEN: You look for a CORS setting in Supabase dashboard and can't find it.
  You add permissive CORS thinking it's needed. You break Edge Function CORS config.
FIX: Never look for Supabase CORS settings — they don't exist. CORS for Supabase
  connections is controlled by auth tokens and RLS. CORS for Edge Functions is
  configured in the function code (stripe-cors-patch.js pattern).
SESSIONS: Confirmed Session 21
```

---

## LM-028: Edge Functions run as service_role
```
DECISION: Supabase Edge Functions (ai-sparring, stripe-*) run with service_role context
PROTECTS: They can bypass RLS, call service_role-only functions (credit_tokens)
BITES YOU WHEN: You think Edge Function calls are subject to RLS — they're not.
  An Edge Function can read/write any table bypassing all RLS policies.
  If you add malicious/untested code to an Edge Function, it has full DB access.
SYMPTOM: No permission errors from Edge Functions even on protected tables
FIX: Treat Edge Function code with the same scrutiny as DB admin access. Always
  validate inputs inside Edge Functions — they have no RLS safety net.
```

---

## LM-029: GROQ_API_KEY — stored as Supabase secret, not Vercel env
```
DECISION: GROQ_API_KEY is a Supabase Edge Function secret, not in Vercel env vars
PROTECTS: Key not exposed via Vercel's env (which is accessible to all Edge deployments)
BITES YOU WHEN: AI sparring stops working after a Supabase project reset or migration.
  Key must be re-set via: supabase secrets set GROQ_API_KEY=xxx
SYMPTOM: ai-sparring Edge Function returns 500 or falls back to canned responses
FIX: supabase secrets set GROQ_API_KEY=your_key --project-ref faomczmipsccwbhpivmp
SESSIONS: Set Session 25
```

---

## LM-030: Supabase free tier email limit — 2/hour
```
DECISION: Resend SMTP configured to replace Supabase default (NT 7.1.5)
PROTECTS: Custom email, no 2/hour rate limit
BITES YOU WHEN: If Resend config breaks or is removed, Supabase reverts to its
  built-in email (2/hour limit). Signup confirmation emails stop delivering.
SYMPTOM: Signups appear to work but users never receive confirmation email
FIX: Verify Resend is configured in Supabase Dashboard → Auth → SMTP Settings.
  Test with a real email address after any Supabase project config change.
SESSIONS: Fixed Session 9/10
```

---

## LM-031: 4 missing SQL files in GitHub
```
DECISION: Not all SQL migration files are in the repo (NT 12.3.7)
PROTECTS: N/A — this is a gap
BITES YOU WHEN: You clone the repo and assume the SQL folder is the source of truth.
  You try to re-apply migrations in order and get errors because files are missing.
  You try to reconstruct schema from repo files and miss tables/functions.
KNOWN MISSING: At least 4 files. Exact list unknown.
FIX: Supabase dashboard is the source of truth for schema, NOT the repo.
  When doing schema work, always query Supabase directly to verify current state.
  DO NOT trust repo SQL files as a complete picture of what's live.
SESSIONS: Discovered and logged Session 27
```

---

## LM-032: PostgreSQL UNION ALL syntax
```
DECISION: get_arena_feed() uses UNION ALL (OT 10.6)
PROTECTS: N/A — this is a PostgreSQL quirk
BITES YOU WHEN: You add ORDER BY or LIMIT inside individual branches of a UNION ALL.
  PostgreSQL throws cryptic "syntax error at or near UNION" pointing at the wrong line.
  Also: string literals in UNION branches need explicit casts ('arena'::text).
SYMPTOM: SQL paste fails with syntax error. Error message points at UNION keyword
  not the actual problem.
FIX: Wrap each SELECT branch in parentheses when using ORDER BY/LIMIT.
  Add ::text (or appropriate cast) to all string literals in UNION branches.
SESSIONS: Burned us Session 24
```

---

# SECTION 6: VERCEL / DEPLOYMENT

---

## LM-033: Vercel auto-deploys from GitHub main branch
```
DECISION: Vercel is connected to wolfe8105/colosseum, deploys on every push to main
PROTECTS: Zero-effort deployment
BITES YOU WHEN: You push broken code to main. It deploys immediately.
  No staging environment. Breaking main = breaking production.
SYMPTOM: App is broken for all users within ~60 seconds of a bad push
FIX: Test locally before pushing. Or push to a feature branch and only merge to main
  when verified. There is no rollback button — you must push a fix.
```

---

## LM-034: middleware.js — in-memory rate limiting resets on cold start
```
DECISION: middleware.js uses in-memory Map for rate limiting (not Redis/DB)
PROTECTS: API route abuse, oversized payloads (1MB limit), CORS enforcement
BITES YOU WHEN: Vercel spins up a new Edge instance (cold start, scale-out).
  The rate limit count resets to 0. Determined abusers can exhaust limits
  by waiting for new instances.
  Also: CORS enforcement in middleware.js only blocks API routes — it does NOT
  block direct Supabase calls from a browser (those bypass Vercel entirely).
SYMPTOM: Rate limited user can bypass by waiting for cold start or using a VPN
FIX: This is acceptable for now. Real rate limiting is in check_rate_limit() at DB level.
  Middleware is defense in depth, not primary protection.
SESSIONS: Built Session 16
```

---

## LM-035: vercel.json CSP — new external scripts need explicit allowlisting
```
DECISION: vercel.json has strict Content-Security-Policy header (NT 7.2.151)
  script-src allows: 'self', 'unsafe-inline', 'unsafe-eval', cdn.jsdelivr.net,
  js.stripe.com, unpkg.com
PROTECTS: XSS, injected scripts from untrusted CDNs
BITES YOU WHEN: You add a new CDN script tag (e.g., for a new library, Wrangler client,
  analytics, Cloudflare Beacon, etc.) and it's not in the CSP allowlist.
SYMPTOM: Script silently blocked. Feature doesn't work. Console shows:
  "Refused to load script from [URL] because it violates Content-Security-Policy"
FIX: Add the new domain to script-src in vercel.json before adding the script tag.
  Don't forget connect-src if the script makes XHR/fetch calls.
SESSIONS: Built Session 16
```

---

## LM-036: Stripe is SANDBOX mode
```
DECISION: All Stripe keys in colosseum-config.js and Vercel env are sandbox/test keys
PROTECTS: No real money flows during development
BITES YOU WHEN: You test payments and they work — and then forget it's fake.
  Real users cannot subscribe. Webhooks work but money doesn't move.
  Also: token pack pricing set has a known conflict (NT 12.3.11) — two conflicting
  pricing entries exist. Need human decision before production.
SYMPTOM: Everything looks like it works. No real charges happen. Stripe dashboard
  shows test transactions only.
FIX: Before launch, swap all STRIPE_* env vars to live keys. Test webhook endpoint
  with live Stripe events. Resolve conflicting token pack pricing first.
SESSIONS: Sandbox set Session 8. Conflict logged Session 28.
```

---

## LM-037: Stripe webhook paths bypass CORS in middleware.js
```
DECISION: telegram-webhook, discord-webhook, stripe-webhook paths skip CORS check
PROTECTS: These paths receive external POSTs (not from our domain)
BITES YOU WHEN: You add a new external webhook and forget to add it to the bypass list.
  The external service's POST gets rejected by CORS check.
SYMPTOM: Webhook deliveries fail. Stripe dashboard shows delivery errors.
FIX: Add new webhook paths to the isWebhook check in middleware.js.
```

---

# SECTION 7: BOT ARMY

---

## LM-038: DRY_RUN=true is the default — nothing posts until set to false
```
DECISION: Bot army boots with DRY_RUN=true in .env.example (NT 4.20)
PROTECTS: Prevents accidental live posting during setup/testing
BITES YOU WHEN: You deploy the bot, it runs, logs show activity — but nothing is
  actually posted anywhere. Looks like a bug. It's the safety catch.
SYMPTOM: Bot logs show "DRY_RUN: would post to reddit/discord/twitter" but zero
  actual posts appear on any platform.
FIX: Set DRY_RUN=false in .env on VPS only after you've verified logs look correct.
  Never set DRY_RUN=false in local .env.
```

---

## LM-039: Bot army uses service_role key — full DB access
```
DECISION: Bot army's supabase-client.js connects with SUPABASE_SERVICE_ROLE_KEY
PROTECTS: Bots need to read/write bot_activity, create auto_debates — requires bypassing RLS
BITES YOU WHEN: The VPS .env file is compromised. Attacker has full database access.
SYMPTOM: Data corruption, spam rows, token manipulation
FIX: Rotate SUPABASE_SERVICE_ROLE_KEY immediately if VPS is compromised.
  Never commit .env to git. Protect VPS SSH keys.
```

---

## LM-040: Leg 1 Twitter scanning is disabled
```
DECISION: leg1-twitter.js exists but Twitter/X API free tier has no read capability (NT 10.2)
PROTECTS: N/A — this is a limitation
BITES YOU WHEN: You calculate daily reach estimates including Twitter Leg 1.
  Twitter Leg 1 = 0 mentions. Reddit is the only Leg 1 source (~120/day, not ~370).
SYMPTOM: Projected reach overstated if Twitter Leg 1 is counted
FIX: All reach projections are Reddit-only for Leg 1 until $100/mo Twitter API paid.
  The bot file exists but leg1_twitter_enabled should be false in bot config.
SESSIONS: Confirmed Session 28
```

---

## LM-041: Bot army links must point to mirror, NOT Vercel app
```
DECISION: All bot army outbound links point to colosseum.pages.dev (mirror), not Vercel (NT 10.7)
PROTECTS: Mirror has zero JS/auth — bot traffic can't trigger auth bugs or hang.
  Also reduces Supabase bandwidth (bot-driven volume hits static CDN instead).
BITES YOU WHEN: After deploying bot army, links still point to colosseum-six.vercel.app
  because .env COLOSSEUM_URL wasn't updated.
SYMPTOM: Bot posts with working links but users land on auth-dependent Vercel app.
  Auth bugs affect the funnel. Supabase gets hammered by every bot-referred visitor.
FIX: Set COLOSSEUM_URL=https://colosseum.pages.dev in VPS .env before going live.
SESSIONS: Decision Session 28
```

---

## LM-042: Reddit bot accounts — 1 comment per 10 minutes on new accounts
```
DECISION: Reddit rate limits new accounts aggressively (OT 8.4.14)
PROTECTS: Reddit spam prevention
BITES YOU WHEN: New bot accounts are created and immediately start posting at full speed.
  Accounts get shadowbanned silently. All posts go through but no one sees them.
SYMPTOM: Bot logs show successful posts. Zero traffic from Reddit. No error messages.
RULE: New accounts must warm up — low frequency first week, build karma, then scale.
  Shadowbans are silent — you can only detect by checking posts while logged out.
FIX: Implement posting frequency ramp-up. Check post visibility from incognito regularly.
```

---

## LM-043: Discord bot — respond only, never spam
```
DECISION: Leg 1 Discord bot monitors servers for actual arguments, responds contextually
PROTECTS: Bot survival — Discord bans spam bots aggressively
BITES YOU WHEN: Bot posts too frequently or in wrong channels or off-topic
SYMPTOM: Bot account banned. Server ban. IP flagged.
FIX: Leg 1 Discord must be strictly reactive. Only reply to message threads with
  argument keywords. Never post unprompted. Respect per-server rate limits.
```

---

# SECTION 8: THREE-ZONE ARCHITECTURE

---

## LM-044: Mirror is NOT a shield in front of the app (NT 4.37)
```
DECISION: Static mirror controls where bot army volume goes, not where all traffic goes
PROTECTS: CDN absorbs bot-referred traffic
BITES YOU WHEN: You assume the Vercel app is unreachable because the mirror exists.
  Anyone can Google "The Colosseum debate app" and land directly on Vercel.
  All 12 defense rings must remain at full thickness on the Vercel app.
SYMPTOM: Security gaps on Vercel because you assumed mirror was the only entry point
FIX: Never thin the Vercel app's security because the mirror exists.
  Mirror = traffic steering. Not a proxy. Not a firewall.
SESSIONS: Decision Session 28
```

---

## LM-045: Mirror deploy skips on Supabase failure (NT 4.38)
```
DECISION: If mirror generator queries fail, skip wrangler deploy. Serve last good build.
PROTECTS: CDN never serves broken/empty HTML
BITES YOU WHEN: You remove the failure check and deploy anyway when Supabase is down.
  Cloudflare serves empty pages. All bot army links show blank site.
SYMPTOM: All bot army links break simultaneously during any Supabase downtime
FIX: Generator must exit(0) without deploying if any critical query returns empty/error.
  The CDN will keep serving the last successful deploy.
SESSIONS: Decision Session 28
```

---

## LM-046: Plinko Gate must exist before guest logic is stripped from Members Zone
```
DECISION: Build order is critical — Plinko Gate first, then strip Members Zone (NT 12.2)
PROTECTS: Unauthenticated users always have somewhere valid to go
BITES YOU WHEN: You strip guest fallbacks from Members Zone before Plinko Gate exists.
  Unauthenticated users hit a blank screen or JavaScript crash instead of signup flow.
SYMPTOM: App completely inaccessible to any new user. Bot army funnel is dead.
FIX: colosseum-plinko.html must be deployed and tested before any page removes
  its guest fallback logic. Do not do these in the same deploy.
SESSIONS: Decision Session 28/29
```

---

## LM-047: colosseum-login.html stays — Plinko Gate is a NEW file
```
DECISION: Plinko Gate = colosseum-plinko.html. login.html is NOT deleted or replaced.
PROTECTS: Existing password reset links, email confirm links point to colosseum-login.html
BITES YOU WHEN: You delete or rename colosseum-login.html.
  All Supabase auth redirect URLs (email verification, password reset) break.
  Users who click email links get 404.
SYMPTOM: Email confirmation links 404. Password reset links 404. User support nightmare.
FIX: login.html stays forever. Plinko Gate is a parallel file.
SESSIONS: Decision Session 29
```

---

## LM-048: Cloudflare Pages project is a human action
```
DECISION: The mirror cannot be deployed until a Cloudflare Pages project exists.
  Build the generator locally first. Deploy when VPS + Cloudflare project are ready.
PROTECTS: N/A — sequencing constraint
BITES YOU WHEN: You write the generator assuming it can deploy. VPS doesn't exist yet.
  Cloudflare project doesn't exist yet. Mirror builds but can't go anywhere.
SYMPTOM: wrangler pages deploy fails with "project not found"
FIX: Build the generator now. Set up Cloudflare Pages project (human action) before
  deploying. Generator must handle "can't deploy, skipping" gracefully.
SESSIONS: Decision Session 28/29
```

---

# SECTION 9: FRONTEND PATTERNS

---

## LM-049: window.X global pattern — script load order matters
```
DECISION: All modules expose themselves as window.ColosseumAuth, window.ColosseumConfig,
  window.ColosseumArena, etc. No ES modules, no import/export.
PROTECTS: Works with CDN-delivered HTML without a build step
BITES YOU WHEN: A page loads a module before its dependency is loaded.
  e.g. colosseum-async.js calls ColosseumAuth.supabase before auth.js has run.
SYMPTOM: "Cannot read property 'supabase' of undefined" or similar.
  Works on fast connections (scripts load in time), breaks on slow (race condition).
FIX: Script tags in HTML must be in dependency order:
  1. colosseum-config.js
  2. colosseum-auth.js
  3. all other modules
  Never reorder script tags. Never lazy-load dependencies.
```

---

## LM-050: Feature flags in colosseum-config.js — must be enabled to show UI
```
DECISION: VERSION 2.2.0 feature flags: followsUI, predictionsUI, rivals, arena (NT 4.27)
PROTECTS: Ships code without showing incomplete features
BITES YOU WHEN: You build a new feature but forget to add/enable its feature flag.
  Or you disable a flag thinking it's temporary and forget to re-enable.
SYMPTOM: Feature is coded, deployed, but UI never shows. No error.
FIX: When building any new feature, add its flag to colosseum-config.js AND
  verify it's set to true before testing. Check config version number matches
  what's deployed to Vercel.
```

---

## LM-051: Script load order — locks-fix → Supabase CDN → config → auth
```
DECISION: Script tags in <head> must be in this exact order:
  1. colosseum-locks-fix.js (mocks navigator.locks)
  2. Supabase CDN (captures locks at parse time — must see the mock)
  3. colosseum-config.js
  4. colosseum-auth.js
PROTECTS: Graceful auth initialization, no orphaned locks
BITES YOU WHEN: You reorder scripts, add async/defer, or forget locks-fix.js.
  - locks-fix after CDN = locks mock is useless, getSession hangs
  - CDN after auth = placeholder mode, no Supabase calls
  - config after auth = auth can't find credentials
SYMPTOM: Various — guest mode, placeholder mode, hanging RPCs, or all three.
FIX: Maintain the 4-file order. Never defer or async any of them.
SESSIONS: LM-022 explains the locks history. Updated Session 30.
```

---

## LM-052: OG meta tags — required per debate page for bot army previews
```
DECISION: Bot army posts links to debate pages. Social platforms unfurl these links.
  Without OG meta tags (og:title, og:description, og:image), previews are blank.
PROTECTS: Link preview quality drives click-through rate
BITES YOU WHEN: Mirror pages (colosseum.pages.dev/debate/ID) don't have per-debate
  OG tags — every link preview looks identical (or blank).
SYMPTOM: Bot posts links on Reddit/Discord. Preview card shows nothing or generic site name.
  CTR tanks. Bot army effectiveness cut in half.
FIX: Mirror generator must write unique og:title and og:description for every
  individual debate page. Use the debate topic + AI winner verdict as the tags.
  This is non-negotiable for the rage-click funnel.
SESSIONS: Decision Session 28
```

---

## LM-053: 44px touch targets — minimum for mobile interaction
```
DECISION: All interactive elements minimum 44px (NT 9.6)
PROTECTS: Usability on mobile (phone is the default device)
BITES YOU WHEN: You add a new button or tap target with height/width below 44px.
  Works on desktop. Frustrating to tap on mobile. User misses and closes overlay.
SYMPTOM: User feedback: "hard to tap", "mis-taps", "accidental closes"
FIX: Always set min-height: 44px; min-width: 44px on tappable elements.
  Test on actual phone, not browser DevTools mobile emulation.
```

---

# SECTION 10: SCHEMA / DATA INTEGRITY

---

## LM-054: subscription_tier CHECK constraint
```
DECISION: profiles.subscription_tier has CHECK (IN ('free','contender','champion','creator'))
PROTECTS: No invalid tier values
BITES YOU WHEN: You try to set a subscription tier to anything outside those 4 values.
  e.g. 'pro', 'premium', 'basic' all fail with constraint violation.
SYMPTOM: UPDATE fails with "violates check constraint"
FIX: Only use 'free', 'contender', 'champion', 'creator'. No other values.
  If adding a new tier, must ALTER TABLE to update the CHECK constraint first.
```

---

## LM-055: follows table — follower cannot follow self
```
DECISION: CHECK (follower_id != following_id) on follows table
PROTECTS: Data integrity — self-following is meaningless
BITES YOU WHEN: Testing — if you use the same test account for both sides of a follow
SYMPTOM: INSERT fails with check constraint violation
FIX: Test follows with two separate accounts. Handle this error gracefully in UI
  (hide follow button on own profile — which is already implemented).
```

---

## LM-056: hot_takes.section — must match category keys
```
DECISION: hot_takes are filtered by section name. Category overlay calls fetchTakes(section).
PROTECTS: Content appears in correct category feeds
BITES YOU WHEN: A hot take is posted with section = 'Sports' but overlay queries
  section = 'sports' (case mismatch). Or bot creates take with wrong section name.
SYMPTOM: Take exists in DB but never appears in any category feed.
FIX: Verify section values are lowercase and match exactly what colosseum-config.js
  defines for categories. Bot army must use the same keys.
```

---

## LM-057: debate_queue — expire_stale_queue() must run on schedule
```
DECISION: expire_stale_queue() RPC clears entries older than 5 minutes (NT 7.5.233)
PROTECTS: Queue doesn't fill with abandoned entries blocking new matches
BITES YOU WHEN: expire_stale_queue() is never called. Queue fills with stale entries.
  New users enter queue but match against abandoned entries = failed match.
SYMPTOM: Queue appears full but no matches form. Users wait forever.
FIX: A cron must call expire_stale_queue() regularly. Currently called from
  client-side queue polling — works as long as someone is in the queue.
  For production, add server-side cron call (bot army VPS cron job).
```

---

## LM-058: auto_debate_votes — no auth required, but one vote per IP/session limit?
```
DECISION: Auto-debate votes are ungated (LM-006). No user_id required.
PROTECTS: Funnel conversion — vote before signup
BITES YOU WHEN: Vote stuffing — same person votes 1000 times, skews results.
  Also: if you later add a unique constraint, it breaks the ungated design.
STATUS: No vote deduplication currently. Acceptable at current scale.
FIX: At scale, add client-side vote lock (localStorage flag). Never add server-side
  unique constraint — it would break the ungated voting by design.
```

---

# SECTION 11: KNOWN BUGS (ACTIVE — DO NOT FORGET)

---

## LM-059: advance_round() — moderator_id column does not exist
```
STATUS: ACTIVE BUG (NT 12.3.10)
LOCATION: colosseum-ring3-functions.sql line 271
IMPACT: Any live audio debate will fail to advance rounds. AI sparring uses
  a different flow (submit_debate_message), not advance_round() — AI sparring works.
DO NOT SHIP: Live audio debates until this is fixed.
FIX NEEDED: Remove the moderator_id check from advance_round(), or add the column.
```

---

## LM-060: Leaderboard is placeholder-only
```
STATUS: ACTIVE (NT 12.3.8)
IMPACT: colosseum-leaderboard.js has Supabase-ready queries but UI shows placeholder data
DO NOT SHIP: Leaderboard as a featured section until wired to real data
FIX NEEDED: Wire leaderboard queries to real profiles table ELO data
```

---

## LM-061: Login page may still hang (separate from navigator.locks fix)
```
STATUS: ACTIVE (NT 12.3.6)
LOCATION: colosseum-login.html
IMPACT: Users who navigate directly to login page may experience hang.
  The navigator.locks fix in auth.js is now working but login.html may have
  its own separate hang condition.
FIX NEEDED: Test colosseum-login.html directly (not via redirect from index).
  Check for any setTimeout-based auth waits or unbounded async calls.
```

---

## LM-062: Conflicting token pack pricing sets
```
STATUS: ACTIVE (NT 12.3.11, 4.41.3)
IMPACT: Two different token pack pricing sets exist. Unknown which is live in Stripe.
DO NOT SHIP: Token purchases to real users until resolved.
FIX NEEDED: Human decision on canonical pricing. Verify Stripe products match config.
```

---

## LM-063: Bebas Neue font unresolved
```
STATUS: ACTIVE (NT 12.3.9)
IMPACT: Font may fall back to system font on some devices. Visual inconsistency.
PRIORITY: Low — functional, not critical
FIX NEEDED: Verify Bebas Neue CDN load or switch to available alternative (Barlow Condensed
  is already in the visual system as the body font).
```

---

# SECTION 12: DESIGN / PRODUCT DECISIONS

---

## LM-064: Hated Rivals — 5 cap is intentional, do not increase
```
DECISION: Maximum 5 active rivals per user (NT 4.26)
PROTECTS: Scarcity creates social value. Rivals mean something if you can only have 5.
BITES YOU WHEN: You increase the cap thinking you're improving UX.
  Rivals lose their social weight. Feature becomes meaningless.
DO NOT CHANGE without serious deliberation.
```

---

## LM-065: react_hot_take is a toggle — do not split into add/remove
```
DECISION: Single RPC handles both add and remove (NT 4.19)
PROTECTS: Simpler API surface, idempotent behavior
BITES YOU WHEN: You replace the toggle with separate add_reaction/remove_reaction RPCs.
  Old client code calling the toggle will double-fire and cancel reactions.
DO NOT CHANGE API signature without updating all call sites simultaneously.
```

---

## LM-066: Guest access is default (NT 4.33)
```
DECISION: Anonymous users see the full app. Auth only required for actions.
PROTECTS: Bot army funnel — user lands on content immediately, not login wall.
BITES YOU WHEN: You add auth checks to content browsing (hot takes feed, auto-debates,
  leaderboard viewing, arena lobby). Kills every bot-referred user before they convert.
SYMPTOM: Conversion drops to near zero.
DO NOT add auth gates to any view-only action.
FIX: Auth gates belong ONLY on: post, vote in human debates, follow, challenge, debate.
```

---

## LM-067: Auto-debate voting is ungated by design (NT 4.33)
```
DECISION: Guests can vote on AI debates. Human debate votes still gated. (NT 10.2)
PROTECTS: Rage-click funnel completion — user votes, gets result, feels invested, signs up.
BITES YOU WHEN: You add auth check to auto-debate voting RPC or UI.
DO NOT gate auto-debate votes. This is the entire top-of-funnel mechanic.
```

---

## LM-068: Async debate mode is survival-critical for cold start
```
DECISION: App must never show a dead screen. Auto-debates populate arena lobby. (NT 4.30)
PROTECTS: Cold start problem — app appears active even with 1 user
BITES YOU WHEN: You remove the auto-debate population of arena lobby
  thinking "we have real users now". A lobby that can go empty still needs fallback.
SYMPTOM: Arena lobby shows empty screen at off-peak hours. New users leave immediately.
FIX: Always keep the auto-debate + placeholder card fallback logic in arena lobby.
  Real debates supplement it. They never fully replace it.
```

---

## LM-069: Spoke carousel — 6 tiles, hollow center, 18° tilt (NT 4.10)
```
DECISION: Home screen is a spoke carousel, not a tile grid. This is locked design.
PROTECTS: Mobile UX — tile grids failed all mobile UX research criteria
BITES YOU WHEN: You add a 7th or 8th spoke to the carousel.
  Layout breaks. Thumb-spin physics break. Cognitive load exceeds Miller's Law.
DO NOT add spokes without removing one. 6 is the number.
SESSIONS: Research Session 11. Built Session 12.
```

---

## LM-070: Cinzel + Barlow Condensed — typography is locked
```
DECISION: Display = Cinzel (Google Fonts). Body = Barlow Condensed. (NT 9.3)
PROTECTS: Fox News chyron energy + ESPN stats aesthetic
BITES YOU WHEN: You add a third font. Aesthetic becomes inconsistent.
  Also: if Google Fonts CDN is blocked by CSP or unavailable, display falls back
  to serif — test font loading failure gracefully.
DO NOT add fonts. Cinzel for titles, Barlow Condensed for everything else.
```

---

## LM-071: vercel.json CSP does NOT include Cloudflare CDN or Pages
```
DECISION: Current CSP allowlist was built before three-zone architecture (NT 4.35)
PROTECTS: XSS
BITES YOU WHEN: Mirror pages on colosseum.pages.dev try to load any resource that
  isn't covered by Cloudflare's own CSP. Or when Members Zone needs to reference
  mirror URLs in fetch calls.
SYMPTOM: Cross-origin resource blocks. Mirror assets fail to load.
FIX: When building the mirror, verify what external assets it needs and check
  that they're CDN-local or served from Cloudflare's own infrastructure.
  Members Zone fetch calls to mirror URLs may need connect-src updates.
SESSIONS: Architecture Decision Session 28
```

---

# SECTION 13: OPERATIONS

---

## LM-072: PM2 manages bot army on VPS — not cron, not systemd
```
DECISION: PM2 process manager runs bot army (OT 1.19.5)
PROTECTS: Auto-restart on crash. Log rotation. Startup on VPS reboot.
BITES YOU WHEN: VPS reboots and PM2 startup wasn't saved.
  pm2 start ecosystem.config.js runs bots, but after reboot they're all dead.
SYMPTOM: VPS is up, bots are silent, no activity in logs
FIX: After initial setup, run: pm2 startup && pm2 save
  This registers PM2 with systemd so it survives reboots.
```

---

## LM-073: Bot army needs SUPABASE_SERVICE_ROLE_KEY, not anon key
```
DECISION: Bot army connects to Supabase with service_role for RLS bypass
PROTECTS: Bots can write to bot_activity, create auto_debates, etc.
BITES YOU WHEN: .env has anon key instead of service_role key.
  Bot connects but all writes fail with RLS permission errors.
SYMPTOM: Bot runs, queries succeed (reads), writes fail silently or with RLS errors.
FIX: Verify .env on VPS has SUPABASE_SERVICE_ROLE_KEY, not SUPABASE_ANON_KEY.
  These are different keys. Service role key is in Supabase → Project Settings → API.
```

---

## LM-074: wrangler must be authenticated on VPS
```
DECISION: Mirror generator deploys via wrangler pages deploy (NT 4.36)
PROTECTS: Automated Cloudflare Pages deployment
BITES YOU WHEN: wrangler CLI on VPS is not authenticated to Cloudflare account.
  Mirror generates but deploy step fails with "authentication required".
SYMPTOM: Generator runs, HTML is built, wrangler throws auth error, deploy skipped.
FIX: Run wrangler login on VPS during initial setup. Or use API token:
  Set CLOUDFLARE_API_TOKEN env var. Wrangler uses it automatically.
SESSIONS: Architecture Decision Session 28
```

---

## LM-075: Mirror 5-minute cron via PM2 — not a setInterval in Node
```
DECISION: Mirror generator is triggered by PM2 cron, not a long-running process
PROTECTS: Generator is stateless — if it crashes, next cron invocation starts fresh
BITES YOU WHEN: You write the generator as a daemon with setInterval.
  Memory leak over 24 hours. Single crash means no more deploys until manual restart.
FIX: Generator is a single-run Node.js script. PM2 ecosystem.config.js schedules it
  with cron_restart or as a cron job. Exits 0 on success or failure.
SESSIONS: Architecture Decision Session 28
```

---

# SECTION 14: DEBUGGING LESSONS (DO NOT REPEAT)

---

## LM-076: "Success" doesn't mean it worked
```
LESSON: SQL Editor says "Success. 1 row affected." can still mean zero change happened.
  guard_profile_columns trigger silently reverts protected columns after the UPDATE.
  The UPDATE technically succeeded (row was touched) but the value didn't change.
RULE: After any UPDATE on profiles, always immediately SELECT to verify the value changed.
  Never trust "Success" alone.
SESSIONS: Burned us Session 29
```

---

## LM-077: Walk the chain before building theories
```
LESSON (OT 10.4): Wrong diagnosis proposed DOMContentLoaded wrappers, hardcoded keys.
  Real bug was .catch() on a query builder, not a Promise.
RULE: When debugging, verify every link: network request, config, RLS, query, render.
  Reproduce in browser console step by step. Never propose fixes before finding the break.
```

---

## LM-078: Spinner ≠ loading. Spinner may = infinite hang.
```
LESSON: Session 26 — infinite spinner was auth hanging on navigator.locks.
  Not a race condition. Not a script load order issue. Not a CORS issue.
  The spinner was the symptom. The lock was the cause.
RULE: When you see an infinite spinner, check DevTools Network tab first.
  If no Supabase requests are firing, the hang is in JS before the request.
  If requests are pending forever, suspect navigator.locks or network issue.
```

---

## LM-079: GitHub repo is NOT source of truth for schema
```
LESSON: 4 SQL files are missing from repo (NT 12.3.7). Repo SQL ≠ live Supabase.
RULE: When in doubt about schema, query Supabase directly:
  SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
  Never assume repo SQL files capture everything that's live.
```

---

## LM-080: The pattern — planning replaces building, building replaces shipping
```
LESSON (OT 5.6, NT 3.4): Three projects before this one all died in planning loops.
RULE: If we spend 2+ sessions designing something we haven't built yet, flag it.
  If we spend a session "organizing" or "refactoring" without user-facing output, flag it.
  The measure of a session is: can a real user do something new that they couldn't before?
```

---

*Land Mine Map v1 — Session 29. Add entries below as new mines are discovered.*
*Format: copy the template from the top of this file. Include SESSION: tag.*
*File lives in repo root alongside the testaments.*
