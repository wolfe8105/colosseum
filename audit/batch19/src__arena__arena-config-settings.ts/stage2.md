# Stage 2 Outputs — arena-config-settings.ts

## Agent 01

Module state referenced: `selectedRanked` imported but unused; setters `set_selectedRanked`/`set_selectedRuleset` write to arena-state module. DOM: overlays keyed by `arena-rank-overlay`/`arena-ruleset-overlay`. Browser `history` stack written via `pushArenaState`.

### showRankedPicker
Reads `getCurrentUser()` and `isPlaceholder()`. If both falsy, writes `window.location.href = 'moderator-plinko.html'` and early-returns. Otherwise creates a div, sets `className='arena-rank-overlay'`, `id='arena-rank-overlay'`, assigns a template-literal innerHTML (static markup). Appends overlay to document.body. Calls `pushArenaState('rankedPicker')`. Iterates `overlay.querySelectorAll('.arena-rank-card')` attaching async click listener per card: reads `cardEl.dataset.ranked`, compares to `'true'` for `isRanked`. If `isRanked && !isPlaceholder()`, try: awaits `safeRpc<RankedCheckResult>('check_ranked_eligible')`; if `error` throws it; casts `data` to RankedCheckResult; if `!result.eligible`, calls `closeRankedPicker()` (no forward), opens synchronous `confirm()` quoting `result.profile_pct`; if user confirms, writes `window.location.href='moderator-profile-depth.html'`; returns from the click handler. Catch logs `'[Arena] Ranked check error:'` and falls through to the non-ranked path (uncertain whether intended — on error for a ranked card the user still advances). After the branch, writes `set_selectedRanked(isRanked)`, calls `closeRankedPicker(true)`, calls `showRulesetPicker()`. After forEach, attaches backdrop/cancel click listeners via optional-chain getElementById — each calls `closeRankedPicker()` with no flag. Only click listener is async; `showRankedPicker` itself sync and returns void.

### closeRankedPicker
Reads `getElementById('arena-rank-overlay')`. If null, no-op. Else `overlay.remove()`. Branch on `forward`: truthy → `history.replaceState({ arenaView: 'lobby' }, '')`; falsy → `history.back()`. Sync.

### showRulesetPicker
No auth gate (uncertain — may rely on showRankedPicker having gated). Creates div, `className='arena-rank-overlay'`, `id='arena-ruleset-overlay'`, assigns static innerHTML with AMPLIFIED/UNPLUGGED cards. Appends; calls `pushArenaState('rulesetPicker')`. Iterates cards, sync click: reads `cardEl.dataset.ruleset`, casts to `'amplified' | 'unplugged'` (no runtime validation), writes `set_selectedRuleset(...)`, calls `closeRulesetPicker(true)`, then `showModeSelect()`. Backdrop/cancel listeners via optional-chain getElementById call `closeRulesetPicker()` with no flag. No try/catch, no async. Returns void.

### closeRulesetPicker
Reads `getElementById('arena-ruleset-overlay')`. If null, no-op. Else `overlay.remove()`. Branch on `forward`: truthy → `history.replaceState({ arenaView: 'lobby' }, '')`; falsy → `history.back()`. Identical shape to closeRankedPicker, different overlay id. Sync.

Uncertainty: eligibility RPC failure path falls through to `set_selectedRanked(true)` and advances to ruleset picker even on error — graceful-degrade or bug. `selectedRanked` import unread. `isPlaceholder()` gates both guest redirect and ranked eligibility.

## Agent 02

`getCurrentProfile` imported but never referenced — uncertain whether intentional.

### showRankedPicker
Entry gate: reads `getCurrentUser()` and `isPlaceholder()`; when both falsy redirects `window.location.href` to `moderator-plinko.html` and returns. Otherwise builds detached `<div class="arena-rank-overlay" id="arena-rank-overlay">` containing backdrop, sheet, two `.arena-rank-card` (data-ranked `"false"`/`"true"`), cancel button, populated via innerHTML with hardcoded copy and unicode glyph escapes. Appends to document.body, calls `pushArenaState('rankedPicker')`.

Iterates the two cards via `querySelectorAll('.arena-rank-card').forEach`. Each gets an async click listener reading `dataset.ranked` as bool. If ranked AND `!isPlaceholder()`, awaits `safeRpc<RankedCheckResult>('check_ranked_eligible')`; on throw or truthy error, catch logs `'[Arena] Ranked check error:'` via console.warn and falls through to selection. On ineligible result, calls `closeRankedPicker()` (no-forward) then blocking `confirm(...)` with percentage; OK navigates to `moderator-profile-depth.html`, Cancel returns. If eligible/casual/placeholder, calls `set_selectedRanked(isRanked)` then `closeRankedPicker(true)` then `showRulesetPicker()`.

Backdrop/cancel each get click listeners calling `closeRankedPicker()` no-arg. Uncertainty: async RPC rejection flows past catch into `set_selectedRanked(true)` and advances — eligibility error fails-open to ranked mode.

### closeRankedPicker
Queries `getElementById('arena-rank-overlay')`. If absent, returns silently. If present, `overlay.remove()`. Branches on `forward`: truthy → `history.replaceState({ arenaView: 'lobby' }, '')` overwrites the just-pushed picker state with a lobby marker (used when caller is forward-navigating); falsy → `history.back()` pops the pushed picker state.

### showRulesetPicker
Creates `<div class="arena-rank-overlay" id="arena-ruleset-overlay">` — identical class but different id. Static innerHTML with two `.arena-rank-card` elements `data-ruleset="amplified"`/`"unplugged"`. Appends, calls `pushArenaState('rulesetPicker')`. No auth/eligibility (uncertain whether intentional since caller passed showRankedPicker). Wires each card with sync click reading `cardEl.dataset.ruleset`, casting to union, calling `set_selectedRuleset(...)`, `closeRulesetPicker(true)`, `showModeSelect()`. Backdrop/cancel call `closeRulesetPicker()` no-arg.

### closeRulesetPicker
Identical shape to closeRankedPicker on `id='arena-ruleset-overlay'`. Silent no-op on null; else remove + forward-branch.

## Agent 03

### showRankedPicker
Reads `getCurrentUser()` and `isPlaceholder()`; if no user and not placeholder, writes `window.location.href = 'moderator-plinko.html'` and returns. Otherwise creates div class `arena-rank-overlay` id `arena-rank-overlay`, template-literal innerHTML with backdrop/sheet/two cards (casual `data-ranked="false"`, ranked `data-ranked="true"`)/cancel button. Appends to body, `pushArenaState('rankedPicker')`. Iterates `querySelectorAll('.arena-rank-card')`; async click: `isRanked = dataset.ranked === 'true'`. If ranked && !placeholder, try awaits `safeRpc<RankedCheckResult>('check_ranked_eligible')`; throws on error; if `!result.eligible` closes overlay (no forward), `confirm(...)` with `result.profile_pct`, on OK writes location to profile-depth, returns. Catch logs warn and falls through (uncertain intent). After branch: `set_selectedRanked(isRanked)`, `closeRankedPicker(true)`, `showRulesetPicker()`. Backdrop/cancel click via optional-chain each call `closeRankedPicker()` no-arg. Outer function sync, async in handlers only.

### closeRankedPicker
Reads `getElementById('arena-rank-overlay')`. If found, `overlay.remove()`. Branch on `forward`: truthy replaceState, falsy `history.back()`. Null no-op.

### showRulesetPicker
Creates div class `arena-rank-overlay` id `arena-ruleset-overlay`. Template-literal innerHTML with two cards (`data-ruleset="amplified"`/`"unplugged"`), cancel button. Appends, pushArenaState. Iterates cards with sync click: reads `cardEl.dataset.ruleset`, unchecked cast to union, calls `set_selectedRuleset(...)`, `closeRulesetPicker(true)`, `showModeSelect()`. Unchecked cast — foreign data-ruleset value would pass through (uncertain whether defended elsewhere). Backdrop/cancel call `closeRulesetPicker()` no-arg. No RPC, no auth, no async.

### closeRulesetPicker
Mirror of closeRankedPicker on id `arena-ruleset-overlay`. Null no-op; else remove + forward branch.

Module state: `selectedRanked` unused; writes via setters. Nav side effects: window.location.href (two sites), history.replaceState, history.back, pushArenaState.

## Agent 04

### showRankedPicker
Entry guard: reads `getCurrentUser()` and `isPlaceholder()`. If user falsy AND not placeholder, writes `window.location.href = 'moderator-plinko.html'` and returns — navigation exit, no overlay.

Otherwise creates detached `<div>`, sets className `arena-rank-overlay` id `arena-rank-overlay`, template-literal innerHTML with backdrop, sheet with title/subtitle, two `.arena-rank-card` (data-ranked `"false"`/`"true"`), `#arena-rank-cancel`. Unicode escapes `\uD83C\uDF7A` (beer), `\u2694\uFE0F` (crossed swords), `\u00B7` (middle dot). No user data in innerHTML — escapeHTML not needed.

Appends to body, calls `pushArenaState('rankedPicker')`.

Iterates `overlay.querySelectorAll('.arena-rank-card')`. Each gets async click: reads `cardEl.dataset.ranked === 'true'` for isRanked. If ranked && !placeholder, awaits `safeRpc<RankedCheckResult>('check_ranked_eligible')`. On thrown error or truthy error field, catch logs `'[Arena] Ranked check error:'` via console.warn and control falls through to the setter/close/advance path — meaning a network error treats user as eligible (uncertainty). On ineligible, calls `closeRankedPicker()` no-forward, blocking `confirm(...)` with percentage concat; OK writes location to profile-depth; returns. `set_selectedRanked(isRanked)`, `closeRankedPicker(true)`, `showRulesetPicker()`.

Backdrop/cancel: optional-chained `getElementById(...)?.addEventListener` → `closeRankedPicker()` no-arg. Missing element silently skipped.

Outer function sync; async work inside click listener.

### closeRankedPicker
Reads `getElementById('arena-rank-overlay')`. Null: no-op, no else. Else: `overlay.remove()`. Branch on `forward`: truthy → `history.replaceState({ arenaView: 'lobby' }, '')` overwrites current entry so next pushArenaState stacks cleanly; falsy → `history.back()` pops the pushed picker state (triggers popstate in arena-core — not inspected). Sync, no RPC.

### showRulesetPicker
No auth guard. Div with className `arena-rank-overlay` (shared CSS with ranked) id `arena-ruleset-overlay` (distinct). Static innerHTML with backdrop, sheet, two cards (`data-ruleset="amplified"`/`"unplugged"`), `#arena-ruleset-cancel`. Unicode escapes `\u26A1`, `\uD83C\uDFB8`, `\u2014`.

Appends, `pushArenaState('rulesetPicker')`. Iterates `.arena-rank-card`. Sync click: `set_selectedRuleset(cardEl.dataset.ruleset as 'amplified' | 'unplugged')` — unchecked cast, relies on template; `closeRulesetPicker(true)`; `showModeSelect()` from arena-config-mode-select.ts. Backdrop/cancel via optional-chain call `closeRulesetPicker()` no-arg. Sync, no RPC.

### closeRulesetPicker
Structurally identical to closeRankedPicker on `id='arena-ruleset-overlay'`. Null: silent no-op. Else `overlay.remove()`, then `forward` truthy replaceState, falsy `history.back()`. Sync, no RPC.

Observations: `selectedRanked` imported but unread in 174 lines — likely dead import. Both replaceState calls target `{ arenaView: 'lobby' }` even when chaining forward; intermediate picker's pushArenaState then stacks lobby → currentPicker. Error path on eligibility RPC silently proceeds past guard — callers need server-side backstop. `confirm()` is blocking; during its lifetime `closeRankedPicker()` has already removed the overlay.

## Agent 05

### showRankedPicker
Reads `getCurrentUser()`/`isPlaceholder()`. Guard: no user && not placeholder → `window.location.href='moderator-plinko.html'`, return.

Otherwise builds div className `arena-rank-overlay` id `arena-rank-overlay`. innerHTML template: backdrop, sheet, two `.arena-rank-card` (casual `data-ranked="false"`, ranked `data-ranked="true"`), cancel button. Unicode escapes for beer/crossed-swords/bolt/guitar static glyphs — no user data, no XSS surface.

Appends to body; `pushArenaState('rankedPicker')`.

`querySelectorAll('.arena-rank-card')`; each gets async click. `isRanked = dataset.ranked === 'true'`. If ranked && !placeholder, awaits `safeRpc<RankedCheckResult>('check_ranked_eligible')`. On error truthy, throws to catch. Else cast data to RankedCheckResult; if `!result.eligible`: `closeRankedPicker()` no-forward (history.back), `confirm(...)` with `result.profile_pct`. On OK: `window.location.href='moderator-profile-depth.html'`. Return. Catch: `console.warn('[Arena] Ranked check error:', e)` — then falls through to set_selectedRanked + advance (note: error path advances as if eligible; flagged as possibly intentional leniency).

Happy path: `set_selectedRanked(isRanked)`; `closeRankedPicker(true)` (forward, replaceState); `showRulesetPicker()`.

Backdrop (`#arena-rank-backdrop`) and cancel (`#arena-rank-cancel`) both invoke `closeRankedPicker()` no-arg via optional-chained addEventListener.

### closeRankedPicker
Sync, `forward?: boolean`. `getElementById('arena-rank-overlay')`. Null → return, no side effect. Overlay present → `overlay.remove()`. Branch: truthy `history.replaceState({ arenaView: 'lobby' }, '')`; falsy `history.back()`. No RPC.

### showRulesetPicker
No auth guard — entry assumed post-ranked-pick. Div className `arena-rank-overlay` (shared CSS) id `arena-ruleset-overlay`. Static innerHTML with two cards `data-ruleset="amplified"`/`"unplugged"` and cancel. Appends, `pushArenaState('rulesetPicker')`. `querySelectorAll('.arena-rank-card')`; sync click: reads `cardEl.dataset.ruleset`, unchecked cast to union (uncertainty — no runtime validation), calls `set_selectedRuleset(...)`, `closeRulesetPicker(true)`, `showModeSelect()`. Backdrop/cancel call `closeRulesetPicker()` no-arg via optional-chain. No RPC, no async, no eligibility check.

### closeRulesetPicker
Structural twin of closeRankedPicker on id `arena-ruleset-overlay`. Null → silent. Else `overlay.remove()`, `forward` truthy replaceState, falsy `history.back()`.

Cross-function: `selectedRanked` unread (likely dead import). Eligibility RPC uses `safeRpc` (401-retry wrapper). History model: show pushes, close-forward overwrites in place (chaining next pushArenaState without back-button stacking), close-no-arg pops. Both overlays share `arena-rank-overlay` class and `arena-rank-card` item class — ids differ.
