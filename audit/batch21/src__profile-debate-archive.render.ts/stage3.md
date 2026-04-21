# Stage 3 — Verification: profile-debate-archive.render.ts

Source: src/profile-debate-archive.render.ts (128 lines)
Anchors verified: renderTable (line 13), wireTable (line 92)
Stage 2 findings under test: DAR-1 (Low)
Agents: 5 (independent, parallel)

---

## Agent 1

Verified against source lines 13–128.

| Claim | Line(s) | Result |
|-------|---------|--------|
| `filterSearch` escaped via `esc()` in value attr | 30 | PASS |
| Category chips: `esc(c)` and `esc(c.toUpperCase())` | 34–38 | PASS |
| `date` inserted raw into `<td>` — no `esc()` | 71 | PASS (confirmed) |
| `result` from closed ternary literals | 53 | PASS |
| `resultLabel` from closed ternary literals | 54 | PASS |
| `oppLabel`, `topicLabel`, `descLabel` through `esc()` | 61–63 | PASS |
| `myS`, `oppS` via `.toFixed(1)` on numeric | 55–56 | PASS |
| `catLabel` = `esc(category.toUpperCase())` | 65 | PASS |
| `hiddenFlag` hardcoded HTML string | 67 | PASS |
| `esc(e.entry_id)` in data attributes | 75 | PASS |
| `esc(archiveUrl(e))` in data-url attribute | 76 | PASS |
| `window.open(url, '_blank')` — url from dataset | 117 | PASS |
| `setFilterSearch(searchEl.value)` — value re-escaped on re-render | 100 | PASS |

**DAR-1 confirmed**: Line 71 — `${date}` enters innerHTML with no `esc()`. `date` = `new Date(e.debate_created_at).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'2-digit'})`. Output is locale-bounded and HTML-safe in practice, but violates project escaping policy.

Score: **12 PASS / 0 PARTIAL / 0 FAIL**

---

## Agent 2

Verified against source lines 13–128.

| Claim | Line(s) | Result |
|-------|---------|--------|
| `filterSearch` → `esc(filterSearch)` | 30 | PASS |
| `esc(c)` on category chip labels | 35 | PASS |
| `date` raw in `<td>` | 71 | PASS (confirmed finding) |
| `result` CSS class — closed ternary | 53 | PASS |
| `oppLabel` / `topicLabel` / `descLabel` escaped | 61–63 | PASS |
| `esc(e.entry_id)` data attr | 75 | PASS |
| `esc(archiveUrl(e))` data attr | 76 | PASS |
| `window.open(url, '_blank')` | 117 | PASS |

**DAR-1 confirmed**: `${date}` at line 71 — no `esc()`. Fix: wrap with `esc()` or define `date` as `esc(new Date(...).toLocaleDateString(...))` at line 53.

Note on rating convention: "FAIL" here means the Stage 2 claim that DAR-1 is a real finding is VERIFIED in source — the finding stands.

Score: **8 PASS / 0 PARTIAL / 1 confirmed-finding**

---

## Agent 3

Verified against source lines 13–128 plus cross-read `profile-debate-archive.filter.ts`.

| Claim | Line(s) | Result |
|-------|---------|--------|
| `filterSearch` escaped | 30 | PASS |
| Category labels escaped | 34–38 | PASS |
| `date` unescaped in `<td>` | 71 | PASS (DAR-1 confirmed) |
| `result` / `resultLabel` — hardcoded literals | 53–54 | PASS |
| `oppLabel`, `topicLabel`, `descLabel` escaped | 61–63 | PASS |
| `myS`, `oppS` numeric `.toFixed(1)` | 55–56 | PASS |
| `catLabel` escaped | 65 | PASS |
| `hiddenFlag` hardcoded | 67 | PASS |
| `esc(e.entry_id)` | 75 | PASS |
| `esc(archiveUrl(e))` + archiveUrl relative path confirmed | 76 | PASS |
| `setFilterSearch` / `setFilterResult` / `setFilterCat` — re-escaped on re-render | 100–111 | PASS |
| `entryId` lookup only (no DOM injection) | 121–127 | PASS |
| `window.open` — url from dataset, relative path | 117 | PASS |
| `chip.dataset.result!` non-null assertion — robustness only | 104, 108 | PASS |

**DAR-1 confirmed**: `date` at line 71 enters `<td>` innerHTML with no `esc()`. Locale-bounded output is safe in practice. `esc(date)` is the correct defensive fix.

Score: **14 PASS / 0 PARTIAL / 0 FAIL**

---

## Agent 4

Verified against source lines 13–128.

| Claim | Line(s) | Result |
|-------|---------|--------|
| `esc(filterSearch)` in value attr | 30 | PASS |
| `esc(c)` / `esc(c.toUpperCase())` chip labels | 35 | PASS |
| `date` raw in innerHTML | 71 | PASS (DAR-1 confirmed) |
| `result` closed ternary | 53 | PASS |
| `oppLabel` / `topicLabel` / `descLabel` via `esc()` | 61–63 | PASS |
| `esc(e.entry_id)` | 75 | PASS |
| Chip `dataset.result!` / `dataset.cat!` re-escaped on re-render | 104–111 | PASS |

**DAR-1 confirmed**: `${date}` at line 71 — unescaped. `toLocaleDateString` output is in practice safe but `esc()` must wrap it per project policy.

**Self-correction**: Initially considered whether `filterCat === c` could inject — `c` is compared, not interpolated into class output. Only `'active'` or `''` literals enter the class string. Concern dismissed.

Score: **7 PASS / 0 PARTIAL / 0 FAIL**

---

## Agent 5

Verified against source lines 13–128 plus cross-read `profile-debate-archive.filter.ts` (37 lines).

| Claim | Line(s) | Result |
|-------|---------|--------|
| `esc(filterSearch)` in search value attr | 30 | PASS |
| `esc(c)` chip text labels | 35 | PASS |
| `date` unescaped in `<td>` — DAR-1 | 71 | PASS (confirmed) |
| `result` from boolean ternary — 3 literals | 53 | PASS |
| `resultLabel` — closed ternary | 54 | PASS |
| `oppLabel`, `topicLabel`, `descLabel` escaped | 61–63 | PASS |
| `myS` / `oppS` numeric `.toFixed(1)` | 55–56 | PASS |
| `catLabel` = `esc(category.toUpperCase())` | 65 | PASS |
| `hiddenFlag` hardcoded | 67 | PASS |
| `esc(e.entry_id)` data attrs | 75 | PASS |
| `esc(archiveUrl(e))` data-url attr | 76 | PASS |
| `archiveUrl()` always relative — confirmed in filter.ts | — | PASS |
| `window.open(url, '_blank')` safe given archiveUrl | 117 | PASS |
| `setFilterSearch` → state → re-escaped | 100 | PASS |
| `chip.dataset.*` → state → re-escaped | 104–111 | PASS |
| `entryId` → `entries.find()` lookup only | 121 | PASS |
| `showAdInterstitial` callback — no injection surface | 116–118 | PASS |

**DAR-1 confirmed**: Line 71 — `${date}` raw. `toLocaleDateString('en-US', {month:'short',day:'numeric',year:'2-digit'})` output is HTML-safe (locale outputs like "Apr 18, 26") but project policy requires `esc()` on all user-sourced data touching innerHTML. `debate_created_at` originates from the database (user record). Fix: `${esc(date)}`.

Score: **17 PASS / 0 PARTIAL / 1 confirmed-finding**

---

## Consolidated Verification

| Finding | Stage 2 Claim | Stage 3 Result | Agents Confirming |
|---------|--------------|----------------|-------------------|
| DAR-1 (Low): `date` unescaped at line 71 | 1 Low | **CONFIRMED** | 1, 2, 3, 4, 5 |

**All other Stage 2 PASS/SAFE claims verified in source. No Stage 2 claim overturned.**

**False positive re-confirmed**: `archiveUrl(e)` → `window.open()` Medium flag (Agents 1 and 5 in Stage 2) correctly withdrawn. Source of `archiveUrl()` verified in filter.ts by Stage 2 Agents 2/3/4 and Stage 3 Agent 5 — structurally impossible to inject `javascript:`.

## Final Verdict

**0 High · 0 Medium · 1 Low · 0 PARTIAL**

**DAR-1** (Low, confirmed): `src/profile-debate-archive.render.ts` line 71 — `${date}` enters `<td>` innerHTML without `esc()`. Fix: `${esc(date)}`.
