/**
 * Home — Invite Rewards render
 * Builds the full invite screen HTML from stats; delegates event wiring.
 */

import { escapeHTML } from '../config.ts';
import type { InviteStats, InviteReward } from './home.invite-types.ts';
import { rewardLabel, rewardRowHtml, activityRowHtml } from './home.invite-html.ts';
import { wireInviteScreen } from './home.invite-wiring.ts';

export function renderInvite(
  container: HTMLElement,
  stats: InviteStats,
  onClaim: (rewardId: string, rewardType: InviteReward['reward_type']) => void,
): void {
  const converts     = stats.total_converts;
  const nextMilestone = stats.next_milestone;
  const progressPct  = converts >= 25
    ? Math.min(100, ((converts - 25) % 25) / 25 * 100)
    : Math.min(100, converts / nextMilestone * 100);

  const headlineTo = converts < 25
    ? `${converts} of ${nextMilestone} invites to your ${rewardLabel(nextMilestone)}`
    : converts === 25
    ? `Mythic Modifier earned — keep going for more Mythic Power-Ups`
    : `${converts} successful invites · ${Math.floor((converts - 25) / 25)} repeating Mythic${Math.floor((converts - 25) / 25) !== 1 ? 's' : ''} earned`;

  const unclaimedHtml = stats.unclaimed_rewards.length === 0 ? '' : `
      <div class="invite-section">
        <div class="invite-section-title">🎁 UNCLAIMED REWARDS (${stats.unclaimed_rewards.length})</div>
        ${stats.unclaimed_rewards.map(r => rewardRowHtml(r)).join('')}
      </div>`;

  const activityHtml = stats.activity.length === 0
    ? '<div class="invite-empty-activity">No invite activity yet. Share your link!</div>'
    : stats.activity.map(a => activityRowHtml(a)).join('');

  // LANDMINE [LM-INVITE-005]: converts, total_signups, total_clicks interpolated into innerHTML
  // without Number() casts. CLAUDE.md rule violation. (L-F7)
  container.innerHTML = `
    <div class="invite-wrap">

      <div class="invite-progress-band">
        <div class="invite-progress-headline">${escapeHTML(headlineTo)}</div>
        <div class="invite-progress-bar">
          <div class="invite-progress-fill" style="width:${progressPct.toFixed(1)}%"></div>
        </div>
        <div class="invite-progress-stats">
          <span>${Number(converts)} successful</span>
          <span>${Number(stats.total_signups)} signed up</span>
          <span>${Number(stats.total_clicks)} clicks</span>
        </div>
      </div>

      <div class="invite-section">
        <div class="invite-section-title">🔗 YOUR INVITE LINK</div>
        ${stats.invite_url ? `
          <div class="invite-link-box">
            <div class="invite-link-text" id="invite-link-display">${escapeHTML(stats.invite_url)}</div>
            <button class="invite-copy-btn" id="invite-copy-btn">Copy</button>
          </div>
          <div class="invite-share-row">
            <button class="invite-share-btn" id="invite-native-share">📤 Share</button>
            <a class="invite-share-btn" href="https://wa.me/?text=${encodeURIComponent('Join me on The Moderator: ' + stats.invite_url)}" target="_blank" rel="noopener">WhatsApp</a>
            <a class="invite-share-btn" href="sms:?body=${encodeURIComponent('Join me on The Moderator: ' + stats.invite_url)}">SMS</a>
          </div>
        ` : `
          <div class="invite-empty-activity">Complete your profile to unlock your invite link.</div>
        `}
      </div>

      ${unclaimedHtml}

      <div class="invite-section">
        <div class="invite-section-title">📋 RECENT ACTIVITY</div>
        ${activityHtml}
      </div>

      <details class="invite-faq">
        <summary class="invite-faq-summary">HOW IT WORKS</summary>
        <div class="invite-faq-body">
          <p>A referral counts as successful when your invite joins and <strong>completes their first ranked debate</strong>. AI sparring doesn't count.</p>
          <div class="invite-ladder">
            <div class="invite-ladder-row"><span class="invite-ladder-milestone">1 invite</span><span class="invite-ladder-reward">🟡 Legendary Power-Up (you pick)</span></div>
            <div class="invite-ladder-row"><span class="invite-ladder-milestone">5 invites</span><span class="invite-ladder-reward">🟣 Mythic Power-Up (you pick)</span></div>
            <div class="invite-ladder-row"><span class="invite-ladder-milestone">25 invites</span><span class="invite-ladder-reward">⚗️ Mythic Modifier — permanent socket (manual review)</span></div>
            <div class="invite-ladder-row"><span class="invite-ladder-milestone">Every 25 after</span><span class="invite-ladder-reward">🟣 Mythic Power-Up</span></div>
          </div>
          <p>Your invitee gets <strong>500 tokens</strong> as a welcome gift when they complete their first debate.</p>
          <p>Unclaimed rewards never expire.</p>
        </div>
      </details>

    </div>
  `;

  wireInviteScreen(container, stats, onClaim);
}
