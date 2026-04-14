# Anchor List — src/pages/home.feed.ts (Arbiter Run 2)

1. fetchLiveDebates  (line 10)
2. renderFeed  (line 41)

## Resolution notes

All five stage 1 agents agreed on exactly two function definitions: `fetchLiveDebates` (async function declaration, not exported, line 10) and `renderFeed` (async function declaration, exported, line 41). Direct inspection of the source confirms both. No agent disagreed, and no additional top-level function definitions exist in the file. The `.map()` callback on line 21 is an inline callback and is excluded per the rules.
