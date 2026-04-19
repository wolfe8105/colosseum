# Stage 1 Outputs — tokens.types.ts

## Agent 01
1. comment (lines 1-3: block comment)
2. bind name to type — export MilestoneKey (type alias union, lines 5-9)
3. bind name to type — export MilestoneDefinition (interface, lines 11-16)
4. bind name to type — export ClaimResult (interface, lines 18-32)
5. bind name to type — export MilestoneListItem (interface, lines 34-37)
6. bind name to type — export TokenSummary (interface, lines 39-43)
7. (blanks throughout)

## Agent 02
1. comment (lines 1-3)
2. export type MilestoneKey (type alias, union of string literals)
3. export interface MilestoneDefinition (interface binding with readonly properties)
4. export interface ClaimResult (interface binding)
5. export interface MilestoneListItem (interface binding, extends MilestoneDefinition)
6. export interface TokenSummary (interface binding)
7. (blanks throughout)

## Agent 03
1. block comment (lines 1–3)
2. type alias declaration with export: MilestoneKey (lines 5–9)
3. interface declaration with export: MilestoneDefinition (lines 11–16)
4. interface declaration with export: ClaimResult (lines 18–32)
5. interface declaration with export: MilestoneListItem (lines 34–37)
6. interface declaration with export: TokenSummary (lines 39–43)
7. (blanks throughout)

## Agent 04
1. comment: block documentation (lines 1-3)
2. bind name to type: MilestoneKey (exported, union type)
3. bind name to interface: MilestoneDefinition (exported)
4. bind name to interface: ClaimResult (exported)
5. bind name to interface: MilestoneListItem (exported)
6. bind name to interface: TokenSummary (exported)
7. (blanks throughout)

## Agent 05
1. comment (JSDoc-style block, lines 1–3)
2. export type MilestoneKey — type alias binding
3. export interface MilestoneDefinition — interface binding
4. export interface ClaimResult — interface binding
5. export interface MilestoneListItem — interface binding
6. export interface TokenSummary — interface binding
7. (blanks throughout)
