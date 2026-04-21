# Anchor List — profile-debate-archive.render.ts

1. renderTable  (line 13)
2. wireTable  (line 92)

## Resolution notes

- `renderTable`: Confirmed exported function at line 13. Builds archive HTML string, assigns to `container.innerHTML`, then calls `wireTable`.
- `wireTable`: Confirmed non-exported function at line 92. Wires all event listeners on the rendered DOM.
- `const esc = escapeHTML` (line 14): Excluded — local alias inside `renderTable` body, not a top-level binding.
- Inline arrow callbacks inside `wireTable` (lines 94, 100, 103, 107, 117): Excluded — anonymous inline callbacks.
- All import bindings: Excluded — defined elsewhere.
- No module-level side effects. No classes, enums, interfaces, or type aliases.
