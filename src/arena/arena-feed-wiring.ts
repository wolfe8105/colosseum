/**
 * arena-feed-wiring.ts — DOM event listener wiring for the feed room.
 *
 * wireDebaterControls, wireSpectatorVoteButtons, wireModControls,
 * submitDebaterMessage, submitModComment, handlePinClick, renderControls.
 *
 * renderControls lives here (not in arena-feed-ui.ts) because it calls
 * wire* functions, and dependency direction is ui → machine → wiring.
 */

import { safeRpc, getCurrentProfile } from '../auth.ts';
import { escapeHTML, showToast } from '../config.ts';
import { stopTranscription } from './arena-deepgram.ts';
import {
  currentDebate,
  feedPaused,
  challengeRulingTimer,
  challengesRemaining,
  set_feedPaused,
  set_challengeRulingTimer,
  set_activeChallengeRefId,
} from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import {
  FEED_SCORE_BUDGET, FEED_MAX_CHALLENGES,
} from './arena-types.ts';
import {
  round,
  scoreUsed, pinnedEventIds,
  votedRounds,
} from './arena-feed-state.ts';
import { appendFeedEvent, writeFeedEvent } from './arena-feed-events.ts';
import {
  setDebaterInputEnabled, updateBudgetDisplay,
  updateCiteButtonState, updateChallengeButtonState,
} from './arena-feed-ui.ts';
import { clearFeedTimer, finishCurrentTurn, startFinalAdBreak, pauseFeed } from './arena-feed-machine.ts';
import { showCiteDropdown, showChallengeDropdown, showReferencePopup } from './arena-feed-references.ts';
import { clearInterimTranscript } from './arena-feed-transcript.ts';
import { modNullDebate } from './arena-feed-realtime.ts';


export function renderControls(debate: CurrentDebate, isModView: boolean): void {
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

export function wireDebaterControls(debate: CurrentDebate): void {
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

export function wireSpectatorVoteButtons(debate: CurrentDebate): void {
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

export function wireModControls(): void {
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
