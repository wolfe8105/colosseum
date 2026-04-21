# Anchor List — group-banner-upload.ts

1. openBannerUploadSheet  (line 15)
2. _closeSheet  (line 70)
3. _uploadBanner  (line 76)

## Resolution notes

- All five agents agreed on the same three top-level function definitions; source confirms each is a top-level named callable binding (two `export function`, one `async function`).
- Direct scan of source found no additional top-level function definitions; inline arrow callbacks passed to `addEventListener` (lines 55, 56, 61, 62, 67) and to `setTimeout` (line 73) are excluded per the rules.
