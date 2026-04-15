# Stage 3 Verification — src/async.render.ts

Source: src/async.render.ts
Produced by: stage 3 (5 parallel verification agents)
Anchors: 9 functions (from stage 1.5)

---

## Verdict Summary

| Function | PASS | FAIL | PARTIAL | N/V | Notes |
|---|---|---|---|---|---|
| _registerWiring | 5 | 0 | 0 | 0 | Clean |
| loadHotTakes | 11 | 0 | 0 | 0 | Clean |
| _renderTake | 14 | 0 | 0 | 1 | vgBadge/bountyDot N/V |
| _renderModeratorCard | 6 | 0 | 0 | 0 | Clean |
| renderPredictions | 9 | 0 | 0 | 0 | Clean |
| _renderPredictionCard | 8 | 0 | 0 | 0 | Clean |
| _renderStandaloneCard | 11 | 0 | 2 | 0 | Numeric interp. imprecision |
| _showWagerPicker | 19 | 0 | 1 | 0 | Double-escape on sideLabel |
| _hideWagerPicker | 5 | 0 | 0 | 0 | Clean |

**Totals: PASS 88 | FAIL 0 | PARTIAL 3 | N/V 1**
**Critical security FAILs: 0**

---

## Function-by-Function Findings

### _registerWiring (line 30)

All 5 agents PASS all claims.

- Accepts two `WireFn` callbacks; assigns them to module-level `_wireTakes` and `_wirePredictions` — confirmed lines 31–32.
- Both vars initialized to `undefined` at module scope (lines 27–28) — confirmed.
- Synchronous, no DOM, no branches, no loops — confirmed.
- No user data, no innerHTML, no security surface.

### loadHotTakes (line 39)

All 5 agents PASS all claims.

- Optional `category: CategoryFilter` defaulting to `'all'` — confirmed line 39.
- Writes `state.currentFilter = category` first — confirmed line 40.
- Queries `getElementById('hot-takes-feed')`, early-returns if absent — confirmed lines 41–42.
- Wiring guard: `state.wiredContainers.has(container)` → calls `_wireTakes?.(container)` → adds to set — confirmed lines 44–47.
- Filters `state.hotTakes` by `section` when category ≠ `'all'` — confirmed lines 49–52.
- Empty-state: writes static HTML to `container.innerHTML` and returns — confirmed lines 54–61 (no user data in placeholder).
- Maps takes through `_renderTake`, calls `getCurrentUser()` and `getCurrentProfile()` — confirmed lines 63, 66–67.
- Splices `_renderModeratorCard(!user)` at index 2 when `!profile?.is_moderator && rendered.length >= 2` — confirmed lines 68–70.
- Joins rendered array → `container.innerHTML` — confirmed line 72.

### _renderTake (line 75)

All 5 agents: 14 PASS, 0 FAIL, 0 PARTIAL, 1 N/V.

**N/V:** `vgBadge(t.verified_gladiator)` and `bountyDot(t.user_id)` return values are interpolated directly into the template at line 99 without `esc()`. All agents consistently flag this as a trust-boundary observation — whether it is safe depends on `badge.ts`/`bounties.ts` internals (N/V from this file). No Stage 2 agent made a false claim here; all correctly described the pattern.

All XSS-relevant fields verified:
- `t.user` → `safeUser` (line 77), `t.user[0]` → `safeInitial` (line 78), `t.text` → `safeText` (line 79), `t.id` → `safeId` (line 80), `t.user_id` → `safeUserId` (line 81), `t.username` → `safeUsername` (line 82) — all `esc()`'d.
- `t.time` → `esc(t.time)` at line 101 — confirmed.
- `t.text` placed in `data-text` attribute as `esc(t.text)` at line 117 — confirmed.
- `t.reactions` → `Number(t.reactions)` at line 110; `t.challenges` → `Number(t.challenges)` at line 116 — confirmed.
- `catLabel` (line 86): computed from `t.section` but never interpolated into the returned string — confirmed dead assignment. Not a bug; dead code only.
- `truncate` (line 87): computed but `t.text.length > 150` re-tested inline at line 103 — confirmed.

### _renderModeratorCard (line 127)

All 5 agents PASS all claims.

- Accepts optional boolean `isGuest` (defaults `false`) — confirmed line 127.
- `btnLabel`: `'SIGN UP TO MODERATE'` when `isGuest`, `'BECOME A MODERATOR'` otherwise — confirmed line 128.
- `btnAction`: `'mod-signup'` / `'become-mod'` — confirmed line 129.
- No user data, no escaping needed, all content is hardcoded string literals.

### renderPredictions (line 150)

All 5 agents PASS all claims.

- Early return if `!container` (line 151) — confirmed; `FEATURES.predictionsUI` check second (line 152) — confirmed.
- Wiring guard identical pattern to `loadHotTakes` — confirmed lines 154–157.
- Both-empty path: static placeholder HTML with `data-action="create-prediction"` button — confirmed lines 162–169 (no user data).
- Non-empty: header + `state.predictions.map(_renderPredictionCard)` + `state.standaloneQuestions.map(_renderStandaloneCard)` → `container.innerHTML` — confirmed lines 171–178.

### _renderPredictionCard (line 180)

All 5 agents PASS all claims.

- `p.topic`, `p.p1`, `p.p2`, `p.debate_id` all `esc()`'d — confirmed lines 181–184.
- `isLive = p.status === 'live' || p.status === 'in_progress'` — confirmed line 185.
- `p.total`, `p.p1_elo`, `p.p2_elo`, `p.pct_a`, `p.pct_b` all wrapped in `Number()` at interpolation — confirmed lines 191, 201, 210/211, 214, 216, 217.
- Side buttons: `data-action="predict"`, `data-id` (escaped), `data-pick="a"/"b"` — confirmed lines 195, 204.
- Button styles conditional on `p.user_pick` comparison (string equality check, not interpolated raw) — confirmed lines 197–198, 206–207.
- No `getCurrentUser()` or `getCurrentProfile()` calls — confirmed.

### _renderStandaloneCard (line 223)

All 5 agents: 11 PASS, 0 FAIL, 2 PARTIAL.

**PARTIAL 1 — Numeric interpolation without inline `Number()` cast:**
`total` (computed at lines 228–229), `pctA` (line 230), and `pctB` (line 231) are all derived from `Number()` arithmetic — they are already numeric values. However, they are interpolated at lines 241, 262, 264–265 without an explicit `Number()` wrapper at the interpolation site. The project rule is: numeric values displayed via innerHTML must be cast with `Number()` first. These values are safe in practice (they result from `Number()` math and cannot be user-controlled strings), but the interpolation sites do not apply the explicit cast. Stage 2 agents describe the derivation correctly but do not flag the missing inline cast. Low risk — no XSS possible — but technically violates the stated convention.

**PARTIAL 2 (minor):** One agent's description of the `total` fallback chain (via `||`) was slightly imprecise in phrasing but correct in effect. Not a meaningful divergence.

Other claims:
- `q.topic`, `q.side_a_label`, `q.side_b_label`, `q.id` — all `esc()`'d — confirmed lines 224–227.
- Creator: `q.creator_display_name ?? q.creator_username ?? 'Anonymous'` then `esc()`'d — confirmed lines 232–234.
- `userPick = q._userPick ?? null` — confirmed line 235.
- Side buttons: `data-action="standalone-pick"`, `data-id` (escaped), `data-pick="a"/"b"` — confirmed lines 245, 253.
- No ELO values displayed — confirmed.
- `creator` in the `"${total} picks · by ${creator}"` subtitle is `esc()`'d (safe) — confirmed line 241.

### _showWagerPicker (line 277)

All 5 agents: 19 PASS, 0 FAIL, 1 PARTIAL.

**PARTIAL — Double-escape on sideLabel:**
Line 285: `const sideLabel = side === 'a' ? esc(pred.p1) : esc(pred.p2);` — `sideLabel` is already the result of `esc()`.
Line 294: `WAGER ON ${esc(sideLabel.toUpperCase())}` — calls `esc()` again on the already-escaped string.

This double-escape is benign from a security standpoint (no injection possible) but will corrupt display of prediction participant names containing `&`, `<`, `>`, `"`, or `'`. For example, a name like `"Rock 'n' Rollers"` would render as `ROCK &#x27;N&#x27; ROLLERS` in the picker header. This is a display bug. Agents 01, 02, 03 explicitly flagged this; Agent 04 noted it; Agent 05 confirmed. No Stage 2 agent flagged the double-escape consistently — only Agent 04 (Stage 2) described it precisely.

Other claims all PASS:
- `_hideWagerPicker()` called first (line 279) — confirmed.
- `getCurrentProfile()?.token_balance || 0` (line 281) — confirmed.
- Searches `state.predictions` for `debate_id === debateId`; returns early if not found (lines 282–283) — confirmed.
- `safeDebateId = esc(debateId)` (line 286) — confirmed.
- `safeSide` whitelisted to literal `'a'` or `'b'` (line 287) — confirmed.
- `quickAmounts` filters `[10,25,50,100,250]` to `<= Math.min(500, balance)` (line 289) — confirmed.
- `Number(balance)` in header display (line 295) — confirmed.
- Number input: `min="1"`, `max="${Math.min(500, balance)}"` (line 298) — confirmed.
- Confirm button: `data-action="wager-confirm"`, `data-id="${safeDebateId}"`, `data-pick="${safeSide}"`, initially `disabled` (line 302) — confirmed.
- Cancel button: `data-action="wager-cancel"` (line 303) — confirmed.
- Balance warning rendered when `balance < 1` (line 305) — confirmed.
- DOM query uses `safeDebateId` in attribute selector (line 309) — confirmed.
- Returns without inserting if card not found (line 310) — confirmed.
- `_activeWagerDebateId = debateId` (raw param, not `safeDebateId`) assigned AFTER card lookup at line 313 — confirmed. This is module-level tracking state only; it is never re-interpolated into HTML, so no XSS risk. All agents agree.
- Creates `div#wager-picker-wrapper`, sets `innerHTML = pickerHtml`, appends to card (lines 315–318) — confirmed.
- Focuses `#wager-amount-input` (lines 321–322) — confirmed.

### _hideWagerPicker (line 325)

All 5 agents PASS all claims.

- Sets `_activeWagerDebateId = null` unconditionally (line 326) — confirmed.
- Calls `document.getElementById('wager-picker-wrapper')` (line 327) — confirmed.
- Calls `.remove()` if found; no-op if not (line 328) — confirmed.
- Synchronous, no params, no error paths, no loops — confirmed.

---

## needs_review

None. No FAIL verdicts, no security-critical PARTIAL items. The 3 PARTIAL items are:
1. **`_renderStandaloneCard` numeric interpolation**: `total`, `pctA`, `pctB` lack explicit `Number()` at their interpolation sites. Values are numerically safe (derived from `Number()` arithmetic). Mild convention violation.
2. **`_showWagerPicker` double-escape**: `esc(sideLabel.toUpperCase())` where `sideLabel` is already `esc()`'d. Display bug risk for names with HTML-special characters; not a security regression.
3. **Minor phrasing imprecision** in one agent's description of the `_renderStandaloneCard` total fallback chain.

One N/V observation worth downstream review: `vgBadge()` and `bountyDot()` return values flow into `innerHTML` in `_renderTake` without `esc()`. Safety depends on those modules' own escaping discipline.
