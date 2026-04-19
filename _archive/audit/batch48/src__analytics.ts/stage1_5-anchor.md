# Anchor List — analytics.ts

Source: src/analytics.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. trackEvent  (line 32)
2. checkSignup  (line 84)

## Resolution notes
Both arbiter runs agreed. `trackEvent` (line 32) and `checkSignup` (line 84) are the only top-level function definitions. `ModeratorAnalytics` (line 109) excluded — it is a `const` bound to an object literal referencing existing functions, not a function binding itself.
