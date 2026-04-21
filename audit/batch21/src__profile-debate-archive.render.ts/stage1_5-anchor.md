# Anchor List — profile-debate-archive.render.ts

Source: src/profile-debate-archive.render.ts
Produced by: stage 1.5 (arbiter runs 1 and 2 agreed; no reconciliation)
Unresolved items: 0

1. renderTable  (line 13)
2. wireTable  (line 92)

## Resolution notes

- `renderTable`: Exported top-level named function. Builds archive table HTML, sets container.innerHTML, calls wireTable.
- `wireTable`: Non-exported top-level named function. Wires event listeners on rendered DOM.
- `const esc = escapeHTML` inside renderTable body: excluded — local alias, not module-scope callable.
- Inline arrow callbacks inside wireTable: excluded — anonymous, not named bindings.
- All import bindings: excluded — not defined in this file.
- No interfaces, type aliases, const value bindings, or module-level side effects.
- Both arbiter runs independently produced the same 2-entry anchor list.
