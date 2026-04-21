# Anchor List — webrtc.timer.ts

1. createTimerWorker  (line 45)
2. startWorkerTimer   (line 54)
3. stopWorkerTimer    (line 66)
4. terminateWorkerTimer (line 72)

## Resolution notes

All five agents agreed unanimously on the same four candidates with matching line numbers. `TIMER_WORKER_CODE` (lines 15–43) is a template-literal string constant, not a function definition. The `tick` function and `self.onmessage` inside that string are embedded source text, not executable top-level bindings in the TypeScript module, and are correctly excluded. No additional function definitions were found during direct source scan.
