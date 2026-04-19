# Stage 3 Outputs — rivals-presence.ts

## Agent 01

### init

All structural and behavioral claims CONFIRMED.
- Exported async, no parameters, `Promise<void>`. (line 45)
- Four sequential guards in order: `FEATURES.rivals`, `getIsPlaceholderMode()`, `getCurrentUser()`, `initialized`. (lines 46–50)
- `initialized = true` written at line 52, before first `await` at line 54 — re-entrancy lock is effective.
- `await buildRivalSet(rivalSet)` — return value discarded, no try/catch. (line 54) Whether `buildRivalSet` internally catches its own errors is UNVERIFIABLE from this file.
- `channelState` assembled with `rivalSet`, `onlineRivals`, `channelRef`, and `onAlert: (p) => queueAlert(p, popupState)`. (lines 56–61) CONFIRMED.
- `await startPresence(channelState)` — return value discarded, no try/catch. (line 62) Internals UNVERIFIABLE.
- No try/catch on either await. If either rejects, `initialized` is permanently `true` — no recovery within this module.
- No timers, no DOM mutations in `init`. CONFIRMED.

### destroy

All structural claims CONFIRMED.
- Exported synchronous function, no parameters, `void`. (line 65)
- No early-return guards. Channel removal is conditional; state resets are unconditional.
- `getSupabaseClient()` → `supabase`. If `supabase && channelRef.value`: `removeChannel(channelRef.value)` then `channelRef.value = null`. (lines 66–70)
- Unconditional state resets in order: `rivalSet.clear()` → `onlineRivals.clear()` → `popupState.queue.length = 0` → `popupState.active = false` → `initialized = false`. (lines 71–75)
- DOM cleanup: explicit null-check pattern (lines 77–78), not optional chaining.
- Does NOT call `rivals-presence-popup.destroy()` — import from that module is limited to `queueAlert` (line 15). No popup timer cancellation occurs. CONFIRMED.
- Popup timer internals (`_dismissTimer`, `_showNextTimer`, `_autoTimer`) are UNVERIFIABLE from this file alone.

## Agent 02

All claims CONFIRMED with one minor REFUTED syntax detail.
- REFUTED (minor): Agent 02 writes DOM cleanup as `getElementById('rival-alert-popup')?.remove()` — source uses explicit two-statement null check (lines 77–78), not optional chaining. Functionally equivalent; syntax characterization is inaccurate.
- All other claims match Agent 01 verdicts.

## Agent 03

All claims CONFIRMED (same verdicts as Agent 01).
- Claim that channel is `'global-online'` is UNVERIFIABLE from this file (that name lives in `rivals-presence-channel.ts`).

## Agent 04

All claims CONFIRMED with same minor syntax REFUTED as Agent 02.
- REFUTED (minor): DOM cleanup described with optional chaining — source uses explicit null check.
- Claim about `LM-RIVALS-004` designation is UNVERIFIABLE (not in AUDIT-FINDINGS.md under that label; the related finding is listed as M-E6).

## Agent 05

Most claims CONFIRMED. Two issues:
- CONFIRMED: `removeChannel` returns a Promise that is not awaited (line 68). `destroy` is a synchronous `void` function. The return value is silently discarded — teardown is fire-and-forget.
- REFUTED: "If `getSupabaseClient()` throws, the entire state-clearing block is skipped." The state resets (lines 71–75) are OUTSIDE the `if (supabase && channelRef.value)` block and execute unconditionally. A null/undefined return from `getSupabaseClient()` does NOT skip them; only an actual thrown exception would abort the function before reaching them. The implication that state resets are inside the conditional guard is incorrect.
- REFUTED (minor): DOM cleanup described with optional chaining — source uses explicit null check.

## Consensus

### Refuted Claims

1. **DOM cleanup syntax** (Agents 02, 04, 05): Described as `getElementById('rival-alert-popup')?.remove()`. Source (lines 77–78) uses: `const popup = document.getElementById('rival-alert-popup'); if (popup) popup.remove();` — functionally equivalent, but optional chaining is not present.

2. **Agent 05 `getSupabaseClient()` throw claim**: "If `getSupabaseClient()` throws, the entire state-clearing block is skipped." REFUTED — the state resets (lines 71–75) are outside and after the conditional `if` block. A null return does not skip them. Only a thrown exception escaping the function would, which is a distinct scenario not implied by the code structure.

3. **Agent 01 suppression scenario**: Agent 01 describes a scenario where `_autoTimer` fires after `destroy` and leaves `popupState.active` stuck as `true`, suppressing future popups. However, `destroy` explicitly sets `popupState.active = false` at line 74, so the state is clean after `destroy` completes. The specific timer-fires-after-destroy-and-corrupts-state scenario is possible only if the timer fires concurrently with `destroy` or after `init` is called again. Partially REFUTED as stated; the timer leak is a valid concern but the exact corruption path is UNVERIFIABLE from this file.

### Findings Confirmed by Source

1. `initialized = true` written before any `await` in `init` (line 52 precedes line 54) — all five agents agree.
2. No try/catch around either `await buildRivalSet()` (line 54) or `await startPresence()` (line 62) in `init` — all five agents confirm.
3. `destroy` does not call `rivals-presence-popup.destroy()` — confirmed by import list (line 15: only `queueAlert` imported from that module) and absence of any such call in `destroy` body.
4. `removeChannel` Promise is not awaited (line 68) — `destroy` is a synchronous `void` function; teardown is fire-and-forget.
5. State reset sequence in `destroy` (lines 71–75) is unconditional: `rivalSet.clear()` → `onlineRivals.clear()` → `popupState.queue.length = 0` → `popupState.active = false` → `initialized = false`.

### Previously Fixed / Previously Noted Items

AUDIT-FINDINGS.md entries **M-E4, M-E5, M-E6, M-E7, L-E1** from Batch 6 were filed against the pre-decomposition monolithic `rivals-presence.ts`. The current file is the orchestrator barrel; the sub-module functions (`_showNext`, `_buildRivalSet`, `_dismissPopup`, `_startPresence`) are now in `rivals-presence-popup.ts` and `rivals-presence-channel.ts`. Those findings must be re-evaluated against their new home files.

The timer-leak concern (related to old **M-E6**) remains live in this orchestrator: `destroy()` does not call `rivals-presence-popup.destroy()`. This is the orchestrator-layer manifestation of the same gap.

### Confirmed Reliability Issues

**FINDING — LOW (Reliability):** No try/catch around `await buildRivalSet(rivalSet)` (line 54) and `await startPresence(channelState)` (line 62) in `init`. Both callees are believed to handle their own internal errors (UNVERIFIABLE from this file), making the practical risk low. However, if either rejects, `initialized` is permanently `true` for the session with no recovery path in this module — presence alerts silently disabled until `destroy()` is called externally. Fix: wrap both awaits in try/catch/finally that resets `initialized = false` on failure.

**FINDING — LOW (Reliability):** `supabase.removeChannel(channelRef.value)` (line 68) is called without `await` in a synchronous `void` function. The returned Promise (Supabase SDK's async teardown) is silently discarded. Teardown success cannot be confirmed and any rejection is swallowed. Fix: trivially unavoidable given `destroy` is synchronous; acceptable low-severity gap.

**FINDING — LOW (Reliability, variant of M-E6):** `destroy()` does not call `rivals-presence-popup.destroy()`. Popup sub-module timer handles remain armed after `destroy`. `popupState` is reset correctly in `destroy` (lines 73–74), but popup sub-module callbacks that fire later operate on the shared `popupState` object. The practical risk depends on popup sub-module internals (unverifiable here) but the structural gap is confirmed. Fix: import and call `rivals-presence-popup.destroy()` from this `destroy` function.
