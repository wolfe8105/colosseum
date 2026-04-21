# Stage 3 Outputs — src/pages/home.profile.ts

## Agent 01

### _renderAvatar (line 9)
**Verification**: PASS
**Findings**: All five agents' descriptions align with source. Confirmed:
- Line 10: `const url = profile.avatar_url || '';`
- Line 11: `if (url.startsWith('emoji:'))`
- Line 12: `const emoji = url.slice(6);` (6-char prefix)
- Lines 13-15: emoji branch — clears `textContent`, sets `fontSize='32px'`, writes `innerHTML` with `escapeHTML(emoji) + '<span class="avatar-hint">✏️</span>'`
- Lines 17-20: else branch — initial from `(profile.display_name || profile.username || '?')[0].toUpperCase()`, clears `textContent`, resets `fontSize=''`, writes `innerHTML` with escaped initial + hint span
- `escapeHTML` imported from `../config.ts` (line 7), synchronous, no try/catch

**Unverifiable claims**: `escapeHTML` behavior itself lives in `../config.ts` — unverifiable from this file alone.

### _renderNavAvatar (line 24)
**Verification**: PASS
**Findings**: All five agents' descriptions align with source. Confirmed:
- Line 25: `const url = profile.avatar_url || '';`
- Line 26: `if (url.startsWith('emoji:'))`
- Lines 27-28: emoji branch writes `url.slice(6)` to `textContent`, sets `fontSize='18px'`
- Lines 30-31: else branch writes uppercased first char of `display_name || username || '?'` to `textContent`, resets `fontSize=''`
- No `escapeHTML`, no innerHTML, no hint span — correct contrast with `_renderAvatar`

**Unverifiable claims**: None

### updateUIFromProfile (line 35)
**Verification**: PASS
**Findings**: All five agents' descriptions match source closely. Confirmed through lines 35-74 entire body.
- Line 35 signature; line 36 early return; `user` parameter confirmed never referenced in body (lines 37-74).
- Lines 37-38 delegate to `_renderNavAvatar` and `_renderAvatar`.
- Lines 39-51 stat / tier / dropdown writes confirmed.
- Line 52 `shop-token-balance` guarded.
- Lines 53-55 depth + innerHTML template literal confirmed; `depth` interpolated raw without `Number()` or `escapeHTML`.
- Lines 58-67: 10 `dp-*` guarded writes. Agent 05 says "nine" but enumerates ten — minor internal inconsistency.
- Lines 68-73 bio branch confirmed.
- No try/catch, no await.

**Unverifiable claims**: None

### loadFollowCounts (line 76)
**Verification**: PASS
**Findings**: All five agents' descriptions align with source. Confirmed:
- Line 76: `export async function loadFollowCounts()` — no parameters
- Line 77: `const user = getCurrentUser();` (synchronous)
- Line 78: `if (!user?.id) return;`
- Line 79: `try {`
- Line 80: `const counts = await getFollowCounts(user.id);`
- Lines 81-82: `profile-followers` = `String(counts.followers || 0)`, `profile-following` = `String(counts.following || 0)`, both with `!` non-null assertion
- Line 83: `catch (e) { console.warn('[Home] follow counts render failed:', e); }` — no rethrow

**Unverifiable claims**: `getCurrentUser` synchronicity + `getFollowCounts` implementation live in `../auth.ts`.

---

## Cross-Agent Consensus Summary

**Verdict counts (per function, across 5 agents × 4 functions = 20 verdicts):**
- PASS: 20
- PARTIAL: 0
- FAIL: 0

**Inter-agent disagreements**: None substantive. Minor wording differences only; Agent 05 miscount "nine" vs. 10 dp-* writes but enumerates correct ids.

**Aspect coverage**: All agents flag that `depth` at line 55 is interpolated into `innerHTML` without `escapeHTML` or `Number()` — consistent across agents.

## needs_review

Substantive source behavior outside the four described functions that no agent mentioned:

- **Lines 87-90 (module-level DOM wiring)**: `avatarBtn`/`dropdown` lookups at module load, with `avatarBtn!.addEventListener('click', ...)` toggling `.open` on the dropdown with `stopPropagation`, and a document-level click listener that removes `.open`. Runs at import time — a missing `user-avatar-btn` at module evaluation throws synchronously.
- **Lines 93-96 (logout wiring)**: `document.getElementById('logout-btn')!.addEventListener('click', async () => { await logOut(); window.location.href = 'moderator-plinko.html'; });` — also runs at module load; redirects to plinko page after `logOut()`.

No agent described either module-level block. Stage 2 covered only the named function declarations.

## Agent 02

### _renderAvatar (line 9)
**Verification**: PASS
**Findings**: All five agents confirm: signature, `|| ''` fallback (line 10), `startsWith('emoji:')` (line 11), `url.slice(6)` (line 12), emoji branch (lines 13-15), else branch initial derivation + fallback (lines 17-20). Synchronous, no try/catch.

**Unverifiable claims**: `escapeHTML` semantics in `../config.ts` (imported at line 7).

### _renderNavAvatar (line 24)
**Verification**: PASS
**Findings**: All five agents confirm lines 24-33 behavior: url fallback, prefix check, emoji branch writes `url.slice(6)` + `'18px'` fontSize, else branch uppercases first char to `textContent` + resets fontSize. No escapeHTML. No hint span. No innerHTML.

**Unverifiable claims**: None

### updateUIFromProfile (line 35)
**Verification**: PASS
**Findings**:
- Signature and `user` unreferenced — confirmed.
- Line 36 early return.
- Lines 37-38 delegate to render helpers on `user-avatar-btn!` and `profile-avatar!`.
- Line 39 profile-display-name.
- Lines 40-44 tierLabels record + tier resolution + dropdown tier/name writes.
- Lines 45-51 stat / token writes including `toLocaleString()` on both `stat-tokens` and `token-count`.
- Line 52 guarded `shop-token-balance`.
- Lines 53-55 depth computation + `innerHTML` template literal with raw `depth` interpolation. `depth` not passed through `escapeHTML` or `Number()`.
- Lines 58-67: 10 guarded `dp-*` writes. Agent 05 "nine" is internally inconsistent; source has 10.
- Line 67 `dp-depth-pct` gets `depth + '% complete'` (Agent 04 explicitly).
- Lines 68-73 bio branch.
- No try/catch, no await.

**Unverifiable claims**: None

### loadFollowCounts (line 76)
**Verification**: PASS
**Findings**:
- Line 76 export async.
- Line 77 `getCurrentUser()` synchronous.
- Line 78 early return on `!user?.id`.
- Line 80 awaits `getFollowCounts(user.id)`.
- Lines 81-82 DOM writes with `!`.
- Line 83 catch block — `console.warn` with literal prefix, no rethrow.

**Unverifiable claims**: `getCurrentUser` / `getFollowCounts` semantics in `../auth.ts`.

---

### Cross-Agent Consensus Summary

| Function | Verdict |
|---|---|
| `_renderAvatar` | PASS (5/5) |
| `_renderNavAvatar` | PASS (5/5) |
| `updateUIFromProfile` | PASS (5/5) |
| `loadFollowCounts` | PASS (5/5) |

Totals: PASS 4/4, PARTIAL 0, FAIL 0.

**Inter-agent disagreements**: None substantive. Minor: Agent 05 internal count inconsistency "nine" vs. ten dp-* writes.

### needs_review

Module-level side effects (lines 86-96) are not covered by Stage 2. These are not functions but are substantive runtime behavior executed at import time:
- Lines 87-88: module-scope `getElementById` for `user-avatar-btn` and `user-dropdown`.
- Line 89: `avatarBtn!.addEventListener('click', ...)` with `e.stopPropagation()` and `dropdown!.classList.toggle('open')`.
- Line 90: `document.addEventListener('click', ...)` closes dropdown on any document click.
- Lines 93-96: `logout-btn` click handler that `await`s `logOut()` then `window.location.href = 'moderator-plinko.html'`.

If side effects are in scope, they should be added. If scope is named function declarations only, no action required.

## Agent 03

### _renderAvatar (line 9)
**Verification (all 5 agents)**: PASS
**Findings**: Agents 01-05 all correctly describe: `avatar_url` with `|| ''` fallback (line 10), `startsWith('emoji:')` branch (line 11), `url.slice(6)` for emoji (line 12), `textContent = ''` clear, `style.fontSize = '32px'`, `innerHTML = escapeHTML(emoji) + '<span class="avatar-hint">✏️</span>'` (lines 13-15). Else branch: first-char uppercased (line 17), clear textContent (line 18), reset fontSize (line 19), escaped innerHTML + hint span (line 20). Synchronous, no try/catch.

**Unverifiable claims**: None

### _renderNavAvatar (line 24)
**Verification (all 5 agents)**: PASS
**Findings**: Confirmed lines 24-33. Agents correctly note `textContent` only, no `escapeHTML`, no hint span.

**Unverifiable claims**: None

### updateUIFromProfile (line 35)
**Verification**: PARTIAL (all 5 agents)
**Findings (common across agents)**: All correctly describe most behavior; all note depth interpolation is not run through `escapeHTML` or `Number()`. The PARTIAL tag here is an editorial framing — the agents' factual claims match source but the depth-not-escaped observation is a security editorial note, not a factual gap.

**Agent-specific issues**:
- Agent 05 claim "nine conditional writes to the F-45 desktop panel elements" contradicts source (10 writes lines 58-67). Minor arithmetic inconsistency — the id list is correct. FAIL on the count of 9.

All five agents otherwise correctly describe the function's behavior but stop short of connecting the `depth` + innerHTML omission to CLAUDE.md's "Numeric casting before innerHTML" rule (same family as M-D2 in AUDIT-FINDINGS).

**Unverifiable claims**: None

### loadFollowCounts (line 76)
**Verification (all 5 agents)**: PASS
**Findings**: All agents accurately describe: async no-params, `getCurrentUser()` synchronous (line 77), early return `!user?.id` (line 78), try block awaits `getFollowCounts(user.id)` (line 80), writes `String(counts.X || 0)` to DOM with non-null assertions (lines 81-82), catch with literal prefix and no rethrow (line 83). Returns `Promise<void>` implicitly.

**Unverifiable claims**: `getCurrentUser` / `getFollowCounts` live in `../auth.ts`.

---

### Cross-Agent Consensus Summary

| Function | Agent 01 | Agent 02 | Agent 03 | Agent 04 | Agent 05 |
|---|---|---|---|---|---|
| `_renderAvatar` | PASS | PASS | PASS | PASS | PASS |
| `_renderNavAvatar` | PASS | PASS | PASS | PASS | PASS |
| `updateUIFromProfile` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL* |
| `loadFollowCounts` | PASS | PASS | PASS | PASS | PASS |

*Agent 05 additionally has a count FAIL on "nine" vs. ten dp-* writes.

Totals: 15 PASS, 5 PARTIAL (framing), 0 FAIL strictly (Agent 05's count is an internal inconsistency, not a factual source contradiction — its list of 10 ids is correct).

**Inter-agent disagreements**:
- Agent 03 uniquely notes `dp-avatar` has no emoji handling (confirmed at line 60 vs. line 30 `_renderNavAvatar` else).
- Agent 05 "nine" vs. 10 dp-* writes.

### needs_review

1. **Module-level top-level side effects (lines 87-96)**: Module registers `click` listeners on `#user-avatar-btn`, `document`, and `#logout-btn` at import time. `avatarBtn!` and `dropdown!` use non-null assertions — missing elements throw `TypeError` before any exported function is called. Logout handler calls `await logOut()` then `window.location.href = 'moderator-plinko.html'`. No agent described these top-level handlers.

2. **CLAUDE.md rule relevance for `updateUIFromProfile`**: CLAUDE.md requires `Number()` cast on any numeric displayed via innerHTML. Line 55 interpolates `depth` into `innerHTML` without `Number()` casting. Multiple agents note the omission descriptively; none flags it against the project rule.

## Agent 04

### _renderAvatar (line 9)
**Verification**: PASS
**Findings**: All five agents accurately describe parameters, `|| ''` fallback, `startsWith('emoji:')` branch, `url.slice(6)` emoji, textContent clear + fontSize '32px' + innerHTML `escapeHTML(emoji) + <span class="avatar-hint">✏️</span>`, else-branch initial derivation + fontSize reset + innerHTML with escaped initial + hint span. No try/catch, no await.

**Unverifiable claims**: `escapeHTML` in `../config.ts`.

### _renderNavAvatar (line 24)
**Verification**: PASS
**Findings**: All five agents describe lines 24-33 accurately: url fallback (line 25), prefix check (line 26), emoji branch (lines 27-28), else branch (lines 30-31). Agents correctly note `textContent` only, no escapeHTML, no hint span.

**Unverifiable claims**: None

### updateUIFromProfile (line 35)
**Verification**: PASS (with one minor note)
**Findings**:
- Signature + `user` unused — confirmed.
- Early return line 36.
- Lines 37-38 delegate to render helpers.
- Line 39 profile-display-name.
- Lines 40-44 tierLabels + tier writes.
- Lines 45-51 stat + token writes.
- Line 52 guarded `shop-token-balance`.
- Lines 53-55 depth + innerHTML template literal. Agents correctly note depth not passed through `escapeHTML` / `Number()`.
- Lines 58-67: 10 `dp-*` guarded writes.
- Line 60 `dp-avatar` uses inlined initial-only derivation (no emoji handling).
- Line 67 `dp-depth-pct` ← `depth + '% complete'` (Agent 04 explicitly).
- Lines 68-73 bio branch (placeholder class toggle).
- No try/catch, synchronous.

**Minor note**: Agent 05 says "nine conditional writes" but lists ten. Source has ten.

**Unverifiable claims**: None

### loadFollowCounts (line 76)
**Verification**: PASS
**Findings**:
- Async no-params.
- `getCurrentUser()` sync, `!user?.id` early return.
- `await getFollowCounts(user.id)` in try.
- DOM writes with non-null assertions.
- catch with literal `'[Home] follow counts render failed:'` prefix, no rethrow.
- Returns `Promise<void>` implicitly.

**Unverifiable claims**: `getCurrentUser` / `getFollowCounts` in `../auth.ts`.

---

## Cross-Agent Consensus Summary

| Function | Agent 01 | Agent 02 | Agent 03 | Agent 04 | Agent 05 |
|---|---|---|---|---|---|
| `_renderAvatar` | PASS | PASS | PASS | PASS | PASS |
| `_renderNavAvatar` | PASS | PASS | PASS | PASS | PASS |
| `updateUIFromProfile` | PASS | PASS | PASS | PASS | PASS |
| `loadFollowCounts` | PASS | PASS | PASS | PASS | PASS |

Totals: 20 PASS, 0 PARTIAL, 0 FAIL.

**Inter-agent disagreements**: None substantive. Agent 05 phrase "nine conditional writes" internally inconsistent with its own list of 10 ids.

---

## needs_review

Source contains module-level code at lines 86-96 that no agent described. Substantive runtime behavior executed on module import:

1. **Lines 87-90 — Dropdown toggle wiring**:
   - Module-level `getElementById('user-avatar-btn')` into `avatarBtn` and `getElementById('user-dropdown')` into `dropdown`.
   - `avatarBtn!.addEventListener('click', ...)` stops propagation and toggles `open` on dropdown.
   - `document.addEventListener('click', ...)` unconditionally removes `open` (closes dropdown).
   - Because avatar click calls `stopPropagation()`, document listener doesn't fire for clicks on avatar itself — deliberate outside-click-to-close pattern.

2. **Lines 93-96 — Logout button wiring**:
   - `document.getElementById('logout-btn')!.addEventListener('click', async () => { await logOut(); window.location.href = 'moderator-plinko.html'; });`
   - On click: awaits `logOut()` from `../auth.ts`, then redirects to `moderator-plinko.html`.
   - Non-null assertion on `logout-btn` — throws if absent at import time.

These are side effects at module import, not inside any exported function. Stage 2 covered only the four named functions.

## Agent 05

### _renderAvatar (line 9)
**Verification**: PASS
**Findings**: All 5 agents describe accurately against lines 9-22. `escapeHTML` call, hint span, branches, fontSize writes.

**Unverifiable claims**: `escapeHTML` in `../config.ts`.

### _renderNavAvatar (line 24)
**Verification**: PASS
**Findings**: Lines 24-33 behavior confirmed. `textContent` only, no escapeHTML, no hint span.

**Unverifiable claims**: None

### updateUIFromProfile (line 35)
**Verification**: PASS (with one nuance)
**Findings**:
- Signature + `user` unused — confirmed.
- Early return line 36.
- Lines 37-38 render helper delegations.
- Lines 39-51 tier / stat / token writes, all fallbacks confirmed.
- Line 52 guarded `shop-token-balance`.
- Lines 53-55 depth + innerHTML template. Agents 01-04 flag `depth` not `Number()`/`escapeHTML`-cast; Agent 05 notes `depth` is a number and no user-string is interpolated — both framings accurate against the source; the source still does not cast via `Number()` (contradicting CLAUDE.md "Numeric casting before innerHTML" rule).
- Lines 58-67: 10 guarded `dp-*` writes. Agents 01/02/04 list 10; Agent 03/05 explicitly list 10 ids. **Agent 05 says "nine" but enumerates ten — internal inconsistency. FAIL on count claim; list correct.**
- Line 67 `dp-depth-pct` ← `depth + '% complete'`.
- Lines 68-73 bio branch.

**Unverifiable claims**: None within this file. `Profile` type fields in `../auth.ts`.

### loadFollowCounts (line 76)
**Verification**: PASS
**Findings**: Confirmed against lines 76-83 entirely — async, sync `getCurrentUser()`, early return, try/await `getFollowCounts`, DOM writes with `!`, catch with literal prefix + no rethrow.

**Unverifiable claims**: `getCurrentUser` / `getFollowCounts` in `../auth.ts`.

---

### Cross-Agent Consensus Summary

| Function | Agent 01 | Agent 02 | Agent 03 | Agent 04 | Agent 05 |
|---|---|---|---|---|---|
| `_renderAvatar` | PASS | PASS | PASS | PASS | PASS |
| `_renderNavAvatar` | PASS | PASS | PASS | PASS | PASS |
| `updateUIFromProfile` | PASS | PASS | PASS | PASS | PARTIAL |
| `loadFollowCounts` | PASS | PASS | PASS | PASS | PASS |

Totals: PASS 19, PARTIAL 1, FAIL 0.

**Inter-agent disagreements**:
- Desktop-panel write count: Agent 05 "nine" but source has 10 (lines 58-67).
- Depth interpolation framing: Agents 01-04 flag missing `escapeHTML`/`Number()`; Agent 05 notes `depth` is numeric and no user-string is interpolated. Both framings accurate — source does not cast but `profile_depth_pct` is typed number.

---

### needs_review

1. **Top-level module side effects (lines 87-96)**: Four top-level statements on import: two `getElementById` lookups into `avatarBtn` and `dropdown`; `avatarBtn!.addEventListener('click', …)` toggles `open` class with stopPropagation; `document.addEventListener('click', …)` removes `open`; `document.getElementById('logout-btn')!.addEventListener('click', async () => { await logOut(); window.location.href = 'moderator-plinko.html'; })`. Side effects run on first import and are not guarded — missing element throws immediately.

2. **CLAUDE.md "Numeric casting before innerHTML" rule**: Line 55 interpolates `depth` (derived via `profile.profile_depth_pct || 0`) into `innerHTML` without `Number()` casting. This is the same pattern flagged as M-D2 in AUDIT-FINDINGS for `modifiers.ts`. Several agents note the descriptive omission; none connect it to the explicit CLAUDE.md rule.
