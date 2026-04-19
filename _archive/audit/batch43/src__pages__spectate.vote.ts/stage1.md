# Stage 1 Outputs — spectate.vote.ts

## Agent 01
1. comment — block comment (lines 1–5)
2. blank
3. import — `safeRpc` from `../auth.ts`
4. import — `claimVote` from `../tokens.ts`
5. import — `nudge` from `../nudge.ts`
6. import — `state` from `./spectate.state.ts`
7. import type — `SpectateDebate` from `./spectate.types.ts`
8. blank
9. bind name to function definition — `wireVoteButtons` (exported)
10. blank
11. async function definition — `castVote` (unexported)
12. blank
13. bind name to function definition — `updateVoteBar` (exported)
14. blank
15. bind name to function definition — `updatePulse` (exported)

## Agent 02
1. comment — block comment (lines 1–5)
2. import — `safeRpc` from `../auth.ts`
3. import — `claimVote` from `../tokens.ts`
4. import — `nudge` from `../nudge.ts`
5. import — `state` from `./spectate.state.ts`
6. import type — `SpectateDebate` from `./spectate.types.ts`
7. bind name to function definition — `wireVoteButtons` (exported) [note: agent incorrectly labeled async — source shows sync]
8. async function definition — `castVote` (unexported)
9. bind name to function definition — `updateVoteBar` (exported) [note: agent incorrectly labeled async — source shows sync]
10. bind name to function definition — `updatePulse` (exported) [note: agent incorrectly labeled async — source shows sync]

## Agent 03
1. comment — block comment (lines 1–5)
2. import — `safeRpc` from `../auth.ts`
3. import — `claimVote` from `../tokens.ts`
4. import — `nudge` from `../nudge.ts`
5. import — `state` from `./spectate.state.ts`
6. import type — `SpectateDebate` from `./spectate.types.ts`
7. function definition (exported) — `wireVoteButtons`
8. async function definition (unexported) — `castVote`
9. function definition (exported) — `updateVoteBar`
10. function definition (exported) — `updatePulse`

## Agent 04
1. comment — block comment (lines 1–5)
2. import — `safeRpc` from `../auth.ts`
3. import — `claimVote` from `../tokens.ts`
4. import — `nudge` from `../nudge.ts`
5. import — `state` from `./spectate.state.ts`
6. import type — `SpectateDebate` from `./spectate.types.ts`
7. function — `wireVoteButtons` (exported)
8. function — `castVote` (unexported, async)
9. function — `updateVoteBar` (exported)
10. function — `updatePulse` (exported)

## Agent 05
1. comment — block comment (lines 1–5)
2. import — `safeRpc` from `../auth.ts`
3. import — `claimVote` from `../tokens.ts`
4. import — `nudge` from `../nudge.ts`
5. import — `state` from `./spectate.state.ts`
6. import type — `SpectateDebate` from `./spectate.types.ts`
7. function definition — `wireVoteButtons` (exported)
8. function definition — `castVote` (unexported, async)
9. function definition — `updateVoteBar` (exported)
10. function definition — `updatePulse` (exported)
