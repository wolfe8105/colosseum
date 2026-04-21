# Anchor List — arena-mod-queue-browse.ts

1. showModQueue  (line 13)
2. loadModQueue  (line 51)
3. claimModRequest  (line 99)
4. startModQueuePoll  (line 121)
5. stopModQueuePoll  (line 133)

## Resolution notes

- All five agents agreed on the same five exported function declarations; no discrepancies to reconcile.
- Source scan confirmed no additional top-level function definitions exist beyond the five listed.
- Excluded: inline arrow callbacks passed to `addEventListener` (lines 36, 42, 92), the `setInterval` arrow (line 123), the `.map` arrow callback in `loadModQueue` (line 74), and the `.forEach` arrow callback (line 91) — all are inline callbacks, not top-level named bindings.
- Excluded: the dynamically imported `renderLobby` (line 38) — it is a destructured import binding from another module, not a definition in this file.
- Excluded: imports, type imports, and the `LM-MODQUEUE-001` comment — not callable definitions.
- No class bodies, no function overload signatures, and no object-literal methods are present in this file.
