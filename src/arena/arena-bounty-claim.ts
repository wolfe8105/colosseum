/**
 * THE MODERATOR — Arena Bounty Claim (F-28)
 *
 * Pre-debate dropdown for selecting an open bounty against the
 * current opponent. Renders into #pre-debate-bounty zone.
 * Ranked debates only. Called from arena-room-setup.ts.
 */

import { escapeHTML } from '../config.ts';
import { getOpponentBounties, selectBountyClaim } from '../bounties.ts';
import type { OpponentBounty } from '../bounties.ts';

let _selectedBountyId: string | null = null;
let _attemptFeePaid = false;

/** Returns the locked-in bounty ID if the hunter has selected one. */
export function getSelectedBountyId(): string | null {
  return _selectedBountyId;
}

export function resetBountyClaim(): void {
  _selectedBountyId = null;
  _attemptFeePaid = false;
}

/**
 * Renders the bounty claim dropdown into `container`.
 * Only called when debateData.ranked === true and opponentId is set.
 */
export async function renderBountyClaimDropdown(
  container: HTMLElement,
  debateId: string,
  opponentId: string,
  opponentName: string,
): Promise<void> {
  container.innerHTML = `
    <div style="width:100%;max-width:360px;margin-bottom:12px;">
      <div style="font-family:var(--mod-font-display);font-size:11px;letter-spacing:2px;color:var(--mod-text-sub);margin-bottom:6px;">
        🟡 BOUNTIES ON ${escapeHTML(opponentName.toUpperCase())}
      </div>
      <div id="bounty-claim-inner">
        <div style="font-size:12px;color:var(--mod-text-muted);">Checking bounties…</div>
      </div>
    </div>
  `;

  const inner = container.querySelector<HTMLElement>('#bounty-claim-inner')!;
  let bounties: OpponentBounty[] = [];

  try {
    bounties = await getOpponentBounties(opponentId);
  } catch {
    inner.innerHTML = `<div style="font-size:12px;color:var(--mod-text-muted);">Could not load bounties.</div>`;
    return;
  }

  if (bounties.length === 0) {
    inner.innerHTML = `<div style="font-size:12px;color:var(--mod-text-muted);">No open bounties on this opponent.</div>`;
    return;
  }

  // Render dropdown
  const options = bounties.map((b) => {
    const daysLeft = Math.max(0, Math.ceil(
      (new Date(b.expires_at).getTime() - Date.now()) / 86_400_000
    ));
    return `<option value="${escapeHTML(b.bounty_id)}" data-fee="${escapeHTML(String(b.attempt_fee))}" data-amount="${escapeHTML(String(b.amount))}">
      ${Number(b.amount)} tokens — ${daysLeft}d left (5% fee: ${Number(b.attempt_fee)} tokens)
    </option>`;
  }).join('');

  inner.innerHTML = `
    <select id="bounty-claim-select" style="width:100%;padding:9px 10px;background:var(--mod-bg-control);border:1px solid var(--mod-accent-border);border-radius:8px;color:var(--mod-text-primary);font-size:13px;margin-bottom:8px;cursor:pointer;">
      <option value="">— Select a bounty to claim —</option>
      ${options}
    </select>
    <div id="bounty-claim-preview" style="font-size:11px;color:var(--mod-text-muted);margin-bottom:8px;min-height:14px;"></div>
    <button id="bounty-claim-lock-btn" disabled style="width:100%;padding:10px;background:var(--mod-bg-control);color:var(--mod-text-muted);border:1px solid var(--mod-border-primary);border-radius:8px;font-family:var(--mod-font-display);font-size:12px;letter-spacing:1px;cursor:not-allowed;">
      LOCK IN BOUNTY CLAIM
    </button>
    <div id="bounty-claim-error" style="font-size:11px;color:var(--mod-magenta);margin-top:6px;display:none;"></div>
    <div id="bounty-claim-locked" style="display:none;background:rgba(245,166,35,0.12);border:1px solid #F5A623;border-radius:8px;padding:10px 12px;text-align:center;">
      <div style="font-size:13px;color:#F5A623;font-family:var(--mod-font-display);letter-spacing:1px;">🟡 BOUNTY LOCKED</div>
      <div id="bounty-claim-locked-detail" style="font-size:11px;color:var(--mod-text-muted);margin-top:4px;"></div>
    </div>
  `;

  const select = inner.querySelector<HTMLSelectElement>('#bounty-claim-select')!;
  const preview = inner.querySelector<HTMLElement>('#bounty-claim-preview')!;
  const lockBtn = inner.querySelector<HTMLButtonElement>('#bounty-claim-lock-btn')!;
  const errEl = inner.querySelector<HTMLElement>('#bounty-claim-error')!;

  select.addEventListener('change', () => {
    const opt = select.selectedOptions[0];
    const fee = parseFloat(opt.dataset.fee ?? '0');
    const amt = parseFloat(opt.dataset.amount ?? '0');

    if (!select.value) {
      preview.textContent = '';
      lockBtn.disabled = true;
      lockBtn.style.background = 'var(--mod-bg-control)';
      lockBtn.style.color = 'var(--mod-text-muted)';
      lockBtn.style.borderColor = 'var(--mod-border-primary)';
      lockBtn.style.cursor = 'not-allowed';
      return;
    }

    preview.textContent = `Attempt fee: ${fee} tokens (burned regardless of outcome). Win → you earn ${Math.round(amt * 0.95 * 100) / 100} tokens.`;
    lockBtn.disabled = false;
    lockBtn.style.background = '#F5A623';
    lockBtn.style.color = '#0A1128';
    lockBtn.style.borderColor = '#F5A623';
    lockBtn.style.cursor = 'pointer';
  });

  lockBtn.addEventListener('click', async () => {
    if (!select.value || _attemptFeePaid) return;
    errEl.style.display = 'none';

    const bountyId = select.value;
    const opt = select.selectedOptions[0];
    const fee = parseFloat(opt.dataset.fee ?? '0');
    const amt = parseFloat(opt.dataset.amount ?? '0');

    lockBtn.disabled = true;
    lockBtn.textContent = '…';

    const result = await selectBountyClaim(bountyId, debateId);

    if (result.success) {
      _selectedBountyId = bountyId;
      _attemptFeePaid = true;

      // Hide the dropdown, show locked state
      select.style.display = 'none';
      preview.style.display = 'none';
      lockBtn.style.display = 'none';

      const lockedEl = inner.querySelector<HTMLElement>('#bounty-claim-locked')!;
      const detailEl = inner.querySelector<HTMLElement>('#bounty-claim-locked-detail')!;
      lockedEl.style.display = 'block';
      detailEl.textContent = `${fee} token attempt fee paid. Win this debate to claim ${Math.round(amt * 0.95 * 100) / 100} tokens.`;
    } else {
      lockBtn.disabled = false;
      lockBtn.textContent = 'LOCK IN BOUNTY CLAIM';
      errEl.textContent = result.error ?? 'Something went wrong.';
      errEl.style.display = 'block';
    }
  });
}
