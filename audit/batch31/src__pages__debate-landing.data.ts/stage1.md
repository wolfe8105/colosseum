# Stage 1 Outputs — debate-landing.data.ts

## Agent 01
1. comment (lines 1-5: JSDoc comment)
2. import (line 7: type-only import of `DebateEntry`)
3. re-export (line 8: export `getFingerprint` from `../config.ts`)
4. comment (lines 10-12: section comment)
5. bind name to value (line 14: `DEBATES` constant, exported)
6. comment (lines 58-60: section comment)
7. bind name to value (line 62: `urlParams` constant)
8. bind name to value (line 63: `topicSlug` constant, exported)
9. bind name to value (line 64: `customTitle` constant, exported)
10. bind name to value (line 65: `source` constant, exported)
11. comment (line 67: inline comment)
12. top-level statement (lines 68-84: if statement with conditional side effects)
13. bind name to value (line 86: `debate` constant, exported)
14. bind name to value (line 87: `voteKey` constant, exported)
15. comment (lines 89-90: inline comment)
16. top-level statement (line 90: document.title assignment)
17. blank (line 92)

## Agent 02
1. comment (lines 1-5: JSDoc comment)
2. import (line 7: `import type { DebateEntry }`)
3. re-export (line 8: `export { getFingerprint } from '../config.ts'`)
4. comment (lines 10-12: comment block)
5. bind name to value (line 14: `export const DEBATES`)
6. comment (lines 58-60: comment block)
7. top-level statement (line 62: `const urlParams = new URLSearchParams(window.location.search)`)
8. bind name to value (line 63: `export const topicSlug`)
9. bind name to value (line 64: `export const customTitle`)
10. bind name to value (line 65: `export const source`)
11. comment (line 67: comment)
12. top-level statement (line 68: if block with custom topic initialization)
13. bind name to value (lines 69, 73-76: inner const bindings within if block)
14. bind name to value (line 86: `export const debate`)
15. bind name to value (line 87: `export const voteKey`)
16. comment (line 89)
17. top-level statement (line 90: document.title assignment)

## Agent 03
1. comment (lines 1-5)
2. import type (line 7) — import DebateEntry from debate-landing.types.ts
3. re-export (line 8) — re-export getFingerprint from ../config.ts
4. comment (lines 10-12)
5. bind name to value (line 14, exported) — DEBATES
6. comment (lines 58-60)
7. top-level statement (line 62) — URLSearchParams instantiation
8. bind name to value (line 63, exported) — topicSlug
9. bind name to value (line 64, exported) — customTitle
10. bind name to value (line 65, exported) — source
11. comment (line 67)
12. top-level statement (lines 68-84) — conditional block that mutates DEBATES
13. bind name to value (line 86, exported) — debate
14. bind name to value (line 87, exported) — voteKey
15. comment (line 89)
16. top-level statement (line 90) — document.title assignment
17. blank (line 92)

## Agent 04
1. comment
2. blank
3. import (type-only) `DebateEntry`
4. re-export `getFingerprint`
5. blank
6. comment
7. blank
8. bind name to value `DEBATES` (exported)
9. blank
10. comment
11. blank
12. bind name to value `topicSlug` (exported)
13. bind name to value `customTitle` (exported)
14. bind name to value `source` (exported)
15. blank
16. comment
17. top-level statement (if block: custom topic initialization)
18. blank
19. bind name to value `debate` (exported)
20. bind name to value `voteKey` (exported)
21. blank
22. comment
23. top-level statement (document.title assignment)
24. blank

## Agent 05
1. comment (lines 1-5)
2. import (type-only import: `DebateEntry`)
3. re-export (export `getFingerprint` from `../config.ts`)
4. comment (lines 10-12)
5. bind name to value: `DEBATES` (exported, Record type)
6. comment (lines 58-60)
7. top-level statement: `const urlParams = new URLSearchParams(window.location.search)` (line 62)
8. bind name to value: `topicSlug` (exported, assigned from urlParams)
9. bind name to value: `customTitle` (exported, assigned from urlParams)
10. bind name to value: `source` (exported, assigned from urlParams)
11. comment (line 67)
12. top-level statement: if block (lines 68-84, conditional population of DEBATES)
13. bind name to value: `debate` (exported, assigned from DEBATES lookup)
14. bind name to value: `voteKey` (exported, string concatenation)
15. comment (lines 89-90)
16. top-level statement: `document.title = debate.topic + ' — The Moderator'` (line 90)
17. blank (line 92)
