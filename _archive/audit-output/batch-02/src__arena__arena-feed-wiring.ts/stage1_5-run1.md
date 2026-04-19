# Anchor List — arena-feed-wiring.ts (Arbiter Run 1)

1. renderControls  (line 45)
2. wireDebaterControls  (line 120)
3. wireSpectatorTipButtons  (line 179)
4. handleTip  (line 212)
5. wireModControls  (line 276)
6. submitDebaterMessage  (line 389)
7. submitModComment  (line 421)
8. handlePinClick  (line 449)

## Resolution notes

- pauseFeed: imported from arena-feed-machine but never defined in this file; import-only, not a local function definition
- FEED_SCORE_BUDGET, FEED_MAX_CHALLENGES: constants imported from arena-types, not defined here
- All eleven agents consistently identified the eight function definitions above. No agent listed any class definitions or type bindings. No additional top-level callable was found on direct scan.
