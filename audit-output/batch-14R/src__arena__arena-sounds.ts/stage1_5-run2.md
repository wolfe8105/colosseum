# Anchor List — src/arena/arena-sounds.ts

1. getCtx  (line 16)
2. sfxEnabled  (line 34)
3. osc  (line 49)
4. noise  (line 62)
5. sndRoundStart  (line 83)
6. sndTurnSwitch  (line 90)
7. sndPointsAwarded  (line 96)
8. sndReferenceDrop  (line 104)
9. sndChallenge  (line 111)
10. sndTimerWarning  (line 118)
11. sndDebateEnd  (line 124)
12. playSound  (line 148)
13. vibrate  (line 157)
14. introGladiator  (line 192)
15. introThunder  (line 203)
16. introScholar  (line 213)
17. introPhantom  (line 222)
18. introPhoenix  (line 230)
19. introColossus  (line 249)
20. introViper  (line 260)
21. introOracle  (line 271)
22. introChampion  (line 282)
23. introGhost  (line 292)
24. playIntroMusic  (line 323)
25. stopIntroMusic  (line 343)

## Resolution notes

- `_ctx` (line 14): excluded — `let` binding to a value (`null`), not a function definition.
- `SOUNDS` (line 136): excluded — `const` binding to an object literal (`Record<string, ...>`), not a function definition.
- `SoundName` (line 146): excluded — exported type alias, not a callable binding.
- `IntroTrack` (lines 170–175): excluded — exported interface (type declaration), not a callable binding.
- `INTRO_TRACKS` (line 177): excluded — `const` binding to an array literal, not a function definition.
- `INTRO_SYNTHS` (line 303): excluded — `const` binding to an object literal (`Record<string, ...>`), not a function definition.
- `_introAudioEl` (line 316): excluded — `let` binding to a value (`null`), not a function definition.
- Inline callbacks inside `.forEach` calls within track synthesizers: excluded — callbacks passed inline, not top-level named bindings.
