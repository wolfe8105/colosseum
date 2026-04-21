# Anchor List — arena-match-found.ts
1. clearQueueTimersInline  (line 34)
2. onMatchFound  (line 39)
3. showMatchFound  (line 70)
4. onMatchDecline  (line 122)
5. returnToQueueAfterDecline  (line 130)
6. startAIDebate  (line 139)

## Resolution notes
- clearQueueTimersInline (line 34): top-level `function` declaration, not exported.
- onMatchFound (line 39): exported `function` declaration.
- showMatchFound (line 70): exported `function` declaration.
- onMatchDecline (line 122): exported `function` declaration.
- returnToQueueAfterDecline (line 130): exported `function` declaration.
- startAIDebate (line 139): exported `async function` declaration.
- Inline handlers inside showMatchFound (addEventListener callbacks at ~lines 103-106 and setInterval callback at line 112) excluded per rules.
