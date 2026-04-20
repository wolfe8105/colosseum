# Code Review Fix — Batch 11: JavaScript API Routes

**Layer:** 2A (JS — requires Batch 01 JSON complete AND at minimum Batch 09 SQL
policy audit complete so the SQL layer underneath is trusted)
**Guide reference:** Colosseum-JS-Review-Checklist.docx, Sections 1, 2, 8, 12

---


## SETUP

Read the GitHub token from the repo README:
```bash
TOKEN=$(grep "GITHUB_TOKEN=" docs/technical/code-review/README.md | cut -d'=' -f2)
```

Then clone and configure:
```bash
git clone https://${TOKEN}@github.com/wolfe8105/colosseum.git
cd colosseum
git remote set-url origin https://${TOKEN}@github.com/wolfe8105/colosseum.git
```

---
## MANDATORY FILE READ VERIFICATION

Every file you read must follow this exact sequence. No exceptions.

  Step 1: run `wc -l <filename>` and note the total.
  Step 2: read the file.
  Step 3: confirm "Read [N] lines of [total] total."

If N ≠ total: stop, re-read. Do not proceed on a partial read.

---

## BEFORE STARTING

1. Read `docs/technical/AUDIT-FINDINGS.md`.
2. Read `CLAUDE.md` in full (verify line count first).
3. Confirm Batch 09 is committed or reported complete.
4. This batch touches:
   - `api/go-respond.js`
   - `api/challenge.js`
   - `api/profile.js`
   - `api/invite.js`

---

## FIX 1: go-respond.js — JWT structure-only verification (WATCH → upgrade)

**Read `api/go-respond.js` first (verify line count).**

**Current state at L87–99:** The code checks JWT structure (3 segments) and
decodes the payload with `Buffer.from(..., 'base64url')` but never verifies
the cryptographic signature. A crafted token with a valid structure but any
`sub` claim passes the 401 gate.

**The fix:**

Step 1 — Add `jsonwebtoken` as a dependency:
```bash
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

Step 2 — At the top of `api/go-respond.js`, add:
```javascript
import jwt from 'jsonwebtoken';
```

Step 3 — Replace the current JWT block (L81–104) with:
```javascript
// Require authenticated session
const authHeader = req.headers['authorization'] || '';
const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
if (!token) {
  return res.status(401).json({ error: 'Authentication required' });
}

let userId = 'unknown';
try {
  const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET, {
    algorithms: ['HS256'],
  });
  userId = payload.sub || 'unknown';
} catch (err) {
  return res.status(401).json({ error: 'Invalid or expired authentication token' });
}
```

**IMPORTANT:** This requires `SUPABASE_JWT_SECRET` in Vercel environment variables.
- The value is in Supabase dashboard: Project Settings → API → JWT Secret.
- Add it to Vercel: Project → Settings → Environment Variables.
- If you cannot confirm the env var is set, add a guard:
  ```javascript
  if (!process.env.SUPABASE_JWT_SECRET) {
    console.error('[go-respond] SUPABASE_JWT_SECRET not set — falling back to structure check');
    // keep original structure check as fallback
  }
  ```
  and report that the env var needs to be set before the full fix is live.

---

## FIX 2: challenge.js — remove hardcoded SUPABASE_URL fallback

**Read `api/challenge.js` first (verify line count).**

**Current state at L20:**
```javascript
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://faomczmipsccwbhpivmp.supabase.co';
```

**Replace with:**
```javascript
const SUPABASE_URL = process.env.SUPABASE_URL;
```

Then add an early exit guard in the handler function, immediately after the
existing `SUPABASE_ANON_KEY` check (around L22–28). Add:
```javascript
if (!SUPABASE_URL) {
  console.error('challenge.js: SUPABASE_URL env var not set');
  return res.status(500).send('Server configuration error');
}
```

---

## FIX 3: profile.js — same SUPABASE_URL fix

**Read `api/profile.js` first (verify line count).**

**Current state at L23:**
```javascript
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://faomczmipsccwbhpivmp.supabase.co';
```

**Replace with:**
```javascript
const SUPABASE_URL = process.env.SUPABASE_URL;
```

Add the same guard inside the handler function, before the first Supabase
call. At the start of the handler body, add:
```javascript
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('profile.js: SUPABASE_URL or SUPABASE_ANON_KEY env var not set');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(500).send(build404Html('error'));
}
```

---

## FIX 4: invite.js — guard module-level createClient

**Read `api/invite.js` first (verify line count).**

**Current state at L13–17:** `createClient` is called at module scope before
env vars are validated. If `SUPABASE_URL` is undefined, `createClient` receives
undefined and fails silently at first RPC call.

**Replace the module-level createClient:**
```javascript
// BEFORE (module scope, no guard):
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// AFTER — move inside handler and add guard:
```

Move the `createClient` call inside the `handler` function, after validating
the env vars:
```javascript
export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('invite.js: missing Supabase env vars');
    return res.redirect(302, `${APP_BASE}/moderator-plinko.html`);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const code = req.query.code;
  // ... rest of handler unchanged
```

---

## FIX 5: challenge.js + profile.js — add AbortController timeouts

After the SUPABASE_URL fixes, add 5-second AbortController timeouts to the
`fetch()` calls in both files. Model them on the pattern already in
`api/go-respond.js` (lines 150–151 and 218–219).

**For challenge.js** — wrap the Supabase fetch:
```javascript
const challengeAbort = new AbortController();
const challengeTimeout = setTimeout(() => challengeAbort.abort(), 5000);
try {
  const response = await fetch(apiUrl, {
    // existing headers...
    signal: challengeAbort.signal,
  });
  // existing logic...
} finally {
  clearTimeout(challengeTimeout);
}
```

**For profile.js** — same pattern on the Supabase fetch call.

---

## VERIFICATION

```bash
# No require() calls (ESM project):
grep -n 'require(' api/*.js
# Expected: no results

# No wildcard CORS:
grep -n 'origin.*\*' api/*.js
# Expected: no results

# No stack traces in error responses:
grep -n 'err\.stack' api/*.js
# Expected: no results

# No hardcoded URL fallbacks:
grep -n 'process\.env.*||.*supabase' api/*.js
# Expected: no results
```

---

## COMMIT

```bash
git add api/go-respond.js api/challenge.js api/profile.js api/invite.js
git commit -m "Batch 11: JWT verify in go-respond, remove SUPABASE_URL fallbacks, invite.js env guard, AbortController timeouts"
```

---

## WHEN DONE — report

- Whether SUPABASE_JWT_SECRET was confirmed set in Vercel env vars
- If the full jwt.verify() fix is live or the fallback guard was used
- Output of all four verification grep commands (all must be empty)
- Any fix that could not be completed and why

Stop. Do not start Batch 12.
