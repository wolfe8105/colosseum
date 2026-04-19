# Stage 1 Outputs — arena-feed-spec-chat.ts

## Agent 01

1. comment — block comment: module header describing F-07 spectator chat
2. blank
3. import — `safeRpc`, `getCurrentProfile` from `../auth.ts`
4. import — `escapeHTML` from `../config.ts`
5. blank
6. comment — section label `// ── Module state ──...`
7. bind name to value — `pollInterval` (`let`)
8. bind name to value — `lastMessageTime` (`let`)
9. bind name to value — `chatOpen` (`let`)
10. bind name to value — `activeDebateId` (`let`)
11. blank
12. comment — section label `// ── Types ──...`
13. bind name to type — `SpecChatMessage` (interface)
14. blank
15. comment — section label `// ── Public API ──...`
16. blank
17. comment — JSDoc block for `initSpecChat`
18. bind name to function definition — `initSpecChat` (exported)
19. blank
20. comment — JSDoc line for `cleanupSpecChat`
21. bind name to function definition — `cleanupSpecChat` (exported)
22. blank
23. comment — section label `// ── Internal ──...`
24. blank
25. bind name to function definition — `toggleSpecChat`
26. blank
27. bind name to function definition — `loadMessages`
28. blank
29. bind name to function definition — `renderMessages`
30. blank
31. bind name to function definition — `handleSend`
32. blank
33. bind name to function definition — `scrollToBottom`

## Agent 02

1. comment — block comment: file header (THE MODERATOR — Spectator Chat, F-07 description, features list, design note)
2. blank
3. import — `safeRpc`, `getCurrentProfile` from `'../auth.ts'`
4. import — `escapeHTML` from `'../config.ts'`
5. blank
6. comment — `// ── Module state ──...`
7. bind name to value — `pollInterval` (`let`, `ReturnType<typeof setInterval> | null`, initialized `null`)
8. bind name to value — `lastMessageTime` (`let`, `string | null`, initialized `null`)
9. bind name to value — `chatOpen` (`let`, initialized `false`)
10. bind name to value — `activeDebateId` (`let`, `string | null`, initialized `null`)
11. blank
12. comment — `// ── Types ──...`
13. bind name to type — `SpecChatMessage` (interface)
14. blank
15. comment — `// ── Public API ──...`
16. blank
17. comment — block comment: JSDoc for `initSpecChat`
18. bind name to function definition — `initSpecChat` (exported)
19. blank
20. comment — block comment: JSDoc for `cleanupSpecChat`
21. bind name to function definition — `cleanupSpecChat` (exported)
22. blank
23. comment — `// ── Internal ──...`
24. blank
25. bind name to function definition — `toggleSpecChat`
26. blank
27. bind name to function definition — `loadMessages`
28. blank
29. bind name to function definition — `renderMessages`
30. blank
31. bind name to function definition — `handleSend`
32. blank
33. bind name to function definition — `scrollToBottom`

## Agent 03

1. comment — block comment: file header (THE MODERATOR — Spectator Chat, F-07 description, features list)
2. blank
3. import — `safeRpc`, `getCurrentProfile` from `'../auth.ts'`
4. import — `escapeHTML` from `'../config.ts'`
5. blank
6. comment — section label: `// ── Module state ──...`
7. bind name to value — `pollInterval` (`let`, `ReturnType<typeof setInterval> | null`, initialized `null`)
8. bind name to value — `lastMessageTime` (`let`, `string | null`, initialized `null`)
9. bind name to value — `chatOpen` (`let`, initialized `false`)
10. bind name to value — `activeDebateId` (`let`, `string | null`, initialized `null`)
11. blank
12. comment — section label: `// ── Types ──...`
13. bind name to type — `SpecChatMessage` (interface)
14. blank
15. comment — section label: `// ── Public API ──...`
16. blank
17. comment — block comment: JSDoc for `initSpecChat`
18. bind name to function definition — `initSpecChat` (exported)
19. blank
20. comment — line comment: JSDoc for `cleanupSpecChat`
21. bind name to function definition — `cleanupSpecChat` (exported)
22. blank
23. comment — section label: `// ── Internal ──...`
24. blank
25. bind name to function definition — `toggleSpecChat`
26. blank
27. bind name to function definition — `loadMessages` (async)
28. blank
29. bind name to function definition — `renderMessages`
30. blank
31. bind name to function definition — `handleSend` (async)
32. blank
33. bind name to function definition — `scrollToBottom`

## Agent 04

1. comment — block comment: file header (THE MODERATOR, F-07, feature description)
2. blank
3. import — `safeRpc`, `getCurrentProfile` from `../auth.ts`
4. import — `escapeHTML` from `../config.ts`
5. blank
6. comment — section label: "Module state"
7. bind name to value — `pollInterval`
8. bind name to value — `lastMessageTime`
9. bind name to value — `chatOpen`
10. bind name to value — `activeDebateId`
11. blank
12. comment — section label: "Types"
13. bind name to type — `SpecChatMessage` (interface)
14. blank
15. comment — section label: "Public API"
16. blank
17. comment — block comment: JSDoc for `initSpecChat`
18. bind name to function definition — `initSpecChat` (exported)
19. blank
20. comment — line comment: JSDoc for `cleanupSpecChat`
21. bind name to function definition — `cleanupSpecChat` (exported)
22. blank
23. comment — section label: "Internal"
24. blank
25. bind name to function definition — `toggleSpecChat`
26. blank
27. bind name to function definition — `loadMessages`
28. blank
29. bind name to function definition — `renderMessages`
30. blank
31. bind name to function definition — `handleSend`
32. blank
33. bind name to function definition — `scrollToBottom`

## Agent 05

1. comment — block comment (file header, lines 1–18)
2. blank — line 19
3. import — `safeRpc`, `getCurrentProfile` from `'../auth.ts'`
4. import — `escapeHTML` from `'../config.ts'`
5. blank — line 23
6. comment — line 23 (`// ── Module state ───...`)
7. bind name to value — `pollInterval` (let, `ReturnType<typeof setInterval> | null`, initialized `null`)
8. bind name to value — `lastMessageTime` (let, `string | null`, initialized `null`)
9. bind name to value — `chatOpen` (let, `boolean`, initialized `false`)
10. bind name to value — `activeDebateId` (let, `string | null`, initialized `null`)
11. blank — line 28
12. comment — line 29 (`// ── Types ───...`)
13. bind name to type — `SpecChatMessage` (interface)
14. blank — line 38
15. comment — line 39 (`// ── Public API ───...`)
16. blank — line 40
17. comment — block comment (lines 41–45, JSDoc for `initSpecChat`)
18. bind name to function definition — `initSpecChat` (exported)
19. blank — line 106
20. comment — line 107 (JSDoc line for `cleanupSpecChat`)
21. bind name to function definition — `cleanupSpecChat` (exported)
22. blank — line 117
23. comment — line 118 (`// ── Internal ───...`)
24. blank — line 119
25. bind name to function definition — `toggleSpecChat`
26. blank — line 128
27. bind name to function definition — `loadMessages` (async)
28. blank — line 149
29. bind name to function definition — `renderMessages`
30. blank — line 179
31. bind name to function definition — `handleSend` (async)
32. blank — line 219
33. bind name to function definition — `scrollToBottom`
34. blank — line 224 (trailing blank / EOF)
