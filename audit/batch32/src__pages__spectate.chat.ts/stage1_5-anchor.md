# Anchor List — spectate.chat.ts

Source: src/pages/spectate.chat.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. renderChatMessages  (line 12)
2. refreshChatUI  (line 24)
3. wireChatUI  (line 38)
4. sendChat  (line 58)
5. startChatPolling  (line 114)

## Resolution notes

Both arbiter runs agreed. All five are function declarations confirmed in source. Excluded: header click arrow (line 41), setTimeout arrow (line 80), keydown arrow (lines 106–111), setInterval async arrow (lines 116–132), filter arrow (line 122) — all anonymous callbacks to addEventListener/setInterval/setTimeout/Array.filter. `sendChat` at line 58 included: named `async function` declaration with independent audit surface.
