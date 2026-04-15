# Anchor List — src/pages/group-banner.ts

1. `_injectCSS`  (line 22)
2. `renderGroupBanner`  (line 223)
3. `_renderTier1Fallback`  (line 280)
4. `openBannerUploadSheet`  (line 295)
5. `_closeSheet`  (line 395)
6. `_uploadBanner`  (line 405)

## Resolution notes

- `_cssInjected` (line 20): excluded — it is a `let` boolean binding, not a function definition.
- All callbacks passed to `addEventListener` (lines 273, 371, 374, 381, 384, 390): excluded — inline callbacks passed to event registration calls, not top-level named bindings.
- `img.onerror` assignment (line 255): excluded — an inline callback assigned to a property, not a top-level named binding.
