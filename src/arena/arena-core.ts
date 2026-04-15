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
  resetState,
} from './arena-state.ts';
import type { ArenaView, CurrentDebate } from './arena-types.ts';
import { clearQueueTimers } from './arena-queue.ts';
import { clearMatchAcceptTimers } from './arena-match.ts';
import { stopOpponentPoll } from './arena-room-live-poll.ts';
import { stopReferencePoll } from './arena-mod-refs.ts';
import { stopModStatusPoll } from './arena-mod-queue.ts';

import { joinWithCode } from './arena-private-lobby.ts';
import { injectCSS } from './arena-css.ts';
import { cleanupPendingRecording } from '../voicememo.ts';
import { cleanupFeedRoom, enterFeedRoomAsSpectator } from './arena-feed-room.ts';

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
    stopModStatusPoll();
    if (currentDebate?.mode === 'live') {
      cleanupFeedRoom();
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
  if (view !== 'lobby') void import('./arena-lobby.ts').then(({ renderLobby }) => renderLobby());
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
  void import('./arena-lobby.ts').then(({ renderLobby, showPowerUpShop }) => {
    renderLobby();
    // Auto-open power-up shop if ?shop=1 in URL
    if (new URLSearchParams(window.location.search).get('shop') === '1') {
      showPowerUpShop();
    }
  });
  // F-39: Auto-join via challenge link (?joinCode=XXXXXX)
  // Session 240: Auto-spectate via ?spectate=<debateId>
  // Only one path runs — else-if guard prevents both firing when both params are present.
  const challengeCode = new URLSearchParams(window.location.search).get('joinCode');
  const spectateId = new URLSearchParams(window.location.search).get('spectate');
  if (challengeCode) {
    window.history.replaceState({}, '', window.location.pathname);
    void joinWithCode(challengeCode.toUpperCase());
  } else if (spectateId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(spectateId)) {
    window.history.replaceState({}, '', window.location.pathname);
    void enterFeedRoomAsSpectator(spectateId);
  } else {
    // F-39: Consume pending challenge stored by moderator-challenge.html (post-login path)
    try {
      const pending = localStorage.getItem('mod_pending_challenge');
      if (pending) {
        localStorage.removeItem('mod_pending_challenge');
        window.history.replaceState({}, '', window.location.pathname);
        void joinWithCode(pending.toUpperCase());
      }
    } catch { /* localStorage blocked — ignore */ }
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
  // Leave live/feed debate if active
  if (currentDebate?.mode === 'live') {
    cleanupFeedRoom();
    leaveDebate();
  }

  // Clean up any pending voice memo recordings and ObjectURLs
  cleanupPendingRecording();

  // resetState() clears ALL timers (queue, match, round, vm, reference,
  // ruling countdown, private lobby, mod queue, mod status, mod debate,
  // opponent poll, silence) and resets all mutable state variables.
  resetState();

  window.removeEventListener('popstate', _onPopState);
}

// ============================================================
// AUTO-INIT (matches .js IIFE — waits for auth ready)
// ============================================================

ready.then(() => init()).catch(() => init());
