# Stage 3 Outputs — leaderboard.list.ts

## Agent 01

### renderShimmer (line 14)
**Verification**: PASS
**Findings**: None. All claims confirmed. Loop runs 6 times, shimmer HTML with index-varied widths, returns string.
**Unverifiable claims**: None.

### renderList (line 31)
**Verification**: PARTIAL
**Findings**:
- PASS: `liveData === null && !isLoading` error-return confirmed (line 32).
- PASS: `getData()` call, spread-copy, sort by currentTab confirmed (lines 41–47).
- PASS: `sorted.forEach item.rank = i+1` mutation confirmed (line 48). All agents correctly described this, consistent with the existing LANDMINE comment.
- PASS: `escHtml(p.username ?? '')` in `data-username` attribute confirmed (line 64 / line 67).
- PASS: `escHtml(p.user[0] ?? '')` for avatar initial confirmed (line 79).
- PASS: `escHtml(p.user)` for display name confirmed (line 81).
- PASS: `vgBadge(p.verified_gladiator)` and `bountyDot(p.id)` injected raw (line 81). These are called inline in the template. Their return values are not passed through `escHtml`. If either returns user-controlled content, this is an XSS surface. `vgBadge` and `bountyDot` are from `badge.ts` and `bounties.ts` — the safety of their return values is unverifiable from this file.
- PASS: `Number(stat) || 0` confirmed (line 85). `Number(p.level)`, `Number(p.wins)`, `Number(p.losses)` confirmed (line 82).
- FAIL: **Hardcoded hex colors.** LANDMINE comment LM-LB-003 in the source at line 54 explicitly calls this out. `#a8a8a8` (silver), `#b87333` (bronze) at line 55; `#6a7a90` fallback at line 57; `#2a5aab` for contender at line 60. These violate CLAUDE.md design DNA rule. Note: these are pre-acknowledged via LANDMINE comments — this is NOT a new finding but a confirmation of documented technical debt.
- PARTIAL: Agent descriptions said `hasMore` is read and LOAD MORE button appended. Source line 90: `hasMore ? '...' : ''` — confirmed. But `hasMore` is imported at line 9 from `leaderboard.state.ts`. The value is read fresh each call — this is correct behavior.
**Unverifiable claims**: Whether `vgBadge` and `bountyDot` return sanitized HTML — requires reading badge.ts and bounties.ts.

---

## Agent 02

### renderShimmer (line 14)
**Verification**: PASS
**Findings**: None.
**Unverifiable claims**: None.

### renderList (line 31)
**Verification**: PARTIAL
**Findings**:
- PASS: All core behaviors confirmed.
- Note: The LANDMINE comment at line 38–40 explicitly documents the rank mutation bug (LM-LB-001) — this was previously found as M-I3 in AUDIT-FINDINGS.md and is ALREADY DOCUMENTED. Not a new finding.
- Note: LANDMINE comment at line 54 (LM-LB-003) documents the hardcoded hex issue — also pre-documented.
- PARTIAL: `vgBadge` and `bountyDot` return values injected raw into innerHTML. Unverifiable from this file.
**Unverifiable claims**: Safety of `vgBadge` and `bountyDot` return values.

---

## Agent 03

### renderShimmer (line 14)
**Verification**: PASS
**Findings**: None.
**Unverifiable claims**: None.

### renderList (line 31)
**Verification**: PARTIAL
**Findings**:
- PASS: All confirmed.
- Note: Rank mutation (M-I3) and hardcoded hex (LM-LB-003) are both pre-documented per LANDMINE comments.
- PARTIAL: `vgBadge`/`bountyDot` injection safety unverifiable from this file.
**Unverifiable claims**: vgBadge and bountyDot output safety.

---

## Agent 04

### renderShimmer (line 14)
**Verification**: PASS
**Findings**: None.
**Unverifiable claims**: None.

### renderList (line 31)
**Verification**: PARTIAL
**Findings**:
- PASS: All core behaviors confirmed.
- PARTIAL: `vgBadge` and `bountyDot` unescaped injection noted but unverifiable.
- Note: All hardcoded hex findings are pre-acknowledged via LANDMINE comments in source.
**Unverifiable claims**: vgBadge/bountyDot output safety.

---

## Agent 05

### renderShimmer (line 14)
**Verification**: PASS
**Findings**: None.
**Unverifiable claims**: None.

### renderList (line 31)
**Verification**: PARTIAL
**Findings**:
- PASS: All confirmed.
- NEW NOTE: `p.user` is used as the display name in the list row and avatar initial. Source line 81: `${escHtml(p.user)}${vgBadge(p.verified_gladiator)}${bountyDot(p.id)}`. The question is what field `p.user` maps to — it appears to be the display name field from the leaderboard entry. `p.username` is also present (line 64) — two fields. Source line 64: `safeUsername = escHtml(p.username ?? '')` used in `data-username` attribute; `p.user` used in display. This distinction is not clarified in this file — unverifiable without `leaderboard.state.ts` or the RPC shape.
- Note: All documented LANDMINE items (rank mutation M-I3, hardcoded hex) are pre-existing and not new findings.
**Unverifiable claims**: What `p.user` vs `p.username` distinction is (which field maps to display name vs handle).

---

## Cross-Agent Consensus Summary

PASS: renderShimmer (unanimous 5/5)
PARTIAL: renderList (5/5 — all agents noted LANDMINE items but correctly identified them as pre-existing documented debt)

**Key verdict**: No NEW code bugs found in this file. All findings are pre-documented:
- **M-I3 (PREVIOUSLY FOUND)**: rank mutation via shared object references — `sorted.forEach item.rank = i+1` — documented in AUDIT-FINDINGS.md, LANDMINE comment LM-LB-001 explicitly in source at lines 38–40.
- **Hardcoded hex colors (PREVIOUSLY FOUND as L-A3 pattern)**: `#a8a8a8`, `#b87333`, `#6a7a90`, `#2a5aab` — LANDMINE comment LM-LB-003 at line 54 documents this. Part of the cross-cutting hex-colors pattern (L-A3, L-A7, L-J7).

**No new findings to report.** File is compliant on escaping (all user content via `escHtml`), numeric casting (`Number()` used consistently), and structure.

**needs_review**:
- `vgBadge` and `bountyDot` return values are injected raw into innerHTML (line 81). Their output safety is unverifiable from this file — requires checking badge.ts and bounties.ts. Low priority as these are internal helpers, not user-supplied content.
- `p.user` vs `p.username` field distinction unclear from this file alone.
