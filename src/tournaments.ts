/**
 * THE MODERATOR — Tournaments Module (F-08)
 * Session 278 | April 13, 2026
 *
 * Singles tournament system. Single-elimination, ELO-seeded.
 * Standard ranked debates. Creator sets start time, auto-locks.
 * Gold fast-blink dot on bell top-left when match is ready.
 */

import { safeRpc, getIsPlaceholderMode, ready } from './auth.ts';
import { escapeHTML, showToast } from './config.ts';

// ============================================================
// TYPES
// ============================================================

export interface Tournament {
  id: string;
  title: string;
  category: string;
  entry_fee: number;
  prize_pool: number;
  player_count: number;
  max_players: number;
  starts_at: string;
  status: 'registration' | 'locked' | 'active' | 'completed' | 'cancelled';
  is_entered: boolean;
}

export interface TournamentMatch {
  match_id: string;
  tournament_id: string;
  tournament_title: string;
  round: number;
  opponent_id: string;
  opponent_name: string;
  prize_pool: number;
  forfeit_at: string | null;
}

export interface BracketMatch {
  match_id: string;
  round: number;
  match_slot: number;
  player_a_id: string | null;
  player_a_name: string | null;
  player_b_id: string | null;
  player_b_name: string | null;
  winner_id: string | null;
  is_bye: boolean;
  status: string;
  debate_id: string | null;
}

// ============================================================
// GOLD DOT — tournament match ready indicator
// Top-left of bell icon. Fast-blink. Distinct from magenta notif dot.
// ============================================================

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
      background: #c0a84b;
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

// ============================================================
// POLLING — check for pending match every 60s while active
// ============================================================

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

// ============================================================
// TOURNAMENT CREATION
// ============================================================

export async function createTournament(params: {
  title: string;
  category: string;
  entry_fee: number;
  starts_at: string;
  max_players?: number;
}): Promise<{ tournament_id?: string; error?: string }> {
  if (getIsPlaceholderMode()) return { error: 'Not available' };
  const { data, error } = await safeRpc<{ tournament_id: string; success: boolean; error?: string }>(
    'create_tournament',
    {
      p_title:       params.title,
      p_category:    params.category,
      p_entry_fee:   params.entry_fee,
      p_starts_at:   params.starts_at,
      p_max_players: params.max_players ?? 64,
    }
  );
  if (error) return { error: error.message ?? 'Failed to create tournament' };
  if (data?.error) return { error: data.error };
  return { tournament_id: data?.tournament_id };
}

// ============================================================
// JOIN / CANCEL
// ============================================================

export async function joinTournament(tournamentId: string): Promise<{ success?: boolean; error?: string }> {
  if (getIsPlaceholderMode()) return { error: 'Not available' };
  const { data, error } = await safeRpc<{ success: boolean; error?: string }>('join_tournament', {
    p_tournament_id: tournamentId,
  });
  if (error) return { error: error.message ?? 'Failed to join' };
  if (data?.error) return { error: data.error };
  return { success: true };
}

export async function cancelTournament(tournamentId: string): Promise<{ success?: boolean; error?: string }> {
  if (getIsPlaceholderMode()) return { error: 'Not available' };
  const { data, error } = await safeRpc<{ success: boolean; error?: string }>('cancel_tournament', {
    p_tournament_id: tournamentId,
  });
  if (error) return { error: error.message ?? 'Failed to cancel' };
  if (data?.error) return { error: data.error };
  return { success: true };
}

// ============================================================
// FETCH TOURNAMENTS
// ============================================================

export async function getActiveTournaments(category?: string): Promise<Tournament[]> {
  if (getIsPlaceholderMode()) return [];
  const { data, error } = await safeRpc<Tournament[]>('get_active_tournaments', {
    p_category: category ?? null,
  });
  if (error || !data) return [];
  return data;
}

export async function getTournamentBracket(tournamentId: string): Promise<BracketMatch[]> {
  if (getIsPlaceholderMode()) return [];
  const { data, error } = await safeRpc<BracketMatch[]>('get_tournament_bracket', {
    p_tournament_id: tournamentId,
  });
  if (error || !data) return [];
  return data;
}

// ============================================================
// RESOLVE MATCH (called from arena-room-end after tournament debate)
// ============================================================

export async function resolveTournamentMatch(
  matchId: string,
  winnerId: string
): Promise<{ success?: boolean; tournament_complete?: boolean; error?: string }> {
  if (getIsPlaceholderMode()) return { error: 'Not available' };
  const { data, error } = await safeRpc<{
    success: boolean;
    tournament_complete?: boolean;
    round_complete?: boolean;
    error?: string;
  }>('resolve_tournament_match', {
    p_tournament_match_id: matchId,
    p_winner_id:           winnerId,
  });
  if (error) return { error: error.message ?? 'Failed to resolve match' };
  if (data?.error) return { error: data.error };
  return { success: true, tournament_complete: data?.tournament_complete };
}

// ============================================================
// UI HELPERS
// ============================================================

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

function _timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'now';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

// ============================================================
// INIT — wire into notifications polling on auth ready
// ============================================================

export function initTournaments(): Promise<void> {
  return ready().then(() => {
    startTournamentMatchPoll();
  });
}
