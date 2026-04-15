/**
 * Home — Invite Rewards event wiring
 * Wires copy, share, and claim buttons. Delegates claim to the onClaim callback
 * so this module does not need to import the sheet directly.
 */

import { showToast } from '../config.ts';
import type { InviteStats, InviteReward } from './home.invite-types.ts';

export function wireInviteScreen(
  container: HTMLElement,
  stats: InviteStats,
  onClaim: (rewardId: string, rewardType: InviteReward['reward_type']) => void,
): void {

  // Copy button
  const copyBtn = container.querySelector<HTMLButtonElement>('#invite-copy-btn');
  if (copyBtn && stats.invite_url) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(stats.invite_url!);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
      } catch {
        showToast('Copy failed — tap the link to select it');
      }
    });
  }

  // Native share
  const shareBtn = container.querySelector<HTMLButtonElement>('#invite-native-share');
  if (shareBtn && stats.invite_url) {
    shareBtn.addEventListener('click', async () => {
      try {
        await navigator.share({ title: 'Join The Moderator', url: stats.invite_url! });
      } catch { /* user cancelled or not supported */ }
    });
  }

  // Claim buttons
  // LANDMINE [LM-INVITE-003]: onClaim triggers openClaimSheet (async) with no .catch() propagation.
  // If openClaimSheet rejects before rendering the sheet, the rejection is unhandled. (L-F9)
  container.querySelectorAll<HTMLButtonElement>('.invite-claim-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const rewardId   = btn.dataset.rewardId;
      const rewardType = btn.dataset.rewardType as InviteReward['reward_type'];
      if (!rewardId || !rewardType) return;
      onClaim(rewardId, rewardType);
    });
  });
}
