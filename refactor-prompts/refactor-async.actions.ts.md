# Refactor Prompt — async.actions.ts (493 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/async.actions.ts (493 lines).

Read CLAUDE.md first, then read src/async.actions.ts in full before touching anything. The file is the Async Actions module — react, challenge modal, post take, and prediction flows.

SPLIT MAP (verify against the file before executing):

1. async.actions.ts (orchestrator, ~35 lines)
   Re-exports all public functions from sub-modules. Keeps all imports at top. No logic of its own — pure re-export barrel that preserves the existing import surface for callers.

2. async.actions-react.ts (~50 lines)
   The react function. Handles emoji reaction toggle, RPC call, optimistic UI update, and token claim.

3. async.actions-challenge.ts (~115 lines)
   challenge, _showChallengeModal, _submitChallenge. The full challenge flow: entry point → modal build → submit handler. All three are tightly coupled and share the challenge modal's DOM state.

4. async.actions-post.ts (~75 lines)
   postTake. The hot take composer submit flow — validation, RPC, optimistic render, token claim, drip trigger.

5. async.actions-predict.ts (~125 lines)
   placePrediction, pickStandaloneQuestion, openCreatePredictionForm. Prediction and question flows.

RULES:
- No barrel files other than the orchestrator re-export. Direct imports between sub-modules where needed.
- import type for all type-only imports (HotTake, Prediction, StandaloneQuestion).
- Dependency direction: orchestrator re-exports all. Sub-modules import directly from auth.ts, config.ts, async.fetch.ts etc. Sub-modules do not import from each other.
- Target under 130 lines per file. predict.ts at ~125 is acceptable.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in async.actions* files.

LANDMINES — log these as // LANDMINE [LM-ACT-NNN]: description comments. Do NOT fix them:

- LM-ACT-001 (in async.actions-challenge.ts at challenge): No guard against opening the challenge modal when it is already open. Rapid double-tap appends a second overlay to document.body. No dedup check on modal existence before calling _showChallengeModal.

- LM-ACT-002 (in async.actions-challenge.ts at _submitChallenge): Early return on missing takeId does not close the modal before returning. The modal stays open with no feedback to the user.

- LM-ACT-003 (in async.actions-post.ts at postTake): postTake reads the composer textarea by DOM ID. If multiple composers exist on the page (e.g. different sections), all share the same ID and the wrong composer's content may be submitted.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
