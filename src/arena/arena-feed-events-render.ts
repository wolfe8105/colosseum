/**
 * arena-feed-events-render.ts — Per-type DOM render helpers for feed events.
 *
 * Each exported function corresponds to one case branch of appendFeedEvent.
 * Called exclusively by the arena-feed-events.ts dispatcher.
 */

import { escapeHTML, sanitizeUrl } from '../config.ts';
import { playSound, vibrate } from './arena-sounds.ts';
import {
  feedPaused,
  opponentCitedRefs,
  set_opponentCitedRefs,
  set_activeChallengeRefId,
} from './arena-state.ts';
import type { FeedEvent } from './arena-types-feed-room.ts';
import type { CurrentDebate } from './arena-types.ts';
import {
  round, scoreA, scoreB, budgetRound,
  pinnedEventIds,
  scoreUsed,
  pendingSentimentA, pendingSentimentB,
  set_scoreA, set_scoreB,
  set_pendingSentimentA, set_pendingSentimentB,
} from './arena-feed-state.ts';
import { updateBudgetDisplay, resetBudget, updateChallengeButtonState } from './arena-feed-ui.ts';
// LANDMINE [LM-EVENTS-002]: pauseFeed creates a potential cycle back to arena-feed-machine
// which itself calls into this file for render. Verify no runtime import cycle after the
// split. If the cycle becomes structural, consider emitting a 'challenge' event and letting
// arena-feed-machine observe it.
import { pauseFeed, unpauseFeed } from './arena-feed-machine-pause.ts';

export function renderSpeechEvent(
  ev: FeedEvent,
  el: HTMLElement,
  names: { a: string; b: string },
  debate: CurrentDebate | null,
): void {
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
    const name = ev.author_name || (ev.side === 'a' ? names.a : names.b);
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
}

export function renderPointAwardEvent(
  ev: FeedEvent,
  el: HTMLElement,
  names: { a: string; b: string },
): void {
  el.className = `feed-evt feed-evt-points feed-fireworks arena-fade-in`;
  const sideName = ev.side === 'a' ? names.a : names.b;
  // F-57: build modifier-aware badge label
  // metadata.base_score / in_debate_multiplier / in_debate_flat / final_contribution
  // present when F-57 is active. Fall back to ev.score for pre-F-57 events.
  const meta         = ev.metadata as Record<string, unknown> | null | undefined;
  const baseScore    = Number(meta?.base_score     ?? ev.score);
  const multiplier   = Number(meta?.in_debate_multiplier ?? 1.0);
  const flat         = Number(meta?.in_debate_flat  ?? 0);
  const finalContrib = Number(meta?.final_contribution ?? ev.score);
  const hasModifier  = multiplier !== 1.0 || flat !== 0;
  // LANDMINE [LM-EVENTS-004]: numeric values go through Number() casts before innerHTML
  // interpolation via badgeText — compliant with CLAUDE.md Number() rule. Do not remove casts.
  let badgeText: string;
  if (!hasModifier) {
    badgeText = `+${baseScore}`;
  } else if (multiplier !== 1.0 && flat === 0) {
    // Pure multiplier: +2 × 1.5 = 3
    badgeText = `+${baseScore} \xD7 ${multiplier} = ${finalContrib}`;
  } else if (multiplier === 1.0 && flat !== 0) {
    // Pure flat: just show final
    badgeText = `+${finalContrib}`;
  } else {
    // Both: +2 × 1.5 + 2 = 5
    badgeText = `+${baseScore} \xD7 ${multiplier} + ${flat} = ${finalContrib}`;
  }
  el.innerHTML = `<span class="feed-points-badge">${badgeText} for ${escapeHTML(sideName)}</span>`;
  // Remove fireworks class after animation completes
  el.addEventListener('animationend', () => el.classList.remove('feed-fireworks'), { once: true });
  playSound('pointsAwarded');
  vibrate(80);
  // Update scoreboard from authoritative server totals in metadata.
  // Falls back to local increment for pre-F-57 events without score_X_after.
  if (ev.side === 'a') {
    const after = meta?.score_a_after != null ? Number(meta.score_a_after) : scoreA + finalContrib;
    set_scoreA(after);
    const scoreEl = document.getElementById('feed-score-a');
    if (scoreEl) scoreEl.textContent = String(scoreA);
  } else if (ev.side === 'b') {
    const after = meta?.score_b_after != null ? Number(meta.score_b_after) : scoreB + finalContrib;
    set_scoreB(after);
    const scoreEl = document.getElementById('feed-score-b');
    if (scoreEl) scoreEl.textContent = String(scoreB);
  }
  // Budget tracking always uses base_score (1-5), never the modified contribution.
  const pts = baseScore;
  if (pts >= 1 && pts <= 5) {
    const evRound = ev.round || round;
    if (evRound !== budgetRound) {
      resetBudget(evRound);
    }
    scoreUsed[pts] = (scoreUsed[pts] || 0) + 1;
    updateBudgetDisplay();
  }
}

export function renderRoundDividerEvent(ev: FeedEvent, el: HTMLElement): void {
  el.className = 'feed-evt feed-evt-divider arena-fade-in';
  el.innerHTML = `<span class="feed-divider-text">\u2014\u2014\u2014 ${escapeHTML(ev.content)} \u2014\u2014\u2014</span>`;
}

export function renderReferenceCiteEvent(
  ev: FeedEvent,
  el: HTMLElement,
  names: { a: string; b: string },
  debate: CurrentDebate | null,
): void {
  const sideClass = ev.side === 'a' ? 'feed-evt-a' : 'feed-evt-b';
  const citeName = ev.author_name || (ev.side === 'a' ? names.a : names.b);
  const refMeta = ev.metadata || {};
  el.className = `feed-evt feed-evt-cite ${sideClass} arena-fade-in`;
  el.innerHTML = `
    <span class="feed-evt-name">\uD83D\uDCC4 ${escapeHTML(citeName)}</span>
    <span class="feed-cite-claim" data-ref-id="${escapeHTML(ev.reference_id || '')}"
          data-url="${sanitizeUrl(refMeta.source_url as string | null | undefined)}"
          data-source-title="${escapeHTML(String(refMeta.source_title || ''))}"
          data-source-type="${escapeHTML(String(refMeta.source_type || ''))}"
          >"${escapeHTML(ev.content)}"</span>
    <span class="feed-cite-domain">${escapeHTML(String(refMeta.source_title || ''))}</span>
  `;
  playSound('referenceDrop');
  vibrate(60);
  // Track opponent cited refs for challenge dropdown
  if (debate && ev.side && ev.side !== debate.role && ev.reference_id) {
    const existing = opponentCitedRefs.find((r) => r.reference_id === ev.reference_id);
    if (!existing) {
      set_opponentCitedRefs([...opponentCitedRefs, {
        reference_id: ev.reference_id,
        claim: ev.content,
        url: String(refMeta.source_url || ''),
        domain: String(refMeta.source_title || ''),
        source_type: String(refMeta.source_type || ''),
        feed_event_id: String(ev.id),
        already_challenged: false,
      }]);
      updateChallengeButtonState();
    }
  }
}

export function renderReferenceChallengeEvent(
  ev: FeedEvent,
  el: HTMLElement,
  names: { a: string; b: string },
  debate: CurrentDebate | null,
): void {
  el.className = 'feed-evt feed-evt-challenge arena-fade-in';
  const challengerName = ev.author_name || (ev.side === 'a' ? names.a : names.b);
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
}

export function renderModRulingEvent(ev: FeedEvent, el: HTMLElement): void {
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
}

export function renderPowerUpEvent(ev: FeedEvent, el: HTMLElement): void {
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
}

export function renderDefaultEvent(ev: FeedEvent, el: HTMLElement): void {
  // Unknown event type — render as system message
  el.className = 'feed-evt feed-evt-system arena-fade-in';
  el.textContent = ev.content;
}

export function renderDisconnectEvent(ev: FeedEvent, el: HTMLElement): void {
  el.className = 'feed-evt feed-evt-disconnect arena-fade-in';
  el.innerHTML = `<span class="feed-disconnect-icon">\u26A0\uFE0F</span> <span class="feed-disconnect-text">${escapeHTML(ev.content)}</span>`;
}

/**
 * applySentimentEvent — accumulates pending sentiment weight for sentiment_tip and
 * sentiment_vote events. These events never append to the DOM; call this and return early.
 */
export function applySentimentEvent(ev: FeedEvent): void {
  if (ev.event_type === 'sentiment_tip') {
    // F-58: paid tip — accumulate token amount (not flat +1) for gauge weight
    const tipAmount = Number(ev.metadata?.amount ?? 1);
    if (ev.side === 'a') set_pendingSentimentA(pendingSentimentA + tipAmount);
    if (ev.side === 'b') set_pendingSentimentB(pendingSentimentB + tipAmount);
  } else {
    // sentiment_vote: legacy rows from before F-58 — flat +1 for historical replay compat
    if (ev.side === 'a') set_pendingSentimentA(pendingSentimentA + 1);
    if (ev.side === 'b') set_pendingSentimentB(pendingSentimentB + 1);
  }
}
