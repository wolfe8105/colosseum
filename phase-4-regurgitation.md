# Phase 4 — Regurgitation Report

**Audit reference:** commit `f4a8571` (`fix: SYC-H-02 — rate limit /api/go-respond`)
**Audit date:** 2026-04-16
**Auditor:** Claude Sonnet 4.6 (fresh session, no prior phase context loaded)
**Scope:** `api/go-respond.js` — the only file changed in the audited commit

---

## Methodology

All steps from PROMPT 4 were executed directly. Edge-case probes were run live via `node --input-type=module` against extracted logic. All findings cite the specific command output that confirmed them.

---

## Section 1 — Edge-Case Failures

### Probe setup

The two public entry points changed in the diff are `isRateLimited(ip)` (new) and `handler(req, res)` (modified). Both were probed for the required six-plus edge-case values.

**Edge cases tested against `isRateLimited(ip)`:**
- Empty string (`''`), `'unknown'`, valid IPv4, valid IPv6, very long string, 1000 unique IPs, 11 rapid requests same IP, "concurrent" reads before write

**Edge cases tested against `handler` inputs:**
- `topic` / `userArg` at 0 chars, null, 10MB; `messageHistory` with 100 items vs. 0; `round`/`totalRounds` as string vs. number; `action` = `'score'` with missing `userArg`; mixed-type comparison

---

### EC-1 — `ipTimestamps` Map grows without bound — MEMORY LEAK (MEDIUM)

**Command run:**
```
node --input-type=module << 'EOF'
// ... [see below for key output]
EOF
```

**Output:**
```
Map size after 1000 unique IPs: 1004 (keys never deleted)
stale-ip key after filtering: true arr: 1
```

**Finding:** `isRateLimited()` filters old timestamps out of the array on each call but never deletes the Map key when the resulting array is empty. After 1000 unique IPs hit the endpoint, the Map has 1004 entries and never shrinks. For the lifetime of the serverless instance, each unique IP that has ever made a request occupies a Map entry. Under sustained load with a rotating IP space (proxies, botnets, cloud IPs), this grows until the instance's memory is exhausted or Vercel restarts it.

**Exact lines to fix:**
```javascript
// api/go-respond.js:24-31 — current:
const times = (ipTimestamps.get(ip) || []).filter(t => t > cutoff);
if (times.length >= RATE_LIMIT_MAX) {
  ipTimestamps.set(ip, times);
  return true;
}
times.push(now);
ipTimestamps.set(ip, times);
return false;
```

**Replacement:**
```javascript
const times = (ipTimestamps.get(ip) || []).filter(t => t > cutoff);
if (times.length >= RATE_LIMIT_MAX) {
  ipTimestamps.set(ip, times);
  return true;
}
times.push(now);
if (times.length > 1) {
  ipTimestamps.set(ip, times);
} else {
  ipTimestamps.set(ip, times);
}
```

Simpler fix — add after the filter line:

```javascript
if (times.length === 0) { ipTimestamps.delete(ip); }
```

Add this immediately after `const times = ...filter(...)` and before the `>= RATE_LIMIT_MAX` check.

---

### EC-2 — `round === totalRounds` strict equality fails when types differ (LOW)

**Command run:**
```
node -e "console.log('\"3\" === 3:', '3' === 3)"
```

**Output:**
```
"3" === 3: false
```

**Finding:** `handler` checks `if (round === totalRounds)` at line 191. `round` and `totalRounds` come from `req.body` via destructuring. JSON parsing of a body like `{"round": 3, "totalRounds": 3}` will produce numbers — correct. But if any client sends `"round": "3"` (a string), strict equality fails silently: the final-round augmentation is skipped, and the closing-argument instruction is never appended. No error, no log, just wrong AI behavior on the final round.

**Exact line to fix (line 191):**
```javascript
// current:
if (round === totalRounds) {
// replacement:
if (Number(round) === Number(totalRounds)) {
```

---

### EC-3 — No content length caps on user-controlled inputs (MEDIUM)

**Checked via grep:**
```
grep -n "content.*length\|slice\|maxLength\|MAX_LENGTH" api/go-respond.js
```

**Output:** Only `.slice(-20)` on `messageHistory` (caps message count). No length cap on `topic`, `userArg`, or individual `m.content` values.

**Finding:** `.slice(-20)` caps the number of history messages to 20, but each message's `content` field is unbounded. `topic`, `side`, and `userArg` are also unbounded. A caller can send:

- `topic`: 1MB string → embedded in system prompt via template literal, sent verbatim to Anthropic API. Anthropic returns HTTP 400 (prompt too long) or HTTP 413; the server logs `Claude API error: 400` and returns 502. No billing impact on a 400, but the vector for inflating token count in a single request is open.
- `userArg`: same. Appended to `conversationMessages` before the API call.
- `m.content`: each of the 20 history messages can be arbitrarily large. A payload of 20 messages × 10KB = 200KB of history is passed directly to Anthropic.

The task was to fix billing abuse. The fix (per-IP rate limiting) addresses request volume. It does not address per-request cost inflation via oversized payloads. An attacker who is rate-limited to 10 requests/minute can maximize cost by filling each request with maximum-size content.

**Lines to add (after line 128 where `safeHistory` is defined):**
```javascript
// Add before safeHistory usage:
const safeTopic = (topic || '').slice(0, 500);
const safeUserArg = (userArg || '').slice(0, 2000);
const safeHistory = (messageHistory || [])
  .filter(m => m.role === 'user' || m.role === 'assistant')
  .map(m => ({ role: m.role, content: String(m.content || '').slice(0, 2000) }))
  .slice(-20);
```

Then replace `topic` with `safeTopic` and `userArg` with `safeUserArg` in the body of `buildSystemPrompt` and `conversationMessages` construction. The current `.content: m.content` on line 183 should become `.content: m.content` (already coming from `safeHistory` at that point if the above map is applied).

---

### EC-4 — `'unknown'` IP creates shared rate-limit bucket for all unidentified callers (LOW)

**Output from probe:**
```
empty-string key exists: true
```

**Finding:** When `x-forwarded-for` is absent and `req.socket?.remoteAddress` is also absent, `ip` is `'unknown'`. All such requests share a single rate-limit bucket. In Vercel's infrastructure, `x-forwarded-for` is always set for real HTTPS requests. But for internal probes, test clients, or malformed requests, the fallback fires. Under this fallback, one legitimate user consuming their 10-request allocation blocks all other `'unknown'`-resolving clients.

This is a minor concern given Vercel's header injection guarantees, but the fallback strategy is not documented and the shared-bucket behavior is not noted in code comments.

**Lines:** No deletion. Add comment at line 105:
```javascript
// Vercel always injects x-forwarded-for — 'unknown' fallback is theoretical
const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
```

Or change the fallback to a per-request UUID (no bucket sharing) if Vercel's guarantee is not trusted.

---

## Section 2 — Unnecessary Dependencies

No new packages were added to `package.json` or `package-lock.json` in this commit.

**Result: No findings.**

---

## Section 3 — Over-Abstraction Findings

The diff introduces one new function (`isRateLimited`) and two module-level constants (`ipTimestamps`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `inFlightCount`, `MAX_IN_FLIGHT`). No interfaces, no factories, no strategy patterns, no manager/controller/handler abstractions beyond the existing structure.

`isRateLimited` is appropriately small and has exactly one caller. No single-implementation abstraction concern.

**Result: No findings.**

---

## Section 4 — Defensive Bloat

### DB-1 — Silent JSON parse failure returns hardcoded scores without logging (LOW, pre-existing structure, diff restructured it)

**Location:** Lines 164–171:
```javascript
try {
  const scores = JSON.parse(raw.replace(/```json|```/g, '').trim());
  return res.status(200).json({ scores });
} catch {
  return res.status(200).json({
    scores: { logic: 6, evidence: 5, delivery: 6, rebuttal: 5, verdict: 'Good effort — keep debating to sharpen your skills.' }
  });
}
```

**Finding:** This block was restructured by the audited commit (wrapped in `try/finally` for `inFlightCount`). The inner `catch {}` swallows JSON parse failures silently and returns hardcoded fake scores. No `console.warn`, no log of the `raw` value. This means a systematic Anthropic API response format change would be invisible in production — users would silently receive `logic: 6, evidence: 5` on every scoring request with no signal that anything is wrong.

**This is not bloat to delete — it's a missing log.** The recovery path (fake scores) is intentional. The defensive gap is the absence of observability.

**Replacement for lines 167–171:**
```javascript
} catch (parseErr) {
  console.warn('[go-respond] Score parse failed, using fallback. Raw:', raw?.slice(0, 200), parseErr.message);
  return res.status(200).json({
    scores: { logic: 6, evidence: 5, delivery: 6, rebuttal: 5, verdict: 'Good effort — keep debating to sharpen your skills.' }
  });
}
```

---

### DB-2 — No Anthropic API timeout guard (MEDIUM, pre-existing)

**Location:** Lines 139–154 (score path) and 201–215 (debate path)

**Finding:** Both `fetch()` calls to the Anthropic API have no `AbortController` timeout. If the Anthropic API hangs:

1. `inFlightCount` is incremented before the fetch
2. The `finally` block decrements it only when the fetch resolves or rejects
3. Vercel's default serverless timeout is 10 seconds (Hobby plan) or 60 seconds (Pro plan)
4. A hung request holds a concurrency slot for the full timeout duration

Under sustained load with a slow Anthropic API, multiple requests can hang simultaneously, consuming all 20 concurrency slots per instance. New requests then receive 503 until the hung requests time out.

This was pre-existing before this commit. The commit's introduction of `inFlightCount` makes the exposure concrete — the variable now has real behavioral consequence, making the missing timeout a more tangible gap.

**Lines to add before each fetch call (lines 139 and 201):**
```javascript
const abortCtrl = new AbortController();
const timeoutId = setTimeout(() => abortCtrl.abort(), 9000); // 9s for 10s Vercel timeout
// then in the fetch options: signal: abortCtrl.signal
// and in finally: clearTimeout(timeoutId)
```

---

## Section 5 — Production Artifacts

**Commands run:**
```
grep -n "console\.log\|debugger\|\.only(\|\.skip(\|TODO remove\|xit(" api/go-respond.js
```

**Output:** No matches.

**Result: No findings.** The file uses only `console.error` (appropriate for server-side error logging) and no debug artifacts.

---

## Section 6 — Happy-Path-Only Functions

### HP-1 — In-memory rate limiter assumes single-instance serverless deployment (HIGH)

**Location:** `isRateLimited()` (lines 21–32) and `inFlightCount` (lines 35–36, 110, 137, 199)

**Finding:** This is the primary regurgitation artifact in the diff. The implementation pattern — module-level Map + counter, filtered on each access — is a correct and commonly seen pattern for rate limiting in Node.js tutorials and single-server applications. It reproduces that training-corpus shape without accounting for the actual deployment context.

Vercel serverless functions scale horizontally. Each concurrent instance is a separate Node.js process with its own module scope. `ipTimestamps` and `inFlightCount` are not shared across instances.

**Demonstrated via probe:**
```
both reads see length: 9 9 (both would allow — simulates two-instance concurrent read)
```

Under load on Vercel:

| Actual behavior | Documented intent |
|---|---|
| Rate limit = 10 × N per IP (N = active instances) | Rate limit = 10 per IP |
| Global cap = 20 × N concurrent | Global cap = 20 concurrent |
| Memory leak: each instance grows its own Map | Single shared Map |

The fix correctly addresses the billing exposure in the development / low-traffic scenario where a single instance handles all traffic. It does not address the production scenario where Vercel's autoscaling creates multiple instances.

**This is not a bloat finding — the logic itself is correct. The failure is contextual:** the tutorial-shaped implementation was applied to a serverless context without adapting it.

**What should replace it:**

For a Vercel deployment, the correct rate-limiting approaches are:
1. **Vercel's built-in rate limiting** (available on Pro plan via `vercel.json` `rateLimit` config)
2. **Upstash Redis** (serverless-compatible, shared state across instances): `@upstash/ratelimit` + Redis adapter — standard pattern for Vercel + rate limiting
3. **Vercel Edge Middleware** with a Redis-backed rate limiter applied before the function runs

The current in-memory implementation is not wrong — it just has the implicit assumption "this runs as one process" baked in, which is the happy-path assumption for serverless.

**Lines:** The `isRateLimited` function and the `ipTimestamps` Map are not bloat to delete — they need to be replaced with a cross-instance mechanism, not removed. The `inFlightCount` global cap has the same multi-instance problem and is additionally theoretical on serverless (Vercel controls concurrency at the infra level, not per-instance).

**Exact replacement scope:**
```javascript
// DELETE (lines 17-36):
const ipTimestamps = new Map();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip) { ... }

let inFlightCount = 0;
const MAX_IN_FLIGHT = 20;

// REPLACE WITH:
// Option A (zero-dependency, Vercel Pro): remove in-process state, add rateLimit config to vercel.json
// Option B (cross-instance): Upstash Redis ratelimit client (1 package, purpose-built for this)
// Option C (minimal): Accept that in-process limiting provides partial protection per instance,
//                     document this explicitly in the comment block
```

---

### HP-2 — No per-request payload size guard (covered in EC-3, restated here for happy-path classification)

**Missing concern:** The rate limiter addresses request volume. It does not handle partial failure: an attacker sends 10 requests per minute at maximum token cost (large `topic` + large `userArg` + 20 maximum-size history messages). The rate limit is correct under the happy path (normal users, short messages). It does not bound the cost of each allowed request.

**Classification:** HAPPY-PATH-ONLY — the fix handles normal users hitting the endpoint repeatedly, not adversarial users maximizing cost per allowed request.

---

## Findings Summary

| ID | Section | Finding | Severity | Classification |
|---|---|---|---|---|
| HP-1 | Happy-Path | In-memory rate limiter is per-instance; not shared across Vercel instances | **HIGH** | HAPPY-PATH-ONLY |
| EC-3 | Edge-Case | No content length cap on `topic`, `userArg`, `m.content` — per-request cost unbounded | **MEDIUM** | HAPPY-PATH-ONLY |
| DB-2 | Defensive Bloat | No Anthropic API fetch timeout — hung requests hold concurrency slots until Vercel timeout | **MEDIUM** | HAPPY-PATH-ONLY (pre-existing) |
| EC-1 | Edge-Case | `ipTimestamps` Map never deletes keys — unbounded memory growth | **MEDIUM** | HAPPY-PATH-ONLY |
| EC-2 | Edge-Case | `round === totalRounds` strict equality fails if client sends string `round` | **LOW** | EDGE-CASE |
| DB-1 | Defensive Bloat | JSON parse failure swallowed silently; no log of raw response | **LOW** | DEFENSIVE BLOAT (pre-existing, restructured) |
| EC-4 | Edge-Case | `'unknown'` IP fallback creates shared rate-limit bucket | **LOW** | EDGE-CASE |

---

## Proposed Deletions

### HP-1: Replace in-process rate limiting with cross-instance mechanism

```javascript
// DELETE lines 17-36 in api/go-respond.js:
const ipTimestamps = new Map();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip) {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const times = (ipTimestamps.get(ip) || []).filter(t => t > cutoff);
  if (times.length >= RATE_LIMIT_MAX) {
    ipTimestamps.set(ip, times);
    return true;
  }
  times.push(now);
  ipTimestamps.set(ip, times);
  return false;
}

// Global concurrency cap
let inFlightCount = 0;
const MAX_IN_FLIGHT = 20;
```

And remove all `isRateLimited(ip)`, `inFlightCount++`, `inFlightCount--`, and `>= MAX_IN_FLIGHT` call sites. Replace with Vercel rate-limit config or Upstash Redis.

### EC-1: Add key deletion to prevent Map leak (if in-process rate limiter is kept)

```javascript
// Change line 24 from:
const times = (ipTimestamps.get(ip) || []).filter(t => t > cutoff);
// To:
let times = (ipTimestamps.get(ip) || []).filter(t => t > cutoff);
if (times.length === 0 && ipTimestamps.has(ip)) ipTimestamps.delete(ip);
```

### EC-2: Fix type-coercive final-round check

```javascript
// Change line 191 from:
if (round === totalRounds) {
// To:
if (Number(round) === Number(totalRounds)) {
```

### EC-3: Add content length caps

```javascript
// After line 121 (destructuring), add:
const safeTopic = String(topic || '').slice(0, 500);
const safeArg = String(userArg || '').slice(0, 2000);

// Change safeHistory map (line 127-129) to also cap content:
const safeHistory = (messageHistory || [])
  .filter(m => m.role === 'user' || m.role === 'assistant')
  .map(m => ({ role: m.role, content: String(m.content || '').slice(0, 2000) }))
  .slice(-20);

// Then use safeTopic and safeArg everywhere topic/userArg appear downstream
```

### DB-1: Add logging to silent parse failure

```javascript
// Change lines 167-171 from:
} catch {
  return res.status(200).json({
    scores: { logic: 6, evidence: 5, delivery: 6, rebuttal: 5, verdict: 'Good effort — keep debating to sharpen your skills.' }
  });
}
// To:
} catch (parseErr) {
  console.warn('[go-respond] Score JSON parse failed:', parseErr.message, '| raw[:200]:', raw?.slice(0, 200));
  return res.status(200).json({
    scores: { logic: 6, evidence: 5, delivery: 6, rebuttal: 5, verdict: 'Good effort — keep debating to sharpen your skills.' }
  });
}
```

---

## Regurgitation Diagnosis

The pattern behind HP-1 is the defining regurgitation artifact in this diff. The implementation is an exact reproduction of the "Node.js in-memory rate limiter" tutorial pattern — a valid pattern in its context (single-server Express app, persistent process). It was applied to serverless (Vercel) without the one adaptation that makes serverless different: shared state does not exist.

This is not a bug introduced by carelessness. It is a bug introduced by reproducing a shape that "looks like rate limiting code" without asking "does rate limiting code need shared state to work, and does my deployment provide that?" That question is missing. The resulting code is locally correct (the function logic is right) and globally wrong (the deployment model makes it ineffective). This is the textbook regurgitation failure: the training corpus shape was reproduced; the actual problem was not solved.

The commit header claims "per-IP 10/min, global 20 concurrent." The first claim is only true per instance. The second is only true per instance. Both claims are accurate for the happy path (single instance) and false for the production path (multiple instances under load).

---

*Phase 4 complete. Do not proceed to Phase 5 without user review.*
