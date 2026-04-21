# Stage 1 Outputs — src/arena/arena-config-category.ts

## Agent 01

### Imports
- `set_selectedCategory` (function) from `./arena-state.ts`
- `set_selectedWantMod` (function) from `./arena-state.ts`
- `QUEUE_CATEGORIES` (constant) from `./arena-constants.ts`
- `pushArenaState` (function) from `./arena-core.utils.ts`
- `enterQueue` (function) from `./arena-queue.ts`
- `roundPickerCSS` (function) from `./arena-config-round-picker.ts`
- `roundPickerHTML` (function) from `./arena-config-round-picker.ts`
- `wireRoundPicker` (function) from `./arena-config-round-picker.ts`

### Exports
- `showCategoryPicker` — function — `(mode: string, topic: string): void` — line 10

### Internal symbols
None.

### External calls
- `document.createElement('div')` — line 11
- `roundPickerCSS()` — line 36 (inside template literal)
- `QUEUE_CATEGORIES.map(...)` — line 43 (inside template literal)
- `roundPickerHTML()` — line 47 (inside template literal)
- `document.body.appendChild(overlay)` — line 56
- `pushArenaState('categoryPicker')` — line 57
- `wireRoundPicker(overlay)` — line 58
- `overlay.querySelectorAll('.arena-cat-btn')` — line 61
- `btn.addEventListener('click', ...)` — line 62 (forEach callback)
- `set_selectedCategory((btn as HTMLElement).dataset.cat ?? null)` — line 63
- `document.getElementById('arena-want-mod-toggle')` — line 64 (category btn handler)
- `set_selectedWantMod(...)` — line 64
- `overlay.remove()` — line 65
- `enterQueue(mode, topic)` — line 66
- `document.getElementById('arena-cat-any')?.addEventListener('click', ...)` — line 71
- `set_selectedCategory(null)` — line 72
- `document.getElementById('arena-want-mod-toggle')` — line 73 (any-btn handler)
- `set_selectedWantMod(...)` — line 73
- `overlay.remove()` — line 74
- `enterQueue(mode, topic)` — line 75
- `document.getElementById('arena-cat-cancel')?.addEventListener('click', ...)` — line 79
- `overlay.remove()` — line 80
- `history.back()` — line 81
- `document.getElementById('arena-cat-backdrop')?.addEventListener('click', ...)` — line 85
- `overlay.remove()` — line 86
- `history.back()` — line 87

---

## Agent 02

### Imports
- `set_selectedCategory`, `set_selectedWantMod` — from `./arena-state.ts`
- `QUEUE_CATEGORIES` — from `./arena-constants.ts`
- `pushArenaState` — from `./arena-core.utils.ts`
- `enterQueue` — from `./arena-queue.ts`
- `roundPickerCSS`, `roundPickerHTML`, `wireRoundPicker` — from `./arena-config-round-picker.ts`

### Exports
- `showCategoryPicker` — function — `(mode: string, topic: string): void` — line 10

### Internal symbols
None.

### External calls
- `document.createElement('div')` — line 11
- `roundPickerCSS()` — line 38 (inside template literal)
- `QUEUE_CATEGORIES.map(...)` — line 44 (inside template literal)
- `Array.prototype.join('')` — line 48 (chained on .map())
- `roundPickerHTML()` — line 49 (inside template literal)
- `document.body.appendChild(overlay)` — line 55
- `pushArenaState('categoryPicker')` — line 56
- `wireRoundPicker(overlay)` — line 57
- `overlay.querySelectorAll('.arena-cat-btn')` — line 60
- `btn.addEventListener('click', ...)` — line 61
- `set_selectedCategory((btn as HTMLElement).dataset.cat ?? null)` — line 62
- `document.getElementById('arena-want-mod-toggle')` — line 63 (category btn handler)
- `set_selectedWantMod(...)` — line 63
- `overlay.remove()` — line 64
- `enterQueue(mode, topic)` — line 65
- `document.getElementById('arena-cat-any')` — line 69
- `set_selectedCategory(null)` — line 70
- `document.getElementById('arena-want-mod-toggle')` — line 71 (any-btn handler)
- `set_selectedWantMod(...)` — line 71
- `overlay.remove()` — line 72
- `enterQueue(mode, topic)` — line 73
- `document.getElementById('arena-cat-cancel')` — line 76
- `overlay.remove()` — line 77
- `history.back()` — line 78
- `document.getElementById('arena-cat-backdrop')` — line 81
- `overlay.remove()` — line 82
- `history.back()` — line 83

---

## Agent 03

### Imports
- `set_selectedCategory` (function) from `./arena-state.ts`
- `set_selectedWantMod` (function) from `./arena-state.ts`
- `QUEUE_CATEGORIES` (constant) from `./arena-constants.ts`
- `pushArenaState` (function) from `./arena-core.utils.ts`
- `enterQueue` (function) from `./arena-queue.ts`
- `roundPickerCSS` (function) from `./arena-config-round-picker.ts`
- `roundPickerHTML` (function) from `./arena-config-round-picker.ts`
- `wireRoundPicker` (function) from `./arena-config-round-picker.ts`

### Exports
- `showCategoryPicker` — function — `(mode: string, topic: string): void` — line 10

### Internal symbols
None.

### External calls
- `document.createElement('div')` — line 11
- `roundPickerCSS()` — line 36 (inside template literal)
- `QUEUE_CATEGORIES.map(...)` — line 44 (inside template literal)
- `roundPickerHTML()` — line 49 (inside template literal)
- `document.body.appendChild(overlay)` — line 57
- `pushArenaState('categoryPicker')` — line 58
- `wireRoundPicker(overlay)` — line 59
- `overlay.querySelectorAll('.arena-cat-btn')` — line 62
- `btn.addEventListener('click', ...)` — line 63
- `set_selectedCategory((btn as HTMLElement).dataset.cat ?? null)` — line 64
- `document.getElementById('arena-want-mod-toggle')` — line 65 (category btn handler)
- `set_selectedWantMod(...)` — line 65
- `overlay.remove()` — line 66
- `enterQueue(mode, topic)` — line 67
- `document.getElementById('arena-cat-any')?.addEventListener('click', ...)` — line 71
- `set_selectedCategory(null)` — line 72
- `document.getElementById('arena-want-mod-toggle')` — line 73 (any-btn handler)
- `set_selectedWantMod(...)` — line 73
- `overlay.remove()` — line 74
- `enterQueue(mode, topic)` — line 75
- `document.getElementById('arena-cat-cancel')?.addEventListener('click', ...)` — line 78
- `overlay.remove()` — line 79
- `history.back()` — line 80
- `document.getElementById('arena-cat-backdrop')?.addEventListener('click', ...)` — line 83
- `overlay.remove()` — line 84
- `history.back()` — line 85

---

## Agent 04

### Imports
- `set_selectedCategory` — from `./arena-state.ts`
- `set_selectedWantMod` — from `./arena-state.ts`
- `QUEUE_CATEGORIES` — from `./arena-constants.ts`
- `pushArenaState` — from `./arena-core.utils.ts`
- `enterQueue` — from `./arena-queue.ts`
- `roundPickerCSS` — from `./arena-config-round-picker.ts`
- `roundPickerHTML` — from `./arena-config-round-picker.ts`
- `wireRoundPicker` — from `./arena-config-round-picker.ts`

### Exports
- `showCategoryPicker` — function — `(mode: string, topic: string): void` — line 10

### Internal symbols
None.

### External calls
- `document.createElement('div')` — line 11
- `QUEUE_CATEGORIES.map(c => ...)` — inside innerHTML template literal, lines 12–54
- `roundPickerCSS()` — inside innerHTML template literal, lines 12–54
- `roundPickerHTML()` — inside innerHTML template literal, lines 12–54
- `document.body.appendChild(overlay)` — line 55
- `pushArenaState('categoryPicker')` — line 56
- `wireRoundPicker(overlay)` — line 57
- `overlay.querySelectorAll('.arena-cat-btn')` — line 60
- `Array.prototype.forEach(...)` — line 60
- `btn.addEventListener('click', ...)` — lines 60–67
- `set_selectedCategory((btn as HTMLElement).dataset.cat ?? null)` — line 62
- `document.getElementById('arena-want-mod-toggle')` — line 63 (category btn handler)
- `set_selectedWantMod(...)` — line 63
- `overlay.remove()` — line 64
- `enterQueue(mode, topic)` — line 65
- `document.getElementById('arena-cat-any')` — line 70
- `EventTarget.addEventListener('click', ...)` — line 70
- `set_selectedCategory(null)` — line 71
- `document.getElementById('arena-want-mod-toggle')` — line 72 (any-category handler)
- `set_selectedWantMod(...)` — line 72
- `overlay.remove()` — line 73
- `enterQueue(mode, topic)` — line 74
- `document.getElementById('arena-cat-cancel')` — line 78
- `EventTarget.addEventListener('click', ...)` — line 78
- `overlay.remove()` — line 79
- `history.back()` — line 80
- `document.getElementById('arena-cat-backdrop')` — line 84
- `EventTarget.addEventListener('click', ...)` — line 84
- `overlay.remove()` — line 85
- `history.back()` — line 86

---

## Agent 05

### Imports
- `set_selectedCategory` (function) from `./arena-state.ts`
- `set_selectedWantMod` (function) from `./arena-state.ts`
- `QUEUE_CATEGORIES` (constant) from `./arena-constants.ts`
- `pushArenaState` (function) from `./arena-core.utils.ts`
- `enterQueue` (function) from `./arena-queue.ts`
- `roundPickerCSS` (function) from `./arena-config-round-picker.ts`
- `roundPickerHTML` (function) from `./arena-config-round-picker.ts`
- `wireRoundPicker` (function) from `./arena-config-round-picker.ts`

### Exports
- `showCategoryPicker` — function — `(mode: string, topic: string): void` — line 10

### Internal symbols
None.

### External calls
- `document.createElement('div')` — line 11
- `roundPickerCSS()` — line 36 (inside template literal style block)
- `QUEUE_CATEGORIES.map(c => ...)` — line 43 (inside template literal)
- `roundPickerHTML()` — line 49 (inside template literal HTML)
- `document.body.appendChild(overlay)` — line 56
- `pushArenaState('categoryPicker')` — line 57
- `wireRoundPicker(overlay)` — line 58
- `overlay.querySelectorAll('.arena-cat-btn')` — line 61
- `btn.addEventListener('click', ...)` — line 62
- `set_selectedCategory((btn as HTMLElement).dataset.cat ?? null)` — line 63
- `document.getElementById('arena-want-mod-toggle')` — line 64 (category btn handler)
- `set_selectedWantMod(...)` — line 64
- `overlay.remove()` — line 65
- `enterQueue(mode, topic)` — line 66
- `document.getElementById('arena-cat-any')?.addEventListener('click', ...)` — line 71
- `set_selectedCategory(null)` — line 72
- `document.getElementById('arena-want-mod-toggle')` — line 73 (any-btn handler)
- `set_selectedWantMod(...)` — line 73
- `overlay.remove()` — line 74
- `enterQueue(mode, topic)` — line 75
- `document.getElementById('arena-cat-cancel')?.addEventListener('click', ...)` — line 79
- `overlay.remove()` — line 80
- `history.back()` — line 81
- `document.getElementById('arena-cat-backdrop')?.addEventListener('click', ...)` — line 85
- `overlay.remove()` — line 86
- `history.back()` — line 87
