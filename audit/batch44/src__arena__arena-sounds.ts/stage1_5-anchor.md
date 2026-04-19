# Anchor List — arena-sounds.ts

Source: src/arena/arena-sounds.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. sndRoundStart  (line 16)
2. sndTurnSwitch  (line 23)
3. sndPointsAwarded  (line 29)
4. sndReferenceDrop  (line 37)
5. sndChallenge  (line 44)
6. sndTimerWarning  (line 51)
7. sndDebateEnd  (line 57)
8. playSound  (line 81)
9. vibrate  (line 90)

## Resolution notes

Both arbiter runs agreed unanimously. All 9 entries are top-level named function definitions. `SOUNDS` const (line 69) excluded — record binding, not a callable. `SoundName` type (line 79) excluded — type alias. Re-exports at lines 99-100 (`IntroTrack`, `INTRO_TRACKS`, `playIntroMusic`, `stopIntroMusic`) excluded — defined in `arena-intro-music.ts`, not this file.
