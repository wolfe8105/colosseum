# Anchor List — arena-feed-spec-chat.ts

1. initSpecChat  (line 46)
2. cleanupSpecChat  (line 108)
3. toggleSpecChat  (line 120)
4. loadMessages  (line 129)
5. renderMessages  (line 150)
6. handleSend  (line 180)
7. scrollToBottom  (line 220)

## Resolution notes

- `SpecChatMessage` — excluded; it is an interface (type declaration), not a callable function definition.
- All five agents agreed on exactly these seven function definitions. No candidates were proposed by any agent that were excluded, and no additional top-level function definitions were found in the source file that any agent missed.
- Inner arrow callbacks (`() => void handleSend()`, `(e) => { ... }`, `() => void loadMessages()`) — excluded; these are inline callbacks passed to `addEventListener` and `setInterval`, not top-level named bindings.
