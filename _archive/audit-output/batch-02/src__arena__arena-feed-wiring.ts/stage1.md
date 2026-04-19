# Stage 1 Outputs — arena-feed-wiring.ts

## Agent 01

1. comment (block comment, lines 1-9: module description listing exported functions)
2. blank
3. import — `safeRpc`, `getCurrentProfile` from `../auth.ts`
4. import — `escapeHTML`, `showToast` from `../config.ts`
5. import — `stopTranscription` from `./arena-deepgram.ts`
6. import — `currentDebate`, `feedPaused`, `challengeRulingTimer`, `challengesRemaining`, `set_feedPaused`, `set_challengeRulingTimer`, `set_activeChallengeRefId` from `./arena-state.ts`
7. import type — `CurrentDebate` from `./arena-types.ts`
8. import — `FEED_SCORE_BUDGET`, `FEED_MAX_CHALLENGES` from `./arena-types.ts`
9. import — `round`, `scoreUsed`, `pinnedEventIds`, `pendingSentimentA`, `pendingSentimentB`, `set_pendingSentimentA`, `set_pendingSentimentB` from `./arena-feed-state.ts`
10. import — `appendFeedEvent`, `writeFeedEvent` from `./arena-feed-events.ts`
11. import — `setDebaterInputEnabled`, `updateBudgetDisplay`, `updateCiteButtonState`, `updateChallengeButtonState`, `applySentimentUpdate` from `./arena-feed-ui.ts`
12. import — `clearFeedTimer`, `finishCurrentTurn`, `startFinalAdBreak`, `pauseFeed` from `./arena-feed-machine.ts`
13. import — `showCiteDropdown`, `showChallengeDropdown`, `showReferencePopup` from `./arena-feed-references.ts`
14. import — `clearInterimTranscript` from `./arena-feed-transcript.ts`
15. import — `modNullDebate` from `./arena-feed-realtime.ts`
16. blank
17. blank
18. bind name to function definition — `renderControls` (exported, line 45)
19. bind name to function definition — `wireDebaterControls` (exported, line 120)
20. bind name to function definition — `wireSpectatorTipButtons` (exported async, line 179)
21. bind name to function definition — `handleTip` (async, line 212)
22. bind name to function definition — `wireModControls` (exported, line 276)
23. bind name to function definition — `submitDebaterMessage` (async, line 389)
24. bind name to function definition — `submitModComment` (async, line 421)
25. bind name to function definition — `handlePinClick` (async, line 449)

## Agent 02

1. comment — block comment lines 1-9
2. blank (line 10)
3. import — `safeRpc`, `getCurrentProfile` from `'../auth.ts'` (line 11)
4. import — `escapeHTML`, `showToast` from `'../config.ts'` (line 12)
5. import — `stopTranscription` from `'./arena-deepgram.ts'` (line 13)
6. import — `currentDebate`, `feedPaused`, `challengeRulingTimer`, `challengesRemaining`, `set_feedPaused`, `set_challengeRulingTimer`, `set_activeChallengeRefId` from `'./arena-state.ts'` (lines 14-22)
7. import type — `CurrentDebate` from `'./arena-types.ts'` (line 23)
8. import — `FEED_SCORE_BUDGET`, `FEED_MAX_CHALLENGES` from `'./arena-types.ts'` (lines 24-26)
9. import — `round`, `scoreUsed`, `pinnedEventIds`, `pendingSentimentA`, `pendingSentimentB`, `set_pendingSentimentA`, `set_pendingSentimentB` from `'./arena-feed-state.ts'` (lines 27-32)
10. import — `appendFeedEvent`, `writeFeedEvent` from `'./arena-feed-events.ts'` (line 33)
11. import — `setDebaterInputEnabled`, `updateBudgetDisplay`, `updateCiteButtonState`, `updateChallengeButtonState`, `applySentimentUpdate` from `'./arena-feed-ui.ts'` (lines 34-38)
12. import — `clearFeedTimer`, `finishCurrentTurn`, `startFinalAdBreak`, `pauseFeed` from `'./arena-feed-machine.ts'` (line 39)
13. import — `showCiteDropdown`, `showChallengeDropdown`, `showReferencePopup` from `'./arena-feed-references.ts'` (line 40)
14. import — `clearInterimTranscript` from `'./arena-feed-transcript.ts'` (line 41)
15. import — `modNullDebate` from `'./arena-feed-realtime.ts'` (line 42)
16. blank (line 43)
17. blank (line 44)
18. bind name to function definition — `renderControls`, exported (line 45): `export function renderControls(debate: CurrentDebate, isModView: boolean): void`
19. blank (line 119)
20. bind name to function definition — `wireDebaterControls`, exported (line 120): `export function wireDebaterControls(debate: CurrentDebate): void`
21. blank (line 177)
22. comment (line 178): JSDoc for wireSpectatorTipButtons
23. bind name to function definition — `wireSpectatorTipButtons`, exported async (line 179): `export async function wireSpectatorTipButtons(debate: CurrentDebate): Promise<void>`
24. blank (line 211)
25. bind name to function definition — `handleTip`, async (line 212): `async function handleTip(btn, debate, statusEl): Promise<void>`
26. blank (line 275)
27. bind name to function definition — `wireModControls`, exported (line 276): `export function wireModControls(): void`
28. blank (line 388)
29. bind name to function definition — `submitDebaterMessage`, async (line 389): `async function submitDebaterMessage(): Promise<void>`
30. blank (line 420)
31. bind name to function definition — `submitModComment`, async (line 421): `async function submitModComment(): Promise<void>`
32. blank (line 448)
33. comment (line 448): JSDoc for handlePinClick
34. bind name to function definition — `handlePinClick`, async (line 449): `async function handlePinClick(btn: HTMLElement): Promise<void>`

## Agent 03

1. comment — module doc block (lines 1-9)
2. blank (10)
3. import — named: `safeRpc`, `getCurrentProfile` — source: `'../auth.ts'` (11)
4. import — named: `escapeHTML`, `showToast` — source: `'../config.ts'` (12)
5. import — named: `stopTranscription` — source: `'./arena-deepgram.ts'` (13)
6. import — named: `currentDebate`, `feedPaused`, `challengeRulingTimer`, `challengesRemaining`, `set_feedPaused`, `set_challengeRulingTimer`, `set_activeChallengeRefId` — source: `'./arena-state.ts'` (14-22)
7. import type — named: `CurrentDebate` — source: `'./arena-types.ts'` (23)
8. import — named: `FEED_SCORE_BUDGET`, `FEED_MAX_CHALLENGES` — source: `'./arena-types.ts'` (24-26)
9. import — named: `round`, `scoreUsed`, `pinnedEventIds`, `pendingSentimentA`, `pendingSentimentB`, `set_pendingSentimentA`, `set_pendingSentimentB` — source: `'./arena-feed-state.ts'` (27-32)
10. import — named: `appendFeedEvent`, `writeFeedEvent` — source: `'./arena-feed-events.ts'` (33)
11. import — named: `setDebaterInputEnabled`, `updateBudgetDisplay`, `updateCiteButtonState`, `updateChallengeButtonState`, `applySentimentUpdate` — source: `'./arena-feed-ui.ts'` (34-38)
12. import — named: `clearFeedTimer`, `finishCurrentTurn`, `startFinalAdBreak`, `pauseFeed` — source: `'./arena-feed-machine.ts'` (39)
13. import — named: `showCiteDropdown`, `showChallengeDropdown`, `showReferencePopup` — source: `'./arena-feed-references.ts'` (40)
14. import — named: `clearInterimTranscript` — source: `'./arena-feed-transcript.ts'` (41)
15. import — named: `modNullDebate` — source: `'./arena-feed-realtime.ts'` (42)
16. blank (43-44)
17. bind name to function definition — `renderControls` [exported] (45): function declaration, params `(debate: CurrentDebate, isModView: boolean): void`
18. bind name to function definition — `wireDebaterControls` [exported] (120): function declaration, params `(debate: CurrentDebate): void`
19. comment — JSDoc (178)
20. bind name to function definition — `wireSpectatorTipButtons` [exported, async] (179): async function declaration, params `(debate: CurrentDebate): Promise<void>`
21. bind name to function definition — `handleTip` [module-private, async] (212): async function declaration, params `(btn: HTMLButtonElement, debate: CurrentDebate, statusEl: HTMLElement | null): Promise<void>`
22. bind name to function definition — `wireModControls` [exported] (276): function declaration, no params, return `void`
23. bind name to function definition — `submitDebaterMessage` [module-private, async] (389): async function declaration, no params, return `Promise<void>`
24. bind name to function definition — `submitModComment` [module-private, async] (421): async function declaration, no params, return `Promise<void>`
25. comment — JSDoc (448)
26. bind name to function definition — `handlePinClick` [module-private, async] (449): async function declaration, params `(btn: HTMLElement): Promise<void>`

## Agent 04

1. comment — block comment, lines 1-9, module description
2. blank — line 10
3. import — `safeRpc`, `getCurrentProfile` from `'../auth.ts'` [line 11]
4. import — `escapeHTML`, `showToast` from `'../config.ts'` [line 12]
5. import — `stopTranscription` from `'./arena-deepgram.ts'` [line 13]
6. import — `currentDebate`, `feedPaused`, `challengeRulingTimer`, `challengesRemaining`, `set_feedPaused`, `set_challengeRulingTimer`, `set_activeChallengeRefId` from `'./arena-state.ts'` [lines 14-22]
7. import type — `CurrentDebate` from `'./arena-types.ts'` [line 23]
8. import — `FEED_SCORE_BUDGET`, `FEED_MAX_CHALLENGES` from `'./arena-types.ts'` [lines 24-26]
9. import — `round`, `scoreUsed`, `pinnedEventIds`, `pendingSentimentA`, `pendingSentimentB`, `set_pendingSentimentA`, `set_pendingSentimentB` from `'./arena-feed-state.ts'` [lines 27-32]
10. import — `appendFeedEvent`, `writeFeedEvent` from `'./arena-feed-events.ts'` [line 33]
11. import — `setDebaterInputEnabled`, `updateBudgetDisplay`, `updateCiteButtonState`, `updateChallengeButtonState`, `applySentimentUpdate` from `'./arena-feed-ui.ts'` [lines 34-38]
12. import — `clearFeedTimer`, `finishCurrentTurn`, `startFinalAdBreak`, `pauseFeed` from `'./arena-feed-machine.ts'` [line 39]
13. import — `showCiteDropdown`, `showChallengeDropdown`, `showReferencePopup` from `'./arena-feed-references.ts'` [line 40]
14. import — `clearInterimTranscript` from `'./arena-feed-transcript.ts'` [line 41]
15. import — `modNullDebate` from `'./arena-feed-realtime.ts'` [line 42]
16. blank — line 43
17. blank — line 44
18. bind name to function definition — `renderControls` exported (line 45)
19. bind name to function definition — `wireDebaterControls` exported (line 120)
20. comment — JSDoc line 178
21. bind name to function definition — `wireSpectatorTipButtons` exported async (line 179)
22. bind name to function definition — `handleTip` async module-private (line 212)
23. bind name to function definition — `wireModControls` exported (line 276)
24. bind name to function definition — `submitDebaterMessage` async module-private (line 389)
25. bind name to function definition — `submitModComment` async module-private (line 421)
26. comment — JSDoc line 448
27. bind name to function definition — `handlePinClick` async module-private (line 449)

## Agent 05

1. comment — lines 1-9: block comment documenting the module
2. blank — line 10
3. import — `safeRpc`, `getCurrentProfile` from `../auth.ts` (line 11)
4. import — `escapeHTML`, `showToast` from `../config.ts` (line 12)
5. import — `stopTranscription` from `./arena-deepgram.ts` (line 13)
6. import — `currentDebate`, `feedPaused`, `challengeRulingTimer`, `challengesRemaining`, `set_feedPaused`, `set_challengeRulingTimer`, `set_activeChallengeRefId` from `./arena-state.ts` (lines 14-22)
7. import type — `CurrentDebate` from `./arena-types.ts` (line 23)
8. import — `FEED_SCORE_BUDGET`, `FEED_MAX_CHALLENGES` from `./arena-types.ts` (lines 24-26)
9. import — `round`, `scoreUsed`, `pinnedEventIds`, `pendingSentimentA`, `pendingSentimentB`, `set_pendingSentimentA`, `set_pendingSentimentB` from `./arena-feed-state.ts` (lines 27-32)
10. import — `appendFeedEvent`, `writeFeedEvent` from `./arena-feed-events.ts` (line 33)
11. import — `setDebaterInputEnabled`, `updateBudgetDisplay`, `updateCiteButtonState`, `updateChallengeButtonState`, `applySentimentUpdate` from `./arena-feed-ui.ts` (lines 34-38)
12. import — `clearFeedTimer`, `finishCurrentTurn`, `startFinalAdBreak`, `pauseFeed` from `./arena-feed-machine.ts` (line 39)
13. import — `showCiteDropdown`, `showChallengeDropdown`, `showReferencePopup` from `./arena-feed-references.ts` (line 40)
14. import — `clearInterimTranscript` from `./arena-feed-transcript.ts` (line 41)
15. import — `modNullDebate` from `./arena-feed-realtime.ts` (line 42)
16. blank — lines 43-44
17. bind name to function definition — `renderControls` (exported, line 45)
18. bind name to function definition — `wireDebaterControls` (exported, line 120)
19. comment — line 178 (JSDoc for wireSpectatorTipButtons)
20. bind name to function definition — `wireSpectatorTipButtons` (exported, async, line 179)
21. bind name to function definition — `handleTip` (module-private, async, line 212)
22. bind name to function definition — `wireModControls` (exported, line 276)
23. bind name to function definition — `submitDebaterMessage` (module-private, async, line 389)
24. bind name to function definition — `submitModComment` (module-private, async, line 421)
25. comment — line 448 (inline JSDoc for handlePinClick)
26. bind name to function definition — `handlePinClick` (module-private, async, line 449)

## Agent 06

1. comment — module-level block comment (lines 1-9)
2. blank
3. import — { safeRpc, getCurrentProfile } from '../auth.ts' (line 11)
4. import — { escapeHTML, showToast } from '../config.ts' (line 12)
5. import — { stopTranscription } from './arena-deepgram.ts' (line 13)
6. import — { currentDebate, feedPaused, challengeRulingTimer, challengesRemaining, set_feedPaused, set_challengeRulingTimer, set_activeChallengeRefId } from './arena-state.ts' (lines 14-22)
7. import type — { CurrentDebate } from './arena-types.ts' (line 23)
8. import — { FEED_SCORE_BUDGET, FEED_MAX_CHALLENGES } from './arena-types.ts' (lines 24-26)
9. import — { round, scoreUsed, pinnedEventIds, pendingSentimentA, pendingSentimentB, set_pendingSentimentA, set_pendingSentimentB } from './arena-feed-state.ts' (lines 27-32)
10. import — { appendFeedEvent, writeFeedEvent } from './arena-feed-events.ts' (line 33)
11. import — { setDebaterInputEnabled, updateBudgetDisplay, updateCiteButtonState, updateChallengeButtonState, applySentimentUpdate } from './arena-feed-ui.ts' (lines 34-38)
12. import — { clearFeedTimer, finishCurrentTurn, startFinalAdBreak, pauseFeed } from './arena-feed-machine.ts' (line 39)
13. import — { showCiteDropdown, showChallengeDropdown, showReferencePopup } from './arena-feed-references.ts' (line 40)
14. import — { clearInterimTranscript } from './arena-feed-transcript.ts' (line 41)
15. import — { modNullDebate } from './arena-feed-realtime.ts' (line 42)
16. blank (lines 43-44)
17. bind name to function definition — `renderControls`, exported, (line 45): `export function renderControls(debate: CurrentDebate, isModView: boolean): void`
18. bind name to function definition — `wireDebaterControls`, exported, (line 120): `export function wireDebaterControls(debate: CurrentDebate): void`
19. comment — JSDoc on line 178
20. bind name to function definition — `wireSpectatorTipButtons`, exported async, (line 179): `export async function wireSpectatorTipButtons(debate: CurrentDebate): Promise<void>`
21. bind name to function definition — `handleTip`, async, module-private (line 212): `async function handleTip(btn: HTMLButtonElement, debate: CurrentDebate, statusEl: HTMLElement | null): Promise<void>`
22. bind name to function definition — `wireModControls`, exported, (line 276): `export function wireModControls(): void`
23. bind name to function definition — `submitDebaterMessage`, async, module-private (line 389): `async function submitDebaterMessage(): Promise<void>`
24. bind name to function definition — `submitModComment`, async, module-private (line 421): `async function submitModComment(): Promise<void>`
25. comment — JSDoc on line 448
26. bind name to function definition — `handlePinClick`, async, module-private (line 449): `async function handlePinClick(btn: HTMLElement): Promise<void>`

## Agent 07

1. comment (block, lines 1-9) — module documentation
2. blank (10)
3. import — `safeRpc`, `getCurrentProfile` from '../auth.ts' (11)
4. import — `escapeHTML`, `showToast` from '../config.ts' (12)
5. import — `stopTranscription` from './arena-deepgram.ts' (13)
6. import — `currentDebate`, `feedPaused`, `challengeRulingTimer`, `challengesRemaining`, `set_feedPaused`, `set_challengeRulingTimer`, `set_activeChallengeRefId` from './arena-state.ts' (14-22)
7. import type — `CurrentDebate` from './arena-types.ts' (23)
8. import — `FEED_SCORE_BUDGET`, `FEED_MAX_CHALLENGES` from './arena-types.ts' (24-26)
9. import — `round`, `scoreUsed`, `pinnedEventIds`, `pendingSentimentA`, `pendingSentimentB`, `set_pendingSentimentA`, `set_pendingSentimentB` from './arena-feed-state.ts' (27-32)
10. import — `appendFeedEvent`, `writeFeedEvent` from './arena-feed-events.ts' (33)
11. import — `setDebaterInputEnabled`, `updateBudgetDisplay`, `updateCiteButtonState`, `updateChallengeButtonState`, `applySentimentUpdate` from './arena-feed-ui.ts' (34-38)
12. import — `clearFeedTimer`, `finishCurrentTurn`, `startFinalAdBreak`, `pauseFeed` from './arena-feed-machine.ts' (39)
13. import — `showCiteDropdown`, `showChallengeDropdown`, `showReferencePopup` from './arena-feed-references.ts' (40)
14. import — `clearInterimTranscript` from './arena-feed-transcript.ts' (41)
15. import — `modNullDebate` from './arena-feed-realtime.ts' (42)
16. blank (43)
17. blank (44)
18. bind name to function definition — `renderControls` [exported] (line 45)
19. bind name to function definition — `wireDebaterControls` [exported] (line 120)
20. comment — JSDoc (line 178)
21. bind name to function definition — `wireSpectatorTipButtons` [exported, async] (line 179)
22. bind name to function definition — `handleTip` [not exported, async] (line 212)
23. bind name to function definition — `wireModControls` [exported] (line 276)
24. bind name to function definition — `submitDebaterMessage` [not exported, async] (line 389)
25. bind name to function definition — `submitModComment` [not exported, async] (line 421)
26. comment — JSDoc (line 448)
27. bind name to function definition — `handlePinClick` [not exported, async] (line 449)

## Agent 08

1. comment — block comment lines 1-9
2. blank — line 10
3. import `safeRpc`, `getCurrentProfile` from '../auth.ts' — line 11
4. import `escapeHTML`, `showToast` from '../config.ts' — line 12
5. import `stopTranscription` from './arena-deepgram.ts' — line 13
6. import `currentDebate`, `feedPaused`, `challengeRulingTimer`, `challengesRemaining`, `set_feedPaused`, `set_challengeRulingTimer`, `set_activeChallengeRefId` from './arena-state.ts' — lines 14-22
7. import type `CurrentDebate` from './arena-types.ts' — line 23
8. import `FEED_SCORE_BUDGET`, `FEED_MAX_CHALLENGES` from './arena-types.ts' — lines 24-26
9. import `round`, `scoreUsed`, `pinnedEventIds`, `pendingSentimentA`, `pendingSentimentB`, `set_pendingSentimentA`, `set_pendingSentimentB` from './arena-feed-state.ts' — lines 27-32
10. import `appendFeedEvent`, `writeFeedEvent` from './arena-feed-events.ts' — line 33
11. import `setDebaterInputEnabled`, `updateBudgetDisplay`, `updateCiteButtonState`, `updateChallengeButtonState`, `applySentimentUpdate` from './arena-feed-ui.ts' — lines 34-38
12. import `clearFeedTimer`, `finishCurrentTurn`, `startFinalAdBreak`, `pauseFeed` from './arena-feed-machine.ts' — line 39
13. import `showCiteDropdown`, `showChallengeDropdown`, `showReferencePopup` from './arena-feed-references.ts' — line 40
14. import `clearInterimTranscript` from './arena-feed-transcript.ts' — line 41
15. import `modNullDebate` from './arena-feed-realtime.ts' — line 42
16. blank — lines 43-44
17. bind name to function definition — `renderControls` exported, (line 45)
18. bind name to function definition — `wireDebaterControls` exported, (line 120)
19. comment — JSDoc line 178
20. bind name to function definition — `wireSpectatorTipButtons` exported async, (line 179)
21. bind name to function definition — `handleTip` async not-exported, (line 212)
22. bind name to function definition — `wireModControls` exported, (line 276)
23. bind name to function definition — `submitDebaterMessage` async not-exported, (line 389)
24. bind name to function definition — `submitModComment` async not-exported, (line 421)
25. comment — JSDoc line 448
26. bind name to function definition — `handlePinClick` async not-exported, (line 449)

## Agent 09

1. comment — block doc comment (1-9)
2. blank (10)
3. import — named imports: `safeRpc`, `getCurrentProfile` from `'../auth.ts'` (11)
4. import — named imports: `escapeHTML`, `showToast` from `'../config.ts'` (12)
5. import — named imports: `stopTranscription` from `'./arena-deepgram.ts'` (13)
6. import — named imports: `currentDebate`, `feedPaused`, `challengeRulingTimer`, `challengesRemaining`, `set_feedPaused`, `set_challengeRulingTimer`, `set_activeChallengeRefId` from `'./arena-state.ts'` (14-22)
7. import type — `CurrentDebate` from `'./arena-types.ts'` (23)
8. import — named imports: `FEED_SCORE_BUDGET`, `FEED_MAX_CHALLENGES` from `'./arena-types.ts'` (24-26)
9. import — named imports: `round`, `scoreUsed`, `pinnedEventIds`, `pendingSentimentA`, `pendingSentimentB`, `set_pendingSentimentA`, `set_pendingSentimentB` from `'./arena-feed-state.ts'` (27-32)
10. import — named imports: `appendFeedEvent`, `writeFeedEvent` from `'./arena-feed-events.ts'` (33)
11. import — named imports: `setDebaterInputEnabled`, `updateBudgetDisplay`, `updateCiteButtonState`, `updateChallengeButtonState`, `applySentimentUpdate` from `'./arena-feed-ui.ts'` (34-38)
12. import — named imports: `clearFeedTimer`, `finishCurrentTurn`, `startFinalAdBreak`, `pauseFeed` from `'./arena-feed-machine.ts'` (39)
13. import — named imports: `showCiteDropdown`, `showChallengeDropdown`, `showReferencePopup` from `'./arena-feed-references.ts'` (40)
14. import — named imports: `clearInterimTranscript` from `'./arena-feed-transcript.ts'` (41)
15. import — named imports: `modNullDebate` from `'./arena-feed-realtime.ts'` (42)
16. blank (43-44)
17. bind name to function definition — `renderControls` [exported] line 45
18. bind name to function definition — `wireDebaterControls` [exported] line 120
19. comment — JSDoc line 178
20. bind name to function definition — `wireSpectatorTipButtons` [exported async] line 179
21. bind name to function definition — `handleTip` [module-private async] line 212
22. bind name to function definition — `wireModControls` [exported] line 276
23. bind name to function definition — `submitDebaterMessage` [module-private async] line 389
24. bind name to function definition — `submitModComment` [module-private async] line 421
25. comment — JSDoc inline line 448
26. bind name to function definition — `handlePinClick` [module-private async] line 449

## Agent 10

1. comment — block comment, module description (lines 1-9)
2. blank (10)
3. import — `safeRpc`, `getCurrentProfile` from '../auth.ts' (11)
4. import — `escapeHTML`, `showToast` from '../config.ts' (12)
5. import — `stopTranscription` from './arena-deepgram.ts' (13)
6. import — `currentDebate`, `feedPaused`, `challengeRulingTimer`, `challengesRemaining`, `set_feedPaused`, `set_challengeRulingTimer`, `set_activeChallengeRefId` from './arena-state.ts' (14-22)
7. import type — `CurrentDebate` from './arena-types.ts' (23)
8. import — `FEED_SCORE_BUDGET`, `FEED_MAX_CHALLENGES` from './arena-types.ts' (24-26)
9. import — `round`, `scoreUsed`, `pinnedEventIds`, `pendingSentimentA`, `pendingSentimentB`, `set_pendingSentimentA`, `set_pendingSentimentB` from './arena-feed-state.ts' (27-32)
10. import — `appendFeedEvent`, `writeFeedEvent` from './arena-feed-events.ts' (33)
11. import — `setDebaterInputEnabled`, `updateBudgetDisplay`, `updateCiteButtonState`, `updateChallengeButtonState`, `applySentimentUpdate` from './arena-feed-ui.ts' (34-38)
12. import — `clearFeedTimer`, `finishCurrentTurn`, `startFinalAdBreak`, `pauseFeed` from './arena-feed-machine.ts' (39)
13. import — `showCiteDropdown`, `showChallengeDropdown`, `showReferencePopup` from './arena-feed-references.ts' (40)
14. import — `clearInterimTranscript` from './arena-feed-transcript.ts' (41)
15. import — `modNullDebate` from './arena-feed-realtime.ts' (42)
16. blank (43-44)
17. bind name to function definition — `renderControls` [exported] (line 45)
18. bind name to function definition — `wireDebaterControls` [exported] (line 120)
19. comment (line 178)
20. bind name to function definition — `wireSpectatorTipButtons` [exported, async] (line 179)
21. bind name to function definition — `handleTip` [not exported, async] (line 212)
22. bind name to function definition — `wireModControls` [exported] (line 276)
23. bind name to function definition — `submitDebaterMessage` [not exported, async] (line 389)
24. bind name to function definition — `submitModComment` [not exported, async] (line 421)
25. comment (line 448)
26. bind name to function definition — `handlePinClick` [not exported, async] (line 449)

## Agent 11

1. comment — block comment, lines 1-9, module description
2. blank — line 10
3. import — { safeRpc, getCurrentProfile } from '../auth.ts' (line 11)
4. import — { escapeHTML, showToast } from '../config.ts' (line 12)
5. import — { stopTranscription } from './arena-deepgram.ts' (line 13)
6. import — { currentDebate, feedPaused, challengeRulingTimer, challengesRemaining, set_feedPaused, set_challengeRulingTimer, set_activeChallengeRefId } from './arena-state.ts' (lines 14-22)
7. import type — { CurrentDebate } from './arena-types.ts' (line 23)
8. import — { FEED_SCORE_BUDGET, FEED_MAX_CHALLENGES } from './arena-types.ts' (lines 24-26)
9. import — { round, scoreUsed, pinnedEventIds, pendingSentimentA, pendingSentimentB, set_pendingSentimentA, set_pendingSentimentB } from './arena-feed-state.ts' (lines 27-32)
10. import — { appendFeedEvent, writeFeedEvent } from './arena-feed-events.ts' (line 33)
11. import — { setDebaterInputEnabled, updateBudgetDisplay, updateCiteButtonState, updateChallengeButtonState, applySentimentUpdate } from './arena-feed-ui.ts' (lines 34-38)
12. import — { clearFeedTimer, finishCurrentTurn, startFinalAdBreak, pauseFeed } from './arena-feed-machine.ts' (line 39)
13. import — { showCiteDropdown, showChallengeDropdown, showReferencePopup } from './arena-feed-references.ts' (line 40)
14. import — { clearInterimTranscript } from './arena-feed-transcript.ts' (line 41)
15. import — { modNullDebate } from './arena-feed-realtime.ts' (line 42)
16. blank (43)
17. blank (44)
18. bind name to function definition — `renderControls` [exported] (line 45)
19. bind name to function definition — `wireDebaterControls` [exported] (line 120)
20. comment — JSDoc for wireSpectatorTipButtons (line 178)
21. bind name to function definition — `wireSpectatorTipButtons` [exported, async] (line 179)
22. bind name to function definition — `handleTip` [not exported, async] (line 212)
23. bind name to function definition — `wireModControls` [exported] (line 276)
24. bind name to function definition — `submitDebaterMessage` [not exported, async] (line 389)
25. bind name to function definition — `submitModComment` [not exported, async] (line 421)
26. comment — JSDoc for handlePinClick (line 448)
27. bind name to function definition — `handlePinClick` [not exported, async] (line 449)
