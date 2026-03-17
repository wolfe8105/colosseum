/**
 * THE COLOSSEUM — Token Staking System (TypeScript)
 *
 * Typed mirror of colosseum-staking.js.
 * Depends on: auth.ts (safeRpc), tiers.ts (getTier, canStake)
 *
 * THIS IS WHERE LM-185 DIES: `import { safeRpc }` replaces bare
 * `ColosseumAuth.safeRpc()` — scope bug is structurally impossible.
 *
 * Migration: Session 126 (Phase 2)
 */

import { safeRpc } from './auth.ts';
import { getTier, canStake, getNextTier } from './tiers.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface StakeResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface PoolData {
  exists: boolean;
  total_side_a: number;
  total_side_b: number;
  pool_status: string;
  user_stake: UserStake | null;
}

export interface UserStake {
  side: 'a' | 'b';
  amount: number;
  [key: string]: unknown;
}

export interface Odds {
  a: number;
  b: number;
  multiplierA: string;
  multiplierB: string;
}

export interface SettleResult {
  success: boolean;
  error?: string;
  payout?: number;
  [key: string]: unknown;
}

// ============================================================
// RPC FUNCTIONS
// ============================================================

/** Place a stake on a debate side. */
export async function placeStake(debateId: string, side: string, amount: number | string): Promise<StakeResult> {
  if (!debateId || !side || !amount) {
    return { success: false, error: 'Missing required fields' };
  }

  const result = await safeRpc<StakeResult>('place_stake', {
    p_debate_id: debateId,
    p_side: side,
    p_amount: parseInt(String(amount), 10),
  });

  if (result.error) {
    return { success: false, error: result.error.message ?? 'Stake failed' };
  }

  return result.data ?? { success: false, error: 'No response' };
}

/** Get current pool state for a debate. */
export async function getPool(debateId: string): Promise<PoolData> {
  const emptyPool: PoolData = { exists: false, total_side_a: 0, total_side_b: 0, pool_status: 'none', user_stake: null };

  const result = await safeRpc<PoolData>('get_stake_pool', {
    p_debate_id: debateId,
  });

  if (result.error) return emptyPool;
  return result.data ?? emptyPool;
}

/** Settle stakes after debate completion. Parimutuel payout. */
export async function settleStakes(debateId: string, winner: string, multiplier?: number): Promise<SettleResult> {
  const params: Record<string, unknown> = {
    p_debate_id: debateId,
    p_winner: winner,
  };
  if (multiplier != null && multiplier > 1) {
    params.p_multiplier = multiplier;
  }

  const result = await safeRpc<SettleResult>('settle_stakes', params);

  if (result.error) {
    console.error('[Staking] settle error:', result.error);
    return { success: false, error: result.error.message };
  }

  return result.data ?? { success: false, error: 'No response' };
}

// ============================================================
// ODDS CALCULATION
// ============================================================

/** Calculate implied odds from pool totals. */
export function getOdds(totalA: number, totalB: number): Odds {
  const total = totalA + totalB;
  if (total === 0) return { a: 50, b: 50, multiplierA: '2.00', multiplierB: '2.00' };

  const pctA = Math.round((totalA / total) * 100);
  const pctB = 100 - pctA;

  const multA = totalA > 0 ? (total / totalA).toFixed(2) : '∞';
  const multB = totalB > 0 ? (total / totalB).toFixed(2) : '∞';

  return { a: pctA, b: pctB, multiplierA: multA, multiplierB: multB };
}

// ============================================================
// RENDER: POOL BAR (shared)
// ============================================================

function _renderPoolBar(odds: Odds, totalPool: number, sideALabel: string, sideBLabel: string): string {
  if (totalPool === 0) {
    return '<div style="font-family:\'Barlow\',sans-serif;font-size:12px;color:#666;text-align:center;padding:8px 0;">No stakes yet — be the first</div>';
  }

  return `
    <div style="margin:8px 0;">
      <div style="display:flex;justify-content:space-between;font-family:'Barlow',sans-serif;font-size:11px;color:#999;margin-bottom:4px;">
        <span>${sideALabel} · ${odds.a}%</span>
        <span style="color:#D4AF37;font-weight:600;">${totalPool} tokens in pool</span>
        <span>${sideBLabel} · ${odds.b}%</span>
      </div>
      <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;background:#0f0f1a;">
        <div style="width:${odds.a}%;background:#2563eb;transition:width 0.4s;"></div>
        <div style="width:${odds.b}%;background:#cc0000;transition:width 0.4s;"></div>
      </div>
    </div>`;
}

// ============================================================
// RENDER: STAKING PANEL
// ============================================================

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
      <div class="staking-panel staking-placed" style="background:#1a1a2e;border:1px solid #2a2a3e;border-radius:10px;padding:16px;margin:12px 0;">
        <div style="font-family:'Oswald',sans-serif;font-size:14px;color:#D4AF37;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">YOUR STAKE</div>
        <div style="font-family:'Barlow',sans-serif;font-size:16px;color:#fff;margin-bottom:12px;">
          <span style="color:#D4AF37;font-weight:700;">${userStake.amount} tokens</span>
          on <span style="font-weight:600;">${stakedSideLabel}</span>
        </div>
        ${_renderPoolBar(odds, totalPool, sideALabel, sideBLabel)}
      </div>`;
  }

  // Locked
  if (!canUserStake) {
    const next = getNextTier(questionsAnswered || 0);
    const remaining = next ? next.questionsNeeded : 0;
    return `
      <div class="staking-panel staking-locked" style="background:#1a1a2e;border:1px solid #2a2a3e;border-radius:10px;padding:16px;margin:12px 0;opacity:0.7;">
        <div style="font-family:'Oswald',sans-serif;font-size:14px;color:#8a879a;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">TOKEN STAKING 🔒</div>
        <div style="font-family:'Barlow',sans-serif;font-size:13px;color:#999;">
          Answer ${remaining} more profile questions to unlock staking.
          <a href="colosseum-profile-depth.html" style="color:#D4AF37;text-decoration:none;">Complete your profile →</a>
        </div>
        ${totalPool > 0 ? _renderPoolBar(odds, totalPool, sideALabel, sideBLabel) : ''}
      </div>`;
  }

  // Active
  const quickAmounts = [5, 10, 25];
  if (tier.stakeCap >= 50) quickAmounts.push(50);
  if (tier.stakeCap >= 100) quickAmounts.push(100);

  return `
    <div class="staking-panel staking-active" style="background:#1a1a2e;border:1px solid #D4AF3744;border-radius:10px;padding:16px;margin:12px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-family:'Oswald',sans-serif;font-size:14px;color:#D4AF37;letter-spacing:1px;text-transform:uppercase;">STAKE TOKENS</div>
        <div style="font-family:'Barlow',sans-serif;font-size:11px;color:#666;">${tier.icon} ${tier.name} · Max ${tier.stakeCap}</div>
      </div>
      ${_renderPoolBar(odds, totalPool, sideALabel, sideBLabel)}
      <div style="display:flex;gap:8px;margin:12px 0 8px;">
        <button class="stake-side-btn" data-side="a" data-debate="${debateId}" style="flex:1;padding:10px;border:2px solid #2563eb44;background:#2563eb11;border-radius:8px;color:#2563eb;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:600;cursor:pointer;text-transform:uppercase;transition:all 0.2s;">${sideALabel} · ${odds.multiplierA}x</button>
        <button class="stake-side-btn" data-side="b" data-debate="${debateId}" style="flex:1;padding:10px;border:2px solid #cc000044;background:#cc000011;border-radius:8px;color:#cc0000;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:600;cursor:pointer;text-transform:uppercase;transition:all 0.2s;">${sideBLabel} · ${odds.multiplierB}x</button>
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:8px;">
        <input type="number" id="stake-amount-input" min="1" max="${tier.stakeCap}" placeholder="Amount" style="flex:1;padding:8px 10px;background:#0f0f1a;border:1px solid #2a2a3e;border-radius:6px;color:#fff;font-family:'Barlow',sans-serif;font-size:14px;outline:none;">
        ${quickAmounts.map(a => `<button class="stake-quick-btn" data-amount="${a}" style="padding:6px 10px;background:#2a2a3e;border:1px solid #3a3a4e;border-radius:6px;color:#ccc;font-size:12px;font-family:'Barlow',sans-serif;cursor:pointer;">${a}</button>`).join('')}
      </div>
      <button id="stake-confirm-btn" disabled style="width:100%;margin-top:10px;padding:12px;background:linear-gradient(135deg,#D4AF37,#B8860B);border:none;border-radius:8px;color:#0f0f1a;font-family:'Oswald',sans-serif;font-size:15px;font-weight:600;letter-spacing:1px;text-transform:uppercase;cursor:pointer;opacity:0.5;transition:all 0.2s;">SELECT A SIDE</button>
      <div id="stake-error" style="font-family:'Barlow',sans-serif;font-size:12px;color:#cc0000;margin-top:6px;display:none;"></div>
    </div>`;
}

// ============================================================
// WIRE: STAKING PANEL INTERACTIVITY
// ============================================================

/** Wire up click handlers after inserting renderStakingPanel HTML into the DOM. */
export function wireStakingPanel(debateId: string, onStakePlaced?: (result: StakeResult) => void): void {
  let selectedSide: string | null = null;

  // Side buttons
  document.querySelectorAll('.stake-side-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLButtonElement;
      selectedSide = el.dataset.side ?? null;

      document.querySelectorAll('.stake-side-btn').forEach(b => {
        const bEl = b as HTMLElement;
        bEl.style.borderColor = bEl.dataset.side === 'a' ? '#2563eb44' : '#cc000044';
        bEl.style.background = bEl.dataset.side === 'a' ? '#2563eb11' : '#cc000011';
      });

      if (selectedSide === 'a') {
        el.style.borderColor = '#2563eb';
        el.style.background = '#2563eb33';
      } else {
        el.style.borderColor = '#cc0000';
        el.style.background = '#cc000033';
      }

      _updateConfirmButton(selectedSide);
    });
  });

  // Quick amount buttons
  document.querySelectorAll('.stake-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('stake-amount-input') as HTMLInputElement | null;
      if (input) input.value = (btn as HTMLElement).dataset.amount ?? '';
      _updateConfirmButton(selectedSide);
    });
  });

  // Amount input
  const amountInput = document.getElementById('stake-amount-input') as HTMLInputElement | null;
  if (amountInput) {
    amountInput.addEventListener('input', () => _updateConfirmButton(selectedSide));
  }

  // Confirm button
  const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement | null;
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!selectedSide || !amountInput?.value) return;

      const amount = parseInt(amountInput.value, 10);
      const errorEl = document.getElementById('stake-error');

      confirmBtn.disabled = true;
      confirmBtn.textContent = 'PLACING STAKE...';

      const result = await placeStake(debateId, selectedSide, amount);

      if (result.success) {
        confirmBtn.textContent = 'STAKE PLACED ✓';
        confirmBtn.style.background = '#16a34a';
        if (errorEl) errorEl.style.display = 'none';
        if (onStakePlaced) onStakePlaced(result);
      } else {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'CONFIRM STAKE';
        if (errorEl) {
          errorEl.textContent = result.error ?? 'Stake failed';
          errorEl.style.display = 'block';
        }
      }
    });
  }
}

function _updateConfirmButton(selectedSide: string | null): void {
  const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement | null;
  const amountInput = document.getElementById('stake-amount-input') as HTMLInputElement | null;
  if (!confirmBtn) return;

  const amount = amountInput ? parseInt(amountInput.value, 10) : 0;

  if (selectedSide && amount > 0) {
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.textContent = `STAKE ${amount} ON SIDE ${selectedSide.toUpperCase()}`;
  } else if (selectedSide) {
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
    confirmBtn.textContent = 'ENTER AMOUNT';
  } else {
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
    confirmBtn.textContent = 'SELECT A SIDE';
  }
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

const staking = {
  placeStake,
  getPool,
  settleStakes,
  getOdds,
  renderStakingPanel,
  wireStakingPanel,
} as const;

export default staking;
