# Stage 2 Outputs — arena-room-end-scores.ts

## Agent 01

### GeneratedScores

Exported interface with four fields: `scoreA: number | null`, `scoreB: number | null`, `aiScores: AIScoreResult | null`, `winner: string | null`.

### generateScores

`generateScores(debate: CurrentDebate): Promise<GeneratedScores>` initializes four locals (`scoreA`, `scoreB`, `aiScores`, `winner`) all null. Branch 1: if `debate.concededBy` is truthy, `winner` is set to the opposite side (`'a'` if conceded by `'b'`, `'b'` if by `'a'`), and the function returns immediately with `{ scoreA: null, scoreB: null, aiScores: null, winner }`. Branch 2: if `debate.mode === 'ai'` AND `debate.messages.length > 0`, renders a "judging" loading div into `screenEl` (if present), calls `await requestAIScoring(debate.topic, debate.messages)`. If AI scoring returns a result, `scoreA = sumSideScore(aiScores.side_a)` and `scoreB = sumSideScore(aiScores.side_b)`; if null, both scores fall back to `60 + Math.floor(Math.random() * 30)`. `winner = scoreA >= scoreB ? 'a' : 'b'`. Returns. Branch 3: if `debate.mode === 'ai'` (no messages) OR `!debate.opponentId`, both scores are random 60–89, winner determined same way, returns. Branch 4 (fall-through, human PvP): returns `{ scoreA: null, scoreB: null, aiScores: null, winner: null }` — server determines winner from spectator votes.

---

## Agent 02

### GeneratedScores

Exported interface (lines 9–14): four nullable fields — `scoreA: number | null`, `scoreB: number | null`, `aiScores: AIScoreResult | null`, `winner: string | null`.

### generateScores

`generateScores` accepts a `CurrentDebate` and returns `Promise<GeneratedScores>`. Four nulled locals declared upfront. **Concede path** (line 23): `debate.concededBy` truthy → winner = opposite side, early return with nulled scores. **AI with messages path** (line 28): mode is `'ai'` and messages array non-empty. If `screenEl` exists, clears it and injects a loading card with the text "THE JUDGE IS REVIEWING...", and a sub-line showing message count cast via `Number(debate.messages.length)` and round count via `Number(debate.round)`, plus animated dots. Awaits `requestAIScoring`. If result truthy: sums side scores via `sumSideScore`. If null: random fallback 60–89. Winner: `scoreA >= scoreB ? 'a' : 'b'`. Returns. **AI no-messages / solo path** (line 56): mode `'ai'` OR no opponentId → random scores, winner, return. **PvP path** (line 63): all nulls returned; server-side spectator vote determines result.

---

## Agent 03

### GeneratedScores

Exported interface, lines 9–14: four fields all nullable — `scoreA`, `scoreB` as `number | null`; `aiScores` as `AIScoreResult | null`; `winner` as `string | null`.

### generateScores

On call, four null variables are declared. If `debate.concededBy` is set, winner is flipped and function returns early with no scores. If `debate.mode === 'ai'` and messages are present: injects a judging UI into `screenEl` (guarded by truthiness check), then `await requestAIScoring(debate.topic, debate.messages)`. Score summing via `sumSideScore`; fallback to random 60–89 if AI returns null. `winner` set by score comparison `scoreA >= scoreB`. Returns. Else if mode is `'ai'` (no messages) or opponentId absent: random scores, winner by comparison, returns. Otherwise (PvP live): returns all nulls for server resolution.

---

## Agent 04

### GeneratedScores

Exported interface (lines 9–14): `scoreA: number | null`, `scoreB: number | null`, `aiScores: AIScoreResult | null`, `winner: string | null`.

### generateScores

Function initializes `scoreA`, `scoreB`, `aiScores`, `winner` to null. Four execution paths determined by `debate` properties: (1) concede check first — if `debate.concededBy` is non-null/non-empty, sets `winner` to the non-conceding side and returns immediately, scores null; (2) AI mode with messages — renders loading screen into `screenEl` (with `Number()` casts on `debate.messages.length` and `debate.round` in innerHTML), calls `requestAIScoring`, computes scores via `sumSideScore` or random fallback, winner by `scoreA >= scoreB`, returns; (3) AI mode without messages or no opponent — both scores random 60–89, winner by comparison, returns; (4) PvP — returns all nulls. The `screenEl` mutation at line 30 uses `innerHTML = ''` (empty string, safe) and `createElement` + `innerHTML` template. The template interpolates `Number(debate.messages.length)` and `Number(debate.round)` — `Number()` cast applied correctly per project rule.

---

## Agent 05

### GeneratedScores

Exported interface: `{ scoreA: number | null; scoreB: number | null; aiScores: AIScoreResult | null; winner: string | null }`.

### generateScores

`generateScores` is async, returns `Promise<GeneratedScores>`. Locals: `scoreA`, `scoreB`, `aiScores`, `winner` — all null. Priority order of branches: concede → AI+messages → AI-no-messages/no-opponent → PvP. Concede branch: `winner = debate.concededBy === 'a' ? 'b' : 'a'`, other fields null. AI+messages branch: optional DOM write to `screenEl` (judging card), then `await requestAIScoring`. Scores computed from AI result or randomized. Winner from score comparison (`>=` means ties go to A). AI-no-messages/solo: purely random scores, same winner logic. PvP: all nulls returned for server-side determination. No try/catch anywhere — exceptions from `requestAIScoring` propagate to caller.
