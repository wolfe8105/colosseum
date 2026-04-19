# Stage 1 Outputs — arena-room-voicememo.ts

## Agent 01
1. comment — `// arena-room-voicememo.ts — voice memo recording & sending`
2. comment — `// Part of the arena.ts monolith split`
3. blank
4. import — `safeRpc` from `'../auth.ts'`
5. import — `startRecording`, `stopRecording`, `retake as vmRetake`, `send as vmSend` from `'../voicememo.ts'`
6. import — `currentDebate`, `vmRecording`, `vmTimer`, `vmSeconds`, `set_vmRecording`, `set_vmTimer`, `set_vmSeconds` from `'./arena-state.ts'`
7. import (type) — `DebateRole` from `'./arena-types.ts'`
8. import — `isPlaceholder`, `formatTimer` from `'./arena-core.utils.ts'`
9. import — `addMessage`, `addSystemMessage` from `'./arena-room-live-messages.ts'`
10. import — `startOpponentPoll`, `advanceRound` from `'./arena-room-live-poll.ts'`
11. blank
12. bind `wireVoiceMemoControls` to function definition (exported)
13. blank
14. bind `startVoiceMemoRecording` to function definition (exported)
15. blank
16. bind `stopVoiceMemoRecording` to function definition (exported)
17. blank
18. bind `resetVoiceMemoUI` to function definition (exported)
19. blank
20. bind `_sendingMemo` to value
21. blank
22. bind `sendVoiceMemo` to function definition (exported)

## Agent 02
1. comment — `// arena-room-voicememo.ts — voice memo recording & sending`
2. comment — `// Part of the arena.ts monolith split`
3. blank
4. import — `safeRpc` from `'../auth.ts'`
5. import — `startRecording`, `stopRecording`, `retake as vmRetake`, `send as vmSend` from `'../voicememo.ts'`
6. import — `currentDebate`, `vmRecording`, `vmTimer`, `vmSeconds`, `set_vmRecording`, `set_vmTimer`, `set_vmSeconds` from `'./arena-state.ts'`
7. import (type-only) — `DebateRole` from `'./arena-types.ts'`
8. import — `isPlaceholder`, `formatTimer` from `'./arena-core.utils.ts'`
9. import — `addMessage`, `addSystemMessage` from `'./arena-room-live-messages.ts'`
10. import — `startOpponentPoll`, `advanceRound` from `'./arena-room-live-poll.ts'`
11. blank
12. bind `wireVoiceMemoControls` to function definition (exported)
13. blank
14. bind `startVoiceMemoRecording` to function definition (exported, async)
15. blank
16. bind `stopVoiceMemoRecording` to function definition (exported)
17. blank
18. bind `resetVoiceMemoUI` to function definition (exported)
19. blank
20. bind `_sendingMemo` to value `false`
21. blank
22. bind `sendVoiceMemo` to function definition (exported, async)

## Agent 03
1. comment — `// arena-room-voicememo.ts — voice memo recording & sending`
2. comment — `// Part of the arena.ts monolith split`
3. blank
4. import — `safeRpc` from `'../auth.ts'`
5. import — `startRecording`, `stopRecording`, `retake as vmRetake`, `send as vmSend` from `'../voicememo.ts'`
6. import — `currentDebate`, `vmRecording`, `vmTimer`, `vmSeconds`, `set_vmRecording`, `set_vmTimer`, `set_vmSeconds` from `'./arena-state.ts'` (spans lines 6–9)
7. import — type `DebateRole` from `'./arena-types.ts'`
8. import — `isPlaceholder`, `formatTimer` from `'./arena-core.utils.ts'`
9. import — `addMessage`, `addSystemMessage` from `'./arena-room-live-messages.ts'`
10. import — `startOpponentPoll`, `advanceRound` from `'./arena-room-live-poll.ts'`
11. blank
12. bind `wireVoiceMemoControls` to function definition (exported)
13. blank
14. bind `startVoiceMemoRecording` to function definition (exported)
15. blank
16. bind `stopVoiceMemoRecording` to function definition (exported)
17. blank
18. bind `resetVoiceMemoUI` to function definition (exported)
19. blank
20. bind `_sendingMemo` to value (`false`)
21. blank
22. bind `sendVoiceMemo` to function definition (exported)

## Agent 04
1. comment — `// arena-room-voicememo.ts — voice memo recording & sending`
2. comment — `// Part of the arena.ts monolith split`
3. blank
4. import — `safeRpc` from `'../auth.ts'`
5. import — `startRecording`, `stopRecording`, `retake as vmRetake`, `send as vmSend` from `'../voicememo.ts'`
6. import — `currentDebate`, `vmRecording`, `vmTimer`, `vmSeconds`, `set_vmRecording`, `set_vmTimer`, `set_vmSeconds` from `'./arena-state.ts'`
7. import (type) — `DebateRole` from `'./arena-types.ts'`
8. import — `isPlaceholder`, `formatTimer` from `'./arena-core.utils.ts'`
9. import — `addMessage`, `addSystemMessage` from `'./arena-room-live-messages.ts'`
10. import — `startOpponentPoll`, `advanceRound` from `'./arena-room-live-poll.ts'`
11. blank
12. bind name to function definition — `wireVoiceMemoControls` (exported)
13. blank
14. bind name to function definition — `startVoiceMemoRecording` (exported)
15. blank
16. bind name to function definition — `stopVoiceMemoRecording` (exported)
17. blank
18. bind name to function definition — `resetVoiceMemoUI` (exported)
19. blank
20. bind name to value — `_sendingMemo`
21. blank
22. bind name to function definition — `sendVoiceMemo` (exported)

## Agent 05
1. comment — `// arena-room-voicememo.ts — voice memo recording & sending`
2. comment — `// Part of the arena.ts monolith split`
3. blank
4. import — `safeRpc` from `../auth.ts`
5. import — `startRecording`, `stopRecording`, `retake as vmRetake`, `send as vmSend` from `../voicememo.ts`
6. import — `currentDebate`, `vmRecording`, `vmTimer`, `vmSeconds`, `set_vmRecording`, `set_vmTimer`, `set_vmSeconds` from `./arena-state.ts` (spans lines 6–9)
7. import — type-only import of `DebateRole` from `./arena-types.ts`
8. import — `isPlaceholder`, `formatTimer` from `./arena-core.utils.ts`
9. import — `addMessage`, `addSystemMessage` from `./arena-room-live-messages.ts`
10. import — `startOpponentPoll`, `advanceRound` from `./arena-room-live-poll.ts`
11. blank
12. bind `wireVoiceMemoControls` to function definition (exported)
13. blank
14. bind `startVoiceMemoRecording` to function definition (exported)
15. blank
16. bind `stopVoiceMemoRecording` to function definition (exported)
17. blank
18. bind `resetVoiceMemoUI` to function definition (exported)
19. blank
20. bind `_sendingMemo` to value (`false`)
21. blank
22. bind `sendVoiceMemo` to function definition (exported)
