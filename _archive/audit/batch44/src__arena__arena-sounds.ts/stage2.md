# Stage 2 Outputs — arena-sounds.ts

Anchors: sndRoundStart (16), sndTurnSwitch (23), sndPointsAwarded (29), sndReferenceDrop (37), sndChallenge (44), sndTimerWarning (51), sndDebateEnd (57), playSound (81), vibrate (90)

---

## Agent 01

### sndRoundStart (line 16)
3-oscillator ascending fanfare. C5 sine (523 Hz, start=0, end=0.25s, gain=0.15), E5 sine (659 Hz, start=0.08s, end=0.25s, gain=0.25), C6 triangle (1047 Hz, start=0.05s, end=0.3s, gain=0.1). All three overlap — the C6 triangle shimmer runs the longest at ~0.35s total. No guards; caller responsible for a valid AudioContext.

### sndTurnSwitch (line 23)
2-oscillator quick blip. A5 sine (880 Hz, start=0, end=0.2s, gain=0.08), C6 sine (1047 Hz, start=0.04s, end=0.15s, gain=0.12). Tight 40ms stagger; both done by ~0.2s. Lower peak gains than roundStart — intentionally less prominent.

### sndPointsAwarded (line 29)
3 triangle oscillators + 1 noise burst. C6 triangle (1047 Hz, start=0, end=0.2s, gain=0.12), E6 triangle (1319 Hz, start=0.06s, end=0.18s, gain=0.18 [note: source is 0.2]), G6 triangle (1568 Hz, start=0.1s, end=0.3s, gain=0.15). Noise: start=0, end=0.05s, gain=0.15 — immediate metallic attack. Ascending C major triad in octave 6.

### sndReferenceDrop (line 37)
2 sine oscillators + 1 noise burst. C3 sine (131 Hz, start=0, end=0.3s, gain=0.2 — deep thud). C7 sine (2093 Hz, start=0.1s, end=0.35s, gain=0.12 — high ping [source shows gain=0.12, not 0.35]). Noise: start=0, end=0.04s, gain=0.2. 4-octave spread (131 Hz vs 2093 Hz) makes this the most distinctive sound. Total duration ~0.4s.

### sndChallenge (line 44)
3 square oscillators, descending (E5→C5→A4). E5 square (659 Hz, start=0, end=0.12s, gain=0.12), C5 square (523 Hz, start=0.1s, end=0.25s, gain=0.12 [source: 0.12]), A4 square (440 Hz, start=0.2s, end=0.35s, gain=0.1). Square waves are harsh and buzzy — aggressive for a challenge action. Evenly staggered 100ms each; minimal overlap between adjacent notes.

### sndTimerWarning (line 51)
1 noise burst + 1 sine oscillator, both at very low gain. Noise: start=0, end=0.03s [duration], gain=0.03. Sine 1000 Hz, start=0, end=0.08s, gain=0.04. Both fire simultaneously — the quietest effect in the set. No stagger; ~0.1s total.

### sndDebateEnd (line 57)
5 oscillators (4 sine + 1 triangle). C5 sine (523 Hz, start=0, end=0.2s, gain=0.2), E5 sine (659 Hz, start=0.12s, end=0.3s, gain=0.2 [source: 0.2]), G5 sine (784 Hz, start=0.24s, end=0.45s, gain=0.2), C6 sine (1047 Hz, start=0.36s, end=0.7s, gain=0.25), C6 triangle (1047 Hz, start=0.36s, end=0.8s, gain=0.1 — shimmer tail). C major arpeggio with 120ms stagger. Peak gain 0.25 — loudest sustained note. Total duration ~0.85s — longest in the file. **Risk:** peak gain 0.7 was noted erroneously — actual source shows gain=0.25 on the C6 sine.

### playSound (line 81)
Guard 1: `sfxEnabled()` — if false, return immediately (no context created). Guard 2: `getCtx()` — if null (browser blocks AudioContext before user gesture), return. Lookup: `SOUNDS[name]` — `if (fn) fn(ctx)`. The `if (fn)` guard is redundant given `SoundName` typing but harmless. **Risk:** `sfxEnabled()` reads localStorage + JSON.parse on every call with no caching. **Risk:** no error handling around `fn(ctx)` — if an osc/noise call throws, exception propagates uncaught to the caller.

### vibrate (line 90)
Guard 1: `sfxEnabled()` — haptics share the same toggle as audio SFX (no independent haptics preference). Guard 2: `navigator.vibrate` feature-detect — absent on iOS, skipped silently. Calls `navigator.vibrate(ms)`, default 50ms. **Design note:** vibration coupled to SFX toggle; user cannot disable vibration while keeping audio.

---

## Agent 02

### sndRoundStart (line 16)
Three-oscillator rising fanfare. Sine 523 Hz (C5) fires first, then sine 659 Hz (E5) 80ms later, then triangle 1047 Hz (C6) at 50ms. Produces a brief ascending chord swell. No guards.

### sndTurnSwitch (line 23)
Two-tone ascending ping. 880 Hz sine fires first, 1047 Hz sine follows 40ms later. Short and crisp; non-intrusive. No guards.

### sndPointsAwarded (line 29)
Three ascending triangle oscillators (C6→E6→G6) with a simultaneous noise burst for a metallic transient. All events complete within ~300ms. Celebratory bell-like quality. No guards.

### sndReferenceDrop (line 37)
Deep C3 sine (131 Hz) thud + noise burst at t=0; high C7 sine (2093 Hz) ping entering 100ms later. Widest frequency spread in the file; most attention-grabbing. No guards.

### sndChallenge (line 44)
Descending square-wave sequence E5→C5→A4, staggered at 100ms each. Square waves are intentionally harsh — confrontational semantics. No guards.

### sndTimerWarning (line 51)
Noise burst + 1 kHz sine, both at t=0, very low gain. Subtlest cue in the set. No guards.

### sndDebateEnd (line 57)
Four ascending sine tones (C5→E5→G5→C6) + triangle shimmer at C6. 120ms stagger between each sine. Longest (~850ms) and most complex sound. No guards.

### playSound (line 81)
Guards: sfxEnabled() then getCtx(). If both pass, looks up name in SOUNDS, calls fn(ctx) if found. `if (fn)` guard is redundant but safe. **Risk:** if `name` is an unknown key (type casting), silently drops the call with no error.

### vibrate (line 90)
Guards: sfxEnabled() then navigator.vibrate feature-detect. Default 50ms. Haptics tied to audio toggle — cannot split independently. Silent no-op on iOS and desktop.

---

## Agent 03

### sndRoundStart (line 16)
3 nodes: C5 sine (start=0, end=0.25s, gain=0.15), C6 triangle shimmer (start=0.05s, end=0.3s, gain=0.1), E5 sine (start=0.08s, end=0.25s, gain=0.25). Bell-like ascending chord; C6 shimmer runs longest (~0.35s). 3 oscillator objects allocated.

### sndTurnSwitch (line 23)
2 sine nodes: A5 (start=0, end=0.2s, gain=0.08), C6 (start=0.04s, end=0.15s, gain=0.12). Overlap for ~110ms. Shortest total duration; designed to be non-disruptive.

### sndPointsAwarded (line 29)
3 triangle nodes + 1 noise: noise at t=0, C6 at t=0, E6 at 60ms, G6 at 100ms. Ascending C major triad at octave 6. Noise adds metallic attack texture alongside the first oscillator. All overlap in 0.1–0.18s window.

### sndReferenceDrop (line 37)
2 sine nodes + 1 noise: C3 and noise at t=0, C7 ping at 100ms. 4+ octave spread. C7 runs longest (0.35s). Most distinctive sound in the set.

### sndChallenge (line 44)
3 square nodes descending: E5 (t=0, 0.12s), C5 (t=0.1s, 0.25s), A4 (t=0.2s, 0.35s). Minimal overlap (20–50ms between adjacent notes). Harsh square-wave timbre; aggressive by design.

### sndTimerWarning (line 51)
1 noise + 1 osc, both at t=0. Simultaneous, no stagger. Lowest gain values in the file (0.03/0.04). ~0.15s total. Only sound with zero staggering between events.

### sndDebateEnd (line 57)
5 oscillators: 4 sine ascending (C5/E5/G5/C6) at 120ms intervals, C6 triangle shimmer simultaneously with final C6 sine. Triangle runs longest (0.8s). All 5 overlap in 0.36–0.45s window. Highest node count. No noise.

### playSound (line 81)
Guards sfxEnabled() → getCtx() → SOUNDS lookup. `if (fn)` is redundant. **Risk:** `getCtx()` calls `_ctx.resume()` without awaiting the Promise — if context resumption is pending, nodes scheduled on this call may be silently dropped (browser limitation). No error propagated.

### vibrate (line 90)
sfxEnabled() guard + navigator.vibrate feature-detect + call. Design issue: haptics coupled to audio toggle.

---

## Agent 04

### sndRoundStart (line 16)
C5 sine, E5 sine, C6 triangle — all overlap to produce a bright ascending fanfare. Gain values: 0.15, 0.25, 0.1 respectively. No guards.

### sndTurnSwitch (line 23)
A5 sine + C6 sine, 40ms stagger. Low gain (0.08/0.12). Brief and crisp. No guards.

### sndPointsAwarded (line 29)
C6/E6/G6 triangle arpeggio + noise burst. Celebratory tone; noise fires simultaneously with C6. No guards.

### sndReferenceDrop (line 37)
C3 + C7 sine pair (4-octave contrast) + noise burst. Deep thud + high ping. No guards.

### sndChallenge (line 44)
E5→C5→A4 descending square wave. 100ms stagger, ~350ms total. Intentionally harsh. No guards.

### sndTimerWarning (line 51)
Noise + 1 kHz sine simultaneous. Very quiet (0.03/0.04 gain). ~0.1s total. No guards.

### sndDebateEnd (line 57)
C5→E5→G5→C6 ascending arpeggio + C6 triangle shimmer. 120ms stagger; ~850ms total. Loudest peak note at C6 sine gain=0.25. No guards.

### playSound (line 81)
sfxEnabled() guard → getCtx() guard → SOUNDS[name] lookup → call. `if (fn)` redundant but harmless. **Risk:** `sfxEnabled()` is uncached localStorage read every call. No try/catch around fn(ctx).

### vibrate (line 90)
sfxEnabled() + navigator.vibrate check. Default 50ms. Design: audio and haptic preferences share one toggle.

---

## Agent 05

### sndRoundStart (line 16)
Ascending three-note chord (C5/E5/C6) with overlapping decay. Triangle on C6 gives softer tone. No guards.

### sndTurnSwitch (line 23)
Two-tone rising blip (A5→C6). Short, non-intrusive. No guards.

### sndPointsAwarded (line 29)
Triangle arpeggio (C6→E6→G6) + noise burst for percussive "sparkle." Rewarding feel. No guards.

### sndReferenceDrop (line 37)
C3 thud + noise + C7 ping. Widest frequency span; most "weighty" cue. No guards.

### sndChallenge (line 44)
Descending square E5→C5→A4. Square waves are harsh/buzzy — confrontational character. No guards.

### sndTimerWarning (line 51)
Noise + 1 kHz sine, both at t=0, very low gain. Subtle tick. No guards. **Risk:** if called on every timer tick without rate-limiting, many AudioNodes pile up — caller's responsibility to throttle.

### sndDebateEnd (line 57)
C5→E5→G5→C6 arpeggio + C6 triangle shimmer. Longest and most complex (~850ms). Both C6 oscillators at same frequency (sine + triangle) will produce slight timbral blending rather than phase-coherent sum — an aesthetic choice. No guards.

### playSound (line 81)
Guards: sfxEnabled() → getCtx(). Looks up and calls sound fn. `if (fn)` redundant due to SoundName typing. **Risk:** suspended context (before user gesture on iOS/Safari) — getCtx() may return context in suspended state; nodes scheduled on it are silently dropped.

### vibrate (line 90)
sfxEnabled() + navigator.vibrate check + call(ms=50). **Design note:** haptics tied to same SFX toggle; no independent haptic preference flag.
