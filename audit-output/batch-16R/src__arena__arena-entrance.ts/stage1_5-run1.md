# Anchor List — arena-entrance.ts

1. _injectCSS  (line 25)
2. _getTier  (line 324)
3. playEntranceSequence  (line 342)
4. _esc  (line 403)
5. _renderTier1  (line 409)
6. _renderTier2  (line 436)
7. _renderTier3  (line 464)

## Resolution notes

No candidates were excluded. All five agents agreed unanimously on the same seven function bindings, and direct source inspection confirms each one is a top-level named callable binding (`function` declaration or `const`/`let` binding to a function expression). No agent-missed functions were found upon direct scan. The `_cssInjected` variable (line 23) was correctly classified by all agents as a plain value binding, not a function, and is not included. The `new Promise(resolve => ...)` callback inside `playEntranceSequence` (line 343) and the `setTimeout` callbacks (lines 388, 391) are inline callbacks, not top-level named bindings, and are excluded.
