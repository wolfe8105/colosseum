# Stage 3 Verification — group-banner.ts

Anchor list: _renderTier1Fallback (12), renderGroupBanner (22)
Verifiers: 5 agents

---

## Consensus on Stage 2 claims

### _renderTier1Fallback
**Claim 1 (escapeHTML + no-clear):** All 5 agents PASS. `escapeHTML(emoji)` and `escapeHTML(name)` confirmed on lines 16–17. `container.appendChild(wrap)` with no prior clear — correct for else-branch, bug in onerror path.

### renderGroupBanner

**Claim 2 (DOM property assignments):** All 5 agents PASS. `img.src`, `vid.src`, `img.alt` are IDL property assignments, not innerHTML. No XSS surface. `img.alt` via property assignment is safe without escaping.

**Claim 3 (onerror timing / stale broken img):** All 5 PASS on timing fact. 4/5 rate MEDIUM; 1/5 (Agent 04) argues LOW (visual defect only, no data loss, no throw). Settling MEDIUM — confirmed with upgrade note below.

**Claim 4 (tier === 0 blank badge):** All 5 PASS on logic. `['', 'TIER I', 'TIER II', 'TIER III'][0]` = `''`; `'' ?? 'TIER I'` = `''` (nullish coalescing does not catch empty string). Badge renders blank. 4/5 rate MEDIUM; Agent 04 argues LOW (requires `banner_tier = 0` in DB, which is schema-abnormal). **Settling LOW** — abnormal DB state required, no runtime throw or data loss.

**Claim 5 (group.id! non-null assertion):** All 5 PASS. LOW confirmed.

**Claim 6 (URL scheme not validated):** All 5 PASS. `javascript:` on `img.src`/`vid.src` is inert in all current browsers. LOW confirmed (defensive gap, not active vector).

**Claim 7 (Tier 3 silent degradation):** All 5 PASS. LOW confirmed.

---

## Findings

### GB-001 — PRE-EXISTING MEDIUM: onerror appends fallback without clearing broken img (Batch 13R L-L1, severity upgraded)

Previously reported as LOW in Batch 13R. Now confirmed MEDIUM by 4/5 Stage 3 agents.

**File:** src/pages/group-banner.ts  
**Lines:** 45, 46 (`img.onerror` callback)  
**Function:** renderGroupBanner

When `tier >= 2 && staticUrl` branch fires: `img` is appended to `container` (line 46). Then badge (line 53) and conditionally editBtn (lines 57–59) are appended synchronously. When the image URL fails to load, `onerror` fires asynchronously — at that moment container holds `[img(broken), badge, editBtn?]`. `_renderTier1Fallback` calls `container.appendChild(wrap)`, placing the fallback div LAST in the container. The broken `<img>` element is never removed.

Result: broken image icon visible alongside the fallback banner. Badge and editBtn appear between the broken img and the fallback div. Visual layout is fully corrupted.

Fix:
```typescript
img.onerror = () => {
  img.remove();
  _renderTier1Fallback(container, emoji, name);
};
```

### GB-002 — LOW: tier === 0 renders blank badge
**File:** src/pages/group-banner.ts  
**Line:** 52  
**Function:** renderGroupBanner

`const tier = group.banner_tier ?? 1` (line 25) uses `??` — only catches null/undefined, not `0`. If DB stores `banner_tier = 0`, `tier = 0`. Then `['', 'TIER I', 'TIER II', 'TIER III'][0]` = `''`. `'' ?? 'TIER I'` = `''` (??` passes empty string through). `badge.textContent = ''` — badge renders blank.

Requires abnormal DB state (expected values 1–3). No runtime throw, no security impact. LOW.

Fix: change `?? 'TIER I'` to `|| 'TIER I'` at line 52, or clamp `tier` after line 25.

### GB-003 — LOW: group.id! non-null assertion without runtime guard
**File:** src/pages/group-banner.ts  
**Line:** 60  
**Function:** renderGroupBanner

`editBtn.addEventListener('click', () => openBannerUploadSheet(group.id!, tier, wins, losses))` — TypeScript `!` suppresses null check. If `group.id` is undefined at runtime, undefined passes to `openBannerUploadSheet`. Downstream RPC receives null/undefined group ID.

Unlikely in practice (leader is only shown editBtn in valid group context). LOW.

Fix: `if (!group.id) return;` guard inside the click handler.

### GB-004 — LOW: URL scheme not validated on vid.src / img.src
**File:** src/pages/group-banner.ts  
**Lines:** 39, 43  
**Function:** renderGroupBanner

`animatedUrl` and `staticUrl` from DB assigned directly to `.src` without scheme validation. `javascript:` URIs on `<video src>` and `<img src>` are inert in all current browsers. Practical risk near zero. LOW defensive gap — if either URL is ever moved to an `<a href>` or `<iframe src>`, the assumption of safety would change.

### GB-005 — LOW: Tier 3 + null animatedUrl silent visual degradation
**File:** src/pages/group-banner.ts  
**Lines:** 36–48  
**Function:** renderGroupBanner

When `tier === 3` but `animatedUrl` is null (group promoted but asset not yet uploaded), the tier-3 video branch is skipped. Falls through to tier-2 image or tier-1 fallback. Badge still shows "TIER III". No error, no log, no user-visible indication. LOW diagnostic gap.

---

## Missed finding from Stage 3

**LOW — tier > 3 renders static image but badge shows TIER I (Agents 01, 05)**

If `group.banner_tier` is stored as `4` or higher (schema violation), `tier >= 2 && staticUrl` branch fires, rendering the static image. Badge: `['', 'TIER I', 'TIER II', 'TIER III'][4]` = `undefined`, `?? 'TIER I'` = `'TIER I'`. Visual shows static image (tier-2 styling) while badge reads TIER I — cosmetic inconsistency. No user-facing harm. LOW / informational, same root cause as GB-002.

---

## Summary

| ID | Severity | Status | Line | Description |
|----|----------|--------|------|-------------|
| GB-001 | MEDIUM | Pre-existing (Batch 13R L-L1, upgraded) | 45–46 | onerror fallback appends without removing broken img |
| GB-002 | LOW | New | 52 | tier === 0 blank badge — `??` doesn't catch empty string |
| GB-003 | LOW | New | 60 | group.id! non-null assertion without runtime guard |
| GB-004 | LOW | New | 39, 43 | vid.src/img.src no scheme validation |
| GB-005 | LOW | New | 36–48 | Tier 3 null animatedUrl silent degradation |

No HIGH findings. No new MEDIUM findings (GB-001 is pre-existing severity upgrade).
