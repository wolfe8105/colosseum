# Anchor List — spectate.chat.ts (Arbiter Run 2)

1. renderChatMessages (line 12)
2. refreshChatUI (line 24)
3. wireChatUI (line 38)
4. sendChat (line 58)
5. startChatPolling (line 114)

## Resolution notes
- header click arrow (line 41): anonymous arrow to addEventListener; excluded
- setTimeout arrow (line 80): anonymous arrow to setTimeout; excluded
- keydown arrow (lines 106–111): anonymous arrow to addEventListener; excluded
- sendBtn click (line 105): reference to sendChat, not a new declaration; excluded
- setInterval async arrow (lines 116–132): anonymous async arrow to setInterval; excluded
- filter arrow (line 122): anonymous arrow to Array.filter; excluded
- sendChat INCLUDED: named `async function` declaration with substantive logic — sending guard, safeRpc call, 3-branch error handling. Visible from outside wireChatUI via direct reference on line 105.
