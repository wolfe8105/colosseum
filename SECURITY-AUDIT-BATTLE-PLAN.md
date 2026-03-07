# SECURITY AUDIT BATTLE PLAN
### For Claude's Use Only — Not Human-Readable Documentation
### Created: Session 45 (March 7, 2026)

> Purpose: Walk every defense node against what the world actually does. Verdict per node.
> Order: highest risk / most naive first → lowest risk / most likely correct last.
> Update order as each node is audited — findings change what matters next.

---

## HOW TO USE THIS

Each node follows this format:
```
NODE: Name
WHAT WE BUILT: Plain description of current implementation
WHAT THE WORLD DOES: What research found is standard
VERDICT: GOOD / NAIVE / WRONG / MISSING
RISK: HIGH / MEDIUM / LOW (if something fires before we fix it)
FIX ORDER: Where this falls in the queue
ACTION: What to actually change, if anything
```

---

## AUDIT ORDER (Priority Stack — Reorder As You Go)

### TIER 1 — FIRE NOW IF HIT (fix before DRY_RUN=false)
1. Rate Limiting Algorithm
2. Stripe Webhook Idempotency
3. Input Sanitization Layer
4. RLS Policy Indexing
5. CSP Header Coverage

### TIER 2 — FIRE WHEN FIRST REAL USER HITS (fix within 30 days of bot go-live)
6. Auth Session Mid-Expiry Handling
7. SECURITY DEFINER Function Exposure
8. Bot Army Platform Detection Risk
9. RLS Policy Role Scoping
10. Stripe Webhook Signature — Raw Body

### TIER 3 — FIX WHEN SCALE DEMANDS IT (not now)
11. Vote Manipulation / Trust Score Weighting
12. Alt Account Fingerprinting
13. WAF / DDoS Protection
14. Audit Trail Hardening

---

## TIER 1 NODES

---

### NODE 1: Rate Limiting Algorithm

**WHAT WE BUILT:**
Custom `rate_limits` table in Postgres. Per-action checks inside RPCs. `middleware.js` does IP-level throttling. All counting happens in Postgres rows — increment counter, check against limit, reset on TTL. No external store. No algorithm name — just "count requests in window."

**WHAT THE WORLD DOES:**
- Fixed window (what we built) is the naive first attempt. Known vulnerability: boundary bursts. A user can send 2x the limit by hitting the tail of one window and the head of the next.
- Sliding window is the correct production pattern for most cases — removes boundary burst problem, moderate memory cost.
- Token bucket is the production pattern for bursty-but-fair traffic (e.g., a mobile app that opens and batches several RPCs). Lua script atomicity required.
- Redis is the canonical backing store — not Postgres. Postgres row-level rate limiting adds write pressure to the primary DB on every single request. At any real traffic volume this becomes a hot path problem.
- Correct response headers: X-RateLimit-Remaining, X-RateLimit-Limit, Retry-After. We return none of these.
- Lua scripts required for atomicity if using Redis token bucket (two concurrent reads of same counter can both pass without atomic check).

**VERDICT: NAIVE**

**RISK: MEDIUM** — At current zero-user scale this doesn't matter. The moment bot army drives real traffic (even 370 mentions/day converting at 1%), concurrent requests will start hitting the Postgres rate_limits table simultaneously. Two concurrent requests can both read "under limit" and both pass (race condition). Also, we're adding DB write pressure for every action check.

**FIX ORDER: 4** — Not before bot go-live, but needs to be on the immediate post-launch list. Current implementation won't collapse but it's wrong under load.

**ACTION:**
- Phase 1 (now, low effort): Wrap all rate_limits checks in a Postgres advisory lock or use `FOR UPDATE` to prevent concurrent reads. Eliminates race condition without new infrastructure.
- Phase 2 (post-traction): Migrate rate limiting to Upstash Redis (free tier, serverless, no VPS needed). Implement sliding window counter. Add X-RateLimit-* response headers to Edge Functions. Token bucket for auth endpoints (login, signup, password reset) — those are the highest-value targets.
- Note: middleware.js IP throttling is fine as a first gate. The problem is per-user, per-action Postgres counting.

---

### NODE 2: Stripe Webhook Idempotency

**WHAT WE BUILT:**
`colosseum-stripe-functions.js` — Edge Function that receives Stripe webhooks, verifies signature, calls `credit_tokens()`. No idempotency tracking. No deduplication. Stripe event processed every time it arrives.

**WHAT THE WORLD DOES:**
- Stripe guarantees at-least-once delivery. Same event WILL arrive multiple times (retries on 5xx, network issues, Stripe's own retry logic up to 3 days).
- Every production Stripe integration stores `event.id` in a DB table before processing. If `event.id` already exists → return 200, skip processing.
- Without this: a user gets double-credited tokens, double-subscribed, or double-fulfilled on any payment event that triggers a retry.
- Raw body must be preserved for signature verification. Body parsers that parse-then-stringify can silently break HMAC verification.
- 5-minute timestamp tolerance is standard. Events older than 5 min must be rejected (replay attack mitigation).
- Correct flow: verify signature → check idempotency → return 200 → process async (or process sync if fast enough).

**VERDICT: WRONG** (for production — currently in sandbox so no real damage, but this is a day-one production bug)

**RISK: HIGH** — The moment Stripe sandbox becomes Stripe live, any network hiccup during a payment creates duplicate token credits or subscription activations. This is money.

**FIX ORDER: 1** — Must be fixed before Stripe goes live. The code exists in `colosseum-stripe-functions.js`. Also flagged as tech debt (LM-117 — old import pattern). Fix both in same session.

**ACTION:**
- Add `stripe_processed_events` table (id TEXT PRIMARY KEY, processed_at TIMESTAMPTZ).
- Before processing any event: `INSERT INTO stripe_processed_events (id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id`. If no row returned → already processed → return 200 immediately.
- Rewrite Edge Function with `Deno.serve()` pattern (not old `serve()` from deno.land — LM-117).
- Preserve raw body for signature verification (don't re-stringify).
- Keep 5-minute timestamp check (Stripe SDK handles this by default).

---

### NODE 3: Input Sanitization Layer

**WHAT WE BUILT:**
Custom `sanitize_text()` and `sanitize_url()` SQL functions inside Supabase RPCs. Strip certain characters, limit length. Hand-rolled. Not using any recognized sanitization library.

**WHAT THE WORLD DOES:**
- For plain text storage (no HTML rendering): the primary concern is SQL injection (handled by parameterized queries — Supabase RPC does this) and storage of control characters / null bytes. Hand-rolled strip is acceptable IF parameterized queries are used. They are.
- For any text that will be rendered as HTML (hot takes shown in feed): DOMPurify is the OWASP-recommended standard. Maintained by Cure53, the German security firm. Actively updated. Our custom strip does NOT catch all XSS vectors — onerror attributes, javascript: URIs, SVG injection, data: URIs, DOM clobbering. It catches simple angle brackets.
- The real question: are we ever rendering user content as innerHTML? If yes — we need DOMPurify. If we're always using `textContent` or `innerText` — our sanitization is acceptable for storage but the display layer is the real XSS gate.
- For URL sanitization: standard is to allowlist schemes (https://, http://, mailto:) and reject everything else. We need to verify our current sanitize_url() does this — javascript: and data: URIs are the common attack vectors.

**VERDICT: NAIVE** (probably not WRONG — depends on render path)

**RISK: MEDIUM** — Need to audit the JS files to find every `.innerHTML =` assignment. If any of those take user content without DOMPurify, that's an XSS hole. If all user content is rendered via textContent/innerText, we're fine for now.

**FIX ORDER: 3** — Quick audit first (grep for innerHTML in JS files), then decide if DOMPurify is needed.

**ACTION:**
- Immediate: `grep -rn "innerHTML" /home/claude/colosseum/*.js` — find every innerHTML assignment.
- For each one: is the content from user input or system-generated? If user input → needs DOMPurify.
- If DOMPurify needed: add `isomorphic-dompurify` to Vercel frontend. Sanitize on render, not just on storage.
- Verify `sanitize_url()` explicitly blocks `javascript:` and `data:` URI schemes.
- Note: Groq-generated content (auto-debates, AI sparring) currently trusted. Should run through DOMPurify before display as defense-in-depth (noted gap in Defense Map — still unaddressed).

---

### NODE 4: RLS Policy Indexing

**WHAT WE BUILT:**
24 hardened RLS policies across 33 tables. Policies use `auth.uid() = user_id` patterns throughout. Built correctly for security. Index status unknown.

**WHAT THE WORLD DOES:**
- RLS performance is a known Supabase gotcha. Supabase docs + community testing (GaryAustin1/RLS-Performance) show 100x+ slowdown on large tables when RLS columns aren't indexed.
- Every column used in a USING or WITH CHECK expression needs a btree index.
- `auth.uid()` calls should be wrapped in `(SELECT auth.uid())` to enable Postgres initPlan caching — prevents the function from being called once per row.
- `TO authenticated` should be explicit in every policy (not just `TO public`) — eliminates anon users from even entering the policy evaluation path.
- SECURITY DEFINER functions used in RLS policies should NOT be in the public schema if their results would be a security leak — Supabase will expose them as callable RPCs otherwise.
- Views bypass RLS by default (postgres user creates them with security definer). Need `security_invoker = true` in Postgres 15+ or explicit access revocation.

**VERDICT: PROBABLY NAIVE** (correct security, unknown performance)

**RISK: LOW now, MEDIUM at scale** — With zero users, no performance impact. At 1000+ rows in any table with RLS, leaderboard queries, hot takes feeds, and arena lobby loads will start slowing down.

**FIX ORDER: 5** — Use Supabase Performance Advisor (built into dashboard) to identify which RLS policies are missing indexes. It will flag them automatically. Low effort to check.

**ACTION:**
- Go to Supabase Dashboard → Database → Performance Advisor → run advisor.
- Also Security Advisor → will flag: unindexed foreign keys, auth.uid() without initPlan wrapping, missing `TO authenticated` role scoping, SECURITY DEFINER views.
- Add `(SELECT auth.uid())` wrapper to all RLS policies that call auth.uid() directly.
- Add `TO authenticated` to all policies that should only apply to logged-in users.
- Add btree indexes on `user_id` columns in high-traffic tables: hot_takes, hot_take_reactions, follows, rivals, predictions, debate_queue, arena_votes, auto_debate_votes.
- This is one SQL migration file. Quick win.

---

### NODE 5: CSP Header Coverage

**WHAT WE BUILT:**
`vercel.json` has Content-Security-Policy headers. Defense Map Layer 5. Current policy allows CDN resources for fonts/libraries.

**WHAT THE WORLD DOES:**
- Allowlist-based CSP (list of allowed domains) is considered WRONG by modern security standards (CSP Is Dead, Long Live CSP! paper). Allowlist policies often inadvertently allow unsafe domains and can be bypassed.
- Strict CSP = nonce-based or hash-based. Nonce requires server-side rendering to generate per-request random value. Hash-based works for static SPAs.
- For a static SPA (which we are — Vercel serves static HTML), hash-based CSP is the correct approach. Compute SHA-256 of each inline script block at build time, add to CSP header.
- Minimum effective CSP for XSS prevention: `script-src 'sha256-{hash}' 'strict-dynamic'; object-src 'none'; base-uri 'none';`
- `unsafe-inline` in script-src defeats the entire purpose of CSP.

**VERDICT: UNKNOWN — need to see current vercel.json** 

**RISK: MEDIUM** — If we have `unsafe-inline` in script-src, our CSP is theater. Need to audit.

**FIX ORDER: 5** — Audit first. If `unsafe-inline` is present, fix. If we have a real allowlist CSP, it's probably good enough for launch but should be noted as tech debt.

**ACTION:**
- Read current vercel.json CSP value.
- If `unsafe-inline` present → flag as security theater, plan hash-based CSP migration.
- If allowlist-only → acceptable for now, add to Tier 3 list.
- Check: does the CSP cover all pages (index.html, arena, settings, plinko, auto-debate, debate-landing, profile-depth, leaderboard)?

---

## TIER 2 NODES

---

### NODE 6: Auth Session Mid-Expiry Handling

**WHAT WE BUILT:**
`onAuthStateChange` INITIAL_SESSION as sole init path. noOpLock in createClient. 3s timeout fallback to guest. No explicit handling for session expiry mid-use.

**WHAT THE WORLD DOES:**
- Supabase JS SDK auto-refreshes tokens before expiry via background timer. Works correctly as long as `onAuthStateChange` is registered.
- `TOKEN_REFRESHED` event fires automatically — we should listen for it and update any in-memory state that holds the current user.
- If app is open for hours and token refreshes silently, RPC calls continue to work. But if refresh fails (Supabase down, network drop), subsequent RPCs will 401.
- Correct pattern: listen for `TOKEN_REFRESHED` → update local user state. Listen for `SIGNED_OUT` → redirect to guest/plinko.
- Do NOT call `getSession()` frequently — Supabase docs say to extract JWT and store in memory. We already avoid this per Session 31 fix.

**VERDICT: PROBABLY GOOD** — Session 31 fix correctly uses onAuthStateChange. But need to verify TOKEN_REFRESHED is handled and 401 mid-session has a graceful path.

**RISK: LOW** — Auto-refresh handles 99% of cases. Only fires if Supabase is down during a session.

**FIX ORDER: 6** — Post-launch audit.

**ACTION:**
- Verify `onAuthStateChange` in `colosseum-auth.js` handles `TOKEN_REFRESHED` event.
- Add graceful 401 handler in RPC calls: if 401, attempt token refresh, if still 401, soft-redirect to login.

---

### NODE 7: SECURITY DEFINER Function Exposure

**WHAT WE BUILT:**
42+ functions, many with SECURITY DEFINER. All in `public` schema. Supabase PostgREST exposes all public schema functions as callable RPCs by default.

**WHAT THE WORLD DOES:**
- This is a known Supabase footgun. SECURITY DEFINER functions in the public schema can be called directly via `supabase.rpc('function_name')` by any anon user.
- Functions like `check_rate_limit()`, `credit_tokens()`, `get_available_moderators()` — if they have any RLS bypass, they could leak data or allow privilege escalation if called directly.
- `credit_tokens()` already has a service_role check inside (LM-011) — correct.
- Others may not. Any SECURITY DEFINER function that takes user-controlled parameters and queries privileged tables is potentially exposable.
- Correct pattern: move sensitive SECURITY DEFINER functions to a non-exposed schema (e.g., `private` schema), or add explicit `auth.uid()` checks inside each function before doing privileged work.

**VERDICT: NEEDS AUDIT** — credit_tokens is locked. Others unknown.

**RISK: MEDIUM** — Could allow anon users to call privileged functions with crafted parameters.

**FIX ORDER: 7** — Audit all 42 functions for: (1) SECURITY DEFINER flag, (2) what data they access, (3) whether they check auth before acting.

**ACTION:**
- SQL: `SELECT proname, prosecdef FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prosecdef = true;`
- For each SECURITY DEFINER function: does it check `auth.uid()` or `current_setting('role')` before doing privileged work?
- Functions that don't: add auth check at top, or move to private schema.

---

### NODE 8: Bot Army Platform Detection Risk

**WHAT WE BUILT:**
Single IP VPS (161.35.137.21). All bots run from same process. User-agent strings unknown. Posting cadence unknown. No IP rotation.

**WHAT THE WORLD DOES:**
- Reddit, Twitter/Bluesky, Discord all use behavioral fingerprinting. Signals: post frequency, account age, follower/following ratio, interaction patterns, IP reputation, user-agent strings.
- Single IP from a DigitalOcean datacenter is a known bot signal. DigitalOcean IP ranges are public and many platforms block or throttle datacenter IPs.
- Correct patterns used by sophisticated bot operators: residential proxy rotation, human-like delays with jitter (not fixed intervals), randomized user-agents, account warmup (gradual activity increase from new account), post time distribution that mirrors human patterns.
- Our bots use PM2 cron intervals — these are exact-second timing, which is a bot signal. Humans don't post at exactly :00 every 30 minutes.

**VERDICT: NAIVE** — Will work initially, will get flagged as volume increases.

**RISK: MEDIUM** — Reddit is the most aggressive about bot detection. Our Leg 1 (reactive, fishing arguments) is higher risk than Leg 3 (auto-debate generation which doesn't post to Reddit directly).

**FIX ORDER: 8** — Not urgent before go-live. Becomes urgent if bot accounts get banned.

**ACTION:**
- Add jitter to all cron intervals: instead of exactly every 30 min, randomize ±5-10 min.
- Add human-like delays between actions within a run (setTimeout with random 2-8 second range).
- Consider residential proxy for Leg 1 Reddit activity if IP gets flagged. Cheapest option: Webshare.io free tier (10 proxies).
- Account warmup: don't post immediately. Leg 1 should read/upvote for first 7 days before dropping links.
- Do NOT try to defeat platform security — the goal is to look human, not to bypass security systems.

---

### NODE 9: RLS Policy Role Scoping

**WHAT WE BUILT:**
RLS policies built during Sessions 14-17. Role scoping unknown without reading each policy.

**WHAT THE WORLD DOES:**
- Every RLS policy should have explicit `TO authenticated` or `TO anon` role scoping.
- Without it, the policy applies to ALL roles including `postgres` and `service_role`, which is usually wrong and creates confusing behavior.
- Policies without role scoping that use `auth.uid()` will evaluate `auth.uid()` for every role, including service_role calls where auth.uid() is NULL — this creates empty result sets for service_role queries unexpectedly.
- The `authenticated` role specification also causes Postgres to skip anon users entirely before evaluating the policy expression — significant performance win.

**VERDICT: NEEDS AUDIT**

**RISK: LOW** — Functionality likely works because service_role bypasses RLS entirely. But could cause unexpected behavior on certain admin operations.

**FIX ORDER: 9** — Low priority. Quick fix once identified.

**ACTION:**
- SQL: `SELECT tablename, policyname, roles FROM pg_policies WHERE schemaname = 'public' AND roles = '{}'::name[];`
- For each policy with empty roles array: add explicit TO role specification.

---

### NODE 10: Stripe Webhook — Raw Body Preservation

**WHAT WE BUILT:**
Supabase Edge Function receives webhook. Current code uses `req.json()` to parse body before verification. Unknown if raw body is preserved for HMAC check.

**WHAT THE WORLD DOES:**
- Stripe signature verification requires the RAW request body bytes, not the parsed JSON.
- If the body is parsed then re-stringified (even with `JSON.stringify(await req.json())`), whitespace differences can cause HMAC mismatch → signature verification fails → every webhook fails.
- Correct: `const rawBody = await req.text()` → pass to `stripe.webhooks.constructEvent(rawBody, signature, secret)`.
- This is a very common bug in Supabase Edge Function Stripe integrations.

**VERDICT: NEEDS VERIFICATION** — Combined with Node 2 (idempotency), this is the same file fix.

**RISK: HIGH** (if broken) — Will silently fail every webhook in production.

**FIX ORDER: Combined with Node 2** — Same file, same session.

**ACTION:**
- In `ai-moderator/index.ts` (Stripe webhook handler): verify body is read with `req.text()` not `req.json()`.
- Actually: check which Edge Function handles Stripe. It may be the colosseum-stripe-functions.js which is NOT yet deployed (LM-117). Confirm before acting.

---

## TIER 3 NODES (Note Only — Not Actionable Now)

---

### NODE 11: Vote Manipulation / Trust Score Weighting
**WHAT WE BUILT:** 1 vote per user, DB-enforced. Trust score column exists but not wired to vote weight.
**VERDICT: ACCEPTABLE FOR LAUNCH** — LM-006 explicitly says auto-debate votes are ungated by design. Live debate votes are 1-per-user which is sufficient. Trust score weighting is post-traction work.
**ACTION: None now.** Add to post-traction backlog.

---

### NODE 12: Alt Account / Fingerprinting
**WHAT WE BUILT:** Nothing. No device fingerprinting, no account linkage detection.
**VERDICT: MISSING — but acceptable**
**ACTION: None now.** Add Fingerprint.js (free tier) when ban evasion becomes a real problem.

---

### NODE 13: WAF / DDoS Protection
**WHAT WE BUILT:** Vercel handles some DDoS at edge. No explicit WAF. Cloudflare Pages for mirror has Cloudflare's WAF implicitly.
**VERDICT: GOOD ENOUGH FOR NOW** — Vercel + Cloudflare provide baseline protection. Custom WAF rules are a scale problem.
**ACTION: None now.** When real traffic arrives, add Cloudflare WAF rules to Vercel custom domain.

---

### NODE 14: Audit Trail Hardening
**WHAT WE BUILT:** `log_event()` wired to 18 RPCs. `event_log` table. Good start.
**VERDICT: GOOD for current phase** — B2B data quality hardening comes when B2B launch approaches.
**ACTION: None now.**

---

## EXECUTION ORDER (Clean Queue)

When a session is dedicated to this audit, execute in this order:

**Session A (Stripe + Sanitization):**
1. Fix Node 2 + Node 10 together: rewrite Stripe Edge Function with raw body, idempotency table, Deno.serve() pattern.
2. Audit Node 3: grep innerHTML in all JS files, assess DOMPurify need.

**Session B (Database):**
3. Run Supabase Performance Advisor + Security Advisor.
4. Fix Node 4: add indexes, wrap auth.uid() in SELECT, add TO authenticated.
5. Fix Node 9: scope all RLS policies to explicit roles.
6. Fix Node 7: audit SECURITY DEFINER functions, add auth checks or move to private schema.

**Session C (Rate Limiting):**
7. Fix Node 1 Phase 1: add FOR UPDATE to rate_limits checks (eliminate race condition).
8. Node 5: audit vercel.json CSP, fix if unsafe-inline present.

**Session D (Bot Army Hardening):**
9. Fix Node 8: add jitter to cron intervals, add human-like delays, warmup strategy.

**Session E (Auth Resilience):**
10. Fix Node 6: verify TOKEN_REFRESHED handling, add graceful 401 recovery.

---

## WHAT CHANGES THIS ORDER

- If bot army gets banned → Node 8 becomes Tier 1 immediately.
- If Stripe goes live before webhook fix → Node 2 becomes fire drill.
- If Supabase Performance Advisor shows slow queries → Node 4 moves up.
- If XSS attempt found in logs → Node 3 becomes immediate.
- Every session: re-read this file before starting. Update verdicts as fixes land. Add new LM entries for anything that burns us.

---

*This document is the battle plan. It is not a feature list. It is not a session agenda. It is a standing order: before shipping anything new, clear the Tier 1 queue. Before going live with real users, clear Tier 2. Tier 3 waits for scale.*
