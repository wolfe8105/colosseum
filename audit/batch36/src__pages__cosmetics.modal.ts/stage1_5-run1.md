# Anchor List — cosmetics.modal.ts

1. initModalCallbacks  (line 19)
2. openConfirmModal  (line 29)
3. closeConfirmModal  (line 55)
4. executePurchase  (line 59)
5. handleEquip  (line 84)
6. showInfoModal  (line 109)
7. closeInfoModal  (line 115)

## Resolution notes

No candidates were excluded. All five agents identified the same seven function definitions unanimously, and direct source inspection confirms each one is a top-level exported function declaration. The three module-level `let` bindings (`_getTokenBalance`, `_setTokenBalance`, `_rerenderTab`) are value bindings initialized to arrow function literals — they are private mutable state, not named callable top-level definitions.
