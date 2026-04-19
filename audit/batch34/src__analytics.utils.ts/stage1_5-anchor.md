# Anchor List — analytics.utils.ts

Source: src/analytics.utils.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. migrateKeys  (line 43)
2. isOptedOut  (line 60)
3. setAnalyticsOptOut  (line 69)
4. getVisitorId  (line 85)
5. getTrafficSource  (line 110)
6. getUserId  (line 134)

## Resolution notes

Both arbiter runs agreed. No candidates excluded. Inner `.replace()` callback at line 93 is correctly excluded as it is not a top-level named binding.
