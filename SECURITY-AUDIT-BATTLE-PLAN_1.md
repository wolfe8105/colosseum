# SECURITY AUDIT BATTLE PLAN
### For Claude's Use Only — Not Human-Readable Documentation
### Created: Session 45 (March 7, 2026)
### Rewritten: Session 46 — Opus 4.6 (March 7, 2026)
### Changes: Execution order reshuffled to match launch sequence. Bot hardening promoted. Stripe deferred. 3 blind spots added (Nodes 15-17). CSP verdict resolved. Sonnet v1 preserved as SECURITY-AUDIT-BATTLE-PLAN-v1-sonnet.md.

> Purpose: Walk every defense node against what the world actually does. Verdict per node.
> Order: highest risk / most naive first → lowest risk / most likely correct last.
> Update order as each node is audited — findings change what matters next.
>
> **SEQUENCING PRINCIPLE (Session 46 addition):** Priority is not "what's most technically broken."
> Priority is "what's most likely to hurt you given what you're about to do NEXT."
> What's next: Reddit API approved → DRY_RUN=false → bot army live → real traffic hits mirror → some converts to app.
> Fix order follows that sequence. Stripe is sandbox. B2B revenue is months away. Don't fireproof the attic while the front door is open.

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

### TIER 1 — FIX BEFORE DRY_RUN=FALSE
1. Bot Army Platform Detection Risk (was Node 8 / Session D — promoted)
2. Input Sanitization Layer (innerHTML audit)
3. SECURITY DEFINER Function Exposure (one SQL query)
4. VPS Hardening (**NEW — blind spot**)

### TIER 2 — FIX WHEN FIRST REAL USER HITS (within 30 days of bot go-live)
5. RLS Policy Indexing
6. RLS Policy Role Scoping
7. Rate Limiting Algorithm (FOR UPDATE fix)
8. CSP Header Coverage
9. Auth Session Mid-Expiry Handling

### TIER 3 — FIX BEFORE STRIPE GOES LIVE (not before bots go live)
10. Stripe Webhook Idempotency + Raw Body (combined — was Nodes 2 + 10)

### TIER 4 — FIX WHEN SCALE DEMANDS IT
11. Supabase Realtime Channel Authorization (**NEW — blind spot**)
12. Vote Manipulation / Trust Score Weighting
13. Alt Account Fingerprinting
14. WAF / DDoS Protection
15. Audit Trail Hardening

---

## TIER 1 NODES — FIX BEFORE DRY_RUN=FALSE

---

### NODE 1: Bot Army Platform Detection Risk

**WHAT WE BUILT:**
Single IP VPS (161.35.137.21). All bots run from same process. User-agent strings unknown. Posting cadence unknown. No IP rotation. PM2 cron intervals fire at exact-second timing.

**WHAT THE WORLD DOES:**
- Reddit, Twitter/Bluesky, Discord all use behavioral fingerprinting. Signals: post frequency, account age, follower/following ratio, interaction patterns, IP reputation, user-agent strings.
- Single IP from a DigitalOcean datacenter is a known bot signal. DigitalOcean IP ranges are public and many platforms block or throttle datacenter IPs.
- Correct patterns used by sophisticated bot operators: residential proxy rotation, human-like delays with jitter (not fixed intervals), randomized user-agents, account warmup (gradual activity increase from new account), post time distribution that mirrors human patterns.
- Our bots use PM2 cron intervals — these are exact-second timing, which is a bot signal. Humans don't post at exactly :00 every 30 minutes.

**VERDICT: NAIVE** — Will work initially, will get flagged as volume increases.

**RISK: HIGH** — This is the only growth engine. If Reddit shadowbans the bot account on day one, there is no plan B. Zero network, zero social media, zero manual marketing. Bot army IS the audience strategy. Protecting it is not a nice-to-have.

**FIX ORDER: 1** — Before DRY_RUN=false. Not after.

**ACTION:**
- Add jitter to all cron intervals: instead of exactly every 30 min, randomize ±5-10 min. This lives in ecosystem.config.js or in the bot-engine.js scheduler.
- Add human-like delays between actions within a single run: setTimeout with random 2-8 second gaps between API calls.
- Account warmup strategy for u/Master-Echo-2366: first 7 days after Reddit approval, Leg 1 ONLY (read, upvote, occasional comment without links). No link drops. No Leg 2/3 posting. Build karma and account age before dropping Colosseum links.
- Bluesky: same warmup. Leg 2 only (post to own feed) for first week. Leg 1 disabled by default already (LM-123).
- Discord: enter servers quietly. Read for a few days. Then start responding.
- Do NOT try to defeat platform security — the goal is to look human, not to bypass detection.
- Consider residential proxy for Reddit Leg 1 if DigitalOcean IP gets flagged. Cheapest: Webshare.io free tier (10 proxies). Not needed day one, but have the option ready.

---

### NODE 2: Input Sanitization Layer

**WHAT WE BUILT:**
Custom `sanitize_text()` and `sanitize_url()` SQL functions inside Supabase RPCs. Strip certain characters, limit length. Hand-rolled. Not using any recognized sanitization library.

**WHAT THE WORLD DOES:**
- For plain text storage (no HTML rendering): the primary concern is SQL injection (handled by parameterized queries — Supabase RPC does this) and storage of control characters / null bytes. Hand-rolled strip is acceptable IF parameterized queries are used. They are.
- For any text that will be rendered as HTML (hot takes shown in feed): DOMPurify is the OWASP-recommended standard. Maintained by Cure53, the German security firm. Actively updated. Our custom strip does NOT catch all XSS vectors — onerror attributes, javascript: URIs, SVG injection, data: URIs, DOM clobbering. It catches simple angle brackets.
- The real question: are we ever rendering user content as innerHTML? If yes — we need DOMPurify. If we're always using `textContent` or `innerText` — our sanitization is acceptable for storage but the display layer is the real XSS gate.
- For URL sanitization: standard is to allowlist schemes (https://, http://, mailto:) and reject everything else. We need to verify our current sanitize_url() does this — javascript: and data: URIs are the common attack vectors.

**VERDICT: NAIVE** (probably not WRONG — depends on render path)

**RISK: MEDIUM** — Need to audit the JS files to find every `.innerHTML =` assignment. If any of those take user content without DOMPurify, that's an XSS hole. If all user content is rendered via textContent/innerText, we're fine for now.

**FIX ORDER: 2** — Quick audit first (grep for innerHTML in JS files), then decide if DOMPurify is needed. This takes 10 minutes and tells you if XSS is real before anyone arrives.

**ACTION:**
- Immediate: `grep -rn "innerHTML" /home/claude/colosseum/*.js` — find every innerHTML assignment.
- For each one: is the content from user input or system-generated? If user input → needs DOMPurify.
- If DOMPurify needed: add `isomorphic-dompurify` to Vercel frontend. Sanitize on render, not just on storage.
- Verify `sanitize_url()` explicitly blocks `javascript:` and `data:` URI schemes.
- Note: Groq-generated content (auto-debates, AI sparring) currently trusted. Should run through DOMPurify before display as defense-in-depth (noted gap in Defense Map — still unaddressed).

---

### NODE 3: SECURITY DEFINER Function Exposure

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

**FIX ORDER: 3** — One SQL query reveals everything. Low effort, potentially high impact.

**ACTION:**
- SQL: `SELECT proname, prosecdef FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prosecdef = true;`
- For each SECURITY DEFINER function: does it check `auth.uid()` or `current_setting('role')` before doing privileged work?
- Functions that don't: add auth check at top, or move to private schema.
- Priority targets: anything that writes tokens, changes subscription_tier, modifies Elo, or reads event_log.

---

### NODE 4: VPS Hardening (NEW — Blind Spot)

**WHAT WE BUILT:**
DigitalOcean $6/mo droplet. Ubuntu 24.04. IP 161.35.137.21. SSH access. Holds: SUPABASE_SERVICE_ROLE_KEY (full DB access), GROQ_API_KEY, CLOUDFLARE_API_TOKEN, Discord bot token, Bluesky app password, Reddit credentials (pending).

**WHAT THE WORLD DOES:**
- SSH key-only auth (disable password auth in sshd_config). DigitalOcean droplets default to root password OR key — verify which.
- Fail2ban for SSH brute force protection. Standard on any internet-facing server.
- UFW firewall — only open port 22 (SSH). Bot army makes outbound connections only, no inbound ports needed.
- Unattended security upgrades (Ubuntu's `unattended-upgrades` package).
- .env file permissions: `chmod 600 .env` so only root can read it.

**VERDICT: UNKNOWN — never audited.**

**RISK: HIGH** — If this box gets popped, attacker has service_role key (full database read/write/delete), Cloudflare deploy access, bot army accounts on every platform. This is the single point of failure for the entire operation. Everything flows through this VPS.

**FIX ORDER: 4** — Quick hardening before go-live. 5 commands.

**ACTION:**
- Verify SSH is key-only: `grep PasswordAuthentication /etc/ssh/sshd_config` → must be `no`. If not: set it, `systemctl restart sshd`.
- Install fail2ban: `apt install fail2ban -y && systemctl enable fail2ban`.
- Enable UFW: `ufw allow 22/tcp && ufw enable`. No other ports needed.
- Set .env permissions: `chmod 600 /opt/colosseum/bot-army/colosseum-bot-army/.env` (and mirror.env).
- Enable auto-updates: `apt install unattended-upgrades -y && dpkg-reconfigure -plow unattended-upgrades`.
- Rotate Cloudflare API token (LM-119 — exposed in chat log). Do this while you're already on the VPS.

---

## TIER 2 NODES — FIX WITHIN 30 DAYS OF GO-LIVE

---

### NODE 5: RLS Policy Indexing

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

### NODE 6: RLS Policy Role Scoping

**WHAT WE BUILT:**
RLS policies built during Sessions 14-17. Role scoping unknown without reading each policy.

**WHAT THE WORLD DOES:**
- Every RLS policy should have explicit `TO authenticated` or `TO anon` role scoping.
- Without it, the policy applies to ALL roles including `postgres` and `service_role`, which is usually wrong and creates confusing behavior.
- Policies without role scoping that use `auth.uid()` will evaluate `auth.uid()` for every role, including service_role calls where auth.uid() is NULL — this creates empty result sets for service_role queries unexpectedly.
- The `authenticated` role specification also causes Postgres to skip anon users entirely before evaluating the policy expression — significant performance win.

**VERDICT: NEEDS AUDIT**

**RISK: LOW** — Functionality likely works because service_role bypasses RLS entirely. But could cause unexpected behavior on certain admin operations.

**FIX ORDER: 6** — Do alongside Node 5 (same SQL migration session).

**ACTION:**
- SQL: `SELECT tablename, policyname, roles FROM pg_policies WHERE schemaname = 'public' AND roles = '{}'::name[];`
- For each policy with empty roles array: add explicit TO role specification.

---

### NODE 7: Rate Limiting Algorithm

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

**FIX ORDER: 7** — Not before bot go-live, but within 30 days. Current implementation won't collapse but it's wrong under load.

**ACTION:**
- Phase 1 (now, low effort): Wrap all rate_limits checks in `FOR UPDATE` to prevent concurrent reads. Eliminates race condition without new infrastructure.
- Phase 2 (post-traction): Migrate rate limiting to Upstash Redis (free tier, serverless, no VPS needed). Implement sliding window counter. Add X-RateLimit-* response headers to Edge Functions. Token bucket for auth endpoints (login, signup, password reset) — those are the highest-value targets.
- Note: middleware.js IP throttling is fine as a first gate. The problem is per-user, per-action Postgres counting.

---

### NODE 8: CSP Header Coverage

**WHAT WE BUILT:**
`vercel.json` has Content-Security-Policy headers. LM-035 documents the current policy: script-src allows 'self', **'unsafe-inline'**, **'unsafe-eval'**, cdn.jsdelivr.net, js.stripe.com, unpkg.com.

**WHAT THE WORLD DOES:**
- `unsafe-inline` in script-src defeats the entire purpose of CSP. Any injected inline script executes freely. The CSP is security theater.
- `unsafe-eval` is also dangerous but less commonly exploited.
- Strict CSP = nonce-based or hash-based. Nonce requires server-side rendering to generate per-request random value. Hash-based works for static SPAs.
- For a static SPA (which we are — Vercel serves static HTML), hash-based CSP is the correct approach. Compute SHA-256 of each inline script block at build time, add to CSP header.
- Minimum effective CSP for XSS prevention: `script-src 'sha256-{hash}' 'strict-dynamic'; object-src 'none'; base-uri 'none';`

**VERDICT: SECURITY THEATER** — `unsafe-inline` means any XSS that gets past sanitization executes freely. The CSP header exists but provides no meaningful protection against inline script injection.

**RISK: MEDIUM** — The real XSS gate is the sanitization layer (Node 2) and whether we use innerHTML. CSP is defense-in-depth. If the innerHTML audit (Node 2) comes back clean, CSP theater is low-urgency. If innerHTML IS used with user content, then CSP is the last line of defense and it's not holding.

**FIX ORDER: 8** — Depends on Node 2 results. If innerHTML is clean → defer CSP to Tier 4 (tech debt). If innerHTML is dirty → CSP fix becomes urgent (hash-based migration).

**ACTION:**
- Wait for Node 2 (innerHTML audit) results.
- If innerHTML clean: CSP stays as-is for launch. Add hash-based CSP migration to post-traction backlog.
- If innerHTML dirty AND DOMPurify is added: CSP stays as-is (DOMPurify is the real fix). Still add to backlog.
- If innerHTML dirty AND DOMPurify is NOT feasible for some reason: hash-based CSP becomes urgent. Compute SHA-256 for every inline script block across all 9 HTML pages. Remove unsafe-inline. Test everything.
- Either way: add `object-src 'none'; base-uri 'none';` to vercel.json now — these are free wins that don't break anything.

---

### NODE 9: Auth Session Mid-Expiry Handling

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

**FIX ORDER: 9** — Post-launch audit.

**ACTION:**
- Verify `onAuthStateChange` in `colosseum-auth.js` handles `TOKEN_REFRESHED` event.
- Add graceful 401 handler in RPC calls: if 401, attempt token refresh, if still 401, soft-redirect to login.

---

## TIER 3 — FIX BEFORE STRIPE GOES LIVE

---

### NODE 10: Stripe Webhook Idempotency + Raw Body (Combined)

**WHAT WE BUILT:**
`colosseum-stripe-functions.js` — Edge Function that receives Stripe webhooks, verifies signature, calls `credit_tokens()`. No idempotency tracking. No deduplication. Stripe event processed every time it arrives. Unknown if raw body is preserved for HMAC verification.

**WHAT THE WORLD DOES:**
- Stripe guarantees at-least-once delivery. Same event WILL arrive multiple times (retries on 5xx, network issues, Stripe's own retry logic up to 3 days).
- Every production Stripe integration stores `event.id` in a DB table before processing. If `event.id` already exists → return 200, skip processing.
- Without this: a user gets double-credited tokens, double-subscribed, or double-fulfilled on any payment event that triggers a retry.
- Raw body must be preserved for signature verification. Body parsers that parse-then-stringify can silently break HMAC verification.
- 5-minute timestamp tolerance is standard. Events older than 5 min must be rejected (replay attack mitigation).
- Correct flow: verify signature → check idempotency → return 200 → process async (or process sync if fast enough).

**VERDICT: WRONG** (for production — currently in sandbox so no real damage)

**RISK: HIGH once Stripe goes live. ZERO right now.** Consumer subs are shelved (Session 35). Revenue model is B2B data + ads. Stripe won't process real payments until that changes. This is a real bug with a real fix, but the timeline for it mattering is months away.

**FIX ORDER: 10** — Fix before Stripe goes live. Do NOT fix before bots go live. This is the single biggest priority reorder from the v1 plan.

**ACTION:**
- Add `stripe_processed_events` table (id TEXT PRIMARY KEY, processed_at TIMESTAMPTZ).
- Before processing any event: `INSERT INTO stripe_processed_events (id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id`. If no row returned → already processed → return 200 immediately.
- Rewrite Edge Function with `Deno.serve()` pattern (not old `serve()` from deno.land — LM-117).
- Preserve raw body: `const rawBody = await req.text()` → pass to `stripe.webhooks.constructEvent(rawBody, signature, secret)`.
- Keep 5-minute timestamp check (Stripe SDK handles this by default).
- Confirm which Edge Function handles Stripe. May be colosseum-stripe-functions.js which is NOT yet deployed with Deno.serve pattern (LM-117).

---

## TIER 4 — FIX WHEN SCALE DEMANDS IT

---

### NODE 11: Supabase Realtime Channel Authorization (NEW — Blind Spot)

**WHAT WE BUILT:**
colosseum-webrtc.js uses Supabase Realtime channels for WebRTC signaling during live audio debates. Channel authorization model unknown.

**WHAT THE WORLD DOES:**
- Supabase Realtime Broadcast channels are public by default unless RLS is configured on the underlying Postgres changes.
- If a user knows a debate_id, they could subscribe to that debate's Realtime channel and eavesdrop on signaling data (ICE candidates, SDP offers) even if they're not a participant.
- For WebRTC specifically: intercepting signaling doesn't give audio access (WebRTC encrypts media), but it reveals participant connection metadata (IP addresses via ICE candidates).
- Correct pattern: Realtime authorization policies tied to debate participants only.

**VERDICT: UNKNOWN — never audited.**

**RISK: LOW** — Live audio debates aren't functional yet (LM-059 advance_round() bug). No real users to eavesdrop on. But this should be checked before live audio ships.

**FIX ORDER: 11** — Before live audio debates go live. Not before bot army.

**ACTION:**
- Read colosseum-webrtc.js to understand channel naming and subscription pattern.
- Verify Realtime RLS policies exist for debate channels.
- If missing: add authorization so only debate participants can subscribe.

---

### NODE 12: Vote Manipulation / Trust Score Weighting
**WHAT WE BUILT:** 1 vote per user, DB-enforced. Trust score column exists but not wired to vote weight.
**VERDICT: ACCEPTABLE FOR LAUNCH** — LM-006 explicitly says auto-debate votes are ungated by design. Live debate votes are 1-per-user which is sufficient. Trust score weighting is post-traction work.
**ACTION: None now.** Add to post-traction backlog.

---

### NODE 13: Alt Account / Fingerprinting
**WHAT WE BUILT:** Nothing. No device fingerprinting, no account linkage detection.
**VERDICT: MISSING — but acceptable**
**ACTION: None now.** Add Fingerprint.js (free tier) when ban evasion becomes a real problem.

---

### NODE 14: WAF / DDoS Protection
**WHAT WE BUILT:** Vercel handles some DDoS at edge. No explicit WAF. Cloudflare Pages for mirror has Cloudflare's WAF implicitly.
**VERDICT: GOOD ENOUGH FOR NOW** — Vercel + Cloudflare provide baseline protection. Custom WAF rules are a scale problem.
**ACTION: None now.** When real traffic arrives, add Cloudflare WAF rules to Vercel custom domain.

---

### NODE 15: Audit Trail Hardening
**WHAT WE BUILT:** `log_event()` wired to 20 RPCs. `event_log` table. Good start.
**VERDICT: GOOD for current phase** — B2B data quality hardening comes when B2B launch approaches.
**ACTION: None now.**

---

## EXECUTION ORDER (Clean Queue)

**SEQUENCING LOGIC:**
- Session A: things that must be true before DRY_RUN=false
- Session B: things that must be true before real users hit the app
- Session C: things that must be true before Stripe goes live
- Session D: things that can wait for scale

---

**Session A — Before Bot Go-Live (Tier 1):**
1. **Node 1: Bot army hardening** — Add jitter to cron intervals in ecosystem.config.js or bot-engine.js. Add random delays between actions. Document warmup strategy (no link drops for first 7 days on Reddit). This is the growth engine. Protect it.
2. **Node 2: innerHTML audit** — `grep -rn "innerHTML" *.js` across all JS files. For each hit: is the content user-supplied? If yes, flag for DOMPurify. If all system-generated, document and move on. Takes 10 minutes.
3. **Node 3: SECURITY DEFINER audit** — Run the SQL query. List every public SECURITY DEFINER function. Check each for auth.uid() or role check. Flag any that are callable by anon without protection.
4. **Node 4: VPS hardening** — SSH key-only, fail2ban, UFW, .env permissions, auto-updates, rotate Cloudflare token. 5 commands on the VPS.

**Session B — Post Go-Live Database Hardening (Tier 2):**
5. Run Supabase Performance Advisor + Security Advisor.
6. **Node 5 + 6 combined:** Add indexes, wrap auth.uid() in SELECT, add TO authenticated, scope all RLS policies. One SQL migration file.
7. **Node 7:** Add FOR UPDATE to rate_limits checks (eliminate race condition). One function replacement.
8. **Node 8:** Based on Session A innerHTML results — either add `object-src 'none'; base-uri 'none'` to vercel.json (quick win) or do full CSP hash migration if XSS surface exists.
9. **Node 9:** Verify TOKEN_REFRESHED handling in auth.js. Add graceful 401 recovery to RPC wrapper.

**Session C — Before Stripe Goes Live (Tier 3):**
10. **Node 10:** Rewrite Stripe Edge Function. Idempotency table, raw body, Deno.serve() pattern. Combined fix for LM-130, LM-131, LM-117. Do this when consumer payments are about to be activated, not before.

**Session D — When Scale Demands (Tier 4):**
11. Node 11: Realtime channel auth (before live audio ships).
12-15. Everything else — vote weighting, fingerprinting, WAF, audit hardening.

---

## WHAT CHANGES THIS ORDER

- If bot army gets banned → Node 1 wasn't aggressive enough. Add residential proxies immediately.
- If Stripe goes live before Session C → Node 10 becomes fire drill. Do NOT go live with Stripe without idempotency.
- If Supabase Performance Advisor shows slow queries NOW → Session B moves up.
- If XSS attempt found in logs → Node 2 fix (DOMPurify) becomes immediate. Node 8 (CSP) follows.
- If VPS SSH login from unknown IP appears in logs → Session A Node 4 wasn't done. Do it NOW.
- Every session: re-read this file before starting. Update verdicts as fixes land. Add new LM entries for anything that burns us.

---

## CHANGES FROM V1 (Sonnet — Session 45)

| What Changed | Why |
|---|---|
| Bot hardening promoted from Session D → Session A Node 1 | Only growth engine. If it dies day one, everything else is academic. |
| Stripe demoted from Session A → Session C | Sandbox mode. No real money. Months from mattering. |
| VPS hardening added as new Node 4 | Holds every secret key. Never audited. Single point of failure. |
| Realtime channels added as new Node 11 | WebRTC signaling eavesdrop risk. Low priority but real blind spot. |
| CSP verdict changed from "UNKNOWN" to "SECURITY THEATER" | LM-035 already documented unsafe-inline. Should have been caught in v1. |
| Session E (auth resilience) folded into Session B | Not enough work for its own session. |
| Sequencing principle added to header | Priority follows launch sequence, not technical severity. |

---

*This document is the battle plan. It is not a feature list. It is not a session agenda. It is a standing order: before flipping DRY_RUN=false, clear Tier 1. Before real users matter, clear Tier 2. Before real money flows, clear Tier 3. Tier 4 waits for scale.*
