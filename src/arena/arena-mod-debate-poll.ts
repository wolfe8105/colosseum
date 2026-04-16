import { safeRpc, getCurrentProfile } from '../auth.ts';
import { DEBATE } from '../config.ts';
import {
  view, modDebatePollTimer, set_modDebatePollTimer, set_modDebateId,
} from './arena-state.ts';
import type { ArenaView, CurrentDebate, DebateMode, DebateRole } from './arena-types.ts';
import type { ModDebateCheckResult } from './arena-types-moderator.ts';
import { enterRoom } from './arena-room-enter.ts';
import { showMatchFound } from './arena-match-found.ts';
// LANDMINE [LM-MODDEBATE-001]: showModQueue is imported dynamically to break the
// arena-mod-queue ↔ arena-mod-debate mutual static import cycle. Keep it dynamic.

export function startModDebatePoll(debateId: string, mode: DebateMode, ranked: boolean): void {
  stopModDebatePoll();
  set_modDebatePollTimer(setInterval(async () => {
    if (view !== 'modDebateWaiting') {
      stopModDebatePoll();
      return;
    }
    try {
      const { data, error } = await safeRpc<ModDebateCheckResult>('check_mod_debate', { p_debate_id: debateId });
      if (error || !data) return;
      const result = data as ModDebateCheckResult;

      // Update slot display for mod's waiting screen
      const slotA = document.getElementById('slot-a-name');
      const slotB = document.getElementById('slot-b-name');
      if (slotA && result.debater_a_name) slotA.textContent = result.debater_a_name || 'waiting…';
      if (slotB && result.debater_b_name) slotB.textContent = result.debater_b_name || 'waiting…';

      if (result.status === 'matched') {
        stopModDebatePoll();
        onModDebateReady(debateId, result, mode, ranked);
      }
    } catch { /* retry next tick */ }
  }, 4000));
}

export function stopModDebatePoll(): void {
  if (modDebatePollTimer) {
    clearInterval(modDebatePollTimer);
    set_modDebatePollTimer(null);
  }
}

export function onModDebateReady(debateId: string, result: ModDebateCheckResult, mode: DebateMode, ranked: boolean): void {
  const profile = getCurrentProfile();
  const isActualMod = profile?.id !== result.debater_a_id && profile?.id !== result.debater_b_id;
  const debateRuleset = (result.ruleset as 'amplified' | 'unplugged') || 'amplified';
  const debateTopic = result.topic || 'Moderated Debate';

  if (isActualMod) {
    // Moderator enters room in observer mode
    const debateData: CurrentDebate = {
      id: debateId,
      topic: debateTopic,
      role: 'a',
      mode,
      round: 1,
      totalRounds: result.total_rounds ?? DEBATE.defaultRounds,
      opponentName: result.debater_b_name || 'Debater B',
      opponentId: result.debater_b_id,
      opponentElo: 1200,
      ranked,
      ruleset: debateRuleset,
      language: result.language ?? 'en',
      messages: [],
      modView: true,
      debaterAName: result.debater_a_name || 'Debater A',
      debaterBName: result.debater_b_name || 'Debater B',
    };
    enterRoom(debateData);
  } else {
    // Debater A — now matched, go to match found
    const role: DebateRole = profile?.id === result.debater_a_id ? 'a' : 'b';
    const opponentName = role === 'a' ? (result.debater_b_name || 'Debater B') : (result.debater_a_name || 'Debater A');
    const opponentId = role === 'a' ? result.debater_b_id : result.debater_a_id;
    const debateData: CurrentDebate = {
      id: debateId,
      topic: debateTopic,
      role,
      mode,
      round: 1,
      totalRounds: result.total_rounds ?? DEBATE.defaultRounds,
      opponentName,
      opponentId,
      opponentElo: 1200,
      ranked,
      ruleset: debateRuleset,
      language: result.language ?? 'en',
      messages: [],
    };
    showMatchFound(debateData);
  }
}

export async function cancelModDebate(debateId: string): Promise<void> {
  stopModDebatePoll();
  try {
    await safeRpc('cancel_mod_debate', { p_debate_id: debateId });
  } catch { /* silent */ }
  set_modDebateId(null);
  const { showModQueue } = await import('./arena-mod-queue-browse.ts');
  showModQueue();
}
