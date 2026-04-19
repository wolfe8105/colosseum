# Stage 2 Outputs — group-banner-css.ts

## Agent 01

### injectGroupBannerCSS
This synchronous function takes no parameters and returns void. It first reads the module-level `_cssInjected` boolean. If true, it returns immediately (singleton guard). If false, it sets `_cssInjected = true`. It then creates a `<style>` element via `document.createElement('style')`. It assigns a multi-line CSS string to `s.textContent` — the string contains all CSS rules for the group banner feature: `.group-banner-zone` (the banner container), `.group-banner-t1` and its child classes for the CSS gradient tier, `.group-banner-t2` (static image tier), `.group-banner-t3` (video tier), `.group-banner-edit-btn` and its hover state, `.group-banner-tier-badge`, the upload sheet styles (`.gb-backdrop`, `.gb-sheet` with animation, `@keyframes gbSlideUp`, and all `.gb-*` child classes). It appends the style element to `document.head`. After this call, the CSS is live in the document for the duration of the page session.

## Agent 02

### injectGroupBannerCSS
No parameters. Checks `_cssInjected` — if already true, early returns (idempotency guard). Sets `_cssInjected = true`. Creates a `<style>` element. Sets its `textContent` to a large CSS string defining all group banner visual styles across banner zone, tier 1 (gradient), tier 2 (image), tier 3 (video), edit button, tier badge, upload sheet (backdrop, sheet, handle, title, subtitle, tier rows, upload button, win-rate section). Appends style to `document.head`. No return value.

## Agent 03

### injectGroupBannerCSS
Reads module state `_cssInjected`. If true, returns immediately — ensures CSS is only injected once per page lifetime. Sets flag true, creates a style element, populates with full CSS for the group banner feature including: banner zone container, three banner tiers (gradient/image/video), edit overlay button, tier badge, slide-up bottom sheet for upload with all child components. Appends to document.head. Void return.

## Agent 04

### injectGroupBannerCSS
Singleton injection function. `_cssInjected` checked first — returns void if already true. Sets `_cssInjected = true`. Creates `document.createElement('style')`, assigns CSS string to `textContent` (not innerHTML — safe practice for CSS injection). Appends to `document.head`. CSS covers: `.group-banner-zone`, tier 1/2/3 banner classes, edit button + hover, tier badge, upload backdrop + sheet with `gbSlideUp` keyframe animation, all `.gb-*` utility classes. Returns void.

## Agent 05

### injectGroupBannerCSS
Reads `_cssInjected` — returns without doing anything if true. Sets `_cssInjected = true`. Creates a style element. Sets `s.textContent` to the full CSS string — note: uses `textContent` assignment which is safe (no HTML parsing). Appends to `document.head`. Effect: after first call, all group banner CSS classes are available in the document. Subsequent calls are no-ops. Contains hardcoded rgba values (e.g. `rgba(212,168,67,0.4)` on `.group-banner-t1-emoji`, `rgba(212,168,67,0.04)` in t1 background, etc.). The CSS uses mostly CSS vars (`--mod-*`) but has a few hardcoded rgba values embedded in the string.
