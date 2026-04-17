/**
 * THE MODERATOR — Token Earn System (TypeScript)
 *
 * Refactored: split into types, balance, animations, milestones, claims sub-modules.
 *
 * Migration: Session 126 (Phase 2), Session 138 (cutover).
 */

import { onChange } from './auth.ts';
import { _injectCSS } from './tokens.animations.ts';
import { _initBroadcast, _updateBalanceDisplay, _rpc, lastKnownBalance, requireTokens } from './tokens.balance.ts';
import { _loadMilestones, MILESTONES, claimMilestone, getMilestoneList, checkProfileMilestones } from './tokens.milestones.ts';
import { claimDailyLogin, claimHotTake, claimReaction, claimVote, claimDebate, claimAiSparring, claimPrediction } from './tokens.claims.ts';

export type { MilestoneKey, MilestoneDefinition, ClaimResult, MilestoneListItem, TokenSummary } from './tokens.types.ts';
export { MILESTONES, claimMilestone, getMilestoneList, checkProfileMilestones };
export { claimDailyLogin, claimHotTake, claimReaction, claimVote, claimDebate, claimAiSparring, claimPrediction };
export { updateBalance, requireTokens, getSummary, getBalance } from './tokens.balance.ts';

export function init(): void {
  _injectCSS();
  _initBroadcast();
  onChange((user, profile) => {
    if (user && profile) {
      if (profile.token_balance != null) _updateBalanceDisplay(profile.token_balance);
      claimDailyLogin();
      _loadMilestones();
      void _rpc('notify_followers_online', { p_user_id: user.id });
    }
  });
}

const tokens = {
  init,
  claimDailyLogin, claimHotTake, claimReaction, claimVote,
  claimDebate, claimAiSparring, claimPrediction,
  getSummary: async () => { const { getSummary } = await import('./tokens.balance.ts'); return getSummary(); },
  requireTokens,
  claimMilestone, checkProfileMilestones, getMilestoneList,
  get balance() { return lastKnownBalance; },
  get MILESTONES() { return MILESTONES; },
} as const;

export default tokens;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
