/**
 * arena-feed-room.ts — F-51 Phase 1: Live Moderated Debate Feed (text-only skeleton)
 *
 * Turn-taking state machine, unified feed UI, debater/moderator text controls,
 * shared timer, Supabase Realtime subscription, event writing via insert_feed_event RPC.
 *
 * Spec reference: LIVE-DEBATE-FEED-SPEC.md sections 3-4
 * Round structure: 4 rounds, alternating who starts.
 *   Round 1: A(2m) → 10s → B(2m)
 *   Round 2: B(2m) → 10s → A(2m)
 *   Round 3: A(2m) → 10s → B(2m)
 *   Round 4: B(2m) → 10s → A(2m)
 */

import { safeRpc, getCurrentProfile, getSupabaseClient } from '../auth.ts';
import { escapeHTML, showToast } from '../config.ts';
import { nudge } from '../nudge.ts';
import {
  getMyDebateLoadout, citeDebateReference, fileReferenceChallenge,
} from '../reference-arsenal.ts';
import type { LoadoutRef } from '../reference-arsenal.ts';
import {
  currentDebate, screenEl, feedTurnTimer, feedRealtimeChannel,
  loadedRefs, opponentCitedRefs, challengesRemaining,
  feedPaused, feedPauseTimeLeft, challengeRulingTimer,
  activeChallengeRefId,
  set_currentDebate, set_feedTurnTimer, set_feedRealtimeChannel,
  set_loadedRefs, set_opponentCitedRefs, set_challengesRemaining,
  set_feedPaused, set_feedPauseTimeLeft, set_challengeRulingTimer,
  set_activeChallengeRefId,
} from './arena-state.ts';
import type {
  CurrentDebate, DebateRole, FeedEvent, FeedEventType, FeedTurnPhase,
  OpponentCitedRef,
} from './arena-types.ts';
import {
  FEED_TURN_DURATION, FEED_PAUSE_DURATION, FEED_TOTAL_ROUNDS,
  FEED_SCORE_BUDGET, FEED_MAX_CHALLENGES, FEED_CHALLENGE_RULING_SEC,
  FEED_AD_BREAK_DURATION, FEED_FINAL_AD_BREAK_DURATION, FEED_VOTE_GATE_DURATION,
} from './arena-types.ts';
import { isPlaceholder, formatTimer, pushArenaState } from './arena-core.ts';
import { endCurrentDebate } from './arena-room-end.ts';
import { challengeReference } from '../reference-arsenal.ts';
import { startTranscription, stopTranscription, cleanupDeepgram } from './arena-deepgram.ts';
import type { DeepgramStatus } from './arena-deepgram.ts';
import { getLocalStream } from '../webrtc.ts';
import { playSound, vibrate } from './arena-sounds.ts';
import {
  phase, round, timeLeft, scoreA, scoreB,
  renderedEventIds, pinnedEventIds,
  scoreUsed, budgetRound,
  sentimentA, sentimentB, votedRounds, hasVotedFinal,
  pendingSentimentA, pendingSentimentB,
  HEARTBEAT_INTERVAL_MS, HEARTBEAT_STALE_MS,
  heartbeatSendTimer, heartbeatCheckTimer, lastSeen, disconnectHandled,
  set_phase, set_round, set_timeLeft, set_scoreA, set_scoreB,
  set_budgetRound,
  set_sentimentA, set_sentimentB, set_hasVotedFinal,
  set_pendingSentimentA, set_pendingSentimentB,
  set_heartbeatSendTimer, set_heartbeatCheckTimer, set_disconnectHandled,
  firstSpeaker, secondSpeaker, resetFeedRoomState,
} from './arena-feed-state.ts';
import {
  subscribeRealtime, unsubscribeRealtime, stopHeartbeat, sendGoodbye, modNullDebate,
} from './arena-feed-realtime.ts';


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
// FEED RENDERING
// ============================================================

export function appendFeedEvent(ev: FeedEvent): void {
  const stream = document.getElementById('feed-stream');
  if (!stream) return;

  // Fix 6: Dedup — skip if we already rendered this event
  const evKey = ev.id || `${ev.event_type}:${ev.side}:${ev.round}:${ev.content}`;
  if (renderedEventIds.has(evKey)) return;
  renderedEventIds.add(evKey);

  // Fix 7: Look up author name from debate context if not on event
  const debate = currentDebate;
  const debaterAName = debate
    ? (debate.role === 'a'
        ? (getCurrentProfile()?.display_name || getCurrentProfile()?.username || 'You')
        : debate.opponentName)
    : 'Debater A';
  const debaterBName = debate
    ? (debate.role === 'b'
        ? (getCurrentProfile()?.display_name || getCurrentProfile()?.username || 'You')
        : debate.opponentName)
    : 'Debater B';

  const el = document.createElement('div');

  switch (ev.event_type) {
    case 'speech': {
      if (ev.side === 'mod') {
        // Moderator comment
        el.className = 'feed-evt feed-evt-mod arena-fade-in';
        const modName = ev.author_name || debate?.moderatorName || 'Moderator';
        el.innerHTML = `
          <span class="feed-evt-name">\u2696\uFE0F ${escapeHTML(modName)}</span>
          <span class="feed-evt-text">${escapeHTML(ev.content)}</span>
        `;
      } else {
        // Debater speech
        const sideClass = ev.side === 'a' ? 'feed-evt-a' : 'feed-evt-b';
        const name = ev.author_name || (ev.side === 'a' ? debaterAName : debaterBName);
        const isPinned = !!(ev.metadata?.pinned) || pinnedEventIds.has(String(ev.id));
        el.className = `feed-evt ${sideClass}${isPinned ? ' feed-evt-pinned' : ''} arena-fade-in`;
        // Fix 5: Store real DB event ID for moderator scoring
        if (ev.id && !String(ev.id).includes('-')) el.dataset.eventId = String(ev.id);
        // Phase 2: Pin button (mod-only)
        const pinHtml = debate?.modView
          ? `<button class="feed-pin-btn${isPinned ? ' pinned' : ''}" data-eid="${escapeHTML(String(ev.id))}" title="Pin">\uD83D\uDCCC</button>`
          : '';
        el.innerHTML = `
          ${pinHtml}
          <span class="feed-evt-name">${escapeHTML(name)}</span>
          <span class="feed-evt-text">${escapeHTML(ev.content)}</span>
        `;
        // Restore pin state from metadata on backfill
        if (isPinned) pinnedEventIds.add(String(ev.id));
      }
      break;
    }
    case 'point_award': {
      el.className = `feed-evt feed-evt-points feed-fireworks arena-fade-in`;
      const sideName = ev.side === 'a' ? debaterAName : debaterBName;
      el.innerHTML = `<span class="feed-points-badge">+${Number(ev.score)} for ${escapeHTML(sideName)}</span>`;
      // Remove fireworks class after animation completes
      el.addEventListener('animationend', () => el.classList.remove('feed-fireworks'), { once: true });
      playSound('pointsAwarded');
      vibrate(80);
      // Update scoreboard
      if (ev.side === 'a') {
        set_scoreA(scoreA + (Number(ev.score) || 0));
        const scoreEl = document.getElementById('feed-score-a');
        if (scoreEl) scoreEl.textContent = String(scoreA);
      } else if (ev.side === 'b') {
        set_scoreB(scoreB + (Number(ev.score) || 0));
        const scoreEl = document.getElementById('feed-score-b');
        if (scoreEl) scoreEl.textContent = String(scoreB);
      }
      // Phase 2: Track budget usage
      const pts = Number(ev.score) || 0;
      if (pts >= 1 && pts <= 5) {
        // Reset budget counter if round changed
        const evRound = ev.round || round;
        if (evRound !== budgetRound) {
          resetBudget(evRound);
        }
        scoreUsed[pts] = (scoreUsed[pts] || 0) + 1;
        updateBudgetDisplay();
      }
      break;
    }
    case 'round_divider': {
      el.className = 'feed-evt feed-evt-divider arena-fade-in';
      el.innerHTML = `<span class="feed-divider-text">\u2014\u2014\u2014 ${escapeHTML(ev.content)} \u2014\u2014\u2014</span>`;
      break;
    }
    case 'reference_cite': {
      const sideClass = ev.side === 'a' ? 'feed-evt-a' : 'feed-evt-b';
      const citeName = ev.author_name || (ev.side === 'a' ? debaterAName : debaterBName);
      const refMeta = ev.metadata || {};
      el.className = `feed-evt feed-evt-cite ${sideClass} arena-fade-in`;
      el.innerHTML = `
        <span class="feed-evt-name">\uD83D\uDCC4 ${escapeHTML(citeName)}</span>
        <span class="feed-cite-claim" data-ref-id="${escapeHTML(ev.reference_id || '')}"
              data-url="${escapeHTML(String(refMeta.url || ''))}"
              data-domain="${escapeHTML(String(refMeta.domain || ''))}"
              data-source-type="${escapeHTML(String(refMeta.source_type || ''))}"
              >"${escapeHTML(ev.content)}"</span>
        <span class="feed-cite-domain">${escapeHTML(String(refMeta.domain || ''))}</span>
      `;
      playSound('referenceDrop');
      vibrate(60);
      // Track opponent cited refs for challenge dropdown
      const debate = currentDebate;
      if (debate && ev.side && ev.side !== debate.role && ev.reference_id) {
        const existing = opponentCitedRefs.find((r) => r.reference_id === ev.reference_id);
        if (!existing) {
          set_opponentCitedRefs([...opponentCitedRefs, {
            reference_id: ev.reference_id,
            claim: ev.content,
            url: String(refMeta.url || ''),
            domain: String(refMeta.domain || ''),
            source_type: String(refMeta.source_type || ''),
            feed_event_id: String(ev.id),
            already_challenged: false,
          }]);
          updateChallengeButtonState();
        }
      }
      break;
    }
    case 'reference_challenge': {
      el.className = 'feed-evt feed-evt-challenge arena-fade-in';
      const challengerName = ev.author_name || (ev.side === 'a' ? debaterAName : debaterBName);
      el.innerHTML = `
        <span class="feed-challenge-icon">\u2694\uFE0F</span>
        <span class="feed-challenge-text">${escapeHTML(challengerName)} challenges: "${escapeHTML(ev.content)}"</span>
      `;
      playSound('challenge');
      // Mark ref as challenged in opponent state
      if (ev.reference_id) {
        const updated = opponentCitedRefs.map((r) =>
          r.reference_id === ev.reference_id ? { ...r, already_challenged: true } : r
        );
        set_opponentCitedRefs(updated);
      }
      // If this is a new challenge (not backfill), trigger pause for all clients
      // Challenger already paused from success handler — feedPaused will be true, skip
      if (ev.reference_id) {
        set_activeChallengeRefId(ev.reference_id);
      }
      if (!feedPaused && debate) {
        pauseFeed(debate);
      }
      break;
    }
    case 'mod_ruling': {
      const ruling = (ev.metadata?.ruling as string) || '';
      const icon = ruling === 'upheld' ? '\u2705' : ruling === 'rejected' ? '\u274C' : '\u2696\uFE0F';
      el.className = `feed-evt feed-evt-ruling arena-fade-in`;
      el.innerHTML = `
        <span class="feed-ruling-icon">${icon}</span>
        <span class="feed-ruling-text">${ruling === 'upheld' ? 'UPHELD' : ruling === 'rejected' ? 'REJECTED' : 'RULING'}: ${escapeHTML(ev.content)}</span>
      `;
      // Unpause on ruling received
      if (feedPaused) {
        unpauseFeed();
      }
      break;
    }
    case 'power_up': {
      el.className = 'feed-evt feed-evt-powerup arena-fade-in';
      const puId = (ev.metadata?.power_up_id as string) || '';
      const puIcon = puId === 'shield' ? '\uD83D\uDEE1\uFE0F' : puId === 'reveal' ? '\uD83D\uDD0D' : '\u26A1';
      el.innerHTML = `
        <span class="feed-powerup-icon">${puIcon}</span>
        <span class="feed-powerup-text">${escapeHTML(ev.content)}</span>
      `;
      // Unpause if Shield blocked a challenge
      if (puId === 'shield' && feedPaused) {
        unpauseFeed();
      }
      break;
    }
    default: {
      // Unknown event type — render as system message
      el.className = 'feed-evt feed-evt-system arena-fade-in';
      el.textContent = ev.content;
      break;
    }
    case 'sentiment_vote': {
      // Silent — track counts but don't render in feed
      if (ev.side === 'a') set_pendingSentimentA(pendingSentimentA + 1);
      if (ev.side === 'b') set_pendingSentimentB(pendingSentimentB + 1);
      return; // Exit early — do NOT append to DOM
    }
    case 'disconnect': {
      el.className = 'feed-evt feed-evt-disconnect arena-fade-in';
      el.innerHTML = `<span class="feed-disconnect-icon">\u26A0\uFE0F</span> <span class="feed-disconnect-text">${escapeHTML(ev.content)}</span>`;
      break;
    }
  }

  stream.appendChild(el);
  // Feed is manual-scroll per spec, but auto-scroll to new messages if already near bottom
  const isNearBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 80;
  if (isNearBottom) {
    stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' });
  }
}

/** Add a local-only system message (not persisted) */
export function addLocalSystem(text: string): void {
  const stream = document.getElementById('feed-stream');
  if (!stream) return;
  const el = document.createElement('div');
  el.className = 'feed-evt feed-evt-system arena-fade-in';
  el.textContent = text;
  stream.appendChild(el);
  stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' });
}

// ============================================================
// WRITE FEED EVENT VIA RPC
// ============================================================

export async function writeFeedEvent(
  eventType: FeedEventType,
  content: string,
  side: 'a' | 'b' | 'mod' | null,
  score?: number | null,
): Promise<void> {
  const debate = currentDebate;
  if (!debate || isPlaceholder()) return;

  try {
    await safeRpc('insert_feed_event', {
      p_debate_id: debate.id,
      p_event_type: eventType,
      p_round: round,
      p_side: side,
      p_content: content,
      p_score: score ?? null,
    });
  } catch (e) {
    console.warn('[FeedRoom] insert_feed_event failed:', e);
  }
}

// ============================================================
// CONTROLS — debater vs moderator
// ============================================================

function renderControls(debate: CurrentDebate, isModView: boolean): void {
  const controlsEl = document.getElementById('feed-controls');
  if (!controlsEl) return;

  if (isModView) {
    // Moderator controls: comment input + score buttons (Phase 1 skeleton)
    controlsEl.innerHTML = `
      <div class="feed-mod-controls">
        <div class="feed-input-row">
          <textarea class="feed-text-input" id="feed-mod-input" placeholder="Moderator comment..." maxlength="500" rows="1"></textarea>
          <button class="feed-send-btn" id="feed-mod-send-btn" disabled>\u2192</button>
        </div>
        <div class="feed-mod-score-row" id="feed-mod-score-row" style="display:none;">
          <span class="feed-score-prompt" id="feed-score-prompt">Score:</span>
          <span class="feed-score-btn-wrap"><button class="feed-score-btn" data-pts="1">1</button><span class="feed-score-badge" data-badge="1">${FEED_SCORE_BUDGET[1]}</span></span>
          <span class="feed-score-btn-wrap"><button class="feed-score-btn" data-pts="2">2</button><span class="feed-score-badge" data-badge="2">${FEED_SCORE_BUDGET[2]}</span></span>
          <span class="feed-score-btn-wrap"><button class="feed-score-btn" data-pts="3">3</button><span class="feed-score-badge" data-badge="3">${FEED_SCORE_BUDGET[3]}</span></span>
          <span class="feed-score-btn-wrap"><button class="feed-score-btn" data-pts="4">4</button><span class="feed-score-badge" data-badge="4">${FEED_SCORE_BUDGET[4]}</span></span>
          <span class="feed-score-btn-wrap"><button class="feed-score-btn" data-pts="5">5</button><span class="feed-score-badge" data-badge="5">${FEED_SCORE_BUDGET[5]}</span></span>
          <button class="feed-score-btn-cancel" id="feed-score-cancel">\u2715</button>
        </div>
        <div class="feed-mod-action-row">
          <button class="feed-mod-action-btn feed-mod-eject-a" id="feed-mod-eject-a">EJECT ${escapeHTML(debate.debaterAName || 'A')}</button>
          <button class="feed-mod-action-btn feed-mod-eject-b" id="feed-mod-eject-b">EJECT ${escapeHTML(debate.debaterBName || 'B')}</button>
          <button class="feed-mod-action-btn feed-mod-null" id="feed-mod-null">NULL DEBATE</button>
        </div>
      </div>
    `;
    wireModControls();
  } else if (debate.spectatorView) {
    // Spectator controls: vote buttons only
    const aName = debate.debaterAName || 'Side A';
    const bName = debate.debaterBName || 'Side B';
    controlsEl.innerHTML = `
      <div class="feed-spectator-controls">
        <div class="feed-vote-label">WHO'S WINNING?</div>
        <div class="feed-vote-row">
          <button class="feed-vote-btn feed-vote-a" id="feed-vote-a" disabled>${escapeHTML(aName)}</button>
          <button class="feed-vote-btn feed-vote-b" id="feed-vote-b" disabled>${escapeHTML(bName)}</button>
        </div>
        <div class="feed-vote-status" id="feed-vote-status">Voting opens during breaks</div>
      </div>
    `;
    wireSpectatorVoteButtons(debate);
  } else {
    // Debater controls: text input + finish round + cite/challenge + concede
    controlsEl.innerHTML = `
      <div class="feed-debater-controls">
        <div class="feed-input-row">
          <textarea class="feed-text-input" id="feed-debater-input" placeholder="Type your argument..." maxlength="2000" rows="2" disabled></textarea>
          <button class="feed-send-btn" id="feed-debater-send-btn" disabled>\u2192</button>
        </div>
        <div class="feed-action-row">
          <button class="feed-action-btn feed-cite-btn" id="feed-cite-btn" disabled>\uD83D\uDCC4 CITE</button>
          <button class="feed-action-btn feed-challenge-btn" id="feed-challenge-btn" disabled>\u2694\uFE0F CHALLENGE (${challengesRemaining})</button>
          <button class="feed-action-btn feed-finish-btn" id="feed-finish-turn" disabled>FINISH TURN</button>
          <button class="feed-action-btn feed-concede-btn" id="feed-concede" style="display:none;">CONCEDE</button>
        </div>
        <div class="feed-ref-dropdown" id="feed-ref-dropdown" style="display:none;"></div>
      </div>
    `;
    wireDebaterControls(debate);
  }
}

function wireDebaterControls(debate: CurrentDebate): void {
  const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement | null;
  const sendBtn = document.getElementById('feed-debater-send-btn') as HTMLButtonElement | null;
  const finishBtn = document.getElementById('feed-finish-turn') as HTMLButtonElement | null;
  const concedeBtn = document.getElementById('feed-concede') as HTMLButtonElement | null;

  input?.addEventListener('input', () => {
    const len = (input.value || '').length;
    if (sendBtn) sendBtn.disabled = len === 0 || input.disabled;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  sendBtn?.addEventListener('click', () => void submitDebaterMessage());
  input?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submitDebaterMessage(); }
  });

  finishBtn?.addEventListener('click', () => {
    finishCurrentTurn();
  });

  concedeBtn?.addEventListener('click', () => {
    if (!confirm('Concede this debate? This counts as a loss.')) return;
    const d = currentDebate;
    if (!d || d.concededBy) return;
    d.concededBy = d.role;
    clearFeedTimer();
    stopTranscription();
    clearInterimTranscript();
    if (!d.modView) setDebaterInputEnabled(false);
    if (feedPaused) {
      set_feedPaused(false);
      if (challengeRulingTimer) clearInterval(challengeRulingTimer);
      set_challengeRulingTimer(null);
      set_activeChallengeRefId(null);
      document.getElementById('feed-challenge-overlay')?.remove();
    }
    const name = getCurrentProfile()?.display_name || 'Debater';
    void writeFeedEvent('speech', `${name} has conceded.`, 'mod');
    startFinalAdBreak(d);
  });

  // Phase 3: Wire cite button
  const citeBtn = document.getElementById('feed-cite-btn') as HTMLButtonElement | null;
  citeBtn?.addEventListener('click', () => {
    if (feedPaused) return;
    showCiteDropdown(debate);
  });

  // Phase 3: Wire challenge button
  const challengeBtn = document.getElementById('feed-challenge-btn') as HTMLButtonElement | null;
  challengeBtn?.addEventListener('click', () => {
    if (feedPaused) return;
    showChallengeDropdown(debate);
  });
}

function wireSpectatorVoteButtons(debate: CurrentDebate): void {
  const btnA = document.getElementById('feed-vote-a') as HTMLButtonElement | null;
  const btnB = document.getElementById('feed-vote-b') as HTMLButtonElement | null;

  const handleVote = async (side: 'a' | 'b') => {
    if (btnA) btnA.disabled = true;
    if (btnB) btnB.disabled = true;
    votedRounds.add(round);
    const statusEl = document.getElementById('feed-vote-status');
    if (statusEl) statusEl.textContent = 'Vote cast \u2713';

    try {
      await safeRpc('cast_sentiment_vote', {
        p_debate_id: debate.id,
        p_side: side,
        p_round: round,
      });
    } catch (e) {
      console.warn('[FeedRoom] cast_sentiment_vote failed:', e);
      showToast('Vote failed', 'error');
    }
  };

  btnA?.addEventListener('click', () => void handleVote('a'));
  btnB?.addEventListener('click', () => void handleVote('b'));
}

function wireModControls(): void {
  const input = document.getElementById('feed-mod-input') as HTMLTextAreaElement | null;
  const sendBtn = document.getElementById('feed-mod-send-btn') as HTMLButtonElement | null;

  input?.addEventListener('input', () => {
    const len = (input.value || '').length;
    if (sendBtn) sendBtn.disabled = len === 0;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 80) + 'px';
  });

  sendBtn?.addEventListener('click', () => void submitModComment());
  input?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submitModComment(); }
  });

  // Delegated click on feed stream: pin button OR comment selection for scoring
  const stream = document.getElementById('feed-stream');
  stream?.addEventListener('click', (e: Event) => {
    const clickTarget = e.target as HTMLElement;

    // Phase 2: Pin button click
    if (clickTarget.classList.contains('feed-pin-btn')) {
      e.stopPropagation();
      void handlePinClick(clickTarget);
      return;
    }

    // Phase 3: Reference cite click — show popup with details
    const citeEl = clickTarget.closest('.feed-cite-claim') as HTMLElement | null;
    if (citeEl) {
      e.stopPropagation();
      showReferencePopup(citeEl);
      return;
    }

    // Comment selection for scoring
    const target = clickTarget.closest('.feed-evt-a, .feed-evt-b');
    if (!target) return;
    stream.querySelectorAll('.feed-evt-selected').forEach(el => el.classList.remove('feed-evt-selected'));
    target.classList.add('feed-evt-selected');
    const scoreRow = document.getElementById('feed-mod-score-row');
    if (scoreRow) scoreRow.style.display = 'flex';
    const side = target.classList.contains('feed-evt-a') ? 'A' : 'B';
    const prompt = document.getElementById('feed-score-prompt');
    if (prompt) prompt.textContent = `Score Debater ${side}:`;
    // Refresh which buttons are enabled based on current budget
    updateBudgetDisplay();
  });

  // Score button clicks — budget-checked, then score_debate_comment RPC
  document.querySelectorAll('.feed-score-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pts = Number((btn as HTMLElement).dataset.pts);
      // Phase 2: Budget check
      const limit = FEED_SCORE_BUDGET[pts] ?? 0;
      const used = scoreUsed[pts] ?? 0;
      if (used >= limit) {
        showToast(`No ${pts}-pt scores left this round`, 'error');
        return;
      }
      const selected = document.querySelector('.feed-evt-selected') as HTMLElement | null;
      if (!selected) return;
      const eventId = selected.dataset.eventId;
      if (!eventId) {
        showToast('Cannot score this message yet — waiting for confirmation', 'error');
        return;
      }
      const debate = currentDebate;
      if (!debate) return;
      // Disable button immediately to prevent double-tap
      (btn as HTMLButtonElement).disabled = true;
      void safeRpc('score_debate_comment', {
        p_debate_id: debate.id,
        p_feed_event_id: Number(eventId),
        p_score: pts,
      }).then(({ error }) => {
        if (error) {
          console.warn('[FeedRoom] score_debate_comment failed:', error);
          showToast('Scoring failed', 'error');
          // Re-enable since it failed
          (btn as HTMLButtonElement).disabled = false;
        }
        // Budget update happens via appendFeedEvent when the point_award arrives via Realtime
      });
      // Clear selection
      selected.classList.remove('feed-evt-selected');
      const scoreRow = document.getElementById('feed-mod-score-row');
      if (scoreRow) scoreRow.style.display = 'none';
    });
  });

  document.getElementById('feed-score-cancel')?.addEventListener('click', () => {
    document.querySelector('.feed-evt-selected')?.classList.remove('feed-evt-selected');
    const scoreRow = document.getElementById('feed-mod-score-row');
    if (scoreRow) scoreRow.style.display = 'none';
  });

  // Phase 5: Mod eject/null buttons
  document.getElementById('feed-mod-eject-a')?.addEventListener('click', () => {
    if (!confirm('Eject Debater A? This will null the debate.')) return;
    void modNullDebate('eject_a');
  });
  document.getElementById('feed-mod-eject-b')?.addEventListener('click', () => {
    if (!confirm('Eject Debater B? This will null the debate.')) return;
    void modNullDebate('eject_b');
  });
  document.getElementById('feed-mod-null')?.addEventListener('click', () => {
    if (!confirm('Null this debate? No consequences for anyone.')) return;
    void modNullDebate('null');
  });
}

async function submitDebaterMessage(): Promise<void> {
  const debate = currentDebate;
  if (!debate) return;

  const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement | null;
  if (!input || !input.value.trim() || input.disabled) return;

  const text = input.value.trim();
  input.value = '';
  input.style.height = 'auto';
  const sendBtn = document.getElementById('feed-debater-send-btn') as HTMLButtonElement | null;
  if (sendBtn) sendBtn.disabled = true;

  const profile = getCurrentProfile();
  const authorName = profile?.display_name || profile?.username || 'You';

  // Optimistic local render
  appendFeedEvent({
    id: crypto.randomUUID(),
    debate_id: debate.id,
    event_type: 'speech',
    round: round,
    side: debate.role,
    content: text,
    created_at: new Date().toISOString(),
    author_name: authorName,
  });

  // Persist via RPC (Realtime will broadcast to others)
  await writeFeedEvent('speech', text, debate.role);
}

async function submitModComment(): Promise<void> {
  const debate = currentDebate;
  if (!debate) return;

  const input = document.getElementById('feed-mod-input') as HTMLTextAreaElement | null;
  if (!input || !input.value.trim()) return;

  const text = input.value.trim();
  input.value = '';
  input.style.height = 'auto';
  const sendBtn = document.getElementById('feed-mod-send-btn') as HTMLButtonElement | null;
  if (sendBtn) sendBtn.disabled = true;

  appendFeedEvent({
    id: crypto.randomUUID(),
    debate_id: debate.id,
    event_type: 'speech',
    round: round,
    side: 'mod',
    content: text,
    created_at: new Date().toISOString(),
    author_name: debate.moderatorName || 'Moderator',
  });

  await writeFeedEvent('speech', text, 'mod');
}

// ============================================================
// PHASE 2: PIN, BUDGET, FIREWORKS HELPERS
// ============================================================

/** Pin/unpin a speech event (moderator-only). No broadcast — local state only. */
async function handlePinClick(btn: HTMLElement): Promise<void> {
  const debate = currentDebate;
  if (!debate) return;
  const eid = btn.dataset.eid;
  if (!eid || eid.includes('-')) {
    showToast('Cannot pin — waiting for confirmation', 'error');
    return;
  }
  btn.style.pointerEvents = 'none'; // prevent double-tap
  try {
    const { error } = await safeRpc('pin_feed_event', {
      p_debate_id: debate.id,
      p_feed_event_id: Number(eid),
    });
    if (error) {
      console.warn('[FeedRoom] pin_feed_event failed:', error);
      showToast('Pin failed', 'error');
      return;
    }
    // Toggle local pin state
    const wasPinned = pinnedEventIds.has(eid);
    if (wasPinned) {
      pinnedEventIds.delete(eid);
      btn.classList.remove('pinned');
      btn.closest('.feed-evt')?.classList.remove('feed-evt-pinned');
    } else {
      pinnedEventIds.add(eid);
      btn.classList.add('pinned');
      btn.closest('.feed-evt')?.classList.add('feed-evt-pinned');
    }
  } finally {
    btn.style.pointerEvents = '';
  }
}

/** Update budget badge text + disabled state on each score button */
function updateBudgetDisplay(): void {
  for (let pts = 1; pts <= 5; pts++) {
    const limit = FEED_SCORE_BUDGET[pts] ?? 0;
    const used = scoreUsed[pts] ?? 0;
    const remaining = Math.max(0, limit - used);
    // Update badge
    const badge = document.querySelector(`.feed-score-badge[data-badge="${pts}"]`);
    if (badge) badge.textContent = String(remaining);
    // Disable button if exhausted
    const btn = document.querySelector(`.feed-score-btn[data-pts="${pts}"]`) as HTMLButtonElement | null;
    if (btn) btn.disabled = remaining <= 0;
  }
}

/** Reset budget counters for a new round */
function resetBudget(round: number): void {
  set_budgetRound(round);
  for (let pts = 1; pts <= 5; pts++) {
    scoreUsed[pts] = 0;
  }
  updateBudgetDisplay();
}

// ============================================================
// TURN-TAKING STATE MACHINE
// ============================================================

function startPreRoundCountdown(debate: CurrentDebate): void {
  set_phase('pre_round');
  set_timeLeft(3);
  updateTimerDisplay();
  updateTurnLabel('Starting...');

  set_feedTurnTimer(setInterval(() => {
    set_timeLeft(timeLeft - 1);
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearFeedTimer();
      playSound('roundStart');
      // Write round divider
      void writeFeedEvent('round_divider', `Round ${round}`, null);
      addLocalSystem(`--- Round ${round} ---`);
      // Start first speaker
      const first = firstSpeaker(round);
      startSpeakerTurn(first, debate);
    }
  }, 1000));
}

function startSpeakerTurn(speaker: 'a' | 'b', debate: CurrentDebate): void {
  set_phase(speaker === 'a' ? 'speaker_a' : 'speaker_b');
  set_timeLeft(FEED_TURN_DURATION);
  playSound('turnSwitch');

  // Phase 2: Reset scoring budget when round changes
  if (budgetRound !== round) {
    resetBudget(round);
  }

  const isMyTurn = debate.role === speaker && !debate.modView;
  const debaterAName = debate.role === 'a'
    ? (getCurrentProfile()?.display_name || 'You')
    : debate.opponentName;
  const debaterBName = debate.role === 'b'
    ? (getCurrentProfile()?.display_name || 'You')
    : debate.opponentName;
  const speakerName = speaker === 'a' ? debaterAName : debaterBName;

  updateTurnLabel(`${speakerName}'s turn`);
  updateTimerDisplay();
  updateRoundLabel();

  // Enable/disable debater input
  if (!debate.modView) {
    setDebaterInputEnabled(isMyTurn);
    const finishBtn = document.getElementById('feed-finish-turn') as HTMLButtonElement | null;
    if (finishBtn) finishBtn.disabled = !isMyTurn;
    // Show concede after round 1
    const concedeBtn = document.getElementById('feed-concede') as HTMLButtonElement | null;
    if (concedeBtn && round > 1) concedeBtn.style.display = '';
    // Phase 3: enable cite/challenge during my turn
    updateCiteButtonState();
    updateChallengeButtonState();

    // Phase 4: Start Deepgram transcription if it's my turn and mic is available
    if (isMyTurn) {
      const localStream = getLocalStream();
      if (localStream) {
        void startTranscription(
          localStream,
          debate.language ?? 'en', // Session 240: wired to debate creator's profile language
          (text: string) => void handleDeepgramTranscript(text, debate),
          (text: string) => showInterimTranscript(text),
          (status: DeepgramStatus) => updateDeepgramStatus(status),
        );
      }
    }
  }

  set_feedTurnTimer(setInterval(() => {
    // Phase 3: skip tick while paused for challenge ruling
    if (feedPaused) return;
    set_timeLeft(timeLeft - 1);
    updateTimerDisplay();

    // Warning at 15s
    const timerEl = document.getElementById('feed-timer');
    if (timerEl) timerEl.classList.toggle('warning', timeLeft <= 15);
    if (timeLeft === 15) playSound('timerWarning');

    if (timeLeft <= 0) {
      clearFeedTimer();
      onTurnEnd(speaker, debate);
    }
  }, 1000));
}

function finishCurrentTurn(): void {
  const debate = currentDebate;
  if (!debate) return;

  const speaker = phase === 'speaker_a' ? 'a' : phase === 'speaker_b' ? 'b' : null;
  if (!speaker) return;
  if (debate.role !== speaker || debate.modView) return; // only active speaker can finish

  clearFeedTimer();
  addLocalSystem('You finished your turn early.');
  onTurnEnd(speaker, debate);
}

function onTurnEnd(speaker: 'a' | 'b', debate: CurrentDebate): void {
  // Disable debater input
  if (!debate.modView) setDebaterInputEnabled(false);

  // Phase 4: Stop Deepgram transcription + clear interim display
  stopTranscription();
  clearInterimTranscript();

  const first = firstSpeaker(round);
  const second = secondSpeaker(round);

  if (speaker === first) {
    // First speaker done → 10s pause → second speaker
    startPause(speaker === 'a' ? 'pause_ab' : 'pause_ba', debate);
  } else {
    // Second speaker done → round is over → ad break
    if (round >= FEED_TOTAL_ROUNDS) {
      // Phase 5: Final ad break before vote gate
      startFinalAdBreak(debate);
    } else {
      // Phase 5: Ad break between rounds
      startAdBreak(debate);
    }
  }
}

function startPause(pausePhase: FeedTurnPhase, debate: CurrentDebate, newRound = false): void {
  set_phase(pausePhase);
  set_timeLeft(FEED_PAUSE_DURATION);

  const debaterAName = debate.role === 'a'
    ? (getCurrentProfile()?.display_name || 'You')
    : debate.opponentName;
  const debaterBName = debate.role === 'b'
    ? (getCurrentProfile()?.display_name || 'You')
    : debate.opponentName;

  // Figure out who speaks next
  let nextSpeakerSide: 'a' | 'b';
  if (newRound) {
    nextSpeakerSide = firstSpeaker(round);
    playSound('roundStart');
    void writeFeedEvent('round_divider', `Round ${round}`, null);
    addLocalSystem(`--- Round ${round} ---`);
  } else {
    nextSpeakerSide = secondSpeaker(round);
  }
  const nextName = nextSpeakerSide === 'a' ? debaterAName : debaterBName;

  updateTurnLabel(`${nextName}'s turn in...`);
  updateTimerDisplay();

  set_feedTurnTimer(setInterval(() => {
    set_timeLeft(timeLeft - 1);
    updateTimerDisplay();
    updateTurnLabel(`${nextName}'s turn in ${timeLeft}s`);

    if (timeLeft <= 0) {
      clearFeedTimer();
      startSpeakerTurn(nextSpeakerSide, debate);
    }
  }, 1000));
}

// ============================================================
// PHASE 5: AD BREAKS + SPECTATOR VOTING
// ============================================================

function startAdBreak(debate: CurrentDebate): void {
  set_phase('ad_break');
  set_timeLeft(FEED_AD_BREAK_DURATION);

  if (!debate.modView) setDebaterInputEnabled(false);

  updateTurnLabel('COMMERCIAL BREAK');
  updateTimerDisplay();

  const overlay = showAdOverlay(FEED_AD_BREAK_DURATION);

  // Enable spectator voting during ad break
  if (debate.spectatorView && !votedRounds.has(round)) {
    setSpectatorVotingEnabled(true);
  }

  set_feedTurnTimer(setInterval(() => {
    set_timeLeft(timeLeft - 1);
    updateTimerDisplay();
    const countdownEl = overlay?.querySelector('.feed-ad-countdown');
    if (countdownEl) countdownEl.textContent = `Next round in ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearFeedTimer();
      overlay?.remove();
      setSpectatorVotingEnabled(false);
      applySentimentUpdate();
      // Advance to next round (round_divider written by startPreRoundCountdown)
      set_round(round + 1);
      updateRoundLabel();
      startPreRoundCountdown(debate);
    }
  }, 1000));
}

function startFinalAdBreak(debate: CurrentDebate): void {
  set_phase('final_ad_break');
  set_timeLeft(FEED_FINAL_AD_BREAK_DURATION);

  if (!debate.modView) setDebaterInputEnabled(false);

  updateTurnLabel('FINAL BREAK');
  updateTimerDisplay();

  const overlay = showAdOverlay(FEED_FINAL_AD_BREAK_DURATION);

  // Enable spectator voting during final ad break
  if (debate.spectatorView && !votedRounds.has(round)) {
    setSpectatorVotingEnabled(true);
  }

  set_feedTurnTimer(setInterval(() => {
    set_timeLeft(timeLeft - 1);
    updateTimerDisplay();
    const countdownEl = overlay?.querySelector('.feed-ad-countdown');
    if (countdownEl) countdownEl.textContent = `Results in ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearFeedTimer();
      overlay?.remove();
      setSpectatorVotingEnabled(false);
      applySentimentUpdate();

      // Vote gate for spectators, straight to finish for debaters/mod
      if (debate.spectatorView && !hasVotedFinal) {
        showVoteGate(debate);
      } else {
        set_phase('finished');
        playSound('debateEnd');
        addLocalSystem('Debate complete!');
        nudge('feed_debate_end', '\u2696\uFE0F The debate has concluded.');
        setTimeout(() => void endCurrentDebate(), 2000);
      }
    }
  }, 1000));
}

/**
 * Show ad overlay covering the feed. Mod clients skip this.
 * Returns the overlay element (or null for mod) so the caller can remove it.
 */
function showAdOverlay(durationSec: number): HTMLElement | null {
  const debate = currentDebate;
  if (debate?.modView) return null;

  document.getElementById('feed-ad-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'feed-ad-overlay';
  overlay.className = 'feed-ad-overlay';
  overlay.innerHTML = `
    <div class="feed-ad-inner">
      <div class="feed-ad-label">COMMERCIAL BREAK</div>
      <div class="feed-ad-countdown">Resuming in ${durationSec}s</div>
      <div class="feed-ad-slot" id="feed-ad-slot">
        <!-- AdSense placeholder — wired when Google Ads integration is built -->
        <div class="feed-ad-placeholder">AD</div>
      </div>
    </div>
  `;

  const feedRoom = document.querySelector('.feed-room');
  if (feedRoom) feedRoom.appendChild(overlay);

  return overlay;
}

function setSpectatorVotingEnabled(enabled: boolean): void {
  const btnA = document.getElementById('feed-vote-a') as HTMLButtonElement | null;
  const btnB = document.getElementById('feed-vote-b') as HTMLButtonElement | null;
  const statusEl = document.getElementById('feed-vote-status');
  if (btnA) btnA.disabled = !enabled;
  if (btnB) btnB.disabled = !enabled;
  if (statusEl && enabled) statusEl.textContent = 'Cast your vote!';
  if (statusEl && !enabled && !votedRounds.has(round)) statusEl.textContent = 'Voting opens during breaks';
}

function applySentimentUpdate(): void {
  set_sentimentA(sentimentA + pendingSentimentA);
  set_sentimentB(sentimentB + pendingSentimentB);
  set_pendingSentimentA(0);
  set_pendingSentimentB(0);
  updateSentimentGauge();
}

function updateSentimentGauge(): void {
  const total = sentimentA + sentimentB;
  const pctA = total > 0 ? Math.round((sentimentA / total) * 100) : 50;
  const pctB = total > 0 ? 100 - pctA : 50;
  const fillA = document.getElementById('feed-sentiment-a');
  const fillB = document.getElementById('feed-sentiment-b');
  if (fillA) fillA.style.width = pctA + '%';
  if (fillB) fillB.style.width = pctB + '%';
}

function showVoteGate(debate: CurrentDebate): void {
  set_phase('vote_gate');
  set_timeLeft(FEED_VOTE_GATE_DURATION);
  updateTurnLabel('VOTE TO SEE RESULTS');
  updateTimerDisplay();

  document.getElementById('feed-ad-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'feed-vote-gate';
  overlay.className = 'feed-vote-gate';
  overlay.innerHTML = `
    <div class="feed-vote-gate-inner">
      <div class="feed-vote-gate-title">CAST YOUR FINAL VOTE</div>
      <div class="feed-vote-gate-sub">Vote to see the final score and sentiment</div>
      <div class="feed-vote-gate-row">
        <button class="feed-vote-btn feed-vote-a" id="feed-gate-a">${escapeHTML(debate.debaterAName || 'Side A')}</button>
        <button class="feed-vote-btn feed-vote-b" id="feed-gate-b">${escapeHTML(debate.debaterBName || 'Side B')}</button>
      </div>
      <div class="feed-vote-gate-timer" id="feed-gate-timer">Results in ${timeLeft}s</div>
    </div>
  `;

  const feedRoom = document.querySelector('.feed-room');
  if (feedRoom) feedRoom.appendChild(overlay);

  let resolved = false;
  const resolveGate = async (side?: 'a' | 'b') => {
    if (resolved) return;
    resolved = true;
    set_hasVotedFinal(true);
    clearFeedTimer();

    if (side) {
      try {
        await safeRpc('vote_arena_debate', { p_debate_id: debate.id, p_vote: side });
      } catch (e) {
        console.warn('[FeedRoom] vote_arena_debate failed:', e);
      }
    }

    overlay.remove();
    set_phase('finished');
    playSound('debateEnd');
    addLocalSystem('Debate complete!');
    nudge('feed_debate_end', '\u2696\uFE0F The debate has concluded.');
    setTimeout(() => void endCurrentDebate(), 2000);
  };

  overlay.querySelector('#feed-gate-a')?.addEventListener('click', () => void resolveGate('a'));
  overlay.querySelector('#feed-gate-b')?.addEventListener('click', () => void resolveGate('b'));

  set_feedTurnTimer(setInterval(() => {
    set_timeLeft(timeLeft - 1);
    updateTimerDisplay();
    const timerEl = document.getElementById('feed-gate-timer');
    if (timerEl) timerEl.textContent = `Results in ${timeLeft}s`;
    if (timeLeft <= 0) {
      void resolveGate();
    }
  }, 1000));
}

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
// UI HELPERS
// ============================================================

export function clearFeedTimer(): void {
  if (feedTurnTimer) clearInterval(feedTurnTimer);
  set_feedTurnTimer(null);
}

function updateTimerDisplay(): void {
  const timerEl = document.getElementById('feed-timer');
  if (timerEl) timerEl.textContent = formatTimer(Math.max(0, timeLeft));
}

function updateTurnLabel(text: string): void {
  const el = document.getElementById('feed-turn-label');
  if (el) el.textContent = text;
}

function updateRoundLabel(): void {
  const el = document.getElementById('feed-round-label');
  if (el) el.textContent = `ROUND ${round}/${FEED_TOTAL_ROUNDS}`;
}

export function setDebaterInputEnabled(enabled: boolean): void {
  const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement | null;
  const sendBtn = document.getElementById('feed-debater-send-btn') as HTMLButtonElement | null;
  const finishBtn = document.getElementById('feed-finish-turn') as HTMLButtonElement | null;

  if (input) {
    input.disabled = !enabled;
    input.placeholder = enabled ? 'Type your argument...' : 'Waiting for opponent...';
    input.classList.toggle('feed-input-frozen', !enabled);
  }
  if (sendBtn) sendBtn.disabled = !enabled || !(input && input.value.trim().length > 0);
  if (finishBtn) finishBtn.disabled = !enabled;
}

// ============================================================
// CLEANUP (called by arena-room-end.ts)
// ============================================================

export function cleanupFeedRoom(): void {
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

// ============================================================
// PHASE 3: CITE / CHALLENGE / PAUSE
// ============================================================

function updateCiteButtonState(): void {
  const btn = document.getElementById('feed-cite-btn') as HTMLButtonElement | null;
  if (!btn) return;
  const debate = currentDebate;
  const isMyTurn = debate && !debate.modView && (
    (phase === 'speaker_a' && debate.role === 'a') ||
    (phase === 'speaker_b' && debate.role === 'b')
  );
  const uncited = loadedRefs.filter((r) => !r.cited);
  btn.disabled = !isMyTurn || uncited.length === 0 || feedPaused;
  if (uncited.length === 0 && loadedRefs.length > 0) {
    btn.textContent = '\uD83D\uDCC4 ALL CITED';
  }
}

function updateChallengeButtonState(): void {
  const btn = document.getElementById('feed-challenge-btn') as HTMLButtonElement | null;
  if (!btn) return;
  const debate = currentDebate;
  const isMyTurn = debate && !debate.modView && (
    (phase === 'speaker_a' && debate.role === 'a') ||
    (phase === 'speaker_b' && debate.role === 'b')
  );
  const challengeable = opponentCitedRefs.filter((r) => !r.already_challenged);
  btn.disabled = !isMyTurn || challengeable.length === 0 || challengesRemaining <= 0 || feedPaused;
  btn.textContent = `\u2694\uFE0F CHALLENGE (${challengesRemaining})`;
}

function showCiteDropdown(debate: CurrentDebate): void {
  hideDropdown();
  const dropdown = document.getElementById('feed-ref-dropdown');
  if (!dropdown) return;

  const uncited = loadedRefs.filter((r) => !r.cited);
  if (uncited.length === 0) { showToast('No references remaining', 'error'); return; }

  let html = '<div class="feed-dropdown-title">\uD83D\uDCC4 Select reference to cite:</div>';
  for (const ref of uncited) {
    html += `
      <div class="feed-dropdown-item" data-ref-id="${escapeHTML(ref.reference_id)}">
        <span class="feed-dropdown-claim">"${escapeHTML(ref.claim)}"</span>
        <span class="feed-dropdown-meta">${escapeHTML(ref.domain)} \u00B7 PWR ${Number(ref.current_power)}</span>
      </div>
    `;
  }
  html += '<div class="feed-dropdown-cancel" id="feed-dropdown-close">\u2715 Cancel</div>';
  dropdown.innerHTML = html;
  dropdown.style.display = 'block';

  dropdown.querySelector('#feed-dropdown-close')?.addEventListener('click', hideDropdown);
  dropdown.querySelectorAll('.feed-dropdown-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const refId = (item as HTMLElement).dataset.refId;
      if (!refId) return;
      hideDropdown();
      try {
        await citeDebateReference(debate.id, refId, round, debate.role || 'a');
        // Mark as cited locally so dropdown updates immediately
        const updated = loadedRefs.map((r) =>
          r.reference_id === refId ? { ...r, cited: true, cited_at: new Date().toISOString() } : r
        );
        set_loadedRefs(updated);
        updateCiteButtonState();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Cite failed';
        showToast(msg, 'error');
      }
    });
  });
}

function showChallengeDropdown(debate: CurrentDebate): void {
  hideDropdown();
  const dropdown = document.getElementById('feed-ref-dropdown');
  if (!dropdown) return;

  const challengeable = opponentCitedRefs.filter((r) => !r.already_challenged);
  if (challengeable.length === 0) { showToast('No references to challenge', 'error'); return; }
  if (challengesRemaining <= 0) { showToast('No challenges remaining', 'error'); return; }

  let html = '<div class="feed-dropdown-title">\u2694\uFE0F Select reference to challenge:</div>';
  for (const ref of challengeable) {
    html += `
      <div class="feed-dropdown-item feed-dropdown-challenge" data-ref-id="${escapeHTML(ref.reference_id)}">
        <span class="feed-dropdown-claim">"${escapeHTML(ref.claim)}"</span>
        <span class="feed-dropdown-meta">${escapeHTML(ref.domain)}</span>
      </div>
    `;
  }
  html += '<div class="feed-dropdown-cancel" id="feed-dropdown-close">\u2715 Cancel</div>';
  dropdown.innerHTML = html;
  dropdown.style.display = 'block';

  dropdown.querySelector('#feed-dropdown-close')?.addEventListener('click', hideDropdown);
  dropdown.querySelectorAll('.feed-dropdown-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const refId = (item as HTMLElement).dataset.refId;
      if (!refId) return;
      hideDropdown();
      try {
        const result = await fileReferenceChallenge(debate.id, refId, round, debate.role || 'a');
        if (result.blocked) {
          // Shield absorbed it — no pause needed
          showToast('\uD83D\uDEE1\uFE0F Shield blocked the challenge!', 'info');
        } else {
          // Challenge filed — pause the debate
          set_challengesRemaining(result.challenges_remaining ?? (challengesRemaining - 1));
          updateChallengeButtonState();
          set_activeChallengeRefId(refId);
          pauseFeed(debate);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Challenge failed';
        showToast(msg, 'error');
      }
    });
  });
}

function hideDropdown(): void {
  const dropdown = document.getElementById('feed-ref-dropdown');
  if (dropdown) { dropdown.style.display = 'none'; dropdown.innerHTML = ''; }
}

function showReferencePopup(el: HTMLElement): void {
  // Remove any existing popup
  document.getElementById('feed-ref-popup')?.remove();

  const url = el.dataset.url || '';
  const domain = el.dataset.domain || '';
  const sourceType = el.dataset.sourceType || '';
  const claim = el.textContent?.trim() || '';

  const popup = document.createElement('div');
  popup.className = 'feed-ref-popup';
  popup.id = 'feed-ref-popup';
  popup.innerHTML = `
    <div class="feed-ref-popup-inner">
      <div class="feed-ref-popup-claim">"${escapeHTML(claim)}"</div>
      <div class="feed-ref-popup-meta">
        <span class="feed-ref-popup-type">${escapeHTML(sourceType.replace(/_/g, ' '))}</span>
        <span class="feed-ref-popup-domain">${escapeHTML(domain)}</span>
      </div>
      ${url ? `<a class="feed-ref-popup-link" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">Open source \u2197</a>` : ''}
      <button class="feed-ref-popup-close" id="feed-ref-popup-close">\u2715</button>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById('feed-ref-popup-close')?.addEventListener('click', () => popup.remove());
  popup.addEventListener('click', (e) => {
    if (e.target === popup) popup.remove();
  });
}

function pauseFeed(debate: CurrentDebate): void {
  set_feedPaused(true);
  set_feedPauseTimeLeft(timeLeft);

  // Disable all inputs
  setDebaterInputEnabled(false);
  const finishBtn = document.getElementById('feed-finish-turn') as HTMLButtonElement | null;
  if (finishBtn) finishBtn.disabled = true;
  updateCiteButtonState();
  updateChallengeButtonState();

  // Show pause overlay
  updateTurnLabel('\u2694\uFE0F CHALLENGE IN PROGRESS');

  // If moderator, show ruling panel + start auto-accept timer
  if (debate.modView) {
    showChallengeRulingPanel(debate);

    // Start 60s auto-accept countdown (mod client only — prevents duplicate inserts)
    let countdown = FEED_CHALLENGE_RULING_SEC;
    const timerEl = document.getElementById('feed-timer');

    if (challengeRulingTimer) clearInterval(challengeRulingTimer);
    set_challengeRulingTimer(setInterval(() => {
      countdown--;
      if (timerEl) timerEl.textContent = `\u2694\uFE0F ${countdown}s`;
      if (countdown <= 0) {
        if (challengeRulingTimer) clearInterval(challengeRulingTimer);
        set_challengeRulingTimer(null);
        // Auto-accept: insert mod_ruling + update arsenal stats
        const refId = activeChallengeRefId;
        safeRpc('insert_feed_event', {
          p_debate_id: debate.id,
          p_event_type: 'mod_ruling',
          p_round: round,
          p_side: 'mod',
          p_content: 'Auto-accepted (moderator timeout)',
          p_reference_id: refId,
          p_metadata: { ruling: 'upheld' },
        }).then(() => {
          if (refId) {
            return challengeReference(refId, debate.id, 'upheld');
          }
        }).catch((e: unknown) => console.warn('[Arena] Auto-accept ruling failed:', e));
        unpauseFeed();
      }
    }, 1000));
  }
}

function unpauseFeed(): void {
  set_feedPaused(false);

  // Clear ruling timer
  if (challengeRulingTimer) clearInterval(challengeRulingTimer);
  set_challengeRulingTimer(null);
  set_activeChallengeRefId(null);

  // Remove ruling panel if present
  document.getElementById('feed-challenge-overlay')?.remove();

  // Restore timer display
  set_timeLeft(feedPauseTimeLeft);
  set_feedPauseTimeLeft(0);
  updateTimerDisplay();

  // Re-enable controls based on current turn
  const debate = currentDebate;
  if (debate && !debate.modView) {
    const isMyTurn = (
      (phase === 'speaker_a' && debate.role === 'a') ||
      (phase === 'speaker_b' && debate.role === 'b')
    );
    setDebaterInputEnabled(isMyTurn);
    const finishBtn = document.getElementById('feed-finish-turn') as HTMLButtonElement | null;
    if (finishBtn) finishBtn.disabled = !isMyTurn;
    updateCiteButtonState();
    updateChallengeButtonState();
  }

  updateTurnLabel(phase === 'speaker_a' ? 'Side A\'s turn' : phase === 'speaker_b' ? 'Side B\'s turn' : '');
}

function showChallengeRulingPanel(debate: CurrentDebate): void {
  document.getElementById('feed-challenge-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'feed-challenge-overlay';
  overlay.id = 'feed-challenge-overlay';
  overlay.innerHTML = `
    <div class="feed-ruling-panel">
      <div class="feed-ruling-title">\u2696\uFE0F RULING NEEDED</div>
      <div class="feed-ruling-sub">A reference has been challenged. Accept or reject.</div>
      <textarea class="feed-ruling-reason" id="feed-ruling-reason" placeholder="Reason (optional, max 100 words)" maxlength="500" rows="2"></textarea>
      <div class="feed-ruling-btns">
        <button class="feed-ruling-accept" id="feed-ruling-accept">\u2705 ACCEPT (Upheld)</button>
        <button class="feed-ruling-reject" id="feed-ruling-reject">\u274C REJECT</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let busy = false;
  const handleRuling = async (ruling: 'upheld' | 'rejected') => {
    if (busy) return;
    busy = true;
    const reason = (document.getElementById('feed-ruling-reason') as HTMLTextAreaElement | null)?.value?.trim() || '';
    const label = ruling === 'upheld' ? 'UPHELD' : 'REJECTED';
    try {
      await safeRpc('insert_feed_event', {
        p_debate_id: debate.id,
        p_event_type: 'mod_ruling',
        p_round: round,
        p_side: 'mod',
        p_content: `${label}${reason ? ': ' + reason : ''}`,
        p_reference_id: activeChallengeRefId,
        p_metadata: { ruling },
      });
      // Update arsenal stats for the challenged reference
      if (activeChallengeRefId) {
        challengeReference(activeChallengeRefId, debate.id, ruling)
          .catch((e) => console.warn('[Arena] challengeReference failed:', e));
      }
    } catch (e) {
      showToast('Ruling failed: ' + (e instanceof Error ? e.message : 'unknown'), 'error');
      busy = false;
      return;
    }
    overlay.remove();
    // unpause is triggered by the mod_ruling event received via Realtime
  };

  overlay.querySelector('#feed-ruling-accept')?.addEventListener('click', () => void handleRuling('upheld'));
  overlay.querySelector('#feed-ruling-reject')?.addEventListener('click', () => void handleRuling('rejected'));
}

// ============================================================
// PHASE 4: DEEPGRAM SPEECH-TO-TEXT HELPERS
// ============================================================

/** Post a final Deepgram transcript as a speech event (same path as typed text). */
async function handleDeepgramTranscript(text: string, debate: CurrentDebate): Promise<void> {
  if (!text || !debate || !debate.role) return;

  const profile = getCurrentProfile();
  const authorName = profile?.display_name || profile?.username || 'You';

  // Optimistic local render (identical to typed text path)
  appendFeedEvent({
    id: crypto.randomUUID(),
    debate_id: debate.id,
    event_type: 'speech',
    round: round,
    side: debate.role,
    content: text,
    created_at: new Date().toISOString(),
    author_name: authorName,
  });

  // Clear interim since final just landed
  clearInterimTranscript();

  // Persist via RPC (Realtime will broadcast to others)
  await writeFeedEvent('speech', text, debate.role);
}

/** Show interim (partial) transcript in a transient indicator below the feed. */
function showInterimTranscript(text: string): void {
  let el = document.getElementById('feed-interim-transcript');
  if (!el) {
    const stream = document.getElementById('feed-stream');
    if (!stream) return;
    el = document.createElement('div');
    el.id = 'feed-interim-transcript';
    el.className = 'feed-interim-transcript';
    stream.parentElement?.insertBefore(el, stream.nextSibling);
  }
  el.textContent = text;
  el.style.display = text ? '' : 'none';
}

/** Remove the interim transcript indicator. */
export function clearInterimTranscript(): void {
  const el = document.getElementById('feed-interim-transcript');
  if (el) {
    el.textContent = '';
    el.style.display = 'none';
  }
}

/** Update the Deepgram connection status indicator. */
function updateDeepgramStatus(status: DeepgramStatus): void {
  let el = document.getElementById('feed-deepgram-status');

  if (status === 'live' || status === 'stopped') {
    // Hide indicator when healthy or stopped
    if (el) el.style.display = 'none';
    return;
  }

  if (!el) {
    const turnLabel = document.getElementById('feed-turn-label');
    if (!turnLabel) return;
    el = document.createElement('div');
    el.id = 'feed-deepgram-status';
    el.className = 'feed-deepgram-status';
    turnLabel.parentElement?.insertBefore(el, turnLabel.nextSibling);
  }

  if (status === 'connecting') {
    el.textContent = '\uD83D\uDD04 Connecting transcription...';
    el.style.display = '';
  } else if (status === 'paused') {
    el.textContent = '\u26A0\uFE0F Live transcription paused';
    el.style.display = '';
  } else if (status === 'error') {
    el.textContent = '\u26A0\uFE0F Transcription unavailable — text input active';
    el.style.display = '';
  }
}
