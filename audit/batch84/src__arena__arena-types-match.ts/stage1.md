# Stage 1 Outputs — arena-types-match.ts

## Agent 01

1. comment (lines 1-3: block comment)
2. blank (line 4)
3. import (line 5: `import type { DebateRole } from './arena-types.ts'`)
4. blank (line 6)
5. bind name to type (line 7: `export interface MatchData`)
6. blank (line 19)
7. bind name to type (line 20: `export interface MatchAcceptResponse`)
8. blank (line 25)

## Agent 02

1. comment (lines 1-3: JSDoc block comment)
2. blank (line 4)
3. import (line 5: `import type { DebateRole } from './arena-types.ts'`)
4. blank (line 6)
5. bind name to type (exported) (line 7-18: `export interface MatchData`)
6. blank (line 19)
7. bind name to type (exported) (line 20-24: `export interface MatchAcceptResponse`)
8. blank (line 25: end of file)

## Agent 03

1. comment (lines 1-3)
2. blank (line 4)
3. import (line 5) — type-only import of DebateRole
4. blank (line 6)
5. bind name to type (line 7) — MatchData interface (exported)
6. bind name to type (line 20) — MatchAcceptResponse interface (exported)
7. blank (line 25)

## Agent 04

1. comment
2. blank
3. import (type-only import: DebateRole)
4. blank
5. bind name to type (exported interface: MatchData)
6. blank
7. bind name to type (exported interface: MatchAcceptResponse)
8. blank

## Agent 05

1. **comment** (lines 1-3: block comment)
2. **blank** (line 4)
3. **import** (line 5: `import type { DebateRole } from './arena-types.ts'`)
4. **blank** (line 6)
5. **bind name to type** (lines 7-18: `export interface MatchData` — exported)
6. **blank** (line 19)
7. **bind name to type** (lines 20-24: `export interface MatchAcceptResponse` — exported)
8. **blank** (line 25)
