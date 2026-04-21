# Anchor List — arena-feed-machine-pause.ts

1. pauseFeed  (line 32)
2. unpauseFeed  (line 88)
3. showChallengeRulingPanel  (line 123)

## Resolution notes
- handleRuling (line 143): inner arrow function defined inside showChallengeRulingPanel, not top-level.
