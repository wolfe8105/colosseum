# Stage 3 Verification — src/arena/arena-config-category.ts

Verified by: Stage 3 agent
Source lines confirmed: 88 of 88 (complete read)
Anchor count: 1 (`showCategoryPicker`)

---

## Cross-agent agreement summary

All five Stage 2 agents described the same control flow, state mutations, error paths, and edge cases for `showCategoryPicker`. No substantive disagreements were found. Minor differences were cosmetic (formatting, verbosity, line-number references) or additive observations from one or two agents that the others omitted but did not contradict.

### Minor divergences noted (none rise to disagreement)

| Item | Agents | Verdict |
|---|---|---|
| Line numbers for calls inside the `innerHTML` template literal | Agents varied by 1–2 lines on calls like `roundPickerCSS()`, `QUEUE_CATEGORIES.map()`, `roundPickerHTML()` — these are inside a multi-line string starting at line 14; exact attribution depends on counting convention. | Cosmetic. All agents correctly identified the calls and their context. |
| Agent 05 noted: `QUEUE_CATEGORIES` being `undefined` would throw on `.map()` | No other agent mentioned it. | Additive true fact. Not a disagreement. |
| Agent 03 noted: `mode`/`topic` are captured in closure at call time | Only Agent 03 mentioned this explicitly. | Additive true fact. Not a disagreement. |
| Agent 05 noted: moderator toggle is read at click time (not open time) | Only Agent 05 stated this explicitly. | Additive true fact. Not a disagreement. |
| Agent 02 mentioned `QUEUE_CATEGORIES` empty array as explicit non-error edge case | Agents 01/03/04 omitted it; Agent 05 mentioned it. | Additive. Correct. |

---

## Verified facts for `showCategoryPicker` (line 10)

### Signature
`export function showCategoryPicker(mode: string, topic: string): void`

`mode` and `topic` are passed through to `enterQueue` unchanged; neither is read, validated, or used within this function itself.

### Control flow (verified against source)

1. `document.createElement('div')` → `overlay`; `className` and `id` both set to `'arena-cat-overlay'`. No check for a pre-existing element with this id before creation.

2. `overlay.innerHTML` assigned a template literal containing:
   - A `<style>` block with all layout/animation rules; `roundPickerCSS()` interpolated at the end of the style block (line 31 of source).
   - A backdrop div with `id="arena-cat-backdrop"`.
   - A sheet div containing: handle bar; static title "Choose Your Arena"; static subtitle; a grid div populated by `QUEUE_CATEGORIES.map(c => ...)` — each entry emits `<button class="arena-cat-btn" data-cat="${c.id}">` with child spans for `c.icon` and `c.label`, all interpolated without escaping; an "ANY CATEGORY" button with `id="arena-cat-any"`; `roundPickerHTML()` output; a moderator-request checkbox row with `id="arena-want-mod-toggle"`; a cancel button with `id="arena-cat-cancel"`.

3. `document.body.appendChild(overlay)` — live DOM mount.

4. `pushArenaState('categoryPicker')` — pushes one browser history entry.

5. `wireRoundPicker(overlay)` — called after DOM mount, before event listeners.

6. `overlay.querySelectorAll('.arena-cat-btn')` (scoped to overlay) → `forEach` → per-button `click` listener:
   - `set_selectedCategory((btn as HTMLElement).dataset.cat ?? null)`
   - `set_selectedWantMod((document.getElementById('arena-want-mod-toggle') as HTMLInputElement | null)?.checked ?? false)`
   - `overlay.remove()`
   - `enterQueue(mode, topic)`

7. `document.getElementById('arena-cat-any')?.addEventListener('click', ...)` (global query):
   - `set_selectedCategory(null)`
   - Same want-mod read pattern (`?.checked ?? false`)
   - `overlay.remove()`
   - `enterQueue(mode, topic)`

8. `document.getElementById('arena-cat-cancel')?.addEventListener('click', ...)` (global query):
   - `overlay.remove()`
   - `history.back()`

9. `document.getElementById('arena-cat-backdrop')?.addEventListener('click', ...)` (global query):
   - `overlay.remove()`
   - `history.back()`

### State mutations
- `document.body` — overlay appended at step 3; removed on any user interaction.
- Browser history — one entry pushed via `pushArenaState('categoryPicker')`. Cancel and backdrop paths call `history.back()` (consuming it). Category and "any" paths do **not** call `history.back()`, leaving the pushed entry unconsumed.
- `selectedCategory` in `arena-state.ts` — written via `set_selectedCategory` on category or "any" click.
- `selectedWantMod` in `arena-state.ts` — written via `set_selectedWantMod` on category or "any" click. Reflects checkbox state at click time.
- Internal round-picker state — may be mutated by `wireRoundPicker`; details opaque to this file.

### Error paths
- No `try/catch` anywhere.
- All four `getElementById` calls for "any", "cancel", "backdrop", and "want-mod-toggle" use optional chaining; if elements are absent, listeners are silently not attached and `false` is silently used for the wantMod boolean.
- `dataset.cat ?? null`: if attribute absent, `null` is passed to `set_selectedCategory`.
- Exceptions from `wireRoundPicker`, `pushArenaState`, `enterQueue`, `history.back()` propagate uncaught to the caller.

### Confirmed edge cases
- **Duplicate overlay**: No dedup guard. A second call while a first overlay exists appends a second overlay with the same id (`arena-cat-overlay`). Global `getElementById` calls for "any", "cancel", and "backdrop" will resolve to the first matching element in DOM order — potentially wiring the second call's listeners to the first overlay's elements.
- **Unescaped category data**: `c.icon`, `c.label`, and `c.id` from `QUEUE_CATEGORIES` are interpolated directly into `innerHTML` without `escapeHTML()`. If any entry contains `<`, `>`, `"`, `'`, or `&`, this is an XSS vector (Medium severity per project security rules; `escapeHTML()` required on all user/external content in `innerHTML`). However, `QUEUE_CATEGORIES` is a local constant, not user-supplied — the risk is low in practice but violates the project's stated invariant.
- **History leak**: Category and "any" exit paths call `enterQueue` but not `history.back()`. The `pushArenaState('categoryPicker')` entry is left unconsumed on these paths, growing the history stack.
- **Global getElementById scope**: "any", "cancel", "backdrop" queries are `document.getElementById`, not scoped to `overlay`. This is safe under normal single-overlay operation but becomes a hazard on double-call.
- **`QUEUE_CATEGORIES` contract**: If the constant is an empty array, the grid renders zero buttons and `forEach` iterates zero times — silent no-op. If it is `undefined` (import failure), `.map()` throws.
- **`mode`/`topic` closure capture**: Both are captured by value at call time. Any later reassignment of outer variables has no effect on pending click handlers.
- **Moderator toggle read at click time**: The checkbox is read when the user clicks a category button, not when the picker opens. Reflects the state at decision time.

---

## Findings

### F-1 — Unescaped innerHTML interpolation of QUEUE_CATEGORIES values (Low)
**Location**: Lines 40–43 (`data-cat="${c.id}"`, `${c.icon}`, `${c.label}`)
**Description**: `c.id`, `c.icon`, and `c.label` from `QUEUE_CATEGORIES` are interpolated directly into `innerHTML` without `escapeHTML()`. The project's XSS rule states: "Any user-supplied data entering `innerHTML` or template literals MUST pass through `ModeratorConfig.escapeHTML()`." `QUEUE_CATEGORIES` is a local constant (not user input), so exploitation requires a supply-chain change to `arena-constants.ts`. Severity is Low given the source is static, but it violates the project invariant and sets a risky pattern.
**Recommendation**: Wrap `c.id`, `c.icon`, and `c.label` with `escapeHTML()` at interpolation sites.

### F-2 — Duplicate overlay allowed on re-entrant call (Low)
**Location**: Line 10 (function entry), lines 70–87 (global getElementById wiring)
**Description**: No guard checks for or removes a pre-existing `#arena-cat-overlay` before appending a new one. On a second call, duplicate ids exist in the DOM and global `getElementById` calls for "any", "cancel", and "backdrop" wire to the first-overlay's elements, silently misfiring.
**Recommendation**: Add `document.getElementById('arena-cat-overlay')?.remove()` at the top of `showCategoryPicker` before creating a new overlay.

### F-3 — Browser history leak on category/any selection path (Low)
**Location**: Lines 62–66 (category click), lines 71–75 (any click)
**Description**: `pushArenaState('categoryPicker')` is called unconditionally at line 56, but category and "any" click handlers exit via `enterQueue` without calling `history.back()`. Each successful selection leaves a dangling history entry. Over multiple navigations this grows the history stack and makes the Back button behave unexpectedly for users.
**Recommendation**: Either call `history.back()` (or the appropriate `popstate`-based navigation) on the category and "any" exit paths, or restructure to use `replaceState` instead of `pushState` when transitioning to the queue.

### F-4 — Global getElementById for "any"/"cancel"/"backdrop" (Low / Design note)
**Location**: Lines 70, 78, 84
**Description**: All three post-append wiring calls use `document.getElementById(...)` rather than `overlay.querySelector(...)`. This is safe under single-overlay conditions but couples the wiring to the global DOM scope, making it fragile if overlays ever stack (see F-2). Not a standalone actionable bug but compounds F-2.
**Recommendation**: Replace with `overlay.querySelector('#arena-cat-any')`, `overlay.querySelector('#arena-cat-cancel')`, `overlay.querySelector('#arena-cat-backdrop')` to scope all wiring to the overlay element.

---

## Verdict

**PASS with findings.** All five Stage 2 agents agree on every material fact. No agent disagreements. Control flow, state mutations, error paths, and edge cases are all correctly and consistently described. Four findings are raised (all Low severity). No High or Medium issues identified. The file has no `try/catch`, no missing imports, no incorrect return types, and no logic errors in the primary paths.

| Finding | Severity | Actionable |
|---|---|---|
| F-1 Unescaped innerHTML interpolation | Low | Yes — wrap with `escapeHTML()` |
| F-2 No dedup guard on re-entry | Low | Yes — remove existing overlay at entry |
| F-3 History leak on category/any path | Low | Yes — balance push with back/replace |
| F-4 Global getElementById scope | Low | Yes — scope to overlay (fix with F-2) |
