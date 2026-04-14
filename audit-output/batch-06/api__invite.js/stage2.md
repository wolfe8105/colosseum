# Stage 2 Outputs — api/invite.js

## Agent 01

### handler (line 17)

**Parameters**
- `req` — Vercel/Node IncomingMessage. Fields read: `req.query.code`, `req.headers['x-forwarded-for']`, `req.socket?.remoteAddress`
- `res` — Vercel/Node ServerResponse. Only `res.redirect()` is ever called.

**Local variables**
- `code` — `string | undefined` from `req.query.code`; validated against `/^[a-z0-9]{5}$/`
- `supabase` — Supabase service-role client; instantiated inside try, scoped there
- `ip` — `string | null`; resolved from header chain → socket fallback → null

**External reads**
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` — read at module load time; if undefined, `createClient` gets `undefined` args, RPC call will throw (silently caught)
- `req.headers['x-forwarded-for']` — untrusted, may be spoofed
- `req.socket?.remoteAddress` — trusted fallback

**Guard branch (lines 20–22)**: if `!code || !/^[a-z0-9]{5}$/.test(code)` → 302 to plinko (no ref), return. No RPC, no client creation.

**IP resolution**: `x-forwarded-for` first segment (split/trim) ?? `req.socket?.remoteAddress` ?? `null`

**Async operation**: `await supabase.rpc('record_invite_click', { p_ref_code: code, p_device_id: null, p_ip: ip })`  
- `p_device_id` is hardcoded `null`; comment notes it is set client-side by plinko.ts after redirect
- Catch block is empty — non-blocking per comment; all errors silently swallowed

**Responses**:
- Invalid/missing code → 302 to `https://themoderator.app/moderator-plinko.html` (bare)
- Valid code (RPC succeeded or failed) → 302 to `https://themoderator.app/moderator-plinko.html?ref=<encodeURIComponent(code)>`

**Observations**:
1. `encodeURIComponent(code)` is redundant — regex constrains `code` to URL-safe chars
2. Silent RPC failure — no logging in catch
3. IP spoofable via `x-forwarded-for` header
4. No HTTP method guard

---

## Agent 02

### handler (line 17)

**Parameters**: `req`, `res` — same as Agent 01 description.

**Local variables**: `code`, `supabase`, `ip` — same resolution as Agent 01.

**Branches**:
1. Invalid/missing code → 302 bare plinko, return
2. Valid code, happy path → RPC fires, falls through to final redirect
3. RPC throws → catch swallows, still falls through to final redirect

**Async operations**: `await supabase.rpc(...)` inside try/catch.

**Notable observation — misleading "non-blocking" comment**: The comment says "non-blocking" but the `await` means execution pauses for the full Supabase round-trip before the redirect fires. A truly non-blocking implementation would omit `await`.

**Side effects**: `record_invite_click` DB write via service-role key (bypasses RLS). No cookies, no session, no response body.

**Responses**: Same two-path model as Agent 01.

**Additional observations**:
1. No `return` on final `res.redirect()` — inconsistent with the guard's `return res.redirect()`, but harmless
2. `createClient` created on every invocation — no singleton; acceptable for serverless
3. `p_device_id: null` hardcoded — incomplete if deduplication relies on it
4. Silent catch with no `console.error` — RPC failures invisible in Vercel logs

---

## Agent 03

### handler (line 17)

**Parameters / local variables / reads**: Agree with Agents 01–02.

**Branches**:
- Branch 1 (invalid code): 302 bare plinko, return
- Branch 2 (valid, RPC succeeds): falls through to final redirect
- Branch 3 (valid, RPC throws): catch swallows, falls through to final redirect

**Async**: single `await supabase.rpc(...)`.

**Observations**:
1. `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` read at module load — if undefined, fail silently per-request inside try/catch
2. `createClient` per request vs. module-level singleton — acceptable for low-traffic endpoint
3. `p_device_id: null` — reserved for future use per inline comment
4. IP spoofing via `x-forwarded-for` — first value trusted; advisory-only concern
5. Code validation strict `[a-z0-9]{5}` — any format change requires regex update here

---

## Agent 04

### handler (line 17)

**Parameters / local variables / reads**: Agree with prior agents.

**Execution flow**:
1. Validate `code` → early return if invalid
2. Resolve IP from `x-forwarded-for` (first segment, trimmed) or socket or null
3. `await supabase.rpc('record_invite_click', ...)` inside try/catch
4. Unconditional final redirect with `?ref=<code>`

**Branches / responses**: Same two-path model.

**Observations**:
1. No env-var guard at startup — missing env vars fail silently at runtime
2. `p_device_id` always `null`
3. IP spoofable
4. Code regex strict — future format change needs update
5. `encodeURIComponent` is redundant given the regex constraint

---

## Agent 05

### handler (line 17)

**Parameters / local variables / reads**: Agree with prior agents.

**Execution flow**: Same as Agent 04 description.

**Security findings (most thorough)**:

1. **`x-forwarded-for` IP spoofing — Vercel-specific concern**: On Vercel, the platform prepends the real IP to the RIGHT of the chain. Taking `[0]` (leftmost) makes the recorded IP fully attacker-controlled. Correct approach: take the last element of the split array, or use `req.headers['x-vercel-forwarded-for']` (set by Vercel, not spoofable). Agent 05 is the only agent to identify the Vercel-specific nature of this.

2. **No rate-limiting at handler level** — any party can flood `record_invite_click` with valid codes. Relies entirely on DB-layer defenses inside the RPC.

3. **Service-role key** — appropriate (no user session available), but correct only if the key is never exposed client-side. Correct here.

4. **Silent error swallowing** — empty `catch {}`, no `console.error`.

5. **No HTTP method guard** — responds to GET, POST, PUT, DELETE identically.

6. **`encodeURIComponent` redundant** — regex guarantees no chars needing encoding.

7. **No env-var null-guard at startup** — missing env vars fail silently at runtime rather than loudly at deploy.

---

## Cross-Agent Consensus Summary

| Behavior | A01 | A02 | A03 | A04 | A05 |
|---|---|---|---|---|---|
| Guard branch: invalid code → bare plinko redirect | ✓ | ✓ | ✓ | ✓ | ✓ |
| try/catch wraps RPC only | ✓ | ✓ | ✓ | ✓ | ✓ |
| IP from x-forwarded-for first segment | ✓ | ✓ | ✓ | ✓ | ✓ |
| p_device_id hardcoded null | ✓ | ✓ | ✓ | ✓ | ✓ |
| catch is empty / silent | ✓ | ✓ | ✓ | ✓ | ✓ |
| Final redirect unconditional | ✓ | ✓ | ✓ | ✓ | ✓ |
| await delays redirect despite "non-blocking" comment | — | ✓ | — | — | — |
| Vercel-specific IP spoofing (rightmost is authoritative) | — | — | — | — | ✓ |
| No HTTP method guard | ✓ | — | — | — | ✓ |

**Unique to Agent 02**: Identifies the contradiction between the "non-blocking" comment and the use of `await` — the RPC does block the redirect.

**Unique to Agent 05**: Identifies Vercel-platform-specific detail that `x-forwarded-for[0]` is attacker-controlled on Vercel because the platform appends the real IP to the right of the chain.
