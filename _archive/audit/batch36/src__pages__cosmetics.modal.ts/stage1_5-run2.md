# Anchor List — cosmetics.modal.ts

1. initModalCallbacks  (line 19)
2. openConfirmModal  (line 29)
3. closeConfirmModal  (line 55)
4. executePurchase  (line 59)
5. handleEquip  (line 84)
6. showInfoModal  (line 109)
7. closeInfoModal  (line 115)

## Resolution notes

All five agents agreed unanimously on the same seven function definitions. No candidates excluded. No additional top-level function definitions found during direct source scan.

- `_getTokenBalance`, `_setTokenBalance`, `_rerenderTab` (lines 15–17): module-level `let` bindings holding callback placeholders — mutable variables, not named callable exports.
- Anonymous `() => executePurchase(...)` (line 51): inline callback assigned to `confirmBtn.onclick`.
- `forEach` callback (line 100): inline callback, not a named top-level binding.
