# Stage 1 Outputs — src/arena/arena-feed-ui.ts

## Agent 01

### Imports
- `formatTimer` from `./arena-core.utils.ts`
- `currentDebate`, `feedPaused`, `loadedRefs`, `opponentCitedRefs`, `challengesRemaining` from `./arena-state.ts`
- `FEED_TOTAL_ROUNDS`, `FEED_SCORE_BUDGET` from `./arena-types-feed-room.ts`
- `phase`, `round`, `timeLeft`, `scoreUsed`, `budgetRound`, `sentimentA`, `sentimentB`, `pendingSentimentA`, `pendingSentimentB`, `set_budgetRound`, `set_sentimentA`, `set_sentimentB`, `set_pendingSentimentA`, `set_pendingSentimentB` from `./arena-feed-state.ts`

### Exports
- `updateTimerDisplay` — function, `(): void`, line 31
- `updateTurnLabel` — function, `(text: string): void`, line 37
- `updateRoundLabel` — function, `(): void`, line 42
- `setDebaterInputEnabled` — function, `(enabled: boolean): void`, line 47
- `updateBudgetDisplay` — function, `(): void`, line 61
- `resetBudget` — function, `(newRound: number): void`, line 74
- `updateSentimentGauge` — function, `(): void`, line 81
- `applySentimentUpdate` — function, `(): void`, line 91
- `updateCiteButtonState` — function, `(): void`, line 99
- `updateChallengeButtonState` — function, `(): void`, line 113
- `showDisconnectBanner` — function, `(message: string): void`, line 126

### Internal symbols
None.

### External calls
- `document.getElementById('feed-timer')` — line 32
- `formatTimer(Math.max(0, timeLeft))` — line 33
- `Math.max(0, timeLeft)` — line 33
- `document.getElementById('feed-turn-label')` — line 38
- `document.getElementById('feed-round-label')` — line 43
- `document.getElementById('feed-debater-input')` — line 48
- `document.getElementById('feed-debater-send-btn')` — line 49
- `document.getElementById('feed-finish-turn')` — line 50
- `input.classList.toggle('feed-input-frozen', !enabled)` — line 56
- `document.querySelector('.feed-score-badge[data-badge="${pts}"]')` — line 65
- `String(remaining)` — line 66
- `document.querySelector('.feed-score-btn[data-pts="${pts}"]')` — line 68
- `set_budgetRound(newRound)` — line 75
- `updateBudgetDisplay()` — line 79
- `Math.round((sentimentA / total) * 100)` — line 84
- `document.getElementById('feed-sentiment-a')` — line 86
- `document.getElementById('feed-sentiment-b')` — line 87
- `set_sentimentA(sentimentA + pendingSentimentA)` — line 93
- `set_sentimentB(sentimentB + pendingSentimentB)` — line 94
- `set_pendingSentimentA(0)` — line 95
- `set_pendingSentimentB(0)` — line 96
- `updateSentimentGauge()` — line 97
- `document.getElementById('feed-cite-btn')` — line 100
- `loadedRefs.filter((r) => !r.cited)` — line 107
- `document.getElementById('feed-challenge-btn')` — line 114
- `opponentCitedRefs.filter((r) => !r.already_challenged)` — line 121
- `document.getElementById('feed-disconnect-banner')?.remove()` — line 127
- `document.createElement('div')` — line 128
- `document.querySelector('.feed-room')` — line 132
- `room.prepend(banner)` — line 133

---

## Agent 02

### Imports
- `formatTimer` from `./arena-core.utils.ts`
- `currentDebate`, `feedPaused`, `loadedRefs`, `opponentCitedRefs`, `challengesRemaining` from `./arena-state.ts`
- `FEED_TOTAL_ROUNDS`, `FEED_SCORE_BUDGET` from `./arena-types-feed-room.ts`
- `phase`, `round`, `timeLeft`, `scoreUsed`, `budgetRound`, `sentimentA`, `sentimentB`, `pendingSentimentA`, `pendingSentimentB`, `set_budgetRound`, `set_sentimentA`, `set_sentimentB`, `set_pendingSentimentA`, `set_pendingSentimentB` from `./arena-feed-state.ts`

### Exports
- `updateTimerDisplay` — function, `(): void`, line 26
- `updateTurnLabel` — function, `(text: string): void`, line 31
- `updateRoundLabel` — function, `(): void`, line 36
- `setDebaterInputEnabled` — function, `(enabled: boolean): void`, line 41
- `updateBudgetDisplay` — function, `(): void`, line 54
- `resetBudget` — function, `(newRound: number): void`, line 64
- `updateSentimentGauge` — function, `(): void`, line 70
- `applySentimentUpdate` — function, `(): void`, line 80
- `updateCiteButtonState` — function, `(): void`, line 88
- `updateChallengeButtonState` — function, `(): void`, line 103
- `showDisconnectBanner` — function, `(message: string): void`, line 118

### Internal symbols
None.

### External calls
- `document.getElementById('feed-timer')` — line 27
- `formatTimer(Math.max(0, timeLeft))` — line 28
- `Math.max(0, timeLeft)` — line 28
- `document.getElementById('feed-turn-label')` — line 32
- `document.getElementById('feed-round-label')` — line 37
- `document.getElementById('feed-debater-input')` — line 42
- `document.getElementById('feed-debater-send-btn')` — line 43
- `document.getElementById('feed-finish-turn')` — line 44
- `input.classList.toggle('feed-input-frozen', !enabled)` — line 50
- `input.value.trim()` — line 51
- `document.querySelector('.feed-score-badge[data-badge="..."]')` — line 59
- `String(remaining)` — line 60
- `document.querySelector('.feed-score-btn[data-pts="..."]')` — line 61
- `Math.max(0, limit - used)` — line 57
- `set_budgetRound(newRound)` — line 65
- `Math.round((sentimentA / total) * 100)` — line 72
- `document.getElementById('feed-sentiment-a')` — line 74
- `document.getElementById('feed-sentiment-b')` — line 75
- `set_sentimentA(sentimentA + pendingSentimentA)` — line 82
- `set_sentimentB(sentimentB + pendingSentimentB)` — line 83
- `set_pendingSentimentA(0)` — line 84
- `set_pendingSentimentB(0)` — line 85
- `updateSentimentGauge()` — line 86
- `document.getElementById('feed-cite-btn')` — line 89
- `loadedRefs.filter((r) => !r.cited)` — line 96
- `document.getElementById('feed-challenge-btn')` — line 104
- `opponentCitedRefs.filter((r) => !r.already_challenged)` — line 113
- `document.getElementById('feed-disconnect-banner')?.remove()` — line 119
- `document.createElement('div')` — line 120
- `document.querySelector('.feed-room')` — line 124
- `room.prepend(banner)` — line 125

---

## Agent 03

### Imports
- `formatTimer` from `./arena-core.utils.ts`
- `currentDebate`, `feedPaused`, `loadedRefs`, `opponentCitedRefs`, `challengesRemaining` from `./arena-state.ts`
- `FEED_TOTAL_ROUNDS`, `FEED_SCORE_BUDGET` from `./arena-types-feed-room.ts`
- `phase`, `round`, `timeLeft`, `scoreUsed`, `budgetRound`, `sentimentA`, `sentimentB`, `pendingSentimentA`, `pendingSentimentB`, `set_budgetRound`, `set_sentimentA`, `set_sentimentB`, `set_pendingSentimentA`, `set_pendingSentimentB` from `./arena-feed-state.ts`

### Exports
- `updateTimerDisplay` — function, `(): void`, line 31
- `updateTurnLabel` — function, `(text: string): void`, line 36
- `updateRoundLabel` — function, `(): void`, line 41
- `setDebaterInputEnabled` — function, `(enabled: boolean): void`, line 46
- `updateBudgetDisplay` — function, `(): void`, line 61
- `resetBudget` — function, `(newRound: number): void`, line 76
- `updateSentimentGauge` — function, `(): void`, line 84
- `applySentimentUpdate` — function, `(): void`, line 94
- `updateCiteButtonState` — function, `(): void`, line 102
- `updateChallengeButtonState` — function, `(): void`, line 117
- `showDisconnectBanner` — function, `(message: string): void`, line 130

### Internal symbols
None.

### External calls
(Same set as agents 01/04/05 — browser DOM APIs and imported function calls in each function body. Minor line-number variation due to header comment counting.)

---

## Agent 04

### Imports
- (Identical to other agents)

### Exports
- `updateTimerDisplay` — function, `(): void`, line 29
- `updateTurnLabel` — function, `(text: string): void`, line 34
- `updateRoundLabel` — function, `(): void`, line 39
- `setDebaterInputEnabled` — function, `(enabled: boolean): void`, line 44
- `updateBudgetDisplay` — function, `(): void`, line 57
- `resetBudget` — function, `(newRound: number): void`, line 70
- `updateSentimentGauge` — function, `(): void`, line 76
- `applySentimentUpdate` — function, `(): void`, line 85
- `updateCiteButtonState` — function, `(): void`, line 93
- `updateChallengeButtonState` — function, `(): void`, line 108
- `showDisconnectBanner` — function, `(message: string): void`, line 122

### Internal symbols
None.

---

## Agent 05

### Imports
- (Identical to other agents)

### Exports
- `updateTimerDisplay` — function, `(): void`, line 31
- `updateTurnLabel` — function, `(text: string): void`, line 37
- `updateRoundLabel` — function, `(): void`, line 42
- `setDebaterInputEnabled` — function, `(enabled: boolean): void`, line 47
- `updateBudgetDisplay` — function, `(): void`, line 60
- `resetBudget` — function, `(newRound: number): void`, line 73
- `updateSentimentGauge` — function, `(): void`, line 80
- `applySentimentUpdate` — function, `(): void`, line 90
- `updateCiteButtonState` — function, `(): void`, line 99
- `updateChallengeButtonState` — function, `(): void`, line 114
- `showDisconnectBanner` — function, `(message: string): void`, line 129

### Internal symbols
None.
