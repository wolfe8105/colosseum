# Stage 2 — Runtime Walk: src/arena/arena-sounds.ts

Anchors: 25 (from stage1_5-anchor.md)
Agents: 5 parallel

---

## Agent 01

### getCtx (line 16)
Checks `_ctx` module-level variable. If null, attempts `new window.AudioContext()` with `webkitAudioContext` fallback inside a try/catch; on exception, `console.warn('[Sounds] Web Audio API not available')` and returns null. If `_ctx.state === 'suspended'`, calls `_ctx.resume()` (browser gesture requirement). Returns the context or null.

### sfxEnabled (line 34)
Reads `localStorage.getItem('moderator_settings') || '{}'`, JSON-parses it, returns `s.audio_sfx !== false`. Any parse error returns `true` (safe default). The `!== false` check means missing key → enabled.

### osc (line 49)
Creates `OscillatorNode` + `GainNode`. Sets `o.type`, `o.frequency.value`. `g.gain.setValueAtTime(gain, ctx.currentTime + start)`, then `exponentialRampToValueAtTime(0.001, ctx.currentTime + end)`. Connects `o → g → ctx.destination`. Schedules `o.start(ctx.currentTime + start)`, `o.stop(ctx.currentTime + end + 0.05)`. The 50ms tail ensures the exponential ramp completes before the node is stopped. No return value.

### noise (line 62)
Allocates `AudioBuffer` with `bufSize = floor(sampleRate * duration)` samples, fills channel 0 with `(Math.random()*2-1)*0.3`. Creates `BufferSourceNode`, sets its buffer. `GainNode` ramps `gain → 0.001` over `[start, start+duration]`. Connects `src → g → ctx.destination`. Schedules start/stop with same 50ms tail pattern as `osc`.

### sndRoundStart (line 83)
Calls `osc` three times: C5 (523 Hz, sine, 0–0.15s, gain 0.25), E5 (659 Hz, sine, 0.08–0.25s, gain 0.25), C6 shimmer (1047 Hz, triangle, 0.05–0.3s, gain 0.1). All calls fire immediately; Web Audio schedules them internally.

### sndTurnSwitch (line 90)
Two `osc` calls: A5 (880 Hz, sine, 0–0.08s, gain 0.2), C6 (1047 Hz, sine, 0.04–0.12s, gain 0.15).

### sndPointsAwarded (line 96)
Three `osc` calls in ascending triangle tones (C6/E6/G6) + one `noise(ctx, 0, 0.05, 0.15)` for metallic attack.

### sndReferenceDrop (line 104)
`osc` sine C3 (131 Hz, thud) + `osc` sine C7 (2093 Hz, ping) + `noise` impact burst.

### sndChallenge (line 111)
Three descending `square` osc calls: E5→C5→A4 with staggered start times (0, 0.1, 0.2s).

### sndTimerWarning (line 118)
`noise(ctx, 0, 0.03, 0.1)` then `osc(ctx, 'sine', 1000, 0, 0.04, 0.08)`. Very short; tick-like.

### sndDebateEnd (line 124)
Four `sine` osc calls (C5→E5→G5→C6 arpeggio, staggered 0.12s apart) + one `triangle` shimmer at C6. Last note ends at ~0.8s.

### playSound (line 148)
Guard: `if (!sfxEnabled()) return`. Guard: `const ctx = getCtx(); if (!ctx) return`. Lookup: `const fn = SOUNDS[name]`. Calls `fn(ctx)` if truthy. Does not throw if name is invalid — `fn` would be undefined and the call is skipped silently.

### vibrate (line 157)
Guard: `if (!sfxEnabled()) return`. Checks `navigator.vibrate` existence before calling. Default parameter `ms = 50`. Pure haptics, no audio.

### introGladiator (line 192)
7-note C major fanfare via `notes.forEach((f,i) => osc(...))`. Adds bass root (C4 261 Hz, sine), three `noise` bursts at 0, 0.5, 1.1s.

### introThunder (line 203)
`hits` array (7 timestamps). For each: `noise` + low `sine` osc (55–95 Hz). Alternating gain on noise (even=0.4, odd=0.2). Adds `sawtooth` drone at 110 Hz.

### introScholar (line 213)
8-note ascending melody (C major scale from G4 to G5). Separate 4-note harmony line, staggered at 0.36s intervals.

### introPhantom (line 222)
8-note descending A-minor sawtooth line (880→523 Hz). Low drone (110 Hz sine). Continuous low-level noise hiss.

### introPhoenix (line 230)
Unique: directly creates `OscillatorNode` + `GainNode` (not via `osc` helper). Frequency ramps 220→1760 Hz over 1.8s. Gain: 0.01→0.25→0.01. Then 3 triangle burst notes at 1.4s + noise burst.

### introColossus (line 249)
4 impact timestamps. Each: `sine` 55 Hz + `sine` 82 Hz (2ms offset) + `noise` burst. `sawtooth` drone at 110 Hz throughout.

### introViper (line 260)
8-note chromatic stab pattern (659/622 alternating) at 0.16s intervals using `square` wave. 6 rapid noise bursts at tail (rattle).

### introOracle (line 271)
Two chord sets (perfect 5ths), each a 3-note `sine` pad with staggered starts. Low noise hiss throughout.

### introChampion (line 282)
7 snare hits (noise, alternating gain). 7-note bugle motif (G major) via `triangle` osc.

### introGhost (line 292)
4 sparse pulse pairs (sine 220+i*30 Hz + sine 440+i*15 Hz) at 0, 0.7, 1.2, 1.6s. Background noise. Single high ping (2093 Hz) at 1.5s.

### playIntroMusic (line 323)
Guard: `if (!sfxEnabled()) return`. Pauses any existing `_introAudioEl` and nulls it. Branch: `trackId === 'custom' && customUrl` → creates `new Audio(customUrl)`, sets volume 0.7, assigns to `_introAudioEl`, calls `audio.play().catch(() => {})`. Returns early. Otherwise: looks up `INTRO_SYNTHS[trackId] ?? INTRO_SYNTHS['gladiator']!` (gladiator fallback), then `getCtx()` guard, calls `fn(ctx)`.

### stopIntroMusic (line 343)
If `_introAudioEl` non-null: `.pause()`, set null. Otherwise no-op. No guard on `sfxEnabled` — stop is always honored.

---

## Agent 02

### getCtx (line 16)
Lazy singleton. Null → tries `new (window.AudioContext || window.webkitAudioContext)()`, catches any exception and warns. Returns null on failure. On subsequent calls: if `_ctx.state === 'suspended'`, resumes (needed after browser autoplay policy blocks context creation until user gesture). Always returns the context or null.

### sfxEnabled (line 34)
Reads localStorage key `moderator_settings`. Falls back to `'{}'` if null. Parses as JSON. Returns `s.audio_sfx !== false` — the explicit-false check means: missing → true, true → true, false → false. Catch-all returns true.

### osc (line 49)
All Web Audio API; no DOM. Gain envelope: `setValueAtTime(gain, now+start)` then `exponentialRampToValueAtTime(0.001, now+end)`. The ramp goes nearly silent but not zero (exponential ramp can't reach zero). Node auto-cleans up after stop. 50ms padding on stop time ensures ramp completes.

### noise (line 62)
White noise via Math.random fill scaled by 0.3. Same gain envelope pattern as `osc`. `bufSize` based on `ctx.sampleRate` so duration is accurate regardless of device sample rate.

### sndRoundStart (line 83)
3 overlapping oscillators forming a rising bell tone. Times overlap intentionally to create chord wash effect.

### sndTurnSwitch (line 90)
2 quick sine tones, brief and sharp. Second starts at 0.04s (overlapping with first).

### sndPointsAwarded (line 96)
3 ascending triangle tones + noise burst. Triangle waveform chosen for metallic quality.

### sndReferenceDrop (line 104)
Low thud (C3) + high ping (C7) gives broad frequency spread. Noise adds physical "drop" impact texture.

### sndChallenge (line 111)
Descending square wave pattern evokes warning/alarm feeling. Square wave is harsh/attention-grabbing by design.

### sndTimerWarning (line 118)
Very short (30ms noise + 40ms tone). Subtle as specified; repeating caller would create tick pattern.

### sndDebateEnd (line 124)
Arpeggio builds over ~0.36s then sustains to ~0.8s. Triangle shimmer adds sparkle on final note.

### playSound (line 148)
Two consecutive guard returns (sfxEnabled, ctx null). SOUNDS lookup is typed to `SoundName` but runtime check via `if (fn)` — means passing an unknown string would silently no-op rather than throw.

### vibrate (line 157)
sfxEnabled guard first. `navigator.vibrate` may not exist (iOS, desktop). Feature-detects before calling. Default 50ms.

### introGladiator (line 192)
`notes.forEach` with index destructuring via `times[i]!` (non-null assertion). Bass root persists full duration (1.6s). Three noise hits for rhythmic accents.

### introThunder (line 203)
`hits.forEach((t, i)` uses `i % 2 === 0` for alternating gain — odd hits are quieter (snare vs. kick feel). `sawtooth` at 110 Hz provides continuous power undertone.

### introScholar (line 213)
Two separate `forEach` loops — melody (0.18s apart, 0.28s duration = slight overlap) and harmony (0.36s apart, 0.5s duration = more overlap). Counterpoint effect.

### introPhantom (line 222)
Descending from A5 (880Hz) to C5 (523Hz). Each note 0.2s apart with 0.35s duration = overlapping decay. Continuous 110Hz sine and 2s noise hiss for atmospheric drone.

### introPhoenix (line 230)
Only function that creates Audio API nodes manually (not via `osc` helper). Frequency ramp is `exponentialRampToValueAtTime` (not linear). Gain uses `linearRampToValueAtTime` for smooth fade in/out. Burst notes at 1.4s when sweep peaks.

### introColossus (line 249)
4 impacts at 0, 0.55, 0.9, 1.3s. Each has two sine tones (55 + 82 Hz, 20ms offset) — the slight offset creates beating/thickness. `sawtooth` drone.

### introViper (line 260)
`pattern.forEach((f, i) => osc(ctx, 'square', f, i * interval, ...))` — sequential stabs. Rattle loop: `for (let i = 0; i < 6; i++) noise(ctx, 1.4 + i * 0.06, ...)` — 6 quick bursts spaced 60ms.

### introOracle (line 271)
Array destructuring `[[196, 293, 392], [220, 330, 440]].forEach(([a, b, c], i)`. Non-null assertions `a!, b!, c!` for TS. Two chord groups 0.9s apart, each 3 notes with 0.1/0.2s offsets.

### introChampion (line 282)
`snare.forEach((t, i) => noise(..., i % 2 === 0 ? 0.2 : 0.1))` — alternating loud/soft. `bugle.forEach((f, i) => osc(..., bTimes[i]!, bTimes[i]! + 0.28, 0.2))`.

### introGhost (line 292)
`[0, 0.7, 1.2, 1.6].forEach((t, i) => { ... })` — two osc calls per iteration using `i` for frequency variation. Background noise at lowest gain (0.025). Ping at 1.5s.

### playIntroMusic (line 323)
`sfxEnabled()` check at top. Unconditional pause-and-null of `_introAudioEl` (if exists). Custom branch: `trackId === 'custom' && customUrl` — creates `Audio`, sets volume, stores ref, calls `play()` with empty catch. Synth branch: INTRO_SYNTHS lookup with `?? INTRO_SYNTHS['gladiator']!` fallback — ensures unknown IDs still play something. `getCtx()` guard after lookup (avoids calling fn if no audio context available).

### stopIntroMusic (line 343)
Single conditional: if `_introAudioEl` truthy, pause and null. No sfxEnabled guard — this is cleanup, not playback.

---

## Agent 03

### getCtx (line 16)
Module-level `_ctx` initialized to null. Lazy creation on first call. `webkitAudioContext` fallback for older Safari. `try/catch` on construction with `console.warn` on failure. `state === 'suspended'` → `resume()` to handle browser autoplay restrictions. Returns `AudioContext | null`.

### sfxEnabled (line 34)
Pure read from localStorage. `JSON.parse` of stored settings object. Returns `s.audio_sfx !== false`. Defaults to true when key absent or parse fails.

### osc (line 49)
Stateless Web Audio helper. Parameters: `ctx`, `type`, `freq`, `start`, `end`, `gain`. Gain ramps exponentially to near-zero. Node self-disposes after stop. 50ms stop padding prevents click artifacts.

### noise (line 62)
Stateless noise helper. Uses `ctx.sampleRate` for exact-duration buffer. White noise `(Math.random()*2-1)*0.3` capped at ±0.3 to avoid clipping. Same gain envelope as `osc`.

### sndRoundStart (line 83) through sndDebateEnd (line 124)
All 7 `snd*` functions are pure delegates to `osc`/`noise` with hardcoded frequency/timing/gain constants. No state mutation, no external calls. They accept `ctx: AudioContext` and schedule nodes on it.

### playSound (line 148)
Two guards, then `SOUNDS[name]` lookup, then `fn(ctx)`. The `SOUNDS` object maps the `SoundName` union to the corresponding `snd*` function. Type system ensures name is valid, but the runtime `if (fn)` handles edge cases gracefully.

### vibrate (line 157)
Checks sfxEnabled then `navigator.vibrate`. No fallback needed — absence of `navigator.vibrate` is expected on most platforms.

### introGladiator (line 192) through introGhost (line 292)
All 10 intro synthesizers schedule Web Audio nodes on `ctx`. Most use `forEach` over hardcoded note/timing arrays calling `osc`/`noise`. **introPhoenix** is the outlier: directly constructs an `OscillatorNode` with an `exponentialRampToValueAtTime` frequency sweep (220→1760 Hz), gains via `linearRampToValueAtTime`, then appends 3 burst notes via `osc`.

### playIntroMusic (line 323)
Calls `sfxEnabled()` first. Pauses `_introAudioEl` unconditionally (cleans up any previous playback). Custom URL path: `new Audio(customUrl)`, `volume = 0.7`, store ref, `play().catch(noop)`. Synth path: fallback to `'gladiator'` if trackId not in INTRO_SYNTHS, then `getCtx()` guard before calling synthesizer.

### stopIntroMusic (line 343)
Only handles custom `_introAudioEl`; synth playback cannot be stopped mid-stream (Web Audio nodes are fire-and-forget once scheduled).

---

## Agent 04

### getCtx (line 16)
Lazy `AudioContext` init with `webkitAudioContext` fallback. Resumes suspended context. Returns null on construction failure.

### sfxEnabled (line 34)
localStorage read with `!== false` check. Returns true by default. Try/catch safety net.

### osc (line 49)
Creates and schedules an `OscillatorNode` with exponential gain decay. 50ms stop-time padding for clean ramp completion. No return value; nodes are fire-and-forget.

### noise (line 62)
Creates mono `AudioBuffer` filled with scaled white noise. `bufSize = floor(sampleRate * duration)` for accurate duration. Identical gain ramp pattern to `osc`.

### sndRoundStart (line 83)
3 osc calls: C5 sine → E5 sine (offset 80ms) → C6 triangle shimmer (offset 50ms).

### sndTurnSwitch (line 90)
2 osc calls: A5 sine → C6 sine (offset 40ms). Brief and sharp.

### sndPointsAwarded (line 96)
3 triangle osc calls (C6, E6, G6 ascending) + `noise` metallic attack.

### sndReferenceDrop (line 104)
C3 thud + C7 ping (wide frequency spread) + `noise` impact.

### sndChallenge (line 111)
Descending E5→C5→A4 square wave (warning/alarm character).

### sndTimerWarning (line 118)
30ms noise tick + 40ms 1kHz sine. Very short, unobtrusive.

### sndDebateEnd (line 124)
4-note ascending C5→C6 arpeggio (sine) + C6 triangle shimmer. Total ~0.8s.

### playSound (line 148)
sfxEnabled → getCtx → SOUNDS[name] → fn(ctx). Silent no-op if any guard fails or name not found.

### vibrate (line 157)
sfxEnabled → navigator.vibrate feature check → call. Default 50ms.

### introGladiator (line 192)
7-note fanfare array. `notes.forEach((f, i) => osc(ctx, 'triangle', f, times[i]!, ...))`. Bass root + 3 noise bursts.

### introThunder (line 203)
7 hits. Each: noise (alternating gain via `i%2===0`) + low sine. Sawtooth drone overlay.

### introScholar (line 213)
8-note melody forEach + 4-note harmony forEach. Two independent passes over same `ctx`.

### introPhantom (line 222)
8-note descending sawtooth forEach + sustained drone + continuous hiss noise.

### introPhoenix (line 230)
Direct OscillatorNode construction (not via `osc` helper). `frequency.exponentialRampToValueAtTime(1760, now+1.8)` — 8x frequency sweep (220→1760Hz). Gain: linear ramp in/out. 3 burst triangle notes + noise at 1.4s.

### introColossus (line 249)
4-impact forEach. Each impact: sine 55Hz + sine 82Hz (offset 20ms) + noise. Sawtooth drone.

### introViper (line 260)
8-note square stab pattern (chromatic, 160ms intervals). Tail: 6 noise bursts at 60ms spacing.

### introOracle (line 271)
Array destructuring of chord pairs. Two 3-note pads with 0.1s internal offsets. Background noise.

### introChampion (line 282)
7 snare hits (noise, alternating gain) + 7-note bugle motif (triangle, G major).

### introGhost (line 292)
4 sparse pulse pairs (frequencies shift with index i). Background noise. High ping at 1.5s.

### playIntroMusic (line 323)
sfxEnabled guard. Pause/null _introAudioEl. Custom branch stores Audio ref + calls play with empty catch. Synth branch: `INTRO_SYNTHS[trackId] ?? INTRO_SYNTHS['gladiator']!` fallback, then `getCtx()` guard.

### stopIntroMusic (line 343)
Pause + null `_introAudioEl` if exists. No-op otherwise. No sfxEnabled dependency.

---

## Agent 05

### getCtx (line 16)
Module singleton pattern. Creates `AudioContext` once, resumes if suspended. `webkitAudioContext` for Safari. `console.warn` on failure. Returns null if unavailable.

### sfxEnabled (line 34)
LocalStorage read. `JSON.parse` with fallback `'{}'`. Returns `s.audio_sfx !== false` — explicit false opt-out, everything else is on. Catch returns true.

### osc (line 49)
Web Audio node creation: OscillatorNode + GainNode. Exponential gain decay from `gain` to 0.001 over `[start, end]`. Stop at `end + 0.05`. Connects o→g→destination. All scheduling relative to `ctx.currentTime`.

### noise (line 62)
Single-channel AudioBuffer. `bufSize = floor(sampleRate * duration)`. Fill with `(random*2-1)*0.3`. BufferSourceNode. Same gain/stop pattern as `osc`.

### sndRoundStart (line 83) — sndDebateEnd (line 124)
Seven pure sound functions. Each calls `osc`/`noise` 2–5 times with fixed constants. No side effects beyond Web Audio node scheduling. Each completes within spec's 1.5s limit (longest is `sndDebateEnd` at ~0.8s).

### playSound (line 148)
Exported. Guards: `!sfxEnabled()` → return; `!getCtx()` → return. SOUNDS map lookup by `SoundName`. `if (fn) fn(ctx)` — defensive even though type system ensures name validity.

### vibrate (line 157)
Exported. Guards: `!sfxEnabled()` → return; `!navigator.vibrate` → return. Calls `navigator.vibrate(ms)` with default 50ms.

### introGladiator (line 192) — introGhost (line 292)
Ten synthesizers. Nine use `forEach` over note/timing arrays delegating to `osc`/`noise`. `introPhoenix` manually constructs an OscillatorNode with `exponentialRampToValueAtTime` on frequency (220→1760 Hz) — the only place in the file where a raw oscillator is created outside the `osc` helper.

### playIntroMusic (line 323)
Exported. sfxEnabled guard. Always pause/null `_introAudioEl` first (cleanup side effect even if sfx disabled — wait, sfxEnabled returns early before cleanup if disabled). Synth branch uses `?? INTRO_SYNTHS['gladiator']!` fallback for unknown trackIds. `getCtx()` checked after synth lookup.

### stopIntroMusic (line 343)
Exported. Unconditional (no sfxEnabled check). Pauses `_introAudioEl` if non-null and clears ref. Cannot stop synth tracks (already scheduled on Web Audio graph).
