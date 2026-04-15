# Stage 2 Outputs — arena-entrance.ts

## Agent 01

### _injectCSS

`_injectCSS` reads the module-level boolean `_cssInjected`, which is initialized to `false`. If `_cssInjected` is already `true`, the function returns immediately without doing anything. Otherwise it sets `_cssInjected` to `true`, creates a `<style>` element via `document.createElement('style')`, assigns a multi-kilobyte string of CSS rules to `s.textContent`, and appends that element to `document.head` via `document.head.appendChild(s)`. The function returns `void`. It takes no parameters and accesses no external state beyond the DOM and the module-level flag. There is no error path and no async behavior. Subsequent calls within the same module lifetime are no-ops because the flag prevents re-entry.

### _getTier

`_getTier` takes three numeric parameters: `wins`, `losses`, and `debatesCompleted`. It returns the literal union type `1 | 2 | 3`. The function reads no module-level or external state. Control flow proceeds through three sequential branches. First, if `debatesCompleted` is less than 5, it returns `1` immediately. Second, it computes `total = wins + losses` and if `total` is zero returns `1`. Third, it computes `winRate = wins / total` and returns `3` if `winRate` is greater than `0.50`, returns `2` if `winRate` is greater than `0.25`, or returns `1` otherwise. There is no async behavior, no loop, and no error path.

### playEntranceSequence

`playEntranceSequence` is a synchronous-looking exported function that takes a `CurrentDebate` object and returns a `Promise<void>`. Its entire body is wrapped in `new Promise(resolve => { ... })`.

Inside the executor, it first calls `_injectCSS()`. It then calls `getCurrentProfile()` — an import from `../auth.ts` — and stores the result in `profile`. From `profile` it reads `wins`, `losses`, `debates_completed` (falling back to `0` for each if the profile is `null` or the property is absent), and passes those three values to `_getTier` to obtain `tier` (1, 2, or 3). It also reads `profile.display_name`, `profile.username`, `profile.elo_rating` from the profile, and reads `debate.opponentName`, `debate.opponentElo`, `debate.mode`, `debate.ranked`, and `debate.topic` from the `debate` parameter. Several of these have fallback defaults: `myName` falls back to `'You'`, `myElo` to `1200`, `oppName` to `'Opponent'`, `oppElo` to `1200`. The first character of `myName` and `oppName` is uppercased to produce `myInitial` and `oppInitial`; if either name is empty, `'?'` is used.

A `<div>` element with class `ent-stage` and id `ent-stage` is created. Based on `tier`, exactly one of three tier renderers is called: `_renderTier1` for tier 1, `_renderTier2` for tier 2, or `_renderTier3` for tier 3. Each renderer receives the `stage` element and the resolved display values; tier 2 and 3 also receive `topic`; tier 3 additionally receives `wins` and `losses`. After the renderer returns, `stage` is appended to `document.body`.

Sound is played in a `try/catch` block that silently swallows any thrown value. For tier 3, `playSound('roundStart')` is called immediately, and then a `setTimeout` fires a second `playSound('roundStart')` call 600 ms later (fire-and-forget). For tiers 1 and 2, `playSound('roundStart')` is called once.

A `setTimeout` is scheduled at `DURATION = 2450` ms. When it fires, `stage.style.transition` is set to `'opacity 0.15s'` and `stage.style.opacity` is set to `'0'`. A nested `setTimeout` at 160 ms then calls `stage.remove()` and calls `resolve()`, which settles the returned promise. There is no rejection path; if `playSound` throws, the catch block suppresses the error and execution continues.

### _esc

`_esc` takes a single parameter `s` typed as `string`. It calls `String(s)` to coerce the value, then chains four `.replace()` calls in order: `&` to `&amp;`, `<` to `&lt;`, `>` to `&gt;`, and `"` to `&quot;`. It returns the resulting string. It reads no external state, writes no state, and has no branches, loops, or async behavior. It is a pure function.

### _renderTier1

`_renderTier1` takes nine parameters: `stage` (the target `HTMLElement`), `myI` and `myName` (local user initial and display name), `myElo` (number), `oppI` and `oppName` (opponent initial and display name), `oppElo` (number), `isAI` (boolean), and `isRanked` (boolean). It writes the complete inner HTML of `stage` by assigning a template literal to `stage.innerHTML`. All user-supplied string values — `myI`, `myName`, `oppI`, `oppName` — are passed through `_esc` before interpolation. `myElo` and `oppElo` are interpolated as numbers directly into the template. If `isRanked` is truthy, a `<div class="ent-ranked-badge">` element is prepended to the markup; otherwise that portion of the template is an empty string. If `isAI` is truthy, the opponent avatar contains the literal string `'🤖'` (bypassing `_esc`) and the ELO slot displays `'AI'` instead of the numeric ELO. The function returns `void`, has no async behavior, no loops, and no error path.

### _renderTier2

`_renderTier2` takes ten parameters: `stage`, `myI`, `myName`, `myElo`, `oppI`, `oppName`, `oppElo`, `isAI`, `topic`, and `isRanked`. It overwrites `stage.innerHTML` with a tier-2-specific template. All user string values — `myI`, `myName`, `oppI`, `oppName`, `topic` — are passed through `_esc`. Numeric ELO values are interpolated directly. If `isAI` is truthy, the opponent avatar renders `'🤖'` and the ELO slot renders `'AI'` rather than the numeric value. If `isRanked` is truthy, an `ent-ranked-badge` div with inline style `top:auto;bottom:8%` is appended at the end of the template; otherwise it is an empty string. The `topic` value is always rendered into an `.ent-t2-topic` div regardless of whether it is empty. The function returns `void`, is synchronous, and has no error path.

### _renderTier3

`_renderTier3` takes twelve parameters: `stage`, `myI`, `myName`, `myElo`, `wins`, `losses`, `oppI`, `oppName`, `oppElo`, `isAI`, `topic`, and `isRanked`. It overwrites `stage.innerHTML` with the tier-3 template, which is the most structurally complex of the three renderers. All user-supplied string values — `myI`, `myName`, `oppI`, `oppName`, `topic` — are passed through `_esc`. The `wins` and `losses` numbers are interpolated directly into a `.ent-t3-record` div for the local user's side (rendered as `${wins}W – ${losses}L`). The opponent side's `.ent-t3-record` always renders a non-breaking space `&nbsp;` regardless of whether opponent stats are available. The `.ent-t3-title` text is conditionally `'⚔️ RANKED BATTLE'` when `isRanked` is truthy or `'ENTER THE ARENA'` when falsy — this is the only tier renderer that varies the title text rather than toggling a separate badge element. If `isAI` is truthy, the opponent avatar renders `'🤖'` and the ELO slot renders `'AI SPARRING'` instead of the numeric ELO. The function returns `void`, is synchronous, and has no error path.

## Agent 02

### _injectCSS

`_injectCSS` reads the module-level boolean `_cssInjected`, which is initialized to `false`. If `_cssInjected` is already `true`, the function returns immediately without doing anything. Otherwise, it sets `_cssInjected` to `true`, creates a `<style>` element via `document.createElement('style')`, assigns a multi-kilobyte string literal of CSS rules to `s.textContent`, and appends that element to `document.head`. The CSS defines all animation keyframes and layout classes for the three tier variants (`ent-t1-*`, `ent-t2-*`, `ent-t3-*`), the shared `ent-stage` backdrop, and the `ent-ranked-badge`. The function takes no parameters, returns `void`, is synchronous, and has no error handling. After the first call, `_cssInjected` remains `true` for the lifetime of the page, so subsequent calls are no-ops.

### _getTier

`_getTier` takes three numeric parameters: `wins`, `losses`, and `debatesCompleted`. It contains no reads from external state and writes nothing. It returns one of the literal values `1`, `2`, or `3`. The control flow is a sequence of early returns: if `debatesCompleted` is less than 5, it returns `1` immediately. Otherwise it computes `total = wins + losses`; if `total` is `0` it returns `1`. If `total` is nonzero, it computes `winRate = wins / total` and returns `3` if `winRate > 0.50`, `2` if `winRate > 0.25`, or `1` otherwise. The function is synchronous and has no error paths or loops.

### playEntranceSequence

`playEntranceSequence` is a synchronous function that returns a `Promise<void>`. It takes a single `debate` parameter of type `CurrentDebate`. The body is entirely contained within the `Promise` constructor callback, so it executes synchronously at call time with the resolution deferred.

It first calls `_injectCSS()` to inject styles if not yet injected. It then calls `getCurrentProfile()` — an import from `auth.ts` — and reads the returned profile object to extract `wins`, `losses`, `debates_completed`, `display_name`, `username`, and `elo_rating`, falling back to defaults (`0` for numeric fields, `'You'` for name, `1200` for ELO) when those fields are absent or the profile is null. It calls `_getTier(wins, losses, completed)` to obtain a tier value of `1`, `2`, or `3`. It then reads `debate.opponentName`, `debate.opponentElo`, `debate.mode`, `debate.ranked`, and `debate.topic` from the parameter, applying defaults for absent fields.

A `<div>` with `className = 'ent-stage'` and `id = 'ent-stage'` is created via `document.createElement`. Depending on the tier value, exactly one of `_renderTier1`, `_renderTier2`, or `_renderTier3` is called, each receiving the `stage` element and the extracted display data; tier 3 additionally receives `wins` and `losses`. The populated `stage` element is then appended to `document.body`.

Sound playback follows inside a `try/catch` block that silently swallows any thrown exception. If tier is `3`, `playSound('roundStart')` is called once immediately, then a `setTimeout` fires `playSound('roundStart')` again after 600 ms (fire-and-forget). For tiers 1 and 2, `playSound('roundStart')` is called once.

Two nested `setTimeout` calls schedule removal of the stage. After `2450` ms, the outer callback sets `stage.style.transition` to `'opacity 0.15s'` and `stage.style.opacity` to `'0'`. After a further `160` ms, the inner callback calls `stage.remove()` and then calls `resolve()`, fulfilling the returned promise. No `await` expressions are used; the async work is entirely timer-based.

### _esc

`_esc` takes a single parameter `s` of type `string`. It first converts `s` to a string via `String(s)`, then applies four sequential `replace` calls using literal patterns: `&` to `&amp;`, `<` to `&lt;`, `>` to `&gt;`, and `"` to `&quot;`. It returns the resulting escaped string. It reads no external state, writes nothing, and has no branches, loops, or error paths. It is synchronous.

### _renderTier1

`_renderTier1` takes `stage` (an `HTMLElement`) plus seven display-value parameters: `myI`, `myName`, `myElo`, `oppI`, `oppName`, `oppElo`, `isAI`, and `isRanked`. It writes directly to `stage.innerHTML` by assigning a template literal string. It reads no module-level or external state beyond its parameters.

The generated HTML conditionally includes a `<div class="ent-ranked-badge">` element at the start only when `isRanked` is truthy; otherwise that slot produces an empty string. It calls `_esc` on `myI`, `myName`, `oppName`, and `oppI` before interpolating them into the HTML. `myElo` is interpolated directly as a number without `_esc`. For the opponent avatar and ELO display, there is a branch on `isAI`: if truthy, the avatar displays the literal string `'🤖'` (not escaped through `_esc`) and the ELO label is the string `'AI'`; otherwise `_esc(oppI)` and `${oppElo} ELO` are used. The function returns `void`, is synchronous, and has no error paths.

### _renderTier2

`_renderTier2` takes `stage` plus nine parameters: `myI`, `myName`, `myElo`, `oppI`, `oppName`, `oppElo`, `isAI`, `topic`, and `isRanked`. Like `_renderTier1`, it assigns a template literal to `stage.innerHTML` and returns `void`.

The generated markup wraps everything in `ent-t2-wrap-outer`. It calls `_esc` on `myI`, `myName`, `oppName`, `oppI`, and `topic`. `myElo` is interpolated directly. The opponent avatar and ELO branch on `isAI` identically to tier 1: `'🤖'` literal vs `_esc(oppI)`, and `'AI'` vs `${oppElo} ELO`. The topic is placed in a separate `<div class="ent-t2-topic">` element outside the outer wrapper. The ranked badge is conditionally appended last — when `isRanked` is truthy — with an inline style overriding its vertical position to `bottom: 8%` instead of the default `top: 14%` established by the CSS class. The function is synchronous with no error paths.

### _renderTier3

`_renderTier3` takes `stage` plus eleven parameters: `myI`, `myName`, `myElo`, `wins`, `losses`, `oppI`, `oppName`, `oppElo`, `isAI`, `topic`, and `isRanked`. It assigns a template literal to `stage.innerHTML` and returns `void`. It reads no external state beyond its parameters.

The generated markup places all content inside a single `ent-t3-wrap` div. Compared to tiers 1 and 2, this tier adds a radial-gradient background element (`ent-t3-bg`), a scanline element (`ent-t3-scanline`), and a title bar (`ent-t3-title`). The title bar content branches on `isRanked`: truthy produces `'⚔️ RANKED BATTLE'`, falsy produces `'ENTER THE ARENA'`. The player side (`ent-t3-left`) includes an additional `ent-t3-record` div displaying `wins` and `losses` as `${wins}W – ${losses}L`, interpolated directly without `_esc`. The opponent side (`ent-t3-right`) includes a corresponding `ent-t3-record` div containing a non-breaking space (`&nbsp;`). The opponent avatar and ELO branch on `isAI`: `'🤖'` literal vs `_esc(oppI)`, and `'AI SPARRING'` vs `${oppElo} ELO`. The center section renders two `ent-t3-divider` elements flanking the `ent-t3-vs-text` element — structurally different from tiers 1 and 2, which use a single center element. The topic is placed in `ent-t3-topic` inside the wrapper. There is no separate ranked badge element in this tier; the ranked/non-ranked distinction is expressed only through the title bar text. The function is synchronous with no error paths.

## Agent 03

### _injectCSS

`_injectCSS` reads the module-level boolean `_cssInjected`, which is initialized to `false`. If `_cssInjected` is already `true`, the function returns immediately without doing anything else. On the first call, it sets `_cssInjected` to `true`, then creates a `<style>` element via `document.createElement('style')`, assigns a multi-kilobyte string of CSS to `s.textContent`, and appends the element to `document.head`. The CSS string defines all classes used by the three tier renderers: `.ent-stage`, `.ent-t1-*`, `.ent-t2-*`, `.ent-t3-*`, `.ent-ranked-badge`, and their associated `@keyframes` animations. The function is synchronous and returns `void`. It writes to no module-level state other than `_cssInjected` and to no external storage; its only side effect beyond setting `_cssInjected` is the DOM mutation of appending the style node.

### _getTier

`_getTier` takes three numeric parameters: `wins`, `losses`, and `debatesCompleted`. It reads no module-level state and makes no external calls. The control flow is a series of early-return branches. If `debatesCompleted` is less than 5, it returns `1` immediately. Otherwise it computes `total = wins + losses`; if `total` is zero it returns `1`. It then computes `winRate = wins / total`. If `winRate` is greater than `0.50` it returns `3`; if greater than `0.25` it returns `2`; otherwise it returns `1`. The return type is the union literal `1 | 2 | 3`. The function is synchronous and has no side effects.

### playEntranceSequence

`playEntranceSequence` is a synchronous function that returns a `Promise<void>`. The promise is constructed inline with a `new Promise(resolve => {...})` callback; the callback itself is not async. On entry, it calls `_injectCSS()`, which injects CSS into the document head the first time. It then calls `getCurrentProfile()` — an import from `auth.ts` — which returns either a profile object or `null`/`undefined`; the return value is stored in `profile`. From `profile`, it reads `wins`, `losses`, `debates_completed`, `display_name`, `username`, and `elo_rating`, using nullish coalescing to default `wins` and `losses` to `0`, `debates_completed` to `0`, and `elo_rating` to `1200`. It then calls `_getTier(wins, losses, completed)` and stores the result in `tier`. From the `debate` parameter (typed `CurrentDebate`), it reads `opponentName`, `opponentElo`, `mode`, `ranked`, and `topic`. It creates a `<div>` element with `className = 'ent-stage'` and `id = 'ent-stage'`.

The function then branches on `tier`: for `1` it calls `_renderTier1`, for `2` it calls `_renderTier2`, and for the `else` branch (tier 3) it calls `_renderTier3`, passing the assembled values as arguments. After rendering, it appends the stage element to `document.body`. It then enters a `try/catch` block where the catch silently swallows any error. Inside the try: if `tier === 3`, it calls `playSound('roundStart')` immediately, then schedules a second `playSound('roundStart')` call via `setTimeout` with a 600ms delay (fire-and-forget); otherwise it calls `playSound('roundStart')` once. After the try/catch, a `setTimeout` fires at 2450ms. At that point, it sets `stage.style.transition` to `'opacity 0.15s'` and `stage.style.opacity` to `'0'`. A second nested `setTimeout` fires 160ms later, calls `stage.remove()` to detach the element from the DOM, and calls `resolve()` to settle the promise. No awaited calls are present; the function is not declared `async`.

### _esc

`_esc` takes a single parameter `s` of type `string`. It coerces `s` to a string via `String(s)`, then chains four `.replace()` calls in sequence: `&` to `&amp;`, `<` to `&lt;`, `>` to `&gt;`, and `"` to `&quot;`. It returns the resulting escaped string. The function reads no external state and writes nothing. It is synchronous and has no side effects.

### _renderTier1

`_renderTier1` takes `stage` (an `HTMLElement`), the current user's initial `myI`, display name `myName`, and ELO `myElo`, the opponent's initial `oppI`, display name `oppName`, and ELO `oppElo`, a boolean `isAI`, and a boolean `isRanked`. It writes to `stage.innerHTML` by assigning a single template literal string. No other state is read or written. The HTML produced is: conditionally a ranked badge div (if `isRanked` is truthy), then a wrapper div with class `ent-t1-wrap` containing a "MATCH FOUND" badge, a flex row with two debater columns and a sword emoji between them. Each debater column contains an avatar div, a name div, and an ELO div. For the current user's avatar, it emits `_esc(myI)`; for the opponent, it emits the robot emoji `🤖` literally if `isAI` is true, otherwise `_esc(oppI)`. The opponent ELO cell emits the string `'AI'` if `isAI` is true, otherwise the numeric `oppElo` followed by ` ELO`. All user-supplied string values (`myI`, `myName`, `oppI`, `oppName`) are passed through `_esc` before interpolation. Numeric values `myElo` and `oppElo` are interpolated directly without casting. The function is synchronous and returns `void`.

### _renderTier2

`_renderTier2` takes `stage`, `myI`, `myName`, `myElo`, `oppI`, `oppName`, `oppElo`, `isAI`, `topic`, and `isRanked`. It assigns one template literal to `stage.innerHTML`. The rendered HTML contains an outer wrapper div (`ent-t2-wrap-outer`) holding: a left panel (`ent-t2-left`) with the current user's avatar, name, and ELO; a center element (`ent-t2-center`) containing a "VS" text node; a right panel (`ent-t2-right`) with the opponent's avatar, name, and ELO; and a clash emoji div (`ent-t2-clash`). Outside the wrapper, a topic div (`ent-t2-topic`) is appended, and conditionally a ranked badge div with inline style overriding its bottom position (if `isRanked` is truthy). The opponent avatar emits `🤖` literally if `isAI`, otherwise `_esc(oppI)`. The opponent ELO emits `'AI'` if `isAI`, otherwise `oppElo` followed by ` ELO`. All string user values are passed through `_esc`; `topic` is also passed through `_esc`. Numeric values `myElo` and `oppElo` are interpolated directly. The function is synchronous, writes only to `stage.innerHTML`, and returns `void`.

### _renderTier3

`_renderTier3` takes `stage`, `myI`, `myName`, `myElo`, `wins`, `losses`, `oppI`, `oppName`, `oppElo`, `isAI`, `topic`, and `isRanked`. It assigns one template literal to `stage.innerHTML`. The rendered HTML is a full-viewport wrapper (`ent-t3-wrap`) containing: a radial gradient background div (`ent-t3-bg`), a scanline animation div (`ent-t3-scanline`), a title div (`ent-t3-title`) whose text is either `'⚔️ RANKED BATTLE'` or `'ENTER THE ARENA'` depending on `isRanked`, a left panel (`ent-t3-left`) with the current user's avatar, name, ELO, and a win-loss record in the form `${wins}W – ${losses}L`, a center column (`ent-t3-center`) with two divider elements flanking the "VS" text, a right panel (`ent-t3-right`) with the opponent's avatar, name, ELO (`'AI SPARRING'` if `isAI`, otherwise `oppElo` followed by ` ELO`), and a non-breaking space in the record slot, and finally a topic div (`ent-t3-topic`). All string user values (`myI`, `myName`, `oppI`, `oppName`, `topic`) are passed through `_esc`. The `wins` and `losses` numerics and `myElo`/`oppElo` are interpolated directly without casting. The function is synchronous, writes only to `stage.innerHTML`, and returns `void`.

## Agent 04

### _injectCSS

`_injectCSS` reads the module-level boolean `_cssInjected`, which is initialized to `false`. If `_cssInjected` is already `true`, the function returns immediately without doing anything. Otherwise, it sets `_cssInjected` to `true`, creates a `<style>` element via `document.createElement('style')`, assigns a multi-kilobyte CSS string to that element's `textContent`, and appends the element to `document.head`. The CSS string is a literal—no external reads, no parameters. The function writes only to `_cssInjected` and to the DOM. It is synchronous, takes no parameters, and has no error path.

### _getTier

`_getTier` takes three numeric parameters: `wins`, `losses`, and `debatesCompleted`. It reads no module-level state and makes no external calls. The control flow proceeds through three successive conditions. If `debatesCompleted` is less than 5, it returns `1` immediately. Otherwise, it computes `total` as `wins + losses`; if `total` is 0, it returns `1`. Otherwise it computes `winRate` as `wins / total`. If `winRate` is greater than 0.50, it returns `3`; if greater than 0.25, it returns `2`; otherwise it returns `1`. The return type is the literal union `1 | 2 | 3`. The function is synchronous and has no error path.

### playEntranceSequence

`playEntranceSequence` is a synchronous-looking export that returns a `Promise<void>`. The executor runs synchronously. It begins by calling `_injectCSS`, which injects the stylesheet into the DOM on first call. It then calls `getCurrentProfile()` from `src/auth.ts` and reads six fields from the returned profile object (`wins`, `losses`, `debates_completed`, `display_name`, `username`, `elo_rating`), falling back to defaults of `0` or `1200` via nullish coalescing when the profile is absent or a field is missing. It derives `myName` from `display_name` then `username` then the literal `'You'`, `myInitial` as the first character of `myName` uppercased, and `oppName`/`oppInitial`/`oppElo` from corresponding fields on the `debate` parameter. It also reads `debate.mode`, `debate.ranked`, and `debate.topic`.

It calls `_getTier(wins, losses, completed)` to get a tier value of `1`, `2`, or `3`. It then creates a `<div>` element with `className = 'ent-stage'` and `id = 'ent-stage'`. Based on the tier, it calls exactly one of `_renderTier1`, `_renderTier2`, or `_renderTier3`, passing the stage element and the derived display values. Tier 1 receives no `topic` and no `wins`/`losses`; tier 2 receives `topic` but not `wins`/`losses`; tier 3 receives all of them. After the render call, the stage element is appended to `document.body`.

A `try/catch` block then calls `playSound('roundStart')` from `arena-sounds.ts`. For tier 3, a second `playSound('roundStart')` is scheduled via `setTimeout` with a 600ms delay, fire-and-forget. For tiers 1 and 2, only the single immediate call is made. If `playSound` throws, the catch block silently discards the error.

Two nested `setTimeout` calls drive the teardown. The outer fires after 2450ms and sets `stage.style.transition` to `'opacity 0.15s'` and `stage.style.opacity` to `'0'`. The inner fires 160ms after that, calls `stage.remove()` to detach the element from the DOM, and calls `resolve()` to settle the promise. The promise never rejects—there is no error path that calls `reject`. The function itself does not `await` anything; all async behavior is timer-based.

### _esc

`_esc` takes a single parameter `s` of type `string`. It casts `s` through `String(s)` (a no-op for a typed string parameter, but prevents runtime errors if called with a non-string at runtime) and then chains four sequential `replace` calls, each replacing one HTML special character with its entity equivalent: `&` becomes `&amp;`, `<` becomes `&lt;`, `>` becomes `&gt;`, and `"` becomes `&quot;`. The function reads no external state and writes nothing. It returns the escaped string. It is synchronous.

### _renderTier1

`_renderTier1` takes a `stage` element and eight values describing the two debaters: `myI`, `myName`, `myElo`, `oppI`, `oppName`, `oppElo`, `isAI`, and `isRanked`. It writes to `stage.innerHTML` with a single template literal assignment. The markup conditionally prepends a `<div class="ent-ranked-badge">` element when `isRanked` is truthy. It then renders a centered layout with a "MATCH FOUND" label, two debater columns separated by a sword icon, each containing an avatar circle, a name, and an ELO line. For the opponent avatar, if `isAI` is true, the literal robot emoji `🤖` is used instead of calling `_esc(oppI)`; the opponent ELO line renders the literal `'AI'` string instead of the numeric value. All user-derived string values (`myI`, `myName`, `oppI`, `oppName`) pass through `_esc`. The numeric `myElo` is interpolated directly without `_esc`. The function is synchronous, returns nothing, and makes no external calls.

### _renderTier2

`_renderTier2` takes a `stage` element and ten values: the same debater data as `_renderTier1` plus `topic`, with `isRanked` repositioned at the end. It assigns a template literal to `stage.innerHTML`. The outer wrapper is a `<div class="ent-t2-wrap-outer">` containing absolutely positioned left and right debater panels and a centered "VS" element. The left panel always shows `_esc(myI)`, `_esc(myName)`, and `myElo`. The right panel conditionally renders the robot emoji for the avatar if `isAI`, otherwise `_esc(oppI)`; the ELO line renders `'AI'` if `isAI`, otherwise the numeric `oppElo`. A `<div class="ent-t2-clash">` with a sword emoji is placed inside the outer wrapper for its CSS animation. Outside the outer wrapper, a `<div class="ent-t2-topic">` renders `_esc(topic)`. If `isRanked` is truthy, a `<div class="ent-ranked-badge">` with an inline bottom-position style override is appended. The function is synchronous and returns nothing.

### _renderTier3

`_renderTier3` takes a `stage` element and twelve values: the debater data from `_renderTier2` plus `wins` and `losses` inserted between `myElo` and `oppI`. It assigns a template literal to `stage.innerHTML`. The outermost wrapper is `<div class="ent-t3-wrap">`, which contains a radial gradient background `<div class="ent-t3-bg">`, a scanline `<div class="ent-t3-scanline">`, and a title element that reads `'⚔️ RANKED BATTLE'` when `isRanked` is truthy or `'ENTER THE ARENA'` otherwise. The left panel renders `_esc(myI)`, `_esc(myName)`, `myElo`, and a win-loss record as `${wins}W – ${losses}L`. The center column renders two `<div class="ent-t3-divider">` elements flanking a `<div class="ent-t3-vs-text">VS</div>`. The right panel conditionally uses the robot emoji for the avatar if `isAI`, and renders either `'AI SPARRING'` or the numeric `oppElo` in the ELO slot; the record slot for the opponent is a non-breaking space (`&nbsp;`). A `<div class="ent-t3-topic">` at the bottom renders `_esc(topic)`. There is no `isRanked` badge appended separately—the ranked vs. standard label is folded into the title element. The function is synchronous and returns nothing.

## Agent 05

### _injectCSS

`_injectCSS` reads the module-level boolean `_cssInjected`, which is initialized to `false`. If `_cssInjected` is already `true`, the function returns immediately without doing anything. Otherwise it sets `_cssInjected` to `true`, creates a `<style>` element via `document.createElement('style')`, assigns a multi-line string of CSS rules to `s.textContent`, and then appends the element to `document.head`. The CSS it injects defines all animation keyframes and class selectors used by the three tier renderers: `.ent-stage`, all `.ent-t1-*`, `.ent-t2-*`, `.ent-t3-*`, and `.ent-ranked-badge` rules. It reads no parameters. It writes to `_cssInjected` and mutates `document.head`. It is synchronous, has no error path, and returns `void`.

### _getTier

`_getTier` accepts three numeric parameters: `wins`, `losses`, and `debatesCompleted`. It returns one of the literal values `1`, `2`, or `3`. The first branch checks whether `debatesCompleted` is less than 5; if so, it returns `1` immediately without examining wins or losses. Otherwise it computes `total = wins + losses` and returns `1` if `total === 0`. If `total` is nonzero it divides `wins` by `total` to get `winRate` and returns `3` if `winRate > 0.50`, `2` if `winRate > 0.25`, and `1` otherwise. It reads no external state, has no async behavior, and writes nothing outside its return value.

### playEntranceSequence

`playEntranceSequence` accepts a `CurrentDebate` object and returns a `Promise<void>`. The entire body runs inside the `Promise` constructor callback, which is synchronous up to the `setTimeout` calls.

It first calls `_injectCSS`, then calls `getCurrentProfile()` from `src/auth.ts` and reads `wins`, `losses`, `debates_completed`, `display_name`, `username`, and `elo_rating` from the returned profile object, applying nullish-coalescing defaults (`0` for numeric fields, `'You'` for the display name, `1200` for ELO). It reads `opponentName`, `opponentElo`, `mode`, `ranked`, and `topic` from the `debate` parameter, defaulting `opponentName` to `'Opponent'` and `oppElo` to `1200`. It derives `myInitial` and `oppInitial` by taking the uppercased first character of each name, defaulting to `'?'` if the string is empty. It computes `isAI` by comparing `debate.mode` to the string `'ai'`.

It calls `_getTier(wins, losses, completed)` to get a tier value of `1`, `2`, or `3`, then creates a `<div>` element with class `ent-stage` and id `ent-stage`. Depending on the tier value it calls exactly one of `_renderTier1`, `_renderTier2`, or `_renderTier3`, passing the stage element together with the derived name, initial, ELO, AI, ranked, and topic values. `_renderTier3` additionally receives `wins` and `losses`. It then appends the stage to `document.body`.

Inside a `try/catch` block that silently swallows any exception, it calls `playSound('roundStart')` from `arena-sounds.ts`. If `tier === 3`, it also schedules a second call to `playSound('roundStart')` via `setTimeout(..., 600)` as a fire-and-forget; this second call is not awaited. The catch block is empty.

A first `setTimeout` fires after 2450 ms. Its callback sets `stage.style.transition` to `'opacity 0.15s'` and `stage.style.opacity` to `'0'`. A second nested `setTimeout` fires 160 ms after that; it calls `stage.remove()` to detach the element from the DOM and then calls `resolve()` to settle the outer promise. There is no rejection path. The function is not declared `async` but returns a `Promise<void>`.

### _esc

`_esc` accepts a single parameter `s` of type `string`. It coerces `s` to a string via `String(s)` and then applies four sequential `.replace()` calls using literal string patterns (not regexes): `&` to `&amp;`, `<` to `&lt;`, `>` to `&gt;`, and `"` to `&quot;`. It returns the final escaped string. It reads and writes nothing outside its parameters and return value, has no branches, and is synchronous. The OWASP mapping used here covers four of the five standard HTML-escaping substitutions; `'` is not replaced.

### _renderTier1

`_renderTier1` accepts a stage `HTMLElement` and eight additional parameters: `myI`, `myName`, `myElo`, `oppI`, `oppName`, `oppElo` (a number), `isAI` (boolean), and `isRanked` (boolean). It assigns a template literal directly to `stage.innerHTML`, completely replacing any existing content. The template conditionally prepends a `<div class="ent-ranked-badge">` element when `isRanked` is truthy. It then renders a single `.ent-t1-wrap` block containing a "MATCH FOUND" label, and a `.ent-t1-vs` row with two `.ent-t1-debater` columns and a sword emoji between them. The left debater shows `_esc(myI)` as the avatar initial, `_esc(myName)`, and `myElo` as a bare number interpolated into a template literal. The right debater shows `'🤖'` as the avatar content when `isAI` is true, otherwise `_esc(oppI)`; the ELO line shows the string `'AI'` when `isAI` is true, otherwise `${oppElo} ELO`. It calls `_esc` four times total (on `myI`, `myName`, `oppI`, and `oppName`). It returns `void` and is synchronous. There is no error path or conditional beyond the two `isAI` and `isRanked` ternaries.

### _renderTier2

`_renderTier2` accepts a stage `HTMLElement` and nine parameters: `myI`, `myName`, `myElo`, `oppI`, `oppName`, `oppElo`, `isAI`, `topic`, and `isRanked`. It assigns a template literal to `stage.innerHTML`. The outer structure is a `.ent-t2-wrap-outer` block containing an `.ent-t2-left` panel (my avatar initial via `_esc(myI)`, `_esc(myName)`, `myElo`), a `.ent-t2-center` block with a static "VS" text, an `.ent-t2-right` panel (opponent avatar as `'🤖'` or `_esc(oppI)`, `_esc(oppName)`, ELO line as `'AI'` or `${oppElo} ELO`), and a `.ent-t2-clash` sword emoji. Outside `.ent-t2-wrap-outer` it renders a `.ent-t2-topic` element containing `_esc(topic)`, and conditionally a `.ent-ranked-badge` with inline `style="top:auto;bottom:8%;"` when `isRanked` is truthy. It calls `_esc` five times: on `myI`, `myName`, `oppI`, `oppName`, and `topic`. It returns `void` and is synchronous. Unlike `_renderTier1`, this tier includes the debate topic text.

### _renderTier3

`_renderTier3` accepts a stage `HTMLElement` and eleven parameters: `myI`, `myName`, `myElo`, `wins`, `losses`, `oppI`, `oppName`, `oppElo`, `isAI`, `topic`, and `isRanked`. It assigns a template literal to `stage.innerHTML`, producing the most complex of the three layouts. The root element is a `.ent-t3-wrap` which contains: a `.ent-t3-bg` radial-gradient overlay, a `.ent-t3-scanline` sweep element, a `.ent-t3-title` that reads either `'⚔️ RANKED BATTLE'` or `'ENTER THE ARENA'` depending on `isRanked`, a `.ent-t3-left` panel with `_esc(myI)`, `_esc(myName)`, `myElo`, and a win-loss record rendered as the bare numbers `${wins}W – ${losses}L` without escaping (these are numeric values passed as `number` type, not user strings), a `.ent-t3-center` block containing two `.ent-t3-divider` lines flanking the "VS" text, a `.ent-t3-right` panel with the opponent's avatar (`'🤖'` or `_esc(oppI)`), `_esc(oppName)`, the ELO line (`'AI SPARRING'` or `${oppElo} ELO`), and an `&nbsp;` record placeholder, and a `.ent-t3-topic` element containing `_esc(topic)`. The `isRanked` badge from Tier 1 and Tier 2 is absent here — `isRanked` affects only the `.ent-t3-title` text. It calls `_esc` five times: on `myI`, `myName`, `oppI`, `oppName`, and `topic`. It returns `void` and is synchronous.
