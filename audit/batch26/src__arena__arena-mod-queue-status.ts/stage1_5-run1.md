# Anchor List — arena-mod-queue-status.ts (Run 1)

Source: src/arena/arena-mod-queue-status.ts

1. startModStatusPoll  (line 12)
2. stopModStatusPoll   (line 34)
3. showModRequestModal (line 41)
4. handleModResponse   (line 85)

## Resolution notes

- No inner functions elevated to top-level (the setInterval callback and countdownTimer callback are inner anonymous callbacks, not top-level bindings).
