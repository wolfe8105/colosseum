/**
 * arena-feed-events.ts — Feed event rendering and persistence.
 *
 * appendFeedEvent: large switch statement rendering all FeedEvent types.
 * addLocalSystem: local-only system message (not persisted).
 * writeFeedEvent: insert_feed_event RPC wrapper.
 */

import { safeRpc, getCurrentProfile } from '../auth.ts';
import { escapeHTML } from '../config.ts';
import { playSound, vibrate } from './arena-sounds.ts';
import { isPlaceholder } from './arena-core.ts';
import {
  currentDebate,
  feedPaused,
  opponentCitedRefs,
  set_opponentCitedRefs,
  activeChallengeRefId,
  set_activeChallengeRefId,
} from './arena-state.ts';
import type { FeedEvent, FeedEventType } from './arena-types.ts';
import {
  round, scoreA, scoreB, budgetRound,
  renderedEventIds, pinnedEventIds,
  scoreUsed,
  pendingSentimentA, pendingSentimentB,
  set_scoreA, set_scoreB,
  set_pendingSentimentA, set_pendingSentimentB,
} from './arena-feed-state.ts';
import { updateBudgetDisplay, resetBudget, updateChallengeButtonState } from './arena-feed-ui.ts';
import { pauseFeed, unpauseFeed } from './arena-feed-machine.ts';


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
              data-url="${escapeHTML(String(refMeta.source_url || ''))}"
              data-source-title="${escapeHTML(String(refMeta.source_title || ''))}"
              data-source-type="${escapeHTML(String(refMeta.source_type || ''))}"
              >"${escapeHTML(ev.content)}"</span>
        <span class="feed-cite-domain">${escapeHTML(String(refMeta.source_title || ''))}</span>
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
            url: String(refMeta.source_url || ''),
            domain: String(refMeta.source_title || ''),
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
