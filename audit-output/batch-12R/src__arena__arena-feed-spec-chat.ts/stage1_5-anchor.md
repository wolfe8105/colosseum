# Anchor List — arena-feed-spec-chat.ts

Source: src/arena/arena-feed-spec-chat.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. initSpecChat  (line 46)
2. cleanupSpecChat  (line 108)
3. toggleSpecChat  (line 120)
4. loadMessages  (line 129)
5. renderMessages  (line 150)
6. handleSend  (line 180)
7. scrollToBottom  (line 220)

## Resolution notes

Both arbiter runs agreed without reconciliation. No candidates excluded from anchor list. All five stage 1 agents identified the same seven top-level function definitions. The `SpecChatMessage` interface is correctly excluded as a type declaration. Inner callbacks passed to `addEventListener` and `setInterval` are excluded as non-top-level bindings.
