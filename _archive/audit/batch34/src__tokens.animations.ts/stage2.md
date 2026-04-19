# Stage 2 Outputs — tokens.animations.ts

## Agent 01

### _injectCSS (line 13)
Takes no parameters. Returns `void`. Reads the module-level `boolean` variable `cssInjected` (initialized to `false`). If `cssInjected` is `true`, the function returns immediately (early return — idempotency guard). Otherwise, writes `cssInjected = true`, then calls `document.createElement('style')` to create a new `HTMLStyleElement`. Assigns a multi-rule CSS string literal to `style.textContent`, which defines: two `@keyframes` blocks (`tokenFlyUp` and `milestoneSlide`), and class rules for `.token-fly-coin`, `.token-earn-toast`, `.milestone-toast`, `.milestone-toast .mt-icon`, `.milestone-toast .mt-label`, `.milestone-toast .mt-reward`. The CSS includes two hardcoded hex color values (`#b8942e`, `#2d5a8e`) with inline TODO comments; all other color/font references use `var(--mod-*)` CSS custom properties. Calls `document.head.appendChild(style)`, inserting the `<style>` element into the document `<head>`. Not async. No return value. The only state write is setting `cssInjected = true`.

### _coinFlyUp (line 58)
Takes no parameters. Returns `void`. Not async. Calls `_injectCSS()` unconditionally. Calls `document.createElement('div')`, sets `coin.className = 'token-fly-coin'` and `coin.textContent = '🪙'`. Calls `document.getElementById('token-display')` and stores the result in `bar`. If `bar` is truthy, calls `bar.getBoundingClientRect()` to get `rect`, then sets `coin.style.left` to `rect.left + rect.width / 2 + 'px'` (horizontal center of the `#token-display` element) and `coin.style.top` to `rect.bottom + 'px'` (bottom edge). If `bar` is `null`, sets `coin.style.top = '60px'` (fallback; `coin.style.left` is not set in this branch — the `.token-fly-coin` class CSS `left:50%` remains). Calls `document.body.appendChild(coin)` to mount the coin div into the DOM. Calls `setTimeout(() => coin.remove(), 1000)` — after 1000ms removes the coin element from the DOM. Does not read or write module-level state directly.

### _tokenToast (line 75)
Takes two parameters: `tokens` (`number`) and `label` (`string`). Returns `void`. Not async. Evaluates `!tokens || tokens <= 0`; if true (falsy-zero or negative), returns immediately without further execution. Otherwise calls `_injectCSS()` (no arguments), then calls `_coinFlyUp()` (no arguments), then calls `showToast` (imported from `./config.ts`) with arguments `` `+${tokens} 🪙 ${label}` `` and `'success'`. Note: `tokens` is not cast through `Number()` before interpolation here — raw parameter value used in the template string. Does not read or write any module-level state variables directly.

### _milestoneToast (line 82)
Takes four parameters: `icon` (`string`), `label` (`string`), `tokens` (`number`), `freezes` (`number`). Returns `void`. Not async. Calls `_injectCSS()` unconditionally. Calls `document.createElement('div')` and sets `el.className = 'milestone-toast'`. Declares `let rewardText = ''`. Executes three sequential (non-exclusive, not `else if`) conditional assignments: (1) if `tokens > 0`, sets `rewardText = \`+${Number(tokens)} 🪙 tokens\``; (2) if `freezes > 0`, overwrites `rewardText = \`+${Number(freezes)} ❄️ streak freeze${freezes > 1 ? 's' : ''}\`` (pluralization ternary); (3) if both `tokens > 0 && freezes > 0`, overwrites again with `rewardText = \`+${Number(tokens)} 🪙 + ${Number(freezes)} ❄️\``. Third condition overwrites the first two when both are positive. All numeric interpolations use `Number()` casts. Sets `el.innerHTML` to a template literal that passes `icon || '🏆'`, `label`, and `rewardText` each through `escapeHTML()` (imported from `./config.ts`). Calls `document.body.appendChild(el)`. If `tokens > 0`, calls `_coinFlyUp()`. Calls `setTimeout(() => el.remove(), 3600)` — after 3600ms removes the milestone toast element from the DOM. Does not read or write module-level state directly.

---

## Agent 02

### _injectCSS (line 13)
Takes no parameters. Reads the module-level boolean `cssInjected` (initialized to `false`). If `cssInjected` is `true`, returns immediately with no side effects. Otherwise, sets `cssInjected = true`, then calls `document.createElement('style')` to create a new `HTMLStyleElement`. Sets `style.textContent` to a multi-line string literal containing two `@keyframes` rules (`tokenFlyUp` and `milestoneSlide`) and four CSS class rules (`.token-fly-coin`, `.token-earn-toast`, `.milestone-toast`, `.milestone-toast .mt-icon`, `.milestone-toast .mt-label`, `.milestone-toast .mt-reward`). Calls `document.head.appendChild(style)` to inject the element into the document `<head>`. Not async. Returns `void`. The only state write is setting `cssInjected = true`.

### _coinFlyUp (line 58)
Takes no parameters. Calls `_injectCSS()`. Calls `document.createElement('div')`, sets `coin.className = 'token-fly-coin'` and `coin.textContent = '🪙'`. Calls `document.getElementById('token-display')` and assigns the result to `bar`. If `bar` is truthy, calls `bar.getBoundingClientRect()`, assigns to `rect`, sets `coin.style.left` to `rect.left + rect.width / 2 + 'px'` and `coin.style.top` to `rect.bottom + 'px'`. If `bar` is falsy (element not found), sets `coin.style.top = '60px'` with no `left` override (CSS class sets `left:50%`). Calls `document.body.appendChild(coin)`. Calls `setTimeout(() => coin.remove(), 1000)` scheduling removal after 1000ms. Reads no module-level state variables and writes none. Not async. Returns `void`.

### _tokenToast (line 75)
Takes two parameters: `tokens` (type `number`) and `label` (type `string`). Checks `!tokens || tokens <= 0`; if true, returns immediately. Otherwise, calls `_injectCSS()`, then `_coinFlyUp()`, then calls `showToast` (imported from `./config.ts`) with `` `+${tokens} 🪙 ${label}` `` and `'success'`. Reads no module-level state variables and writes none directly. Not async. Returns `void`.

### _milestoneToast (line 82)
Takes four parameters: `icon` (type `string`), `label` (type `string`), `tokens` (type `number`), `freezes` (type `number`). Calls `_injectCSS()`. Calls `document.createElement('div')`, sets `el.className = 'milestone-toast'`. Declares `let rewardText = ''`. Three sequential conditionals (none `else if`): (1) if `tokens > 0`, sets `rewardText = \`+${Number(tokens)} 🪙 tokens\``; (2) if `freezes > 0`, overwrites `rewardText = \`+${Number(freezes)} ❄️ streak freeze${freezes > 1 ? 's' : ''}\``; (3) if `tokens > 0 && freezes > 0`, overwrites `rewardText = \`+${Number(tokens)} 🪙 + ${Number(freezes)} ❄️\``. Sets `el.innerHTML` to template literal calling `escapeHTML(icon || '🏆')`, `escapeHTML(label)`, and `escapeHTML(rewardText)` (imported from `./config.ts`). Calls `document.body.appendChild(el)`. If `tokens > 0`, calls `_coinFlyUp()`. Calls `setTimeout(() => el.remove(), 3600)` scheduling removal after 3600ms. Reads no module-level state variables and writes none directly. Not async. Returns `void`.

---

## Agent 03

### _injectCSS (line 13)
Takes no parameters. Reads the module-level `boolean` variable `cssInjected`. If `cssInjected` is `true`, returns immediately (early return, no side effects). Otherwise, sets `cssInjected = true`, calls `document.createElement('style')` to create a `<style>` element, assigns a multi-rule CSS string to `style.textContent` (defining `@keyframes tokenFlyUp`, `@keyframes milestoneSlide`, `.token-fly-coin`, `.token-earn-toast`, `.milestone-toast`, `.milestone-toast .mt-icon`, `.milestone-toast .mt-label`, `.milestone-toast .mt-reward`), and calls `document.head.appendChild(style)`. Writes to `cssInjected` exactly once. Not async. Returns `void`.

### _coinFlyUp (line 58)
Takes no parameters. Calls `_injectCSS()` unconditionally. Calls `document.createElement('div')`, sets `coin.className = 'token-fly-coin'`, sets `coin.textContent = '🪙'`. Calls `document.getElementById('token-display')` and stores in `bar`. If `bar` is truthy, calls `bar.getBoundingClientRect()`, stores in `rect`, sets `coin.style.left` to `rect.left + rect.width / 2 + 'px'` and `coin.style.top` to `rect.bottom + 'px'`. If `bar` is falsy, sets `coin.style.top = '60px'` only (not `left` — class CSS `left:50%` remains). Appends `coin` to `document.body`. Calls `setTimeout(() => coin.remove(), 1000)`. Does not read or write module-level state directly. Not async. Returns `void`.

### _tokenToast (line 75)
Takes `tokens: number` and `label: string`. If `tokens` is falsy or `tokens <= 0`, returns immediately. Otherwise calls `_injectCSS()`, then `_coinFlyUp()`, then calls `showToast('+${tokens} 🪙 ${label}', 'success')` imported from `./config.ts`. Does not read or write module-level state directly. Not async. Returns `void`.

### _milestoneToast (line 82)
Takes `icon: string`, `label: string`, `tokens: number`, `freezes: number`. Calls `_injectCSS()` unconditionally. Calls `document.createElement('div')`, sets `el.className = 'milestone-toast'`. Initializes `let rewardText = ''`. Three sequential (non-exclusive) conditionals: if `tokens > 0`, sets `rewardText = '+${Number(tokens)} 🪙 tokens'`; if `freezes > 0`, overwrites `rewardText = '+${Number(freezes)} ❄️ streak freeze${freezes > 1 ? 's' : ''}'`; if `tokens > 0 && freezes > 0`, overwrites with `rewardText = '+${Number(tokens)} 🪙 + ${Number(freezes)} ❄️'`. Sets `el.innerHTML` via template literal calling `escapeHTML(icon || '🏆')`, `escapeHTML(label)`, and `escapeHTML(rewardText)`. Appends `el` to `document.body`. If `tokens > 0`, calls `_coinFlyUp()`. Calls `setTimeout(() => el.remove(), 3600)`. Does not read or write module-level state directly. Not async. Returns `void`.

---

## Agent 04

### _injectCSS (line 13)
Takes no parameters. Returns `void`. Reads module-level boolean `cssInjected`; if already `true`, returns immediately. Otherwise sets `cssInjected = true`, calls `document.createElement('style')` to produce a `HTMLStyleElement`. Sets `style.textContent` to a multi-line string containing two `@keyframes` declarations (`tokenFlyUp` and `milestoneSlide`) and four CSS class rules. The gradient stops reference hardcoded hex values `#b8942e` and `#2d5a8e` alongside `--mod-*` CSS variables. Calls `document.head.appendChild(style)`. Not async. No return value.

### _coinFlyUp (line 58)
Takes no parameters. Returns `void`. Not async. Calls `_injectCSS()` unconditionally (no-op after first invocation). Calls `document.createElement('div')`, assigns `coin.className = 'token-fly-coin'` and `coin.textContent = '🪙'`. Calls `document.getElementById('token-display')`, stores result in `bar`. If `bar` is truthy, calls `bar.getBoundingClientRect()` → `rect`, sets `coin.style.left` to `rect.left + rect.width / 2 + 'px'` and `coin.style.top` to `rect.bottom + 'px'`. If `bar` is falsy, sets `coin.style.top = '60px'` only. Calls `document.body.appendChild(coin)`. Calls `setTimeout(() => coin.remove(), 1000)`. Writes no module-level state.

### _tokenToast (line 75)
Takes `tokens: number` and `label: string`. Returns `void`. Not async. If `!tokens || tokens <= 0`, returns immediately. Otherwise calls `_injectCSS()`, `_coinFlyUp()`, then calls `showToast(` `` `+${tokens} 🪙 ${label}` ``, `'success')` (imported from `./config.ts`). Writes no module-level state.

### _milestoneToast (line 82)
Takes `icon: string`, `label: string`, `tokens: number`, `freezes: number`. Returns `void`. Not async. Calls `_injectCSS()`. Creates `el` div with `className = 'milestone-toast'`. Declares `rewardText = ''`. Three sequential conditionals (not `else if`): if `tokens > 0`, sets `rewardText = \`+${Number(tokens)} 🪙 tokens\``; if `freezes > 0`, overwrites with `\`+${Number(freezes)} ❄️ streak freeze${freezes > 1 ? 's' : ''}\``; if both `tokens > 0 && freezes > 0`, overwrites with `\`+${Number(tokens)} 🪙 + ${Number(freezes)} ❄️\``. Combined form is final value when both positive. Casts with `Number()` before interpolation. Sets `el.innerHTML` to template literal using `escapeHTML(icon || '🏆')`, `escapeHTML(label)`, `escapeHTML(rewardText)`. Calls `document.body.appendChild(el)`. If `tokens > 0`, calls `_coinFlyUp()`. Calls `setTimeout(() => el.remove(), 3600)` — 3600ms aligns with `milestoneSlide` CSS animation duration of 3.5s. Writes no module-level state.

---

## Agent 05

### _injectCSS (line 13)
No parameters. Reads module-level boolean `cssInjected`. If `true`, returns immediately. Otherwise sets `cssInjected = true`, calls `document.createElement('style')`, assigns CSS string to `style.textContent` (two `@keyframes` declarations and four class rules), then calls `document.head.appendChild(style)`. Not async. Returns `void`. Side effects: writes `cssInjected = true`, appends `<style>` to `document.head`.

### _coinFlyUp (line 58)
No parameters. Calls `_injectCSS()` unconditionally. Calls `document.createElement('div')`, assigns `'token-fly-coin'` to `coin.className` and `'🪙'` to `coin.textContent`. Calls `document.getElementById('token-display')`, stores in `bar`. If `bar` truthy, calls `bar.getBoundingClientRect()` → `rect`, sets `coin.style.left = rect.left + rect.width / 2 + 'px'` and `coin.style.top = rect.bottom + 'px'`. If `bar` falsy, sets `coin.style.top = '60px'` (no `left` set, class CSS `left:50%` remains). Calls `document.body.appendChild(coin)`. Calls `setTimeout(() => coin.remove(), 1000)`. Not async. Returns `void`.

### _tokenToast (line 75)
Parameters: `tokens: number`, `label: string`. If `tokens` is falsy or `tokens <= 0`, returns immediately. Otherwise calls `_injectCSS()`, `_coinFlyUp()`, `showToast(` `` `+${tokens} 🪙 ${label}` ``, `'success')` imported from `./config.ts`. Not async. Returns `void`.

### _milestoneToast (line 82)
Parameters: `icon: string`, `label: string`, `tokens: number`, `freezes: number`. Calls `_injectCSS()` unconditionally. Calls `document.createElement('div')`, sets `el.className = 'milestone-toast'`. Initializes `rewardText = ''`. Three sequential conditionals (not `else if`): if `tokens > 0` → `rewardText = \`+${Number(tokens)} 🪙 tokens\``; if `freezes > 0` → overwrites with `\`+${Number(freezes)} ❄️ streak freeze${freezes > 1 ? 's' : ''}\``; if `tokens > 0 && freezes > 0` → overwrites with `\`+${Number(tokens)} 🪙 + ${Number(freezes)} ❄️\``. Assigns `el.innerHTML` with template literal using `escapeHTML(icon || '🏆')`, `escapeHTML(label)`, `escapeHTML(rewardText)` (imported from `./config.ts`). Calls `document.body.appendChild(el)`. If `tokens > 0`, calls `_coinFlyUp()`. Calls `setTimeout(() => el.remove(), 3600)`. Not async. Returns `void`.
