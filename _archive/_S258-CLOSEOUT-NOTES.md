# _S258 CLOSEOUT NOTES

Short-lived conventions and status decisions made at the end of S258. Roll forward into the S259 handoff when written.

---

## Silent-catch tally convention — DECIDED: literal count

**Current value:** 21

**Convention:** Every physical `catch` block that swallows its error without rethrow, log, or user-visible handling increments the count by 1. Clustering of related catches (e.g., three catches in the same try/try/try chain implementing one design intent) does not collapse the count — each physical occurrence is 1.

**Why literal over design-intent:** The deferred grep sweep is the downstream consumer of this tally. A grep sweep operates on physical occurrences, not design clusters. Literal count gives a direct before/after metric when the sweep eventually runs: `21 → N` is verifiable mechanically. The design-intent count (currently 17) is a useful secondary lens for prioritizing which clusters to address first, but it can always be re-derived from the literal list, whereas the reverse direction requires re-auditing from scratch.

**Going forward:** New silent catches found during any session increment the literal count by 1 per physical occurrence. Cluster grouping is a separate annotation on the eventual sweep's worklist, not a replacement for the count.

---

## S257 drift precedent — STATUS: unchanged

Intentional markdown/Figma drift list going into S259:

- `===` (markdown) → `is` (Figma)
- `!==` (markdown) → `is not` (Figma)
- `/` (markdown) → `or` (Figma)
- `*` (markdown) → omitted or reworded (Figma)
- Math operators in F-09 (markdown) → plain English (Figma)
- F-46 DECLINE BROKEN annotation (Figma-only, not in markdown)

No new drift classes added in S258. The S258 `>=` escape was patched in the markdown pre-push (not added to the drift list) because it was a compliance failure, not an intentional divergence. The v1.3 C-1 candidate closes the hole that allowed it.

---

**END OF CLOSEOUT NOTES.**
