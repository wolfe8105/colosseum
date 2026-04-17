/**
 * Home — Invite Rewards HTML/label helpers
 * Pure functions: no DOM, no state, no side effects. Leaf module.
 */

import { escapeHTML } from '../config.ts';
import type { InviteReward, ActivityEntry } from './home.invite-types.ts';

export function rewardLabel(milestone: number): string {
  if (milestone === 1)  return 'Legendary Power-Up';
  if (milestone === 5)  return 'Mythic Power-Up';
  if (milestone === 25) return 'Mythic Modifier';
  return 'Mythic Power-Up';
}

// LANDMINE [LM-INVITE-001]: Object-literal indexing returns undefined for unrecognized reward_type.
// Callers doing .toUpperCase() (openClaimSheet title) will throw TypeError at runtime.
// Fix: add a default return value, or use ?. at the call site. (M-F2)
export function rewardTypeLabel(type: InviteReward['reward_type']): string | undefined {
  return { legendary_powerup: '🟡 Legendary Power-Up', mythic_powerup: '🟣 Mythic Power-Up', mythic_modifier: '⚗️ Mythic Modifier' }[type];
}

export function rewardRowHtml(r: InviteReward): string {
  const date = new Date(r.awarded_at).toLocaleDateString();
  const btnLabel    = r.pending_review ? 'PENDING REVIEW' : 'CLAIM';
  const btnDisabled = r.pending_review ? 'disabled' : '';
  return `
    <div class="invite-reward-row" data-reward-id="${escapeHTML(r.id)}">
      <div class="invite-reward-info">
        <span class="invite-reward-type">${escapeHTML(rewardTypeLabel(r.reward_type) ?? 'Reward')}</span>
        <span class="invite-reward-milestone">Milestone: ${r.milestone}</span>
        <span class="invite-reward-date">${escapeHTML(date)}</span>
      </div>
      <button class="invite-claim-btn ${r.pending_review ? 'invite-claim-btn--review' : ''}"
              data-reward-id="${escapeHTML(r.id)}"
              data-reward-type="${escapeHTML(r.reward_type)}"
              ${btnDisabled}>${btnLabel}</button>
    </div>`;
}

export function activityRowHtml(a: ActivityEntry): string {
  const when = new Date(a.event_at).toLocaleDateString();
  const name = a.username ? escapeHTML(a.username) : 'Someone';
  const msg: Record<string, string> = {
    clicked:   `${name} clicked your link`,
    signed_up: `${name} signed up — waiting for their first debate`,
    converted: `${name} completed their first debate ✓`,
  };
  return `<div class="invite-activity-row">
    <span class="invite-activity-msg">${msg[a.status] ?? escapeHTML(a.status)}</span>
    <span class="invite-activity-date">${when}</span>
  </div>`;
}
