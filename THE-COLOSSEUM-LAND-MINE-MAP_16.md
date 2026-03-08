# THE COLOSSEUM — LAND MINE MAP
### The Anti-Friendly-Fire Document — Read Before Touching Anything
### Last Updated: Session 59 (March 8, 2026) — Dead URL fix, .env correction, scp cache, require path pitfall

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

--
## LM-144: check_rate_limit() — race condition (FIXED Session D)
```
PROBLEM: Two concurrent calls could both read count=N before either wrote N+1.
  Both incremented to N+1. One tick was lost. Effective rate limit was 2x the intended max.
ROOT CAUSE: INSERT ... ON CONFLICT DO UPDATE is not atomic across the read+write cycle
  under READ COMMITTED isolation. Two transactions see the same pre-update value.
FIX: pg_advisory_xact_lock(hashtext(user_id || '|' || action)) before the upsert.
  Serializes all concurrent calls for the same user+action pair.
  Lock auto-releases at transaction end — no manual unlock needed.
  Zero deadlock risk: each call acquires exactly one lock.
BITES YOU WHEN: You remove the advisory lock and try to optimize. Don't.
  The lock adds ~1ms. Rate limit correctness is worth it.
SESSIONS: Fixed Session D (56)
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

## LM-022: navigator.locks — noOpLock in createClient config
```
DECISION: Pass noOpLock directly into createClient({ auth: { lock: noOpLock } }).
  noOpLock = async (name, acquireTimeout, fn) => { return await fn(); }
  This is the ONLY approach that works. Per supabase-js GitHub issue #1594.
PROTECTS: Prevents orphaned navigator locks from hanging auth init, signOut(),
  token refresh, and every .rpc() call.
BITES YOU WHEN:
  - You remove the lock: noOpLock from createClient config in auth.js
  - You try to mock navigator.locks globally instead (TOO LATE — CDN captures at parse)
  - You set locks to undefined (Session 27 approach) — breaks Supabase fallback path
  - You call getSession() separately instead of relying on INITIAL_SESSION event
  - You use await inside onAuthStateChange callback (deadlocks per Supabase docs)
SYMPTOM: "getSession timed out" in console. Guest mode. Logout does nothing.
  Session lost on tab close/reopen. Tier shows 'free'.
FIX: noOpLock must be in createClient config. auth.js must use onAuthStateChange
  INITIAL_SESSION as sole init path. No separate getSession(). No await in callback.
  Profile loading dispatched outside callback via setTimeout.
HISTORY:
  Session 26: Found orphaned locks hanging getSession. Added 3s timeout (band-aid).
  Session 27: Killed locks with value: undefined in auth.js init(). Broke signOut.
  Session 30: Tried separate colosseum-locks-fix.js before CDN. Global mock too late —
    GoTrueClient captures lock reference at module parse time, not at call time.
  Session 31: noOpLock in createClient config. auth.js rebuilt from scratch.
    INITIAL_SESSION sole init path. No await in callback. VERIFIED WORKING.
TRADE-OFF: No cross-tab session sync. Acceptable because app is mobile-first.
NOTE: colosseum-locks-fix.js still loads on all pages but is dead weight. Harmless.
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

## LM-051: Script load order — Supabase CDN → config → auth (locks-fix is dead weight)
```
DECISION: Script tags in <head> must be in this order:
  1. colosseum-locks-fix.js (DEAD WEIGHT — does nothing, harmless, can remove eventually)
  2. Supabase CDN
  3. colosseum-config.js
  4. colosseum-auth.js (contains the REAL fix: noOpLock in createClient config)
PROTECTS: Graceful auth initialization, no orphaned locks
BITES YOU WHEN: You reorder scripts, add async/defer.
  - CDN after auth = placeholder mode, no Supabase calls
  - config after auth = auth can't find credentials
  - You remove the noOpLock from createClient in auth.js (see LM-022)
SYMPTOM: Various — guest mode, placeholder mode, hanging RPCs, or all three.
FIX: Maintain CDN → config → auth order. Never defer or async any of them.
  The real locks fix lives INSIDE auth.js (createClient config), not in locks-fix.js.
SESSIONS: LM-022 explains the full locks history. Updated Session 31.
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
  Final resolution: Session 31 — noOpLock in createClient config.
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

## LM-081: Never await inside onAuthStateChange callback
```
LESSON (Session 31): Supabase docs explicitly warn that awaiting async calls inside
  onAuthStateChange callbacks causes deadlocks. The callback holds an internal lock.
  If you await something that also needs that lock (like getSession or profile fetch),
  it deadlocks permanently.
RULE: Dispatch async work OUTSIDE the callback via setTimeout(() => fn(), 0).
  The callback should only set synchronous state (currentUser, flags) and dispatch.
SESSION: 31. See LM-022 for full locks history.
```

---

## LM-082: INITIAL_SESSION is the sole init path — no separate getSession()
```
LESSON (Session 31): Supabase v2 fires INITIAL_SESSION from onAuthStateChange right
  after the client loads session from localStorage. This IS the "ready" signal.
  Calling getSession() separately is redundant and can hang (especially with locks).
RULE: onAuthStateChange INITIAL_SESSION replaces getSession(). If session exists,
  dispatch profile load. If not, resolve ready immediately. Safety timeout (5s)
  catches edge case where INITIAL_SESSION never fires.
SESSION: 31. Old pattern (getSession + timeout) from Session 26 is retired.
```

---

## LM-083: Problem-solving — search like a conversation, never self-feed
```
LESSON (Session 31): Claude spent 45+ minutes in a closed debugging loop — running
  tests, forming theories from its own output, never consulting external sources.
  The fix existed in a GitHub issue the entire time.
RULE: Never theorize in a closed loop. Search the web like a conversation:
  (1) describe problem → search → try top answer.
  (2) Failed → search "tried X, didn't work" → try next answers.
  (3) All failed → search with full history of attempts → answers narrow each round.
  Each iteration adds context. Never speculate or form theories from own output.
  Read what others solved and do exactly that. Stop thinking, start asking the world.
SESSION: 31.
```

---

---

## LM-084: Members Zone auth gate pattern — copy to every new page
```
DECISION (Session 32): Settings + profile-depth pages now gate on auth at DOMContentLoaded.
  Pattern: await ColosseumAuth.ready (4s timeout) → if no session and not placeholder mode
  → redirect to colosseum-plinko.html. index.html has same gate in its appInit().
PROTECTS: Three-zone architecture. Members Zone assumes valid session. No guest fallback.
BITES YOU WHEN: You add a new Members Zone HTML page and forget the auth gate.
  Guest arrives via direct URL → sees broken app with null profile, RPC errors everywhere.
  Or worse: sees a semi-functional app that leaks data or allows ungated actions.
SYMPTOM: Guest lands in Members Zone, no redirect, broken UI, console full of auth errors.
FIX: Every new Members Zone page must include at DOMContentLoaded:
  const session = await Promise.race([
    ColosseumAuth?.ready?.then(() => ColosseumAuth.currentUser),
    new Promise(r => setTimeout(r, 4000))
  ]);
  if (!session && !ColosseumAuth?.isPlaceholderMode?.()) {
    window.location.href = 'colosseum-plinko.html'; return;
  }
EXEMPT PAGES: colosseum-auto-debate.html, colosseum-debate-landing.html (ungated by design
  per LM-067 rage-click funnel). colosseum-login.html (stays for Supabase redirects per LM-047).
  colosseum-plinko.html (IS the gate). colosseum-terms.html (static).
SESSION: 32.
```

---

*Land Mine Map v1 — Session 29. Cleaned Session 55: fixed/one-time entries removed, Section 11 (resolved bugs) deleted.*

---

# SECTION 17: MIRROR DEPLOYMENT + BLUESKY (Session 42)

---

## LM-120: Cloudflare Pages --branch=production required
```
DECISION (Session 42): Cloudflare Pages production branch is called
  "production", not "main". Deploying with --branch=main sends to
  Preview environment, not production.
PROTECTS: N/A — this is a Cloudflare Pages convention.
BITES YOU WHEN: You deploy with --branch=main and wonder why
  colosseum-f30.pages.dev still shows old content. The new content
  is at main.colosseum-f30.pages.dev (Preview URL).
SYMPTOM: Root URL shows old content. Preview URL shows new content.
FIX: Always use: wrangler pages deploy _mirror_build --project-name=colosseum --branch=production
  The mirror generator has this hardcoded (Session 42 fix).
SESSION: 42.
```

---

## LM-123: Bluesky Leg 1 must be opt-in only
```
DECISION (Session 42): Bluesky official policy states bots that
  interact with other users MUST be opt-in. "If your bot interacts
  with other users, please only interact (like, repost, reply, etc.)
  if the user has tagged the bot account."
PROTECTS: Bot account from being banned for spam.
BITES YOU WHEN: You enable LEG1_BLUESKY_ENABLED=true and the bot
  starts replying to strangers' posts. Bluesky flags this as spam.
  Account gets restricted or banned.
SYMPTOM: Account restricted. Posts invisible to others.
FIX: Keep LEG1_BLUESKY_ENABLED=false unless the bot only replies
  to posts that mention @wolfe8105.bsky.social. Leg 2 (posting to
  own account) is safe. Leg 3 (posting auto-debates) is safe.
  Only Leg 1 (replying to others) is risky on Bluesky.
SESSION: 42.
```
*Add entries below as new mines are discovered.*
*Format: copy the template from the top of this file. Include SESSION: tag.*
*File lives in repo root alongside the testaments.*

---

## LM-144: GitHub push from VPS requires Personal Access Token — PAT expires/disappears
```
LESSON (Session 52): VPS has no SSH key configured for GitHub.
  Every git push requires entering username + PAT. GitHub does not
  show PATs again after creation — you must copy it immediately.
  If you lose it, you must generate a new one.
BITES YOU WHEN: You need to push from VPS and can't find the token.
  The push hangs waiting for credentials. No error, just a prompt.
SYMPTOM: git push asks for Username + Password. Password = PAT, not GitHub password.
FIX (immediate): Generate new PAT at github.com/settings/tokens/new
  → Note: VPS → Check repo scope → Generate → COPY IMMEDIATELY.
FIX (permanent): Set up SSH key on VPS (one-time, never needs token again):
  ssh-keygen -t ed25519 -C "wolfe8105@gmail.com" -f ~/.ssh/id_ed25519 -N ""
  cat ~/.ssh/id_ed25519.pub → paste at github.com/settings/ssh/new
  git remote set-url origin git@github.com:wolfe8105/colosseum.git
RULE: Store the PAT in a password manager immediately after generating.
  Or set up SSH keys and never deal with PATs again.
SESSION: 52.
```

---

# SECTION 15: LEGAL COMPLIANCE

---

## LM-100: AI-generated content MUST be labeled
```
DECISION (Session 36): All AI auto-debates, AI sparring sessions, and any
  AI-generated content must carry a visible "AI-Generated" badge.
PROTECTS: Legal compliance with emerging state AI disclosure laws (CA, NY,
  and others). Also prevents defamation liability — if an AI debate makes
  claims about a real person, the label helps establish it's entertainment,
  not editorial commentary.
BITES YOU WHEN: You add a new AI-generated feature and forget the badge.
  Or you remove the badge thinking "users know it's AI."
  States are actively passing laws requiring AI content disclosure.
  Multiple states now require labeling, more are coming in 2026-2027.
SYMPTOM: Regulatory risk. Also: users may believe AI debates reflect
  platform editorial positions.
FIX: Every page/component that renders AI-generated content must include
  the AI badge from colosseum-legal-snippets.html. Badge CSS + HTML in
  that file. Check: colosseum-auto-debate.html (always), arena AI sparring
  (always), debate-landing (conditional on debate type).
SESSION: 36.
```

---

## LM-101: Privacy policy must match actual data practices exactly
```
DECISION (Session 36): Privacy policy says what we do. FTC enforces truth.
PROTECTS: Legal compliance. FTC Section 5 prohibits deceptive practices.
  The #1 way platforms get fined is saying one thing in the privacy policy
  and doing something different with data.
BITES YOU WHEN: You add a new data collection mechanism (analytics, tracking,
  third-party SDK, ad network) without updating the privacy policy.
  Or when the B2B data play launches and the privacy policy doesn't cover
  the sharing of aggregated analytics with commercial partners.
SYMPTOM: FTC enforcement action. State AG investigation. Civil penalties.
FIX: Privacy policy (colosseum-privacy.html) must be updated EVERY TIME
  data practices change. Current policy covers aggregated/de-identified
  sharing (Section 5). If you ever share identifiable data, the policy
  must be updated FIRST, before the sharing begins.
  Rule: update privacy policy BEFORE changing data practices, never after.
SESSION: 36.
```

---

## LM-102: Data broker registration triggers when B2B sales start
```
DECISION (Session 36): Currently NOT a data broker. Becomes one when
  selling/licensing data to third parties who have no direct relationship
  with our users. Four states have registration laws: CA ($6,000/yr),
  TX ($300/yr), VT ($100/yr), OR (varies). Total ~$7,600/yr.
PROTECTS: Legal compliance. Fines for non-registration can exceed
  $100K/year cumulative across all four states.
BITES YOU WHEN: You close a B2B data deal and start delivering data
  without first registering as a data broker in applicable states.
  Definition is broad: "sells personal information of consumers with
  whom the business does not have a direct relationship."
SYMPTOM: Enforcement action. Fines accrue per day of non-registration.
FIX: BEFORE first B2B data delivery:
  1. Legal review of whether aggregated/de-identified data triggers definition
  2. If yes: register in CA, TX, VT, OR before delivery
  3. Budget $7,600/yr for registration fees
  4. Privacy policy already covers aggregated sharing (Section 5) —
     verify it still matches actual practice
NOTE: If data is truly aggregated and de-identified with no way to
  re-identify individuals, it may NOT trigger data broker definitions.
  But definitions are broad and evolving. Get legal review before first sale.
SESSION: 36. See WAR-CHEST.md for B2B strategy.
```

---

## LM-103: COPPA — do not knowingly collect under-13 data
```
DECISION (Session 36): Platform is not directed at children. Age gate in
  Plinko blocks under-13 signups. Users 13-17 permitted.
PROTECTS: COPPA compliance. Fines are massive — TikTok paid $5.7M,
  YouTube paid $170M.
BITES YOU WHEN:
  - You remove or weaken the age gate in Plinko
  - You learn a user is under 13 and don't delete their data
  - You add features specifically attractive to young children
  - You collect data from under-13 users through ungated flows
    (auto-debate voting is ungated — don't collect PII from those voters)
SYMPTOM: FTC enforcement. Huge fines. Mandatory consent decrees.
FIX: Age gate stays in Plinko. If you discover an under-13 user,
  delete their account and data immediately. Never market to children.
  Ungated auto-debate voting (LM-006) is fine because no PII is collected
  from anonymous voters — keep it that way.
  Updated COPPA rule (April 2025) expands definitions of personal
  information to include biometric data. Don't add face/voice ID features
  without COPPA review.
SESSION: 36.
```

---

## LM-104: Section 230 does NOT protect AI auto-debates
```
DECISION (Session 36): Section 230 protects platforms from liability for
  user-generated content. AI auto-debates are PLATFORM-GENERATED content.
  You wrote the code, you chose the topics, you scored them deliberately
  lopsided. This is your speech, not user speech.
PROTECTS: N/A — this is a vulnerability, not a protection.
BITES YOU WHEN: An AI auto-debate says something defamatory about a
  real person, company, or product. Or an AI debate takes a position
  that causes real-world harm. Or controversial AI scoring is interpreted
  as platform editorial endorsement.
SYMPTOM: Defamation lawsuit where you can't hide behind Section 230.
  Platform treated as the speaker/publisher of AI debate content.
FIX:
  1. AI badge on every auto-debate (LM-100) — establishes entertainment context
  2. Terms of Service Section 5 disclaims AI content as automated, not
     editorial (already in place)
  3. Avoid using real people's names in AI debate topics where possible
  4. AI debate scoring disclaimer: "for entertainment purposes"
  5. If an AI debate generates problematic content about a real person,
     take it down immediately — you don't have 230 protection, so
     leaving it up increases liability
SESSION: 36.
```

---

## LM-105: DMCA agent must be registered — $6, renew every 3 years
```
DECISION (Session 36): Register a DMCA designated agent with the
  Copyright Office to qualify for DMCA safe harbor protection.
PROTECTS: Without a registered agent, you lose DMCA safe harbor.
  Any copyright holder can sue you directly for user-posted content
  that infringes their copyright. With the agent registered, you get
  the notice-and-takedown process that limits your liability.
BITES YOU WHEN: You never register, or you let the registration lapse
  (it expires every 3 years). A user posts copyrighted content, the
  copyright holder sues you, and you can't claim safe harbor.
SYMPTOM: Copyright infringement lawsuit with no safe harbor defense.
FIX: Register at copyright.gov/dmca-directory. $6. Takes 5 minutes.
  Requires: legal name, mailing address, email (dmca@thecolosseum.app).
  Set a calendar reminder to renew every 3 years.
  Also: publish the DMCA agent contact info on colosseum-terms.html
  (already done in Session 36 Terms of Service rebuild).
SESSION: 36.
```

---

## LM-097: Free platform pivot — Plinko Gate must drop payment step
```
DECISION (Session 35): Consumer subs and token packs shelved at launch.
  Free platform model. Revenue is B2B data + ads.
PROTECTS: Funnel conversion. Every paywall kills a data point worth thousands.
BITES YOU WHEN: Someone re-adds a payment step to Plinko Gate, re-enables
  token gates on features, or adds subscription checks to UI flows.
SYMPTOM: User drop-off at signup. Data volume tanks. B2B value collapses.
FIX: Plinko Gate is OAuth → Age → Username → Done. No payment step.
  Token/sub code stays in codebase but is FLIPPED OFF. Feature flags control this.
  If re-enabling consumer payments in the future, treat it as a new decision
  requiring NT amendment.
SESSION: 35. See WAR-CHEST.md Section 1.
```

---

## LM-098: Stealth B2B — never expose data operation publicly
```
DECISION (Session 35): B2B intelligence operation has no public presence.
  Consumer app is loud. Data business is invisible.
PROTECTS: Data integrity. If users know they're being mined for intelligence,
  behavior changes. Arguments become performative. Data gets contaminated.
  Same reason Nielsen households weren't supposed to know.
BITES YOU WHEN: Someone adds "powered by data analytics" or any B2B reference
  to the consumer app, mirror pages, bot army posts, or any public-facing asset.
  Also bites if B2B client list leaks.
SYMPTOM: Users start performing instead of arguing naturally. Data quality drops.
  Potential PR backlash if framed as "debate app secretly sells your arguments."
FIX: Zero B2B references in consumer-facing anything. B2B docs (WAR-CHEST.md)
  live in private repo or are excluded from public GitHub. NDA all B2B clients.
  Privacy policy must cover data usage transparently but without naming buyers.
SESSION: 35. See WAR-CHEST.md Section 7.
```

---

## LM-099: Pre-selling data futures — delivery obligation is real
```
DECISION (Session 35): Option to pre-sell data access for upfront capital
  before volume exists. 90-day delivery window.
PROTECTS: Bootstrap funding without investors.
BITES YOU WHEN: You take money, promise 90-day delivery, and can't generate
  enough debate volume on the buyer's topics. One failed delivery = burned
  in that entire industry. Word travels in political/legal/finance circles.
SYMPTOM: Buyer demands refund. Reputation destroyed in buyer's network.
  Future sales in that category become impossible.
FIX: First presale goes to a SAFE buyer — think tank or market research firm
  on broad topics (politics, social issues) where organic volume is near-certain.
  Never promise hyper-specific niche topics (e.g. "Roundup litigation sentiment")
  until platform has proven volume on that category. Start conservative.
  Have legal review any pre-sale agreement before signing.
SESSION: 35. See WAR-CHEST.md Section 8.
```

---

## LM-085: guard_profile_columns now protects moderator stats
```
DECISION (Session 33): guard_profile_columns() updated to also protect mod_rating,
  mod_debates_total, mod_rulings_total, mod_approval_pct.
PROTECTS: Prevents client-side manipulation of moderator reputation.
BITES YOU WHEN: You try to UPDATE mod stats from client JS or SQL Editor.
  Same silent revert as LM-001.
SYMPTOM: "Success" but mod stats unchanged.
FIX: Same disable-trigger pattern as LM-001. Or use SECURITY DEFINER functions
  (score_moderator, rule_on_reference) which run as service_role.
SESSION: 33.
```

---

## LM-086: submit_reference() escalating token cost
```
DECISION (Session 33): References cost free/5/15/35/50 per round per debater.
  Max 5 per round. Cost is per-user, per-round.
PROTECTS: Spam defense. Bots can't flood references without burning tokens.
BITES YOU WHEN: You change the cost curve and forget the function has it
  hardcoded in a CASE statement (not a config table).
SYMPTOM: Wrong token deductions, user complaints.
FIX: Costs live in submit_reference() function body, lines with CASE v_count.
  To change pricing, CREATE OR REPLACE the function with new values.
SESSION: 33.
```

---

## LM-087: Auto-allow on 60s timeout — debate can't hang
```
DECISION (Session 33): If a human moderator doesn't rule on a reference within
  60 seconds, auto_allow_expired_references() marks it allowed and unpauses.
PROTECTS: Debate flow. A missing/AFK moderator can't block a live debate.
BITES YOU WHEN: Nothing calls auto_allow_expired_references(). The function
  exists but needs a trigger — either client-side timer calling an Edge Function,
  or pg_cron running every 30s.
SYMPTOM: Debate stays paused forever, both debaters stuck.
FIX: Wire a cron or client timer to call auto_allow_expired_references().
  Client-side: setTimeout 60s after submit_reference returns, call Edge Function.
  Server-side: pg_cron every 30s (SELECT auto_allow_expired_references()).
SESSION: 33.
```

---

## LM-088: event_log is append-only and service_role locked
```
DECISION (Session 33): event_log table has RLS policy restricting ALL operations
  to postgres/service_role. Client JS cannot read or write it.
PROTECTS: Analytics data integrity. Users can't see others' behavioral data.
  Users can't inject fake events.
BITES YOU WHEN: You try to call log_event() from client-side .rpc().
  RLS blocks the INSERT even though log_event() is SECURITY DEFINER.
  Wait — SECURITY DEFINER runs as the function owner (postgres), so it
  should bypass RLS. But if you try to SELECT from event_log via client, empty.
SYMPTOM: log_event() works (SECURITY DEFINER). Direct SELECT returns empty.
FIX: All reads on event_log go through aggregation views or dashboard queries
  run as service_role. Never expose event_log to client.
SESSION: 33.
```

---

## LM-089: log_event() swallows errors — analytics never breaks the app
```
DECISION (Session 33): log_event() has EXCEPTION WHEN OTHERS handler that
  converts errors to RAISE WARNING. It never throws.
PROTECTS: App functionality. If analytics breaks, debates still work.
BITES YOU WHEN: You're debugging why events aren't logging. No error thrown.
  Check Supabase logs for WARNING messages.
SYMPTOM: event_log has gaps, no errors in app, warnings in Supabase logs.
FIX: Check Supabase Dashboard → Logs → Postgres for "log_event failed" warnings.
SESSION: 33.
```

---

## LM-091: Mirror generator queries must match live schema
```
LESSON (Session 33): Generator requested a `verdict` column on auto_debates
  that doesn't exist. Live column is `judge_reasoning`. Generator was built
  against assumed schema, not verified schema.
RULE: Before writing any query against Supabase, verify columns exist:
  SELECT * FROM table LIMIT 1; and check Object.keys(rows[0]).
  Never assume column names from documentation — query the live database.
SESSION: 33. See also LM-079 (GitHub repo is not source of truth for schema).
```

---

## LM-092: Supabase legacy vs new API keys — bot army needs JWT format
```
DECISION (Session 34): Supabase introduced new key formats (sb_secret_*, sb_publishable_*).
  Bot army's supabase-client.js and mirror generator use @supabase/supabase-js which
  expects the legacy JWT format (starts with eyJ...).
PROTECTS: N/A — this is a compatibility issue.
BITES YOU WHEN: You copy the new-format secret key into bot army .env.
  Supabase client silently fails or returns auth errors.
SYMPTOM: Bot connects but all requests fail. "Invalid API key" or "JWT expired" errors.
FIX: Go to Supabase → Settings → API → click "Legacy anon, service_role API Keys" tab.
  Copy the service_role key from THAT tab (starts with eyJ...).
  The new sb_secret_* keys are NOT compatible with the JS client library.
SESSION: 34.
```

---

## LM-093: Reddit API requires manual approval (late 2024 change)
```
DECISION (Session 34): Reddit removed self-service API app creation.
  New accounts must submit a request form explaining purpose and volume.
PROTECTS: Reddit spam prevention.
BITES YOU WHEN: You go to reddit.com/prefs/apps, fill the form, hit create,
  and nothing happens. The CAPTCHA resets. No error message.
SYMPTOM: App creation form silently fails. Page reloads with empty form.
FIX: Click "register to use the API" link on the prefs/apps page.
  Fill out the request form (role: developer, describe the bot, list subreddits).
  Wait for approval (days). THEN create the app on prefs/apps.
SESSION: 34. Account: u/Master-Echo-2366, approval pending.
```

---

## LM-094: VPS SSH sessions disconnect — always re-SSH
```
LESSON (Session 34): PowerShell SSH sessions to VPS silently disconnect
  when you switch windows or after inactivity. You'll think you're on the VPS
  but you're back in local PowerShell.
SYMPTOM: Commands fail with PowerShell errors (e.g. "The token '&&' is not valid").
  Or you see PS C:\Users\... prompt instead of root@ubuntu...
FIX: If you see PS C:\..., you're local. Run: ssh root@161.35.137.21
  Then cd /opt/colosseum/bot-army/colosseum-bot-army to get back to bot files.
SESSION: 34.
```

---

## LM-095: auto_allow_expired_references() — return type change needs DROP first
```
LESSON (Session 34): Live Supabase had a different return type for
  auto_allow_expired_references() than what was in the repo SQL.
  CREATE OR REPLACE cannot change return types — PostgreSQL throws
  "cannot change return type of existing function".
FIX: Run DROP FUNCTION auto_allow_expired_references() first,
  then CREATE OR REPLACE. This applies to ANY function where the
  return type changed between versions.
SESSION: 34.
```

---

## LM-096: PM2 ecosystem.config.js — bot army process management
```
DECISION (Session 34): Bot army runs via PM2 on VPS.
  pm2 start ecosystem.config.js → pm2 startup → pm2 save.
PROTECTS: Auto-restart on crash. Log rotation. Survives VPS reboot.
BITES YOU WHEN: You edit .env and forget to restart.
  PM2 caches the process — env changes don't take effect until restart.
SYMPTOM: You updated Reddit credentials in .env but bot still says PENDING.
FIX: After any .env change: pm2 restart all
  Check status: pm2 status
  Check logs: pm2 logs
  If PM2 startup wasn't saved: pm2 startup && pm2 save
SESSION: 34. VPS IP: 161.35.137.21.
```

---

## LM-110: ai-moderator Edge Function defaults to ALLOW on any error
```
DECISION (Session 39): If Groq API fails, times out, or returns
  unparseable output, ai-moderator returns ruling: "allowed".
PROTECTS: Debate flow. LM-087 pattern — debate can never hang.
BITES YOU WHEN: Groq has an outage. ALL evidence auto-passes.
  Spam/trolling evidence slips through during downtime.
SYMPTOM: System messages show "AI Moderator: Evidence AUTO-ALLOWED
  (moderator unavailable)" — all references pass without evaluation.
FIX: Acceptable trade-off. Debate flowing > perfect moderation.
  If Groq outages become frequent, add a circuit breaker that
  switches to human-only moderation after N consecutive failures.
SESSION: 39.
```

---

## LM-112: ruleOnReference() — ruledByType must be 'ai' for AI mod rulings
```
DECISION (Session 39): rule_on_reference() SQL has a 4th param
  p_ruled_by_type ('human'|'ai'|'auto'). When type = 'human',
  it checks auth.uid() matches debates.moderator_id. When 'ai'
  or 'auto', it bypasses the moderator ID check.
PROTECTS: AI moderator can rule without being a real user.
BITES YOU WHEN: You call ruleOnReference() from JS without passing
  'ai' as the 4th param. The SQL defaults to 'human' and throws
  "Not the assigned moderator" because there's no human moderator_id.
SYMPTOM: AI mod ruling fails silently. Evidence stays pending forever.
  60s auto-allow eventually fires but user sees no AI ruling message.
FIX: Always pass the correct ruledByType:
  ColosseumAuth.ruleOnReference(refId, ruling, reason, 'ai')
  The arena.js requestAIModRuling() function does this correctly.
SESSION: 39.
```

---

# SECTION 16: OWASP AUDIT + DEPLOYMENT (Session 40-41)

---

## LM-113: SRI hashes break when supabase-js updates
```
DECISION (Session 40): All 6 HTML pages have SRI SHA-384 hashes on the
  supabase-js CDN import, pinned to @2.98.0.
PROTECTS: CDN compromise can't inject malicious JS — browser rejects
  if hash doesn't match.
BITES YOU WHEN: You upgrade supabase-js to a new version. The hash no
  longer matches. Browser refuses to load the script. App is completely
  broken on all 6 pages simultaneously.
SYMPTOM: Blank page. Console: "Failed to find a valid digest in the
  'integrity' attribute for resource..."
FIX: When upgrading supabase-js:
  1. Update the @version in all 6 script tags
  2. Regenerate hash: shasum -b -a 384 supabase-js-file | awk '{print $1}' | xxd -r -p | base64
  3. Update integrity="sha384-..." on all 6 pages
  4. Test before pushing to main (LM-033 — Vercel auto-deploys)
  Files: index.html, colosseum-login.html, colosseum-plinko.html,
  colosseum-profile-depth.html, colosseum-settings.html, colosseum-auto-debate.html
SESSION: 40.
```

---

## LM-114: RAISE LOG format for security events
```
DECISION (Session 40): Security events logged via RAISE LOG with format:
  SECURITY|event_type|user_id|function_name|details
PROTECTS: Security audit trail. Survives transaction rollback (unlike INSERT).
BITES YOU WHEN: You search event_log for security events — they're not there.
  RAISE LOG goes to Postgres server logs, NOT to event_log table.
  Also: guard_profile_update() INSERTs to security_events table (different path).
SYMPTOM: Can't find security events in event_log. They're in Supabase Log Explorer.
FIX: Query security events in two places:
  1. Supabase Dashboard → Logs → Postgres: filter for "SECURITY|"
  2. security_events table (for privilege escalation attempts from guard trigger)
  3. Three monitoring views: security_dashboard, security_alerts, security_hourly
  Logs auto-delete per Supabase retention policy (check your plan).
SESSION: 40.
```

---

## LM-117: Stripe Edge Functions — old import pattern
```
DECISION (Session 40): Stripe Edge Function templates in
  colosseum-stripe-functions.js used deno.land/std and esm.sh imports.
  Not yet rewritten with Deno.serve + npm: pattern.
BITES YOU WHEN: You redeploy Stripe functions from the template file.
  The deno.land imports are a supply chain risk (A08).
SYMPTOM: Working but vulnerable to deno.land CDN compromise.
FIX: Rewrite with npm:stripe@14 and npm:@supabase/supabase-js@2.
  Use Deno.serve() instead of serve().
STATUS: FIXED Session 48. colosseum-stripe-functions.js fully rewritten.
SESSION: 40 (discovered), 48 (fixed).
```

---

# SECTION 17 (continued): SESSION 43 FIXES

---

## LM-124: Groq model decommission hits BOTH bot config AND Edge Functions
```
LESSON (Session 43): When Groq kills a model (llama-3.1-70b-versatile
  decommissioned), it affects two separate systems:
  1. Bot army config on VPS (bot-config.js)
  2. Edge Functions on Supabase (ai-sparring + ai-moderator)
  Session 42 fixed bot-config but missed Edge Functions. Session 43
  caught and fixed both.
BITES YOU WHEN: You update the model in one place but forget the other.
  Bot army works fine but AI sparring and AI moderation return 400 errors.
SYMPTOM: Groq API returns 400 "model not found" from Edge Functions.
  Bot army works because it reads from bot-config.js (already updated).
FIX: When changing Groq models, update ALL THREE locations:
  1. /opt/colosseum/bot-config.js (or wherever bot army reads model)
  2. /opt/colosseum/supabase/functions/ai-sparring/index.ts
  3. /opt/colosseum/supabase/functions/ai-moderator/index.ts
  Then redeploy Edge Functions:
  supabase functions deploy ai-sparring --project-ref faomczmipsccwbhpivmp
  supabase functions deploy ai-moderator --project-ref faomczmipsccwbhpivmp
SESSION: 43.
```

---

# SECTION 18: RANKED/CASUAL + BROWSER HISTORY (Session 44)

---

## LM-126: join_debate_queue() signature changed — now takes p_ranked
```
DECISION (Session 44): join_debate_queue() now accepts 4th param
  p_ranked (boolean, default false). Old 3-param version was DROPped.
PROTECTS: Ranked matches ranked, casual matches casual. Ranked has
  tighter Elo range (300 vs 400).
BITES YOU WHEN: Old client JS calls join_debate_queue without p_ranked.
  Default is false (casual), so it won't break — just won't get ranked.
  But if someone re-applies an old SQL migration that recreates the
  3-param version, it will conflict with the 4-param version.
SYMPTOM: "function is not unique" error on RPC call.
FIX: DROP FUNCTION join_debate_queue(text, text, text) before
  creating the new 4-param version. The Session 44 migration does this.
SESSION: 44.
```

---

## LM-127: update_arena_debate() now moves Elo for ranked debates
```
DECISION (Session 44): update_arena_debate() applies Elo + stats
  when p_status = 'complete' AND ranked = true. Uses calculate_elo()
  from Ring 3. Updates profiles directly (SECURITY DEFINER bypasses
  guard trigger).
PROTECTS: Ranked debates have real stakes. Casual debates don't touch Elo.
BITES YOU WHEN: You call update_arena_debate with status='complete'
  on a ranked debate with a bad winner value. Elo moves permanently.
  No undo mechanism.
SYMPTOM: Player Elo changes unexpectedly.
FIX: Winner must be 'a', 'b', or 'draw'. Validate before calling.
  If bad Elo move happens, must manually UPDATE profiles with
  disable-trigger pattern (LM-001).
SESSION: 44.
```

---

## LM-128: Ranked requires 25% profile completion
```
DECISION (Session 44): check_ranked_eligible() RPC returns
  eligible: false if profile_depth_pct < 25.
PROTECTS: Ranked quality. Forces profile completion for matchmaking.
BITES YOU WHEN: You change the threshold without updating both
  the SQL function AND the JS confirm message text.
SYMPTOM: SQL says 25%, JS message says different number.
FIX: Threshold lives in check_ranked_eligible() function body.
  JS confirm dialog references it in colosseum-arena.js showRankedPicker().
SESSION: 44.
```

---

## LM-129: Browser history in SPA — push on overlay open, history.back() on close
```
DECISION (Session 44): Overlays (ranked picker, mode select) push
  a history entry on open. Close functions call history.back() with
  _skipNextPop flag to prevent the async popstate from closing the
  next overlay. Real screen changes (queue, room, postDebate) also
  push state. Lobby uses replaceState (not push).
PROTECTS: Back button works like a real app — closes overlays,
  returns to previous screen.
BITES YOU WHEN: You add a new overlay and forget to (1) pushState
  on open, (2) history.back() + _skipNextPop on close-by-user.
  Phantom entries stack up and back button exits the app.
ALSO BITES: If you call closeOverlay() from popstate handler —
  don't call history.back() in that path (popstate already consumed
  the entry). Only call history.back() when user closes by tapping.
SYMPTOM: Back button exits app instead of closing overlay.
  Or: back button does nothing (double-consumed entries).
FIX: Pattern is: push on open, back() on user-close, skip flag
  prevents chain reaction. Search "SPA pushState modal overlay
  back button" for the canonical pattern.
SESSION: 44.
```

---

# SECTION 19: SECURITY AUDIT FINDINGS (Session 45)

---

## LM-134: Bot army uses exact-interval cron — detectable bot signal
```
DECISION (built Session 34): PM2 cron intervals are fixed. Bots post
  at exactly :00 every N minutes. No jitter. No human-like delays.
PROTECTS: Nothing — this is a detection risk.
BITES YOU WHEN: Platform behavioral analysis flags exact-interval
  activity. Single datacenter IP (DigitalOcean NYC3) is a known
  signal. Account gets shadow-banned or suspended.
SYMPTOM: Bot posts stop appearing in feeds. No error. Silent ban.
  DRY_RUN=false but zero engagement.
FIX: Add ±5-10 min jitter to all cron intervals.
  Add setTimeout(random 2-8s) between actions within a run.
  Implement account warmup: read/upvote only for 7 days before
  dropping links. Consider residential proxy if IP flagged.
RISK: MEDIUM. Will eventually fire if bot volume increases.
  Not urgent before go-live. Urgent if accounts get banned.
SESSION: 45 (discovered in security audit).
```

---

## LM-136: Ubuntu 24 uses ssh.service not sshd.service
```
DECISION: Standard SSH hardening docs say `systemctl restart sshd`.
BITES YOU WHEN: Running `systemctl restart sshd` on Ubuntu 24.04
  returns "Unit sshd.service not found." The sed edit to sshd_config
  succeeds silently but SSH daemon never reloads the new config.
SYMPTOM: PasswordAuthentication no is in the file but password auth
  still works because the old config is still loaded in memory.
FIX: Use `systemctl restart ssh` (no d) on Ubuntu 24.
STATUS: Caught and fixed Session 46. PasswordAuthentication no confirmed.
SESSION: 46.
```

---

## LM-138: bash heredoc — quote the delimiter to prevent special char expansion
```
LESSON (Session 46): Every attempt to patch bot-engine.js via `node -e "..."` failed
  because bash expanded $, !, and backticks inside the inline script string.
  Three attempts wasted before finding the fix.
BITES YOU WHEN: Writing any multi-line Node.js script inline in bash.
  node -e "..." with backticks, $variables, or ! will silently mangle the script.
  Results in partial replacements, syntax errors, or wrong output with no clear error.
SYMPTOM: str.replace() only catches one occurrence. Script exits with syntax error
  at an unexpected line. Output looks truncated.
FIX: Write the script to a temp file first using a QUOTED heredoc delimiter:
  cat << 'PATCHEOF' > /tmp/patch.js
  ... script content with backticks, $, ! all safe ...
  PATCHEOF
  node /tmp/patch.js
  Single quotes around the delimiter ('PATCHEOF') disables ALL bash expansion
  inside the heredoc block. Unquoted (PATCHEOF) still expands.
RULE: Any multi-line Node.js script on VPS → cat << 'EOF' to file → node file.
  Never node -e "..." for anything beyond trivial one-liners.
SESSION: 46.
```

---

## LM-139: RLS policies without TO role clause evaluate for ALL roles
```
DECISION (built Sessions 14-17): RLS policies created without a TO clause
  default to {public} — Postgres evaluates them for every role including anon,
  service_role, and postgres. Wastes cycles on requests that will always return
  empty (e.g. anon hitting an auth.uid() = user_id policy).
BITES YOU WHEN: Tables grow. High-traffic tables (hot_takes, debate_queue,
  notifications) with {public} policies do unnecessary work per anon request.
SYMPTOM: Supabase Performance Advisor flags "RLS policy not scoped to role."
  Slow queries on authenticated-only tables under load.
FIX: Add TO authenticated to all policies that reference auth.uid().
  Add TO anon, authenticated to public SELECT policies.
  Session 47 migration (colosseum-session-b-rls.sql) fixed all original policies.
  3 older {public} policies remain: hot_takes delete, rivals select,
  async_debates insert/update. Fix when convenient.
STATUS: Mostly fixed Session 47. 3 residual low-priority entries remain.
SESSION: 47.
```

---

## LM-140: Direct supabase.rpc() calls have no 401 recovery
```
DECISION (Sessions 17+): All RPC calls use supabase.rpc() directly.
  No retry logic if the JWT expires mid-session.
BITES YOU WHEN: User has an active session but their JWT expires (1 hour default).
  Next RPC call returns 401/PGRST301. Without recovery, the call silently fails
  and the user sees a broken UI with no explanation.
SYMPTOM: Buttons stop working. Data stops loading. No error shown to user.
  Console shows 401 or "JWT expired."
FIX: Use ColosseumAuth.safeRpc('fn_name', { args }) instead of supabase.rpc().
  On 401: refreshes session once, retries. On refresh failure: signs user out
  cleanly so they land on login page.
  Added to colosseum-auth.js Session 47. Not yet backfilled into all modules —
  modules still use supabase.rpc() directly. Migrate high-traffic modules
  (arena, home, async) when touching those files.
SESSION: 47.
```

---

## LM-141: RLS policy on group_members self-references group_members
```
DECISION (Session 49): First draft of group_members RLS used EXISTS (SELECT 1 FROM
  group_members WHERE group_id = group_id AND user_id = auth.uid()).
  This queries group_members FROM WITHIN a policy ON group_members.
BITES YOU WHEN: Postgres evaluates the policy for every row by running the subquery,
  which itself hits the same policy, causing recursion or catastrophic slowness.
  Supabase's own RLS performance docs flag this as a known killer pattern.
SYMPTOM: Roster queries time out or return empty. Performance Advisor flags it.
  May not error — just silently slow or empty.
FIX: Never query a table from within its own RLS policy.
  For membership checks, use one of two patterns:
  (1) Simple: user_id = (SELECT auth.uid()) — lets each user see only their own row.
  (2) Roster access: route through a SECURITY DEFINER function that bypasses RLS.
  In colosseum-groups, get_group_members() is SECURITY DEFINER — use that for rosters.
  Direct SELECT on group_members only returns the calling user's own row.
RULE: Any time you write EXISTS (SELECT 1 FROM X) inside a policy ON X — stop.
  That is a self-reference. Redesign immediately.
SESSION: 49 (caught via research before shipping).
```

---

## LM-142: returnTo parameter is an open redirect vector
```
DECISION (Session 50): Added ?returnTo= parameter to colosseum-plinko.html
  and colosseum-login.html so users return where they came from after auth.
BITES YOU WHEN: Attacker crafts a link like
  colosseum-plinko.html?returnTo=//evil.com or
  colosseum-plinko.html?returnTo=javascript:alert(1).
  Protocol-relative URLs (//evil.com) bypass a naive "no ://" check.
  javascript: and data: URIs bypass a "starts with /" check if you don't
  also block "//".
SYMPTOM: User signs up, clicks "Enter", gets redirected to attacker's site.
  Phishing attack using your legitimate domain as the launchpad.
FIX: getReturnTo() validates: dest.startsWith('/') && !dest.startsWith('//').
  Only bare relative paths pass. Everything else falls back to 'index.html'.
  The generating side (requireAuth modal) uses window.location.pathname which
  is always a same-origin relative path — safe by construction.
RULE: Any returnTo / redirect / next parameter is an open redirect risk.
  OWASP says: allowlist approach, or strict relative-path-only with // blocked.
  Never use decodeURIComponent on redirect targets before validation.
SESSION: 50 (caught by research gate — first draft was vulnerable).
```

---

## LM-143: Bluesky poster imported but postHotTake never called in pipeline
```
DECISION (Session 42): leg2-bluesky-poster.js built and imported into bot-engine.js.
  bot-engine.js was patched to add the require() and formatFlags() lines.
  But the actual postHotTake() call was never added to the Leg 2 pipeline loop.
  Only leg2TwitterPoster.postHotTake() was called.
BITES YOU WHEN: Bluesky is enabled (LEG2_BLUESKY_ENABLED=true), DRY_RUN=false,
  debates are being created — but nothing ever posts to Bluesky.
  No error. No log line. Just silence.
SYMPTOM: pm2 logs show [LEG2][DEBATE] ✅ Debate created but zero [LEG2][BLUESKY] lines.
  wolfe8105.bsky.social shows 0 posts.
FIX: In the Leg 2 pipeline loop in bot-engine.js, after the Twitter block, add:
  if (config.flags.leg2Bluesky) {
    await leg2BlueskyPoster.postHotTake(debate);
  }
  Applied Session 51 via sed -i on VPS.
  Same pattern needed for Leg 3 postAutoDebate() — not yet applied.
RULE: When wiring a new poster module, grep bot-engine.js for EVERY pipeline loop
  and confirm the call appears in ALL of them, not just the require() at the top.
SESSION: 51.
```

---

## LM-143 UPDATE: False-positive patch guard for Leg 3 Bluesky
```
DECISION (Session 54): patch script for Leg 3 postAutoDebate() used two grep guards:
  1. grep for 'leg3BlueskyPost' — existed on line 91 (flags display block)
  2. grep for 'postAutoDebate' — existed on line 300 (Reddit function name)
  Script concluded "already patched" and skipped. Both strings existed independently.
  Neither was the actual pipeline call. The actual call was never inserted.
BITES YOU WHEN: Using string-presence guards to detect whether a patch was applied.
  A string can exist for a completely unrelated reason (display text, variable name,
  comment, Reddit function with a matching substring).
SYMPTOM: Script says "already patched", pm2 logs show no [LEG3][BLUESKY] output.
FIX: Grep for the ACTUAL pipeline call signature, not just any matching string.
  Target the specific block context, e.g.:
  grep -A2 'leg3TwitterPost' to confirm the Bluesky call follows it.
  Applied Session 54 via targeted block replacement.
RULE: Patch guards must grep for the exact insertion, not fragments of it.
  When in doubt, read the surrounding context (grep -B5 -A5) before concluding done.
SESSION: 54.
```

---

## LM-144: Vercel webhook silently misses GitHub web UI uploads
```
DECISION: Vercel is connected to GitHub repo for auto-deploy on push.
BITES YOU WHEN: Files uploaded via GitHub web UI drag-and-drop.
  The push event fires but Vercel's webhook sometimes silently ignores it.
  No error in Vercel. No failed deployment. Just no new deployment at all.
  Deployments list still shows previous deploy as Current.
SYMPTOM: GitHub shows new commit ("X minutes ago") but Vercel deployments
  list still shows oldest deploy as Current with "12h ago" timestamps.
  Vercel "Redeploy" on the current deployment will NOT help — it redeploys
  the old commit, not HEAD.
FIX: Make a trivial GitHub commit (edit any file, add a space, rename a file).
  This creates a clean push event that reliably triggers the Vercel webhook.
  New deployment appears within ~60 seconds.
RULE: After any GitHub web UI upload, verify Vercel shows a new deployment
  within 2 minutes. If not, make a dummy commit to re-trigger.
SESSION: 55.
```

---

## LM-145: `cp` aliased to `cp -i` silently fails to overwrite on VPS
```
DECISION (Session 57): Copied updated bot-config.js from /opt/colosseum/ to
  colosseum-bot-army/ using `cp source dest`. Grep confirmed file was empty
  afterward — copy silently failed or was intercepted.
BITES YOU WHEN: Ubuntu VPS has `alias cp='cp -i'` set for root. In interactive
  SSH sessions, the alias is active. `cp source dest` prompts for confirmation
  when dest exists, but if running in a context where the prompt isn't visible
  or answered, the copy silently does nothing.
SYMPTOM: `cp source dest` returns exit 0, but `grep pattern dest` returns empty.
  File appears unchanged. No error message.
FIX: Prefix with backslash to bypass alias: `\cp source dest`
  This forces the raw /bin/cp binary, no alias, no prompt, always overwrites.
  ALSO: After any file copy, immediately verify with grep or cat before
  assuming success. `\cp source dest && grep pattern dest` as a one-liner.
ALSO: After replacing a Node.js module file, do `pm2 delete` + `pm2 start`
  (not just `pm2 restart`) to fully clear the module cache. Node caches
  required modules in memory — restart alone may serve the old version.
RULE: Never use bare `cp` on VPS for overwrites. Always `\cp`. Always verify.
SESSION: 57.
```

---

## LM-146: PM2 ecosystem.config.js env block placed outside apps array
```
DECISION (Session 58): Added Lemmy env vars to ecosystem.config.js via nano.
  Vars were pasted outside the apps array, creating a second top-level env: block.
  PM2 read the inner (correct) env block and ignored the outer one.
BITES YOU WHEN: Editing ecosystem.config.js manually in nano and pasting at the
  wrong indentation level. The file has nested structure: module.exports > apps >
  app object > env. Easy to land outside the app object closing brace.
SYMPTOM: pm2 env 0 shows the vars correctly, but they don't behave as expected,
  OR the file has two env: blocks and the wrong one wins.
FIX: Always replace the entire ecosystem.config.js with a full cat > heredoc.
  Never edit it in nano. The complete correct file is the only safe approach.
RULE: ecosystem.config.js is a structured file. Always write it in full.
  Never partially edit it. Use cat > heredoc to replace the whole thing.
SESSION: 58.
```

---

## LM-147: Bot army env vars not persisted — no .env file on VPS — **WRONG**
```
DECISION (Session 58): INCORRECTLY stated that bot army has no .env file.
CORRECTION (Session 59): .env file EXISTS at
  /opt/colosseum/bot-army/colosseum-bot-army/.env
  It is the PRIMARY source of env vars. require('dotenv').config() in
  bot-config.js line 7 loads it BEFORE PM2 ecosystem vars take effect.
  Ecosystem.config.js env vars are SECONDARY — dotenv loads .env first.
BITES YOU WHEN: You set flags in ecosystem.config.js but not in .env.
  The .env value wins. Bot ignores your ecosystem change.
SYMPTOM: pm2 env 0 shows the var correctly, but the bot doesn't use it.
  Features line doesn't show the platform you enabled.
FIX: ALWAYS update .env for flag changes. Ecosystem.config.js is backup only.
  After any .env change: pm2 delete + pm2 start (not restart).
RULE: .env is source of truth for bot flags. Not ecosystem.config.js.
SESSION: 59.
```

---

## LM-150: debateLandingPath: null — every bot URL broken since go-live
```
DECISION (Session 52): Set debateLandingPath to null in bot-config.js to
  "prevent accidental use" of debate-landing.html.
BITES YOU WHEN: supabase-client.js line 92 builds URLs via:
  `${config.app.baseUrl}${config.app.debateLandingPath}?id=${takeId}`
  JavaScript: 'string' + null = 'stringnull'.
  Every Leg 2 hot take URL became https://colosseum-six.vercel.appnull?id=...
  Every link the bot posted to Bluesky, Discord, everywhere = dead link.
  This was live from Session 51 (DRY_RUN=false) through Session 59.
SYMPTOM: pm2 logs show "✅ Debate created: https://colosseum-six.vercel.appnull?id=..."
  No errors. No warnings. Links look almost right at a glance.
FIX: Set debateLandingPath to '/colosseum-debate-landing.html'.
  sed -i "s|debateLandingPath: null,|debateLandingPath: '/colosseum-debate-landing.html',|"
RULE: NEVER set a URL path segment to null in a config object.
  Use empty string '' if you want no path, or remove the property entirely.
  JavaScript string concatenation with null produces the literal word "null".
SESSION: 59. Fixed via sed -i on VPS.
```

---

## LM-151: .env vs ecosystem.config.js — dotenv wins the race
```
DECISION: bot-config.js line 7: require('dotenv').config()
  This runs at module load time, BEFORE any PM2 env injection is consumed.
  PM2 injects ecosystem env vars into process.env before boot, but
  dotenv's default behavior is to NOT overwrite existing vars.
  HOWEVER: .env file IS loaded, and for any var NOT already in process.env,
  dotenv fills it in. For vars that ARE in both places, the PM2 value
  (from ecosystem.config.js) technically wins since it's set first.
BITES YOU WHEN: You think only one of the two sources matters.
  The actual load order: PM2 sets env → dotenv loads .env (skips existing).
  If a flag is in .env as false and NOT in ecosystem.config.js, it stays false.
  If a flag is in ecosystem.config.js as true and NOT in .env, it stays true.
  If a flag is in BOTH, ecosystem.config.js wins (PM2 sets it first).
SYMPTOM: Confusing behavior where some flags work and others don't,
  depending on which source has the value.
FIX: Keep both sources in sync. Or better: put ALL flags in .env only
  and remove them from ecosystem.config.js to have one source of truth.
RULE: .env and ecosystem.config.js must agree. When in doubt, update .env.
SESSION: 59.
```

---

## LM-152: Windows browser caches downloaded files — scp uploads stale version
```
DECISION (Session 59): Downloaded bot-engine-v59.js from Claude.
  scp'd it to VPS. File arrived (100%, right size). But grep found
  zero matches for "Lemmy" — wrong file content.
ROOT CAUSE: Windows browser served a cached/stale download when the
  filename matched a previous download. The new file was likely saved as
  bot-engine (1).js or similar, and scp grabbed the old bot-engine.js.
FIX: Always output files with UNIQUE names (e.g. bot-engine-v59-fixed.js).
  After scp, ALWAYS verify content on VPS with grep before restarting.
RULE: Never trust that a downloaded file is the latest version.
  Use unique filenames. Verify after transfer. Delete old downloads first.
SESSION: 59.
```

---

## LM-153: Recreating VPS-only files — require paths must match actual directory structure
```
DECISION (Session 59): Recreated bot-engine.js from conversation context.
  Used require('./logger') instead of require('./lib/logger').
  Bot crash-looped 38 times before restore from backup.
ROOT CAUSE: bot-engine.js lives in colosseum-bot-army/ but logger.js lives
  in colosseum-bot-army/lib/. When recreating a file from memory or
  conversation context, require paths are easy to get wrong.
FIX: Before recreating any VPS-only file, run:
  grep "require(" /path/to/original.js.bak
  to capture exact require paths. Match them exactly in the new file.
RULE: When recreating VPS-only files, ALWAYS verify require paths against
  the backup or the running file. Never assume paths from memory.
SESSION: 59.
```

---

## LM-148: Lemmy poster files placed in wrong directory
```
DECISION (Session 58): leg2-lemmy-poster.js and leg3-lemmy-poster.js were
  created in /opt/colosseum/bot-army/ instead of
  /opt/colosseum/bot-army/colosseum-bot-army/ where bot-engine.js lives.
  Both files use require('./bot-config') which resolves relative to the file's
  own location — not the working directory.
BITES YOU WHEN: New bot army files are created or uploaded to the parent
  directory instead of the colosseum-bot-army/ subdirectory.
SYMPTOM: MODULE_NOT_FOUND error for ./bot-config in pm2 error log.
  Bot crashes on startup but PM2 auto-restarts so it keeps running without
  the new module.
FIX: mv /opt/colosseum/bot-army/leg2-lemmy-poster.js /opt/colosseum/bot-army/colosseum-bot-army/
     mv /opt/colosseum/bot-army/leg3-lemmy-poster.js /opt/colosseum/bot-army/colosseum-bot-army/
RULE: ALL bot army files belong in /opt/colosseum/bot-army/colosseum-bot-army/
  That is the working directory. Never drop files in the parent.
SESSION: 58.
```

---

## LM-149: leg2Bluesky flag missing from bot-config.js flags block
```
DECISION (Session 58): Bluesky disappeared from the Features: line after a
  restart. Root cause: leg2Bluesky and leg3BlueskyPost were never added to
  the flags block in bot-config.js. They existed in the Bluesky config object
  but not in config.flags, so formatFlags() in bot-engine.js never saw them.
BITES YOU WHEN: Adding a new platform poster. The config object and the flags
  block are separate — adding one does not add the other.
SYMPTOM: Features line omits the platform. Platform posts silently never happen.
FIX: In bot-config.js flags block, add:
  leg2Bluesky: process.env.LEG2_BLUESKY_ENABLED === 'true',
  leg3BlueskyPost: process.env.LEG3_BLUESKY_POST_ENABLED === 'true',
  Also add corresponding entries to formatFlags() in bot-engine.js.
RULE: When adding a new platform, update THREE places:
  1. Config object (credentials, limits)
  2. flags block in bot-config.js
  3. formatFlags() in bot-engine.js
SESSION: 58.
```
