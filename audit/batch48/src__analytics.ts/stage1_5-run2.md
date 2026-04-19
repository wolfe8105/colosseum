# Anchor List — analytics.ts

1. trackEvent  (line 32)
2. checkSignup  (line 84)

## Resolution notes
- `ModeratorAnalytics` (line 109): excluded — all agents classified as "bind name to value"; confirmed as `const` assigned to object literal `{ trackEvent, checkSignup, ... } as const`. Not a function expression. Object literal methods excluded per criteria.
