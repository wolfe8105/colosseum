# Stage 2 — Runtime Walk: profile-debate-archive.render.ts

Source: src/profile-debate-archive.render.ts (128 lines)
Anchors: 2
Agents: 5 (independent, parallel)
Verdict: **0 High · 0 Medium · 1 Low · 0 PARTIAL**

---

## Agent 1

### renderTable (line 13)
- `filterSearch` → `esc(filterSearch)` before `value` attribute — SAFE
- Category strings `c` → `esc(c)` and `esc(c.toUpperCase())` — SAFE
- `date` from `new Date(e.debate_created_at).toLocaleDateString(...)` → inserted raw into `<td>${date}</td>` — **Low**: unescaped user-sourced value entering innerHTML (though toLocaleDateString output is HTML-safe in practice)
- `result` = `'draw'|'win'|'loss'` from boolean ternary — SAFE (hardcoded literals)
- `resultLabel` = `'W'|'L'|'D'` — SAFE (hardcoded)
- `oppLabel`, `topicLabel`, `descLabel` — all through `esc()` — SAFE
- `myS`, `oppS` — `.toFixed(1)` on numeric — SAFE
- `catLabel` = `esc(category.toUpperCase())` — SAFE
- `hiddenFlag` — hardcoded HTML string — SAFE
- `esc(e.entry_id)` in data attributes — SAFE
- `esc(archiveUrl(e))` in `data-url` — HTML attribute safe; `window.open` concern flagged as Medium (but see Agent 2-4 resolution below)

### wireTable (line 92)
- `setFilterSearch(searchEl.value)` → state → re-escaped in next renderTable call — SAFE
- `chip.dataset.result!`, `chip.dataset.cat!` → state setters → re-escaped on re-render — SAFE
- `row.dataset.url` → `window.open(url, '_blank')` — flagged Medium (false positive — see resolution)
- `entryId` → `entries.find()` lookup only — SAFE

---

## Agent 2 (read `profile-debate-archive.filter.ts` — 37 lines)

**Key finding: `archiveUrl()` source confirmed.**

```typescript
export function archiveUrl(entry: ArchiveEntry): string {
  const mode = entry.debate_mode;
  if (mode === 'ai') return `/moderator-auto-debate.html?id=${encodeURIComponent(entry.debate_id)}`;
  return `/moderator-spectate.html?id=${encodeURIComponent(entry.debate_id)}`;
}
```

- Always returns a relative path beginning with `/moderator-`. `debate_id` is `encodeURIComponent`-encoded. `javascript:` injection structurally impossible. `window.open()` **SAFE**.
- `date` from `toLocaleDateString('en-US', {...})` — output is HTML-safe (locale-bounded characters), no escaping needed. Rated None (though agent 1 rated Low).
- `result` CSS class — closed ternary, 3 literal strings only — SAFE.
- All `esc()` calls on user fields confirmed — SAFE.

**Summary: CLEAN. No findings of any severity.**

---

## Agent 3 (read `profile-debate-archive.filter.ts`)

**Confirmed `archiveUrl()` implementation. Hardcoded `/moderator-*.html` prefix + `encodeURIComponent(debate_id)` — `javascript:` impossible.**

- `date` — Low: technically unescaped user-sourced data entering innerHTML; `toLocaleDateString` in practice safe; fix is `esc(date)`.
- `archiveUrl` / `window.open` — None (confirmed safe given implementation).
- All other paths — SAFE.

**Summary: 1 Low (`date`).**

---

## Agent 4 (read `profile-debate-archive.filter.ts`)

**Confirmed `archiveUrl()` — relative path, `encodeURIComponent`, no `javascript:` risk.**

- `date` — Low: unescaped in innerHTML; safe output today, but `esc(date)` is the correct fix.
- `result` CSS class — None (closed ternary).
- `archiveUrl` → `window.open` — None (safe confirmed).
- `chip.dataset.*` round-trip — None (re-escaped on every render).
- `entryId` lookup — None.

**Summary: 1 Low (`date`).**

---

## Agent 5 (did NOT read `archiveUrl` implementation)

- `date` — Low: `toLocaleDateString` unescaped.
- `result` CSS class — Low: relies on server boolean type contract.
- `archiveUrl` → `window.open` — flagged Medium (did not read filter.ts; conditionally High if user data). **Overruled by Agents 2-4 who confirmed implementation.**
- `chip.dataset` non-null assertion — Low (robustness, not security).
- Re-render loop on keystroke — Info.

---

## Consolidated Findings

| ID | Anchor | Severity | Finding | Agents |
|----|--------|----------|---------|--------|
| DAR-1 | `renderTable` | Low | `date` from `toLocaleDateString()` inserted into innerHTML without `esc()`. In practice HTML-safe (locale-bounded output), but violates project's "escape everything" rule. Fix: `esc(date)` at line 71. | 1, 3, 4, 5 |

**False positive resolved:** Agent 1 (Medium) and Agent 5 (Medium) flagged `archiveUrl(e)` → `window.open()` as a potential `javascript:` injection. Agents 2, 3, and 4 read `profile-debate-archive.filter.ts` (37 lines) and confirmed `archiveUrl()` always returns `/moderator-*.html?id=encodeURIComponent(debate_id)` — a relative path. `javascript:` injection is structurally impossible. **Finding withdrawn.**

**No High or Medium findings. No innerHTML XSS paths. No open redirect.**

## Recommended Fix

**DAR-1** (one line): Change line 71 from `${date}` to `${esc(date)}` — or define `date` as `esc(new Date(...).toLocaleDateString(...))` at line 53.
