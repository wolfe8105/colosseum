/**
 * tournaments.render.ts — Tournament UI renderers
 *
 * renderTournamentBanner, renderTournamentCard
 * Extracted from tournaments.ts (Session 254 track).
 */

import { escapeHTML } from './config.ts';
import type { Tournament, TournamentMatch } from './tournaments.types.ts';

function _timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'now';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

/**
 * Renders the tournament header banner for the debate room.
 * Injected above the arena room header when debate.tournament_match_id is set.
 */
export function renderTournamentBanner(match: TournamentMatch): string {
  const round = match.round === 1 ? 'Round 1'
    : match.round === 2 ? 'Quarterfinal'
    : match.round === 3 ? 'Semifinal'
    : 'Grand Final';
  const prize = Math.round(match.prize_pool * 0.9 * 0.7);
  return `
    <div class="tournament-room-banner">
      <div class="trb-left">
        <span class="trb-badge">TOURNAMENT</span>
        <span class="trb-title">${escapeHTML(match.tournament_title)}</span>
      </div>
      <div class="trb-right">
        <span class="trb-round">${escapeHTML(round)}</span>
        <span class="trb-prize">🥇 ${prize.toLocaleString()} tokens</span>
      </div>
    </div>
  `;
}

/**
 * Renders a tournament card for the debate feed.
 */
export function renderTournamentCard(t: Tournament): string {
  const pct = Math.round((t.player_count / t.max_players) * 100);
  const startsIn = _timeUntil(t.starts_at);
  const statusLabel = t.status === 'registration' ? `Starts ${startsIn}` : t.status.toUpperCase();
  return `
    <div class="tournament-card ${t.is_entered ? 'tournament-card--entered' : ''}">
      <div class="tc-header">
        <span class="tc-badge">🏆 TOURNAMENT</span>
        <span class="tc-status">${escapeHTML(statusLabel)}</span>
      </div>
      <div class="tc-title">${escapeHTML(t.title)}</div>
      <div class="tc-meta">
        <span class="tc-category">${escapeHTML(t.category)}</span>
        <span class="tc-fee">Entry: ${Number(t.entry_fee).toLocaleString()} 🪙</span>
      </div>
      <div class="tc-pool">Prize pool: <strong>${Number(t.prize_pool).toLocaleString()} tokens</strong></div>
      <div class="tc-fill-bar">
        <div class="tc-fill-inner" style="width:${pct}%"></div>
      </div>
      <div class="tc-fill-label">${t.player_count} / ${t.max_players} players</div>
      ${t.status === 'registration' && !t.is_entered
        ? `<button class="tc-join-btn" data-tournament-id="${escapeHTML(t.id)}" data-entry-fee="${t.entry_fee}">Join — ${Number(t.entry_fee).toLocaleString()} 🪙</button>`
        : t.is_entered
          ? `<div class="tc-entered-label">✓ Entered</div>`
          : ''}
    </div>
  `;
}
