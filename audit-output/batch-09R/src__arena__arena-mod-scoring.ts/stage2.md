# Stage 2 Outputs — src/arena/arena-mod-scoring.ts

Anchors: `renderModScoring` (line 6)

---

## Agent 01

### renderModScoring (line 6)

**Parameters and types:**
- `debate: CurrentDebate` — imported type from `./arena-types.ts`; fields accessed: `debate.moderatorId`, `debate.moderatorName`, `debate.debater_a`, `debate.debater_b`, `debate.id`
- `container: HTMLElement` — the DOM element into which the scoring widget is appended
- **Return value:** `void`

**Early returns / guard clauses:**
1. Returns immediately if `debate.moderatorId` or `debate.moderatorName` is falsy.
2. Calls `getCurrentProfile()` (imported from `../auth.ts`). If the result is falsy, returns immediately.
3. Computes `isDebater` — `true` if `profile.id` equals `debate.debater_a` or `debate.debater_b`.
4. Computes `isMod` — `true` if `profile.id` equals `debate.moderatorId`. If `isMod` is `true`, returns immediately (a moderator cannot score themselves).

**DOM mutations — section creation:**
- Creates a `<div>` element assigned to `section`, sets `section.className = 'mod-score-section'`.

**innerHTML branch — debater path (`isDebater === true`):**
Sets `section.innerHTML` to a block containing:
- `<div class="mod-score-title">RATE THE MODERATOR</div>`
- `<div class="mod-score-card">` containing:
  - `<div class="mod-score-name">` with `⚖️` and `escapeHTML(debate.moderatorName)`
  - `<div class="mod-score-btns">` with two buttons:
    - `<button class="mod-score-btn happy" data-score="25">👍 FAIR</button>`
    - `<button class="mod-score-btn unhappy" data-score="0">👎 UNFAIR</button>`
  - `<div class="mod-scored" id="mod-scored" style="display:none;">`

**innerHTML branch — spectator path (`isDebater === false`):**
Sets `section.innerHTML` to a block containing:
- `<div class="mod-score-title">RATE THE MODERATOR</div>`
- `<div class="mod-score-card">` containing:
  - `<div class="mod-score-name">` with `⚖️` and `escapeHTML(debate.moderatorName)`
  - `<div class="mod-score-slider-row">` containing:
    - `<input type="range" class="mod-score-slider" id="mod-score-slider" min="1" max="50" value="25">`
    - `<div class="mod-score-val" id="mod-score-val">25</div>`
  - `<button class="mod-score-submit" id="mod-score-submit">SUBMIT SCORE</button>`
  - `<div class="mod-scored" id="mod-scored" style="display:none;">`

**DOM mutations after innerHTML:**
- `container.appendChild(section)` — appends section to the provided container.
- `injectAdSlot(container)` — called immediately after append; injects an ad slot into `container` (F-43 Slot 3, moderator verdict ad).

**Event listeners — debater buttons:**
`section.querySelectorAll('.mod-score-btn').forEach(...)` — attaches an async `click` listener to each button:
1. Reads `parseInt((btn as HTMLElement).dataset.score!, 10)` to get `score` (25 or 0).
2. Iterates all `.mod-score-btn` within `section` again, sets each `(b as HTMLButtonElement).disabled = true` and `(b as HTMLElement).style.opacity = '0.4'`.
3. `await scoreModerator(debate.id, score)` — async call from `../auth.ts`.
4. `scoredEl = document.getElementById('mod-scored')`.
5. If `result?.error`: sets `scoredEl.textContent = '❌ ' + (friendlyError(result.error) || String(result.error))`, `scoredEl.style.display = 'block'`, `scoredEl.style.color = 'var(--mod-accent)'`.
6. Else: sets `scoredEl.textContent = '✅ Score submitted'`, `scoredEl.style.display = 'block'`.

**Event listeners — spectator slider:**
- `slider = document.getElementById('mod-score-slider')` cast to `HTMLInputElement | null`.
- `valEl = document.getElementById('mod-score-val')`.
- If both non-null, attaches `input` listener: sets `valEl.textContent = slider.value`.

**Event listeners — spectator submit button:**
`document.getElementById('mod-score-submit')?.addEventListener('click', async () => {...})` — optional chaining, no-op if absent:
1. `score = parseInt(slider?.value || '25', 10)`.
2. `submitBtn = document.getElementById('mod-score-submit')` cast to `HTMLButtonElement | null`. If non-null: sets `submitBtn.textContent = '⏳'`, `submitBtn.disabled = true`.
3. `await scoreModerator(debate.id, score)`.
4. `scoredEl = document.getElementById('mod-scored')`.
5. On error: sets scoredEl text/display/color; restores `submitBtn.textContent = 'SUBMIT SCORE'`, `submitBtn.disabled = false`.
6. On success: sets `scoredEl.textContent = '✅ Score submitted'`, `scoredEl.style.display = 'block'`; calls `submitBtn.remove()`.

**State changes:** None to module-level state. All mutations are DOM-local.

---

## Agent 02

### renderModScoring (line 6)

**Parameters and types:**
- `debate: CurrentDebate` — from `./arena-types.ts`
- `container: HTMLElement`
- **Return value:** `void`

**Early returns:**
1. Returns if `debate.moderatorId` or `debate.moderatorName` falsy.
2. Returns if `getCurrentProfile()` returns null.
3. Returns if `profile.id === debate.moderatorId`.

**Module-level / external reads:**
- `getCurrentProfile()` — sync, from `../auth.ts`
- `escapeHTML()` — sync, from `../config.ts`
- `friendlyError()` — sync, from `../config.ts`
- `scoreModerator()` — async, from `../auth.ts`, called with `(debate.id, score)`
- `injectAdSlot()` — sync, from `./arena-ads.ts`, called with `container`

**Control flow — two branches based on `isDebater`:**

`isDebater = profile.id === debate.debater_a || profile.id === debate.debater_b`

**Branch A — `isDebater === true` (debater):**
`section.innerHTML` set to: `.mod-score-title`, `.mod-score-card` > `.mod-score-name` (escapeHTML'd moderator name), `.mod-score-btns` > two `.mod-score-btn` buttons (data-score 25 and 0), `#mod-scored` div (hidden).

**Branch B — `isDebater === false` (spectator):**
`section.innerHTML` set to: `.mod-score-title`, `.mod-score-card` > `.mod-score-name`, `.mod-score-slider-row` > `#mod-score-slider` range input (min 1, max 50, val 25) + `#mod-score-val` div, `#mod-score-submit` button, `#mod-scored` div (hidden).

**DOM mutations (both branches):**
- `section.className = 'mod-score-section'`
- `section.innerHTML = ...`
- `container.appendChild(section)`
- `injectAdSlot(container)`

**Event listeners:**

*Debater buttons* — `querySelectorAll('.mod-score-btn')` forEach: async click handler. Reads score from dataset, disables all buttons (disabled + opacity 0.4), awaits `scoreModerator`, updates `#mod-scored` display.

*Spectator slider* — conditionally wired when `slider && valEl` both non-null. `input` listener: sets `valEl.textContent = slider.value`.

*Spectator submit* — `document.getElementById('mod-score-submit')?.addEventListener('click', ...)`: parses score, disables submitBtn, awaits `scoreModerator`, on error restores btn; on success calls `submitBtn.remove()`.

**Notable issues:**
- All element lookups inside async callbacks use `document.getElementById()` (not scoped to `section`). If `renderModScoring` is called more than once, subsequent ID lookups may return elements from earlier renders.
- The slider and submit handlers are always wired unconditionally (Branch A's `section` has neither `#mod-score-slider` nor `#mod-score-submit`, so all three getElementById calls return null and the `?.addEventListener` is a silent no-op).

---

## Agent 03

### renderModScoring (line 6)

**Parameters:**
- `debate: CurrentDebate` — fields: `moderatorId`, `moderatorName`, `debater_a`, `debater_b`, `id`
- `container: HTMLElement`
- **Return value:** `void`

**Early-exit guards:**
1. Falsy `debate.moderatorId` or `debate.moderatorName` → return.
2. `getCurrentProfile()` returns null → return.
3. `profile.id === debate.moderatorId` → return ("Can't score yourself").

**Role detection:**
- `isDebater = profile.id === debate.debater_a || profile.id === debate.debater_b`
- `isMod = profile.id === debate.moderatorId` (causes early return above)

**DOM creation:**
- `section = document.createElement('div')`, `section.className = 'mod-score-section'`

**Debater innerHTML (when `isDebater` true):**
- `.mod-score-title`: "RATE THE MODERATOR"
- `.mod-score-card` > `.mod-score-name`: ⚖️ + `escapeHTML(debate.moderatorName)`
- `.mod-score-btns`: `.mod-score-btn.happy` data-score="25" "👍 FAIR", `.mod-score-btn.unhappy` data-score="0" "👎 UNFAIR"
- `#mod-scored` div hidden

**Spectator innerHTML (when `isDebater` false):**
- `.mod-score-title`: "RATE THE MODERATOR"
- `.mod-score-card` > `.mod-score-name`: ⚖️ + `escapeHTML(debate.moderatorName)`
- `.mod-score-slider-row`: `#mod-score-slider` range (min 1, max 50, val 25) + `#mod-score-val` "25"
- `#mod-score-submit` button "SUBMIT SCORE"
- `#mod-scored` div hidden

**Append and ad injection:**
- `container.appendChild(section)`
- `injectAdSlot(container)` — F-43 Slot 3 comment

**Debater buttons event listener:**
`section.querySelectorAll('.mod-score-btn').forEach` → async click:
1. `score = parseInt(dataset.score, 10)` — 25 or 0
2. All `.mod-score-btn` disabled (disabled + opacity 0.4)
3. `await scoreModerator(debate.id, score)`
4. `scoredEl = document.getElementById('mod-scored')`
5. Error: textContent = `'❌ ' + friendlyError/String(error)`, display block, color `var(--mod-accent)`
6. Success: textContent = `'✅ Score submitted'`, display block

**Spectator slider listener:**
- `slider = document.getElementById('mod-score-slider')` as `HTMLInputElement | null`
- `valEl = document.getElementById('mod-score-val')`
- If both non-null: `input` → `valEl.textContent = slider.value`

**Spectator submit listener:**
`document.getElementById('mod-score-submit')?.addEventListener('click', async () => {})`:
1. `score = parseInt(slider?.value || '25', 10)`
2. `submitBtn = document.getElementById('mod-score-submit')` — sets textContent `'⏳'`, disabled true
3. `await scoreModerator(debate.id, score)`
4. `scoredEl = document.getElementById('mod-scored')`
5. Error: updates scoredEl, restores submitBtn
6. Success: scoredEl text/display, `submitBtn.remove()`

**Notable behaviors:**
- `document.getElementById` inside async callbacks is global-scoped — ID collision risk if called more than once.
- `querySelectorAll('.mod-score-btn')` is unconditional — in spectator branch returns 0 elements, forEach is a no-op.
- No module-level state written.

---

## Agent 04

### renderModScoring (line 6)

**Parameters:**
- `debate: CurrentDebate` — fields: `moderatorId`, `moderatorName`, `debater_a`, `debater_b`, `id`
- `container: HTMLElement`
- **Return value:** `void`

**External imports read:**
- `getCurrentProfile` — sync, `../auth.ts`
- `scoreModerator` — async, `../auth.ts`, `(debate.id, score)`
- `escapeHTML` — sync, `../config.ts`
- `friendlyError` — sync, `../config.ts`
- `injectAdSlot` — sync, `./arena-ads.ts`, called with `container`

**Control flow / early returns:**
1. Falsy `debate.moderatorId` or `debate.moderatorName` → return
2. `getCurrentProfile()` null → return
3. `profile.id === debate.moderatorId` → return ("Can't score yourself")

**DOM — section element:**
`section = document.createElement('div')`, `section.className = 'mod-score-section'`

**innerHTML — debater (`isDebater` true):**
As above (same structure). `.mod-score-btn.happy` data-score="25", `.mod-score-btn.unhappy` data-score="0", `#mod-scored` hidden.

**innerHTML — spectator (`isDebater` false):**
As above. `#mod-score-slider` range min 1 max 50 val 25, `#mod-score-val` "25", `#mod-score-submit` "SUBMIT SCORE", `#mod-scored` hidden.

**Append and ad:**
- `container.appendChild(section)`
- `injectAdSlot(container)`

**Debater buttons:**
`section.querySelectorAll('.mod-score-btn').forEach(...)` async click:
- `score = parseInt(dataset.score!, 10)` → 25 or 0
- All buttons disabled + opacity 0.4
- `await scoreModerator(debate.id, score)`
- `scoredEl = document.getElementById('mod-scored')`
- Error: text + display + color. Success: text + display.

**Spectator slider:**
`slider = document.getElementById('mod-score-slider')`, `valEl = document.getElementById('mod-score-val')`. If both present: `input` → `valEl.textContent = slider.value`.

**Spectator submit:**
`document.getElementById('mod-score-submit')?.addEventListener('click', async () => {})`:
- Score from `slider?.value || '25'`
- `submitBtn` textContent `'⏳'`, disabled true
- `await scoreModerator(debate.id, score)`
- `scoredEl = document.getElementById('mod-scored')`
- Error: restore btn. Success: `submitBtn.remove()`

**No module-level state changes.**

---

## Agent 05

### renderModScoring (line 6)

**Signature:** `renderModScoring(debate: CurrentDebate, container: HTMLElement): void`

**Parameters:**
- `debate`: `CurrentDebate` — fields: `moderatorId`, `moderatorName`, `debater_a`, `debater_b`, `id`
- `container`: `HTMLElement`

**Imports used:**
- `getCurrentProfile` — `../auth.ts`, called once at init
- `scoreModerator` — `../auth.ts`, async, called in event handlers
- `escapeHTML` — `../config.ts`, called on `debate.moderatorName`
- `friendlyError` — `../config.ts`, called in error branches
- `injectAdSlot` — `./arena-ads.ts`, called once after append

**Early returns:**
1. Falsy `debate.moderatorId` or `debate.moderatorName` → return
2. `getCurrentProfile()` falsy → return
3. `profile.id === debate.moderatorId` → return (no self-scoring)

**Two rendering branches on `isDebater`:**

`isDebater = profile.id === debate.debater_a || profile.id === debate.debater_b`

**Branch A — debater (`isDebater === true`):**
`section.innerHTML`: `.mod-score-title` "RATE THE MODERATOR", `.mod-score-card` > `.mod-score-name` (⚖️ + escapeHTML), `.mod-score-btns` > `button.mod-score-btn.happy[data-score="25"]` "👍 FAIR" + `button.mod-score-btn.unhappy[data-score="0"]` "👎 UNFAIR", `div.mod-scored#mod-scored` hidden.

**Branch B — spectator (`isDebater === false`):**
`section.innerHTML`: `.mod-score-title` "RATE THE MODERATOR", `.mod-score-card` > `.mod-score-name` (⚖️ + escapeHTML), `.mod-score-slider-row` > `input[type=range].mod-score-slider#mod-score-slider[min=1,max=50,value=25]` + `div.mod-score-val#mod-score-val` "25", `button.mod-score-submit#mod-score-submit` "SUBMIT SCORE", `div.mod-scored#mod-scored` hidden.

**DOM mutations (both branches):**
- `section.className = 'mod-score-section'`
- `section.innerHTML = <branch template>`
- `container.appendChild(section)`
- `injectAdSlot(container)`

**Event listeners:**

*Debater button click* (`section.querySelectorAll('.mod-score-btn').forEach`): async, reads score from dataset (25 or 0), disables all buttons, awaits `scoreModerator(debate.id, score)`, updates `document.getElementById('mod-scored')` textContent + display + (on error) color.

*Spectator slider input* (guarded by `if (slider && valEl)`): `valEl.textContent = slider.value`

*Spectator submit click* (optional chaining): sets `⏳` + disabled, awaits `scoreModerator(debate.id, score)`, on error restores btn; on success calls `submitBtn.remove()`.

**State changes:** None to module-level or external state. All mutations are DOM-local.
