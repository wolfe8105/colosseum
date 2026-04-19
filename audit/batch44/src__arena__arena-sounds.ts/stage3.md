# Stage 3 Outputs — arena-sounds.ts

Anchors: sndRoundStart (16), sndTurnSwitch (23), sndPointsAwarded (29), sndReferenceDrop (37), sndChallenge (44), sndTimerWarning (51), sndDebateEnd (57), playSound (81), vibrate (90)

---

## Agent 01

### Accuracy verdict
Errors found — one confirmed Stage 2 parameter-order mistake; all behavioral risk descriptions are accurate.

### Stage 2 errors
**"peak gain 0.7" for C6 sine in sndDebateEnd** — Incorrect. `osc(ctx, 'sine', 1047, 0.36, 0.7, 0.25)`: position 5 is stopOffset=0.7s, position 6 is gain=0.25. The "0.7" is a stop time, not a gain value.

### Findings

#### PREVIOUSLY FOUND
None (file was clean in Batches 11R and 14R).

#### NEW findings

**Low — `vibrate()` coupled to `sfxEnabled()` — no independent haptics preference**
`vibrate()` returns early if `sfxEnabled()` is false. A user who mutes audio cannot get haptic feedback. Orthogonal preferences sharing a single gate.

**Low — `fn(ctx)` in `playSound` has no try/catch**
If the AudioContext is in a closed/degraded state, `osc()` or `noise()` calls can throw a DOMException. No try/catch around `fn(ctx)` means the exception propagates to the arena event handler, potentially breaking downstream logic. A `try { fn(ctx); } catch { }` wrapper would contain it.

**Low — `getCtx()` resume is fire-and-forget**
`getCtx()` may internally call `ctx.resume()` without awaiting the Promise. Nodes scheduled while context is still in `suspended` state are silently dropped. Fix belongs in `arena-sounds-core.ts`; noted here as a cross-file dependency risk.

**Low — `sfxEnabled()` uncached localStorage read on every call**
Both `playSound` and `vibrate` call `sfxEnabled()` independently — two localStorage reads + JSON.parse per event that calls both. Low practical impact given infrequent call rate.

---

## Agent 02

### Accuracy verdict
Errors found — Stage 2 Agent 01 made parameter-order mistakes on sndDebateEnd and sndRoundStart C5.

### Stage 2 errors
**Error 1 — sndDebateEnd "peak gain 0.7":** Wrong. `osc(ctx, 'sine', 1047, 0.36, 0.7, 0.25)` — gain=0.25, stop=0.7s. Stage 2 misread position 5 as gain.

**Error 2 — sndRoundStart C5 stop/gain transposition:** Stage 2 described "end=0.25s, gain=0.15" for `osc(ctx, 'sine', 523, 0, 0.15, 0.25)`. Actual: stop=0.15s, gain=0.25. Both errors share the same root cause: osc arg 5 and 6 were swapped.

### Findings

#### PREVIOUSLY FOUND
None (file was clean in Batches 11R and 14R).

#### NEW findings
None. Sound synthesis logic is purely additive. AudioNodes self-cleanup on stop. sfxEnabled() guard fires before getCtx(), avoiding unnecessary context creation. All parameter values are within safe WebAudio ranges. File is functionally clean.

---

## Agent 03

### Accuracy verdict
Accurate. Stage 2 runtime-walk descriptions match the source correctly.

### Stage 2 errors
None.

### Findings

#### PREVIOUSLY FOUND
None (file was clean in Batches 11R and 14R).

#### NEW findings

**Low — `sfxEnabled()` uncached localStorage read — not a real performance risk; informational**
localStorage reads are synchronous but sub-microsecond on all modern engines. Sound events fire a handful of times per session. The uncached read has the benefit of always reflecting the user's latest setting. No action needed; noted for completeness.

**Low — `if (fn)` guard in `playSound` is redundant but harmless**
`SoundName` is `keyof typeof SOUNDS`, so TypeScript guarantees `fn` is never null at compile time. The guard is logically unreachable but costs nothing and provides a safe fallback against future key-map drift. Leave it.

**Low — `vibrate` gated on `sfxEnabled()` — genuine UX coupling**
Haptics and audio are orthogonal preferences. A user who mutes SFX loses haptics. Real UX gap but small given iOS doesn't support Vibration API at all, further reducing affected audience. Product decision, not a bug.

**Low — No try/catch around `fn(ctx)` in `playSound`**
If AudioContext enters a bad state post-guard-check, `osc()` can throw. A bare `try { fn(ctx); } catch { }` would contain it. Real but extremely low probability given hardcoded arguments and WebAudio's reliability under normal conditions.

**Low (latent, in arena-sounds-core.ts) — `noise()` zero-duration edge case**
`createBuffer(1, 0, ...)` throws `NotSupportedError` per WebAudio spec. No call site passes duration=0; minimum is 0.03. Latent defect in the core file, not here.

---

## Agent 04

### Accuracy verdict
Accurate overall; two specific numeric-value errors from Stage 2 Agent 01 confirmed.

### Stage 2 errors
**Error 1 — sndDebateEnd "peak gain 0.7":** Confirmed wrong. `osc(ctx, 'sine', 1047, 0.36, 0.7, 0.25)` — stop=0.7s, gain=0.25.

**Error 2 — sndRoundStart C5 "end=0.25s, gain=0.15":** Confirmed wrong. `osc(ctx,'sine',523,0,0.15,0.25)` — stop=0.15s, gain=0.25. Both errors: Stage 2 transposed osc args 5 and 6.

### Findings

#### PREVIOUSLY FOUND
None (file was clean in Batches 11R and 14R).

#### NEW findings

**Low — `sfxEnabled()` reads localStorage on every call, no caching**
Two parse cycles per user interaction that triggers both `playSound` and `vibrate`. Negligible in practice; existing try/catch correctly handles corrupt JSON.

**Low — `fn(ctx)` in `playSound` has no try/catch**
Bad AudioContext state can cause `osc`/`noise` to throw, unhandled, propagating to the arena handler and breaking downstream logic that follows the `playSound` call. A `try { fn(ctx); } catch { }` wrapper eliminates this.

**Low — `vibrate` gated on `sfxEnabled()` — haptics/audio preference coupling**
Separate conceptual preferences share one flag. UX limitation, not a bug. No action needed unless a haptics-specific settings field is added.

---

## Agent 05

### Accuracy verdict
Accurate overall, with one minor framing imprecision in Stage 2 risk description (sndTimerWarning rate-limiting described as caller's responsibility — accurate but understates that the file itself provides no protection).

### Stage 2 errors
None factual.

### Findings

#### PREVIOUSLY FOUND
None (file was clean in Batches 11R and 14R).

#### NEW findings

**Low — No try/catch around `fn(ctx)` in `playSound`**
`osc`/`noise` create AudioNodes; a closed or degraded AudioContext causes throws. Uncaught exception propagates to caller. A `try { fn(ctx); } catch { }` is sufficient mitigation.

**Low — `getCtx()` resume not awaited; suspended context silently plays nothing**
Browser autoplay policy suspends the AudioContext until a user gesture. Nodes scheduled on a suspended context are silently dropped. Fix belongs in `arena-sounds-core.ts`. Failure mode is silent (no sound), not a crash.

**Low — `sfxEnabled()` localStorage read on every call**
In tight loops (rapid timer ticks), this is repeated synchronous I/O on the main thread. Low practical severity for an audio module.

**Low — `vibrate` gated on `sfxEnabled()`; no independent haptics toggle**
Real UX limitation. Muting SFX also kills haptics.

**Low — sndTimerWarning (and all snd* functions) lack internal rate limiting**
Each call unconditionally creates AudioNodes. Under rapid repeated calls (per-second timer ticks), accumulated nodes create GC pressure and overlapping tone artifacts. Not a memory leak (nodes self-cleanup after stop), but a real risk under sustained high-frequency calls. Caller must enforce rate limiting.

---

## Synthesis

**Stage 2 accuracy:** 2 of 5 agents confirmed parameter-order errors in Stage 2 Agent 01 descriptions for sndRoundStart and sndDebateEnd. Root cause: `osc()` positional args 5 (stopOffset) and 6 (gain) were transposed. These are description errors only — the source code itself is correct.

**Previously found:** None (file was clean in Batches 11R and 14R).

**New findings consensus:**

| Finding | Agents | Severity consensus |
|---------|--------|-------------------|
| No try/catch around fn(ctx) in playSound | 4/5 | Low |
| vibrate coupled to sfxEnabled() — no independent haptics toggle | 4/5 | Low |
| sfxEnabled() uncached localStorage read | 4/5 | Low (Agent 03: not a real risk) |
| getCtx() resume not awaited — suspended context drops nodes | 3/5 | Low (fix in core file) |
| sndTimerWarning no rate limiting — AudioNode accumulation | 2/5 | Low |

**Final assessment:** No High or Medium findings. All Low. File remains functionally clean at 3rd audit (Batch 44). The `fn(ctx)` missing try/catch (4/5 agents, clear consensus) is the most actionable Low — a single-line fix.
