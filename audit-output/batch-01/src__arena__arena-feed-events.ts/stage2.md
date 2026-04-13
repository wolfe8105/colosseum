# Stage 2 — Runtime Walk: src/arena/arena-feed-events.ts
Anchors: appendFeedEvent (line 34), addLocalSystem (line 273), writeFeedEvent (line 283)
Run: fresh dispatch (restarted per resume semantics)

---

## Agent 01

### appendFeedEvent
Signature: `export function appendFeedEvent(ev: FeedEvent): void`. Synchronous, void.

**Return points:**
1. Line 36: `if (!stream) return;` — `getElementById('feed-stream')` null
2. Line 40: `if (renderedEventIds.has(evKey)) return;` — dedup hit
3. Line 249: `return;` inside `sentiment_tip` — no DOM append
4. Line 255: `return;` inside `sentiment_vote` — no DOM append
5. Implicit return after `stream.appendChild(el)` line 264

**Dedup key (lines 39–41):**
```ts
const evKey = ev.id || `${ev.event_type}:${ev.side}:${ev.round}:${ev.content}`;
if (renderedEventIds.has(evKey)) return;
renderedEventIds.add(evKey);
```
`renderedEventIds` is a Set from `arena-feed-state.ts`, mutated directly (no setter).

**Module-level reads:** `renderedEventIds`, `currentDebate` (arena-state), `feedPaused` (arena-state), `opponentCitedRefs` (arena-state), `pinnedEventIds` (arena-feed-state), `scoreUsed`, `scoreA`, `scoreB`, `round`, `budgetRound`, `pendingSentimentA`, `pendingSentimentB` (all arena-feed-state).

**Module-level writes:**
- `renderedEventIds.add(evKey)` — direct Set mutation
- `pinnedEventIds.add(String(ev.id))` — direct Set mutation (speech case, isPinned)
- `scoreUsed[pts] = (scoreUsed[pts] || 0) + 1` — direct index mutation (point_award)
- `set_scoreA(after)` — point_award, side=a
- `set_scoreB(after)` — point_award, side=b
- `set_opponentCitedRefs([...])` — reference_cite (new opponent ref) and reference_challenge (mark challenged)
- `set_activeChallengeRefId(ev.reference_id)` — reference_challenge
- `set_pendingSentimentA(...)` / `set_pendingSentimentB(...)` — sentiment_tip and sentiment_vote

**DOM queries:** `getElementById('feed-stream')` (35), `createElement('div')` (56), `getElementById('feed-score-a')` (125), `getElementById('feed-score-b')` (130)

**DOM mutations:** `el.className`, `el.innerHTML` (all cases; innerHTML wrapped in escapeHTML), `el.textContent` (default case only), `el.dataset.eventId` (speech/non-mod, numeric id), `el.addEventListener('animationend', ...)` (point_award, removes feed-fireworks once), `scoreEl.textContent = String(scoreA/B)`, `stream.appendChild(el)`, `stream.scrollTo(...)` conditionally within 80px.

**External calls per case:**
- `getCurrentProfile()` (auth.ts) — lines 47,48,51,52 (up to 4 calls for debater name resolution)
- `escapeHTML(...)` (config.ts) — all innerHTML cases
- `playSound('pointsAwarded')` + `vibrate(80)` — point_award
- `resetBudget(evRound)` + `updateBudgetDisplay()` (arena-feed-ui) — point_award
- `playSound('referenceDrop')` + `vibrate(60)` — reference_cite
- `updateChallengeButtonState()` (arena-feed-ui) — reference_cite (new opponent ref only)
- `playSound('challenge')` — reference_challenge
- `pauseFeed(debate)` (arena-feed-machine) — reference_challenge when `!feedPaused && debate`
- `unpauseFeed()` (arena-feed-machine) — mod_ruling when feedPaused; power_up when `puId==='shield' && feedPaused`

### addLocalSystem
Signature: `export function addLocalSystem(text: string): void`. Synchronous, void. Single early return line 275 (stream null). No module-level reads/writes. No external calls. `el.textContent = text` (safe, no escapeHTML needed). `stream.appendChild(el)`. `stream.scrollTo(...)` unconditional (unlike appendFeedEvent which is conditional).

### writeFeedEvent
Signature: `export async function writeFeedEvent(eventType, content, side, score?): Promise<void>`. Reads `currentDebate` (arena-state) and `round` (arena-feed-state). Guard: `if (!debate || isPlaceholder()) return;`. Calls `safeRpc('insert_feed_event', {p_debate_id, p_event_type, p_round, p_side, p_content, p_score: score ?? null})` in try/catch; swallows errors with `console.warn`. No DOM. No state writes.

---

## Agent 02

### appendFeedEvent
Same signature, sync, void. Dedup via `renderedEventIds` Set — key from `ev.id || composite`. Reads `currentDebate`, `feedPaused`, `opponentCitedRefs`, `pinnedEventIds`, `scoreA`, `scoreB`, `round`, `budgetRound`, `scoreUsed`, `pendingSentimentA`, `pendingSentimentB`. Writes `set_scoreA/B`, `set_opponentCitedRefs`, `set_activeChallengeRefId`, `set_pendingSentimentA/B`, direct Set mutations on `renderedEventIds`/`pinnedEventIds`, direct index mutation on `scoreUsed`. Switch: speech (mod vs debater, pin logic), point_award (sound+vibrate+score+budget), round_divider, reference_cite (sound+refs+challenge button), reference_challenge (sound+refs+challenge id+pause), mod_ruling (unpause), power_up (shield unpause), sentiment_tip (state+early return), sentiment_vote (state+early return), disconnect, default. Appends, conditional scroll.

### addLocalSystem
Sync, void. No state. textContent. Unconditional scroll.

### writeFeedEvent
Async. Debate+placeholder guard. safeRpc try/catch swallow. No DOM, no state writes.

---

## Agent 03

### appendFeedEvent
Confirmed: dedup key `ev.id || '${event_type}:${side}:${round}:${content}'`. Secondary dedup inside reference_cite: `opponentCitedRefs.find(r => r.reference_id === ev.reference_id)` — prevents duplicate ref tracking. All module-level reads and writes match Agents 01-02. Cases identical. `sentiment_tip` and `sentiment_vote` add to `renderedEventIds` (line 41) but still return early — correct behavior preventing double-counting replayed sentiment events.

### addLocalSystem
No state, textContent, unconditional scroll.

### writeFeedEvent
Async. safeRpc payload: `{p_debate_id, p_event_type, p_round, p_side, p_content, p_score: score ?? null}`. Catch swallows, never rejects. No DOM.

---

## Agent 04

### appendFeedEvent
Same. `el.dataset.eventId = String(ev.id)` only when `ev.id && !String(ev.id).includes('-')` (numeric DB ID check, line 75). `speech` case: pin button HTML uses `data-eid="${escapeHTML(String(ev.id))}"` — escapes event ID in data attribute. `point_award` animationend listener removes `feed-fireworks` class once. Scroll threshold: `scrollHeight - scrollTop - clientHeight < 80`.

### addLocalSystem / writeFeedEvent — same as above.

---

## Agent 05

### appendFeedEvent
Confirmed: `default` case appears before `sentiment_tip`, `sentiment_vote`, `disconnect` in switch. In JS/TS, `default` is a catch-all visited last regardless of textual position — those later named cases still match correctly. However, the `default` case does not `break` before falling through, causing any unknown event_type to use `el.textContent = ev.content` (safe). The placement of `default` in the middle of the switch is unusual but functionally sound.

### addLocalSystem / writeFeedEvent — same as above.

---

## Agent 06

### appendFeedEvent
Confirmed all side effects. Note on `currentDebate` re-read: line 167 inside `reference_cite` case uses `const debate = currentDebate` — a second local binding that shadows the outer `debate` from line 44. Both reference the same module-level value.

### addLocalSystem / writeFeedEvent — same as above.

---

## Agent 07

### appendFeedEvent
All state reads/writes confirmed. Notable: `activeChallengeRefId` is imported from `arena-state.ts` but its value is not directly read inside `appendFeedEvent` — only `set_activeChallengeRefId` is called. The variable import exists but the read-side is unused here.

### addLocalSystem
Confirmed textContent, unconditional scroll, no state.

### writeFeedEvent
Confirmed: `score ?? null` normalizes undefined to null. `p_metadata` and `p_reference_id` are NOT passed to `insert_feed_event` — only six fields: `p_debate_id, p_event_type, p_round, p_side, p_content, p_score`.

---

## Agent 08

### appendFeedEvent
Confirmed. `scoreA`/`scoreB` re-read after `set_scoreA()`/`set_scoreB()` call because the setter updates the exported binding — `scoreEl.textContent = String(scoreA)` on lines 126/130 reads the updated value.

### addLocalSystem / writeFeedEvent — same as above.

---

## Agent 09

### appendFeedEvent
Same findings. `addLocalSystem` system messages are never added to `renderedEventIds`, so if `appendFeedEvent` later receives an event with identical content the two dedup systems are independent. Local system messages can appear alongside persisted events with matching content.

### addLocalSystem / writeFeedEvent — same as above.

---

## Agent 10

### appendFeedEvent
All confirmed. Per-case summary (sounds/vibrate/state writes/DOM beyond el):
- speech: none/none/pinnedEventIds.add (conditional)/none
- point_award: pointsAwarded/80ms/set_scoreA-B+scoreUsed/score elements+resetBudget+updateBudgetDisplay
- round_divider: none/none/none/none
- reference_cite: referenceDrop/60ms/set_opponentCitedRefs (if new)/updateChallengeButtonState
- reference_challenge: challenge/none/set_opponentCitedRefs+set_activeChallengeRefId/pauseFeed
- mod_ruling: none/none/none/unpauseFeed if paused
- power_up: none/none/none/unpauseFeed if shield+paused
- sentiment_tip: none/none/set_pendingSentiment/early return — nothing appended
- sentiment_vote: none/none/set_pendingSentiment/early return — nothing appended
- disconnect: none/none/none/none
- default: none/none/none/none

### addLocalSystem / writeFeedEvent — same as above.

---

## Agent 11

### appendFeedEvent
All confirmed. Auto-scroll note: `const isNearBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 80;` — if near bottom, `stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' })`. `writeFeedEvent` note: the returned `Promise<void>` always resolves — callers that do not `await` it cannot observe failures; callers that do `await` it also cannot observe failures (error swallowed before re-throw).

### addLocalSystem / writeFeedEvent — same as above.

---

## Consensus

All 11 agents agree on every material point:

**appendFeedEvent:** Synchronous. 4 return points (stream null, dedup, sentiment_tip, sentiment_vote). Dedup key prefers ev.id, falls back to composite. 13 module-level variables read; 11 write operations (3 direct Set/object mutations, 8 setters). 4 DOM queries. DOM mutations on el (className, innerHTML/textContent, optional dataset.eventId, one animationend listener), score display elements, stream.appendChild, conditional scroll. 13 external function call sites across 7 source modules.

**addLocalSystem:** Synchronous. 1 early return. No state. textContent only. Unconditional scroll (unlike appendFeedEvent's conditional scroll). No dedup.

**writeFeedEvent:** Async. 1 guard return. Reads currentDebate + round. 1 safeRpc call with 6 params (p_score coalesced to null). Errors caught and swallowed. Never rejects. No DOM, no state writes.
