# Anchor List — config.toast.ts

1. showToast  (line 13)

## Resolution notes

- `_toastTimeout`: excluded — module-level `let` binding to a value (`null`), not a function definition.
- `_toastKeyframeInjected`: excluded — module-level `let` binding to a value (`false`), not a function definition.
- The two inline `setTimeout` callbacks (lines 62 and 65): excluded — anonymous callbacks passed inline, not top-level named bindings.
