/**
 * THE MODERATOR — Bounty Board (F-28)
 *
 * Rivals-only token bounties. Posting gate by profile_depth_pct.
 * Gold dot: any user with ≥1 open incoming bounty.
 *
 * Exports:
 *   postBounty, cancelBounty, getMyBounties
 *   getOpponentBounties, selectBountyClaim
 *   bountyDot            — inline gold dot HTML (universal placement)
 *   loadBountyDotSet     — populates the module-level set of bountied user IDs
 *   userHasBountyDot     — synchronous check against the cached set
 */

import { safeRpc, getIsPlaceholderMode } from './auth.ts';
import type { AuthResult } from './auth.types.ts';

// ============================================================
// TYPES
// ============================================================

export interface BountyRow {
  id: string;
  poster_id?: string;
  poster_username?: string;
  target_id?: string;
  target_username?: string;
  amount: number;
  duration_days: number;
  duration_fee: number;
  status: 'open' | 'claimed' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
}

export interface OpponentBounty {
  bounty_id: string;
  poster_id: string;
  amount: number;
  duration_days: number;
  expires_at: string;
  attempt_fee: number;
}

export interface MyBountiesResult {
  incoming: BountyRow[];
  outgoing: BountyRow[];
}

export interface PostBountyResult extends AuthResult {
  bounty_id?: string;
}

export interface SelectClaimResult extends AuthResult {
  attempt_fee?: number;
  bounty_amount?: number;
}

// ============================================================
// GOLD DOT — cached set of bountied user IDs
// ============================================================

let _bountyDotSet = new Set<string>();

/**
 * Fetches the full set of user IDs with active open bounties.
 * Call once on page load; refreshes the module-level cache.
 */
export async function loadBountyDotSet(): Promise<void> {
  if (getIsPlaceholderMode()) return;
  try {
    const { data, error } = await safeRpc<{ user_id: string }[]>('get_bounty_dot_user_ids');
    if (error) throw error;
    _bountyDotSet = new Set((data ?? []).map((r) => r.user_id));
  } catch (e) {
    console.warn('[Bounties] loadBountyDotSet failed:', e);
  }
}

/**
 * Synchronous check against the cached set.
 * Call loadBountyDotSet() first on page load.
 */
export function userHasBountyDot(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return _bountyDotSet.has(userId);
}

/**
 * Returns inline gold dot HTML if the user has an active bounty on them.
 * Empty string otherwise — safe to concat unconditionally everywhere a
 * username is rendered (leaderboards, feeds, lobby, spectate, profile,
 * scorecards, mod queue, chat, comments, dialogue bubbles).
 *
 * Usage:
 *   `${escapeHTML(username)}${bountyDot(userId)}`
 */
export function bountyDot(userId: string | null | undefined): string {
  if (!userHasBountyDot(userId)) return '';
  return '<span title="Active bounty" aria-label="Active bounty" style="display:inline-block;margin-left:4px;font-size:0.85em;line-height:1;vertical-align:middle;cursor:default;" class="bounty-dot">🟡</span>';
}

// ============================================================
// RPC WRAPPERS
// ============================================================

export async function postBounty(
  targetId: string,
  amount: number,
  durationDays: number,
): Promise<PostBountyResult> {
  if (getIsPlaceholderMode()) return { success: true, bounty_id: 'placeholder' };
  try {
    const { data, error } = await safeRpc<PostBountyResult>('post_bounty', {
      p_target_id: targetId,
      p_amount: amount,
      p_duration_days: durationDays,
    });
    if (error) throw error;
    return data ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function cancelBounty(bountyId: string): Promise<AuthResult & { refund?: number; burned?: number }> {
  if (getIsPlaceholderMode()) return { success: true };
  try {
    const { data, error } = await safeRpc<AuthResult & { refund?: number; burned?: number }>('cancel_bounty', {
      p_bounty_id: bountyId,
    });
    if (error) throw error;
    return data ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getMyBounties(): Promise<MyBountiesResult> {
  if (getIsPlaceholderMode()) return { incoming: [], outgoing: [] };
  try {
    const { data, error } = await safeRpc<MyBountiesResult>('get_my_bounties');
    if (error) throw error;
    return data ?? { incoming: [], outgoing: [] };
  } catch (e) {
    console.error('[Bounties] getMyBounties error:', e);
    return { incoming: [], outgoing: [] };
  }
}

export async function getOpponentBounties(opponentId: string): Promise<OpponentBounty[]> {
  if (getIsPlaceholderMode()) return [];
  try {
    const { data, error } = await safeRpc<OpponentBounty[]>('get_opponent_bounties', {
      p_opponent_id: opponentId,
    });
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.warn('[Bounties] getOpponentBounties error:', e);
    return [];
  }
}

export async function selectBountyClaim(
  bountyId: string,
  debateId: string,
): Promise<SelectClaimResult> {
  if (getIsPlaceholderMode()) return { success: true };
  try {
    const { data, error } = await safeRpc<SelectClaimResult>('select_bounty_claim', {
      p_bounty_id: bountyId,
      p_debate_id: debateId,
    });
    if (error) throw error;
    return data ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// SLOT LIMIT HELPER (mirrors SQL _bounty_slot_limit)
// Used by the post-bounty UI to show remaining slots without
// an extra RPC round-trip.
// ============================================================

export function bountySlotLimit(depthPct: number): number {
  if (depthPct >= 75) return 6;
  if (depthPct >= 65) return 5;
  if (depthPct >= 55) return 4;
  if (depthPct >= 45) return 3;
  if (depthPct >= 35) return 2;
  if (depthPct >= 25) return 1;
  return 0;
}

// ============================================================
// PROFILE BOUNTY SECTION
// Renders inside the user-profile bottom-sheet (showUserProfile).
// Called with targetId = the profile being viewed, not the viewer.
// ============================================================

export async function renderProfileBountySection(
  container: HTMLElement,
  targetId: string,
  viewerDepth: number,
  viewerBalance: number,
  _openCountHint: number,  // ignored — fetched fresh below
): Promise<void> {
  const slotLimit = bountySlotLimit(viewerDepth);

  container.innerHTML = `
    <div style="margin-top:16px;border-top:1px solid var(--mod-border-primary);padding-top:14px;">
      <div style="font-family:var(--mod-font-display);font-size:11px;letter-spacing:2px;color:var(--mod-text-sub);margin-bottom:10px;">💰 BOUNTY</div>
      <div id="bounty-section-body">
        <div style="text-align:center;font-size:12px;color:var(--mod-text-muted);">Loading…</div>
      </div>
    </div>
  `;

  const body = container.querySelector<HTMLElement>('#bounty-section-body')!;

  if (slotLimit === 0) {
    body.innerHTML = `<div style="font-size:12px;color:var(--mod-text-muted);text-align:center;">Reach 25% profile depth to post bounties.</div>`;
    return;
  }

  // Fetch viewer's open count + check for existing bounty on this target
  let existingBounty: BountyRow | null = null;
  let viewerOpenCount = 0;
  try {
    const { outgoing } = await getMyBounties();
    viewerOpenCount = outgoing.filter((b) => b.status === 'open').length;
    existingBounty = outgoing.find(
      (b) => b.target_id === targetId && b.status === 'open'
    ) ?? null;
  } catch { /* non-fatal */ }

  if (existingBounty) {
    const daysLeft = Math.max(0, Math.ceil(
      (new Date(existingBounty.expires_at).getTime() - Date.now()) / 86_400_000
    ));
    body.innerHTML = `
      <div style="background:var(--mod-bg-subtle);border:1px solid var(--mod-accent-border);border-radius:10px;padding:10px 12px;margin-bottom:8px;">
        <div style="font-size:12px;color:var(--mod-text-sub);">Open bounty on this rival</div>
        <div style="font-family:var(--mod-font-display);font-size:18px;color:#F5A623; /* TODO: needs CSS var token */margin:4px 0;">${existingBounty.amount} tokens</div>
        <div style="font-size:11px;color:var(--mod-text-muted);">${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining</div>
      </div>
      <button id="bounty-cancel-btn" style="width:100%;padding:10px;background:transparent;border:1px solid var(--mod-magenta);color:var(--mod-magenta);border-radius:8px;font-family:var(--mod-font-display);font-size:12px;letter-spacing:1px;cursor:pointer;">
        CANCEL BOUNTY (85% refund)
      </button>
    `;

    document.getElementById('bounty-cancel-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('bounty-cancel-btn') as HTMLButtonElement;
      if (!btn) return;
      const totalPaid = existingBounty!.amount + existingBounty!.duration_days;
      const refundAmt = Math.round(totalPaid * 0.85 * 100) / 100;
      btn.textContent = `Cancel bounty and receive ${refundAmt} tokens back?`;
      btn.style.background = 'rgba(204,41,54,0.15)';
      btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = '…';
        const result = await cancelBounty(existingBounty!.id);
        if (result.success) {
          body.innerHTML = `<div style="font-size:12px;color:var(--mod-text-muted);text-align:center;">Bounty cancelled. ${result.refund} tokens refunded.</div>`;
        } else {
          btn.disabled = false;
          btn.textContent = result.error ?? 'Error — try again';
        }
      };
    });
    return;
  }

  // Post new bounty form
  const slotsLeft = slotLimit - viewerOpenCount;
  body.innerHTML = `
    <div style="font-size:12px;color:var(--mod-text-muted);margin-bottom:8px;">
      Put a price on this rival's head. ${slotsLeft} slot${slotsLeft !== 1 ? 's' : ''} remaining.
    </div>
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <div style="flex:1;">
        <label style="font-size:10px;letter-spacing:1px;color:var(--mod-text-sub);">AMOUNT (tokens)</label>
        <input id="bounty-amount-input" type="number" min="1" max="${viewerBalance}" placeholder="e.g. 100"
          style="width:100%;margin-top:4px;padding:8px;background:var(--mod-bg-control);border:1px solid var(--mod-border-primary);border-radius:8px;color:var(--mod-text-primary);font-size:14px;box-sizing:border-box;" />
      </div>
      <div style="flex:1;">
        <label style="font-size:10px;letter-spacing:1px;color:var(--mod-text-sub);">DURATION (days)</label>
        <input id="bounty-duration-input" type="number" min="1" max="365" value="7"
          style="width:100%;margin-top:4px;padding:8px;background:var(--mod-bg-control);border:1px solid var(--mod-border-primary);border-radius:8px;color:var(--mod-text-primary);font-size:14px;box-sizing:border-box;" />
      </div>
    </div>
    <div id="bounty-cost-preview" style="font-size:11px;color:var(--mod-text-muted);margin-bottom:8px;min-height:16px;"></div>
    <div id="bounty-post-error" style="font-size:11px;color:var(--mod-magenta);margin-bottom:6px;display:none;"></div>
    <button id="bounty-post-btn" style="width:100%;padding:11px;background:var(--mod-accent);color:var(--mod-bg-base);border:none;border-radius:8px;font-family:var(--mod-font-display);font-size:13px;letter-spacing:2px;cursor:pointer;">
      🟡 POST BOUNTY
    </button>
  `;

  function _updatePreview() {
    const amt = Number((document.getElementById('bounty-amount-input') as HTMLInputElement)?.value) || 0;
    const dur = Number((document.getElementById('bounty-duration-input') as HTMLInputElement)?.value) || 0;
    const preview = document.getElementById('bounty-cost-preview');
    if (!preview) return;
    if (amt > 0 && dur > 0) {
      const total = amt + dur;
      preview.textContent = `Total cost: ${total} tokens (${amt} bounty + ${dur} duration fee). Balance after: ${viewerBalance - total >= 0 ? viewerBalance - total : '⚠️ insufficient'}.`;
      preview.style.color = viewerBalance - total < 0 ? 'var(--mod-magenta)' : 'var(--mod-text-muted)';
    } else {
      preview.textContent = '';
    }
  }

  document.getElementById('bounty-amount-input')?.addEventListener('input', _updatePreview);
  document.getElementById('bounty-duration-input')?.addEventListener('input', _updatePreview);
  _updatePreview();

  document.getElementById('bounty-post-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('bounty-post-btn') as HTMLButtonElement;
    const errEl = document.getElementById('bounty-post-error') as HTMLElement;
    const amt = Number((document.getElementById('bounty-amount-input') as HTMLInputElement)?.value);
    const dur = Number((document.getElementById('bounty-duration-input') as HTMLInputElement)?.value);

    errEl.style.display = 'none';

    if (!amt || amt <= 0) { errEl.textContent = 'Enter a bounty amount.'; errEl.style.display = 'block'; return; }
    if (!dur || dur < 1 || dur > 365) { errEl.textContent = 'Duration must be 1–365 days.'; errEl.style.display = 'block'; return; }
    if (amt + dur > viewerBalance) { errEl.textContent = 'Insufficient tokens.'; errEl.style.display = 'block'; return; }

    btn.disabled = true;
    btn.textContent = '…';

    const result = await postBounty(targetId, amt, dur);
    if (result.success) {
      body.innerHTML = `<div style="font-size:13px;color:var(--mod-accent);text-align:center;padding:8px 0;">🟡 Bounty posted. It goes live immediately.</div>`;
      // Refresh the dot cache so the dot shows right away in this session
      void loadBountyDotSet();
    } else {
      btn.disabled = false;
      btn.textContent = '🟡 POST BOUNTY';
      errEl.textContent = result.error ?? 'Something went wrong.';
      errEl.style.display = 'block';
    }
  });
}

// ============================================================
// OWN PROFILE BOUNTY LISTS
// Renders the "Bounties On Me / Bounties I've Posted" section
// on the user's own profile / home page.
// ============================================================

export async function renderMyBountiesSection(container: HTMLElement): Promise<void> {
  container.innerHTML = `<div style="font-size:12px;color:var(--mod-text-muted);text-align:center;padding:8px 0;">Loading bounties…</div>`;

  const { incoming, outgoing } = await getMyBounties();

  function _row(b: BountyRow, type: 'incoming' | 'outgoing'): string {
    const daysLeft = Math.max(0, Math.ceil(
      (new Date(b.expires_at).getTime() - Date.now()) / 86_400_000
    ));
    const statusColor = b.status === 'open' ? '#F5A623' : 'var(--mod-text-muted)'; // TODO: needs CSS var token — #F5A623
    const who = type === 'incoming'
      ? `<span style="color:var(--mod-text-sub);">from</span> <strong>${b.poster_username ?? '?'}</strong>`
      : `<span style="color:var(--mod-text-sub);">on</span> <strong>${b.target_username ?? '?'}</strong>`;

    return `
      <div class="bounty-list-row" data-bounty-id="${b.id}" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--mod-border-subtle);">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;">${who}</div>
          <div style="font-size:11px;color:var(--mod-text-muted);margin-top:2px;">${daysLeft}d remaining · ${b.duration_days}-day window</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-family:var(--mod-font-display);font-size:16px;color:${statusColor};">${b.amount}</div>
          <div style="font-size:10px;color:var(--mod-text-muted);letter-spacing:1px;">${b.status.toUpperCase()}</div>
        </div>
        ${type === 'outgoing' && b.status === 'open' ? `<button class="bounty-cancel-row-btn" data-bounty-id="${b.id}" data-amount="${b.amount}" data-duration="${b.duration_days}" style="padding:6px 10px;background:transparent;border:1px solid var(--mod-magenta);color:var(--mod-magenta);border-radius:6px;font-size:11px;cursor:pointer;white-space:nowrap;">CANCEL</button>` : ''}
      </div>
    `;
  }

  const incomingHTML = incoming.length
    ? incoming.map((b) => _row(b, 'incoming')).join('')
    : `<div style="font-size:12px;color:var(--mod-text-muted);padding:8px 0;">No active bounties on you.</div>`;

  const outgoingHTML = outgoing.length
    ? outgoing.map((b) => _row(b, 'outgoing')).join('')
    : `<div style="font-size:12px;color:var(--mod-text-muted);padding:8px 0;">You haven't posted any bounties.</div>`;

  container.innerHTML = `
    <div style="margin-bottom:18px;">
      <div style="font-family:var(--mod-font-display);font-size:11px;letter-spacing:2px;color:var(--mod-text-sub);margin-bottom:8px;">🎯 BOUNTIES ON ME</div>
      ${incomingHTML}
    </div>
    <div>
      <div style="font-family:var(--mod-font-display);font-size:11px;letter-spacing:2px;color:var(--mod-text-sub);margin-bottom:8px;">💰 BOUNTIES I'VE POSTED</div>
      ${outgoingHTML}
    </div>
  `;

  // Wire cancel buttons
  container.querySelectorAll<HTMLButtonElement>('.bounty-cancel-row-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const bountyId = btn.dataset.bountyId!;
      const amt = Number(btn.dataset.amount);
      const dur = Number(btn.dataset.duration);
      const totalPaid = amt + dur;
      const refundAmt = Math.round(totalPaid * 0.85 * 100) / 100;

      if (!btn.dataset.confirmed) {
        btn.dataset.confirmed = '1';
        btn.textContent = `Confirm (${refundAmt} back)`;
        btn.style.background = 'rgba(204,41,54,0.15)';
        return;
      }

      btn.disabled = true;
      btn.textContent = '…';
      const result = await cancelBounty(bountyId);
      if (result.success) {
        // Re-render the section
        await renderMyBountiesSection(container);
        void loadBountyDotSet();
      } else {
        btn.disabled = false;
        btn.textContent = result.error ?? 'Error';
        delete btn.dataset.confirmed;
      }
    });
  });
}
