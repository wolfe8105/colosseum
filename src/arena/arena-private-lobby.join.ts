/**
 * arena-private-lobby.join.ts — Join-by-code flow
 *
 * joinWithCode — handles joining a private lobby or mod debate by code.
 * Extracted from arena-private-lobby.ts (Session 254 track).
 */

import { safeRpc } from '../auth.ts';
import { showToast, friendlyError, DEBATE } from '../config.ts';
import { set_selectedMode, modDebateId, set_modDebateId } from './arena-state.ts';
import type { CurrentDebate, DebateMode } from './arena-types.ts';
import type { JoinPrivateLobbyResult } from './arena-types-private-lobby.ts';
import type { ModDebateJoinResult } from './arena-types-moderator.ts';
import { AI_TOPICS } from './arena-constants.ts';
import { isPlaceholder, randomFrom } from './arena-core.utils.ts';
import { showMatchFound } from './arena-match.ts';
import { showModDebateWaitingDebater } from './arena-mod-debate.ts';

export async function joinWithCode(code: string): Promise<void> {
  if (isPlaceholder()) {
    showToast('Join code not available in preview mode');
    return;
  }
  try {
    const { data, error } = await safeRpc<JoinPrivateLobbyResult>('join_private_lobby', {
      p_debate_id: null,
      p_join_code: code,
    });
    if (error) throw error;
    const result = data as JoinPrivateLobbyResult;
    set_selectedMode(result.mode as DebateMode);
    const debateData: CurrentDebate = {
      id: result.debate_id,
      topic: result.topic || randomFrom(AI_TOPICS),
      role: 'b',
      mode: result.mode as DebateMode,
      round: 1,
      totalRounds: result.total_rounds ?? DEBATE.defaultRounds,
      opponentName: result.opponent_name,
      opponentId: result.opponent_id,
      opponentElo: result.opponent_elo,
      ranked: false,
      ruleset: (result.ruleset as 'amplified' | 'unplugged') || 'amplified',
      language: result.language ?? 'en',
      messages: [],
    };
    showMatchFound(debateData);
  } catch {
    // join_private_lobby failed — try join_mod_debate (mod_created debates use a different RPC)
    try {
      const { data: modData, error: modError } = await safeRpc<ModDebateJoinResult>('join_mod_debate', {
        p_join_code: code,
      });
      if (modError) throw modError;
      const modResult = modData as ModDebateJoinResult;
      set_selectedMode(modResult.mode as DebateMode);

      if (modResult.role === 'b') {
        // Both debaters present — go straight to match found
        const debateData: CurrentDebate = {
          id: modResult.debate_id,
          topic: modResult.topic || randomFrom(AI_TOPICS),
          role: 'b',
          mode: modResult.mode as DebateMode,
          round: 1,
          totalRounds: modResult.total_rounds ?? DEBATE.defaultRounds,
          opponentName: modResult.opponent_name || 'Debater A',
          opponentId: modResult.opponent_id,
          opponentElo: modResult.opponent_elo || 1200,
          ranked: modResult.ranked,
          ruleset: (modResult.ruleset as 'amplified' | 'unplugged') || 'amplified',
          language: modResult.language ?? 'en',
          messages: [],
        };
        showMatchFound(debateData);
      } else {
        // role === 'a' — waiting for second debater, show waiting screen and poll
        set_modDebateId(modResult.debate_id);
        showModDebateWaitingDebater(modResult.debate_id, modResult.topic, modResult.mode as DebateMode, modResult.ranked);
      }
    } catch (modErr) {
      showToast(friendlyError(modErr) || 'Code not found or already taken');
    }
  }
}

// Keep modDebateId accessible if needed downstream
void modDebateId;
