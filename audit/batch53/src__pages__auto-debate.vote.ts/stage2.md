# Stage 2 Outputs — auto-debate.vote.ts

## Agent 01

### showResults

This function takes five parameters: `votesA` (number), `votesB` (number), `total` (number), `aiWinner` (string), and `_userVote` (string — unused). It reads no module-level state. It queries the DOM element with ID `'results'` and adds class `'show'` if it exists. It calculates `t = votesA + votesB || 1`, then `pctA = Math.round((votesA / t) * 100)` and `pctB = 100 - pctA`. It queries `'bar-a'` and sets its `style.width` to `pctA + '%'` and `textContent` to `pctA + '%'`. It queries `'bar-b'` and sets its `style.width` to `pctB + '%'` and `textContent` to `pctB + '%'`. It queries `'vote-count'` and sets its `textContent` to `"${total} vote${total !== 1 ? 's' : ''} cast"`. It determines `audienceWinner = votesA > votesB ? 'a' : 'b'`, queries `'disagree-label'`, and sets its `textContent` to `'🔥 THE PEOPLE DISAGREE WITH THE AI'` if `audienceWinner !== aiWinner`, or `'The audience agrees with the AI... for now.'` otherwise. No external functions are called. The function has no early returns and returns void.

### castVoteImpl

This async function takes three parameters: `sb` (object with a `rpc` method that is never called in this implementation), `side` (string), and `getFingerprint` (a function returning string — never called). It reads `(window as unknown as Record<string, unknown>)._debate` cast as `AutoDebateData | undefined`. If `d` is falsy, it returns immediately. It queries `'btn-a'` and `'btn-b'` as `HTMLButtonElement | null`. If btnA exists, it sets `disabled = true` and adds classes `'voted'` and (conditionally, if `side === 'a'`) `'winner'`. If btnB exists, it sets `disabled = true` and adds classes `'voted'` and (conditionally, if `side === 'b'`) `'winner'`. It calls `showResults(d.votes_a + (side === 'a' ? 1 : 0), d.votes_b + (side === 'b' ? 1 : 0), d.vote_count + 1, d.winner, side)`. It then calls `claimVote(d.id)` (imported from `'../tokens.ts'`) without awaiting. The function is declared `async` but contains no `await` expressions. It returns `Promise<void>`.

---

## Agent 02

### showResults

showResults reads `votesA`, `votesB`, `total`, `aiWinner`, and `_userVote` (unused). It reads no module-level state. It queries `'results'` and adds class `'show'`. It computes `t = votesA + votesB || 1`, `pctA = Math.round((votesA / t) * 100)`, and `pctB = 100 - pctA`. It queries `'bar-a'` and sets `style.width` to `pctA + '%'` and `textContent` to `pctA + '%'`. It queries `'bar-b'` and sets `style.width` to `pctB + '%'` and `textContent` to `pctB + '%'`. It queries `'vote-count'` and sets `textContent` to `"${total} vote${total !== 1 ? 's' : ''} cast"`. It determines `audienceWinner = votesA > votesB ? 'a' : 'b'` and compares with `aiWinner` to set `'disagree-label'` textContent to either `'🔥 THE PEOPLE DISAGREE WITH THE AI'` or `'The audience agrees with the AI... for now.'`. Calls no external functions. Returns void.

### castVoteImpl

castVoteImpl is async, taking `sb` (unused rpc object), `side` (string), and `getFingerprint` (unused function). It reads `window._debate` as `AutoDebateData | undefined`; if falsy, returns early. It queries `'btn-a'` and `'btn-b'` as `HTMLButtonElement | null`, setting `disabled = true` and adding class `'voted'` on both. Adds class `'winner'` to btnA if `side === 'a'`, or to btnB if `side === 'b'`. Calls `showResults` with optimistic counts (`d.votes_a + (side === 'a' ? 1 : 0)`, `d.votes_b + (side === 'b' ? 1 : 0)`, `d.vote_count + 1`, `d.winner`, `side`). Calls `claimVote(d.id)` without awaiting. No actual RPC is made — comment at line 54 states `cast_auto_debate_vote` is not yet deployed. Returns `Promise<void>` with no `await` in body.

---

## Agent 03

### showResults

showResults accepts `votesA`, `votesB`, `total`, `aiWinner`, and `_userVote` (underscore-prefixed, unused). No module-level state is read or written. DOM: queries `'results'` and adds `'show'`; queries `'bar-a'` and sets width and textContent to `pctA + '%'`; queries `'bar-b'` and sets width and textContent to `pctB + '%'`; queries `'vote-count'` and sets textContent to `"${total} vote${total !== 1 ? 's' : ''} cast"`; queries `'disagree-label'` and sets textContent. Computations: `t = votesA + votesB || 1`; `pctA = Math.round((votesA / t) * 100)`; `pctB = 100 - pctA`; `audienceWinner = votesA > votesB ? 'a' : 'b'`. Label text: `'🔥 THE PEOPLE DISAGREE WITH THE AI'` if `audienceWinner !== aiWinner`, else `'The audience agrees with the AI... for now.'`. No external calls. Returns void. No early returns.

### castVoteImpl

castVoteImpl is `async`, taking `sb` (rpc object, never used), `side` (string), `getFingerprint` (function, never called). Reads `window._debate` cast as `AutoDebateData | undefined`; early return if falsy. Queries `'btn-a'` and `'btn-b'` as `HTMLButtonElement | null`; sets `disabled = true` on each; adds `'voted'` to each; adds `'winner'` to btnA if `side === 'a'`, to btnB if `side === 'b'`. Calls `showResults` with optimistic incremented counts. Calls `claimVote(d.id)` without await (return value discarded). Function is `async` with no `await` expressions. `sb.rpc` never called. Returns `Promise<void>`.

---

## Agent 04

### showResults

showResults reads `votesA`, `votesB`, `total`, `aiWinner`, `_userVote` (unused). No module-level state. Queries `'results'` — adds class `'show'`. Queries `'bar-a'` — sets `style.width` and `textContent` to `pctA + '%'`. Queries `'bar-b'` — sets `style.width` and `textContent` to `pctB + '%'`. Queries `'vote-count'` — sets textContent with plural-aware string. Queries `'disagree-label'` — sets textContent based on `audienceWinner !== aiWinner`. Computations: `t = votesA + votesB || 1`; `pctA = Math.round((votesA / t) * 100)`; `pctB = 100 - pctA`; `audienceWinner = votesA > votesB ? 'a' : 'b'`. Calls no external functions. Returns void.

### castVoteImpl

castVoteImpl is async, receiving `sb` (rpc object, not invoked), `side` (string), `getFingerprint` (callback, not invoked). Reads `window._debate` as `AutoDebateData | undefined`; returns early if falsy. Queries `'btn-a'` and `'btn-b'` as HTMLButtonElement; sets `disabled = true`, adds `'voted'`, conditionally adds `'winner'`. Calls `showResults` with optimistic vote counts. Calls `claimVote(d.id)` (not awaited). Declared `async` but no `await` in body. `sb.rpc` never called — comment at line 54 notes RPC not yet deployed. Returns `Promise<void>`.

---

## Agent 05

### showResults

showResults accepts `votesA`, `votesB`, `total`, `aiWinner`, and `_userVote` (unused, underscore prefix). No module-level state read or written. Queries `'results'` via `document.getElementById` and adds class `'show'`. Computes `t = votesA + votesB || 1`; `pctA = Math.round((votesA / t) * 100)`; `pctB = 100 - pctA`; `audienceWinner = votesA > votesB ? 'a' : 'b'`. Queries `'bar-a'` — sets `style.width = pctA + '%'` and `textContent = pctA + '%'`. Queries `'bar-b'` — sets `style.width = pctB + '%'` and `textContent = pctB + '%'`. Queries `'vote-count'` — sets textContent to `"${total} vote${total !== 1 ? 's' : ''} cast"`. Queries `'disagree-label'` — sets textContent to `'🔥 THE PEOPLE DISAGREE WITH THE AI'` if `audienceWinner !== aiWinner`, else `'The audience agrees with the AI... for now.'`. Calls no external functions. Returns void.

### castVoteImpl

castVoteImpl is declared `async` and takes `sb` (rpc method never called), `side` (string), and `getFingerprint` (function, never called). Reads `window._debate` as `AutoDebateData | undefined`; returns early if `!d`. Queries `'btn-a'` and `'btn-b'` as `HTMLButtonElement | null`; sets `disabled = true` on each; adds class `'voted'` to each; adds `'winner'` to btnA if `side === 'a'`, to btnB if `side === 'b'`. Calls `showResults(d.votes_a + (side === 'a' ? 1 : 0), d.votes_b + (side === 'b' ? 1 : 0), d.vote_count + 1, d.winner, side)`. Calls `claimVote(d.id)` — return value not awaited. Function is `async` with no `await` expressions. Returns `Promise<void>`.
