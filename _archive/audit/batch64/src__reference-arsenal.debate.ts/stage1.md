# Stage 1 Outputs — reference-arsenal.debate.ts

## Agent 01

Top-level named callable bindings:
1. saveDebateLoadout (line 12) — exported async function
2. getMyDebateLoadout (line 21) — exported async function
3. citeDebateReference (line 30) — exported async function
4. fileReferenceChallenge (line 44) — exported async function

Imports: safeRpc (from ./auth.ts), types LoadoutRef / CiteResult2 / ChallengeResult2 (type-only from ./reference-arsenal.types.ts). No other top-level bindings.

## Agent 02

Top-level named callable bindings:
1. saveDebateLoadout (line 12) — exported async function. Parameters: debateId: string, referenceIds: string[]. Returns Promise<void>.
2. getMyDebateLoadout (line 21) — exported async function. Parameters: debateId: string. Returns Promise<LoadoutRef[]>.
3. citeDebateReference (line 30) — exported async function. Parameters: debateId: string, referenceId: string, round: number, side: string. Returns Promise<CiteResult2>.
4. fileReferenceChallenge (line 44) — exported async function. Parameters: debateId: string, referenceId: string, round: number, side: string. Returns Promise<ChallengeResult2>.

No classes, no top-level constants or variables, no default exports. Two import statements only.

## Agent 03

Top-level named callable bindings:
1. saveDebateLoadout (line 12) — async, exported. Calls safeRpc('save_debate_loadout', ...). Throws on error. Returns void.
2. getMyDebateLoadout (line 21) — async, exported. Calls safeRpc('get_my_debate_loadout', ...). Throws on error. Returns LoadoutRef[] (fallback to empty array).
3. citeDebateReference (line 30) — async, exported. Calls safeRpc('cite_debate_reference', ...). Throws on error. Returns CiteResult2.
4. fileReferenceChallenge (line 44) — async, exported. Calls safeRpc('file_reference_challenge', ...). Throws on error. Returns ChallengeResult2.

File contains only these four functions and two import statements. No other declarations.

## Agent 04

Top-level named callable bindings:
1. saveDebateLoadout (line 12) — exported async function
2. getMyDebateLoadout (line 21) — exported async function
3. citeDebateReference (line 30) — exported async function
4. fileReferenceChallenge (line 44) — exported async function

All four are exported named async functions. The file has no classes, no non-function top-level variables, no default export. Imports: safeRpc (value), LoadoutRef / CiteResult2 / ChallengeResult2 (type-only).

## Agent 05

Top-level named callable bindings:
1. saveDebateLoadout (line 12) — async, exported. Wraps RPC 'save_debate_loadout'.
2. getMyDebateLoadout (line 21) — async, exported. Wraps RPC 'get_my_debate_loadout'.
3. citeDebateReference (line 30) — async, exported. Wraps RPC 'cite_debate_reference'.
4. fileReferenceChallenge (line 44) — async, exported. Wraps RPC 'file_reference_challenge'.

These four functions are the only callable exports. No module-level side effects beyond imports. No top-level class or variable declarations.
