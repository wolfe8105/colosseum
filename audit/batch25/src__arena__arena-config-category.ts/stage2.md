# Stage 2 Outputs — src/arena/arena-config-category.ts

## Agent 01

### showCategoryPicker (line 10)

**Parameters**:
- `mode: string` — the debate mode string passed through to `enterQueue` unchanged; not read or validated within this function.
- `topic: string` — the debate topic string passed through to `enterQueue` unchanged; not read or validated within this function.

**Return**: `void`. No value is returned.

**Control flow**:

1. A `<div>` element is created via `document.createElement('div')`. Its `className` is set to `'arena-cat-overlay'` and its `id` to `'arena-cat-overlay'`. No check is performed for a pre-existing element with this id before creation.

2. The element's `innerHTML` is assigned a multi-line template literal containing:
   - A `<style>` block with all layout and animation rules, including the output of `roundPickerCSS()` interpolated at the end of the style block.
   - A backdrop div with `id="arena-cat-backdrop"`.
   - A sheet div containing:
     - A handle bar div.
     - Static title and subtitle text nodes.
     - A grid div populated by mapping over `QUEUE_CATEGORIES`: each entry produces a `<button class="arena-cat-btn">` with a `data-cat` attribute set to `c.id`, and child spans for `c.icon` and `c.label`. These values are interpolated directly into innerHTML without escaping.
     - A single "any category" button with `id="arena-cat-any"`.
     - The output of `roundPickerHTML()` interpolated inline.
     - A `<label>` containing a checkbox with `id="arena-want-mod-toggle"`.
     - A cancel button with `id="arena-cat-cancel"`.

3. The constructed overlay element is appended to `document.body`.

4. `pushArenaState('categoryPicker')` is called, pushing a history state entry.

5. `wireRoundPicker(overlay)` is called with the overlay element.

6. **Category button wiring**: `overlay.querySelectorAll('.arena-cat-btn')` returns all category buttons (scoped to overlay). `forEach` iterates over each. For each button, a `'click'` event listener is attached:
   - On click: `set_selectedCategory` is called with `(btn as HTMLElement).dataset.cat ?? null`. If `data-cat` is undefined or missing, `null` is passed.
   - `document.getElementById('arena-want-mod-toggle')` is retrieved and cast to `HTMLInputElement | null`. If null, `false` is used via the `?.checked ?? false` chain; otherwise the checkbox's `checked` boolean is passed to `set_selectedWantMod`.
   - `overlay.remove()` removes the overlay from the DOM.
   - `enterQueue(mode, topic)` is called.

7. **"Any" button wiring**: `document.getElementById('arena-cat-any')` is retrieved with optional chaining (global document query). If found, a `'click'` listener is attached:
   - On click: `set_selectedCategory(null)` is called explicitly with `null`.
   - Same `arena-want-mod-toggle` checkbox read pattern; result passed to `set_selectedWantMod`.
   - `overlay.remove()` removes the overlay.
   - `enterQueue(mode, topic)` is called.

8. **Cancel button wiring**: `document.getElementById('arena-cat-cancel')` is retrieved with optional chaining (global). If found, a `'click'` listener is attached:
   - On click: `overlay.remove()` removes the overlay.
   - `history.back()` is called.

9. **Backdrop wiring**: `document.getElementById('arena-cat-backdrop')` is retrieved with optional chaining (global). If found, a `'click'` listener is attached:
   - On click: `overlay.remove()` removes the overlay.
   - `history.back()` is called.

**State mutations**:
- `document.body` — overlay appended at step 3; removed on any exit path.
- Browser history — `pushArenaState('categoryPicker')` pushes one entry. Cancel and backdrop clicks call `history.back()`. Category and "any" button clicks do not call `history.back()`.
- `selectedCategory` (arena-state.ts) — written via `set_selectedCategory` on category or "any" button click.
- `selectedWantMod` (arena-state.ts) — written via `set_selectedWantMod` on category or "any" button click.

**Error paths**:
- No `try/catch` blocks.
- All `document.getElementById` calls for backdrop, cancel, and "any" use optional chaining; if element not found, listener silently not attached.
- `document.getElementById('arena-want-mod-toggle')` inside click handlers uses `?.checked ?? false`; if absent, `false` is silently used.
- `btn.dataset.cat` uses `?? null`; if absent, `null` is passed to `set_selectedCategory`.

**Edge cases**:
- If `showCategoryPicker` is called while an overlay with `id="arena-cat-overlay"` already exists, a second overlay is appended without removing the first.
- `QUEUE_CATEGORIES` values (`c.id`, `c.icon`, `c.label`) are interpolated directly into `innerHTML` without escaping.
- The "any" button, cancel, and backdrop queries are global rather than scoped to overlay.
- Cancel and backdrop call `history.back()` unconditionally; category and "any" paths leave the pushed history entry unconsumed.

---

## Agent 02

### showCategoryPicker (line 10)

**Parameters**:
- `mode: string` — debate mode string passed through to `enterQueue` unchanged.
- `topic: string` — debate topic string passed through to `enterQueue` unchanged.

**Return**: `void`.

**Control flow**:

1. A `div` element is created. `className = 'arena-cat-overlay'`, `id = 'arena-cat-overlay'`.

2. `overlay.innerHTML` assigned a template literal containing:
   - Inline `<style>` block plus output of `roundPickerCSS()`.
   - Backdrop `div` (`id="arena-cat-backdrop"`).
   - Sheet `div` containing: grid of category buttons (from `QUEUE_CATEGORIES.map(c => ...).join('')`); "ANY CATEGORY" button (`id="arena-cat-any"`); output of `roundPickerHTML()`; moderator checkbox row (`id="arena-want-mod-toggle"`); cancel button (`id="arena-cat-cancel"`). Category `c.id`, `c.icon`, `c.label` interpolated without escaping.

3. `document.body.appendChild(overlay)`.

4. `pushArenaState('categoryPicker')` — pushes history entry.

5. `wireRoundPicker(overlay)`.

6. `overlay.querySelectorAll('.arena-cat-btn')` (scoped) — `forEach` attaches `click` listener to each:
   - `set_selectedCategory(dataset.cat ?? null)`.
   - `set_selectedWantMod(?.checked ?? false)` from `#arena-want-mod-toggle`.
   - `overlay.remove()`.
   - `enterQueue(mode, topic)`.

7. `document.getElementById('arena-cat-any')?.addEventListener('click', ...)` (global):
   - `set_selectedCategory(null)`.
   - Same `?.checked ?? false` wantMod read.
   - `overlay.remove()`.
   - `enterQueue(mode, topic)`.

8. `document.getElementById('arena-cat-cancel')?.addEventListener('click', ...)` (global):
   - `overlay.remove()`.
   - `history.back()`.

9. `document.getElementById('arena-cat-backdrop')?.addEventListener('click', ...)` (global):
   - `overlay.remove()`.
   - `history.back()`.

**State mutations**:
- `set_selectedCategory` writes selected category (string or null) to arena-state.
- `set_selectedWantMod` writes boolean to arena-state.
- `pushArenaState('categoryPicker')` pushes browser history entry.
- `document.body` gains and loses overlay child.

**Error paths**:
- No `try/catch`. Optional chaining on `getElementById` silently skips listener if element absent. `?.checked ?? false` silently defaults. Exceptions from `wireRoundPicker`, `pushArenaState`, `enterQueue` propagate uncaught.

**Edge cases**:
- Second call while first overlay exists: second overlay appended, duplicate IDs in DOM. Global `getElementById` calls on "any"/"cancel"/"backdrop" may hit wrong element.
- Category buttons scoped via `overlay.querySelectorAll` — correctly isolated.
- `c.icon`, `c.label` unescaped in innerHTML.
- `pushArenaState` history entry unconsumed on category/any selection paths.
- If `QUEUE_CATEGORIES` is empty, grid renders no buttons, `forEach` iterates zero times.

---

## Agent 03

### showCategoryPicker (line 10)

**Parameters**:
- `mode: string` — debate mode, passed through to `enterQueue`.
- `topic: string` — debate topic, passed through to `enterQueue`.

**Return**: `void`.

**Control flow**:

1. Creates `div` element; sets `className = 'arena-cat-overlay'`, `id = 'arena-cat-overlay'`.

2. Assigns `overlay.innerHTML` with template containing:
   - `<style>` block with `roundPickerCSS()` interpolated at end.
   - Backdrop `div` (`id="arena-cat-backdrop"`).
   - Sheet `div` with: drag handle; title "Choose Your Arena"; subtitle; grid of `QUEUE_CATEGORIES.map(...)` buttons (each with `data-cat="${c.id}"`, `c.icon`, `c.label` unescaped); "ANY CATEGORY" button (`id="arena-cat-any"`); `roundPickerHTML()` output; moderator checkbox (`id="arena-want-mod-toggle"`); cancel button (`id="arena-cat-cancel"`).

3. `document.body.appendChild(overlay)`.

4. `pushArenaState('categoryPicker')`.

5. `wireRoundPicker(overlay)`.

6. Category button wiring (`overlay.querySelectorAll('.arena-cat-btn')` — scoped):
   - Each button: `click` → `set_selectedCategory(dataset.cat ?? null)`, `set_selectedWantMod(?.checked ?? false)`, `overlay.remove()`, `enterQueue(mode, topic)`.

7. "Any" button (`document.getElementById('arena-cat-any')`? — global):
   - `click` → `set_selectedCategory(null)`, `set_selectedWantMod(?.checked ?? false)`, `overlay.remove()`, `enterQueue(mode, topic)`.

8. Cancel (`document.getElementById('arena-cat-cancel')`? — global):
   - `click` → `overlay.remove()`, `history.back()`.

9. Backdrop (`document.getElementById('arena-cat-backdrop')`? — global):
   - `click` → `overlay.remove()`, `history.back()`.

**State mutations**:
- `set_selectedCategory`, `set_selectedWantMod` write to arena-state.
- `pushArenaState` pushes history entry.
- DOM: overlay appended then removed.
- `wireRoundPicker` may mutate internal round-picker state.

**Error paths**:
- No `try/catch`.
- `?.addEventListener` silently skips if element not found.
- `?.checked ?? false` silently defaults wantMod to `false`.
- Exceptions from `enterQueue`, `pushArenaState`, `wireRoundPicker` propagate uncaught.

**Edge cases**:
- Duplicate overlay creation on second call (no dedup guard).
- `c.icon`, `c.label` interpolated into innerHTML without escaping.
- Global `getElementById` for "any"/"cancel"/"backdrop" may resolve to wrong element if duplicate IDs exist.
- `mode` and `topic` captured in closures at call time; later mutations to outer vars have no effect.
- `wireRoundPicker(overlay)` called after `appendChild`; round picker wired to live DOM node.

---

## Agent 04

### showCategoryPicker (line 10)

**Parameters**:
- `mode: string` — debate mode, passed to `enterQueue` unchanged.
- `topic: string` — debate topic, passed to `enterQueue` unchanged.

**Return**: `void`.

**Control flow**:

1. Creates `div`; sets class and id `'arena-cat-overlay'`.

2. Assigns `innerHTML` template: style block (with `roundPickerCSS()` interpolated), backdrop div, sheet div containing category grid (`QUEUE_CATEGORIES.map()`, unescaped icon/label), any-button, `roundPickerHTML()`, moderator checkbox row, cancel button.

3. `document.body.appendChild(overlay)`.

4. `pushArenaState('categoryPicker')`.

5. `wireRoundPicker(overlay)`.

6. `overlay.querySelectorAll('.arena-cat-btn')` (scoped) → `forEach` → per-button `click` listener:
   - `set_selectedCategory(dataset.cat ?? null)`.
   - `set_selectedWantMod((getElementById('arena-want-mod-toggle') as HTMLInputElement | null)?.checked ?? false)`.
   - `overlay.remove()`.
   - `enterQueue(mode, topic)`.

7. `getElementById('arena-cat-any')`? → `click` listener:
   - `set_selectedCategory(null)`.
   - `set_selectedWantMod(?.checked ?? false)`.
   - `overlay.remove()`.
   - `enterQueue(mode, topic)`.

8. `getElementById('arena-cat-cancel')`? → `click` listener:
   - `overlay.remove()`.
   - `history.back()`.

9. `getElementById('arena-cat-backdrop')`? → `click` listener:
   - `overlay.remove()`.
   - `history.back()`.

**State mutations**:
- `set_selectedCategory`, `set_selectedWantMod` — arena-state writes.
- `pushArenaState` — browser history push.
- DOM: overlay appended then removed on interaction.

**Error paths**:
- No `try/catch`. Optional chaining silences missing-element failures. Uncaught: `wireRoundPicker`, `pushArenaState`, `enterQueue`.

**Edge cases**:
- No dedup guard; double-call stacks two overlays.
- Unescaped icon/label in innerHTML.
- Global `getElementById` for "any"/"cancel"/"backdrop" — id collision risk.
- History entry from `pushArenaState` not consumed on category/any exit paths.
- `enterQueue` called after `overlay.remove()`.
- `history.back()` called unconditionally with no prior-entry check.

---

## Agent 05

### showCategoryPicker (line 10)

**Parameters**:
- `mode: string` — debate mode string, passed to `enterQueue` unchanged.
- `topic: string` — debate topic string, passed to `enterQueue` unchanged.

**Return**: `void`.

**Control flow**:

1. Creates `div`; `className = 'arena-cat-overlay'`, `id = 'arena-cat-overlay'`.

2. Assigns `innerHTML` template containing style block (with `roundPickerCSS()` interpolated), backdrop div, sheet div with: handle; title; subtitle; category grid (`QUEUE_CATEGORIES.map()` — `c.icon`, `c.label` unescaped); any-button; `roundPickerHTML()`; moderator checkbox (`id="arena-want-mod-toggle"`); cancel button.

3. `document.body.appendChild(overlay)`.

4. `pushArenaState('categoryPicker')` — pushes history entry.

5. `wireRoundPicker(overlay)` — called after DOM mount, before any listeners.

6. `overlay.querySelectorAll('.arena-cat-btn')` (scoped) → `forEach`:
   - Per-button `click`: `set_selectedCategory(dataset.cat ?? null)`, `set_selectedWantMod(?.checked ?? false)`, `overlay.remove()`, `enterQueue(mode, topic)`.

7. `getElementById('arena-cat-any')`? (global) → `click`:
   - `set_selectedCategory(null)`, `set_selectedWantMod(?.checked ?? false)`, `overlay.remove()`, `enterQueue(mode, topic)`.

8. `getElementById('arena-cat-cancel')`? (global) → `click`:
   - `overlay.remove()`, `history.back()`.

9. `getElementById('arena-cat-backdrop')`? (global) → `click`:
   - `overlay.remove()`, `history.back()`.

**State mutations**:
- `set_selectedCategory`, `set_selectedWantMod` — writes to arena-state.ts module.
- `pushArenaState` — browser history mutation.
- DOM: overlay appended then removed on any interaction path.

**Error paths**:
- No `try/catch`.
- `?.addEventListener` silently skips if element not found.
- `?.checked ?? false` silently defaults to `false` if toggle absent.
- `enterQueue`, `pushArenaState`, `wireRoundPicker`, `history.back()` — uncaught exception propagation.
- If `QUEUE_CATEGORIES` is empty: grid renders no buttons; forEach iterates zero times (no error).
- If `QUEUE_CATEGORIES` is undefined: `.map()` would throw.

**Edge cases**:
- No dedup guard; second call stacks a second overlay with duplicate ids.
- `c.icon`, `c.label` unescaped into innerHTML.
- `pushArenaState('categoryPicker')` history entry left unconsumed on category/any exit (no `history.back()` called).
- Global `getElementById` calls for "any"/"cancel"/"backdrop" — id collision hazard if duplicate overlays exist or matching ids present elsewhere.
- Moderator toggle read at click time (not at open time); reflects whatever user set at selection moment.
- `wireRoundPicker(overlay)` called after `appendChild` — round picker wired to live DOM node.
