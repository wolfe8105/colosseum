# Anchor List — src/pages/group-banner.ts

Source: src/pages/group-banner.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. _injectCSS  (line 22)
2. renderGroupBanner  (line 223)
3. _renderTier1Fallback  (line 280)
4. openBannerUploadSheet  (line 295)
5. _closeSheet  (line 395)
6. _uploadBanner  (line 405)

## Resolution notes

Both arbiter runs agreed with no contested items.

- `_cssInjected` (line 20): excluded — plain `let` boolean binding, not a function definition.
- Inline callbacks passed to `addEventListener` (lines 273, 371, 374, 381, 384, 390): excluded — not top-level named bindings.
- `img.onerror` assignment (line 255): excluded — inline callback assigned to a property, not a top-level named binding.
