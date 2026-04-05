// arena-core.ts — init, destroy, utilities, browser history
// Part of the arena.ts monolith split

import {
  safeRpc, getSupabaseClient, getCurrentUser, getCurrentProfile,
} from '../auth.ts';
import { isAnyPlaceholder, FEATURES } from '../config.ts';
import { leaveDebate } from '../webrtc.ts';
import { ready } from '../auth.ts';
import {
  view, currentDebate, roundTimer, _rulingCountdownTimer,
  matchFoundDebate, screenEl, queueElapsedTimer, queuePollTimer,
  vmTimer, referencePollTimer,
  set_matchFoundDebate, set_screenEl,
  set_queueElapsedTimer, set_queuePollTimer,
  set_roundTimer, set_vmTimer, set_referencePollTimer,
  set__rulingCountdownTimer,
} from './arena-state.ts';
import type { ArenaView, CurrentDebate } from './arena-types.ts';
import { clearQueueTimers } from './arena-queue.ts';
import { clearMatchAcceptTimers } from './arena-match.ts';
import { stopOpponentPoll } from './arena-room-live.ts';
import { stopReferencePoll } from './arena-mod-refs.ts';
import { renderLobby, showPowerUpShop } from './arena-lobby.ts';
import { joinWithCode } from './arena-private-lobby.ts';
import { injectCSS } from './arena-css.ts';

// ============================================================
// UTILITY HELPERS
// ============================================================

export function isPlaceholder(): boolean {
  return !getSupabaseClient() || isAnyPlaceholder;
}

export function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

export function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ============================================================
// BROWSER HISTORY (Session 121 rewrite)
// ============================================================

export function pushArenaState(viewName: string): void {
  history.pushState({ arenaView: viewName }, '');
}

export const _onPopState = () => {
  // Clean up any overlays still in DOM
  document.getElementById('arena-rank-overlay')?.remove();
  document.getElementById('arena-ruleset-overlay')?.remove();
  document.getElementById('arena-mode-overlay')?.remove();
  const rulingOverlay = document.getElementById('mod-ruling-overlay');
  if (rulingOverlay) { clearInterval(_rulingCountdownTimer!); rulingOverlay.remove(); }

  // Clean up current view state
  if (view === 'room' || view === 'preDebate') {
    clearInterval(roundTimer!);
    clearInterval(_rulingCountdownTimer!);
    stopReferencePoll();
    stopOpponentPoll();
    if (currentDebate?.mode === 'live') {
      leaveDebate();
    }
  }
  if (view === 'queue') {
    clearQueueTimers();
    if (!isPlaceholder()) safeRpc('leave_debate_queue').catch((e) => console.warn('[Arena] leave_debate_queue failed:', e));
  }
  if (view === 'matchFound') {
    clearMatchAcceptTimers();
    set_matchFoundDebate(null);
  }

  // All back navigation returns to lobby
  if (view !== 'lobby') renderLobby();
};
window.addEventListener('popstate', _onPopState);

// ============================================================
// INIT
// ============================================================

export function init(): void {
  if (!FEATURES.arena) return;
  injectCSS();
  set_screenEl(document.getElementById('screen-arena'));
  if (!screenEl) {
    console.warn('[Arena] #screen-arena not found');
    return;
  }
  renderLobby();
  // Auto-open power-up shop if ?shop=1 in URL
  if (new URLSearchParams(window.location.search).get('shop') === '1') {
    showPowerUpShop();
  }
  // F-39: Auto-join via challenge link (?joinCode=XXXXXX)
  const challengeCode = new URLSearchParams(window.location.search).get('joinCode');
  if (challengeCode) {
    window.history.replaceState({}, '', window.location.pathname);
    void joinWithCode(challengeCode.toUpperCase());
  }
}

// ============================================================
// PUBLIC ACCESSORS
// ============================================================

export function getView(): ArenaView {
  return view;
}

export function getCurrentDebate(): CurrentDebate | null {
  return currentDebate ? { ...currentDebate } : null;
}

// ============================================================
// DESTROY
// ============================================================

export function destroy(): void {
  if (queueElapsedTimer) { clearInterval(queueElapsedTimer); set_queueElapsedTimer(null); }
  if (queuePollTimer) { clearInterval(queuePollTimer); set_queuePollTimer(null); }
  if (roundTimer) { clearInterval(roundTimer); set_roundTimer(null); }
  if (vmTimer) { clearInterval(vmTimer); set_vmTimer(null); }
  if (referencePollTimer) { clearInterval(referencePollTimer); set_referencePollTimer(null); }
  if (_rulingCountdownTimer) { clearInterval(_rulingCountdownTimer); set__rulingCountdownTimer(null); }
  window.removeEventListener('popstate', _onPopState);
}

// ============================================================
// AUTO-INIT (matches .js IIFE — waits for auth ready)
// ============================================================

ready.then(() => init()).catch(() => init());
