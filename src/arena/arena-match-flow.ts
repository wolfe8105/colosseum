// arena-match-flow.ts — Match accept/poll/confirm/opponent-declined flow
// Part of the arena-match.ts split (Session 254+).
//
// Imports returnToQueueAfterDecline from arena-match-found.ts (one-way static dep;
// found.ts only reaches this file via dynamic import() for onMatchAccept, so no
// static cycle between the two files).

import { safeRpc } from '../auth.ts';
import {
  matchFoundDebate, matchAcceptTimer, selectedWantMod,
  set_matchAcceptTimer, set_matchAcceptPollTimer, set_selectedWantMod,
} from './arena-state.ts';
import type { MatchAcceptResponse } from './arena-types-match.ts';
import { MATCH_ACCEPT_POLL_TIMEOUT_SEC } from './arena-constants.ts';
import { isPlaceholder } from './arena-core.utils.ts';
import { showPreDebate } from './arena-room-predebate.ts';
import { clearMatchAcceptTimers } from './arena-match-timers.ts';
import { returnToQueueAfterDecline } from './arena-match-found.ts';

export async function onMatchAccept(): Promise<void> {
  clearInterval(matchAcceptTimer!);
  set_matchAcceptTimer(null);
  const acceptBtn = document.getElementById('mf-accept-btn') as HTMLButtonElement | null;
  const declineBtn = document.getElementById('mf-decline-btn') as HTMLButtonElement | null;
  if (acceptBtn) { acceptBtn.disabled = true; acceptBtn.style.opacity = '0.5'; }
  if (declineBtn) { declineBtn.disabled = true; declineBtn.style.opacity = '0.5'; }

  const statusEl = document.getElementById('mf-status');
  if (statusEl) statusEl.textContent = 'Waiting for opponent\u2026';

  if (!isPlaceholder() && matchFoundDebate) {
    const { error } = await safeRpc('respond_to_match', { p_debate_id: matchFoundDebate.id, p_accept: true });
    if (error) {
      if (statusEl) statusEl.textContent = 'Error \u2014 retrying\u2026';
      if (acceptBtn) { acceptBtn.disabled = false; acceptBtn.style.opacity = '1'; }
      if (declineBtn) { declineBtn.disabled = false; declineBtn.style.opacity = '1'; }
      return;
    }
  }

  // Start polling for opponent acceptance
  let pollElapsed = 0;
  let _pollInFlight = false;
  set_matchAcceptPollTimer(setInterval(async () => {
    pollElapsed += 1.5;
    if (pollElapsed >= MATCH_ACCEPT_POLL_TIMEOUT_SEC) {
      onOpponentDeclined();
      return;
    }
    if (!matchFoundDebate || isPlaceholder()) {
      onMatchConfirmed();
      return;
    }
    if (_pollInFlight) return;
    _pollInFlight = true;
    try {
      const { data, error } = await safeRpc<MatchAcceptResponse>('check_match_acceptance', { p_debate_id: matchFoundDebate.id });
      if (error || !data) return;
      const resp = data as MatchAcceptResponse;
      if (resp.status === 'cancelled') {
        onOpponentDeclined();
        return;
      }
      const myCol = matchFoundDebate.role === 'a' ? resp.player_a_ready : resp.player_b_ready;
      const opCol = matchFoundDebate.role === 'a' ? resp.player_b_ready : resp.player_a_ready;
      if (opCol === false) { onOpponentDeclined(); return; }
      if (myCol === true && opCol === true) { onMatchConfirmed(); return; }
    } catch { /* retry next tick */ } finally { _pollInFlight = false; }
  }, 1500));
}

export function onMatchConfirmed(): void {
  clearMatchAcceptTimers();
  const statusEl = document.getElementById('mf-status');
  if (statusEl) statusEl.textContent = '\u2705 Both ready \u2014 entering battle!';
  if (matchFoundDebate) {
    if (selectedWantMod && !isPlaceholder()) {
      safeRpc('request_mod_for_debate', { p_debate_id: matchFoundDebate.id }).catch((e) => console.warn('[Arena] request_mod_for_debate failed:', e));
    }
    set_selectedWantMod(false);
    setTimeout(() => { void showPreDebate(matchFoundDebate!); }, 800);
  }
}

export function onOpponentDeclined(): void {
  clearMatchAcceptTimers();
  const statusEl = document.getElementById('mf-status');
  if (statusEl) statusEl.textContent = 'Opponent declined \u2014 returning to queue\u2026';
  const acceptBtn = document.getElementById('mf-accept-btn') as HTMLButtonElement | null;
  const declineBtn = document.getElementById('mf-decline-btn') as HTMLButtonElement | null;
  if (acceptBtn) { acceptBtn.disabled = true; acceptBtn.style.opacity = '0.5'; }
  if (declineBtn) { declineBtn.disabled = true; declineBtn.style.opacity = '0.5'; }
  setTimeout(() => returnToQueueAfterDecline(), 1500);
}
