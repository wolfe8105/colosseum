# Anchor List — group-banner.ts (Arbiter Run 1)

1. `_renderTier1Fallback`  (line 12)
2. `renderGroupBanner`  (line 22)

## Resolution notes
Confirmed unanimously. The two top-level callable bindings are `_renderTier1Fallback` (unexported function declaration, line 12) and `renderGroupBanner` (exported function declaration, line 22). The `img.onerror` assignment and `editBtn.addEventListener('click', ...)` callback are inner expressions and are correctly excluded. No corrections needed.
