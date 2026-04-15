# Anchor List — notifications.ts (Arbiter Run 2)

1. timeAgo  (line 93)
2. getPlaceholderNotifs  (line 116)
3. createPanel  (line 132)
4. renderList  (line 197)
5. open  (line 248)
6. close  (line 261)
7. markRead  (line 277)
8. markAllRead  (line 295)
9. updateBadge  (line 316)
10. startPolling  (line 325)
11. destroy  (line 332)
12. fetchNotifications  (line 343)
13. bindBellButton  (line 372)
14. init  (line 386)

## Resolution notes

Independent verification against source. No discrepancies from proposed list. Exclusions confirmed correct: `TYPES` (object literal `as const`), `ECONOMY_TYPES` (`new Set(...)`), state variables (`notifications`, `unreadCount`, `pollInterval`, `panelOpen`), and `notificationsModule` (`{ init, open, close, ... } as const`). The top-level `ready.then(...)` expression statement is not a named callable binding and was correctly absent. All 14 entries are `function` declarations at module scope (7 exported, 7 module-private).
