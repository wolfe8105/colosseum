# Anchor List — arena-feed-events.ts

1. appendFeedEvent  (line 34)
2. addLocalSystem  (line 273)
3. writeFeedEvent  (line 283)

## Resolution notes

All eleven stage 1 agents agreed on the same three candidates. All three are top-level exported function declarations using the `export function` syntax, confirmed by direct inspection of the source:

- `appendFeedEvent` (line 34): `export function appendFeedEvent(ev: FeedEvent): void` — synchronous, exported function declaration.
- `addLocalSystem` (line 273): `export function addLocalSystem(text: string): void` — synchronous, exported function declaration.
- `writeFeedEvent` (line 283): `export async function writeFeedEvent(...)` — async, exported function declaration.

No additional function definitions exist at the top level. The file contains no `const foo = () => {}` style bindings, no class bodies, and no inner functions elevated to top-level scope. The arrow functions and callbacks inside `appendFeedEvent` (e.g., the `animationend` listener at line 117, the `.map()` callback at line 196) are inner callbacks and are correctly excluded. Agent 02 noted `writeFeedEvent` as exported without the async qualifier — a transcription omission only; the source confirms `async` at line 283.
