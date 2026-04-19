# Stage 1 Outputs — arena.ts

## Agent 01
1. **comment** — block comment (lines 1–10)
2. **blank** (line 11)
3. **comment** — `// --- Side-effect: auto-init + popstate registration ---` (line 12)
4. **import** — side-effect import of `'./arena/arena-core.ts'` (line 13)
5. **blank** (line 14)
6. **comment** — `// --- Types ---` (line 15)
7. **re-export** — `export type { ArenaView, DebateMode, DebateStatus, DebateRole, ModeInfo, DebateMessage, CurrentDebate, SelectedModerator }` from `'./arena/arena-types.ts'` (line 16)
8. **re-export** — `export type { MatchData, MatchAcceptResponse }` from `'./arena/arena-types-match.ts'` (line 17)
9. **re-export** — `export type { ArenaFeedItem, AutoDebateItem }` from `'./arena/arena-types-feed-list.ts'` (line 18)
10. **re-export** — `export type { AvailableModerator, ModQueueItem, ModDebateJoinResult, ModDebateCheckResult }` from `'./arena/arena-types-moderator.ts'` (line 19)
11. **re-export** — `export type { PowerUpEquipped, RankedCheckResult, UpdateDebateResult, ReferenceItem }` from `'./arena/arena-types-results.ts'` (line 20)
12. **re-export** — `export type { AIScoreResult, SideScores }` from `'./arena/arena-types-ai-scoring.ts'` (line 21)
13. **blank** (line 22)
14. **comment** — `// --- Constants ---` (line 23)
15. **re-export** — `export { MODES, TEXT_MAX_CHARS }` from `'./arena/arena-constants.ts'` (line 24)
16. **blank** (line 25)
17. **comment** — `// --- State (re-export for any external consumers) ---` (line 26)
18. **re-export** — `export { referencePollTimer, pendingReferences, activatedPowerUps, shieldActive, equippedForDebate, silenceTimer, _rulingCountdownTimer }` from `'./arena/arena-state.ts'` (lines 27–35)
19. **blank** (line 36)
20. **comment** — `// --- Core ---` (line 37)
21. **re-export** — `export { init, destroy, getView, getCurrentDebate }` from `'./arena/arena-core.ts'` (line 38)
22. **blank** (line 39)
23. **comment** — `// --- Lobby ---` (line 40)
24. **bind name to function definition** — `showPowerUpShop`, exported, async (lines 41–44)
25. **blank** (line 45)
26. **comment** — `// --- Config ---` (line 46)
27. **re-export** — `export { showRankedPicker, closeRankedPicker, showRulesetPicker, closeRulesetPicker }` from `'./arena/arena-config-settings.ts'` (lines 47–50)
28. **re-export** — `export { showModeSelect, closeModeSelect }` from `'./arena/arena-config-mode-select.ts'` (line 51)
29. **blank** (line 52)
30. **comment** — `// --- Queue ---` (line 53)
31. **re-export** — `export { enterQueue, leaveQueue }` from `'./arena/arena-queue.ts'` (line 54)
32. **blank** (line 55)
33. **comment** — `// --- Room ---` (line 56)
34. **re-export** — `export { showPreDebate }` from `'./arena/arena-room-predebate.ts'` (line 57)
35. **re-export** — `export { enterRoom }` from `'./arena/arena-room-enter.ts'` (line 58)
36. **re-export** — `export { submitTextArgument }` from `'./arena/arena-room-live-poll.ts'` (line 59)
37. **re-export** — `export { addMessage, addSystemMessage }` from `'./arena/arena-room-live-messages.ts'` (line 60)
38. **re-export** — `export { wireVoiceMemoControls }` from `'./arena/arena-room-voicememo.ts'` (line 61)
39. **re-export** — `export { endCurrentDebate }` from `'./arena/arena-room-end.ts'` (line 62)
40. **blank** (line 63)
41. **comment** — `// --- Moderator ---` (line 64)
42. **re-export** — `export { assignSelectedMod, addReferenceButton, showReferenceForm, hideReferenceForm, showRulingPanel, startReferencePoll }` from `'./arena/arena-mod-refs.ts'` (line 65)
43. **re-export** — `export { renderModScoring }` from `'./arena/arena-mod-scoring.ts'` (line 66)
44. **blank** (line 67)
45. **comment** — `// --- Private Lobby ---` (line 68)
46. **re-export** — `export { showPrivateLobbyPicker }` from `'./arena/arena-private-picker.ts'` (line 69)

## Agent 02
[identical structure — all 5 agents unanimously agree. Only function definition: `showPowerUpShop` (line 41).]

## Agent 03
[identical — `showPowerUpShop` (line 41), all other entries are imports, re-exports, comments, or blanks.]

## Agent 04
[identical — `showPowerUpShop` (line 41).]

## Agent 05
[identical — `showPowerUpShop` (line 41).]
