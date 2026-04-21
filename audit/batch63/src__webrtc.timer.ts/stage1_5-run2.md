# Anchor List — webrtc.timer.ts

1. createTimerWorker  (line 45)
2. startWorkerTimer   (line 54)
3. stopWorkerTimer    (line 66)
4. terminateWorkerTimer (line 72)

## Resolution notes

All five agents agreed unanimously. `TIMER_WORKER_CODE` (lines 15–43) is a template-literal string constant, not a function binding. The `tick` function and `self.onmessage` inside the template-literal string are embedded JavaScript source code stored as a string value — not top-level callable bindings in the TypeScript module. `createTimerWorker` at line 45 is a non-exported top-level function declaration. All three exported functions at lines 54, 66, and 72 are standard export function declarations.
