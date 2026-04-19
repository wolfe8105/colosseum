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

- notificationsModule (line 404): top-level `const` bound to an object literal, not a function definition; excluded
- anonymous arrow in `ready.then(() => init()).catch(() => init())` (line 424): inline callbacks, not named top-level bindings; excluded
- anonymous click handler inside `createPanel` (line 176, forEach callback): inner callback, not top-level; excluded
- anonymous click handler inside `createPanel` for notif-list (line 191): inner callback wired via addEventListener, not top-level; excluded
- anonymous arrow inside `markRead` `.then(...)` (line 287): inner callback, not top-level; excluded
- anonymous arrow inside `markAllRead` `.then(...)` (line 307): inner callback, not top-level; excluded
- anonymous arrow inside `open` `requestAnimationFrame(...)` (line 255): inner callback, not top-level; excluded
- anonymous arrow inside `close` `setTimeout(...)` (line 267): inner callback, not top-level; excluded
