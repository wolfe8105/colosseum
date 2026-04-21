# Stage 3 Outputs — src/arena/arena-feed-references.ts

## Agent 01

### showCiteDropdown (line 28)
**Verification**: PASS
**Findings**: All five agents describe this function consistently and accurately.
- "Synchronous, takes `debate: CurrentDebate`" — PASS. Source line 28: `export function showCiteDropdown(debate: CurrentDebate): void`.
- "Calls `hideDropdown()` then queries `#feed-ref-dropdown`, returns if absent" — PASS (lines 29-31).
- "Filters `loadedRefs` by `!r.cited` into `uncited`; empty -> toast and return" — PASS (lines 33-34).
- "Builds HTML with title div, item per ref with `data-ref-id`, claim, author, `Number(current_power)`" — PASS (lines 36-44). `escapeHTML` applied to `reference_id`, `claim`, `author`; `Number()` cast on `current_power` confirmed.
- "Appends cancel div with id `feed-dropdown-close`, sets innerHTML, display='block'" — PASS (lines 45-47).
- "Close listener bound to `hideDropdown`; per-item async click listener" — PASS (lines 49-51).
- "Listener reads `dataset.refId`, returns if absent, calls `hideDropdown()`, awaits `citeDebateReference(debate.id, refId, round, debate.role || 'a')`" — PASS (lines 52-56).
- "On success maps `loadedRefs` replacing matched entry with spread + `cited:true` and `cited_at: new Date().toISOString()`, calls `set_loadedRefs` and `updateCiteButtonState()`" — PASS (lines 58-62).
- "catch uses `e.message` if Error else `'Cite failed'`, calls `showToast(msg, 'error')`" — PASS (lines 63-66).
**Unverifiable claims**: None.

### showChallengeDropdown (line 71)
**Verification**: PASS
**Findings**: All five agents describe this function consistently and accurately.
- "Synchronous, takes `debate: CurrentDebate`; calls `hideDropdown()` then queries element, returns if absent" — PASS (lines 71-74).
- "Filters `opponentCitedRefs` by `!r.already_challenged` into `challengeable`" — PASS (line 76).
- "If `challengeable.length === 0` toast `'No references to challenge'` and return" — PASS (line 77).
- "If `challengesRemaining <= 0` toast `'No challenges remaining'` and return" — PASS (line 78).
- "Builds HTML with `.feed-dropdown-item.feed-dropdown-challenge` per ref, `data-ref-id`, claim, domain (all escapeHTML'd)" — PASS (lines 80-88).
- "Close listener + per-item async click listener" — PASS (lines 93-95).
- "Listener awaits `fileReferenceChallenge(debate.id, refId, round, debate.role || 'a')`" — PASS (line 100).
- "If `result.blocked`: toast `'🛡️ Shield blocked the challenge!'` with severity `'info'`, nothing else" — PASS (lines 101-103).
- "Else: `set_challengesRemaining(result.challenges_remaining ?? (challengesRemaining - 1))`, `updateChallengeButtonState()`, `set_activeChallengeRefId(refId)`, `set_activeChallengeId(result.challenge_id || null)`, `pauseFeed(debate)`" — PASS (lines 106-110).
- "catch uses `e.message` if Error else `'Challenge failed'`, calls `showToast(msg, 'error')`" — PASS (lines 112-115).
**Unverifiable claims**: None.

### hideDropdown (line 120)
**Verification**: PASS
**Findings**: All five agents describe this function consistently and accurately.
- "Synchronous, no params, returns void" — PASS (line 120).
- "Calls `document.getElementById('feed-ref-dropdown')`; if element exists sets `display='none'` and `innerHTML=''`" — PASS (lines 121-122).
- "If element absent, does nothing" — PASS (implicit from the truthy `if` guard).
- "Touches no module-level state" — PASS.
**Unverifiable claims**: None.

### showReferencePopup (line 125)
**Verification**: PASS
**Findings**: All five agents describe this function consistently and accurately.
- "Synchronous, takes `el: HTMLElement`" — PASS (line 125).
- "Calls `document.getElementById('feed-ref-popup')?.remove()` to remove prior popup" — PASS (line 127).
- "Reads four values: `el.dataset.url`, `el.dataset.sourceTitle`, `el.dataset.sourceType` (all defaulting to `''`), and `el.textContent?.trim()` defaulting to `''`" — PASS (lines 129-132).
- "Creates `div` via `document.createElement('div')`, sets `className = 'feed-ref-popup'` and `id = 'feed-ref-popup'`" — PASS (lines 134-136).
- "innerHTML template contains: escaped `claim`, `.feed-ref-popup-type` with `escapeHTML(sourceType.replaceAll('_', ' '))`, `.feed-ref-popup-domain` with `escapeHTML(sourceTitle)`" — PASS (lines 137-143).
- "Conditional anchor included only when `url` truthy, with `href=escapeHTML(url)`, `target=\"_blank\"`, `rel=\"noopener noreferrer\"`" — PASS (line 144).
- "Close button with id `feed-ref-popup-close` always included" — PASS (line 145).
- "Appends to `document.body`" — PASS (line 148).
- "Close button click listener calls `popup.remove()`" — PASS (line 150).
- "Popup click listener checks `e.target === popup` and calls `popup.remove()` only when it matches" — PASS (lines 151-153).
- Agent 05 describes a `feed-ref-popup-inner` wrapper — PASS (line 138 confirms `<div class=\"feed-ref-popup-inner\">`).
**Unverifiable claims**: None.

### Cross-Agent Consensus Summary
- Total functions verified: 4
- PASS: 4 (showCiteDropdown, showChallengeDropdown, hideDropdown, showReferencePopup)
- PARTIAL: 0
- FAIL: 0

All five agents described the four exported functions in this module consistently with each other and accurately against the source. There were no cross-agent disagreements. Minor stylistic differences (e.g., Agent 05 explicitly mentioning the `feed-ref-popup-inner` wrapper, Agents 01/04 noting the `pauseFeed` is called without `await`) are all accurate additions rather than contradictions. All descriptions of control flow, DOM operations, imported helper calls, error handling, async/sync boundaries, and module-level state interactions check out line-by-line against the source.

### needs_review
None. Stage 2 covered all four exported functions in the file. There are no other top-level functions or meaningful runtime branches left undescribed.

## Agent 02

### showCiteDropdown (line 28)
**Verification**: PASS
**Findings** (all five agents made substantively identical claims):
- "Synchronous, takes `debate: CurrentDebate`, returns void" — PASS. Source line 28: `export function showCiteDropdown(debate: CurrentDebate): void`.
- "Calls `hideDropdown()` first" — PASS (line 29).
- "Reads `#feed-ref-dropdown`; early-returns if absent" — PASS (lines 30–31).
- "Filters `loadedRefs` to entries where `cited` is falsy into `uncited`" — PASS (line 33: `loadedRefs.filter((r) => !r.cited)`).
- "If empty, calls `showToast('No references remaining', 'error')` and returns" — PASS (line 34).
- "Builds HTML with title div, per-item div carrying `data-ref-id=escapeHTML(reference_id)`, escaped `claim`, escaped `author`, `Number(current_power)`; appends cancel div with id `feed-dropdown-close`" — PASS (lines 36–45).
- "Assigns to `dropdown.innerHTML` and sets `display = 'block'`" — PASS (lines 46–47).
- "Attaches click listener on `#feed-dropdown-close` bound to `hideDropdown`" — PASS (line 49).
- "Async click listener per item reads `dataset.refId`, early-returns if missing, calls `hideDropdown()`, awaits `citeDebateReference(debate.id, refId, round, debate.role || 'a')`" — PASS (lines 50–56).
- "On success maps `loadedRefs` with `cited:true` and `cited_at: new Date().toISOString()`, calls `set_loadedRefs(updated)`, then `updateCiteButtonState()`" — PASS (lines 58–62).
- "Catch extracts `e.message` if `Error`, else `'Cite failed'`, calls `showToast(msg, 'error')`" — PASS (lines 63–66).
**Unverifiable claims**: Claims about what `citeDebateReference`, `escapeHTML`, `showToast`, `updateCiteButtonState`, `set_loadedRefs` do internally — would require reading those modules. Here they are just cited as being called, which is observable in-source.

### showChallengeDropdown (line 71)
**Verification**: PASS
**Findings** (all five agents substantively agree):
- "Synchronous, takes `debate: CurrentDebate`, returns void" — PASS (line 71).
- "Calls `hideDropdown()`, early-returns if `#feed-ref-dropdown` missing" — PASS (lines 72–74).
- "Filters `opponentCitedRefs` where `already_challenged` is falsy into `challengeable`" — PASS (line 76).
- "Two guard branches in order: empty `challengeable` toasts 'No references to challenge'; then `challengesRemaining <= 0` toasts 'No challenges remaining'" — PASS (lines 77–78).
- "Builds HTML with `.feed-dropdown-item.feed-dropdown-challenge` items containing escaped `reference_id`, `claim`, `domain`; appends cancel div" — PASS (lines 80–89).
- "Assigns `innerHTML`, sets `display='block'`, wires close click to `hideDropdown`" — PASS (lines 90–93).
- "Async per-item listener reads `dataset.refId`, returns if missing, calls `hideDropdown()`, awaits `fileReferenceChallenge(debate.id, refId, round, debate.role || 'a')`" — PASS (lines 94–100).
- "If `result.blocked` truthy: toasts `'🛡️ Shield blocked the challenge!'` at severity `info` and stops" — PASS (lines 101–103).
- "Otherwise calls `set_challengesRemaining(result.challenges_remaining ?? (challengesRemaining - 1))`, `updateChallengeButtonState()`, `set_activeChallengeRefId(refId)`, `set_activeChallengeId(result.challenge_id || null)`, then `pauseFeed(debate)`" — PASS (lines 106–110).
- "Catch extracts `e.message` if Error, else `'Challenge failed'`, toasts error" — PASS (lines 112–115).
- "`pauseFeed` imported from `arena-feed-machine-pause.ts`, not awaited" — PASS (line 25 import; line 110 invocation is not awaited).
**Unverifiable claims**: None in-source.

### hideDropdown (line 120)
**Verification**: PASS
**Findings**:
- "Synchronous, no parameters, returns void" — PASS (line 120).
- "Calls `document.getElementById('feed-ref-dropdown')`; if truthy, sets `style.display='none'` and `innerHTML=''`" — PASS (lines 121–122).
- "If element null, does nothing" — PASS (guarded by `if (dropdown)`).
- Agent 03 and 04 claim: "touches no module-level state, calls no imported helpers" — PASS. The function uses only `document.getElementById` and direct property sets.
- Agent 02 and 05 add that clearing `innerHTML` discards descendant listeners — this is a correct DOM-behavior note and consistent with the source.
**Unverifiable claims**: None.

### showReferencePopup (line 125)
**Verification**: PASS
**Findings** (all five agents substantively agree):
- "Synchronous, takes `el: HTMLElement`, returns void" — PASS (line 125).
- "Calls `document.getElementById('feed-ref-popup')?.remove()` to remove existing popup" — PASS (line 127).
- "Reads four values: `el.dataset.url || ''`, `el.dataset.sourceTitle || ''`, `el.dataset.sourceType || ''`, `el.textContent?.trim() || ''`" — PASS (lines 129–132).
- "Creates `div` via `document.createElement('div')`, sets `className='feed-ref-popup'`, `id='feed-ref-popup'`" — PASS (lines 134–136).
- "Sets `innerHTML` to template containing escaped `claim`, `.feed-ref-popup-type` with `escapeHTML(sourceType.replaceAll('_', ' '))`, `.feed-ref-popup-domain` with escaped `sourceTitle`" — PASS (lines 137–143).
- "Conditional anchor when `url` truthy with `href=escapeHTML(url)`, `target='_blank'`, `rel='noopener noreferrer'`, text `Open source ↗`" — PASS (line 144).
- "Close button with id `feed-ref-popup-close` always included" — PASS (line 145).
- "Appends to `document.body`" — PASS (line 148).
- "Click listener on `#feed-ref-popup-close` calls `popup.remove()`" — PASS (line 150).
- "Click listener on `popup` checks `e.target === popup`, calls `popup.remove()` only on identity match" — PASS (lines 151–153).
**Unverifiable claims**: None.

### Cross-Agent Consensus Summary
- PASS: 4 / 4 functions (across all 5 agents)
- PARTIAL: 0
- FAIL: 0

All five agents produced substantively identical descriptions. Minor stylistic differences (emoji rendering vs. `\uD83D\uDEE1\uFE0F` escape, "synchronous and returns `void`" vs "returns `undefined`") are cosmetic, not contradictory. No disagreements between agents on any load-bearing detail.

### needs_review
None substantive. Stage 2 covered all four exported functions. One minor omission worth flagging: none of the agents mentioned that `showChallengeDropdown`'s two guard branches execute in a specific order (empty-list check before `challengesRemaining <= 0` check), which means a user with zero challenges but also zero challengeable refs will see the `'No references to challenge'` toast rather than the `'No challenges remaining'` one — but Agent 01, 03, 04, and 05 all listed the guards in the correct source order, so this is implicit rather than missing.

## Agent 03

### showCiteDropdown (line 28)
**Verification**: PASS
**Findings**:
- Agents 01–05 all claim it is synchronous, takes `debate: CurrentDebate`, calls `hideDropdown()` first. Confirmed at line 28–29.
- All agents claim it queries `#feed-ref-dropdown` and returns early if absent. Confirmed at lines 30–31.
- All agents claim it filters `loadedRefs` on `!r.cited` into `uncited`. Confirmed at line 33: `loadedRefs.filter((r) => !r.cited)`.
- All agents claim empty `uncited` produces `showToast('No references remaining', 'error')` and returns. Confirmed at line 34.
- All agents describe the HTML build loop: title div, per-item div with `data-ref-id`, claim span, meta span with author and `Number(ref.current_power)`, cancel row with id `feed-dropdown-close`. Confirmed at lines 36–45. Note: the cancel row is a `.feed-dropdown-cancel` div, which matches claims.
- All agents claim escaping: `reference_id`, `claim`, `author` via `escapeHTML` and `current_power` via `Number()`. Confirmed at lines 39–41.
- All agents claim `dropdown.innerHTML = html` then `dropdown.style.display = 'block'`. Confirmed at lines 46–47.
- All agents claim cancel close is bound via `dropdown.querySelector('#feed-dropdown-close')?.addEventListener('click', hideDropdown)`. Confirmed at line 49.
- All agents describe the async per-item click listener, reading `dataset.refId`, early return if absent, calling `hideDropdown()`, awaiting `citeDebateReference(debate.id, refId, round, debate.role || 'a')`. Confirmed at lines 50–56.
- All agents describe the success path: map `loadedRefs`, replace matching entry with `cited: true` and `cited_at: new Date().toISOString()`, call `set_loadedRefs(updated)`, call `updateCiteButtonState()`. Confirmed at lines 58–62.
- All agents describe the catch: message from `e.message` if `e instanceof Error`, else `'Cite failed'`, passed to `showToast(msg, 'error')`. Confirmed at lines 63–66.
- Agent 01 notes "numeric cast is applied before interpolation" for `Number(ref.current_power)`. Confirmed at line 41.
**Unverifiable claims**: Behavior of `citeDebateReference`, `escapeHTML`, `showToast`, `set_loadedRefs`, `updateCiteButtonState` lives in other files; agents only claim they are invoked, which is verifiable and confirmed.

### showChallengeDropdown (line 71)
**Verification**: PASS
**Findings**:
- All agents claim synchronous, takes `debate: CurrentDebate`, calls `hideDropdown()` first, queries `#feed-ref-dropdown`, returns early if missing. Confirmed at lines 71–74.
- All agents claim it filters `opponentCitedRefs` on `!r.already_challenged` into `challengeable`. Confirmed at line 76.
- All agents claim the two guards in order: empty challengeable -> `showToast('No references to challenge', 'error')`; `challengesRemaining <= 0` -> `showToast('No challenges remaining', 'error')`. Confirmed at lines 77–78. Agent 02 and 04 describe the order explicitly; source matches.
- All agents describe the HTML build: title div, `.feed-dropdown-item.feed-dropdown-challenge` per ref with `data-ref-id`, quoted claim span, meta span with `domain`, cancel row. Confirmed at lines 80–89.
- All agents claim escaping of `reference_id`, `claim`, and `domain`. Confirmed at lines 83–85.
- All agents claim `dropdown.innerHTML = html` then `dropdown.style.display = 'block'`. Confirmed at lines 90–91.
- All agents describe the close listener binding to `hideDropdown`. Confirmed at line 93.
- All agents describe the async per-item click listener: reads `dataset.refId`, early return if absent, calls `hideDropdown()`, awaits `fileReferenceChallenge(debate.id, refId, round, debate.role || 'a')`. Confirmed at lines 94–100.
- All agents claim if `result.blocked`, calls `showToast('🛡️ Shield blocked the challenge!', 'info')` and nothing else. Confirmed at lines 101–103.
- All agents claim the non-blocked path calls: `set_challengesRemaining(result.challenges_remaining ?? (challengesRemaining - 1))`, `updateChallengeButtonState()`, `set_activeChallengeRefId(refId)`, `set_activeChallengeId(result.challenge_id || null)`, `pauseFeed(debate)`. Confirmed at lines 106–110.
- Agent 01 notes `pauseFeed` is imported from `arena-feed-machine-pause.ts` and invoked without `await`. Confirmed at line 25 import and line 110 no await.
- All agents claim catch extracts `e.message` or `'Challenge failed'`, passes to `showToast(msg, 'error')`. Confirmed at lines 112–115.
**Unverifiable claims**: Behavior of imported helpers (`fileReferenceChallenge`, `set_challengesRemaining`, `pauseFeed`, etc.) — claims are only about invocations, which are verified.

### hideDropdown (line 120)
**Verification**: PASS
**Findings**:
- All agents claim synchronous, no params, returns `void`. Confirmed at line 120.
- All agents claim it calls `document.getElementById('feed-ref-dropdown')`. Confirmed at line 121.
- All agents claim if truthy, sets `dropdown.style.display = 'none'` and `dropdown.innerHTML = ''`. Confirmed at line 122.
- Agents 03 and 05 specify the order is display first, then innerHTML — confirmed at line 122 (`dropdown.style.display = 'none'; dropdown.innerHTML = '';`).
- All agents claim if element null, function does nothing. Confirmed (no else branch).
- Agents 02 and 05 add context about clearing innerHTML discarding children and listeners — this is a DOM-semantic claim, which is correct for standard DOM behavior.
**Unverifiable claims**: None

### showReferencePopup (line 125)
**Verification**: PASS
**Findings**:
- All agents claim synchronous, takes `el: HTMLElement`. Confirmed at line 125.
- All agents claim it calls `document.getElementById('feed-ref-popup')?.remove()`. Confirmed at line 127.
- All agents claim reads four values: `el.dataset.url || ''`, `el.dataset.sourceTitle || ''`, `el.dataset.sourceType || ''`, `el.textContent?.trim() || ''`. Confirmed at lines 129–132.
- All agents claim creates div via `document.createElement('div')`, sets `className = 'feed-ref-popup'` and `id = 'feed-ref-popup'`. Confirmed at lines 134–136.
- All agents describe the `innerHTML` template: wrapper `feed-ref-popup-inner`, claim div with `escapeHTML(claim)` quoted, meta row with `escapeHTML(sourceType.replaceAll('_', ' '))` and `escapeHTML(sourceTitle)`, conditional anchor when `url` is truthy with `href=escapeHTML(url)`, `target="_blank"`, `rel="noopener noreferrer"`, close button with id `feed-ref-popup-close`. Confirmed at lines 137–147.
- All agents claim when `url` is falsy an empty string is emitted. Confirmed at line 144 (`${url ? ... : ''}`).
- All agents claim `document.body.appendChild(popup)`. Confirmed at line 148.
- All agents claim attaches a click listener on `#feed-ref-popup-close` via `document.getElementById(...)?.` that calls `popup.remove()`. Confirmed at line 150.
- All agents claim attaches a click listener on `popup` itself, checking `e.target === popup` and calling `popup.remove()` only when true. Confirmed at lines 151–153.
- All agents claim the function is not async, returns void. Confirmed.
**Unverifiable claims**: None

## Cross-Agent Consensus Summary
- **showCiteDropdown**: PASS (5/5 agents agree, all claims confirmed)
- **showChallengeDropdown**: PASS (5/5 agents agree, all claims confirmed)
- **hideDropdown**: PASS (5/5 agents agree, all claims confirmed)
- **showReferencePopup**: PASS (5/5 agents agree, all claims confirmed)

**Totals**: 4 PASS, 0 PARTIAL, 0 FAIL across 4 functions × 5 agents.

**Inter-agent disagreements**: None of substance. All five agents describe the same runtime behavior, and all descriptions match the source. Minor stylistic differences (e.g., Agent 03 and 05 explicitly name the `for...of` loop shape; Agents 01/04 describe "iterates over"; Agent 02 uses "one ... div per"); these are equivalent and accurate.

## needs_review
No substantive omissions. All four exported functions in the file (`showCiteDropdown`, `showChallengeDropdown`, `hideDropdown`, `showReferencePopup`) are covered by all five agents. The module-level imports and the file-header comment (lines 1–25) are setup, not runtime behavior, and do not require Stage 2 coverage. No unexported helpers, no error paths, and no conditional branches in the source are missed by the Stage 2 descriptions.

## Agent 04

### showCiteDropdown (line 28)
**Verification**: PASS
**Findings (Agent 01)**:
- "synchronous and receives a `CurrentDebate` parameter named `debate`": PASS — `export function showCiteDropdown(debate: CurrentDebate): void` (line 28).
- "calls `hideDropdown()` ... looks up `feed-ref-dropdown`; if absent returns": PASS (lines 29-31).
- "filters `loadedRefs` for `!r.cited`": PASS (line 33).
- "if empty calls `showToast('No references remaining', 'error')` and returns": PASS (line 34).
- "HTML starts with title div, iterates with `.feed-dropdown-item` carrying `data-ref-id` escaped `reference_id`, `.feed-dropdown-claim` escaped `claim` in quotes, `.feed-dropdown-meta` with escaped `author` and `Number(ref.current_power)`": PASS (lines 36-44).
- "trailing `.feed-dropdown-cancel` div with id `feed-dropdown-close`, then innerHTML and display='block'": PASS (lines 45-47).
- "click on `#feed-dropdown-close` bound to `hideDropdown`": PASS (line 49).
- "per-item async listener: reads `dataset.refId`, returns if missing, calls `hideDropdown()`, try-awaits `citeDebateReference(debate.id, refId, round, debate.role || 'a')`": PASS (lines 50-56).
- "on success maps `loadedRefs` setting `cited:true` and `cited_at: new Date().toISOString()`, calls `set_loadedRefs(updated)` then `updateCiteButtonState()`": PASS (lines 58-62).
- "catch extracts `e.message` when Error else 'Cite failed', calls `showToast(msg, 'error')`": PASS (lines 63-66).
- "outer returns void, does not await listener": PASS — function signature `: void` and listener is fire-and-forget.
**Findings (Agents 02-05)**: All five agents make essentially the same claims, all confirmed by the source.
**Unverifiable claims**: None

### showChallengeDropdown (line 71)
**Verification**: PASS
**Findings (Agent 01)**:
- "synchronous, accepts `debate: CurrentDebate`, calls hideDropdown, returns if element missing": PASS (lines 71-74).
- "filters `opponentCitedRefs` for `!already_challenged`": PASS (line 76).
- "two guards: `challengeable.length === 0` toasts 'No references to challenge' and returns; `challengesRemaining <= 0` toasts 'No challenges remaining' and returns": PASS (lines 77-78).
- "HTML with title div (crossed swords), `.feed-dropdown-item.feed-dropdown-challenge` with `data-ref-id` escaped, `claim` quoted+escaped, meta with escaped `domain`, cancel div, innerHTML/display block": PASS (lines 80-91).
- "`#feed-dropdown-close` click bound to `hideDropdown`; per-item async listener reads `dataset.refId`, returns if absent, hideDropdown, try-awaits `fileReferenceChallenge(debate.id, refId, round, debate.role || 'a')`": PASS (lines 93-100).
- "if `result.blocked` truthy calls `showToast('🛡️ Shield blocked the challenge!', 'info')` and does nothing else": PASS (lines 101-103).
- "else calls `set_challengesRemaining(result.challenges_remaining ?? (challengesRemaining - 1))`, `updateChallengeButtonState()`, `set_activeChallengeRefId(refId)`, `set_activeChallengeId(result.challenge_id || null)` with F-55 comment, then `pauseFeed(debate)` without await": PASS (lines 104-110).
- "catch extracts `e.message` when Error else 'Challenge failed'; `showToast(msg,'error')`; outer returns void": PASS (lines 112-115).
**Findings (Agents 02-05)**: All agents describe the same structure and behavior; all claims confirmed by the source.
**Unverifiable claims**: None

### hideDropdown (line 120)
**Verification**: PASS
**Findings (all agents)**:
- "synchronous, no parameters, void": PASS (line 120).
- "calls `document.getElementById('feed-ref-dropdown')`; if truthy sets `display='none'` and `innerHTML=''`": PASS (lines 121-122).
- "if null does nothing": PASS — conditional wraps the sets.
- "touches no module-level state": PASS — only DOM access.
- Agent 03 order claim: "sets display='none' and clears innerHTML in that order": PASS — `dropdown.style.display = 'none'; dropdown.innerHTML = '';` (line 122).
**Unverifiable claims**: None

### showReferencePopup (line 125)
**Verification**: PASS
**Findings (all agents)**:
- "synchronous, takes `el: HTMLElement`": PASS (line 125).
- "calls `document.getElementById('feed-ref-popup')?.remove()` to remove any pre-existing popup": PASS (line 127).
- "reads four values: `el.dataset.url`, `el.dataset.sourceTitle`, `el.dataset.sourceType` each defaulting to `''`; `el.textContent?.trim()` defaulting to `''`": PASS (lines 129-132).
- "creates div, sets className `feed-ref-popup` and id `feed-ref-popup`": PASS (lines 134-136).
- "innerHTML contains `.feed-ref-popup-claim` with escaped claim in quotes; `.feed-ref-popup-meta` with `.feed-ref-popup-type` containing `escapeHTML(sourceType.replaceAll('_', ' '))` and `.feed-ref-popup-domain` containing `escapeHTML(sourceTitle)`": PASS (lines 137-143).
- "conditional anchor only when `url` is truthy, with escaped href, `target='_blank'`, `rel='noopener noreferrer'`, text 'Open source ↗'": PASS (line 144).
- "close button with id `feed-ref-popup-close` always included": PASS (line 145).
- "appends to document.body": PASS (line 148).
- "click listener on `#feed-ref-popup-close` calls `popup.remove()`": PASS (line 150).
- "click listener on popup checking `e.target === popup` calls `popup.remove()` — clicks on inner children do not match": PASS (lines 151-153).
- "returns void, not async, no module-level state touched": PASS.
**Unverifiable claims**: None

### Cross-Agent Consensus Summary
Function count: 4 (showCiteDropdown, showChallengeDropdown, hideDropdown, showReferencePopup).
Agents: 5 (01–05).

Per-function verdicts (aggregated across all five agents):
- showCiteDropdown — PASS
- showChallengeDropdown — PASS
- hideDropdown — PASS
- showReferencePopup — PASS

Totals: **PASS: 4 / PARTIAL: 0 / FAIL: 0**

Cross-agent disagreements: None. All five agents describe the same structural behavior for all four functions. Minor phrasing differences (e.g., Agent 03 calls `(challengesRemaining - 1)` "decrementing the module-level `challengesRemaining` by one when null/undefined", Agent 05 says "when defined") reflect stylistic variation, not contradictory claims — all consistent with `result.challenges_remaining ?? (challengesRemaining - 1)` at line 106.

### needs_review
No substantive omissions. All exported runtime behavior in the file (including imports, the F-55 comment at line 109, and the outer-vs-inner click identity check at line 152) is covered by Stage 2.

## Agent 05

### showCiteDropdown (line 28)
**Verification**: PASS
**Findings**:
- All 5 agents claim the function is synchronous and takes `debate: CurrentDebate`. Source line 28: `export function showCiteDropdown(debate: CurrentDebate): void` — PASS.
- All agents claim it calls `hideDropdown()` first (line 29), then `document.getElementById('feed-ref-dropdown')` and returns if absent (lines 30-31). PASS.
- All agents claim it filters `loadedRefs` where `cited` is falsy into `uncited` (line 33). PASS.
- All agents claim empty `uncited` triggers `showToast('No references remaining', 'error')` and early return (line 34). PASS.
- All agents claim the HTML template begins with a title div with a document emoji. Source line 36 uses `\uD83D\uDCC4` (document emoji). PASS.
- All agents claim `data-ref-id` is `escapeHTML(ref.reference_id)`, `.feed-dropdown-claim` contains `escapeHTML(ref.claim)`, meta contains `escapeHTML(ref.author)` and `Number(ref.current_power)` (lines 39-41). PASS.
- All agents claim a cancel div with id `feed-dropdown-close` is appended (line 45). PASS.
- All agents claim `dropdown.innerHTML = html` and `dropdown.style.display = 'block'` (lines 46-47). PASS.
- All agents claim close listener bound to `hideDropdown` (line 49); per-item async click listener reads `dataset.refId`, returns early if missing, calls `hideDropdown()`, awaits `citeDebateReference(debate.id, refId, round, debate.role || 'a')` (lines 50-56). PASS.
- All agents claim success maps `loadedRefs` replacing matching entry with `cited: true` and `cited_at: new Date().toISOString()`, passes to `set_loadedRefs`, calls `updateCiteButtonState()` (lines 58-62). PASS.
- All agents claim catch extracts `e.message` if `e instanceof Error` else `'Cite failed'`, calls `showToast(msg, 'error')` (lines 63-66). PASS.
**Unverifiable claims**: None

### showChallengeDropdown (line 71)
**Verification**: PASS
**Findings**:
- All agents claim synchronous, takes `debate: CurrentDebate`. Source line 71 confirms. PASS.
- All agents claim calls `hideDropdown()`, reads `feed-ref-dropdown`, returns early if absent (lines 72-74). PASS.
- All agents claim filters `opponentCitedRefs` where `already_challenged` is falsy into `challengeable` (line 76). PASS.
- All agents claim guard: empty `challengeable` → `showToast('No references to challenge', 'error')` and return (line 77). PASS.
- All agents claim guard: `challengesRemaining <= 0` → `showToast('No challenges remaining', 'error')` and return (line 78). PASS.
- All agents claim title div with crossed-swords emoji. Source line 80 uses `\u2694\uFE0F`. PASS.
- All agents claim per-ref item includes both `feed-dropdown-item` and `feed-dropdown-challenge` classes, `data-ref-id=escapeHTML(ref.reference_id)`, spans with `escapeHTML(ref.claim)` and `escapeHTML(ref.domain)` (lines 83-85). PASS.
- All agents claim cancel div with id `feed-dropdown-close` (line 89), `innerHTML`/`display` set (lines 90-91). PASS.
- All agents claim async click listener reads `dataset.refId`, returns if absent, calls `hideDropdown()`, awaits `fileReferenceChallenge(debate.id, refId, round, debate.role || 'a')` (lines 94-100). PASS.
- All agents claim `result.blocked` truthy branch → `showToast('🛡️ Shield blocked the challenge!', 'info')` and stop (lines 101-103). PASS.
- All agents claim else branch → `set_challengesRemaining(result.challenges_remaining ?? (challengesRemaining - 1))`, `updateChallengeButtonState()`, `set_activeChallengeRefId(refId)`, `set_activeChallengeId(result.challenge_id || null)`, `pauseFeed(debate)` (lines 106-110). PASS.
- All agents claim catch extracts `e.message` or `'Challenge failed'` and `showToast(msg, 'error')` (lines 112-115). PASS.
- All agents claim `pauseFeed` is imported from `./arena-feed-machine-pause.ts`. Source line 25 confirms. PASS.
**Unverifiable claims**: None

### hideDropdown (line 120)
**Verification**: PASS
**Findings**:
- All agents claim synchronous, no parameters, returns `void`. Source line 120: `export function hideDropdown(): void`. PASS.
- All agents claim calls `document.getElementById('feed-ref-dropdown')`; if truthy sets `display = 'none'` and `innerHTML = ''`; if null, does nothing (lines 121-122). PASS.
- Agents 2 and 5 additionally note that clearing `innerHTML` discards listeners on descendants — this is a factual DOM statement consistent with the source. PASS.
**Unverifiable claims**: None

### showReferencePopup (line 125)
**Verification**: PASS
**Findings**:
- All agents claim synchronous, takes `el: HTMLElement`, returns `void`. Source line 125 confirms. PASS.
- All agents claim calls `document.getElementById('feed-ref-popup')?.remove()` first (line 127). PASS.
- All agents claim reads four values with empty-string fallbacks: `el.dataset.url`, `el.dataset.sourceTitle`, `el.dataset.sourceType`, `el.textContent?.trim()` (lines 129-132). PASS.
- All agents claim creates a `div`, sets `className = 'feed-ref-popup'` and `id = 'feed-ref-popup'` (lines 134-136). PASS.
- All agents claim `innerHTML` template contains: escaped `claim` in claim div, meta row with `escapeHTML(sourceType.replaceAll('_', ' '))` and `escapeHTML(sourceTitle)`, conditional anchor (only when `url` truthy) with escaped `href`, `target="_blank"`, `rel="noopener noreferrer"`, and always a close button with id `feed-ref-popup-close` (lines 137-147). PASS.
- Agent 5 specifically mentions `feed-ref-popup-inner` wrapper — confirmed at line 138. PASS.
- All agents claim appends popup to `document.body` (line 148). PASS.
- All agents claim attaches click listener to `#feed-ref-popup-close` via optional chaining calling `popup.remove()` (line 150). PASS.
- All agents claim attaches click listener on `popup` itself checking `e.target === popup` and calling `popup.remove()` only when true (lines 151-153). PASS.
**Unverifiable claims**: None

### Cross-Agent Consensus Summary
Total claims checked across 4 functions × 5 agents:
- **PASS**: All substantive claims from all 5 agents on all 4 functions verified against source.
- **PARTIAL**: 0
- **FAIL**: 0

**Agent disagreements**: None. All five agents produced substantively equivalent descriptions. Minor stylistic differences (e.g., Agent 5 noting the `feed-ref-popup-inner` wrapper that Agents 1–4 omitted, Agents 2 and 5 noting that clearing `innerHTML` detaches descendant listeners) are additive detail rather than contradictory claims.

**needs_review**: None. The file contains four exported functions, all four are described by every Stage 2 agent, and no untreated branches, error paths, or side effects were found in the source.
