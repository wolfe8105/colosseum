/**
 * tournaments.rpc.ts — Tournament RPC calls
 *
 * createTournament, joinTournament, cancelTournament,
 * getActiveTournaments, getTournamentBracket, resolveTournamentMatch
 *
 * Extracted from tournaments.ts (Session 254 track).
 */

import { safeRpc, getIsPlaceholderMode } from './auth.ts';
import type { Tournament, BracketMatch } from './tournaments.types.ts';

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
