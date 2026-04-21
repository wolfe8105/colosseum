# Stage 3 Verification — src/async.state.ts

Verifiers: A, B, C, D, E (5 independent agents)
Anchor: state (line 43)

---

## Claim Verdicts

| Claim | Verdict | Lines |
|-------|---------|-------|
| state is export const, 10 accessor slots | PASS | 43–70 |
| hotTakes/predictions/standaloneQuestions: getter+setter | PASS | 44–51 |
| All three return live array reference (no defensive copy) | PASS | 44, 47, 50 |
| currentFilter: getter+setter, primitive string, no runtime validation | PASS | 53–54 |
| pendingChallengeId: getter+setter, string\|null, no UUID validation at setter | PASS | 56–57 |
| reactingIds: getter-only, returns live Set<string> reference | PASS | 59 |
| postingInFlight/challengeInFlight: getter+setter, boolean scalars | PASS | 61–65 |
| predictingInFlight: getter-only, returns live Set<string> reference | PASS | 67 |
| wiredContainers: getter-only, returns live WeakSet<HTMLElement> reference | PASS | 69 |
| Module side effect line 200: forEach populates PLACEHOLDER_TAKES at load | PASS | 200–202 |
| PLACEHOLDER_TAKES: mutable Record, no Object.freeze | PASS | 76 |

All 10 Stage 2 claims confirmed. Zero FAIL or PARTIAL verdicts.

---

## Findings

### F-1 — Low | pendingChallengeId setter accepts any string without UUID validation

**File:** src/async.state.ts  
**Line:** 57  
**Rule:** CLAUDE.md — "UUID validation before PostgREST filters" (defense-in-depth)

```ts
set pendingChallengeId(v: string | null) { _pendingChallengeId = v; }
```

The setter performs no UUID format validation. All 5 verifiers noted this. Verifier E checked callers and confirmed: downstream consumer passes this value as an RPC parameter (`p_hot_take_id`), not into a PostgREST `.or()` filter — so the strict "UUID validation before `.or()` filters" rule is technically not violated. However, a UUID guard would provide defense in depth and is consistent with the project's general pattern of validating IDs at boundaries.

IDs assigned here originate from DB rows (server-generated UUIDs) in normal operation; placeholder sentinel IDs (`t1`–`t6`) are gated by `getIsPlaceholderMode()` before reaching any RPC.

**Consensus:** All 5 verifiers flagged. Net severity: Low (no current exploitation path, RPC not .or() filter).

---

### F-2 — Low | Live array references from hotTakes/predictions/standaloneQuestions getters

**File:** src/async.state.ts  
**Lines:** 44, 47, 50

All three array-typed getters return the live backing variable reference. Any caller that stores the returned array and mutates it in-place (`.push()`, `.splice()`, property assignment on items) modifies module state without going through the setter, bypassing any future validation or hooks. Verifier E noted `take.challenges++` in a sibling file as an example of in-place item mutation via the live reference.

This is an architectural fragility rather than a current bug. No fix required immediately.

**Consensus:** Multiple verifiers flagged. Severity: Low.

---

### F-3 — Low | reactingIds and predictingInFlight Sets are externally mutable despite getter-only

**File:** src/async.state.ts  
**Lines:** 59, 67

Getter-only prevents replacing the collection identity but does not prevent callers from calling `.add()`, `.delete()`, or `.clear()` on the returned reference. A caller erroneously calling `state.reactingIds.clear()` would suppress all in-flight reaction dedup guards until next mutation. Same for `state.predictingInFlight.clear()` — would allow concurrent `place_prediction` RPCs for the same debate.

No evidence of unintentional callers currently. Risk is latent. No `Object.freeze`-equivalent exists for `Set` iteration guard.

**Consensus:** Verifiers A, D noted this explicitly. Severity: Low.

---

### No Findings (informational)

- No `innerHTML` assignments → no escapeHTML or Number() obligations in this file.
- No Supabase `.rpc()` or PostgREST calls → no direct DB mutation violations.
- No user-supplied content rendered → XSS rules not applicable here.
- All previously-fixed items (commit 8bc9ae6 XSS sweep, getSession/noOpLock) are in other files; nothing re-reported.

---

## Summary

| Anchor | Result |
|--------|--------|
| state | PASS — 3 low-severity findings (no Medium or High) |

**File verdict: PASS**  
Findings: 0 Medium/High; 3 Low (UUID validation gap on setter, live array references, ungated Set mutation)  
No previously-fixed items re-reported.
