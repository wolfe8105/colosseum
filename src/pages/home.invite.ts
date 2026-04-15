/**
 * Home — Invite & Rewards screen
 * F-59 Invite Rewards | Session 268 | April 12, 2026
 *
 * Depends on: auth.ts (safeRpc), config.ts (escapeHTML, showToast),
 *             modifiers.ts (getModifierCatalog, renderEffectCard, tierLabel)
 */

import { safeRpc } from '../auth.ts';
import { escapeHTML, showToast } from '../config.ts';
import type { ModifierEffect, RarityTier } from '../modifiers.ts';
import { getModifierCatalog } from '../modifiers-catalog.ts';
import { renderEffectCard, tierLabel } from '../modifiers-render.ts';

// ── Types ─────────────────────────────────────────────────

interface InviteReward {
  id: string;
  milestone: number;
  reward_type: 'legendary_powerup' | 'mythic_powerup' | 'mythic_modifier';
  pending_review: boolean;
  awarded_at: string;
}

interface ActivityEntry {
  status: string;
  username: string | null;
  event_at: string;
}

interface InviteStats {
  ref_code: string | null;
  invite_url: string | null;
  total_clicks: number;
  total_signups: number;
  total_converts: number;
  next_milestone: number;
  unclaimed_rewards: InviteReward[];
  activity: ActivityEntry[];
}

// ── Module state ───────────────────────────────────────────

let _sheetCleanup: (() => void) | null = null;

// ── Entry point ────────────────────────────────────────────

export async function loadInviteScreen(container: HTMLElement): Promise<void> {
  if (_sheetCleanup) { _sheetCleanup(); _sheetCleanup = null; }
  container.innerHTML = '<div class="invite-loading">Loading your invite stats…</div>';

  const result = await safeRpc('get_my_invite_stats', {});
  const stats = result.data as InviteStats | null;

  if (!stats || result.error) {
    container.innerHTML = '<div class="invite-loading">Could not load invite stats.</div>';
    return;
  }

  render(container, stats);
}

// ── Render ─────────────────────────────────────────────────

function render(container: HTMLElement, stats: InviteStats): void {
  const converts = stats.total_converts;
  const nextMilestone = stats.next_milestone;
  const progressPct = converts >= 25
    ? Math.min(100, ((converts - 25) % 25) / 25 * 100)
    : Math.min(100, converts / nextMilestone * 100);

  const headlineTo = converts < 25
    ? `${converts} of ${nextMilestone} invites to your ${rewardLabel(nextMilestone)}`
    : converts === 25
    ? `Mythic Modifier earned — keep going for more Mythic Power-Ups`
    : `${converts} successful invites · ${Math.floor((converts - 25) / 25)} repeating Mythic${Math.floor((converts - 25) / 25) !== 1 ? 's' : ''} earned`;

  const unclaimedHtml = stats.unclaimed_rewards.length === 0
    ? ''
    : `
      <div class="invite-section">
        <div class="invite-section-title">🎁 UNCLAIMED REWARDS (${stats.unclaimed_rewards.length})</div>
        ${stats.unclaimed_rewards.map(r => rewardRowHtml(r)).join('')}
      </div>`;

  const activityHtml = stats.activity.length === 0
    ? '<div class="invite-empty-activity">No invite activity yet. Share your link!</div>'
    : stats.activity.map(a => activityRowHtml(a)).join('');

  container.innerHTML = `
    <div class="invite-wrap">

      <!-- Progress band -->
      <div class="invite-progress-band">
        <div class="invite-progress-headline">${escapeHTML(headlineTo)}</div>
        <div class="invite-progress-bar">
          <div class="invite-progress-fill" style="width:${progressPct.toFixed(1)}%"></div>
        </div>
        <div class="invite-progress-stats">
          <span>${converts} successful</span>
          <span>${stats.total_signups} signed up</span>
          <span>${stats.total_clicks} clicks</span>
        </div>
      </div>

      <!-- Invite link -->
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

      <!-- Unclaimed rewards -->
      ${unclaimedHtml}

      <!-- Activity feed -->
      <div class="invite-section">
        <div class="invite-section-title">📋 RECENT ACTIVITY</div>
        ${activityHtml}
      </div>

      <!-- Ladder explainer -->
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

  wireInviteScreen(container, stats);
}

// ── HTML helpers ───────────────────────────────────────────

function rewardLabel(milestone: number): string {
  if (milestone === 1) return 'Legendary Power-Up';
  if (milestone === 5) return 'Mythic Power-Up';
  if (milestone === 25) return 'Mythic Modifier';
  return 'Mythic Power-Up';
}

function rewardTypeLabel(type: InviteReward['reward_type']): string {
  return { legendary_powerup: '🟡 Legendary Power-Up', mythic_powerup: '🟣 Mythic Power-Up', mythic_modifier: '⚗️ Mythic Modifier' }[type];
}

function rewardRowHtml(r: InviteReward): string {
  const date = new Date(r.awarded_at).toLocaleDateString();
  const btnLabel = r.pending_review ? 'PENDING REVIEW' : 'CLAIM';
  const btnDisabled = r.pending_review ? 'disabled' : '';
  return `
    <div class="invite-reward-row" data-reward-id="${escapeHTML(r.id)}">
      <div class="invite-reward-info">
        <span class="invite-reward-type">${escapeHTML(rewardTypeLabel(r.reward_type))}</span>
        <span class="invite-reward-milestone">Milestone: ${r.milestone}</span>
        <span class="invite-reward-date">${escapeHTML(date)}</span>
      </div>
      <button class="invite-claim-btn ${r.pending_review ? 'invite-claim-btn--review' : ''}"
              data-reward-id="${escapeHTML(r.id)}"
              data-reward-type="${escapeHTML(r.reward_type)}"
              ${btnDisabled}>${btnLabel}</button>
    </div>`;
}

function activityRowHtml(a: ActivityEntry): string {
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

// ── Event wiring ───────────────────────────────────────────

function wireInviteScreen(container: HTMLElement, stats: InviteStats): void {
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
  container.querySelectorAll<HTMLButtonElement>('.invite-claim-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const rewardId = btn.dataset.rewardId;
      const rewardType = btn.dataset.rewardType as InviteReward['reward_type'];
      if (!rewardId || !rewardType) return;
      openClaimSheet(rewardId, rewardType, container, stats);
    });
  });
}

// ── Claim bottom sheet ─────────────────────────────────────

async function openClaimSheet(
  rewardId: string,
  rewardType: InviteReward['reward_type'],
  container: HTMLElement,
  stats: InviteStats,
): Promise<void> {
  if (_sheetCleanup) { _sheetCleanup(); _sheetCleanup = null; }

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

  const close = (): void => { overlay.remove(); _sheetCleanup = null; };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#claim-cancel')?.addEventListener('click', close);
  _sheetCleanup = close;

  // Load catalog and filter to eligible tier
  const catalog = await getModifierCatalog();
  const tierNeeded: RarityTier = rewardType === 'legendary_powerup' ? 'legendary' : 'mythic';
  const eligible = catalog.filter(e => e.tier_gate === tierNeeded);

  const grid = overlay.querySelector<HTMLElement>('#claim-picker-grid');
  if (!grid) return;

  if (eligible.length === 0) {
    grid.innerHTML = '<div class="invite-empty-activity">No eligible effects found.</div>';
    return;
  }

  grid.innerHTML = eligible.map(e => renderEffectCard(e, {
    showModButton: rewardType === 'mythic_modifier',
    showPuButton:  rewardType !== 'mythic_modifier',
    modButtonLabel: `Select · ${tierLabel(e.tier_gate)}`,
    puButtonLabel:  `Select · ${tierLabel(e.tier_gate)}`,
  })).join('');

  // Wire select buttons
  grid.querySelectorAll<HTMLButtonElement>('.mod-buy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const effectId = btn.dataset.effectId;
      if (!effectId) return;

      // Find effect_num from catalog
      const effect = eligible.find(e => e.id === effectId);
      if (!effect) return;

      btn.disabled = true;
      btn.textContent = 'Claiming…';

      const res = await safeRpc('claim_invite_reward', {
        p_reward_id:  rewardId,
        p_effect_id:  effect.effect_num,
      });

      const data = res.data as { ok?: boolean; error?: string; effect_name?: string } | null;

      if (data?.ok) {
        close();
        showToast(`🎁 ${data.effect_name ?? 'Item'} added to your inventory!`, 'success');
        // Re-render screen with fresh stats
        loadInviteScreen(container);
      } else {
        showToast(data?.error ?? 'Claim failed', 'error');
        btn.disabled = false;
        btn.textContent = 'Select';
      }
    });
  });
}

export function cleanupInviteScreen(): void {
  if (_sheetCleanup) { _sheetCleanup(); _sheetCleanup = null; }
}
