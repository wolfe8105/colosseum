# Anchor List — notifications.ts (Arbiter Run 1)

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

No discrepancies from the proposed Stage 1 list. All 14 entries confirmed: `TYPES` (object literal, line 55), `ECONOMY_TYPES` (Set, line 72), state variables (lines 83–86), and `notificationsModule` (object literal, line 404) are all correctly excluded. No arrow-function or function-expression `const` bindings exist at module scope in this file. All module-scope functions use the `function` keyword.
