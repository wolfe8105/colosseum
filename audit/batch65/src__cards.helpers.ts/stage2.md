# Stage 2 Outputs — cards.helpers.ts

## Agent 01

### truncLabel

`truncLabel` accepts `str: unknown` and `max: number`, returns `string`. First it coerces `str` to a string: `str ?? ''` substitutes empty string for `null`/`undefined` before `String()` is called; any other value is coerced by `String()` normally (e.g., objects → `'[object Object]'`, booleans → `'true'`/`'false'`). The coerced string is stored in `s`. If `s.length > max`, it returns `s.slice(0, max - 1) + '…'` — exactly `max` characters. If `s.length <= max`, `s` is returned unchanged. Edge cases: `max=0` → `s.slice(0, -1) + '…'` (drops last char, appends ellipsis); `max=1` → `'' + '…'` = `'…'`; negative `max` → slice from start to negative index → `'' + '…'`; `NaN` max → condition false, returns s unchanged. No exceptions thrown. Always returns a string.

### roundRect

`roundRect` takes `ctx: CanvasRenderingContext2D, x, y, w, h, r: number`, returns `void`. Does NOT call `ctx.beginPath()` — appends to whatever path is currently open. Does NOT call `ctx.stroke()` or `ctx.fill()` — purely path construction. Ten operations in order: `moveTo(x+r, y)` → `lineTo(x+w-r, y)` → `arcTo(x+w, y, x+w, y+r, r)` (top-right corner) → `lineTo(x+w, y+h-r)` → `arcTo(x+w, y+h, x+w-r, y+h, r)` (bottom-right) → `lineTo(x+r, y+h)` → `arcTo(x, y+h, x, y+h-r, r)` (bottom-left) → `lineTo(x, y+r)` → `arcTo(x, y, x+r, y, r)` (top-left) → `closePath()`. Clockwise wound. If `r > min(w,h)/2`, arcs geometrically overlap — canvas silently clamps, no exception. `r=0` degenerates to sharp rectangle. All canvas path methods are infallible.

### wrapText

`wrapText` takes `ctx: CanvasRenderingContext2D, text: string, maxWidth: number`, returns `string[]`. `String(text).split(' ')` produces the words array; consecutive spaces produce empty-string tokens. `forEach` loop builds lines greedily: `test = line + (line ? ' ' : '') + word`; if `ctx.measureText(test).width > maxWidth && line` (both conditions), push `line` to `lines` and reset `line = word`; else `line = test`. The `&& line` guard prevents infinite loops when a single word exceeds `maxWidth` — such a word is placed on its own line as-is. After loop, `if (line) lines.push(line)` — empty string not pushed. If `lines.length > 3`, truncate `lines.length = 3`, then `lines[2] = (lines[2] ?? '').replace(/\s+\S*$/, '') + '…'` — strips last whitespace+word, appends ellipsis. `?? ''` is defensive dead code when array has exactly 3 elements. Returns 0–3 strings. Empty string input → `[]`.

### validateSize

`validateSize` takes `size: string | undefined`, returns `CardSize`. `VALID_SIZES` is built once at module load as `new Set(Object.keys(SIZES))` — contains exactly the string keys of `SIZES` from `cards.types.ts`. At call time, `size ?? ''` converts `undefined` to `''` for lookup. `VALID_SIZES.has(size ?? '')` → if true, returns `size as CardSize` (TypeScript-only cast, no runtime effect); if false, returns `'og'` as default. Pure function: no side effects, no exceptions, always returns a valid `CardSize`.

---

## Agent 02

### truncLabel

`truncLabel(str: unknown, max: number): string`. Coerces `str`: `null`/`undefined` → `''` via `?? ''` before `String()`; all others go through `String()` normally. If `s.length > max`: returns `s.slice(0, max - 1) + '…'`. If `s.length <= max`: returns `s`. `max=0`: returns `'…'` alone. `max=1`: returns `'…'`. Surrogate pairs counted as 2 by `.length`. No exceptions, always returns string.

### roundRect

No `ctx.beginPath()`. No `ctx.stroke()`/`ctx.fill()`. Appends to open path. Ten commands: moveTo top-left inset, lineTo to top-right inset, arcTo top-right corner (control: corner point, end: right edge inset), lineTo right edge, arcTo bottom-right corner, lineTo bottom edge, arcTo bottom-left corner, lineTo left edge, arcTo top-left corner, closePath. Clockwise. Canvas API infallible. Returns void.

### wrapText

`String(text).split(' ')` — no-op coercion but guards non-string. `forEach` builds lines greedily with pixel measurement via `ctx.measureText`. Single word > `maxWidth` placed on its own line (`&& line` guard). After loop, flush non-empty `line`. Hard-cap: `lines.length > 3` → truncate to 3, strip last word from `lines[2]` via `/\s+\S*$/`, append `'…'`. Empty text → `[]`. Returns 0–3 strings.

### validateSize

`VALID_SIZES` set built at module load. `size ?? ''` handles `undefined`. Set membership test: hit → return `size as CardSize`; miss → return `'og'`. `as CardSize` is compile-time only. Pure, infallible.

---

## Agent 03

### truncLabel

`str: unknown` → `String(str ?? '')`: `null`/`undefined` → `''`, others by `String()`. If `s.length > max`: `s.slice(0, max-1) + '…'`, length = max. If `s.length <= max`: `s` unchanged. No guards on `max`. If `max=NaN`: `s.length > NaN` is `false`, returns `s` unchanged. Always returns string.

### roundRect

No `beginPath()` called. Appends to existing path. 10 path operations: moveTo top-edge start → lineTo top-right inset → arcTo top-right arc → lineTo right edge → arcTo bottom-right arc → lineTo bottom edge → arcTo bottom-left arc → lineTo left edge → arcTo top-left arc → closePath. Returns void. Caller must beginPath/stroke/fill. Overlapping arcs when r > w/2 or h/2: no error, degenerate geometry.

### wrapText

`String(text).split(' ')`. Greedy word-wrap with `ctx.measureText`. `test = line + (line ? ' ' : '') + word`. Two-condition line-break: width > maxWidth AND line non-empty. Word alone wider than maxWidth: placed on own line. Flush non-empty line after loop. Truncate at 3: `lines.length = 3`, then strip last word from `lines[2]` with `/\s+\S*$/` + `'…'`. 0–3 strings. Empty input → `[]`.

### validateSize

Module-level `VALID_SIZES` set. `size ?? ''` for undefined. `.has()` → valid: return `size as CardSize`; invalid: return `'og'`. Pure.

---

## Agent 04

### truncLabel

`str: unknown`, `max: number`. `String(str ?? '')`: null/undefined → ''. `s.length > max`: `s.slice(0, max-1) + '…'`. `s.length <= max`: return `s`. `max=0`: `s.slice(0, -1)` + '…' (result may not be max length). `max=NaN`: condition false, returns `s`. Always string, no exceptions.

### roundRect

No `beginPath()`. No stroke/fill. 10 canvas path calls (9 line/arc + closePath). moveTo → lineTo (top) → arcTo (TR) → lineTo (right) → arcTo (BR) → lineTo (bottom) → arcTo (BL) → lineTo (left) → arcTo (TL) → closePath. Void return. r > half dimension: degenerate but no error. Appends to existing path if beginPath not called by caller.

### wrapText

`String(text).split(' ')`. forEach: test = line + space + word if line non-empty. measureText for width. Break if width > maxWidth && line truthy. Single wide word: placed on own line (line empty, && guard fails). Flush line after loop. `lines.length > 3`: truncate to 3, `lines[2].replace(/\s+\S*$/, '') + '…'`. Returns string[]. Empty → [].

### validateSize

Module-level VALID_SIZES from Object.keys(SIZES). `size ?? ''` → .has() → valid: size as CardSize; else 'og'. Compile-time cast only. Pure.

---

## Agent 05

### truncLabel

`str: unknown, max: number → string`. `String(str ?? '')`: null/undefined → ''. `s.length > max`: `s.slice(0, max-1) + '…'` = max chars. `s.length <= max`: s unchanged. `max=0`: '…'. `max=1`: '…'. Boundary: `s.length === max` → not truncated, no ellipsis. `max=NaN`: false condition, returns s. No exception.

### roundRect

No `ctx.beginPath()`. No stroke/fill. 10 ops: moveTo(x+r,y), lineTo(x+w-r,y), arcTo top-right, lineTo right edge, arcTo bottom-right, lineTo bottom edge, arcTo bottom-left, lineTo left edge, arcTo top-left, closePath. Appends to current path. Caller must beginPath/stroke/fill. r=0 → sharp rectangle. r > w/2 or h/2 → malformed arcs, no error. Void.

### wrapText

`String(text).split(' ')`. Greedy fill with `ctx.measureText`. `test = line + (line ? ' ' : '') + word`. `width > maxWidth && line` → flush line, start new with word. Single word > maxWidth: never broken, placed on own line. Flush trailing line if truthy. `lines.length > 3`: `lines.length = 3`, then `lines[2] = (lines[2] ?? '').replace(/\s+\S*$/, '') + '…'`. If lines[2] is single word with no spaces, regex matches nothing, just '…' appended. 0–3 strings. '' → [].

### validateSize

VALID_SIZES = new Set(Object.keys(SIZES)), built at module load. `size ?? ''` for undefined. has() → true: `size as CardSize` (compile-time cast, no runtime effect); false: `'og'`. Pure, no side effects.
