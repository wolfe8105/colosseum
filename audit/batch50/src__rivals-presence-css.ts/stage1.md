# Stage 1 — rivals-presence-css.ts

## Agent 01

### Primitive Inventory

| Line | Primitive | Detail |
|------|-----------|--------|
| 1–6 | block comment | JSDoc header — module description, F-25 tag, leaf module note |
| 7 | blank | — |
| 8–100 | bind name to function definition (exported) | `injectRivalsPresenceCSS` — `export function injectRivalsPresenceCSS(): void` |

### Sub-inventory: injectRivalsPresenceCSS (lines 8–100)

| Line | Primitive | Detail |
|------|-----------|--------|
| 9 | conditional early return | `if (document.getElementById('rival-presence-css')) return` — idempotency guard |
| 10 | bind name to value | `const style = document.createElement('style')` |
| 11 | property write | `style.id = 'rival-presence-css'` |
| 12–98 | property write | `style.textContent = \`...\`` — multi-line CSS template literal |
| 13–18 | CSS rule | `@keyframes rivalSlideIn` (4 keyframe stops) |
| 19–22 | CSS rule | `@keyframes rivalSlideOut` (2 keyframe stops) |
| 23–38 | CSS rule | `#rival-alert-popup` base — position fixed, top 80px, left 50%, z-index 99998, background linear-gradient with hardcoded hex `#1a0a0a`/`#2d0a0a` (TODO comment), border/border-radius, animation |
| 35 | CSS value | `box-shadow` includes `rgba(204,41,54,0.4)` — hardcoded color value |
| 37 | CSS value | `font-family: var(--mod-font-ui)` — uses CSS var token |
| 39–41 | CSS rule | `#rival-alert-popup.dismissing` — rivalSlideOut animation |
| 42–46 | CSS rule | `.rap-icon` |
| 47–54 | CSS rule | `.rap-title` — uses `var(--mod-magenta)` |
| 55–62 | CSS rule | `.rap-name` — uses `var(--mod-text-heading)` |
| 63–68 | CSS rule | `.rap-sub` — uses `var(--mod-text-sub)` |
| 69–72 | CSS rule | `.rap-actions` |
| 73–85 | CSS rule | `.rap-challenge` — uses `var(--mod-magenta)`, `var(--mod-text-on-accent)`, `var(--mod-font-display)` |
| 86–97 | CSS rule | `.rap-dismiss` — uses `var(--mod-bg-subtle)`, `var(--mod-text-sub)`, `var(--mod-border-primary)`, `var(--mod-font-ui)` |
| 99 | function call (side effect) | `document.head.appendChild(style)` |

### Imports
None.

---

## Agent 02

### Primitive Inventory

| Line | Primitive | Detail |
|------|-----------|--------|
| 1–6 | doc comment | Module header |
| 8 | export declaration | `export function injectRivalsPresenceCSS(): void` |
| 9 | branch (if + early return) | getElementById idempotency guard |
| 10 | variable binding | `const style` = createElement('style') |
| 11 | assignment | `style.id` |
| 12–98 | assignment | `style.textContent` = template literal CSS string |
| 99 | method call | `document.head.appendChild(style)` |

### Notable literals in textContent
- `@keyframes rivalSlideIn` — slide-in animation
- `@keyframes rivalSlideOut` — slide-out animation
- `#rival-alert-popup` selector block: `background: linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 50%, #1a0a0a 100%)` with `/* TODO: needs CSS var token */`
- `box-shadow: 0 0 30px rgba(204,41,54,0.4), ...` — hardcoded color
- All other color values use `var(--mod-*)` tokens

---

## Agent 03

### Primitive Inventory

| Category | Count | Lines |
|----------|-------|-------|
| Block comment (module header) | 1 | 1–6 |
| Exported function declaration | 1 | 8–100 |
| getElementById call (guard) | 1 | 9 |
| createElement call | 1 | 10 |
| Property assignments | 3 | 11, 11, 12–98 |
| appendChild call | 1 | 99 |
| Template literal (CSS) | 1 | 12–98 |

No imports. No other top-level bindings. Single function.

---

## Agent 04

### Primitive Inventory

Lines 1–6: module-level block comment.
Line 8: exported function `injectRivalsPresenceCSS`, return type void, no parameters.
Line 9: idempotency guard — reads `document.getElementById('rival-presence-css')`, early return if truthy.
Line 10: `const style` — `document.createElement('style')`.
Lines 11–98: property writes on `style` — `.id` and `.textContent`.
`.textContent` is a CSS template literal string. Contains:
  - Two `@keyframes` blocks (rivalSlideIn, rivalSlideOut)
  - `#rival-alert-popup` base rule: hardcoded `background: linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 50%, #1a0a0a 100%)` (TODO comment present), `box-shadow` includes `rgba(204,41,54,0.4)` (hardcoded)
  - Remaining selectors use exclusively `var(--mod-*)` CSS custom properties
Line 99: `document.head.appendChild(style)`.

---

## Agent 05

### Primitive Inventory

**Top-level declarations**: 1 exported function (`injectRivalsPresenceCSS`, line 8).
**Imports**: None.

**Function body primitives**:
- Line 9: early-return guard via `getElementById` — prevents double injection
- Lines 10–11: style element created, id assigned
- Lines 12–98: `textContent` assigned a template literal containing raw CSS:
  - `@keyframes rivalSlideIn` (lines 13–18)
  - `@keyframes rivalSlideOut` (lines 19–22)
  - `#rival-alert-popup` rule (lines 23–38): **3 hardcoded color values** — `#1a0a0a`, `#2d0a0a`, `rgba(204,41,54,0.4)`. All other properties use `var(--mod-*)` tokens.
  - Child selectors (lines 39–97): `.dismissing`, `.rap-icon`, `.rap-title`, `.rap-name`, `.rap-sub`, `.rap-actions`, `.rap-challenge`, `.rap-dismiss` — all use `var(--mod-*)` tokens exclusively
- Line 99: `document.head.appendChild(style)` — attaches to DOM
