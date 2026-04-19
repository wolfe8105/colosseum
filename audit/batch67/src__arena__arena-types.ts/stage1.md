# Stage 1 Outputs — arena-types.ts

## Agent 01

### Primitive Inventory

**Imports:**
- `import type { SettleResult } from '../staking.ts'` — type-only import

**Type Aliases (4):**
1. `ArenaView` (line 11) — exported union of 11 string literals: `'lobby' | 'modeSelect' | 'queue' | 'matchFound' | 'room' | 'preDebate' | 'postDebate' | 'privateLobbyWaiting' | 'modQueue' | 'modDebatePicker' | 'modDebateWaiting'`
2. `DebateMode` (line 12) — exported union: `'live' | 'voicememo' | 'text' | 'ai'`
3. `DebateStatus` (line 13) — exported union: `'pending' | 'lobby' | 'matched' | 'live' | 'completed' | 'complete'` — carries LANDMINE comment `[LM-TYPES-001]`
4. `DebateRole` (line 14) — exported union: `'a' | 'b'`

**Interfaces (4):**
1. `ModeInfo` (line 16) — exported; fields: `id: DebateMode`, `icon: string`, `name: string`, `desc: string`, `available: string`, `color: string`; all `readonly`
2. `DebateMessage` (line 25) — exported; fields: `role: 'user' | 'assistant'`, `text: string`, `round: number`
3. `CurrentDebate` (line 31) — exported; 22 fields including optional/nullable `opponentId`, `moderatorType/Id/Name`, `_stakingResult: SettleResult | null`, `debater_a/b`, `modView`, `debaterAName/BName`, `ruleset`, `spectatorView`, `concededBy`, `_nulled`, `_nullReason`, `language`, `tournament_match_id`
4. `SelectedModerator` (line 61) — exported; fields: `type: 'human' | 'ai'`, `id: string | null`, `name: string`

**Functions:** None.

**Module-level state:** None.

---

## Agent 02

### Primitive Inventory

**Imports (1):**
- `SettleResult` — type-only from `../staking.ts`

**Type Aliases (4):**
1. `ArenaView` — union of 11 view-state literals
2. `DebateMode` — union of 4 mode literals (`live`, `voicememo`, `text`, `ai`)
3. `DebateStatus` — union of 6 status literals; includes both `'completed'` and `'complete'` (documented dual-value landmine)
4. `DebateRole` — union `'a' | 'b'`

**Interfaces (4):**
1. `ModeInfo` — 6 readonly string fields; `id` typed as `DebateMode`
2. `DebateMessage` — 3 fields; `role` is `'user' | 'assistant'` inline union
3. `CurrentDebate` — large interface, 22+ fields; `opponentElo` is typed as `number | string` (mixed type); `_stakingResult` uses imported `SettleResult`; private-convention underscore fields: `_stakingResult`, `_nulled`, `_nullReason`
4. `SelectedModerator` — 3 fields; `id` is `string | null`

**Functions:** None.

**Module-level state:** None.

---

## Agent 03

### Primitive Inventory

**Imports:**
- `import type { SettleResult }` from `../staking.ts` — sole import, type-only

**Exported type aliases:**
- `ArenaView` (line 11): 11-member string literal union
- `DebateMode` (line 12): 4-member string literal union
- `DebateStatus` (line 13): 6-member string literal union — note both `'completed'` and `'complete'` present; LANDMINE comment references LM-TYPES-001
- `DebateRole` (line 14): 2-member string literal union

**Exported interfaces:**
- `ModeInfo` (line 16): 6 readonly fields; `color: string` field present (not hex color, just a string field name)
- `DebateMessage` (line 25): 3 fields
- `CurrentDebate` (line 31): approximately 22 fields including many optional; `opponentElo: number | string` is a union type field; `ruleset?: 'amplified' | 'unplugged'` inline union
- `SelectedModerator` (line 61): 3 fields

**Functions:** None — file contains zero function declarations, zero arrow functions, zero class definitions.

**Module-level state:** None — file contains only type-level declarations.

---

## Agent 04

### Primitive Inventory

**Imports:**
- `SettleResult` (type import, `../staking.ts`)

**Type aliases (all exported):**
1. `ArenaView` — 11 string literals
2. `DebateMode` — 4 string literals
3. `DebateStatus` — 6 string literals including `'completed'` and `'complete'` as separate members
4. `DebateRole` — `'a' | 'b'`

**Interfaces (all exported):**
1. `ModeInfo` — 6 readonly fields; `id` is `DebateMode`, `color` is plain `string`
2. `DebateMessage` — `role`, `text`, `round`
3. `CurrentDebate` — largest interface; notable fields:
   - `opponentElo: number | string` — dual type
   - `_stakingResult?: SettleResult | null` — uses imported type
   - `concededBy?: 'a' | 'b' | null` — inline literal union
   - `ruleset?: 'amplified' | 'unplugged'` — inline literal union
   - Multiple private-convention underscore fields
4. `SelectedModerator` — `type`, `id`, `name`

**Functions:** Zero.

**Module-level state:** Zero.

---

## Agent 05

### Primitive Inventory

**Import:**
- `SettleResult` — type-only from `../staking.ts`

**Type aliases (4, all exported):**
- `ArenaView`: union of 11 view literals
- `DebateMode`: union of 4 mode literals
- `DebateStatus`: union of 6 status literals (dual `completed`/`complete` — LANDMINE [LM-TYPES-001])
- `DebateRole`: `'a' | 'b'`

**Interfaces (4, all exported):**
- `ModeInfo`: 6 fields, all `readonly`; `color: string` is a name, not a hex value
- `DebateMessage`: 3 fields
- `CurrentDebate`: 22 fields; mixed-type `opponentElo: number | string`; uses `SettleResult` in `_stakingResult`; optional `tournament_match_id?: string | null`
- `SelectedModerator`: 3 fields

**Functions:** None present in file.

**Module-level state:** None present in file.

---

## Stage 1 Summary

All 5 agents agree: the file contains 1 import, 4 type aliases, 4 interfaces, and 0 functions.
