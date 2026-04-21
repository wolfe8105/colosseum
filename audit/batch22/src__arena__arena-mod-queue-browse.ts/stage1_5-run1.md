# Anchor List — arena-mod-queue-browse.ts

1. showModQueue  (line 13)
2. loadModQueue  (line 51)
3. claimModRequest  (line 99)
4. startModQueuePoll  (line 121)
5. stopModQueuePoll  (line 133)

## Resolution notes

- All five Stage 1 agents agreed on the same anchor list; verified each against source.
- Inline arrow callbacks excluded:
  - Line 36: `addEventListener('click', async () => { ... })` for `mod-queue-back`.
  - Line 42: `addEventListener('click', () => { ... })` for `mod-queue-create-debate`.
  - Line 74: `rows.map(row => { ... })` render callback.
  - Line 91: `forEach(btn => { ... })` and line 92 inner `addEventListener('click', () => { ... })`.
  - Line 123: `setInterval(() => { ... }, 5000)` polling tick.
- Imports, the file-level `LANDMINE` comment, and type-only import of `ModQueueItem` are not callable bindings — excluded.
- No class bodies, no method definitions, no overload signatures present in source.
- No additional function definitions found beyond what agents listed; scan confirms 5 top-level exported functions total.
