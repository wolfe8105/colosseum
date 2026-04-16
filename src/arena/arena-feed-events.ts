/**
 * arena-feed-events.ts — Feed event dispatcher, local system messages, and persistence.
 *
 * appendFeedEvent: dedup guard + author name lookup, then dispatches to render helpers.
 * addLocalSystem: local-only system message (not persisted).
 * writeFeedEvent: insert_feed_event RPC wrapper.
 */

import { safeRpc, getCurrentProfile } from '../auth.ts';
import { isPlaceholder } from './arena-core.utils.ts';
import { currentDebate } from './arena-state.ts';
import type { FeedEvent, FeedEventType } from './arena-types-feed-room.ts';
import { renderedEventIds, round } from './arena-feed-state.ts';
import {
  renderSpeechEvent,
  renderPointAwardEvent,
  renderRoundDividerEvent,
  renderReferenceCiteEvent,
  renderReferenceChallengeEvent,
  renderModRulingEvent,
  renderPowerUpEvent,
  renderDisconnectEvent,
  renderDefaultEvent,
  applySentimentEvent,
} from './arena-feed-events-render.ts';


export function appendFeedEvent(ev: FeedEvent): void {
  const stream = document.getElementById('feed-stream');
  if (!stream) return;

  // Fix 6: Dedup — skip if we already rendered this event
  // LANDMINE [LM-EVENTS-003]: fallback key may collide on identical type/side/round/content —
  // two legitimately distinct events with matching fields are silently deduplicated. Preserve
  // existing behavior; do not change the key formula.
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
  const names = { a: debaterAName, b: debaterBName };

  const el = document.createElement('div');

  // LANDMINE [LM-EVENTS-001]: default: is positioned BEFORE sentiment_tip/sentiment_vote in
  // source order. default uses break (not return), so JS switch matching by value still reaches
  // sentiment_tip and sentiment_vote correctly. Preserve this ordering exactly — adding any new
  // case between default and sentiment_tip would break the ordering invariant.
  switch (ev.event_type) {
    case 'speech':
      renderSpeechEvent(ev, el, names, debate);
      break;
    case 'point_award':
      renderPointAwardEvent(ev, el, names);
      break;
    case 'round_divider':
      renderRoundDividerEvent(ev, el);
      break;
    case 'reference_cite':
      renderReferenceCiteEvent(ev, el, names, debate);
      break;
    case 'reference_challenge':
      renderReferenceChallengeEvent(ev, el, names, debate);
      break;
    case 'mod_ruling':
      renderModRulingEvent(ev, el);
      break;
    case 'power_up':
      renderPowerUpEvent(ev, el);
      break;
    default:
      renderDefaultEvent(ev, el);
      break;
    case 'sentiment_tip':
    case 'sentiment_vote':
      applySentimentEvent(ev);
      return; // Exit early — do NOT append to DOM
    case 'disconnect':
      renderDisconnectEvent(ev, el);
      break;
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
    // LANDMINE [LM-EVENTS-005]: silent catch — event is already on screen via appendFeedEvent
    // (called separately by wiring layer) but is never persisted if this fails. Same family as
    // M-B6 in AUDIT-FINDINGS.md. Not this refactor's job to fix.
    console.warn('[FeedRoom] insert_feed_event failed:', e);
  }
}
