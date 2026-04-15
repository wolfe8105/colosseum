# Anchor List — arena-entrance.ts

1. _injectCSS  (line 25)
2. _getTier  (line 324)
3. playEntranceSequence  (line 342)
4. _esc  (line 403)
5. _renderTier1  (line 409)
6. _renderTier2  (line 436)
7. _renderTier3  (line 464)

## Resolution notes

All seven candidates were confirmed present in the source file as top-level `function` declarations. No candidates were excluded. No additional function definitions were found during the direct source scan that the agents missed. `_cssInjected` (line 23) was correctly classified by all agents as a plain value binding (`let _cssInjected = false`), not a function definition, and is excluded on that basis.
