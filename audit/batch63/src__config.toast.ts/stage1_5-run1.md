# Anchor List — config.toast.ts

1. showToast  (line 13)

## Resolution notes

No candidates were excluded. All five agents unanimously identified `showToast` as the sole top-level function definition, confirmed by source at line 13 as an exported function declaration. `_toastTimeout` and `_toastKeyframeInjected` are module-level `let` bindings to non-function values and are excluded as non-callable. The `setTimeout` callbacks at lines 62 and 65 are inline callbacks, not top-level named bindings. No additional function definitions were found in the source scan.
