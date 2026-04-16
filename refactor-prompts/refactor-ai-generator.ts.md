# Refactor Prompt — lib/ai-generator.ts (690 lines → 6 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor lib/ai-generator.ts (690 lines).

Read CLAUDE.md first, then read lib/ai-generator.ts in full before touching anything.
This is the Groq AI generation module: types, system prompts, helpers, Leg 1/2 generation
functions, Leg 3 auto-debate functions, and fallback templates.

SPLIT MAP (verify line ranges against the file before executing):

  lib/ai-generator.types.ts  (~45 lines)
    Keeps: DebateTopic, AutoDebateSide, AutoDebateSetup, AutoDebateRoundResult,
            RoundScore, AutoDebateScoreResult interfaces
    Imports: nothing

  lib/ai-generator.prompts.ts  (~120 lines)
    Keeps: SYSTEM_PROMPTS object (all 7 prompt strings)
    Imports: nothing

  lib/ai-generator.fallbacks.ts  (~195 lines)
    Keeps: fallbackHotTake, fallbackReply, fallbackDebateTopic,
            fallbackAutoDebateSetup, fallbackAutoDebateRound, fallbackAutoDebateScore,
            fallbackShareHook
    Imports: import type from ai-generator.types.ts
    Imports: classifyCategory from category-classifier (for fallbackAutoDebateSetup)
    Imports: logger from logger

  lib/ai-generator.core.ts  (~80 lines)
    Keeps: groq module-level var, cleanHeadline, getClient,
            generateHotTake, generateReply, generateDebateTopic
    Imports: import type from ai-generator.types.ts
    Imports: ai-generator.prompts.ts, ai-generator.fallbacks.ts
    Imports: Groq, config, logger

  lib/ai-generator.leg3.ts  (~130 lines)
    Keeps: generateAutoDebateSetup, generateAutoDebateRound,
            generateAutoDebateScore, generateShareHook
    Imports: import type from ai-generator.types.ts
    Imports: ai-generator.prompts.ts, ai-generator.fallbacks.ts
    Imports: Groq (via getClient from ai-generator.core.ts), logger

  lib/ai-generator.ts  (orchestrator, ~30 lines)
    Keeps: testGenerate
    Re-exports: all public functions from core + leg3
    Re-exports: import type { } from ai-generator.types.ts

ALSO CHECK:
  lib/ai-generator.js exists (647 lines — JS duplicate of this TS file).
  Grep for any file that imports from 'ai-generator.js' specifically.
  If only ai-generator.ts is imported, note this in a LANDMINE comment in ai-generator.ts
  and do not touch the .js file in this session.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: types → prompts/fallbacks → core/leg3 → orchestrator.
- Run npm run build after the split. Report chunk sizes and line counts for each new file.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-AIGEN-NNN]: description. Do NOT fix them.
- Refactor only — do not fix bugs.

Wait for approval of the split map before writing any code.
```
