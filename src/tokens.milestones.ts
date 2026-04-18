/**
 * THE MODERATOR — Token Milestones
 * MILESTONES, claimMilestone, _loadMilestones, getMilestoneList, checkProfileMilestones.
 */

import { _rpc, _updateBalanceDisplay } from './tokens.balance.ts';
import { _milestoneToast } from './tokens.animations.ts';
import type { MilestoneKey, MilestoneDefinition, MilestoneListItem, ClaimResult } from './tokens.types.ts';

export const MILESTONES: Readonly<Record<MilestoneKey, MilestoneDefinition>> = {
  first_hot_take:     { tokens: 25,  label: 'First Hot Take',     icon: '🔥' },
  first_debate:       { tokens: 50,  label: 'First Debate',       icon: '⚔️' },
  first_vote:         { tokens: 10,  label: 'First Vote',         icon: '🗳️' },
  first_reaction:     { tokens: 5,   label: 'First Reaction',     icon: '👊' },
  first_ai_sparring:  { tokens: 15,  label: 'First AI Sparring',  icon: '🤖' },
  first_prediction:   { tokens: 10,  label: 'First Prediction',   icon: '🎯' },
  profile_3_sections: { tokens: 30,  label: '3 Profile Sections', icon: '📝' },
  profile_6_sections: { tokens: 75,  label: '6 Profile Sections', icon: '📋' },
  profile_12_sections:{ tokens: 150, label: 'All 12 Sections',    icon: '🏆' },
  verified_gladiator: { tokens: 100, label: 'Verified Gladiator', icon: '🛡️' },
  streak_7:           { tokens: 0,   label: '7-Day Streak',       icon: '❄️', freezes: 1 },
  streak_30:          { tokens: 0,   label: '30-Day Streak',      icon: '❄️', freezes: 3 },
  streak_100:         { tokens: 0,   label: '100-Day Streak',     icon: '❄️', freezes: 5 },
} as const;

const milestoneClaimed = new Set<string>();

export async function claimMilestone(key: MilestoneKey): Promise<ClaimResult | null> {
  if (milestoneClaimed.has(key)) return null;
  const def = MILESTONES[key];
  if (!def) return null;
  const result = await _rpc('claim_milestone', { p_milestone_key: key });
  if (!result?.success) {
    if (result?.error === 'Already claimed') milestoneClaimed.add(key);
    return null;
  }
  milestoneClaimed.add(key);
  if (result.new_balance != null) _updateBalanceDisplay(result.new_balance);
  _milestoneToast(def.icon, def.label, result.tokens_earned ?? 0, result.freezes_earned ?? 0);
  console.log(`[Tokens] Milestone: ${key} → +${result.tokens_earned ?? 0} tokens, +${result.freezes_earned ?? 0} freezes`);
  return result;
}

export async function _loadMilestones(): Promise<void> {
  const result = await _rpc('get_my_milestones');
  if (!result?.success) return;
  const claimed = (result as unknown as { claimed?: string[] }).claimed;
  if (claimed && Array.isArray(claimed)) claimed.forEach(k => milestoneClaimed.add(k));
}

export function _checkStreakMilestones(streak: number): void {
  if (!streak) return;
  if (streak >= 7)   void claimMilestone('streak_7');
  if (streak >= 30)  void claimMilestone('streak_30');
  if (streak >= 100) void claimMilestone('streak_100');
}

export function getMilestoneList(): MilestoneListItem[] {
  return Object.entries(MILESTONES).map(([key, def]) => ({
    key, ...def, claimed: milestoneClaimed.has(key),
  }));
}

// verified_gladiator intentionally awarded at 3 sections — same threshold as profile_3_sections by design.
export async function checkProfileMilestones(completedCount: number): Promise<void> {
  if (!completedCount) return;
  if (completedCount >= 3)  void claimMilestone('profile_3_sections');
  if (completedCount >= 6)  void claimMilestone('profile_6_sections');
  if (completedCount >= 12) void claimMilestone('profile_12_sections');
  if (completedCount >= 3)  void claimMilestone('verified_gladiator');
  if (completedCount >= 3) {
    import('./onboarding-drip.ts').then(({ triggerDripDay }) => triggerDripDay(6)).catch(() => {});
  }
}
