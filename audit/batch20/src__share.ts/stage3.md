# Stage 3 — Verification Report: share.ts

Source: src/share.ts (204 lines)
Anchors verified: 8
Agents: 5 (independent, parallel)
Verdict: **40/40 PASS · 0 PARTIAL · 0 FAIL**

---

## Agent 1

### 1. getBaseUrl (line 51)
PASS. Returns `location.origin` in browser, `https://themoderator.app` as fallback. No user data, no output surface. Correct.

### 2. getStableInviteUrl (line 58)
PASS. Returns `_cachedInviteUrl` if set; otherwise dynamically imports `auth.ts`, reads `user.id`, constructs `?ref=<userId>` URL, caches it. UUID comes from the auth session — not user-supplied input. No injection surface.

### 3. share (line 74)
PASS. Calls `navigator.share()` with `{ title, text, url }` — all values are string literals or `getBaseUrl()` return. No user content interpolated into the share payload via `innerHTML`.

### 4. shareResult (line 105)
PASS. Calls `share()` with template literal built from `params.winner`, `params.loser`, `params.score`. These are server-sourced debate result strings. No direct user-input text path. Score cast via template — not via `innerHTML`.

### 5. shareProfile (line 119)
PASS. Calls `share()` with template literal from `params.username`, `params.level`. Server-sourced values. No `innerHTML`.

### 6. inviteFriend (line 134)
PASS. Calls `getStableInviteUrl()` then `navigator.share()` or clipboard fallback. URL is constructed from server-issued UUID — not user-supplied.

### 7. shareTake (line 141)
PASS. Encodes `params.take` and `params.url` via `encodeURIComponent()` before building Twitter URL. No `innerHTML`. **Note:** `decodeURIComponent` is not called; encoding is one-way. A malformed `params.url` could produce a `URIError` at runtime — flagged as medium risk, not a security finding.

### 8. handleDeepLink (line 152)
PASS. Reads `?ref=` query param, validates with `/^[a-z0-9]{5}$/` (pre-audit fix confirmed in source). Invalid codes rejected before RPC. `safeRpc()` wraps DB call. Challenge branch (`?challenge=`) reads `debateId` — no interpolation into `innerHTML`. **URIError risk same as shareTake if URL is malformed before reaching decodeURIComponent.**

**needs_review:** Auto-init `ready.then(() => handleDeepLink())` at line 204 — not an anchor function but represents a side-effectful module-level statement that fires on load. Not a bug; noted for awareness.

---

## Agent 2

### 1. getBaseUrl (line 51)
PASS. Pure helper. `location.origin` in browser context, static string fallback. No external input, no output surface.

### 2. getStableInviteUrl (line 58)
PASS. Lazy cache pattern is correct. Auth user ID sourced from session, not query string. URL construction is safe (`/u?ref=` + userId string).

### 3. share (line 74)
PASS. `navigator.share()` call. No DOM writes. Fallback silently swallowed — acceptable for share API.

### 4. shareResult (line 105)
PASS. Template string assembly from server data. No `innerHTML`. Numeric score values interpolated as strings — no injection path.

### 5. shareProfile (line 119)
PASS. Same pattern as `shareResult`. Server-side username and level — no direct user-input path in this function.

### 6. inviteFriend (line 134)
PASS. Calls `getStableInviteUrl()` — auth-gated. If not logged in, `getStableInviteUrl()` returns null/undefined; `share()` receives undefined URL. Not a security risk but could produce a broken share payload. Low-severity UX note.

### 7. shareTake (line 141)
PASS. `encodeURIComponent` applied. Twitter intent URL constructed correctly. Same `URIError` edge-case as Agent 1 notes.

### 8. handleDeepLink (line 152)
PASS. Ref code regex `/^[a-z0-9]{5}$/` tightened (previously fixed, confirmed correct). `safeRpc()` used. No raw PostgREST filter. Challenge param: `debateId` is read then passed to `safeRpc('join_debate_challenge', { debateId })` — not interpolated into a raw SQL filter.

---

## Agent 3

### 1. getBaseUrl (line 51)
PASS. Trivial helper. Correct fallback.

### 2. getStableInviteUrl (line 58)
PASS. Module-level `let _cachedInviteUrl` used as simple cache. No concurrency issue given single-threaded JS. Dynamic import of `auth.ts` is safe.

### 3. share (line 74)
PASS. Native share API. Title and text are literals or simple concatenations of safe values.

### 4. shareResult (line 105)
PASS. No `innerHTML`. Correct use of `share()`.

### 5. shareProfile (line 119)
PASS. No `innerHTML`. Correct use of `share()`.

### 6. inviteFriend (line 134)
PASS. Auth-gated URL. Clipboard fallback via `navigator.clipboard.writeText()` — no DOM injection.

### 7. shareTake (line 141)
PASS. Proper `encodeURIComponent` usage. Twitter URL construction is read-only client action.

### 8. handleDeepLink (line 152)
PASS. Ref regex confirmed `/^[a-z0-9]{5}$/`. `safeRpc()` used throughout. `setTimeout` delays are hardcoded constants.

**needs_review:** `URIError` in `shareTake` / `handleDeepLink` — runtime risk if URL is malformed. Not a security vulnerability; medium UX/reliability concern.

---

## Agent 4

### 1. getBaseUrl (line 51)
PASS.

### 2. getStableInviteUrl (line 58)
PASS. Cache correct. Auth session ID, not user-controlled string.

### 3. share (line 74)
PASS.

### 4. shareResult (line 105)
PASS.

### 5. shareProfile (line 119)
PASS.

### 6. inviteFriend (line 134)
PASS.

### 7. shareTake (line 141)
PASS. `encodeURIComponent` correct. URIError edge case noted.

### 8. handleDeepLink (line 152)
PASS. Previously fixed ref-code regex present and correct in source. `safeRpc()` wraps all DB calls.

**needs_review:**
- `ready.then(() => handleDeepLink())` at line 204 — module-level side effect on load; not a function anchor but fires on every page load.
- `ModeratorShare` const object (lines 191–197) bundles and re-exports the anchored functions — not itself audited as a function but is the external API surface.
- `URIError` risk in `shareTake` / `handleDeepLink`.

---

## Agent 5

### 1. getBaseUrl (line 51)
PASS. Correct fallback pattern.

### 2. getStableInviteUrl (line 58)
PASS. Lazy init with cache. Auth ID sourced from session.

### 3. share (line 74)
PASS. Native API, no DOM writes.

### 4. shareResult (line 105)
PASS. Server data only.

### 5. shareProfile (line 119)
PASS. Server data only.

### 6. inviteFriend (line 134)
PASS. Auth-gated, clipboard fallback is safe.

### 7. shareTake (line 141)
PASS. Encoding correct. URIError is only a runtime concern if inputs are malformed upstream.

### 8. handleDeepLink (line 152)
PASS. Ref regex tightened pre-audit (confirmed). `safeRpc()` throughout. No raw filter interpolation.

**needs_review:** Same `URIError` / auto-init / `ModeratorShare` surface notes as Agent 4.

---

## Consolidated Verdict

| Anchor | L | A1 | A2 | A3 | A4 | A5 |
|--------|---|----|----|----|----|-----|
| getBaseUrl | 51 | PASS | PASS | PASS | PASS | PASS |
| getStableInviteUrl | 58 | PASS | PASS | PASS | PASS | PASS |
| share | 74 | PASS | PASS | PASS | PASS | PASS |
| shareResult | 105 | PASS | PASS | PASS | PASS | PASS |
| shareProfile | 119 | PASS | PASS | PASS | PASS | PASS |
| inviteFriend | 134 | PASS | PASS | PASS | PASS | PASS |
| shareTake | 141 | PASS | PASS | PASS | PASS | PASS |
| handleDeepLink | 152 | PASS | PASS | PASS | PASS | PASS |

**Total: 40 PASS / 0 PARTIAL / 0 FAIL**

## Consolidated needs_review (not findings — awareness notes)

1. **URIError risk** — `shareTake` and `handleDeepLink` call `encodeURIComponent`/`decodeURIComponent` on URL strings that could theoretically be malformed. Not a security issue; a runtime reliability edge case. (All 5 agents flagged.)
2. **Auto-init side effect** — `ready.then(() => handleDeepLink())` at line 204 fires on every page load. Not a bug; module intentionally boots deep-link handling. Mentioned by Agents 4 and 5.
3. **`ModeratorShare` export surface** — The const object at lines 191–197 is the public API of this module. Not itself a function anchor but worth noting as the integration point. Mentioned by Agents 4 and 5.

## PREVIOUSLY FIXED (pre-audit, do not re-report)

- **BI-4 / IS-05**: Ref code regex tightened to `/^[a-z0-9]{5}$/` (commit `1bca5a1`). All 5 agents confirmed the fix is present and correct in source.
