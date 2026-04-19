# Anchor List — notifications.ts

Source: src/notifications.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

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

Both arbiter runs agreed exactly. No reconciliation needed. All 14 entries are confirmed top-level named callable function declarations at module scope. No `const`-to-arrow-function bindings exist in this file. Excluded: `TYPES` (object literal, line 55), `ECONOMY_TYPES` (Set, line 72), four `let` state variables (lines 83–86), and `notificationsModule` (object literal, line 404). 7 functions are exported (`timeAgo`, `open`, `close`, `markRead`, `markAllRead`, `destroy`, `init`); 7 are module-private (`getPlaceholderNotifs`, `createPanel`, `renderList`, `updateBadge`, `startPolling`, `fetchNotifications`, `bindBellButton`).
