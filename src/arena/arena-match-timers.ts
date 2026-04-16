// arena-match-timers.ts — Shared timer-clear primitive for match-accept flow
// Extracted to break the static cycle that would arise if both arena-match-found
// and arena-match-flow imported each other.

import {
  matchAcceptTimer, matchAcceptPollTimer,
  set_matchAcceptTimer, set_matchAcceptPollTimer,
} from './arena-state.ts';

export function clearMatchAcceptTimers(): void {
  if (matchAcceptTimer) { clearInterval(matchAcceptTimer); set_matchAcceptTimer(null); }
  if (matchAcceptPollTimer) { clearInterval(matchAcceptPollTimer); set_matchAcceptPollTimer(null); }
}
