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
} from './arena-types.ts';
import { isPlaceholder, formatTimer, pushArenaState } from './arena-core.ts';
import { endCurrentDebate } from './arena-room-end.ts';
import { challengeReference } from '../reference-arsenal.ts';
import { startTranscription, stopTranscription, cleanupDeepgram } from './arena-deepgram.ts';
import type { DeepgramStatus } from './arena-deepgram.ts';
import { getLocalStream } from '../webrtc.ts';

// ============================================================
// MODULE STATE
// ============================================================

let _phase: FeedTurnPhase = 'pre_round';
let _round = 1;
let _timeLeft = 0;
let _scoreA = 0;
let _scoreB = 0;
const _renderedEventIds = new Set<string>();

// Phase 2: Pin tracking (moderator-only, local state)
const _pinnedEventIds = new Set<string>();

// Phase 2: Per-value scoring budget tracking per round
const _scoreUsed: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
let _budgetRound = 1;

// Determine first speaker for a round (spec: odd rounds A first, even rounds B first)
function firstSpeaker(round: number): 'a' | 'b' {
  return round % 2 === 1 ? 'a' : 'b';
}
function secondSpeaker(round: number): 'a' | 'b' {
  return round % 2 === 1 ? 'b' : 'a';
}

// ============================================================
// PUBLIC — enter feed room
// ============================================================

export function enterFeedRoom(debate: CurrentDebate): void {
  set_currentDebate(debate);
  pushArenaState('room');
  if (screenEl) screenEl.innerHTML = '';

  _phase = 'pre_round';
  _round = 1;
  _timeLeft = 3; // 3s pre-round countdown
  _scoreA = 0;
  _scoreB = 0;

  const profile = getCurrentProfile();
  const isModView = debate.modView === true;
  const myName = isModView
    ? (debate.moderatorName || 'Moderator')
    : (profile?.display_name || profile?.username || 'You');
  const debaterAName = debate.role === 'a' ? myName : debate.opponentName;
  const debaterBName = debate.role === 'b' ? myName : debate.opponentName;

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
          <div class="feed-timer" id="feed-timer">${formatTimer(_timeLeft)}</div>
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
    </div>
    <div class="feed-stream" id="feed-stream"></div>
    <div class="feed-controls" id="feed-controls"></div>
  `;
  screenEl?.appendChild(room);

  // Subscribe to Realtime for feed events
  subscribeRealtime(debate.id);

  // Phase 3: Fetch reference loadout for this debate
  if (!isModView) {
    getMyDebateLoadout(debate.id).then((refs) => {
      set_loadedRefs(refs as unknown as import('./arena-types.ts').LoadoutReference[]);
      set_challengesRemaining(FEED_MAX_CHALLENGES);
      set_opponentCitedRefs([]);
      updateCiteButtonState();
    }).catch((e) => console.warn('[Arena] Loadout fetch failed:', e));
  }

  // Render initial controls based on role
  renderControls(debate, isModView);

  // Start the pre-round countdown, then auto-transition to first speaker
  startPreRoundCountdown(debate);
}

// ============================================================
// REALTIME SUBSCRIPTION
// ============================================================

function subscribeRealtime(debateId: string): void {
  const client = getSupabaseClient();
  if (!client || isPlaceholder()) return;

  const channel = (client as any)
    .channel(`feed:${debateId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'debate_feed_events',
        filter: `debate_id=eq.${debateId}`,
      },
      (payload: { new: FeedEvent }) => {
        appendFeedEvent(payload.new);
      },
    )
    .subscribe();

  set_feedRealtimeChannel(channel);
}

export function unsubscribeRealtime(): void {
  const client = getSupabaseClient();
  if (client && feedRealtimeChannel) {
    (client as any).removeChannel(feedRealtimeChannel);
    set_feedRealtimeChannel(null);
  }
}

// ============================================================
// FEED RENDERING
// ============================================================

function appendFeedEvent(ev: FeedEvent): void {
  const stream = document.getElementById('feed-stream');
  if (!stream) return;

  // Fix 6: Dedup — skip if we already rendered this event
  const evKey = ev.id || `${ev.event_type}:${ev.side}:${ev.round}:${ev.content}`;
  if (_renderedEventIds.has(evKey)) return;
  _renderedEventIds.add(evKey);

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
        const isPinned = !!(ev.metadata?.pinned) || _pinnedEventIds.has(String(ev.id));
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
        if (isPinned) _pinnedEventIds.add(String(ev.id));
      }
      break;
    }
    case 'point_award': {
      el.className = `feed-evt feed-evt-points feed-fireworks arena-fade-in`;
      const sideName = ev.side === 'a' ? debaterAName : debaterBName;
      el.innerHTML = `<span class="feed-points-badge">+${Number(ev.score)} for ${escapeHTML(sideName)}</span>`;
      // Remove fireworks class after animation completes
      el.addEventListener('animationend', () => el.classList.remove('feed-fireworks'), { once: true });
      // Update scoreboard
      if (ev.side === 'a') {
        _scoreA += Number(ev.score) || 0;
        const scoreEl = document.getElementById('feed-score-a');
        if (scoreEl) scoreEl.textContent = String(_scoreA);
      } else if (ev.side === 'b') {
        _scoreB += Number(ev.score) || 0;
        const scoreEl = document.getElementById('feed-score-b');
        if (scoreEl) scoreEl.textContent = String(_scoreB);
      }
      // Phase 2: Track budget usage
      const pts = Number(ev.score) || 0;
      if (pts >= 1 && pts <= 5) {
        // Reset budget counter if round changed
        const evRound = ev.round || _round;
        if (evRound !== _budgetRound) {
          resetBudget(evRound);
        }
        _scoreUsed[pts] = (_scoreUsed[pts] || 0) + 1;
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
  }

  stream.appendChild(el);
  // Feed is manual-scroll per spec, but auto-scroll to new messages if already near bottom
  const isNearBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 80;
  if (isNearBottom) {
    stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' });
  }
}

/** Add a local-only system message (not persisted) */
function addLocalSystem(text: string): void {
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

async function writeFeedEvent(
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
      p_round: _round,
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
      </div>
    `;
    wireModControls();
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
    addLocalSystem(`${getCurrentProfile()?.display_name || 'Debater'} has conceded.`);
    setTimeout(() => void endCurrentDebate(), 1500);
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
      const used = _scoreUsed[pts] ?? 0;
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
    round: _round,
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
    round: _round,
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
    const wasPinned = _pinnedEventIds.has(eid);
    if (wasPinned) {
      _pinnedEventIds.delete(eid);
      btn.classList.remove('pinned');
      btn.closest('.feed-evt')?.classList.remove('feed-evt-pinned');
    } else {
      _pinnedEventIds.add(eid);
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
    const used = _scoreUsed[pts] ?? 0;
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
  _budgetRound = round;
  for (let pts = 1; pts <= 5; pts++) {
    _scoreUsed[pts] = 0;
  }
  updateBudgetDisplay();
}

// ============================================================
// TURN-TAKING STATE MACHINE
// ============================================================

function startPreRoundCountdown(debate: CurrentDebate): void {
  _phase = 'pre_round';
  _timeLeft = 3;
  updateTimerDisplay();
  updateTurnLabel('Starting...');

  set_feedTurnTimer(setInterval(() => {
    _timeLeft--;
    updateTimerDisplay();
    if (_timeLeft <= 0) {
      clearFeedTimer();
      // Write round divider
      void writeFeedEvent('round_divider', `Round ${_round}`, null);
      addLocalSystem(`--- Round ${_round} ---`);
      // Start first speaker
      const first = firstSpeaker(_round);
      startSpeakerTurn(first, debate);
    }
  }, 1000));
}

function startSpeakerTurn(speaker: 'a' | 'b', debate: CurrentDebate): void {
  _phase = speaker === 'a' ? 'speaker_a' : 'speaker_b';
  _timeLeft = FEED_TURN_DURATION;

  // Phase 2: Reset scoring budget when round changes
  if (_budgetRound !== _round) {
    resetBudget(_round);
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
    if (concedeBtn && _round > 1) concedeBtn.style.display = '';
    // Phase 3: enable cite/challenge during my turn
    updateCiteButtonState();
    updateChallengeButtonState();

    // Phase 4: Start Deepgram transcription if it's my turn and mic is available
    if (isMyTurn) {
      const localStream = getLocalStream();
      if (localStream) {
        void startTranscription(
          localStream,
          'en', // TODO: wire debate creator's profile language
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
    _timeLeft--;
    updateTimerDisplay();

    // Warning at 15s
    const timerEl = document.getElementById('feed-timer');
    if (timerEl) timerEl.classList.toggle('warning', _timeLeft <= 15);

    if (_timeLeft <= 0) {
      clearFeedTimer();
      onTurnEnd(speaker, debate);
    }
  }, 1000));
}

function finishCurrentTurn(): void {
  const debate = currentDebate;
  if (!debate) return;

  const speaker = _phase === 'speaker_a' ? 'a' : _phase === 'speaker_b' ? 'b' : null;
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

  const first = firstSpeaker(_round);
  const second = secondSpeaker(_round);

  if (speaker === first) {
    // First speaker done → 10s pause → second speaker
    startPause(speaker === 'a' ? 'pause_ab' : 'pause_ba', debate);
  } else {
    // Second speaker done → round is over
    if (_round >= FEED_TOTAL_ROUNDS) {
      // Debate finished
      _phase = 'finished';
      addLocalSystem('Debate complete!');
      nudge('feed_debate_end', '\u2696\uFE0F The debate has concluded.');
      setTimeout(() => void endCurrentDebate(), 2000);
    } else {
      // Next round
      _round++;
      updateRoundLabel();
      startPause(speaker === 'a' ? 'pause_ab' : 'pause_ba', debate, true);
    }
  }
}

function startPause(pausePhase: FeedTurnPhase, debate: CurrentDebate, newRound = false): void {
  _phase = pausePhase;
  _timeLeft = FEED_PAUSE_DURATION;

  const debaterAName = debate.role === 'a'
    ? (getCurrentProfile()?.display_name || 'You')
    : debate.opponentName;
  const debaterBName = debate.role === 'b'
    ? (getCurrentProfile()?.display_name || 'You')
    : debate.opponentName;

  // Figure out who speaks next
  let nextSpeakerSide: 'a' | 'b';
  if (newRound) {
    nextSpeakerSide = firstSpeaker(_round);
    void writeFeedEvent('round_divider', `Round ${_round}`, null);
    addLocalSystem(`--- Round ${_round} ---`);
  } else {
    nextSpeakerSide = secondSpeaker(_round);
  }
  const nextName = nextSpeakerSide === 'a' ? debaterAName : debaterBName;

  updateTurnLabel(`${nextName}'s turn in...`);
  updateTimerDisplay();

  set_feedTurnTimer(setInterval(() => {
    _timeLeft--;
    updateTimerDisplay();
    updateTurnLabel(`${nextName}'s turn in ${_timeLeft}s`);

    if (_timeLeft <= 0) {
      clearFeedTimer();
      startSpeakerTurn(nextSpeakerSide, debate);
    }
  }, 1000));
}

// ============================================================
// UI HELPERS
// ============================================================

function clearFeedTimer(): void {
  if (feedTurnTimer) clearInterval(feedTurnTimer);
  set_feedTurnTimer(null);
}

function updateTimerDisplay(): void {
  const timerEl = document.getElementById('feed-timer');
  if (timerEl) timerEl.textContent = formatTimer(Math.max(0, _timeLeft));
}

function updateTurnLabel(text: string): void {
  const el = document.getElementById('feed-turn-label');
  if (el) el.textContent = text;
}

function updateRoundLabel(): void {
  const el = document.getElementById('feed-round-label');
  if (el) el.textContent = `ROUND ${_round}/${FEED_TOTAL_ROUNDS}`;
}

function setDebaterInputEnabled(enabled: boolean): void {
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
  _phase = 'pre_round';
  _round = 1;
  _timeLeft = 0;
  _scoreA = 0;
  _scoreB = 0;
  _renderedEventIds.clear();
  // Phase 2 cleanup
  _pinnedEventIds.clear();
  _budgetRound = 1;
  for (let pts = 1; pts <= 5; pts++) _scoreUsed[pts] = 0;
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
}

// ============================================================
// PHASE 3: CITE / CHALLENGE / PAUSE
// ============================================================

function updateCiteButtonState(): void {
  const btn = document.getElementById('feed-cite-btn') as HTMLButtonElement | null;
  if (!btn) return;
  const debate = currentDebate;
  const isMyTurn = debate && !debate.modView && (
    (_phase === 'speaker_a' && debate.role === 'a') ||
    (_phase === 'speaker_b' && debate.role === 'b')
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
    (_phase === 'speaker_a' && debate.role === 'a') ||
    (_phase === 'speaker_b' && debate.role === 'b')
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
        await citeDebateReference(debate.id, refId, _round, debate.role || 'a');
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
        const result = await fileReferenceChallenge(debate.id, refId, _round, debate.role || 'a');
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
  set_feedPauseTimeLeft(_timeLeft);

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
          p_round: _round,
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
  _timeLeft = feedPauseTimeLeft;
  set_feedPauseTimeLeft(0);
  updateTimerDisplay();

  // Re-enable controls based on current turn
  const debate = currentDebate;
  if (debate && !debate.modView) {
    const isMyTurn = (
      (_phase === 'speaker_a' && debate.role === 'a') ||
      (_phase === 'speaker_b' && debate.role === 'b')
    );
    setDebaterInputEnabled(isMyTurn);
    const finishBtn = document.getElementById('feed-finish-turn') as HTMLButtonElement | null;
    if (finishBtn) finishBtn.disabled = !isMyTurn;
    updateCiteButtonState();
    updateChallengeButtonState();
  }

  updateTurnLabel(_phase === 'speaker_a' ? 'Side A\'s turn' : _phase === 'speaker_b' ? 'Side B\'s turn' : '');
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
        p_round: _round,
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
    round: _round,
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
function clearInterimTranscript(): void {
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
