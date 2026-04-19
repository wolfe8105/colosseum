# Anchor List — analytics.ts

1. trackEvent  (line 32)
2. checkSignup  (line 84)

## Resolution notes
- `ModeratorAnalytics` (line 109): excluded — all agents classified as "bind name to value"; confirmed as `const` bound to an object literal, not a function expression. Object literal references functions defined elsewhere, not new callable bindings.
