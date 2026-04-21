# Anchor List — arena-mod-debate-picker.ts

Source: src/arena/arena-mod-debate-picker.ts
Produced by: stage 1.5 (arbiter, both runs agreed)
Unresolved items: 0

1. showModDebatePicker  (line 12)
2. createModDebate  (line 89)

## Resolution notes
- Inline async IIFE inside `#mod-debate-picker-back` click listener is a callback, not a top-level named binding.
- All imports excluded (not function definitions in this file).
