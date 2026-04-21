# Stage 1 — Primitive Inventory: profile-debate-archive.render.ts

Source: src/profile-debate-archive.render.ts (128 lines)
Agents: 5 (independent, parallel)
Consensus: unanimous — all 5 agents identified the same 2 callable bindings

---

## Callable Bindings (all agents agree)

- `renderTable` (line 13): Exported function. Builds the full debate archive table HTML via template literals (with `escapeHTML` on all user-derived fields), sets `container.innerHTML`, then calls `wireTable`.
- `wireTable` (line 92): Module-private (non-exported) function. Wires all event listeners on the rendered container: search input, filter chips (result/category), row clicks (ad interstitial + `window.open`), add button, and data-action handlers (edit/toggle-hide/remove).

---

## Excluded (all agents agree)

- All import bindings: not defined in this file
- `const esc = escapeHTML` inside `renderTable`: local alias to imported function, not a module-scope callable binding
- Local variables inside `renderTable` (`rows`, `cats`, `html`, per-row temporaries): not callable bindings
- Inline anonymous arrow callbacks inside `wireTable` (input handler, chip click handlers, row click handler, add-btn handler, action-btn handler): anonymous, not top-level named bindings
- No interfaces, type aliases, or module-level const/let non-function bindings in this file
- `wireTable` is called from `renderTable`, not at module load time — correctly included as a named callable, not a side effect
