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
  currentDebate, screenEl, feedTurnTimer, feedRealtimeChannel,
  set_currentDebate, set_feedTurnTimer, set_feedRealtimeChannel,
} from './arena-state.ts';
import type {
  CurrentDebate, DebateRole, FeedEvent, FeedEventType, FeedTurnPhase,
} from './arena-types.ts';
import {
  FEED_TURN_DURATION, FEED_PAUSE_DURATION, FEED_TOTAL_ROUNDS,
} from './arena-types.ts';
import { isPlaceholder, formatTimer, pushArenaState } from './arena-core.ts';
import { endCurrentDebate } from './arena-room-end.ts';

// ============================================================
// MODULE STATE
// ============================================================

let _phase: FeedTurnPhase = 'pre_round';
let _round = 1;
let _timeLeft = 0;
let _scoreA = 0;
let _scoreB = 0;
const _renderedEventIds = new Set<string>();

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
        el.className = `feed-evt ${sideClass} arena-fade-in`;
        // Fix 5: Store real DB event ID for moderator scoring
        if (ev.id && !ev.id.includes('-')) el.dataset.eventId = ev.id;
        el.innerHTML = `
          <span class="feed-evt-name">${escapeHTML(name)}</span>
          <span class="feed-evt-text">${escapeHTML(ev.content)}</span>
        `;
      }
      break;
    }
    case 'point_award': {
      el.className = `feed-evt feed-evt-points arena-fade-in`;
      const side = ev.side === 'a' ? 'A' : 'B';
      const sideName = ev.side === 'a' ? debaterAName : debaterBName;
      el.innerHTML = `<span class="feed-points-badge">+${Number(ev.score)} for ${escapeHTML(sideName)}</span>`;
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
      break;
    }
    case 'round_divider': {
      el.className = 'feed-evt feed-evt-divider arena-fade-in';
      el.innerHTML = `<span class="feed-divider-text">\u2014\u2014\u2014 ${escapeHTML(ev.content)} \u2014\u2014\u2014</span>`;
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
          <button class="feed-score-btn" data-pts="1">1</button>
          <button class="feed-score-btn" data-pts="2">2</button>
          <button class="feed-score-btn" data-pts="3">3</button>
          <button class="feed-score-btn" data-pts="4">4</button>
          <button class="feed-score-btn" data-pts="5">5</button>
          <button class="feed-score-btn-cancel" id="feed-score-cancel">\u2715</button>
        </div>
      </div>
    `;
    wireModControls();
  } else {
    // Debater controls: text input + finish round + concede
    controlsEl.innerHTML = `
      <div class="feed-debater-controls">
        <div class="feed-input-row">
          <textarea class="feed-text-input" id="feed-debater-input" placeholder="Type your argument..." maxlength="2000" rows="2" disabled></textarea>
          <button class="feed-send-btn" id="feed-debater-send-btn" disabled>\u2192</button>
        </div>
        <div class="feed-action-row">
          <button class="feed-action-btn feed-finish-btn" id="feed-finish-turn" disabled>FINISH TURN</button>
          <button class="feed-action-btn feed-concede-btn" id="feed-concede" style="display:none;">CONCEDE</button>
        </div>
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

  // Score buttons: tap a feed message to select it, then tap a score
  const stream = document.getElementById('feed-stream');
  stream?.addEventListener('click', (e: Event) => {
    const target = (e.target as HTMLElement).closest('.feed-evt-a, .feed-evt-b');
    if (!target) return;
    // Highlight selected
    stream.querySelectorAll('.feed-evt-selected').forEach(el => el.classList.remove('feed-evt-selected'));
    target.classList.add('feed-evt-selected');
    // Show score row
    const scoreRow = document.getElementById('feed-mod-score-row');
    if (scoreRow) scoreRow.style.display = 'flex';
    const side = target.classList.contains('feed-evt-a') ? 'A' : 'B';
    const prompt = document.getElementById('feed-score-prompt');
    if (prompt) prompt.textContent = `Score Debater ${side}:`;
  });

  // Score button clicks — use score_debate_comment RPC (atomically updates scoreboard)
  document.querySelectorAll('.feed-score-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pts = Number((btn as HTMLElement).dataset.pts);
      const selected = document.querySelector('.feed-evt-selected') as HTMLElement | null;
      if (!selected) return;
      const eventId = selected.dataset.eventId;
      if (!eventId) {
        showToast('Cannot score this message yet — waiting for confirmation', 'error');
        return;
      }
      const debate = currentDebate;
      if (!debate) return;
      // Call score_debate_comment — it writes the point_award event AND updates score_a/score_b
      void safeRpc('score_debate_comment', {
        p_debate_id: debate.id,
        p_feed_event_id: Number(eventId),
        p_score: pts,
      }).then(({ error }) => {
        if (error) {
          console.warn('[FeedRoom] score_debate_comment failed:', error);
          showToast('Scoring failed', 'error');
        }
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
  }

  set_feedTurnTimer(setInterval(() => {
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
  _phase = 'pre_round';
  _round = 1;
  _timeLeft = 0;
  _scoreA = 0;
  _scoreB = 0;
  _renderedEventIds.clear();
}
