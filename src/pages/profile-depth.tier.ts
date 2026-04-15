/**
 * THE MODERATOR — Profile Depth Tier Integration
 * Window-cast tier globals, tier banner render, milestone bar render.
 */

import { escapeHTML } from '../config.ts';
import { serverQuestionsAnswered } from './profile-depth.state.ts';
import { DEPTH_MILESTONES } from './profile-depth.data.ts';

// LANDMINE [LM-DEPTH-001]: The 4 tier globals are accessed via (window as unknown as
// Record<string, unknown>). This bypasses TypeScript's type system and silently returns
// undefined if moderator-tiers.js is not loaded before this module. No runtime guard —
// if getTier is undefined and renderTierBannerUI is called, the early return is the
// only protection.
const getTier = (window as unknown as Record<string, unknown>).getTier as
  ((qa: number) => { maxStake: number; slots: number; name: string }) | undefined;
const getNextTier = (window as unknown as Record<string, unknown>).getNextTier as
  ((qa: number) => { questionsNeeded: number; name: string } | null) | undefined;
const renderTierBadge = (window as unknown as Record<string, unknown>).renderTierBadge as
  ((qa: number) => string) | undefined;
const renderTierProgress = (window as unknown as Record<string, unknown>).renderTierProgress as
  ((qa: number) => string) | undefined;

export function renderTierBannerUI(qa: number): void {
  if (!getTier) return;
  const banner = document.getElementById('tier-banner');
  if (!banner) return;

  const tier = getTier(qa);
  const next = getNextTier ? getNextTier(qa) : null;

  const perkText = tier.maxStake > 0
    ? 'Max stake: <span>' + (tier.maxStake === Infinity ? 'Unlimited' : tier.maxStake + ' tokens') + '</span>' +
      (tier.slots > 0 ? ' · Power-up slots: <span>' + tier.slots + '</span>' : '')
    : 'Answer ' + (next ? next.questionsNeeded : '10') + ' more questions to unlock token staking';

  banner.innerHTML =
    '<div class="tier-header">' +
      '<div class="tier-header-left">' +
        '<span class="tier-rank-label">RANK:</span>' +
        (renderTierBadge ? renderTierBadge(qa) : '') +
      '</div>' +
    '</div>' +
    (next
      ? '<div class="tier-unlock-hint">' +
          '<strong>' + escapeHTML(String(next.questionsNeeded)) + '</strong> more questions to unlock <strong>' + escapeHTML(next.name) + '</strong>' +
        '</div>'
      : '') +
    (renderTierProgress ? renderTierProgress(qa) : '') +
    '<div class="tier-perks">' + perkText + '</div>';

  banner.style.display = 'block';
}

export function updateMilestoneBar(): void {
  const bar = document.getElementById('milestone-bar');
  if (!bar) return;
  const totalQ = 100;
  const answered = serverQuestionsAnswered;
  const pct = Math.min(100, Math.round((answered / totalQ) * 100));

  bar.innerHTML = `
    <div class="milestone-label">Profile Rewards</div>
    <div class="milestone-track">
      <div class="milestone-fill" style="width:${pct}%"></div>
      ${DEPTH_MILESTONES.map(m => {
        const earned = answered >= m.threshold;
        return `<div class="milestone-pip ${earned ? 'earned' : ''}" style="left:${m.threshold}%"
                     title="${escapeHTML(m.name)} — ${escapeHTML(m.desc)}">
          <span class="pip-icon">${earned ? '✅' : m.icon}</span>
          <span class="pip-label">${escapeHTML(m.name)}</span>
        </div>`;
      }).join('')}
    </div>
    <div class="milestone-pct">${answered} of ${totalQ} questions answered — ${pct}%</div>
  `;
}
