# Anchor List — arena-feed-references.ts

1. showCiteDropdown  (line 28)
2. showChallengeDropdown  (line 71)
3. hideDropdown  (line 120)
4. showReferencePopup  (line 125)

## Resolution notes

- No candidates excluded. All five agents consistently identified the same four top-level exported function declarations, and direct scan of the source confirms no additional top-level function bindings exist. Inner arrow callbacks passed to `addEventListener` / `forEach` / `querySelectorAll().forEach()` (e.g. `(item) => { ... }` at lines 50-51, 94-95, and `(e) => {...}` at line 151) are inline callbacks and correctly excluded per the rules.
