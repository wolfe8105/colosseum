/**
 * THE MODERATOR — WebRTC Web Worker Timer
 *
 * Self-contained Web Worker timer. No knowledge of debate state.
 * Runs in a separate thread. Not throttled in background tabs.
 * Uses Date.now() as source of truth — no cumulative drift.
 */

import { state } from './webrtc.state.ts';

// ============================================================
// TIMER WORKER CODE (inline Blob — no external file, no npm dep)
// ============================================================

const TIMER_WORKER_CODE = `
let startedAt = 0;
let duration = 0;
let intervalId = null;

self.onmessage = function(e) {
  if (e.data.command === 'start') {
    startedAt = e.data.startedAt;
    duration = e.data.duration;
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(tick, 1000);
    tick();
  } else if (e.data.command === 'stop') {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }
};

function tick() {
  var elapsed = (Date.now() - startedAt) / 1000;
  var remaining = Math.max(0, Math.ceil(duration - elapsed));
  self.postMessage({ remaining: remaining });
  if (remaining <= 0) {
    clearInterval(intervalId);
    intervalId = null;
    self.postMessage({ expired: true });
  }
}
`;

function createTimerWorker(): Worker {
  const blob = new Blob([TIMER_WORKER_CODE], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  // Clean up blob URL after worker starts (worker keeps the code)
  URL.revokeObjectURL(url);
  return worker;
}

export function startWorkerTimer(durationSec: number, onMessage: (e: MessageEvent) => void): void {
  if (!state.timerWorker) {
    state.timerWorker = createTimerWorker();
  }
  state.timerWorker.onmessage = onMessage;
  state.timerWorker.postMessage({
    command: 'start',
    startedAt: Date.now(),
    duration: durationSec,
  });
}

export function stopWorkerTimer(): void {
  if (state.timerWorker) {
    state.timerWorker.postMessage({ command: 'stop' });
  }
}

export function terminateWorkerTimer(): void {
  if (state.timerWorker) {
    state.timerWorker.terminate();
    state.timerWorker = null;
  }
}
