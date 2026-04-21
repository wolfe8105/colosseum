/**
 * Home — Invite & Rewards screen  (orchestrator)
 * F-59 Invite Rewards | Session 268 | April 12, 2026
 *
 * Entry points: loadInviteScreen, cleanupInviteScreen.
 * Depends on: auth.ts (safeRpc), invite-types, invite-render, invite-sheet
 */

import { safeRpc } from '../auth.ts';
import { get_my_invite_stats } from '../contracts/rpc-schemas.ts';
import type { InviteStats } from './home.invite-types.ts';
import { renderInvite } from './home.invite-render.ts';
import { openClaimSheet } from './home.invite-sheet.ts';

// ── Module state ───────────────────────────────────────────────────────────

let _sheetCleanup: (() => void) | null = null;

// ── Entry points ───────────────────────────────────────────────────────────

export async function loadInviteScreen(container: HTMLElement): Promise<void> {
  if (_sheetCleanup) { _sheetCleanup(); _sheetCleanup = null; }
  container.innerHTML = '<div class="invite-loading">Loading your invite stats…</div>';

  const result = await safeRpc('get_my_invite_stats', {}, get_my_invite_stats);
  const stats  = result.data as InviteStats | null;

  if (!stats || result.error) {
    container.innerHTML = '<div class="invite-loading">Could not load invite stats.</div>';
    return;
  }

  renderInvite(container, stats, (rewardId, rewardType) => {
    if (_sheetCleanup) { _sheetCleanup(); _sheetCleanup = null; }
    openClaimSheet(
      rewardId,
      rewardType,
      () => { _sheetCleanup = null; },
      () => { loadInviteScreen(container).catch(e => console.error('[invite] reload failed', e)); },
    ).then(cleanup => { _sheetCleanup = cleanup; }).catch(e => console.error('[invite]', e));
  });
}

export function cleanupInviteScreen(): void {
  if (_sheetCleanup) { _sheetCleanup(); _sheetCleanup = null; }
}
