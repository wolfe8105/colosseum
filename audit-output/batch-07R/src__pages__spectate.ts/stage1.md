# Stage 1 Outputs — spectate.ts

## Agent 01

Flat numbered inventory of `src/pages/spectate.ts` in source order:

1. comment — block comment: module title, description, migration and decomposition notes (lines 1–8)
2. comment — line comment: LM-SPECTATE-001 note about removed rpc() wrapper (lines 10–11)
3. import — named imports `ready`, `getSupabaseClient`, `safeRpc`, `getCurrentUser`, `getIsPlaceholderMode` from `../auth.ts` (line 13)
4. import — named import `nudge` from `../nudge.ts` (line 14)
5. import — side-effect import of `../analytics.ts` (line 15)
6. import — named import `state` from `./spectate.state.ts` (line 16)
7. import — named imports `showError`, `renderSpectateView`, `renderMessages` from `./spectate.render.ts` (line 17)
8. import — named imports `updateVoteBar`, `updatePulse` from `./spectate.vote.ts` (line 18)
9. import — named import `startChatPolling` from `./spectate.chat.ts` (line 19)
10. import — type-only named imports `DebateMessage`, `SpectateDebate`, `ReplayData` from `./spectate.types.ts` (line 20)
11. blank (line 21)
12. bind `startPolling` to function definition (lines 22–88)
13. blank (line 89)
14. bind `loadDebate` to function definition (lines 90–220)
15. blank (line 221)
16. comment — line comment: LM-SPECTATE-003 note prohibiting conversion of IIFE to top-level await (lines 222–223)
17. top-level statement — immediately-invoked async function expression `init` executed at module load (lines 224–275)

## Agent 02

Here is the flat numbered inventory of `src/pages/spectate.ts` in source order:

1. comment — JSDoc block describing the file (lines 1–8)
2. comment — inline note about LM-SPECTATE-001 (lines 10–11)
3. import — named imports `ready`, `getSupabaseClient`, `safeRpc`, `getCurrentUser`, `getIsPlaceholderMode` from `../auth.ts` (line 13)
4. import — named import `nudge` from `../nudge.ts` (line 14)
5. import — side-effect import of `../analytics.ts` (line 15)
6. import — named import `state` from `./spectate.state.ts` (line 16)
7. import — named imports `showError`, `renderSpectateView`, `renderMessages` from `./spectate.render.ts` (line 17)
8. import — named imports `updateVoteBar`, `updatePulse` from `./spectate.vote.ts` (line 18)
9. import — named import `startChatPolling` from `./spectate.chat.ts` (line 19)
10. import — type-only named imports `DebateMessage`, `SpectateDebate`, `ReplayData` from `./spectate.types.ts` (line 20)
11. blank (line 21)
12. bind `startPolling` to function definition (lines 22–88)
13. blank (line 89)
14. bind `loadDebate` to function definition (lines 90–220)
15. blank (line 221)
16. comment — inline note about LM-SPECTATE-003 (lines 222–223)
17. top-level statement — IIFE `(async function init() { ... })()` executed at module load (lines 224–275)

## Agent 03

Here is the flat numbered inventory of `src/pages/spectate.ts` in source order:

1. comment — block comment: module header (lines 1–8)
2. comment — inline comment: LM-SPECTATE-001 note (lines 10–11)
3. blank
4. import — named imports `ready`, `getSupabaseClient`, `safeRpc`, `getCurrentUser`, `getIsPlaceholderMode` from `../auth.ts`
5. import — named import `nudge` from `../nudge.ts`
6. import — side-effect import `../analytics.ts`
7. import — named import `state` from `./spectate.state.ts`
8. import — named imports `showError`, `renderSpectateView`, `renderMessages` from `./spectate.render.ts`
9. import — named imports `updateVoteBar`, `updatePulse` from `./spectate.vote.ts`
10. import — named import `startChatPolling` from `./spectate.chat.ts`
11. import — type-only named imports `DebateMessage`, `SpectateDebate`, `ReplayData` from `./spectate.types.ts`
12. blank
13. bind `startPolling` to function definition (async, returns `Promise<void>`)
14. blank
15. bind `loadDebate` to function definition (async, returns `Promise<void>`)
16. blank
17. comment — inline comment: LM-SPECTATE-003 note (lines 222–223)
18. top-level statement — immediately-invoked async function expression `init` (lines 224–275)

## Agent 04

Here is the flat numbered inventory of `src/pages/spectate.ts` in source order:

1. comment — block comment: module header (THE MODERATOR, Spectator View Controller, migration notes)
2. blank
3. comment — line comment: LM-SPECTATE-001 note about rpc() wrapper removal
4. blank
5. import — named imports `ready`, `getSupabaseClient`, `safeRpc`, `getCurrentUser`, `getIsPlaceholderMode` from `../auth.ts`
6. import — named import `nudge` from `../nudge.ts`
7. import — side-effect import `../analytics.ts`
8. import — named import `state` from `./spectate.state.ts`
9. import — named imports `showError`, `renderSpectateView`, `renderMessages` from `./spectate.render.ts`
10. import — named imports `updateVoteBar`, `updatePulse` from `./spectate.vote.ts`
11. import — named import `startChatPolling` from `./spectate.chat.ts`
12. import — type-only named imports `DebateMessage`, `SpectateDebate`, `ReplayData` from `./spectate.types.ts`
13. blank
14. bind `startPolling` to function definition — `async function startPolling(): Promise<void>`
15. blank
16. bind `loadDebate` to function definition — `async function loadDebate(): Promise<void>`
17. blank
18. comment — line comment: LM-SPECTATE-003 note about retaining the IIFE
19. top-level statement — immediately invoked async function expression `(async function init() { ... })()`

## Agent 05

Here is the flat inventory of `src/pages/spectate.ts` in source order:

1. comment — block comment (file header: THE MODERATOR — Spectator View Controller)
2. blank
3. comment — line comment (LM-SPECTATE-001 note about rpc() wrapper removal)
4. comment — (continuation of LM-SPECTATE-001 note)
5. blank
6. import — named imports `ready`, `getSupabaseClient`, `safeRpc`, `getCurrentUser`, `getIsPlaceholderMode` from `../auth.ts`
7. import — named import `nudge` from `../nudge.ts`
8. import — side-effect import of `../analytics.ts`
9. import — named import `state` from `./spectate.state.ts`
10. import — named imports `showError`, `renderSpectateView`, `renderMessages` from `./spectate.render.ts`
11. import — named imports `updateVoteBar`, `updatePulse` from `./spectate.vote.ts`
12. import — named import `startChatPolling` from `./spectate.chat.ts`
13. import — type-only named imports `DebateMessage`, `SpectateDebate`, `ReplayData` from `./spectate.types.ts`
14. blank
15. bind name to function definition — `startPolling` (async function)
16. blank
17. bind name to function definition — `loadDebate` (async function)
18. blank
19. comment — line comment (LM-SPECTATE-003 note about IIFE retention)
20. comment — (continuation of LM-SPECTATE-003 note)
21. top-level statement — immediately-invoked async function expression `(async function init() { ... })()`
