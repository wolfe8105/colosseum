# Stage 1 Outputs — api/invite.js

## Agent 01

### Primitive Inventory

**Imports / requires**
- `const { createClient } = require('@supabase/supabase-js')` (line 11) — destructured require, CJS

**Module-level bindings**
- `const SUPABASE_URL = process.env.SUPABASE_URL` (line 13) — string | undefined, env read
- `const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY` (line 14) — string | undefined, env read
- `const APP_BASE = 'https://themoderator.app'` (line 15) — string literal constant

**Exports**
- `module.exports = async function handler(req, res)` (line 17) — single default export, async function, Vercel serverless handler

**Function body primitives (handler, lines 17–42)**
- `req.query.code` (line 18) — query param read
- regex literal `/^[a-z0-9]{5}$/` (line 20) — 5-char alphanumeric validation
- `res.redirect(302, ...)` (line 21) — early return redirect to plinko (no ref code)
- `createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)` (line 26) — service-role client instantiation inside try
- `req.headers['x-forwarded-for']?.split(',')[0]?.trim()` (line 27) — optional chaining, IP extraction
- `req.socket?.remoteAddress` (line 28) — fallback IP
- `null` (line 29) — null coalesce fallback for ip
- `await supabase.rpc('record_invite_click', { p_ref_code: code, p_device_id: null, p_ip: ip })` (lines 31–35) — RPC call
- `catch {}` (line 36) — empty catch, swallows all errors
- `res.redirect(302, `${APP_BASE}/moderator-plinko.html?ref=${encodeURIComponent(code)}`)` (line 41) — final redirect with ref code

**Control flow**
- Early return at line 21 for missing/invalid code
- try/catch wrapping only the RPC block (lines 25–38)
- Unconditional final redirect at line 41 (reached after try/catch regardless of outcome)

---

## Agent 02

### Primitive Inventory

**File-level declarations**
- `require('@supabase/supabase-js')` (line 11) — CJS require
- `SUPABASE_URL` (line 13) — env var read, module-scoped const
- `SUPABASE_SERVICE_KEY` (line 14) — env var read, module-scoped const
- `APP_BASE` (line 15) — hardcoded base URL string

**Exported function**
- `module.exports = async function handler(req, res)` (line 17) — Vercel handler, async, two params

**handler body**
- `code = req.query.code` (line 18) — local variable from query
- `/^[a-z0-9]{5}$/` test (line 20) — validates code is exactly 5 lowercase alphanumeric chars
- Early redirect to plinko (no ref) on invalid code (line 21)
- `supabase` created inside try with service role (line 26)
- IP resolved from `x-forwarded-for` header first, then `req.socket.remoteAddress`, then `null` (lines 27–29)
- `supabase.rpc('record_invite_click', ...)` — p_ref_code, p_device_id (null), p_ip (lines 31–35)
- Empty catch block (line 36) — failure is explicitly non-blocking per comment
- Final unconditional redirect to plinko with `?ref=<encodeURIComponent(code)>` (line 41)

**Notable**: `p_device_id` is hardcoded `null` — comment explains it is set client-side by plinko.ts after redirect.

---

## Agent 03

### Primitive Inventory

**Module header**
- Comment block (lines 1–9): describes F-59 Invite Rewards, route `/i/:code → /api/invite?code=:code`

**Top-level bindings**
- `createClient` from `@supabase/supabase-js` (line 11)
- `SUPABASE_URL = process.env.SUPABASE_URL` (line 13)
- `SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY` (line 14)
- `APP_BASE = 'https://themoderator.app'` (line 15)

**Single exported function** — `handler` (line 17)
- Reads `req.query.code` (line 18)
- Validates with `/^[a-z0-9]{5}$/` — if falsy or no match: 302 redirect to plinko (no code) (lines 20–22)
- Inside try: instantiates supabase with service role, extracts IP with optional chaining and null-coalesce fallback, calls `record_invite_click` RPC with p_ref_code, p_device_id=null, p_ip
- Catch is empty — non-blocking failure per inline comment
- After try/catch: unconditional 302 redirect to plinko with `?ref=<code>` appended

**No other named functions.** No imports beyond supabase-js. No state mutations at module scope (env reads are one-time, APP_BASE is literal).

---

## Agent 04

### Primitive Inventory

**Requires**
- `@supabase/supabase-js` → `createClient` (line 11)

**Constants**
- `SUPABASE_URL`: `process.env.SUPABASE_URL` (line 13)
- `SUPABASE_SERVICE_KEY`: `process.env.SUPABASE_SERVICE_ROLE_KEY` (line 14)
- `APP_BASE`: `'https://themoderator.app'` (line 15)

**Exported handler** (line 17, async)
1. Extract `code` from `req.query` (line 18)
2. Guard: if `!code` or regex fail → `res.redirect(302, plinko-no-ref)` return (lines 20–22)
3. try block:
   - Create service-role supabase client (line 26)
   - Resolve IP: `x-forwarded-for` header (first comma-segment, trimmed) or `req.socket.remoteAddress` or `null` (lines 27–29)
   - `await supabase.rpc('record_invite_click', { p_ref_code: code, p_device_id: null, p_ip: ip })` (lines 31–35)
4. catch: empty, swallowed (line 36)
5. Unconditional: `res.redirect(302, plinko + ?ref=<encoded code>)` (line 41)

**No module-level state aside from the four const declarations. No side effects at require time.**

---

## Agent 05

### Primitive Inventory

**CJS require** (line 11): `createClient` from `@supabase/supabase-js`

**Module-level consts** (lines 13–15):
- `SUPABASE_URL` — env
- `SUPABASE_SERVICE_KEY` — env (service role key — elevated privilege)
- `APP_BASE` — literal `'https://themoderator.app'`

**Single export** (line 17): `module.exports = async function handler(req, res)`

**handler internals**:
- `code`: from `req.query.code` — untrusted input
- Validation: `/^[a-z0-9]{5}$/` — accepts only 5 chars, lowercase letters or digits
- Invalid/missing: 302 to plinko bare (no ref)
- try: creates supabase client with service-role key; resolves IP via `x-forwarded-for` (split on comma, trim first segment) with fallback chain to `req.socket.remoteAddress` then `null`; calls `record_invite_click` RPC; p_device_id hardcoded null (comment: set by plinko.ts client-side)
- catch: empty — non-blocking, click recording failure tolerated
- Unconditional final redirect: 302 to `${APP_BASE}/moderator-plinko.html?ref=${encodeURIComponent(code)}`

**Security note**: `code` is validated by regex before being used in any RPC or URL construction. Service-role key is never sent to the client.

## Cross-Agent Consensus

All 5 agents agree on:
- File has exactly one exported function: `handler` (line 17)
- 4 module-level consts (createClient import + 3 consts)
- handler flow: validate → try(RPC) → redirect
- p_device_id is hardcoded null in the RPC call
- catch is empty/non-blocking
- Final redirect is unconditional
