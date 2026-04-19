# Anchor List — home.feed.ts

1. fetchLiveDebates  (line 10)
2. renderFeed  (line 41)

---

**Resolution notes**

No candidates were excluded. All five agents identified the same two function definitions — `fetchLiveDebates` (async function declaration, not exported) and `renderFeed` (async function declaration, exported) — and source inspection confirms both. No additional top-level callable bindings exist in the file. The `.map()` callback on line 21 is an inline callback and is excluded per the rules.
