# Anchor List — arena-feed-references.ts

1. showCiteDropdown  (line 28)
2. showChallengeDropdown  (line 71)
3. hideDropdown  (line 120)
4. showReferencePopup  (line 125)

## Resolution notes

- No candidates excluded. All five agents unanimously identified the four top-level exported function declarations, and direct scan of the source confirms no additional top-level function bindings exist. The inline async callbacks passed to `addEventListener` (lines 51, 95, 150, 151) and the arrow inside `.map()` (line 58) are inline callbacks, not top-level definitions, and correctly went unlisted.
