# Stage 1 — scoring.ts

## Agent 01

### Primitive Inventory

| Line | Primitive | Detail |
|------|-----------|--------|
| 1–8 | block comment | JSDoc header — module description, migration history |
| 10 | import (values) | `safeRpc`, `getIsPlaceholderMode` from `./auth.ts` |
| 11 | import (type) | `SafeRpcResult` from `./auth.ts` |
| 12 | import (value) | `UUID_RE` from `./config.ts` |
| 14–16 | section comment | TYPE DEFINITIONS |
| 18–22 | export interface | `CastVoteParams` — `debateId: string`, `votedFor: string`, `round?: number | null` |
| 24–29 | export interface | `CastVoteResult` — `success: boolean`, `vote_count_a: number`, `vote_count_b: number`, `your_vote: string` |
| 31–35 | export interface | `PlacePredictionParams` — `debateId: string`, `predictedWinnerId: string`, `amount: number` |
| 37–41 | export interface | `PlacePredictionResult` — `success: boolean`, `amount: number`, `new_balance: number` |
| 43–45 | section comment | UUID VALIDATION |
| 47 | inline comment | Session 17 bug fix reference |
| 48–51 | export function | `validateUUID(id: string): string` — throws if !id or !UUID_RE.test(id); returns id |
| 53–55 | section comment | HELPERS |
| 57–59 | function (non-exported) | `isPlaceholder(): boolean` — returns `getIsPlaceholderMode()` |
| 61–63 | section comment | VOTING |
| 65–82 | export async function | `castVote(debateId, votedFor, round)` |
| 84–86 | section comment | PREDICTIONS |
| 88–105 | export async function | `placePrediction(debateId, predictedWinnerId, amount)` |
| 107–109 | section comment | DEFAULT EXPORT |
| 111–114 | const binding | `scoring = { castVote, placePrediction } as const` |
| 116 | export default | `scoring` |

### Sub-inventory: validateUUID (lines 48–51)
| Line | Primitive | Detail |
|------|-----------|--------|
| 49 | conditional throw | `if (!id || !UUID_RE.test(id)) throw new Error(...)` |
| 50 | return | `return id` |

### Sub-inventory: isPlaceholder (lines 57–59)
| Line | Primitive | Detail |
|------|-----------|--------|
| 58 | return (function call) | `return getIsPlaceholderMode()` |

### Sub-inventory: castVote (lines 65–82)
| Line | Primitive | Detail |
|------|-----------|--------|
| 70–72 | conditional early return (mock) | `if (isPlaceholder()) return { success: true, vote_count_a: 5, vote_count_b: 3, your_vote: votedFor }` |
| 74–78 | await destructure | `const { data, error } = await safeRpc<CastVoteResult>('cast_vote', { p_debate_id, p_voted_for, p_round })` |
| 80 | conditional throw | `if (error) throw new Error(error.message)` |
| 81 | return | `return data as CastVoteResult` |

### Sub-inventory: placePrediction (lines 88–105)
| Line | Primitive | Detail |
|------|-----------|--------|
| 93–95 | conditional early return (mock) | `if (isPlaceholder()) return { success: true, amount, new_balance: 50 - amount }` |
| 97–101 | await destructure | `const { data, error } = await safeRpc<PlacePredictionResult>('place_prediction', { p_debate_id, p_predicted_winner, p_amount })` |
| 103 | conditional throw | `if (error) throw new Error(error.message)` |
| 104 | return | `return data as PlacePredictionResult` |

---

## Agent 02

### Primitive Inventory

**Imports**: `safeRpc`, `getIsPlaceholderMode` (values), `SafeRpcResult` (type) from `./auth.ts`; `UUID_RE` from `./config.ts`.

**Type exports**: `CastVoteParams`, `CastVoteResult`, `PlacePredictionParams`, `PlacePredictionResult` — 4 interfaces.

**Function exports**:
- `validateUUID` (line 48) — synchronous, exported
- `castVote` (line 65) — async, exported
- `placePrediction` (line 88) — async, exported

**Non-exported**: `isPlaceholder` (line 57) — helper, calls `getIsPlaceholderMode()`

**Default export**: `scoring` const object (lines 111–116), contains `castVote` and `placePrediction`.

**Note**: `SafeRpcResult` is imported but not used in any exported function signature — `castVote` and `placePrediction` both use inline type assertions (`as CastVoteResult`, `as PlacePredictionResult`). `PlacePredictionParams` is exported but not used within this file.

---

## Agent 03

### Primitive Inventory

| Category | Count | Notes |
|----------|-------|-------|
| Imports | 3 | `safeRpc`, `getIsPlaceholderMode`, `UUID_RE`; `SafeRpcResult` type-only |
| Exported interfaces | 4 | `CastVoteParams`, `CastVoteResult`, `PlacePredictionParams`, `PlacePredictionResult` |
| Exported functions | 3 | `validateUUID`, `castVote`, `placePrediction` |
| Non-exported function | 1 | `isPlaceholder` |
| Default export | 1 | `scoring` const |

**Placeholder mode pattern**: Both async functions have `isPlaceholder()` early-return paths returning hardcoded mock values. `castVote` mock: counts 5/3. `placePrediction` mock: balance `50 - amount`.

---

## Agent 04

### Primitive Inventory

Line 10–12: imports — `safeRpc` (RPC wrapper), `getIsPlaceholderMode` (mode check), `SafeRpcResult` (type import), `UUID_RE` (regex constant from config).

Lines 18–41: 4 exported TypeScript interfaces — `CastVoteParams`, `CastVoteResult`, `PlacePredictionParams`, `PlacePredictionResult`.

Line 48: exported `validateUUID(id: string): string` — UUID guard, throws on invalid format.
Line 57: non-exported `isPlaceholder(): boolean` — thin wrapper around `getIsPlaceholderMode()`.
Line 65: exported async `castVote(debateId, votedFor, round)` — placeholder fast-path, then `safeRpc('cast_vote', ...)`, throws on error.
Line 88: exported async `placePrediction(debateId, predictedWinnerId, amount)` — placeholder fast-path, then `safeRpc('place_prediction', ...)`, throws on error.

Lines 111–116: const `scoring = { castVote, placePrediction } as const`; `export default scoring`.

Observation: `CastVoteParams` and `PlacePredictionParams` interfaces are exported but `castVote` and `placePrediction` use positional parameters directly, not the param interfaces. `SafeRpcResult` imported but not used.

---

## Agent 05

### Primitive Inventory

**Top-level declarations (in order)**:
1. Imports (lines 10–12)
2. `CastVoteParams` interface (export, line 18)
3. `CastVoteResult` interface (export, line 24)
4. `PlacePredictionParams` interface (export, line 31)
5. `PlacePredictionResult` interface (export, line 37)
6. `validateUUID` function (export, line 48)
7. `isPlaceholder` function (non-export, line 57)
8. `castVote` function (export async, line 65)
9. `placePrediction` function (export async, line 88)
10. `scoring` const + default export (lines 111–116)

**Security-relevant primitives**:
- `validateUUID`: uses `UUID_RE` from config — validates format before throw/return
- `castVote`/`placePrediction`: all writes go through `safeRpc` (Castle Defense pattern compliant)
- No `innerHTML` usage anywhere in file
- No user content rendered to DOM from this module

**Unused imports**: `SafeRpcResult` (type) imported at line 11 but not referenced in any function signature.
**Unused interfaces**: `CastVoteParams`, `PlacePredictionParams` exported but neither `castVote` nor `placePrediction` accepts these as typed parameters — they use positional string/number params directly.
