# Refactor Prompt — arena-feed-events.ts (305 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-feed-events.ts (305 lines).

Read CLAUDE.md first, then read src/arena/arena-feed-events.ts in full before touching anything. The file handles feed event rendering and persistence. Has one giant switch-statement function `appendFeedEvent` that renders all FeedEvent types, plus `addLocalSystem` for local-only system messages and `writeFeedEvent` for insert_feed_event RPC calls. Only 305 lines total — just over the 300 target — so the split is primarily about separating the massive switch into type-specific render helpers.

SPLIT MAP (verify against the file before executing):

1. arena-feed-events.ts (orchestrator, ~75 lines)
   Keeps: the exported `appendFeedEvent` as a thin dispatcher that handles dedup, author name lookup, and delegates each `case` branch to a helper from arena-feed-events-render. Also keeps `addLocalSystem` and `writeFeedEvent` since they're short and tightly coupled to the feed room.

2. arena-feed-events-render.ts (~200 lines)
   `export function renderSpeechEvent(ev: FeedEvent, el: HTMLElement, names: { a: string; b: string }, debate: CurrentDebate | null): void`
   `export function renderPointAwardEvent(ev: FeedEvent, el: HTMLElement, names: { a: string; b: string }): void`
   `export function renderRoundDividerEvent(ev: FeedEvent, el: HTMLElement): void`
   `export function renderReferenceCiteEvent(ev: FeedEvent, el: HTMLElement, names: { a: string; b: string }, debate: CurrentDebate | null): void`
   `export function renderReferenceChallengeEvent(ev: FeedEvent, el: HTMLElement, names: { a: string; b: string }, debate: CurrentDebate | null): void`
   `export function renderModRulingEvent(ev: FeedEvent, el: HTMLElement): void`
   `export function renderPowerUpEvent(ev: FeedEvent, el: HTMLElement): void`
   `export function renderDisconnectEvent(ev: FeedEvent, el: HTMLElement): void`
   `export function applySentimentEvent(ev: FeedEvent): void` — handles sentiment_tip AND sentiment_vote, no DOM append (returns whether caller should skip append).
   One function per case branch. Each takes the event, the target element, and any context it needs (debater names, current debate). Keeps the imports from arena-feed-state, arena-feed-machine, arena-feed-ui, arena-sounds scoped to just this file.

3. No third file. The split is deliberately minimal — `appendFeedEvent` stays short because it's just a dispatcher, and the render helpers all live together in one ~200-line file since they share heavy state imports and are tightly related.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- `import type` for all type-only imports (FeedEvent, FeedEventType, CurrentDebate).
- Dependency direction: render imports from arena-feed-state, arena-feed-ui, arena-feed-machine, arena-sounds, arena-state, auth, config. Orchestrator imports render functions.
- Target under 300 lines, preference 150. Orchestrator lands ~75, render file lands ~200 (over the preference but well under the ceiling, and the file is cohesive).
- Run `npm run build` after the split, report chunk sizes and line counts.
- Run `npm run typecheck` and confirm zero NEW errors.
- **Special note**: the existing file has a bug where the `default:` branch is placed BEFORE the `case 'sentiment_tip'` branches — because `default` returns early, `sentiment_tip` and `sentiment_vote` cases are reached via the normal switch fall-through ordering. After the refactor, verify that the dispatcher preserves the same ordering. This is a LANDMINE (see below) not a fix target.

LANDMINES — log these as `// LANDMINE [LM-EVENTS-NNN]: description` comments. Do NOT fix them:

- LM-EVENTS-001 (in arena-feed-events.ts at the switch statement): The `default:` case is positioned in the middle of the switch, BEFORE `case 'sentiment_tip'` and `case 'sentiment_vote'`. Because `default` breaks with `break;` (not `return`), JavaScript falls through to the default then exits the switch — meaning `sentiment_tip` and `sentiment_vote` ARE actually reachable because they come after default in source order but switch evaluation matches them by value. This works but is fragile and unconventional. If anyone adds a new case between default and sentiment_tip, ordering could bite. Preserve the ordering exactly in the refactor dispatcher.

- LM-EVENTS-002 (in arena-feed-events-render.ts at renderReferenceChallengeEvent): The handler calls `pauseFeed(debate)` which creates a potential cycle back to arena-feed-machine which itself calls back into this file for render. Verify no runtime import cycle after the split. If the cycle becomes structural (not just circular imports that JS handles), consider breaking it by emitting a 'challenge' event and letting arena-feed-machine observe it.

- LM-EVENTS-003 (in arena-feed-events.ts at appendFeedEvent dedup key): The fallback dedup key is `${ev.event_type}:${ev.side}:${ev.round}:${ev.content}`. Two events with identical type/side/round/content are treated as duplicates even if they're legitimately distinct (e.g. a debater saying the same word twice in one round). Preserve existing behavior — this is not a bug to fix, just a quirk to be aware of.

- LM-EVENTS-004 (in arena-feed-events-render.ts at renderPointAwardEvent): The `+${baseScore}` / `+${finalContrib}` interpolations into innerHTML go through `badgeText` which is then set via innerHTML — all numeric values come from `Number()` casts on metadata already, so this is compliant with the CLAUDE.md Number() rule. Verify this during the refactor and do not strip the Number() casts.

- LM-EVENTS-005 (in arena-feed-events.ts at writeFeedEvent catch block): `catch (e) { console.warn('[FeedRoom] insert_feed_event failed:', e); }` is a silent-ish catch — logs but doesn't rollback the optimistic append. If writeFeedEvent fails, the event is on screen via appendFeedEvent (called separately by the wiring layer) but never persisted. Same family as M-B6 in AUDIT-FINDINGS.md. Not this refactor's job to fix.

Do NOT fix landmines — they're tracked in AUDIT-FINDINGS.md for Phase 2 cleanup. Refactor only.

Wait for approval of the split map before writing any code.
```
