/**
 * THE MODERATOR — Token Claims
 * claimDailyLogin, claimHotTake, claimReaction, claimVote, claimDebate,
 * claimAiSparring, claimPrediction.
 */

import { nudge } from './nudge.ts';
import { _rpc, _updateBalanceDisplay } from './tokens.balance.ts';
import { _tokenToast } from './tokens.animations.ts';
import { claimMilestone, _checkStreakMilestones } from './tokens.milestones.ts';
import type { ClaimResult } from './tokens.types.ts';

let dailyLoginClaimed = false;
let _dailyLoginInFlight = false;

export function isDailyLoginClaimed(): boolean { return dailyLoginClaimed; }

export async function claimDailyLogin(): Promise<ClaimResult | null> {
  if (_dailyLoginInFlight) return null;
  _dailyLoginInFlight = true;
  try {
    const result = await _rpc('claim_daily_login');
    if (!result) return null;
    if (!result.success) {
      if (result.error !== 'Already claimed today') console.warn('[Tokens] Daily login:', result.error);
      dailyLoginClaimed = true;
      return null;
    }
    dailyLoginClaimed = true;
    _updateBalanceDisplay(result.new_balance);
    let label = 'Daily login';
    if (result.freeze_used) label = 'Daily login (❄️ freeze saved your streak!)';
    else if ((result.streak_bonus ?? 0) > 0) label = `Daily login + ${result.login_streak ?? 0}-day streak!`;
    _tokenToast(result.tokens_earned ?? 0, label);
    nudge('return_visit', '🔥 Welcome back. The arena missed you.');
    console.debug(`[Tokens] Daily login: +${result.tokens_earned ?? 0} (streak: ${result.login_streak ?? 0}, freeze used: ${result.freeze_used ?? false})`);
    _checkStreakMilestones(result.login_streak ?? 0);
    return result;
  } finally {
    _dailyLoginInFlight = false;
  }
}

export async function claimHotTake(hotTakeId: string): Promise<ClaimResult | null> {
  if (!hotTakeId) return null;
  const result = await _rpc('claim_action_tokens', { p_action: 'hot_take', p_reference_id: hotTakeId });
  if (!result?.success) return null;
  _updateBalanceDisplay(result.new_balance);
  _tokenToast(result.tokens_earned ?? 0, 'Post');
  void claimMilestone('first_hot_take');
  // LANDMINE [LM-TOK-002]: Fire-and-forget drip import — intentional but silent on failure.
  import('./onboarding-drip.ts').then(({ triggerDripDay }) => triggerDripDay(4)).catch(() => {});
  return result;
}

export async function claimReaction(hotTakeId: string): Promise<ClaimResult | null> {
  if (!hotTakeId) return null;
  const result = await _rpc('claim_action_tokens', { p_action: 'reaction', p_reference_id: hotTakeId });
  if (!result?.success) return null;
  _updateBalanceDisplay(result.new_balance);
  _tokenToast(result.tokens_earned ?? 0, 'Reaction');
  void claimMilestone('first_reaction');
  return result;
}

export async function claimVote(debateId: string): Promise<ClaimResult | null> {
  if (!debateId) return null;
  const result = await _rpc('claim_action_tokens', { p_action: 'vote', p_reference_id: debateId });
  if (!result?.success) return null;
  _updateBalanceDisplay(result.new_balance);
  _tokenToast(result.tokens_earned ?? 0, 'Vote');
  void claimMilestone('first_vote');
  import('./onboarding-drip.ts').then(({ triggerDripDay }) => triggerDripDay(2)).catch(() => {});
  return result;
}

export async function claimDebate(debateId: string): Promise<ClaimResult | null> {
  if (!debateId) return null;
  const result = await _rpc('claim_debate_tokens', { p_debate_id: debateId });
  if (!result?.success) return null;
  _updateBalanceDisplay(result.new_balance);
  let label = 'Debate complete';
  if (result.is_winner) {
    label = 'Debate win!';
    if ((result.upset_bonus ?? 0) > 0) label = 'Upset victory!';
  }
  if ((result.fate_bonus ?? 0) > 0) label += ` (+${result.fate_pct}% Group Fate)`;
  _tokenToast(result.tokens_earned ?? 0, label);
  void claimMilestone('first_debate');
  import('./onboarding-drip.ts').then(({ triggerDripDay }) => {
    void triggerDripDay(5);
    if (result.is_winner) void triggerDripDay(7);
  }).catch(() => {});
  return result;
}

export async function claimAiSparring(debateId: string): Promise<ClaimResult | null> {
  if (!debateId) return null;
  const result = await _rpc('claim_action_tokens', { p_action: 'ai_sparring', p_reference_id: debateId });
  if (!result?.success) return null;
  _updateBalanceDisplay(result.new_balance);
  _tokenToast(result.tokens_earned ?? 0, 'AI Sparring');
  void claimMilestone('first_ai_sparring');
  return result;
}

export async function claimPrediction(debateId: string): Promise<ClaimResult | null> {
  if (!debateId) return null;
  const result = await _rpc('claim_action_tokens', { p_action: 'prediction', p_reference_id: debateId });
  if (!result?.success) return null;
  _updateBalanceDisplay(result.new_balance);
  _tokenToast(result.tokens_earned ?? 0, 'Prediction');
  void claimMilestone('first_prediction');
  return result;
}
