# Stage 1 Outputs — share.ui.ts

## Agent 01
1. comment — block comment (lines 1–6)
2. blank
3. import — `FEATURES` from `./config.ts`
4. import — `shareResult`, `inviteFriend` from `./share.ts`
5. import — type-only import of `ShareResultParams` from `./share.ts`
6. blank
7. comment — section header INTERNAL STATE
8. blank
9. comment — inline doc (BUG 1 FIX)
10. bind name to value — `_pendingShareResult`
11. blank
12. comment — section header PUBLIC API
13. blank
14. bind name to function definition — `showPostDebatePrompt` (exported)

## Agent 02
1. comment — block comment (lines 1–6)
2. import — `FEATURES` from `./config.ts`
3. import — `shareResult`, `inviteFriend` from `./share.ts`
4. import — type `ShareResultParams` from `./share.ts`
5. comment — section header INTERNAL STATE
6. comment — inline doc BUG 1 FIX
7. bind name to value — `_pendingShareResult` (let, ShareResultParams | null, null)
8. comment — section header PUBLIC API
9. bind name to function definition — `showPostDebatePrompt` (exported)

## Agent 03
1. comment — block comment (lines 1–6)
2. import — `FEATURES` from `./config.ts`
3. import — `shareResult`, `inviteFriend` from `./share.ts`
4. import — type `ShareResultParams` from `./share.ts`
5. comment — section banner INTERNAL STATE
6. comment — line comment on `_pendingShareResult`
7. bind name to value — `_pendingShareResult` (let, ShareResultParams | null, null)
8. comment — section banner PUBLIC API
9. bind name to function definition — `showPostDebatePrompt` (exported)

## Agent 04
1. comment — block comment (lines 1–6)
2. import — `FEATURES` from `./config.ts`
3. import — `shareResult`, `inviteFriend` from `./share.ts`
4. import — type `ShareResultParams` from `./share.ts`
5. comment — section label INTERNAL STATE
6. comment — inline note BUG 1 FIX
7. bind name to value — `_pendingShareResult` (let, ShareResultParams | null, null)
8. comment — section label PUBLIC API
9. bind name to function definition — `showPostDebatePrompt` (exported)

## Agent 05
1. comment — block comment (lines 1–6)
2. import — `FEATURES` from `./config.ts`
3. import — `shareResult`, `inviteFriend` from `./share.ts`
4. import — type `ShareResultParams` from `./share.ts`
5. comment — section banner INTERNAL STATE
6. comment — inline doc on `_pendingShareResult`
7. bind name to value — `_pendingShareResult` (let, ShareResultParams | null, null)
8. comment — section banner PUBLIC API
9. bind name to function definition — `showPostDebatePrompt` (exported)
