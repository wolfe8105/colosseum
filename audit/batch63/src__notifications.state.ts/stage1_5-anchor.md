# Anchor List — notifications.state.ts

Source: src/notifications.state.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. setNotifications    (line 12)
2. setPanelOpen        (line 13)
3. setPollInterval     (line 14)
4. markOneRead         (line 16)
5. markAllAsRead       (line 22)
6. computeUnreadCount  (line 27)
7. getPlaceholderNotifs (line 31)

## Resolution notes

Unanimous 5/5 Stage 1 agents. Both arbiters agreed. The four `export let` bindings (`notifications`, `unreadCount`, `pollInterval`, `panelOpen`) are mutable state variables — excluded per rules. All 7 exported functions are included; the three single-line setters are included per the explicit rule that setter functions are callable anchors.
