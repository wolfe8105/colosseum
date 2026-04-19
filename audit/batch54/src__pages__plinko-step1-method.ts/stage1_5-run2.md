# Anchor List — plinko-step1-method.ts

1. handleOAuth  (line 13)
2. attachStep1  (line 22)

## Resolution notes
- `isPlaceholder` (line 11): excluded — const binding to scalar import, not function expression.
- Anonymous function (line 26) and async arrow (line 38): excluded — inner callbacks inside attachStep1.
