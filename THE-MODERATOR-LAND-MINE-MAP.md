# THE MODERATOR — LAND MINE MAP
### The Anti-Friendly-Fire Document — Read Before Touching Anything
### Last Updated: Session 240 (April 6, 2026) — LM-013 updated (preferred_language added to update_profile allow-list). LM-200 added (stamp_debate_language trigger). LM-201 added (spectator entry wiring). 16 sections, 109 entries.

> **Purpose:** Every decision we've made has a consequence if you step on it wrong.
> This document maps cause → effect → what bites you → how to fix it.
> Read this before any SQL change, any schema migration, any auth touch, any deployment.
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

# SECTION 1: DATABASE TRIGGERS

---

## LM-001: guard_profile_columns trigger
```
DECISION: BEFORE UPDATE trigger on profiles table (colosseum-rls-hardened.sql)
PROTECTS: Prevents any authenticated client from directly modifying protected columns
PROTECTED COLUMNS (ACTUAL — verified Session 117): level, xp, streak_freezes, questions_answered
  These four columns are guarded. All other columns (elo_rating, wins, losses,
  token_balance, login_streak, subscription_tier, etc.) are NOT
  protected by this trigger. They are instead protected by RLS + SECURITY DEFINER RPCs.
PREVIOUS STATE: Sessions 16-71 documentation listed many more columns as protected.
  Session 72 verified only level + xp. Session 77 added streak_freezes.
  Session 117 added questions_answered.
ACTION: RAISE EXCEPTION when a non-service-role UPDATE touches these columns.
  SECURITY DEFINER RPCs bypass the trigger (they run as postgres).
BITES YOU WHEN: You assume token_balance or other columns are trigger-protected and
  skip proper RLS/RPC validation. They aren't — only the 4 columns above are guarded.
ALSO BITES YOU WHEN: You try to backfill questions_answered via a direct UPDATE
  from the Supabase dashboard — the trigger will block it. Disable the trigger
  first, update, re-enable.
BYPASS CONDITION: Only bypasses if current_setting('role') = 'postgres' OR 'service_role'.
FIX: Disable trigger → UPDATE → re-enable (all in one block):
  ALTER TABLE profiles DISABLE TRIGGER guard_profile_columns;
  UPDATE profiles SET level = 5 WHERE id = 'UUID';
  ALTER TABLE profiles ENABLE TRIGGER guard_profile_columns;
SESSIONS: Built Session 16/17, burned us Session 29, corrected Session 72,
  streak_freezes added Session 77, questions_answered added Session 117.
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

## LM-200: stamp_debate_language — BEFORE INSERT trigger on arena_debates
```
DECISION (Session 240): BEFORE INSERT trigger on arena_debates that auto-stamps
  the debate creator's profiles.preferred_language onto arena_debates.language.
  Covers all 10 INSERT sites (create_ai_debate, create_mod_debate ×3,
  create_private_lobby ×3, join_debate_queue ×3) without modifying any
  creation RPC body. Language is stamped from the creator's profile at
  debate creation time.
PROTECTS: Every debate gets the correct language for Deepgram speech-to-text
  without requiring each RPC to explicitly pass it.
BITES YOU WHEN: You add a NEW debate creation RPC (a new INSERT into
  arena_debates) and assume language must be passed explicitly. It doesn't —
  the trigger handles it. But the trigger reads from profiles WHERE
  id = NEW.debater_a. If debater_a is NULL at INSERT time (mod-initiated
  debates via create_mod_debate), the trigger must handle that case.
ALSO BITES YOU WHEN: You want to override the language for a specific debate
  (e.g., a cross-language matchup). The trigger fires BEFORE INSERT and
  overwrites whatever language value the RPC set. To allow overrides,
  the trigger would need a "if NEW.language IS NOT NULL, skip" guard.
SYMPTOM: Debate language is always 'en' even though creator's profile says
  'es'. Check: is the trigger reading the correct user ID? Is debater_a
  populated at INSERT time for this creation path?
FIX: Verify trigger exists: SELECT tgname FROM pg_trigger WHERE
  tgrelid = 'arena_debates'::regclass AND tgname = 'stamp_debate_language';
  Check trigger body handles NULL debater_a (mod-initiated path).
SESSION: 240.
```

---

# SECTION 2: RLS POLICIES

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
  avatar_url, bio, username, preferred_language
PROTECTS: Anything not in that list cannot be updated through this function
BITES YOU WHEN: You add a new "safe" field to profiles (e.g. timezone)
  and expect update_profile() to handle it — it won't. Field is silently ignored.
SYMPTOM: No error. Update appears to succeed. New field unchanged.
FIX: Add the new field to the update_profile() function body AND the allow-list in the function.
  Remember to handle NULL vs empty string properly.
NOTE: preferred_language added Session 240 with BCP-47 validation in the RPC.
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
  Session 30: Tried separate locks-fix.js before CDN. Global mock too late —
    GoTrueClient captures lock reference at module parse time, not at call time.
  Session 31: noOpLock in createClient config. auth.js rebuilt from scratch.
    INITIAL_SESSION sole init path. No await in callback. VERIFIED WORKING.
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
  you're in placeholder mode. Verify credentials in src/config.ts are current.
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

## LM-029: API keys — Supabase secrets vs Vercel env vars
```
DECISION: Edge Functions (ai-sparring, ai-moderator) use ANTHROPIC_API_KEY
  stored as Supabase secrets (Session 220 — switched from Groq to Claude).
  GROQ_API_KEY exists in BOTH Supabase secrets (legacy, may be unused) and
  Vercel env vars (used by api/go-respond.js for /go guest AI sparring).
PROTECTS: Key separation — Supabase secrets for Edge Functions, Vercel env
  for serverless functions. Different key stores, different access.
BITES YOU WHEN: Edge Functions stop working after a Supabase project reset.
  Keys must be re-set: supabase secrets set ANTHROPIC_API_KEY=xxx
  Also: /go page stops working if GROQ_API_KEY is missing from Vercel env vars.
SYMPTOM: Edge Function returns 500. /go page returns errors.
FIX: supabase secrets set ANTHROPIC_API_KEY=your_key --project-ref faomczmipsccwbhpivmp
  Vercel env: GROQ_API_KEY for /go page.
SESSIONS: Set Session 25. Updated Session 220 (Groq→Claude for Edge Functions).
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
DECISION: All Stripe keys in src/config.ts and Vercel env are sandbox/test keys
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


# SECTION 8: THREE-ZONE ARCHITECTURE

---

## LM-046: Plinko Gate must exist before guest logic is stripped from Members Zone
```
DECISION: Build order is critical — Plinko Gate first, then strip Members Zone (NT 12.2)
PROTECTS: Unauthenticated users always have somewhere valid to go
BITES YOU WHEN: You strip guest fallbacks from Members Zone before Plinko Gate exists.
  Unauthenticated users hit a blank screen or JavaScript crash instead of signup flow.
SYMPTOM: App completely inaccessible to any new user. Bot army funnel is dead.
FIX: moderator-plinko.html must be deployed and tested before any page removes
  its guest fallback logic. Do not do these in the same deploy.
SESSIONS: Decision Session 28/29
```

---

## LM-047: moderator-login.html stays — Plinko Gate is a NEW file
```
DECISION: Plinko Gate = moderator-plinko.html. login.html is NOT deleted or replaced.
PROTECTS: Existing password reset links, email confirm links point to moderator-login.html
BITES YOU WHEN: You delete or rename moderator-login.html.
  All Supabase auth redirect URLs (email verification, password reset) break.
  Users who click email links get 404.
SYMPTOM: Email confirmation links 404. Password reset links 404. User support nightmare.
FIX: login.html stays forever. Plinko Gate is a parallel file.
SESSIONS: Decision Session 29
```


---

# SECTION 9: FRONTEND PATTERNS

---

## LM-050: Feature flags in src/config.ts — must be enabled to show UI
```
DECISION: VERSION 2.2.0 feature flags: followsUI, predictionsUI, rivals, arena (NT 4.27)
PROTECTS: Ships code without showing incomplete features
BITES YOU WHEN: You build a new feature but forget to add/enable its feature flag.
  Or you disable a flag thinking it's temporary and forget to re-enable.
SYMPTOM: Feature is coded, deployed, but UI never shows. No error.
FIX: When building any new feature, add its flag to src/config.ts AND
  verify it's set to true before testing. Check config version number matches
  what's deployed to Vercel.
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

## LM-201: Spectator entry — two paths, old spectate page preserved for completed debates
```
DECISION (Session 240): Spectator entry has two paths:
  1. Arena lobby: .card-live click handler intercepts, calls
     enterFeedRoomAsSpectator() directly — no page navigation.
     Cards use data-debate-id attribute (not data-link).
  2. External URLs: /debate/<id> or ?spectate=<debateId> on index.
     arena-core.ts init() detects ?spectate= param (UUID-validated),
     calls enterFeedRoomAsSpectator(), cleans URL via replaceState.
  Old spectate page (moderator-spectate.html / spectate.ts) is preserved
  for COMPLETED debates only. spectate.ts loadDebate() detects
  status === 'live' and redirects to /?spectate=<debateId>.
PROTECTS: Live debates always enter through the feed room (real-time
  broadcast channel). Completed debates stay on the old replay page.
BITES YOU WHEN:
  - You add a new link to a live debate using the old /debate/<id> format
    and skip the ?spectate= redirect. User lands on spectate page, which
    immediately redirects — works but wastes a page load.
  - You change the card class from .card-live to something else without
    updating the click handler in arena-lobby.ts.
  - You remove the ?spectate= handler from arena-core.ts init() — all
    external spectator links break silently (no error, just lands on lobby).
ALSO BITES YOU WHEN: enterFeedRoomAsSpectator() now expects a language
  field from the RPC response. If a new spectator entry path skips
  language, Deepgram defaults to 'en' regardless of debate language.
SYMPTOM: Clicking a live debate card navigates to a blank page or
  the old spectate page instead of the live feed room.
FIX: Live debates → enterFeedRoomAsSpectator(). Completed debates →
  spectate page. Two entry points: lobby click handler + ?spectate= URL.
SESSION: 240.
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

# SECTION 14: AUTH & SCHEMA PATTERNS

---

## LM-079: GitHub repo is NOT source of truth for schema
```
LESSON: 4 SQL files are missing from repo (NT 12.3.7). Repo SQL ≠ live Supabase.
RULE: When in doubt about schema, query Supabase directly:
  SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
  Never assume repo SQL files capture everything that's live.
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

## LM-084: Members Zone auth gate pattern — copy to every new page
```
DECISION (Session 32): Settings + profile-depth pages now gate on auth at DOMContentLoaded.
  Pattern: await ColosseumAuth.ready (6s timeout — fixed Session 163, was 4s) → if no
  session and not placeholder mode → redirect to moderator-plinko.html.
  index.html has same gate in its appInit().
PROTECTS: Three-zone architecture. Members Zone assumes valid session. No guest fallback.
BITES YOU WHEN: You add a new Members Zone HTML page and forget the auth gate.
  Guest arrives via direct URL → sees broken app with null profile, RPC errors everywhere.
  Or worse: sees a semi-functional app that leaks data or allows ungated actions.
SYMPTOM: Guest lands in Members Zone, no redirect, broken UI, console full of auth errors.
FIX: Every new Members Zone page must include at DOMContentLoaded:
  const session = await Promise.race([
    ColosseumAuth?.ready?.then(() => ColosseumAuth.currentUser),
    new Promise(r => setTimeout(r, 6000))
  ]);
  if (!session && !ColosseumAuth?.isPlaceholderMode?.()) {
    window.location.href = 'moderator-plinko.html'; return;
  }
EXEMPT PAGES: moderator-auto-debate.html, moderator-debate-landing.html (ungated by design
  per LM-067 rage-click funnel). moderator-login.html (stays for Supabase redirects per LM-047).
  moderator-plinko.html (IS the gate). moderator-terms.html (static).
SESSION: 32. Timeout corrected Session 163.
```

---

*Land Mine Map v1 — Session 29. Cleaned Session 55: fixed/one-time entries removed, Section 11 (resolved bugs) deleted.*

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
  that file. Check: moderator-auto-debate.html (always), arena AI sparring
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
FIX: Privacy policy (moderator-privacy.html) must be updated EVERY TIME
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
  Also: publish the DMCA agent contact info on moderator-terms.html
  (already done in Session 36 Terms of Service rebuild).
SESSION: 36.
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

## LM-085: guard_profile_columns and moderator stats
```
CORRECTION (Session 72): Previously documented that guard_profile_columns()
  was updated in Session 33 to protect mod_rating, mod_debates_total,
  mod_rulings_total, mod_approval_pct. However, the actual trigger function
  (verified Session 72 via prosrc) only contains: NEW.level := OLD.level;
  NEW.xp := OLD.xp; — moderator stats are NOT trigger-protected.
ACTUAL PROTECTION: Mod stats are protected by RLS (no direct client UPDATE
  on profiles) + SECURITY DEFINER RPCs (score_moderator, rule_on_reference).
BITES YOU WHEN: You assume the trigger protects mod stats and skip RPC validation.
NOTE: Session 77 updated the trigger to add streak_freezes, so the trigger
  now guards level + xp + streak_freezes. Mod stats remain unprotected by trigger.
SESSION: 33, corrected 72, updated 77.
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

## LM-092: Supabase legacy vs new API keys — both formats work
```
DECISION (Session 34, CORRECTED Session 196+): Supabase introduced new key formats
  (sb_secret_*, sb_publishable_*). Original entry claimed these were NOT compatible
  with the JS client library. That was wrong.
PROTECTS: N/A — this is a compatibility note.
CORRECTION: Session 3 (security hardening) rotated the VPS .env to the new-style
  sb_secret_* key and verified it works with a live query against the profiles table.
  Both legacy (eyJ...) and new-style (sb_secret_*) keys work with @supabase/supabase-js.
BITES YOU WHEN: You assume one format doesn't work and waste time hunting for the
  legacy tab when the new key is fine.
FIX: Use whichever key format Supabase gives you. Both work. VPS currently uses
  the new-style key.
SESSION: 34. Corrected: Session 196+ (security hardening sessions).
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

## LM-110: ai-moderator Edge Function defaults to ALLOW on any error
```
DECISION (Session 39): If the AI provider fails, times out, or returns
  unparseable output, ai-moderator returns ruling: "allowed".
  Edge Functions use Claude/Anthropic as of Session 220 (was Groq).
PROTECTS: Debate flow. LM-087 pattern — debate can never hang.
BITES YOU WHEN: Anthropic has an outage. ALL evidence auto-passes.
  Spam/trolling evidence slips through during downtime.
SYMPTOM: System messages show "AI Moderator: Evidence AUTO-ALLOWED
  (moderator unavailable)" — all references pass without evaluation.
FIX: Acceptable trade-off. Debate flowing > perfect moderation.
  If outages become frequent, add a circuit breaker that
  switches to human-only moderation after N consecutive failures.
SESSION: 39. Updated: Session 220 (Groq→Claude).
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
  JS confirm dialog references it in src/arena.ts showRankedPicker().
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
  Added to src/auth.ts Session 47. Not yet backfilled into all modules —
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
DECISION (Session 50): Added ?returnTo= parameter to moderator-plinko.html
  and moderator-login.html so users return where they came from after auth.
BITES YOU WHEN: Attacker crafts a link like
  moderator-plinko.html?returnTo=//evil.com or
  moderator-plinko.html?returnTo=javascript:alert(1).
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

## LM-154: colo-shimmer CSS class only exists in index.html
```
DECISION (Session 60): Added .colo-shimmer class + @keyframes coloShimmer to
  index.html <style> block for leaderboard shimmer loading.
BITES YOU WHEN: You try to use class="colo-shimmer" in another HTML page
  (auto-debate, groups, profile-depth, etc). The CSS won't exist there.
  Shimmer elements will render as invisible/unstyled divs.
SYMPTOM: Loading skeleton shows blank rectangles instead of shimmer animation.
  No error in console — just missing CSS.
FIX: Either copy the .colo-shimmer + @keyframes rules into the other page's
  <style> block, or extract into a shared CSS file imported by all pages.
RULE: Any new CSS class added to index.html is scoped to index.html only.
  Other HTML pages don't share the same <style> block.
SESSION: 60.
```

---

## LM-155: showToast() and friendlyError() live in src/config.ts
```
DECISION (Session 60): Global toast and error translation added to
  src/config.ts as ColosseumConfig.showToast() and
  ColosseumConfig.friendlyError().
BITES YOU WHEN: You call showToast() or friendlyError() from a page that
  doesn't load src/config.ts. Currently all pages do, but if a new
  lightweight page is added without the config script, these functions
  won't exist. Optional chaining (ColosseumConfig?.showToast?.()) protects
  against crashes, but the toast simply won't appear.
SYMPTOM: No toast shown, no error thrown. Silent failure.
FIX: Ensure src/config.ts is loaded on every page that uses these
  functions. Or add a null check with console.warn fallback.
RULE: showToast() and friendlyError() require src/config.ts.
  All arena error patches use optional chaining as a safety net.
SESSION: 60.
```

---

## LM-156: api/profile.js depends on profiles_public view + anon RLS
```
DECISION (Session 61): Public profile pages at /u/username query
  profiles_public view via Supabase REST API with the anon key.
  This works because profiles_select_public policy is USING(true).
BITES YOU WHEN:
  - You change profiles_select_public to require auth → profile pages
    return empty results, show 404 for every user.
  - You drop or rename profiles_public view → 404 for all profiles.
  - You add columns to profiles that shouldn't be public and they
    leak through if profiles_public SELECT * is used (it doesn't —
    it has an explicit column list, but verify after schema changes).
  - You rotate the anon key without updating api/profile.js fallback
    or Vercel env vars.
SYMPTOM: All profile pages show "GLADIATOR NOT FOUND" even for
  valid users. No error visible to the user.
FIX: Check profiles_public view exists and profiles_select_public
  policy is USING(true). Verify anon key matches. Test with:
  curl "https://faomczmipsccwbhpivmp.supabase.co/rest/v1/profiles_public?username=eq.TEST&select=*" \
    -H "apikey: ANON_KEY"
RULE: Never restrict profiles_select_public without updating
  api/profile.js to use service_role or a SECURITY DEFINER function.
SESSION: 61.
```

---

## LM-157: /u/:username rewrite must stay FIRST in vercel.json rewrites
```
DECISION (Session 61): /u/:username → /api/profile?username=:username
  is the first rewrite rule in vercel.json.
BITES YOU WHEN: You add a new rewrite above it that matches /u/*
  or a catch-all like /:path* that would swallow the /u/ prefix.
  Vercel evaluates rewrites in order — first match wins.
SYMPTOM: /u/username returns wrong page or 404 instead of profile.
FIX: Keep the /u/:username rewrite as the first entry (or at least
  before any catch-all rewrite).
ALSO: The /api/* headers block in vercel.json sets X-Robots-Tag:
  noindex and Cache-Control: no-store. These match on the SOURCE
  URL, not the rewritten destination. /u/username does NOT match
  /api/(.*) so profile pages remain indexable and cacheable. If
  Vercel changes this behavior, profile pages would disappear from
  Google. Test after any Vercel version update.
SESSION: 61.
```

---

## LM-158: avatar_url must be protocol-validated before rendering in HTML
```
DECISION (Session 61): api/profile.js uses sanitizeAvatarUrl() to
  whitelist only https:// URLs for avatar images.
PROTECTS: Blocks javascript:, data:text/html, and other dangerous
  URI schemes that could theoretically execute in img src.
  Modern browsers don't execute javascript: in img src, but
  defense-in-depth matters.
BITES YOU WHEN: A new page renders avatar_url without this check.
  Any page that takes avatar_url from the DB and puts it in an
  <img src="..."> needs to validate the protocol first.
SYMPTOM: No visible symptom — attack would be silent JS execution.
FIX: Always run avatar_url through a protocol whitelist before
  rendering. Only allow https://.
RULE: Never put a DB string into an img src, href, or any URL
  attribute without protocol validation. escapeHtml prevents
  attribute breakout but does NOT prevent dangerous URI schemes.
SESSION: 61.
```

---

## LM-159: claim_daily_login() uses DROP + CREATE pattern
```
DECISION (Session 72): claim_daily_login() was DROPped and recreated to add
  streak freeze logic. Return type changed (added freeze_used, streak_freezes fields).
BITES YOU WHEN: Running the Phase 3 migration a second time — the DROP is safe
  (IF EXISTS) but if you modify the function signature and forget to DROP first,
  Postgres throws "cannot change return type of existing function".
SYMPTOM: "ERROR: cannot change return type of existing function"
FIX: Always DROP FUNCTION before CREATE OR REPLACE when changing return types.
  Same pattern as auto_allow_expired_references() (LM documented separately).
RULE: Any RPC that returns JSONB and you're adding new keys — just DROP + CREATE.
  The keys inside JSONB don't cause the error, but if you ever change from
  JSONB to TABLE or vice versa, you must DROP first.
SESSION: 72.
```

---

## LM-160: claim_milestone() dedup relies on reference_id = milestone key string
```
DECISION (Session 72): Milestones are deduplicated via token_earn_log where
  action = 'milestone' AND reference_id = p_milestone_key (a string like
  'first_hot_take', 'profile_3_sections', etc.).
BITES YOU WHEN: You add a new milestone key in JS but forget to add it to the
  VALUES list inside the SQL function. The RPC returns 'Unknown milestone'.
  Also bites if you rename a milestone key — old claims under the old key
  won't block the new key, so users could double-claim.
SYMPTOM: "Unknown milestone" error, or milestone claimed twice under different keys.
FIX: Milestone keys must match exactly between JS (MILESTONES object in
  src/tokens.ts) and SQL (VALUES list in claim_milestone()). Never
  rename a key after go-live without a migration to update existing earn logs.
SESSION: 72.
```

---

## LM-161: streak_freezes column IS now trigger-protected (Session 77)
```
DECISION (Session 77): streak_freezes was added to guard_profile_columns trigger
  alongside level and xp. Previously (Session 72) it was NOT protected.
PROTECTS: Prevents client-side manipulation of streak freeze balance.
  Also protected by RLS (no direct client UPDATE) + SECURITY DEFINER RPCs
  (claim_daily_login, claim_milestone).
BITES YOU WHEN: You assume the old documentation (Session 72) that said
  streak_freezes was unprotected. It IS now guarded by the trigger.
RELATED: LM-001 (updated Session 77) — trigger now guards level + xp + streak_freezes.
SESSION: 72 (created unprotected), 77 (added to trigger).
```


---

# SECTION 20: SCHEMA / TOKEN / ARENA PATTERNS (Sessions 72-206)

---

## LM-170: landing_vote_counts table — anonymous votes on debate-landing page
```
DECISION (Session 103): moderator-debate-landing.html was localStorage-only for
  voting. Added landing_vote_counts table + 2 SECURITY DEFINER RPCs
  (cast_landing_vote, get_landing_votes), both granted to anon role.
  RLS enabled with zero policies (deny all direct access).
BITES YOU WHEN: You add new demo debates to the hardcoded DEBATES object in
  moderator-debate-landing.html but don't seed them in landing_vote_counts.
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
  UPDATED Session 164: Questionnaire expanded from 39→100 questions across 20 sections
  (8 new B2B-driven sections added). ALL tier thresholds are now reachable.
  Tier 3 Gladiator (50 questions), Tier 4 Champion (75 questions), Tier 5 Legend
  (100 questions) are all achievable.
BITES YOU WHEN: You add new questions and accidentally allow the count to exceed
  100 without updating the tier threshold ceiling. Or if you reduce the question
  count without recalibrating thresholds.
FIX: Thresholds are defined in two places:
  1. src/tiers.ts TIER_THRESHOLDS array (client display)
  2. RPCs that enforce server-side (place_stake, purchase_power_up — Phase 2+)
  Both must change together.
SESSION: 117 (documented), 164 (questionnaire expanded to 100 questions).
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

## LM-179: token_earn_log column is earn_type not action
```
DECISION (Session 124): get_my_milestones and claim_milestone RPCs both
  referenced a column called `action` on token_earn_log. The actual column
  is `earn_type`. Second bug: claim_milestone tried to store text milestone
  keys (like 'first_hot_take') in `reference_id` which is UUID type.
BITES YOU WHEN: Any page loads (get_my_milestones fires on every page load
  via src/tokens.ts init). Console shows 400 error on every page.
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

## LM-182: Double settle_stakes call in endCurrentDebate
```
DECISION (Session 123): endCurrentDebate() in src/arena.ts called
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

---

## LM-190: arena_debates.player_a_ready / player_b_ready — match accept gate
```
DECISION (Session 168): F-02 adds player_a_ready (BOOLEAN DEFAULT NULL)
  and player_b_ready (BOOLEAN DEFAULT NULL) to arena_debates.
  Two new RPCs: respond_to_match(p_debate_id, p_accept) and
  check_match_acceptance(p_debate_id). Both are SECURITY DEFINER
  with auth check (caller must be player_a or player_b).
PROTECTS: Both players must explicitly accept before entering a debate.
  Prevents one-sided matches where opponent already left.
BITES YOU WHEN:
  - You query arena_debates and assume all 'pending' debates are waiting
    for content. Some are now waiting for accept/decline.
  - You add a new debate creation path that skips the accept flow.
    AI debates bypass this (no opponent to accept), but any new human
    match path must route through showMatchFound().
  - respond_to_match is idempotent (second call is no-op). But if you
    call it after the debate has moved past 'pending' status, the
    cancellation UPDATE won't fire (WHERE status = 'pending' guard).
  - check_match_acceptance returns player_a_ready/player_b_ready/status.
    Client uses MatchData.role ('a' or 'b') to know which column is
    "mine" vs "opponent." If role assignment changes in join_debate_queue,
    this mapping breaks silently.
SYMPTOM: Debate starts with only one player ready. Or: accept screen
  shows "opponent declined" immediately because columns are read wrong.
FIX: role comes from join_debate_queue → MatchData.role. player_a = role 'a',
  player_b = role 'b'. If changing queue assignment logic, update the
  client-side column mapping in onMatchAccept() poll handler.
RULE: AI debates (no opponent_id) skip the match found screen entirely.
  Human debates MUST go through showMatchFound() → respond_to_match().
SESSION: 168.
```

## LM-191: score_debate_comment bypasses insert_feed_event — both must be kept in sync
```
DECISION (Session 178): score_debate_comment writes directly to debate_feed_events
  instead of calling insert_feed_event. Required because the atomic
  UPDATE ... RETURNING on arena_debates (to get score_a_after/score_b_after) and
  the INSERT must happen in the same transaction.
PROTECTS: Score totals in point_award event metadata are always accurate.
BITES YOU WHEN: insert_feed_event gains new logic (rate limiting, content sanitization
  changes, new validation). score_debate_comment does NOT inherit those changes
  automatically. They are separate code paths that happen to both write to
  debate_feed_events.
ALSO BITES YOU (Session 235): Per-value scoring budget enforcement is now hardcoded
  as a CASE statement INSIDE score_debate_comment (5pts=max 2, 4pts=max 3, 3pts=max 4,
  2pts=max 5, 1pt=max 6 per round; 20 actions, 50 max points). The
  scoring_budget_per_round column on arena_debates is UNUSED. If you want to change
  budget limits, you must CREATE OR REPLACE score_debate_comment with new CASE values.
  Do not attempt to use the column — it is not read.
SYMPTOM: insert_feed_event enforces a new rule (e.g., rate limit), but point_award
  events bypass it entirely. Inconsistent behavior between event types.
FIX: Any new logic added to insert_feed_event that should also apply to point_award
  events must be manually added to score_debate_comment. They are permanently coupled.
  Both functions must reference each other in comments. Never remove this note.
SESSION: 178, updated 235.
```

## LM-193: Realtime broadcast private channels require setAuth() before subscribe
```
DECISION (Session 178): debate_feed_events uses realtime.broadcast_changes with
  private channels (topic: 'debate:<uuid>'). Clients must call
  await supabase.realtime.setAuth() BEFORE subscribing, and subscribe with
  { config: { private: true } }. The realtime.messages RLS policy checks
  extension = 'broadcast' for authenticated users.
BITES YOU WHEN: You subscribe to the debate channel without setAuth() or without
  the private config flag. The channel appears to connect but receives no events.
SYMPTOM: Broadcast messages never arrive. No error in console. WebSocket connection
  shows as established. Supabase Realtime logs show auth rejection on channel join.
FIX:
  await supabase.realtime.setAuth();
  const channel = supabase
    .channel(`debate:${debateId}`, { config: { private: true } })
    .on('broadcast', { event: 'INSERT' }, handler)
    .subscribe();
  Also: worker mode recommended for stable mobile connections:
  createClient(url, key, { realtime: { worker: true } })
ALSO BITES YOU WHEN: Supabase Dashboard → Realtime → Settings has "Allow public
  access" enabled. Must be DISABLED to enforce private channel auth.
SESSION: 178.
```

## LM-194: record_mod_dropout — one 0-score per dropout, not two
```
DECISION (Session 178): record_mod_dropout inserts one synthetic 0-score into
  moderator_scores using the REPORTING debater's ID as scorer_id. Uses
  ON CONFLICT (debate_id, scorer_id) DO NOTHING. If the other debater also
  calls the RPC (idempotent path via 'cancelled' status check), they do NOT
  insert a second 0-score.
  Result: one 0-score per dropout event, never two.
BITES YOU WHEN: You assume both debaters reporting the dropout doubles the penalty
  impact on mod_approval_pct. It doesn't — the second caller hits the idempotency
  guard (status = 'cancelled') and returns { already_processed: true } before
  reaching the score insertion.
ALSO BITES YOU WHEN: You change the moderator_scores schema and break the
  ON CONFLICT constraint on (debate_id, scorer_id). Both debaters could then
  insert separate 0-scores, doubling the penalty unintentionally.
FIX: If you want both debaters to register disapproval, remove ON CONFLICT and
  handle the duplicate case differently. Current behavior (single penalty) is
  intentional. Verify the unique constraint on moderator_scores covers
  (debate_id, scorer_id) before any schema changes.
SESSION: 178.
```

## LM-195: middleware.js CORS allowlist must include every production domain

```
WHAT: middleware.js enforces CORS on all /api/* routes. The ALLOWED_ORIGINS
  array must contain every domain that calls Vercel serverless functions.
BITES YOU WHEN: You add a new domain or rename the app and forget to update
  middleware.js. All /api/* POST requests from the missing domain return 403
  with {"error":"Origin not allowed"}. Supabase calls are NOT affected (they
  go direct to Supabase, not through /api/*).
CURRENT LIST (Session 206):
  - https://colosseum-six.vercel.app
  - https://thecolosseum.app (legacy)
  - https://themoderator.app (production)
  - localhost:3000/5173 (dev/preview only)
FIX: Add any new production domain to the ALLOWED_ORIGINS array in middleware.js.
SESSION: 206.
```

## LM-196: get_arena_feed RPC accepts p_category — default NULL returns all

```
WHAT: get_arena_feed(p_limit int DEFAULT 20, p_category text DEFAULT NULL).
  When p_category is NULL, returns all categories (original behavior).
  When set, filters both arena_debates and auto_debates sub-queries.
BITES YOU WHEN: You add a new category to the app but the auto_debates table
  uses a different category slug. The arena_debates table uses the QUEUE
  category slug (e.g., 'couples'), auto_debates uses whatever Leg 3 wrote.
  Filter mismatch = auto-debates vanish from the feed for that category.
FIX: Verify category slugs match between arena_debates and auto_debates.
SESSION: 206.
```

## LM-197: /go page is fully standalone — no auth, no Supabase, no arena.ts

```
WHAT: moderator-go.html is a self-contained page. It calls api/go-respond.js
  (Vercel serverless) which calls Groq directly. No Supabase auth, no database
  writes, no tokens, no Elo. Debates are ephemeral and not saved.
BITES YOU WHEN: You try to add features that require auth (saving debates,
  earning tokens, recording stats). The page has zero Supabase client — you'd
  need to add the full auth init flow to make any of that work.
ALSO: GROQ_API_KEY must be set in Vercel env vars, not just Supabase Edge
  Function secrets. They're separate key stores.
FIX: If /go needs auth features in the future, either add supabase-js init
  or redirect authenticated actions to the main arena.
SESSION: 206.
```

## LM-198: Plinko is now 5 steps, not 4

```
WHAT: TOTAL_STEPS = 5 in src/pages/plinko.ts. Step order:
  1. OAuth/Email → 2. Age Gate → 3. Username → 4. Moderator Opt-In → 5. Done
BITES YOU WHEN: Email confirmation return paths hardcode step numbers. They
  should go to step 5 (Done), skipping the mod opt-in since the user already
  signed up. If you add more steps, update all goToStep() targets.
ALSO: The mod opt-in step calls toggleModerator(true) from auth.ts. If that
  RPC fails, the user still proceeds to step 5 — it shows an error toast but
  doesn't block signup.
SESSION: 206.
```

---

## LM-199: Supabase SMTP password field silently wipes on re-save

```
WHAT: If you open Supabase Auth → SMTP Settings and click Save without
  re-entering the SMTP password, the password field silently blanks.
  Supabase does not warn you. Emails stop delivering with no error in
  the dashboard — signups just never receive confirmation emails.
BITES YOU WHEN: You change any SMTP setting (sender name, sender email,
  rate limits) and hit Save without re-pasting the Resend API key into
  the password field. Also happened during Session 5 — the spam fix in
  a prior session likely wiped it.
SYMPTOM: New signups don't receive confirmation emails. No error in
  Supabase logs. Resend dashboard shows zero sends. Existing sessions
  and logged-in users are unaffected, so the app looks fine.
DIAGNOSIS: Go to Supabase → Auth → SMTP Settings. If the password field
  is empty, that's the problem.
FIX: Paste the current Resend API key (labeled "supabase-smtp" in Resend
  dashboard) into the SMTP password field. Click Save. Send a test signup
  to verify delivery. Rule: ALWAYS re-paste the API key before saving
  SMTP settings, even if you didn't touch the password field.
SESSION: Security hardening sessions (Session 5 bug fix).
```
