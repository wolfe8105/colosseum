# Refactor Prompt — src/arena/arena-room-ai.ts (218 lines → 2 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-room-ai.ts (218 lines).

Read CLAUDE.md first, then read src/arena/arena-room-ai.ts in full before
touching anything. This file has two entirely separate concerns: generating
AI responses during a live debate (in-debate AI), and scoring a completed
debate post-round (post-debate AI scoring + scorecard rendering).

SPLIT MAP (verify against file before executing):

  src/arena/arena-room-ai-response.ts  (~105 lines)
    Keeps: handleAIResponse, getUserJwt, generateAIDebateResponse,
            generateSimulatedResponse
    These all handle the in-debate AI sparring flow.
    getUserJwt is a utility used by both this file AND arena-mod-refs-ai.ts.
    Keep it here — arena-mod-refs-ai.ts already imports it from arena-room-ai.ts;
    after the split, it imports from arena-room-ai-response.ts.
    Exports: handleAIResponse, getUserJwt, generateAIDebateResponse,
             generateSimulatedResponse

  src/arena/arena-room-ai-scoring.ts  (~115 lines)
    Keeps: requestAIScoring, sumSideScore, renderAIScorecard
    Post-debate analysis, score calculation, and scorecard HTML rendering.
    Imports: getUserJwt from ./arena-room-ai-response.ts
    Exports: requestAIScoring, sumSideScore, renderAIScorecard

IMPORT UPDATES:
  arena-mod-refs-ai.ts imports getUserJwt from './arena-room-ai.ts'
  After this split, it must import from './arena-room-ai-response.ts'.
  (If arena-room-ai.ts becomes a thin orchestrator, it can re-export getUserJwt
  and no other files need updating.)

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: response ← scoring (scoring imports getUserJwt from response).
  Response does NOT import scoring.
- Run npm run build after the split. Report chunk sizes and line counts.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-ROOMAI-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
```
