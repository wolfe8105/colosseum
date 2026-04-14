# Refactor Prompt — arena-feed-machine.ts (557 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-feed-machine.ts (557 lines).

Read CLAUDE.md first, then read src/arena/arena-feed-machine.ts in full before touching anything. The file is the turn-taking state machine for F-51 feed rooms: turn lifecycle, ad breaks, vote gate, and mod-challenge pause/ruling.

Note the existing file-top comment flagging LM-FEEDROOM-001 — pauseFeed/unpauseFeed/showChallengeRulingPanel were already moved here from another file. Keep that comment alive by copying it to wherever pauseFeed ends up after this split.

SPLIT MAP (verify against the file before executing):

1. arena-feed-machine-turns.ts (~170 lines)
   Public exports: clearFeedTimer, startPreRoundCountdown, startSpeakerTurn, finishCurrentTurn, onTurnEnd, startPause
   The core turn loop. Starts rounds, runs speaker timers, handles turn transitions (speaker A → pause → speaker B → next round or ad break).

2. arena-feed-machine-ads.ts (~180 lines)
   Public exports: startAdBreak, startFinalAdBreak
   File-local helpers: showAdOverlay, showVoteGate
   Commercial break and final vote gate logic. Imports startPreRoundCountdown from arena-feed-machine-turns.ts to advance to the next round after an ad break.

3. arena-feed-machine-pause.ts (~145 lines)
   Public exports: pauseFeed, unpauseFeed
   File-local helper: showChallengeRulingPanel
   Challenge-in-progress pause state, mod ruling panel UI, auto-accept timer. The LM-FEEDROOM-001 file-top comment moves here.

4. Delete arena-feed-machine.ts (or turn into a short shim). Update every consumer in the repo to import directly from whichever of the three new files they need. Run grep for `from './arena-feed-machine'` and `from '../arena/arena-feed-machine'` to find them. Common consumers: arena-feed-wiring.ts, arena-feed-events.ts, arena-feed-room.ts, arena-room-setup.ts.

CIRCULAR DEPENDENCY WARNING:

There is a cycle between turns and ads:
- turns.onTurnEnd calls ads.startAdBreak / ads.startFinalAdBreak
- ads.startAdBreak calls turns.startPreRoundCountdown

Break it by having turns.onTurnEnd use a dynamic import:

    export function onTurnEnd(speaker, debate) {
      // ...
      if (round >= FEED_TOTAL_ROUNDS) {
        void import('./arena-feed-machine-ads.ts').then(m => m.startFinalAdBreak(debate));
      } else {
        void import('./arena-feed-machine-ads.ts').then(m => m.startAdBreak(debate));
      }
    }

ads.ts imports startPreRoundCountdown statically from turns.ts. One-way static import; the other direction is dynamic. This is the shared-primitive escape hatch the handoff rules allow.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- `import type` for all type-only imports (CurrentDebate, FeedTurnPhase, DeepgramStatus).
- Target under 300 lines, preference 150. Ads at ~180 is over the 150 preference but under the ceiling; splitting further would fragment cohesive ad/vote gate logic.
- Run `npm run build` after the split, report chunk sizes and line counts for every new file.
- Run `npm run typecheck` and confirm zero NEW errors in arena-feed-machine* files.
- Update every consumer's imports. Run the build and the typecheck until clean.

LANDMINES — log these as `// LANDMINE [LM-MACHINE-NNN]: description` comments. Do NOT fix them:

- LM-MACHINE-001 (in arena-feed-machine-pause.ts near the auto-accept unpauseFeed call at line 463 of the original): The auto-accept path in pauseFeed calls unpauseFeed() directly AND inserts a mod_ruling event which will trigger unpause again via Realtime. Potential double-unpause — one locally, one when the Realtime event is delivered. Verify the Realtime handler is idempotent or whether the direct call is redundant.
- LM-MACHINE-002 (in arena-feed-machine-turns.ts at startSpeakerTurn): The debater A/B name computation at lines 90-96 is duplicated in startPause at lines 190-196. Extract a `getDebaterNames(debate)` helper in a follow-up refactor.
- LM-MACHINE-003 (in arena-feed-machine-ads.ts at showAdOverlay): Hardcoded AdSense publisher (`ca-pub-1800696416995461`) and slot (`8647716209`) IDs in the overlay HTML. Should be parameterized via config.
- LM-MACHINE-004 (in arena-feed-machine-ads.ts): startAdBreak and startFinalAdBreak share ~80% of their code (setDebaterInputEnabled, showAdOverlay, spectator voting enable, setInterval body structure). Candidate for extraction to a shared `runAdCountdown(durationSec, onComplete)` helper in a follow-up refactor.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
