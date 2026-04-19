# Stage 1 Outputs — src/async.render.ts

## Agent 01

1. comment — block comment (file header: "THE MODERATOR — Async Module: Rendering …")
2. blank
3. import — `state` from `./async.state.ts`
4. import — type-only: `HotTake`, `Prediction`, `StandaloneQuestion`, `CategoryFilter` from `./async.types.ts`
5. import — `escapeHTML`, `FEATURES` from `./config.ts`
6. import — `vgBadge` from `./badge.ts`
7. import — `bountyDot` from `./bounties.ts`
8. import — `getCurrentUser`, `getCurrentProfile` from `./auth.ts`
9. blank
10. bind name to value — `const esc = escapeHTML`
11. blank
12. comment — section divider ("WIRING CALLBACKS (set by orchestrator)")
13. blank
14. bind name to type — `type WireFn = (container: HTMLElement) => void`
15. bind name to value — `let _wireTakes: WireFn | undefined`
16. bind name to value — `let _wirePredictions: WireFn | undefined`
17. blank
18. bind name to function definition — `export function _registerWiring(takes, predictions): void` (exported)
19. blank
20. comment — section divider ("HOT TAKES — LOAD + RENDER")
21. blank
22. bind name to function definition — `export function loadHotTakes(category): void` (exported)
23. blank
24. bind name to function definition — `function _renderTake(t): string`
25. blank
26. bind name to function definition — `function _renderModeratorCard(isGuest): string`
27. blank
28. comment — section divider ("PREDICTIONS — RENDER")
29. blank
30. bind name to function definition — `export function renderPredictions(container): void` (exported)
31. blank
32. bind name to function definition — `function _renderPredictionCard(p): string`
33. blank
34. bind name to function definition — `function _renderStandaloneCard(q): string`
35. blank
36. comment — section divider ("WAGER PICKER")
37. blank
38. bind name to value — `let _activeWagerDebateId: string | null = null`
39. blank
40. bind name to function definition — `export function _showWagerPicker(debateId, side): void` (exported)
41. blank
42. bind name to function definition — `export function _hideWagerPicker(): void` (exported)

## Agent 02

1. comment — JSDoc block (lines 1–6)
2. blank
3. import — `state` from `./async.state.ts`
4. import — type-only: `HotTake`, `Prediction`, `StandaloneQuestion`, `CategoryFilter` from `./async.types.ts`
5. import — `escapeHTML`, `FEATURES` from `./config.ts`
6. import — `vgBadge` from `./badge.ts`
7. import — `bountyDot` from `./bounties.ts`
8. import — `getCurrentUser`, `getCurrentProfile` from `./auth.ts`
9. blank
10. bind name to value — `esc` (alias for `escapeHTML`)
11. blank
12. comment — section divider: WIRING CALLBACKS
13. blank
14. bind name to type — `WireFn` (type alias)
15. bind name to value — `_wireTakes` (`let`, `WireFn | undefined`)
16. bind name to value — `_wirePredictions` (`let`, `WireFn | undefined`)
17. blank
18. bind name to function definition — `_registerWiring` (exported)
19. blank
20. comment — section divider: HOT TAKES — LOAD + RENDER
21. blank
22. bind name to function definition — `loadHotTakes` (exported)
23. blank
24. bind name to function definition — `_renderTake`
25. blank
26. bind name to function definition — `_renderModeratorCard`
27. blank
28. comment — section divider: PREDICTIONS — RENDER
29. blank
30. bind name to function definition — `renderPredictions` (exported)
31. blank
32. bind name to function definition — `_renderPredictionCard`
33. blank
34. bind name to function definition — `_renderStandaloneCard`
35. blank
36. comment — section divider: WAGER PICKER
37. blank
38. bind name to value — `_activeWagerDebateId` (`let`, `string | null`, initialized to `null`)
39. blank
40. bind name to function definition — `_showWagerPicker` (exported)
41. blank
42. bind name to function definition — `_hideWagerPicker` (exported)

## Agent 03

1. comment — block comment (file header doc comment, lines 1–6)
2. import — `import { state } from './async.state.ts'`
3. import — `import type { HotTake, Prediction, StandaloneQuestion, CategoryFilter } from './async.types.ts'` (type-only)
4. import — `import { escapeHTML, FEATURES } from './config.ts'`
5. import — `import { vgBadge } from './badge.ts'`
6. import — `import { bountyDot } from './bounties.ts'`
7. import — `import { getCurrentUser, getCurrentProfile } from './auth.ts'`
8. blank
9. bind name to value — `const esc = escapeHTML`
10. blank
11. comment — section divider comment (`WIRING CALLBACKS`)
12. blank
13. bind name to type — `type WireFn = (container: HTMLElement) => void`
14. bind name to value — `let _wireTakes: WireFn | undefined`
15. bind name to value — `let _wirePredictions: WireFn | undefined`
16. blank
17. bind name to function definition — `export function _registerWiring(...)` (exported)
18. blank
19. comment — section divider comment (`HOT TAKES — LOAD + RENDER`)
20. blank
21. bind name to function definition — `export function loadHotTakes(...)` (exported)
22. blank
23. bind name to function definition — `function _renderTake(...)`
24. blank
25. bind name to function definition — `function _renderModeratorCard(...)`
26. blank
27. comment — section divider comment (`PREDICTIONS — RENDER`)
28. blank
29. bind name to function definition — `export function renderPredictions(...)` (exported)
30. blank
31. bind name to function definition — `function _renderPredictionCard(...)`
32. blank
33. bind name to function definition — `function _renderStandaloneCard(...)`
34. blank
35. comment — section divider comment (`WAGER PICKER`)
36. blank
37. bind name to value — `let _activeWagerDebateId: string | null = null`
38. blank
39. bind name to function definition — `export function _showWagerPicker(...)` (exported)
40. blank
41. bind name to function definition — `export function _hideWagerPicker()` (exported)

## Agent 04

1. comment — block comment: module header ("THE MODERATOR — Async Module: Rendering …")
2. blank
3. import — `state` from `./async.state.ts`
4. import — type-only: `HotTake`, `Prediction`, `StandaloneQuestion`, `CategoryFilter` from `./async.types.ts`
5. import — `escapeHTML`, `FEATURES` from `./config.ts`
6. import — `vgBadge` from `./badge.ts`
7. import — `bountyDot` from `./bounties.ts`
8. import — `getCurrentUser`, `getCurrentProfile` from `./auth.ts`
9. blank
10. bind name to value — `esc` (assigned `escapeHTML`)
11. blank
12. comment — section divider: "WIRING CALLBACKS (set by orchestrator)"
13. blank
14. bind name to type — `WireFn` (type alias)
15. bind name to value — `_wireTakes` (let, `WireFn | undefined`)
16. bind name to value — `_wirePredictions` (let, `WireFn | undefined`)
17. blank
18. bind name to function definition — `_registerWiring` (exported)
19. blank
20. comment — section divider: "HOT TAKES — LOAD + RENDER"
21. blank
22. bind name to function definition — `loadHotTakes` (exported)
23. blank
24. bind name to function definition — `_renderTake`
25. blank
26. bind name to function definition — `_renderModeratorCard`
27. blank
28. comment — section divider: "PREDICTIONS — RENDER"
29. blank
30. bind name to function definition — `renderPredictions` (exported)
31. blank
32. bind name to function definition — `_renderPredictionCard`
33. blank
34. bind name to function definition — `_renderStandaloneCard`
35. blank
36. comment — section divider: "WAGER PICKER"
37. blank
38. bind name to value — `_activeWagerDebateId` (let, `string | null`, initialized `null`)
39. blank
40. bind name to function definition — `_showWagerPicker` (exported)
41. blank
42. bind name to function definition — `_hideWagerPicker` (exported)

## Agent 05

1. comment — block comment (lines 1–6): JSDoc header describing the module.
2. import — `import { state } from './async.state.ts'`
3. import — `import type { HotTake, Prediction, StandaloneQuestion, CategoryFilter } from './async.types.ts'` (type-only)
4. import — `import { escapeHTML, FEATURES } from './config.ts'`
5. import — `import { vgBadge } from './badge.ts'`
6. import — `import { bountyDot } from './bounties.ts'`
7. import — `import { getCurrentUser, getCurrentProfile } from './auth.ts'`
8. blank
9. bind name to value — `const esc = escapeHTML`
10. blank
11. comment — section divider: `WIRING CALLBACKS (set by orchestrator)`
12. blank
13. bind name to type — `type WireFn`
14. bind name to value — `let _wireTakes: WireFn | undefined`
15. bind name to value — `let _wirePredictions: WireFn | undefined`
16. blank
17. bind name to function definition — `export function _registerWiring` (exported)
18. blank
19. comment — section divider: `HOT TAKES — LOAD + RENDER`
20. blank
21. bind name to function definition — `export function loadHotTakes` (exported)
22. blank
23. bind name to function definition — `function _renderTake`
24. blank
25. bind name to function definition — `function _renderModeratorCard`
26. blank
27. comment — section divider: `PREDICTIONS — RENDER`
28. blank
29. bind name to function definition — `export function renderPredictions` (exported)
30. blank
31. bind name to function definition — `function _renderPredictionCard`
32. blank
33. bind name to function definition — `function _renderStandaloneCard`
34. blank
35. comment — section divider: `WAGER PICKER`
36. blank
37. bind name to value — `let _activeWagerDebateId: string | null = null`
38. blank
39. bind name to function definition — `export function _showWagerPicker` (exported)
40. blank
41. bind name to function definition — `export function _hideWagerPicker` (exported)
