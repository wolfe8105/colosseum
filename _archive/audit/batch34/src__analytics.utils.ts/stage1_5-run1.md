# Anchor List — analytics.utils.ts

1. migrateKeys (line 43)
2. isOptedOut (line 60)
3. setAnalyticsOptOut (line 69)
4. getVisitorId (line 85)
5. getTrafficSource (line 110)
6. getUserId (line 134)

## Resolution notes

No candidates were excluded. The inline callback at line 93 inside getVisitorId (the `.replace()` callback) was not listed by any agent and correctly excluded as an inner helper function.
