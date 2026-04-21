/**
 * staking.render.ts — Staking panel HTML renderer
 *
 * renderStakingPanel, _renderPoolBar (private)
 * Extracted from staking.ts (Session 254 track).
 */

import { escapeHTML } from './config.ts';
import { getTier, canStake, getNextTier } from './tiers.ts';
import { getOdds } from './staking.rpc.ts';
import type { PoolData, Odds } from './staking.types.ts';

function _renderPoolBar(odds: Odds, totalPool: number, sideALabel: string, sideBLabel: string): string {
  if (totalPool === 0) {
    return '<div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-muted);text-align:center;padding:8px 0;">No stakes yet — be the first</div>';
  }

  return `
    <div style="margin:8px 0;">
      <div style="display:flex;justify-content:space-between;font-family:var(--mod-font-ui);font-size:11px;color:var(--mod-text-muted);margin-bottom:4px;">
        <span>${escapeHTML(sideALabel)} · ${odds.a}%</span>
        <span style="color:var(--mod-text-heading);font-weight:600;">${totalPool} tokens in pool</span>
        <span>${escapeHTML(sideBLabel)} · ${odds.b}%</span>
      </div>
      <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;background:var(--mod-bg-base);">
        <div style="width:${odds.a}%;background:var(--mod-side-b);transition:width 0.4s;"></div>
        <div style="width:${odds.b}%;background:var(--mod-side-a);transition:width 0.4s;"></div>
      </div>
    </div>`;
}

/** Render the full staking panel HTML. Returns a string safe for innerHTML. */
export function renderStakingPanel(
  debateId: string,
  sideALabel: string,
  sideBLabel: string,
  pool: PoolData,
  questionsAnswered: number
): string {
  const tier = getTier(questionsAnswered || 0);
  const canUserStake = canStake(questionsAnswered || 0);
  const odds = getOdds(pool.total_side_a, pool.total_side_b);
  const totalPool = pool.total_side_a + pool.total_side_b;
  const userStake = pool.user_stake;

  // Already staked
  if (userStake) {
    const stakedSideLabel = userStake.side === 'a' ? sideALabel : sideBLabel;
    return `
      <div class="staking-panel staking-placed" style="background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:10px;padding:16px;margin:12px 0;">
        <div style="font-family:var(--mod-font-ui);font-size:14px;color:var(--mod-text-heading);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">YOUR STAKE</div>
        <div style="font-family:var(--mod-font-ui);font-size:16px;color:var(--mod-text-primary);margin-bottom:12px;">
          <span style="color:var(--mod-text-heading);font-weight:700;">${userStake.amount} tokens</span>
          on <span style="font-weight:600;">${escapeHTML(stakedSideLabel)}</span>
        </div>
        ${_renderPoolBar(odds, totalPool, sideALabel, sideBLabel)}
      </div>`;
  }

  // Locked
  if (!canUserStake) {
    const next = getNextTier(questionsAnswered || 0);
    const remaining = next ? next.questionsNeeded : 0;
    return `
      <div class="staking-panel staking-locked" style="background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:10px;padding:16px;margin:12px 0;opacity:0.7;">
        <div style="font-family:var(--mod-font-ui);font-size:14px;color:var(--mod-text-sub);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">TOKEN STAKING 🔒</div>
        <div style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-muted);">
          Answer ${remaining} more profile questions to unlock staking.
          <a href="moderator-profile-depth.html" style="color:var(--mod-text-heading);text-decoration:none;">Complete your profile →</a>
        </div>
        ${totalPool > 0 ? _renderPoolBar(odds, totalPool, sideALabel, sideBLabel) : ''}
      </div>`;
  }

  // Active
  const quickAmounts = [5, 10, 25];
  if (tier.stakeCap >= 50) quickAmounts.push(50);
  if (tier.stakeCap >= 100) quickAmounts.push(100);

  return `
    <div class="staking-panel staking-active" style="background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:10px;padding:16px;margin:12px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-family:var(--mod-font-ui);font-size:14px;color:var(--mod-text-heading);letter-spacing:1px;text-transform:uppercase;">STAKE TOKENS</div>
        <div style="font-family:var(--mod-font-ui);font-size:11px;color:var(--mod-text-muted);">${tier.icon} ${tier.name} · Max ${tier.stakeCap}</div>
      </div>
      ${_renderPoolBar(odds, totalPool, sideALabel, sideBLabel)}
      <div style="display:flex;gap:8px;margin:12px 0 8px;">
        <button class="stake-side-btn" data-side="a" data-debate="${debateId}" style="flex:1;padding:10px;border:2px solid var(--mod-side-b)44;background:var(--mod-side-b)11;border-radius:8px;color:var(--mod-side-b);font-family:var(--mod-font-ui);font-size:14px;font-weight:600;cursor:pointer;text-transform:uppercase;transition:all 0.2s;">${escapeHTML(sideALabel)} · ${odds.multiplierA}x</button>
        <button class="stake-side-btn" data-side="b" data-debate="${debateId}" style="flex:1;padding:10px;border:2px solid var(--mod-side-a)44;background:var(--mod-side-a)11;border-radius:8px;color:var(--mod-accent);font-family:var(--mod-font-ui);font-size:14px;font-weight:600;cursor:pointer;text-transform:uppercase;transition:all 0.2s;">${escapeHTML(sideBLabel)} · ${odds.multiplierB}x</button>
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:8px;">
        <input type="number" id="stake-amount-input" min="1" max="${tier.stakeCap}" placeholder="Amount" style="flex:1;padding:8px 10px;background:var(--mod-bg-base);border:1px solid var(--mod-border-primary);border-radius:6px;color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;outline:none;">
        ${quickAmounts.map(a => `<button class="stake-quick-btn" data-amount="${a}" style="padding:6px 10px;background:var(--mod-bg-card);border:1px solid var(--mod-border-secondary);border-radius:6px;color:var(--mod-text-body);font-size:12px;font-family:var(--mod-font-ui);cursor:pointer;">${a}</button>`).join('')}
      </div>
      <button id="stake-confirm-btn" disabled style="width:100%;margin-top:10px;padding:12px;background:var(--mod-bar-accent);background-image:var(--mod-gloss);border:none;border-radius:8px;color:var(--mod-text-on-accent);font-family:var(--mod-font-ui);font-size:15px;font-weight:600;letter-spacing:1px;text-transform:uppercase;cursor:pointer;opacity:0.5;transition:all 0.2s;">SELECT A SIDE</button>
      <div id="stake-error" style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-accent);margin-top:6px;display:none;"></div>
    </div>`;
}
