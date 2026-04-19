# Stage 1 Outputs — arena-feed-wiring-debater.ts

## Agent 01
1. Comment (lines 1-7)
2. Import (line 9) - `getCurrentProfile` from `../auth.ts`
3. Import (line 10) - `showToast` from `../config.ts`
4. Import (line 11) - `stopTranscription` from `./arena-deepgram.ts`
5. Import (lines 12-19) - `currentDebate`, `feedPaused`, `challengeRulingTimer`, `set_feedPaused`, `set_challengeRulingTimer`, `set_activeChallengeRefId` from `./arena-state.ts`
6. Import type-only (line 20) - `CurrentDebate` from `./arena-types.ts`
7. Import (line 21) - `round` from `./arena-feed-state.ts`
8. Import (line 22) - `appendFeedEvent`, `writeFeedEvent` from `./arena-feed-events.ts`
9. Import (line 23) - `setDebaterInputEnabled` from `./arena-feed-ui.ts`
10. Import (line 24) - `clearFeedTimer`, `finishCurrentTurn` from `./arena-feed-machine-turns.ts`
11. Import (line 25) - `startFinalAdBreak` from `./arena-feed-machine-ads.ts`
12. Import (line 26) - `showCiteDropdown`, `showChallengeDropdown` from `./arena-feed-references.ts`
13. Import (line 27) - `clearInterimTranscript` from `./arena-feed-transcript.ts`
14. Blank (line 28-29)
15. Bind name to function definition, exported (line 30) - `wireDebaterControls`
16. Top-level statement (lines 31-34) - const declarations (input, sendBtn, finishBtn, concedeBtn)
17. Top-level statement (lines 36-41) - event listener on input
18. Top-level statement (line 43) - event listener on sendBtn
19. Top-level statement (lines 44-46) - event listener on input keydown
20. Top-level statement (lines 48-50) - event listener on finishBtn
21. Top-level statement (lines 52-76) - event listener on concedeBtn
22. Top-level statement (lines 78-83) - event listener on citeBtn
23. Top-level statement (lines 85-90) - event listener on challengeBtn
24. Blank (line 92)
25. Bind name to function definition (line 93) - `submitDebaterMessage`

## Agent 02
1. Comment (lines 1-7)
2. Import: `getCurrentProfile` from '../auth.ts'
3. Import: `showToast` from '../config.ts'
4. Import: `stopTranscription` from './arena-deepgram.ts'
5. Import: `currentDebate`, `feedPaused`, `challengeRulingTimer`, `set_feedPaused`, `set_challengeRulingTimer`, `set_activeChallengeRefId` from './arena-state.ts'
6. Import (type-only): `CurrentDebate` from './arena-types.ts'
7. Import: `round` from './arena-feed-state.ts'
8. Import: `appendFeedEvent`, `writeFeedEvent` from './arena-feed-events.ts'
9. Import: `setDebaterInputEnabled` from './arena-feed-ui.ts'
10. Import: `clearFeedTimer`, `finishCurrentTurn` from './arena-feed-machine-turns.ts'
11. Import: `startFinalAdBreak` from './arena-feed-machine-ads.ts'
12. Import: `showCiteDropdown`, `showChallengeDropdown` from './arena-feed-references.ts'
13. Import: `clearInterimTranscript` from './arena-feed-transcript.ts'
14. Blank (line 28)
15. Blank (line 29)
16. Bind name to function definition (exported): `wireDebaterControls` (lines 30-91)
17. Blank (line 92)
18. Bind name to function definition: `submitDebaterMessage` (lines 93-128)

## Agent 03
1. Comment (lines 1-7)
2. Import (line 9: `getCurrentProfile` from `../auth.ts`)
3. Import (line 10: `showToast` from `../config.ts`)
4. Import (line 11: `stopTranscription` from `./arena-deepgram.ts`)
5. Import (lines 12-19: named imports from `./arena-state.ts`)
6. Import (line 20: type-only import `CurrentDebate` from `./arena-types.ts`)
7. Import (line 21: `round` from `./arena-feed-state.ts`)
8. Import (line 22: named imports from `./arena-feed-events.ts`)
9. Import (line 23: `setDebaterInputEnabled` from `./arena-feed-ui.ts`)
10. Import (line 24: named imports from `./arena-feed-machine-turns.ts`)
11. Import (line 25: `startFinalAdBreak` from `./arena-feed-machine-ads.ts`)
12. Import (line 26: named imports from `./arena-feed-references.ts`)
13. Import (line 27: `clearInterimTranscript` from `./arena-feed-transcript.ts`)
14. Blank (line 28)
15. Blank (line 29)
16. Bind name to function definition, exported (line 30: `wireDebaterControls`)
17. Bind name to function definition (line 93: `submitDebaterMessage`)

## Agent 04
1. comment (lines 1-7)
2. import (line 9) — `getCurrentProfile`
3. import (line 10) — `showToast`
4. import (line 11) — `stopTranscription`
5. import (lines 12-19) — `currentDebate`, `feedPaused`, `challengeRulingTimer`, `set_feedPaused`, `set_challengeRulingTimer`, `set_activeChallengeRefId`
6. import (line 20) — type-only `CurrentDebate`
7. import (line 21) — `round`
8. import (line 22) — `appendFeedEvent`, `writeFeedEvent`
9. import (line 23) — `setDebaterInputEnabled`
10. import (line 24) — `clearFeedTimer`, `finishCurrentTurn`
11. import (line 25) — `startFinalAdBreak`
12. import (line 26) — `showCiteDropdown`, `showChallengeDropdown`
13. import (line 27) — `clearInterimTranscript`
14. blank (line 28)
15. blank (line 29)
16. bind name to function definition (line 30) — `wireDebaterControls` (exported)
17. bind name to function definition (line 93) — `submitDebaterMessage`

## Agent 05
1. Comment
2. Blank
3. Import: `getCurrentProfile` from `../auth.ts`
4. Import: `showToast` from `../config.ts`
5. Import: `stopTranscription` from `./arena-deepgram.ts`
6. Import: `currentDebate`, `feedPaused`, `challengeRulingTimer`, `set_feedPaused`, `set_challengeRulingTimer`, `set_activeChallengeRefId` from `./arena-state.ts`
7. Import (type-only): `CurrentDebate` from `./arena-types.ts`
8. Import: `round` from `./arena-feed-state.ts`
9. Import: `appendFeedEvent`, `writeFeedEvent` from `./arena-feed-events.ts`
10. Import: `setDebaterInputEnabled` from `./arena-feed-ui.ts`
11. Import: `clearFeedTimer`, `finishCurrentTurn` from `./arena-feed-machine-turns.ts`
12. Import: `startFinalAdBreak` from `./arena-feed-machine-ads.ts`
13. Import: `showCiteDropdown`, `showChallengeDropdown` from `./arena-feed-references.ts`
14. Import: `clearInterimTranscript` from `./arena-feed-transcript.ts`
15. Blank
16. Bind name to function definition and export: `wireDebaterControls`
17-32. Top-level statements (body of wireDebaterControls)
33. Blank
34. Bind name to function definition: `submitDebaterMessage`
