# Anchor List — src/arena/arena-match-found.ts
1. clearQueueTimersInline  (line 34)
2. onMatchFound  (line 39)
3. showMatchFound  (line 70)
4. onMatchDecline  (line 122)
5. returnToQueueAfterDecline  (line 130)
6. startAIDebate  (line 139)

## Resolution notes
- clearQueueTimersInline (line 34): top-level `function` declaration, not exported; meets definition.
- onMatchFound (line 39): exported top-level `function` declaration.
- showMatchFound (line 70): exported top-level `function` declaration; inner arrow callbacks at lines 103, 106, 112 are inline event handlers, correctly excluded.
- onMatchDecline (line 122): exported top-level `function` declaration.
- returnToQueueAfterDecline (line 130): exported top-level `function` declaration.
- startAIDebate (line 139): exported top-level `async function` declaration.
