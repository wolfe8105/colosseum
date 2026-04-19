# Anchor List — voicememo.ts

Source: src/voicememo.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. recordTake  (line 44)
2. replyToTake  (line 48)
3. debateReply  (line 52)
4. _currentUsername  (line 58)
5. _truncate  (line 59)
6. isEnabled  (line 64)

## Resolution notes

Both arbiter runs agreed on the same 6 functions. All imported/re-exported names excluded (not defined in this file). The voicememo const object (line 72) is an object literal, not a function. Arrow at line 76 and getters at lines 90–91 are object-literal methods, not top-level bindings.
