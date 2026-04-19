# Anchor List — powerups.activation.ts (Run 2)

1. renderActivationBar  (line 11)
2. wireActivationBar  (line 34)

## Resolution notes

Two exported function declarations confirmed as top-level named callable bindings. renderActivationBar accepts EquippedItem[] and returns string. wireActivationBar accepts debateId string and ActivationCallbacks and returns void. Anonymous functions within forEach and addEventListener are not top-level. No candidates excluded.
