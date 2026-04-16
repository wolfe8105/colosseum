/**
 * tournaments.indicator.ts — Gold dot indicator + match poll
 *
 * Gold fast-blink dot on bell top-left when tournament match is ready.
 * Distinct from magenta notif dot.
 *
 * checkMyTournamentMatch, startTournamentMatchPoll, stopTournamentMatchPoll,
 * getPendingMatch
 *
 * Extracted from tournaments.ts (Session 254 track).
 */

import { safeRpc, getIsPlaceholderMode } from './auth.ts';
import type { TournamentMatch } from './tournaments.types.ts';

let _goldDotInterval: ReturnType<typeof setInterval> | null = null;
let _pendingMatch: TournamentMatch | null = null;

function _injectGoldDotCSS(): void {
  if (document.getElementById('tournament-gold-dot-css')) return;
  const style = document.createElement('style');
  style.id = 'tournament-gold-dot-css';
  style.textContent = `
    @keyframes tournamentBlink {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.15; transform: scale(0.65); }
    }
    .tournament-gold-dot {
      position: absolute;
      top: -2px;
      left: -4px;
      width: 8px;
      height: 8px;
      background: #c0a84b; /* TODO: needs CSS var token */
      border-radius: 50%;
      animation: tournamentBlink 0.8s ease-in-out infinite;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

function _showGoldDot(): void {
  _injectGoldDotCSS();
  const btn = document.getElementById('notif-btn');
  if (!btn) return;
  if (document.getElementById('tournament-gold-dot')) return;
  btn.style.position = 'relative';
  const dot = document.createElement('div');
  dot.id = 'tournament-gold-dot';
  dot.className = 'tournament-gold-dot';
  btn.appendChild(dot);
}

function _hideGoldDot(): void {
  document.getElementById('tournament-gold-dot')?.remove();
}

export async function checkMyTournamentMatch(): Promise<TournamentMatch | null> {
  if (getIsPlaceholderMode()) return null;
  const { data, error } = await safeRpc<TournamentMatch[]>('get_my_tournament_match');
  if (error || !data || data.length === 0) {
    _pendingMatch = null;
    _hideGoldDot();
    return null;
  }
  _pendingMatch = data[0];
  _showGoldDot();
  return _pendingMatch;
}

export function startTournamentMatchPoll(): void {
  if (_goldDotInterval) return;
  void checkMyTournamentMatch();
  _goldDotInterval = setInterval(() => void checkMyTournamentMatch(), 60_000);
}

export function stopTournamentMatchPoll(): void {
  if (_goldDotInterval) {
    clearInterval(_goldDotInterval);
    _goldDotInterval = null;
  }
  _hideGoldDot();
}

export function getPendingMatch(): TournamentMatch | null {
  return _pendingMatch;
}
