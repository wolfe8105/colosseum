# Anchor List — src/pages/home.feed.ts (Arbiter Run 1)

1. fetchLiveDebates  (line 10)
2. renderFeed  (line 41)

## Resolution notes

Both agents consistently identified exactly two function definitions. `fetchLiveDebates` (line 10) is an `async function` declaration, not exported. `renderFeed` (line 41) is an `export async function` declaration. All five stage 1 agents agree on both entries; no agent listed any additional candidates. A direct scan of the 81-line source confirms no other top-level function declarations or arrow-function bindings exist. The `.map()` callback on line 21 is an inline callback, not a top-level binding, and is excluded per the rules.
