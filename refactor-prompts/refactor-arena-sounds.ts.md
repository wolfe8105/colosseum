# Refactor Prompt — src/arena/arena-sounds.ts (346 lines → 3 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-sounds.ts (346 lines).

Read CLAUDE.md first, then read src/arena/arena-sounds.ts in full before
touching anything. This file has TWO distinct jobs living together:
  1. Battle SFX: 7 synthesized sound effects for live debate events
  2. Intro Music: F-21 feature — 10 synthesized intro music tracks for the
     debater entrance screen

These are completely unrelated features that happen to share the Web Audio API
helper functions (osc and noise). The shared helpers must be extracted.

SPLIT MAP (verify against file before executing):

  src/arena/arena-sounds-core.ts  (~35 lines)
    Keeps: _ctx module-level var, getCtx, sfxEnabled, osc, noise
    These are the shared Web Audio API primitives used by both features.
    Imports: nothing external beyond window/AudioContext types.

  src/arena/arena-sounds.ts  (battle SFX, ~100 lines)
    Keeps: the 7 snd* private functions (sndRoundStart, sndTurnSwitch, etc.),
            SOUNDS map, SoundName type, playSound, vibrate
    Imports: getCtx, sfxEnabled, osc, noise from arena-sounds-core.ts

  src/arena/arena-intro-music.ts  (intro music, ~170 lines)
    Keeps: IntroTrack interface, INTRO_TRACKS array, all 10 intro* synthesizer
            functions, INTRO_SYNTHS map, _introAudioEl, playIntroMusic, stopIntroMusic
    Imports: getCtx, sfxEnabled, osc from arena-sounds-core.ts

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: arena-sounds-core.ts → arena-sounds.ts / arena-intro-music.ts.
  Neither arena-sounds.ts nor arena-intro-music.ts imports the other.
- Update any file that imports from arena-sounds.ts: if it imports playIntroMusic
  or stopIntroMusic, update to import from arena-intro-music.ts instead.
  (grep: playIntroMusic|stopIntroMusic|INTRO_TRACKS|IntroTrack)
- Run npm run build. Report chunk sizes and line counts for each new file.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-SOUNDS-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
```
