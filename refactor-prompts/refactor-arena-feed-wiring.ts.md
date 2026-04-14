# Refactor Prompt — arena-feed-wiring.ts (483 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-feed-wiring.ts (483 lines).

Read CLAUDE.md first, then read src/arena/arena-feed-wiring.ts in full before touching anything. The file wires DOM event listeners for the F-51 feed room. It has three role-based sub-wirings (debater / spectator tipping / moderator) plus two message submitters and a pin handler.

The file-top comment already calls out that `renderControls` lives here because of the dependency direction (ui → machine → wiring). Keep that comment with `renderControls` after the split.

SPLIT MAP (verify against the file before executing):

1. arena-feed-wiring.ts (orchestrator, ~140 lines)
   Keeps `renderControls(debate, isModView)` as the entry point. Branches on isModView / spectatorView / debater and injects the appropriate HTML, then delegates to the role-specific wirer from the section files. This file owns the HTML templates for all three control variants because keeping them here keeps the dispatch decision in one place.

2. arena-feed-wiring-debater.ts (~90 lines)
   `export function wireDebaterControls(debate: CurrentDebate): void` — input autoresize + send button + Enter-to-send + finish turn + concede (with confirm, state cleanup, startFinalAdBreak) + cite/challenge button listeners that delegate to arena-feed-references.
   File-local: `async function submitDebaterMessage(): Promise<void>` — optimistic appendFeedEvent + writeFeedEvent.

3. arena-feed-wiring-spectator.ts (~105 lines)
   `export async function wireSpectatorTipButtons(debate: CurrentDebate): Promise<void>` — F-58 sentiment tip strip; fetches get_user_watch_tier, enables tip buttons for non-Unranked watchers, wires click handlers.
   File-local: `async function handleTip(btn, debate, statusEl): Promise<void>` — cast_sentiment_tip RPC, error code mapping, pending sentiment update + applySentimentUpdate, tap-through button re-enable.

4. arena-feed-wiring-mod.ts (~160 lines)
   `export function wireModControls(): void` — comment input + send button + Enter-to-send (submitModComment), delegated click handler on #feed-stream for pin buttons + reference cite popups + comment selection for scoring, score button clicks (budget check + score_debate_comment RPC), score cancel button, and Phase 5 eject/null buttons (modNullDebate).
   File-local: `async function submitModComment(): Promise<void>` and `async function handlePinClick(btn: HTMLElement): Promise<void>`.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- `import type` for all type-only imports (CurrentDebate).
- The orchestrator imports each of the 3 role-specific wirer files directly. No cross-imports between the 3 role wirers.
- Target under 300 lines, preference 150. Mod wiring at ~160 is over the 150 preference but under the ceiling; splitting the score-button logic out separately would fragment the delegated click handler awkwardly.
- Run `npm run build` after the split, report chunk sizes and line counts for every new file.
- Run `npm run typecheck` and confirm zero NEW errors in arena-feed-wiring* files.

LANDMINES — log these as `// LANDMINE [LM-WIRING-NNN]: description` comments. Do NOT fix them:

- LM-WIRING-001 (in arena-feed-wiring-mod.ts near the score RPC): Line 359 comment says "Budget update happens via appendFeedEvent when the point_award arrives via Realtime" but the button is disabled BEFORE the RPC resolves (line 347) and only re-enabled in the error path (line 357). If the point_award Realtime event fails to arrive, the button stays disabled forever. Verify the re-enable path.
- LM-WIRING-002 (in arena-feed-wiring-debater.ts at concede handler): The concede handler duplicates pause-cleanup logic (set_feedPaused(false), clear challengeRulingTimer, remove overlay) that already lives in `unpauseFeed()` in arena-feed-machine-pause. Candidate for extraction to a shared `resetPauseState()` helper after the feed-machine split is done.
- LM-WIRING-003 (in arena-feed-wiring-mod.ts at the pin click handler): Line 453 — `if (!eid || eid.includes('-'))` treats any id containing a dash as a pending optimistic UUID. Brittle — real feed_event IDs are numeric strings, but relying on string-shape detection instead of a pending flag invites bugs if ID format changes.
- LM-WIRING-004 (in arena-feed-wiring-mod.ts at handlePinClick): The pin toggle updates local state optimistically based on the RPC success, but the function's try/finally resets pointer-events immediately after the RPC resolves without awaiting any UI settle. Minor but worth reviewing intent.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
