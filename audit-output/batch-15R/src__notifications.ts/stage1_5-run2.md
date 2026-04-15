# Anchor List — src/notifications.ts

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

- `TYPES` — excluded; top-level `const` bound to an object literal (a data record), not a function.
- `ECONOMY_TYPES` — excluded; top-level `const` bound to a `new Set(...)` expression, not a function.
- `notifications`, `unreadCount`, `pollInterval`, `panelOpen` — excluded; plain mutable state variables, not functions.
- `notificationsModule` — excluded; `const` bound to an object literal collecting already-listed functions, not itself a function definition.
- `NotificationType`, `NotificationTypeInfo`, `Notification`, `NotificationFilter` — excluded; type aliases and interfaces, not callable bindings.
- Arrow callbacks inside `createPanel` (`addEventListener` handlers, `.forEach` callback, delegated click handler) — excluded; inner callbacks, not top-level named bindings.
- `.map` callback inside `renderList` — excluded; inline callback passed to array method.
- `ready.then(() => init()).catch(() => init())` — excluded; top-level expression statement, not a named function definition.
- `(window as any).ColosseumNotifications = notificationsModule` — excluded; assignment expression, not a function definition.
