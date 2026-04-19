# Anchor List — plinko-step1-method.ts

1. handleOAuth  (line 13)
2. attachStep1  (line 22)

## Resolution notes
- `isPlaceholder` (line 11): excluded — const binding to a scalar import, not a function expression.
- Anonymous callbacks passed to addEventListener (lines 23, 24, 26, 38): excluded — inner callbacks, not top-level named bindings.
