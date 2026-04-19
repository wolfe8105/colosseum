# Anchor List — cosmetics.modal.ts

Source: src/pages/cosmetics.modal.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. initModalCallbacks  (line 19)
2. openConfirmModal  (line 29)
3. closeConfirmModal  (line 55)
4. executePurchase  (line 59)
5. handleEquip  (line 84)
6. showInfoModal  (line 109)
7. closeInfoModal  (line 115)

## Resolution notes

No candidates excluded. `_getTokenBalance`, `_setTokenBalance`, `_rerenderTab` are module-level let bindings holding default arrow functions — private mutable state, not named callable exports. Inline callbacks (onclick line 51, forEach line 100) excluded per method rules.
