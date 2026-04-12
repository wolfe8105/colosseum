/**
 * arena-feed-room.ts — Orchestrator for the live moderated debate feed.
 *
 * Entry/exit points: enterFeedRoom, enterFeedRoomAsSpectator, cleanupFeedRoom.
 * All other feed-room logic lives in focused sub-modules:
 *
 *   arena-feed-events.ts     — appendFeedEvent, addLocalSystem, writeFeedEvent
 *   arena-feed-ui.ts         — pure DOM helpers (timer, labels, budget, sentiment)
 *   arena-feed-machine.ts    — turn-taking state machine, pause/unpause, ad breaks
 *   arena-feed-wiring.ts     — DOM event listener wiring, renderControls
 *   arena-feed-references.ts — cite/challenge dropdowns, reference popup
 *   arena-feed-transcript.ts — Deepgram speech-to-text helpers
 *
 * Spec reference: LIVE-DEBATE-FEED-SPEC.md sections 3-4
 * Round structure: 4 rounds, alternating who starts.
 *   Round 1: A(2m) → 10s → B(2m)
 *   Round 2: B(2m) → 10s → A(2m)
 *   Round 3: A(2m) → 10s → B(2m)
 *   Round 4: B(2m) → 10s → A(2m)
 */

import { safeRpc, getCurrentProfile } from '../auth.ts';
import { escapeHTML, showToast } from '../config.ts';
import {
  getMyDebateLoadout,
} from '../reference-arsenal.ts';
import {
  currentDebate, screenEl,
  challengeRulingTimer,
  set_currentDebate,
  set_loadedRefs, set_opponentCitedRefs, set_challengesRemaining,
  set_feedPaused, set_feedPauseTimeLeft,
  set_challengeRulingTimer,
  set_activeChallengeRefId,
} from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import {
  FEED_TOTAL_ROUNDS, FEED_MAX_CHALLENGES,
} from './arena-types.ts';
import { formatTimer, pushArenaState } from './arena-core.ts';
import { cleanupDeepgram } from './arena-deepgram.ts';
import {
  set_phase, set_round, set_timeLeft, set_scoreA, set_scoreB,
  timeLeft, resetFeedRoomState,
} from './arena-feed-state.ts';
import {
  subscribeRealtime, unsubscribeRealtime, stopHeartbeat, sendGoodbye,
} from './arena-feed-realtime.ts';
import { updateCiteButtonState } from './arena-feed-ui.ts';
import { renderControls } from './arena-feed-wiring.ts';
import { startPreRoundCountdown, clearFeedTimer } from './arena-feed-machine.ts';

// ============================================================
// Re-exports — keep external callers unbroken
// ============================================================

export { appendFeedEvent, addLocalSystem, writeFeedEvent } from './arena-feed-events.ts';
export { setDebaterInputEnabled } from './arena-feed-ui.ts';
export { clearFeedTimer } from './arena-feed-machine.ts';
export { clearInterimTranscript } from './arena-feed-transcript.ts';


// ============================================================
// PUBLIC — enter feed room
// ============================================================

export function enterFeedRoom(debate: CurrentDebate): void {
  set_currentDebate(debate);
  pushArenaState('room');
  if (screenEl) screenEl.innerHTML = '';

  set_phase('pre_round');
  set_round(1);
  set_timeLeft(3); // 3s pre-round countdown
  set_scoreA(0);
  set_scoreB(0);

  const profile = getCurrentProfile();
  const isModView = debate.modView === true;
  const isSpectator = debate.spectatorView === true;
  let debaterAName: string;
  let debaterBName: string;
  if (isSpectator) {
    debaterAName = debate.debaterAName || 'Side A';
    debaterBName = debate.debaterBName || 'Side B';
  } else {
    const myName = isModView
      ? (debate.moderatorName || 'Moderator')
      : (profile?.display_name || profile?.username || 'You');
    debaterAName = debate.role === 'a' ? myName : debate.opponentName;
    debaterBName = debate.role === 'b' ? myName : debate.opponentName;
  }

  const room = document.createElement('div');
  room.className = 'feed-room arena-fade-in';
  room.innerHTML = `
    <div class="feed-header">
      <div class="feed-topic">${escapeHTML(debate.topic)}</div>
      <div class="feed-scoreboard">
        <div class="feed-score-side feed-side-a">
          <span class="feed-score-name">${escapeHTML(debaterAName)}</span>
          <span class="feed-score-label">PRO</span>
          <span class="feed-score-pts" id="feed-score-a">0</span>
        </div>
        <div class="feed-timer-block">
          <div class="feed-timer" id="feed-timer">${formatTimer(timeLeft)}</div>
          <div class="feed-round-label" id="feed-round-label">ROUND 1/${FEED_TOTAL_ROUNDS}</div>
          <div class="feed-turn-label" id="feed-turn-label">Starting...</div>
        </div>
        <div class="feed-score-side feed-side-b">
          <span class="feed-score-name">${escapeHTML(debaterBName)}</span>
          <span class="feed-score-label">CON</span>
          <span class="feed-score-pts" id="feed-score-b">0</span>
        </div>
      </div>
      <div class="feed-spectator-bar"><span class="eye">\uD83D\uDC41\uFE0F</span> <span id="feed-spectator-count">0</span> watching</div>
      <div class="feed-sentiment-gauge" id="feed-sentiment-gauge">
        <div class="feed-sentiment-fill-a" id="feed-sentiment-a" style="width:50%"></div>
        <div class="feed-sentiment-fill-b" id="feed-sentiment-b" style="width:50%"></div>
      </div>
    </div>
    <div class="feed-stream" id="feed-stream"></div>
    <div class="feed-controls" id="feed-controls"></div>
  `;
  screenEl?.appendChild(room);

  // Subscribe to Realtime for feed events
  subscribeRealtime(debate.id);

  // Phase 3: Fetch reference loadout for this debate
  if (!isModView && !isSpectator) {
    getMyDebateLoadout(debate.id).then((refs) => {
      set_loadedRefs(refs as unknown as import('./arena-types.ts').LoadoutReference[]);
      set_challengesRemaining(FEED_MAX_CHALLENGES);
      set_opponentCitedRefs([]);
      updateCiteButtonState();
    }).catch((e) => console.warn('[Arena] Loadout fetch failed:', e));
  }

  // Render initial controls based on role
  renderControls(debate, isModView);

  // Phase 5: Send goodbye on page unload for instant disconnect detection
  window.addEventListener('beforeunload', sendGoodbye);
  window.addEventListener('pagehide', sendGoodbye);

  // Start the pre-round countdown, then auto-transition to first speaker
  startPreRoundCountdown(debate);
}


// ============================================================
// PUBLIC — enter as spectator
// ============================================================

export async function enterFeedRoomAsSpectator(debateId: string): Promise<void> {
  const { data, error } = await safeRpc('get_arena_debate_spectator', { p_debate_id: debateId });
  if (error || !data) {
    showToast('Could not load debate', 'error');
    return;
  }

  const d = data as Record<string, unknown>;
  const debate: CurrentDebate = {
    id: debateId,
    topic: String(d.topic || ''),
    role: 'a' as const, // Placeholder — spectators don't have a real role
    mode: 'live' as any,
    round: Number(d.current_round) || 1,
    totalRounds: Number(d.total_rounds) || 4,
    opponentName: '',
    opponentElo: 0,
    ranked: false,
    messages: [],
    moderatorName: d.moderator_name ? String(d.moderator_name) : null,
    debaterAName: String(d.debater_a_name || 'Side A'),
    debaterBName: String(d.debater_b_name || 'Side B'),
    language: typeof d.language === 'string' ? d.language : 'en',
    spectatorView: true,
  };

  enterFeedRoom(debate);
}


// ============================================================
// CLEANUP (called by arena-room-end.ts)
// ============================================================

export function cleanupFeedRoom(): void {
  // TIMING-12 fix: notify opponent immediately on any exit path (back button,
  // tab navigation, debate end, etc.) before the channel is torn down. Without
  // this, opponent waits 30s for the heartbeat-stale check.
  sendGoodbye();
  clearFeedTimer();
  unsubscribeRealtime();
  // Phase 4: Deepgram cleanup
  cleanupDeepgram();
  resetFeedRoomState();
  // Phase 3 cleanup
  set_loadedRefs([]);
  set_opponentCitedRefs([]);
  set_challengesRemaining(FEED_MAX_CHALLENGES);
  set_feedPaused(false);
  set_feedPauseTimeLeft(0);
  if (challengeRulingTimer) clearInterval(challengeRulingTimer);
  set_challengeRulingTimer(null);
  set_activeChallengeRefId(null);
  document.getElementById('feed-ref-dropdown')?.remove();
  document.getElementById('feed-challenge-overlay')?.remove();
  // Phase 5: Ad break + spectator voting cleanup
  document.getElementById('feed-ad-overlay')?.remove();
  document.getElementById('feed-vote-gate')?.remove();
  // Phase 5: Heartbeat + disconnect cleanup
  stopHeartbeat();
  document.getElementById('feed-disconnect-banner')?.remove();
  window.removeEventListener('beforeunload', sendGoodbye);
  window.removeEventListener('pagehide', sendGoodbye);
}
