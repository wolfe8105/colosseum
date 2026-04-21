# Anchor List — config.toast.ts

Source: src/config.toast.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. showToast  (line 13)

## Resolution notes

All five Stage 1 agents unanimously identified `showToast` as the sole top-level function definition. Both arbiter runs agreed. `_toastTimeout` and `_toastKeyframeInjected` are module-level let bindings to non-function values (null, false). The setTimeout callbacks at lines 62 and 65 are anonymous inline callbacks, not top-level named bindings.
