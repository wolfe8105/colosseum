# Anchor List — src/pages/group-banner.ts

1. _injectCSS  (line 22)
2. renderGroupBanner  (line 223)
3. _renderTier1Fallback  (line 280)
4. openBannerUploadSheet  (line 295)
5. _closeSheet  (line 395)
6. _uploadBanner  (line 405)

---

**Resolution notes**

- `_cssInjected` (line 20): excluded — plain `let` boolean binding, not a function definition.
- Inline arrow callbacks on lines 255, 273, 371, 374, 381, 384, 390: excluded — all are inner callbacks passed to `addEventListener`, `.querySelector`, or assigned as `onerror`; none are top-level named bindings.
- All five agents agreed on exactly the six function definitions above; no agent listed any additional candidate, and a direct scan of the source confirms no top-level named function binding was missed.
