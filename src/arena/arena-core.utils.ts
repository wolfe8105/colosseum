// arena-core.utils.ts — Pure utility helpers with zero arena dependencies.
// Extracted from arena-core.ts to break 4 circular deps:
//   arena-core ↔ arena-match, arena-core ↔ arena-feed-room,
//   arena-core ↔ arena-mod-refs, arena-core ↔ arena-room-ai.
// LANDMINE [LM-CORE-001]: isPlaceholder reads module-level isAnyPlaceholder from
// config.ts. That flag is set synchronously during config module evaluation and
// does not change after init. Safe to read at call time.

import { getSupabaseClient } from '../auth.ts';
import { isAnyPlaceholder } from '../config.ts';

// ============================================================
// PLACEHOLDER GUARD
// ============================================================

export function isPlaceholder(): boolean {
  return !getSupabaseClient() || isAnyPlaceholder;
}

// ============================================================
// TIMER FORMATTING
// ============================================================

export function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// ============================================================
// RANDOM SELECTION
// ============================================================

export function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ============================================================
// BROWSER HISTORY
// ============================================================

export function pushArenaState(viewName: string): void {
  history.pushState({ arenaView: viewName }, '');
}
