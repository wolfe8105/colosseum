# Anchor List — group-banner.ts (Arbiter Run 2)

1. `_renderTier1Fallback`  (line 12)
2. `renderGroupBanner`  (line 22)

## Resolution notes
Confirmed unanimously. The two top-level named callable bindings are the only anchors in this file. The `img.onerror = () => ...` assignment on line 46 and the `editBtn.addEventListener('click', () => ...)` callback on line 58 are inner callbacks and are excluded. No corrections needed.
