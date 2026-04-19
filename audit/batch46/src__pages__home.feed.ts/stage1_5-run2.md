# Anchor List — home.feed.ts

1. fetchLiveDebates  (line 10)
2. renderFeed  (line 41)

---

**Resolution notes**

No candidates were excluded. All five agents unanimously identified the same two function definitions (`fetchLiveDebates` and `renderFeed`), and the source file confirms both: `fetchLiveDebates` is an `async function` declaration at line 10 (not exported), and `renderFeed` is an `export async function` declaration at line 41. No additional top-level function definitions were found on direct scan. The `.map()` callback at line 21 is an inline callback and is excluded per the rules.
