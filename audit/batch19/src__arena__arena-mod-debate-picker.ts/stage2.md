# Stage 2 Outputs — arena-mod-debate-picker.ts

## Agent 01

### showModDebatePicker
Calls `set_view('modDebatePicker')` to update module state in `arena-state.ts`. Calls `history.pushState` with state `{ arenaView: 'modDebatePicker' }` and empty title. Reads module-level `screenEl`; if truthy, clears its `innerHTML`.

Creates a `div` via `document.createElement`, assigns className `'arena-lobby arena-fade-in'`, and assigns a large template-literal HTML string to its innerHTML. The HTML contains: hero title "Create Debate"; a back button `#mod-debate-picker-back`; a mode `<select>` `#mod-debate-mode` (options text/live/voicememo, default text); a category `<select>` `#mod-debate-category` (blank/politics/sports/entertainment/music/movies/general); a topic `<input>` `#mod-debate-topic` (maxlength 200); a ranked checkbox `#mod-debate-ranked`; a ruleset `<select>` `#mod-debate-ruleset` (amplified/unplugged); output of `roundPickerCSS()` embedded in a `<style>` block; output of `roundPickerHTML()`; and a primary button `#mod-debate-create-btn`.

Invokes `screenEl?.appendChild(container)` to insert the container. Calls `wireRoundPicker(container)`.

Attaches a click listener to `#mod-debate-picker-back`: click fires a void-wrapped async IIFE that dynamically imports `./arena-mod-queue-browse.ts` and calls `showModQueue()`. Dynamic import is the LM-MODDEBATE-001 cycle break. No try/catch around the dynamic import — a rejection surfaces as unhandled rejection.

Attaches a click listener to `#mod-debate-create-btn` that calls `createModDebate()` and discards the returned promise via `void`.

Returns `undefined` implicitly. The two `getElementById(...)?.addEventListener` calls use optional chaining — if ids are missing, listeners silently skip.

### createModDebate
Reads `#mod-debate-create-btn` cast to `HTMLButtonElement | null` as `btn`. If truthy, sets `btn.disabled = true` and `btn.textContent = 'Creating…'`.

Reads five form values via `getElementById` + cast with fallbacks: `mode` from `#mod-debate-mode` default `'text'`; `category` from `#mod-debate-category` default `null`; `topic` from `#mod-debate-topic` trimmed, default `null`; `ranked` from `#mod-debate-ranked` .checked default `false`; `ruleset` from `#mod-debate-ruleset` default `'amplified'`.

Enters a `try` block. Awaits `safeRpc<{ debate_id: string; join_code: string }>('create_mod_debate', { p_mode, p_topic, p_category: category || null, p_ranked, p_ruleset, p_total_rounds: selectedRounds })` — `selectedRounds` from module-level state. The `p_category: category || null` applies `|| null` a second time, redundant with the earlier `category || null`. Destructures `{ data, error }` from the result.

If `error` is truthy, throws it, jumping to catch. Otherwise casts `data` to the expected shape as `result`. Calls `set_modDebateId(result.debate_id)`. Calls `showModDebateWaitingMod(result.debate_id, result.join_code, topic || 'Open Debate', mode as DebateMode, ranked)` — literal `'Open Debate'` when topic is null/empty. Not awaited.

In `catch (err)`: if `btn` truthy, sets `disabled = false` and `textContent = '⚔️ CREATE & GET CODE'` (literal `&` here differs from the template's `&amp;`, but textContent sees `&` either way). Calls `showToast(friendlyError(err) || 'Could not create debate')`. Error is swallowed; promise resolves to undefined.

## Agent 02

### showModDebatePicker
Writes `'modDebatePicker'` to module state via `set_view`, then pushes a history entry with state `{ arenaView: 'modDebatePicker' }` and empty title. If imported module state `screenEl` is truthy, clears its `innerHTML`. Creates a `<div>` class `arena-lobby arena-fade-in`, assigns a literal innerHTML string: back button, mode select (text/live/voicememo), category select (blank+6 options), topic input maxlength 200, ranked checkbox, ruleset select (amplified/unplugged), inline `<style>` from `roundPickerCSS()`, `roundPickerHTML()` output, create button. Appends via optional chaining. Calls `wireRoundPicker(container)`.

Attaches click listener on `#mod-debate-picker-back` that invokes an IIFE which dynamically `import()`s `./arena-mod-queue-browse.ts` and calls its `showModQueue`. Attaches click listener on `#mod-debate-create-btn` that calls `createModDebate()` wrapped in `void`. No return. HTML is interpolated without escaping but all values are static.

### createModDebate
Looks up `#mod-debate-create-btn` cast as `HTMLButtonElement | null`; if present, sets `disabled=true` and `textContent='Creating…'`. Reads five form values with fallback defaults: `mode` default `'text'`, `category` default `null`, `topic` trimmed default `null`, `ranked` default `false`, `ruleset` default `'amplified'`.

Enters try. Awaits `safeRpc<{ debate_id: string; join_code: string }>('create_mod_debate', …)` with `p_mode`, `p_topic`, `p_category` passed as `category || null` (redundant with earlier fallback), `p_ranked`, `p_ruleset`, `p_total_rounds: selectedRounds` from module state. If `error` is truthy, throw. Casts `data` to the shape as `result`, writes `result.debate_id` via `set_modDebateId`, then calls `showModDebateWaitingMod(result.debate_id, result.join_code, topic || 'Open Debate', mode as DebateMode, ranked)`.

On catch: if button exists, re-enable and restore text to `'⚔️ CREATE & GET CODE'` (ampersand literal). Calls `showToast(friendlyError(err) || 'Could not create debate')`. No return. Happy path leaves button disabled with 'Creating…' text since navigation replaces the view.

## Agent 03

### showModDebatePicker
Sets module state `view` via `set_view('modDebatePicker')`, pushes history state `{ arenaView: 'modDebatePicker' }`. Reads module-level `screenEl`; if truthy, clears innerHTML. Creates a div class `arena-lobby arena-fade-in` and populates innerHTML with: hero header, back button `#mod-debate-picker-back`, mode select, category select, topic input (200 maxlength), ranked checkbox, ruleset select, inline `<style>` block from `roundPickerCSS()`, `roundPickerHTML()` markup, create button `#mod-debate-create-btn`. Appends container to `screenEl` via optional chaining (template built regardless). Calls `wireRoundPicker(container)`.

Attaches click listener on `#mod-debate-picker-back` firing a void-wrapped async IIFE that dynamic-imports `./arena-mod-queue-browse.ts` and calls `showModQueue()` (LM-MODDEBATE-001 cycle break). Dynamic import rejection would be unhandled rejection. Attaches click listener on `#mod-debate-create-btn` that invokes `createModDebate()` void-wrapped. `getElementById`-plus-optional-chain means if elements are missing wiring silently no-ops. Uncertain: whether `screenEl` being null at call time is expected — function still builds and calls `wireRoundPicker`.

### createModDebate
Async. Reads `#mod-debate-create-btn` as HTMLButtonElement; if present, `disabled=true` and textContent 'Creating…'. Reads five form values: `mode` default `'text'`, `category` empty→`null`, `topic` trimmed empty→`null`, `ranked` default `false`, `ruleset` default `'amplified'`.

Try block: await `safeRpc<{ debate_id, join_code }>('create_mod_debate', { p_mode, p_topic, p_category: category || null, p_ranked, p_ruleset, p_total_rounds: selectedRounds })`. `selectedRounds` is module state. Destructures `{ data, error }`; if error truthy, throw. Casts data to result, `set_modDebateId(result.debate_id)`, then `showModDebateWaitingMod(result.debate_id, result.join_code, topic || 'Open Debate', mode as DebateMode, ranked)`. No await.

Catch `err`: re-enable button if still exists, restore text `'⚔️ CREATE & GET CODE'`. Calls `showToast(friendlyError(err) || 'Could not create debate')`. No finally; success leaves button disabled with 'Creating…' until waiting screen replaces DOM.

## Agent 04

### showModDebatePicker
Synchronous void. Sets module state `view` to `'modDebatePicker'` via `set_view`. Pushes history `{ arenaView: 'modDebatePicker' }`. If module-state `screenEl` truthy, clears innerHTML; else skipped silently.

Constructs a detached `<div>` class `arena-lobby arena-fade-in`. Assigns innerHTML from a template literal: hero header, back button `#mod-debate-picker-back`, five form controls (mode select text/live/voicememo; category select 7 values; topic input maxlength 200; ranked checkbox; ruleset select amplified/unplugged), injected `<style>` from `roundPickerCSS()`, `roundPickerHTML()` markup, submit button `#mod-debate-create-btn`.

Template interpolates `roundPickerCSS()`/`roundPickerHTML()` results — not escaped. Safety depends on those functions emitting static HTML; not verified in this file.

Appends container via `screenEl?.appendChild`. If `screenEl` null, container never attached — but `wireRoundPicker(container)` still runs against detached node.

Calls `wireRoundPicker(container)`. Attaches two click listeners via `getElementById(...)?.addEventListener`. Back handler: void-wrapped async IIFE dynamic-imports `./arena-mod-queue-browse.ts` and calls `showModQueue()`. Dynamic import is cycle-breaking per LM-MODDEBATE-001. If the import rejects, the promise is abandoned — no catch. Create handler invokes `createModDebate()` wrapped in `void`.

If `getElementById` returns null, optional chain skips binding silently.

### createModDebate
Async, returns Promise<void>. Reads create button by id; if present, disables and sets text `'Creating…'`. If absent, continues with no disable — UI cannot indicate in-flight state, user could double-submit.

Reads five form values via id + cast to HTMLSelectElement/HTMLInputElement. Defaults: `mode` `'text'`, `category` `null`, `topic` (trimmed) `null`, `ranked` `false`, `ruleset` `'amplified'`. Casts unchecked; `||` defaults absorb most cases.

Try block: calls `safeRpc<{ debate_id, join_code }>('create_mod_debate', ...)` with params `p_mode`, `p_topic`, `p_category: category || null` (redundant), `p_ranked`, `p_ruleset`, `p_total_rounds: selectedRounds`. `safeRpc` applies 401 retry.

Destructures `{ data, error }`. If error truthy, throw. Casts `data` unchecked — if RPC returns null/malformed data with no error, the next line dereferences `null.debate_id` and throws TypeError, caught by catch. Uncertainty: `safeRpc` contract for null-data-with-no-error not inspected here.

Calls `set_modDebateId(result.debate_id)`, then `showModDebateWaitingMod(debate_id, join_code, topic || 'Open Debate', mode as DebateMode, ranked)`. `mode` cast to `DebateMode` without runtime validation — a tampered DOM supplying out-of-band value would slip through.

Catch: re-enables button if `btn` was non-null at entry and restores text `'⚔️ CREATE & GET CODE'`. Calls `showToast(friendlyError(err) || 'Could not create debate')`. No logging, no rethrow. No cleanup if user navigates away mid-RPC — success branch still runs against stale view. Uncertainty: `showModDebateWaitingMod` defensiveness not visible here.

Module state touched: `screenEl` (read), `selectedRounds` (read), `set_view` (write), `set_modDebateId` (write).

## Agent 05

### showModDebatePicker
Sets module state via `set_view('modDebatePicker')` and pushes history `{ arenaView: 'modDebatePicker' }`. If imported state `screenEl` truthy, blanks `innerHTML`; else skipped (the later `screenEl?.appendChild` would also no-op — DOM stays empty). Creates div class `arena-lobby arena-fade-in`, assigns template-literal innerHTML containing: hero header, back button `#mod-debate-picker-back`, mode select (text/live/voicememo), category select (blank + 6 options), topic input (maxlength 200), ranked checkbox, ruleset select (amplified/unplugged), inline CSS from `roundPickerCSS()`, HTML from `roundPickerHTML()`, primary create button `#mod-debate-create-btn`. Template interpolates `roundPickerCSS()`/`roundPickerHTML()` results directly into innerHTML — trust boundary for those sources. Appends to `screenEl` if present; calls `wireRoundPicker(container)`.

Attaches two click listeners via `getElementById` + `?.addEventListener`. Back: void-wrapped async IIFE dynamic-imports `./arena-mod-queue-browse.ts` and calls `showModQueue()` — LM-MODDEBATE-001 cycle break. Create: void-calls `createModDebate()`. Missing elements → optional chaining silently swallows wiring. No try/catch. Sync at outer level, schedules async inside back handler. Module side effects: mutated `screenEl` contents, history stack growth, updated arena-state view.

### createModDebate
Async, Promise<void>. Reads create button; if exists, `disabled=true` and `textContent='Creating…'` (optimistic lock); if missing, both skipped, RPC still runs.

Reads five form values via `getElementById` casts with `||` fallbacks: `mode` default `'text'`, `category` empty→`null`, `topic` trimmed empty→`null`, `ranked` default `false` (note `|| false` on boolean `.checked` collapses only the `undefined` case from the optional chain), `ruleset` default `'amplified'`.

Try: await `safeRpc<{ debate_id; join_code }>('create_mod_debate', { p_mode, p_topic, p_category: category || null, p_ranked, p_ruleset, p_total_rounds: selectedRounds })` — redundant `|| null` fallback; `p_total_rounds` from imported module-state `selectedRounds` (uncertainty: default value depends on that module's initial state — not verified here).

Destructures `{ data, error }`. If error truthy, throw. Casts data to `{ debate_id, join_code }` (runtime does no validation — a null/different-shape response would yield undefined property reads and propagate silently to `showModDebateWaitingMod`). Calls `set_modDebateId(result.debate_id)`, then `showModDebateWaitingMod(result.debate_id, result.join_code, topic || 'Open Debate', mode as DebateMode, ranked)` — topic fallback `'Open Debate'` applies when null/empty; `mode as DebateMode` cast unchecked.

Catch: if button still exists, re-enable and reset text `'⚔️ CREATE & GET CODE'` (ampersand raw here, `&amp;` in template — `textContent` treats as literal `&`). Calls `showToast(friendlyError(err) || 'Could not create debate')`. No rethrow — promise resolves. Happy path does not restore button state; navigation replaces DOM. Uncertainty: if `showModDebateWaitingMod` throws synchronously inside the try it would be caught and misreport as "Could not create debate" while the debate row already exists server-side.
