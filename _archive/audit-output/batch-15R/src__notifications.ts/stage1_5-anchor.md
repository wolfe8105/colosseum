# Anchor List — src/notifications.ts

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

Both arbiter runs agreed on all 14 entries. No reconciliation needed.

Excluded candidates:
- `TYPES` — top-level `const` bound to object literal, not a function
- `ECONOMY_TYPES` — top-level `const` bound to `new Set(...)`, not a function
- `notifications`, `unreadCount`, `pollInterval`, `panelOpen` — plain mutable state variables, not functions
- `notificationsModule` — `const` bound to object literal, not a function definition
- `NotificationType`, `NotificationTypeInfo`, `Notification`, `NotificationFilter` — type aliases and interfaces
- Inner callbacks inside `createPanel`, `renderList`, `markRead`, `markAllRead`, `open`, `close` — not top-level named bindings
- `ready.then(...)` — top-level expression statement, not a named function definition
- `(window as any).ColosseumNotifications = notificationsModule` — assignment expression, not a function definition
