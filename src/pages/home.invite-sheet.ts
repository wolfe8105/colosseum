/**
 * Home — Invite Rewards claim bottom sheet
 * Loads the modifier catalog, filters to the earned tier, and handles the claim RPC.
 */

import type { ModifierEffect, RarityTier } from '../modifiers.ts';
import type { InviteReward } from './home.invite-types.ts';
import { safeRpc } from '../auth.ts';
import { showToast } from '../config.ts';
import { getModifierCatalog } from '../modifiers-catalog.ts';
import { renderEffectCard, tierLabel } from '../modifiers-render.ts';
import { rewardTypeLabel } from './home.invite-html.ts';

/**
 * Opens the reward claim sheet.
 * @param onClose   Called when the sheet closes itself (cancel / overlay tap).
 * @param onReload  Called on successful claim to re-render the invite screen.
 * @returns         Cleanup fn the orchestrator stores in _sheetCleanup.
 */
export async function openClaimSheet(
  rewardId:   string,
  rewardType: InviteReward['reward_type'],
  onClose:    () => void,
  onReload:   () => void,
): Promise<() => void> {
  const overlay = document.createElement('div');
  overlay.className = 'bottom-sheet-overlay';
  overlay.innerHTML = `<div class="bottom-sheet"><div class="sheet-handle"></div>
    <div class="sheet-title">PICK YOUR ${rewardTypeLabel(rewardType).toUpperCase()}</div>
    <div class="invite-claim-grid" id="claim-picker-grid">
      <div class="invite-loading">Loading catalog…</div>
    </div>
    <button class="sheet-cancel-btn" id="claim-cancel">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);

  const close = (): void => { overlay.remove(); onClose(); };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#claim-cancel')?.addEventListener('click', close);

  const catalog  = await getModifierCatalog();
  const tierNeeded: RarityTier = rewardType === 'legendary_powerup' ? 'legendary' : 'mythic';
  const eligible = catalog.filter((e: ModifierEffect) => e.tier_gate === tierNeeded);

  const grid = overlay.querySelector<HTMLElement>('#claim-picker-grid')!;

  if (eligible.length === 0) {
    grid.innerHTML = '<div class="invite-empty-activity">No eligible effects found.</div>';
    return close;
  }

  grid.innerHTML = eligible.map(e => renderEffectCard(e, {
    showModButton:  rewardType === 'mythic_modifier',
    showPuButton:   rewardType !== 'mythic_modifier',
    modButtonLabel: `Select · ${tierLabel(e.tier_gate)}`,
    puButtonLabel:  `Select · ${tierLabel(e.tier_gate)}`,
  })).join('');

  grid.querySelectorAll<HTMLButtonElement>('.mod-buy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const effectId = btn.dataset.effectId;
      if (!effectId) return;
      const effect = eligible.find((e: ModifierEffect) => e.id === effectId);
      if (!effect) return;

      btn.disabled = true;
      btn.textContent = 'Claiming…';
      try {
        const res  = await safeRpc('claim_invite_reward', {
          p_reward_id: rewardId,
          p_effect_id: effect.effect_num,
        });
        const data = res.data as { ok?: boolean; error?: string; effect_name?: string } | null;

        if (data?.ok) {
          close();
          showToast(`🎁 ${data.effect_name ?? 'Item'} added to your inventory!`, 'success');
          onReload();
        } else {
          showToast(data?.error ?? 'Claim failed', 'error');
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Select';
      }
    });
  });

  return close;
}
