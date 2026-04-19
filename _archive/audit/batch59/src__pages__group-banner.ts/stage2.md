# Stage 2 Runtime Walk — group-banner.ts

Anchor list: _renderTier1Fallback (12), renderGroupBanner (22)

---

## Agent 01

### _renderTier1Fallback (line 12)
Line 13: Creates new div, assigns to `wrap`.
Line 14: Sets `wrap.className` to static string — safe.
Lines 15-18: Sets `wrap.innerHTML` via template literal. `emoji` and `name` both pass through `escapeHTML()`. Third child (`group-banner-t1-stripe`) is static. No unescaped user data enters innerHTML.
Line 19: `container.appendChild(wrap)` — DOM method, no serialization risk.
No issues.

### renderGroupBanner (line 22)
Line 23: `injectGroupBannerCSS()` — side effect, no data.
Lines 25-31: Local vars from `group`: `tier` (numeric, `?? 1`), `staticUrl` (URL|null), `animatedUrl` (URL|null), `emoji` (string, `||` fallback), `name` (string, `||` fallback), `wins`/`losses` (numeric, `?? 0`).
Line 33: `container.innerHTML = ''` — clears container.
Line 34: `container.className = 'group-banner-zone'` — static string.
Lines 36-40 (tier 3): Creates `<video>`. `vid.src = animatedUrl` via DOM property — not innerHTML, no XSS. Boolean attributes (`autoplay`, `loop`, `muted`, `playsInline`) safe.
Lines 41-46 (tier 2): Creates `<img>`. `img.src = staticUrl` via DOM property — safe. `img.alt = name` via DOM property — not innerHTML, no XSS. `img.onerror` assigns callback.
Line 48: else branch calls `_renderTier1Fallback` directly — safe.
Lines 51-53: `badge.textContent` (not innerHTML) — XSS-safe. Array index `[tier]` with out-of-range values returns `undefined`, `?? 'TIER I'` catches it correctly.
Lines 55-60: `editBtn.textContent` static string. Click handler calls `openBannerUploadSheet(group.id!, ...)`. `group.id!` is compile-time only — if `group.id` is `undefined` at runtime, undefined passes to callee.

### Findings
LOW — Line 60: `group.id!` non-null assertion without runtime guard. If `group.id` is undefined at runtime, undefined silently passes to `openBannerUploadSheet`.

---

## Agent 02

### _renderTier1Fallback (line 12)
Lines 13-14: Creates div, sets static className — safe.
Lines 15-18: `wrap.innerHTML` with `escapeHTML(emoji)` and `escapeHTML(name)` — safe.
Line 19: `container.appendChild(wrap)` — no clearing done here; this is an append-only function.
Clean.

### renderGroupBanner (line 22)
Line 23: CSS injection, no data.
Lines 25-31: Group field extraction with defaults.
Line 33: `container.innerHTML = ''` — clear.
Line 34: Static className — safe.
Lines 36-40: `vid.src = animatedUrl` via JS property — safe from XSS. `javascript:` on `<video src>` is inert.
Lines 41-46: `img.src = staticUrl` property assignment — safe. `img.alt = name` property assignment — safe (no HTML parsing for `.alt`). `img.onerror` callback: when fires, `img` is already in container. `_renderTier1Fallback` appends new div WITHOUT removing img. Container ends up with broken img + fallback div as siblings. Badge and editBtn already appended synchronously before onerror fires, so final DOM order: [img(broken), badge, editBtn?, fallback-div]. Visual layout corrupted.
Line 48: Direct fallback call — safe.
Lines 51-53: `badge.textContent` — safe.
Lines 55-60: Edit button, `group.id!` non-null assertion — LOW.

### Findings
MEDIUM — Line 45 / `img.onerror`: Fallback appends without clearing broken img. Container holds [img(broken), badge, editBtn?, fallback-div] after onerror fires. Fallback placement is wrong and broken img remains visible.
LOW — Lines 36, 40: `animatedUrl`/`staticUrl` assigned to `.src` without scheme validation. `javascript:` is inert on media elements but URL not validated against expected origin.
LOW — Line 60: `group.id!` non-null assertion without runtime guard.

---

## Agent 03

### _renderTier1Fallback (line 12)
Line 13: Create div.
Line 14: Static className.
Lines 15-18: innerHTML with `escapeHTML(emoji)` and `escapeHTML(name)` — safe.
Line 19: `container.appendChild(wrap)` — append-only, does not clear container.
Clean. The no-clear behavior is correct when called from else-branch (container already cleared). Bug manifests in onerror path.

### renderGroupBanner (line 22)
Line 23: CSS injection.
Lines 25-31: Field extraction from group.
Line 33: `container.innerHTML = ''` — clear.
Line 34: Static className.
Lines 36-40: Tier 3 video branch. `vid.src = animatedUrl` via property — `javascript:` on `<video src>` does not execute script.
Lines 41-46: Tier 2 image branch. `img.src = staticUrl`, `img.alt = name` — both via DOM property, safe. `img.onerror` → `_renderTier1Fallback`. When onerror fires: img is in container. Fallback appends without removing img. Container contains broken img + fallback div simultaneously.
Line 48: Direct fallback — clean path.
Lines 51-53: `badge.textContent` safe.
Lines 55-60: `group.id!` assertion — MEDIUM (passes null to RPC if group.id absent).

### Findings
MEDIUM — Line 45 / onerror: Stale broken img left in container alongside fallback. Fix: `img.onerror = () => { img.remove(); _renderTier1Fallback(container, emoji, name); }`.
MEDIUM — Line 60: `group.id!` non-null assertion. If group.id is null/undefined, `openBannerUploadSheet` receives undefined — downstream RPC may fail silently or throw.
LOW — Lines 36, 40: `vid.src`/`img.src` without scheme validation. Defensive gap.

---

## Agent 04

### _renderTier1Fallback (line 12)
Lines 13-14: Create div, static className.
Lines 15-18: innerHTML with `escapeHTML(emoji)` and `escapeHTML(name)` — safe.
Line 19: appendChild — no clear.
No issues.

### renderGroupBanner (line 22)
Line 23: CSS injection.
Line 25: `tier = group.banner_tier ?? 1`. `??` only catches null/undefined — a stored value of `0` is preserved as `0`, not defaulted to `1`.
Lines 26-31: URL/string/numeric field extraction.
Line 33: `container.innerHTML = ''`.
Line 34: Static className.
Lines 36-40: Tier 3 video. `vid.src` via property — safe.
Lines 41-46: Tier 2 image. `img.src`, `img.alt = name` via property — safe. `img.onerror` appends fallback without clearing — onerror fires after badge/editBtn already appended synchronously.
Line 48: Direct fallback.
Lines 51-53: `badge.textContent = ['', 'TIER I', 'TIER II', 'TIER III'][tier] ?? 'TIER I'`. If `tier === 0`: array returns `''` (empty string). `''` is not null/undefined, so `??` does NOT catch it. Badge renders blank. `tier === 0` can reach here because `?? 1` on line 25 only substitutes for null/undefined, not for `0`.
Lines 53-60: `editBtn.textContent` static. `group.id!` — runtime undefined risk.

### Findings
MEDIUM — Line 51: `tier === 0` produces blank badge. `['', ...][0]` = `''`, `?? 'TIER I'` does not catch falsy empty string. Fix: change `?? 'TIER I'` to `|| 'TIER I'`, or clamp tier to `Math.max(1, Math.min(3, tier))` after line 25.
LOW — Line 45 / onerror ordering: fallback div appended after badge/editBtn in DOM when onerror fires. Layout broken.
LOW — Line 60: `group.id!` non-null assertion.

---

## Agent 05

### _renderTier1Fallback (line 12)
Lines 13-19: Create div, static className, innerHTML with `escapeHTML(emoji)` / `escapeHTML(name)`. Append-only, no clear. Safe.

### renderGroupBanner (line 22)
Line 23: CSS injection.
Lines 25-31: Field extraction.
Line 33: Clear container.
Line 34: Static className.
Lines 37-39: `vid.src = animatedUrl` property assignment — `javascript:` on video src is inert.
Lines 42-44: `img.src = staticUrl` property — safe. `img.alt = name` property — safe (no HTML parsing for .alt).
Line 45: `img.onerror` — fires async after container already has img + badge + editBtn. `_renderTier1Fallback` appends fallback last. Container: [img(broken), badge, editBtn?, fallback-div].
Line 48: Direct fallback — clean.
Lines 51-53: `badge.textContent` — textContent safe. `??` fallback catches undefined for out-of-range tier.
Lines 55-60: `editBtn.textContent` static. `group.id!` — argument passed to function, not DOM/SQL interpolated here, but undefined risk exists.

### Findings
MEDIUM — Line 45 / onerror: Broken img not removed before fallback append. Container corrupted. Fix: `img.onerror = () => { img.remove(); _renderTier1Fallback(container, emoji, name); }`.
LOW — Lines 36-41: Tier 3 with null animatedUrl silently falls through to tier 2 or tier 1, but badge still shows "TIER III". No warning, no logging. Diagnostic gap for leaders.
LOW — Line 44: `img.alt = name` confirmed safe. Property assignment, no HTML parsing. No fix needed.
