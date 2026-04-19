# Stage 3 — Verification: src/arena/arena-sounds.ts

Anchors verified: 25
Agents: 5 parallel

---

## Verdict Table (consolidated)

| # | Function | Agent 01 | Agent 02 | Agent 03 | Agent 04 | Agent 05 | Final |
|---|----------|----------|----------|----------|----------|----------|-------|
| 1 | getCtx (16) | PASS | PASS | PASS | PASS | PASS | PASS |
| 2 | sfxEnabled (34) | PASS | PASS | PASS | PASS | PASS | PASS |
| 3 | osc (49) | PASS | PASS | PASS | PASS | PASS | PASS |
| 4 | noise (62) | PASS | PASS | PASS | PASS | PASS | PASS |
| 5 | sndRoundStart (83) | PASS | PASS | PASS | PASS | PASS | PASS |
| 6 | sndTurnSwitch (90) | PASS | PASS | PASS | PASS | PASS | PASS |
| 7 | sndPointsAwarded (96) | PASS | PASS | PASS | PASS | PASS | PASS |
| 8 | sndReferenceDrop (104) | PASS | PASS | PASS | PASS | PASS | PASS |
| 9 | sndChallenge (111) | PASS | PASS | PASS | PASS | PASS | PASS |
| 10 | sndTimerWarning (118) | PASS | PASS | PASS | PASS | PASS | PASS |
| 11 | sndDebateEnd (124) | PASS | PASS | PASS | PASS | PASS | PASS |
| 12 | playSound (148) | PASS | PASS | PASS | PASS | PASS | PASS |
| 13 | vibrate (157) | PASS | PASS | PARTIAL | PASS | PASS | PASS |
| 14 | introGladiator (192) | PASS | PASS | PASS | PASS | PASS | PASS |
| 15 | introThunder (203) | PASS | PASS | PASS | PASS | PASS | PASS |
| 16 | introScholar (213) | PASS | PASS | PASS | PASS | PASS | PASS |
| 17 | introPhantom (222) | PASS | PASS | PASS | PASS | PASS | PASS |
| 18 | introPhoenix (230) | PASS | PASS | PASS | PASS | PASS | PASS |
| 19 | introColossus (249) | PASS | PASS | PASS | PASS | PASS | PASS |
| 20 | introViper (260) | PASS | PASS | PASS | PASS | PASS | PASS |
| 21 | introOracle (271) | PASS | PASS | PASS | PASS | PASS | PASS |
| 22 | introChampion (282) | PASS | PASS | PASS | PASS | PASS | PASS |
| 23 | introGhost (292) | PASS | PASS | PASS | PASS | PASS | PASS |
| 24 | playIntroMusic (323) | PASS | PASS | PASS | PASS | PASS | PASS |
| 25 | stopIntroMusic (343) | PASS | PASS | PASS | PASS | PASS | PASS |

**Summary: 25 PASS, 0 PARTIAL, 0 FAIL** (Agent 03 voted PARTIAL on `vibrate` for a caller-contract imprecision in Stage 2 documentation, not a factual error; consensus is PASS.)

---

## needs_review (consolidated, all 5 agents)

### NR-1 — Synthesized intro tracks cannot be stopped (5/5 agents)
`stopIntroMusic()` only pauses the `_introAudioEl` HTMLAudioElement used for custom tracks. Once a synthesized intro track fires (any of the 10 `intro*` functions), the scheduled Web Audio nodes play to their natural stop time with no stored handles to cancel them. If the debate room loads mid-playback (e.g., `introPhantom` at 2.0s, `introOracle` at ~1.9s), the audio continues for up to 2s after the call. No `ctx.suspend()` escape hatch exists.

### NR-2 — `noise()` pre-scales samples by 0.3, making `gain` parameter non-equivalent to `osc()` `gain` (4/5 agents)
`noise()` fills each sample with `(Math.random() * 2 - 1) * 0.3` — the 0.3 is baked into the buffer data before the GainNode envelope is applied. The effective peak amplitude is therefore `gain × 0.3`, not `gain`. By contrast, `osc()` uses `gain` as the literal initial GainNode value. This asymmetry is undocumented. A developer tuning noise levels who adjusts `gain` expecting linear equivalence with `osc` gains will get confusing results.

### NR-3 — `vibrate()` gated on `sfxEnabled()` with no independent haptics toggle (4/5 agents)
Haptic feedback is coupled to the audio SFX toggle. A user in silent mode cannot receive vibration feedback. The module header says "Haptics: vibration on points awarded and reference drops only" acknowledging the design, but there is no `haptics_enabled` setting. This may be an unintended accessibility limitation.

### NR-4 — `introPhoenix` bypasses `osc()` helper (3/5 agents)
`introPhoenix` is the only synthesizer that manually constructs `OscillatorNode` and `GainNode` — intentional for the frequency glide (`exponentialRampToValueAtTime` on frequency). However it uses `linearRampToValueAtTime` for gain (all other sounds use `exponentialRampToValueAtTime`), and its stop time is `ctx.currentTime + 2.0` evaluated at the point of the `o.stop()` call rather than at graph construction. This is benign (synchronous execution), but creates a maintenance inconsistency.

### NR-5 — `getCtx()` does not handle closed `AudioContext` (2/5 agents)
If `_ctx` enters a `closed` state (browser lifecycle, memory pressure), `getCtx()` will call `.resume()` on the closed context and return it. A closed context cannot be resumed or reused — it will accept node creation but produce no audio. There is no `_ctx.state === 'closed'` re-initialization path.

### NR-6 — `playIntroMusic` falls back silently to `'gladiator'` for unknown `trackId` (2/5 agents)
`INTRO_SYNTHS[trackId] ?? INTRO_SYNTHS['gladiator']!` — an unknown or stale `trackId` (e.g. from a renamed track in a profile setting) silently plays the gladiator track without any warning. This can make misconfigured profile settings invisible at runtime.

### NR-7 — `osc()` `end` parameter is absolute offset from `ctx.currentTime`, not duration-after-start (1/5 agents)
The `end` parameter means "stop the gain ramp at `ctx.currentTime + end`", not "play for `end - start` seconds." A caller who interprets `end` as a duration would schedule nodes incorrectly. This is consistent across all callers in the file but is not documented in the function signature.

### NR-8 — `introViper` has ~0.18s gap between main pattern and tail rattle (1/5 agents)
The staccato pattern ends at approximately `7 × 0.16 + 0.1 = 1.22s`. The tail rattle starts at `1.4s`. The ~0.18s gap of near-silence between them may be intentional pacing or an accidental artifact.
