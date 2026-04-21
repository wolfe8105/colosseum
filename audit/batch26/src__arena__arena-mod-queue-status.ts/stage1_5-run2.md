# Anchor List — arena-mod-queue-status.ts (Run 2)

Source: src/arena/arena-mod-queue-status.ts

1. startModStatusPoll  (line 12)
2. stopModStatusPoll   (line 34)
3. showModRequestModal (line 41)
4. handleModResponse   (line 85)

## Resolution notes

- setInterval callback (line 15) is inner; not top-level.
- countdownTimer callback (line 64) is inner; not top-level.
- Button click handlers (lines 74, 79) are inline callbacks; not top-level.
