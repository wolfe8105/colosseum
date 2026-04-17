/**
 * THE MODERATOR — Tournaments Module (F-08)
 * Session 278 | April 13, 2026
 *
 * Singles tournament system. Single-elimination, ELO-seeded.
 * Standard ranked debates. Creator sets start time, auto-locks.
 * Gold fast-blink dot on bell top-left when match is ready.
 *
 * Session 254 track: split into tournaments.types / tournaments.indicator /
 * tournaments.rpc / tournaments.render.
 */

import { ready } from './auth.ts';
import { startTournamentMatchPoll } from './tournaments.indicator.ts';

export type { Tournament, TournamentMatch, BracketMatch } from './tournaments.types.ts';
export { checkMyTournamentMatch, startTournamentMatchPoll, stopTournamentMatchPoll, getPendingMatch } from './tournaments.indicator.ts';
export { createTournament, joinTournament, cancelTournament, getActiveTournaments, getTournamentBracket, resolveTournamentMatch } from './tournaments.rpc.ts';
export { renderTournamentBanner, renderTournamentCard } from './tournaments.render.ts';

// ============================================================
// INIT — wire into notifications polling on auth ready
// ============================================================

export function initTournaments(): Promise<void> {
  return ready.then(() => {
    startTournamentMatchPoll();
  });
}
