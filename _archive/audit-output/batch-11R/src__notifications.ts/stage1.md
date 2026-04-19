# Stage 1 Outputs — notifications.ts

## Agent 01

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

Resolution notes: `TYPES` and `ECONOMY_TYPES` are excluded as non-function `const` bindings (a `Record` object literal and a `Set`, respectively). The `notificationsModule` const at line 404 is excluded because its initializer is an object literal, not an arrow function or function expression — even though it references functions, the binding itself is not callable. The `NotificationType`, `NotificationTypeInfo`, `Notification`, and `NotificationFilter` declarations are excluded as type aliases and interfaces. The module-level `let` bindings (`notifications`, `unreadCount`, `pollInterval`, `panelOpen`) are excluded as non-function state variables. All 14 entries above are top-level `function` declarations at module scope.

---

## Agent 02

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

Resolution notes: `TYPES` and `ECONOMY_TYPES` were excluded as non-function const bindings (object literal and Set, respectively). The state variables `notifications`, `unreadCount`, `pollInterval`, and `panelOpen` were excluded as primitive/array/nullable non-function bindings. `notificationsModule` at line 404 was excluded because it is a const object literal (even though it references functions, the binding itself is not a function). The `export default notificationsModule` statement and the two trailing expressions (`window` assignment and `ready.then`) were excluded as they are not named callable bindings. All 14 entries are top-level function declarations; none are nested functions, methods, or object accessors.

---

## Agent 03

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

Resolution notes: All 14 entries are `function` declarations at module scope (no arrow-function `const` bindings qualify in this file). Excluded from the list: `TYPES` (object literal, line 55), `ECONOMY_TYPES` (Set, line 72), four `let` state variables (lines 83–86), and `notificationsModule` (object literal assembling references to the above functions, line 404). No nested or callback-defined functions were promoted.

---

## Agent 04

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

Resolution notes: `src/notifications.ts` contains 14 top-level named callable bindings. All 14 are `function` declarations at module scope (none are arrow-function `const` bindings). Six are exported (`timeAgo`, `open`, `close`, `markRead`, `markAllRead`, `destroy`, `init`). The remaining seven (`getPlaceholderNotifs`, `createPanel`, `renderList`, `updateBadge`, `startPolling`, `fetchNotifications`, `bindBellButton`) are module-private. The non-function bindings (`TYPES`, `ECONOMY_TYPES`, state variables, `notificationsModule`) are correctly excluded per the rules.

---

## Agent 05

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

Resolution notes: All 14 entries are `function` declarations at module scope. Excluded: all `type` aliases and `interface` declarations (e.g., `NotificationFilter`, `Notification`) as these are type-only constructs; all `const`/`let` bindings initialized to primitive values, arrays, Sets, or plain objects (state variables, `TYPES`, `ECONOMY_TYPES`); the `notificationsModule` default export object literal (`{ init, open, close, ... } as const`) — an object, not a callable binding; and all nested functions defined inside the bodies of the 14 listed functions, as well as any arrow functions passed inline as callbacks.
