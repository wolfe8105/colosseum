/**
 * arena-feed-wiring-mod.ts — Moderator role DOM wiring for the feed room.
 *
 * wireModControls: comment input + send + Enter-to-send (submitModComment),
 * delegated click handler on #feed-stream for pin buttons + reference cite
 * popups + comment selection for scoring, score button clicks (budget check
 * + score_debate_comment RPC), score cancel, and Phase 5 eject/null buttons.
 * File-local: submitModComment, handlePinClick.
 */

import { safeRpc } from '../auth.ts';
import { showToast } from '../config.ts';
import { currentDebate } from './arena-state.ts';
import { FEED_SCORE_BUDGET } from './arena-types-feed-room.ts';
import {
  round,
  scoreUsed, pinnedEventIds,
} from './arena-feed-state.ts';
import { appendFeedEvent, writeFeedEvent } from './arena-feed-events.ts';
import { updateBudgetDisplay } from './arena-feed-ui.ts';
import { showReferencePopup } from './arena-feed-references.ts';
import { modNullDebate } from './arena-feed-realtime.ts';


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
    btn.addEventListener('click', async () => {
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
      // Clear selection immediately (before async work)
      selected.classList.remove('feed-evt-selected');
      const scoreRow = document.getElementById('feed-mod-score-row');
      if (scoreRow) scoreRow.style.display = 'none';
      // Disable button immediately to prevent double-tap
      (btn as HTMLButtonElement).disabled = true;
      try {
        const { error } = await safeRpc('score_debate_comment', {
          p_debate_id: debate.id,
          p_feed_event_id: Number(eventId),
          p_score: pts,
        });
        if (error) {
          console.warn('[FeedRoom] score_debate_comment failed:', error);
          showToast('Scoring failed', 'error');
        }
        // Budget update happens via appendFeedEvent when the point_award arrives via Realtime
      } finally {
        (btn as HTMLButtonElement).disabled = false;
      }
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
  // LANDMINE [LM-WIRING-003]: `eid.includes('-')` treats any id containing a
  // dash as a pending optimistic UUID. Brittle — real feed_event IDs are
  // numeric strings, but relying on string-shape detection instead of a
  // pending flag invites bugs if ID format changes.
  if (!eid || eid.includes('-')) {
    showToast('Cannot pin — waiting for confirmation', 'error');
    return;
  }
  btn.style.pointerEvents = 'none'; // prevent double-tap
  // LANDMINE [LM-WIRING-004]: try/finally resets pointer-events immediately
  // after the RPC resolves without awaiting any UI settle. Pin toggle updates
  // local state optimistically based on RPC success — minor but worth
  // reviewing intent.
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
