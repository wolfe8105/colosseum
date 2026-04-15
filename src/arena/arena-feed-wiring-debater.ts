/**
 * arena-feed-wiring-debater.ts — Debater role DOM wiring for the feed room.
 *
 * wireDebaterControls: input autoresize + send + Enter-to-send + finish turn
 * + concede + cite/challenge button delegation.
 * File-local: submitDebaterMessage (optimistic append + writeFeedEvent).
 */

import { getCurrentProfile } from '../auth.ts';
import { stopTranscription } from './arena-deepgram.ts';
import {
  currentDebate,
  feedPaused,
  challengeRulingTimer,
  set_feedPaused,
  set_challengeRulingTimer,
  set_activeChallengeRefId,
} from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import { round } from './arena-feed-state.ts';
import { appendFeedEvent, writeFeedEvent } from './arena-feed-events.ts';
import { setDebaterInputEnabled } from './arena-feed-ui.ts';
import { clearFeedTimer, finishCurrentTurn } from './arena-feed-machine-turns.ts';
import { startFinalAdBreak } from './arena-feed-machine-ads.ts';
import { showCiteDropdown, showChallengeDropdown } from './arena-feed-references.ts';
import { clearInterimTranscript } from './arena-feed-transcript.ts';


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
    // LANDMINE [LM-WIRING-002]: concede handler duplicates pause-cleanup logic
    // (set_feedPaused(false), clear challengeRulingTimer, remove overlay) that
    // already lives in unpauseFeed() in arena-feed-machine-pause.ts. Candidate
    // for extraction to a shared resetPauseState() helper after the feed-machine
    // split is done.
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
