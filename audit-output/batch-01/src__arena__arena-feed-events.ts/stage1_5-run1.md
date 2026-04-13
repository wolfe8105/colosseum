# Anchor List — arena-feed-events.ts

1. appendFeedEvent  (line 34)
2. addLocalSystem  (line 273)
3. writeFeedEvent  (line 283)

## Resolution notes

No candidates were excluded. All eleven agents identified the same three functions — `appendFeedEvent`, `addLocalSystem`, and `writeFeedEvent` — and all three are confirmed by direct inspection of the source as top-level exported function declarations using the `function` keyword. No additional top-level function definitions were found by scanning the source. Inner constructs such as the `animationend` callback on line 117 and the `.map()` callback on lines 195–197 are inline callbacks and are excluded per the rules.
