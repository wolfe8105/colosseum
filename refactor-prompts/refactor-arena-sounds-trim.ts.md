# Refactor Prompt — src/arena/arena-sounds.ts (346 lines → thin orchestrator)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-sounds.ts (346 lines).

Read CLAUDE.md first, then read ALL THREE of these files in full before touching
anything:
  src/arena/arena-sounds.ts       (346 lines — still has all original code)
  src/arena/arena-sounds-core.ts  (already created in a prior session)
  src/arena/arena-intro-music.ts  (already created in a prior session)

SITUATION: A prior session created arena-sounds-core.ts and arena-intro-music.ts
as sub-modules but never trimmed arena-sounds.ts. The original code is still in
arena-sounds.ts — it has not been removed. This creates duplication.

TASK: Trim arena-sounds.ts down to a thin re-export orchestrator by removing
everything that is now in the two sub-files. Keep only what is genuinely needed
as re-exports for existing importers.

EXPECTED RESULT:
  arena-sounds-core.ts — unchanged (AudioContext, sfxEnabled, osc, noise)
  arena-intro-music.ts — unchanged (IntroTrack, INTRO_TRACKS, playIntroMusic, stopIntroMusic)
  arena-sounds.ts — thin orchestrator (~30 lines):
    Re-exports: SoundName, playSound, vibrate from arena-sounds-core.ts or
                wherever the battle SFX public API now lives
    Re-exports: IntroTrack, INTRO_TRACKS, playIntroMusic, stopIntroMusic
                from arena-intro-music.ts
    Removes: all duplicate function definitions, all duplicate constants

IMPORTANT: Grep for all importers of arena-sounds.ts first:
  grep -r "arena-sounds" src --include="*.ts" | grep import
Then verify the trimmed orchestrator re-exports everything those importers need.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Run npm run build after the change. Zero new errors.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-SOUNDS-NNN]: description. Do NOT fix them.
- Refactor only.

After build passes, commit and push directly to main:
git add -A
git commit -m "refactor: trim arena-sounds.ts to thin orchestrator — remove duplicated code"
git push origin HEAD:main
Confirm push succeeded.
```
