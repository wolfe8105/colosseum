/**
 * arena-feed-transcript.ts — Deepgram speech-to-text helpers.
 *
 * handleDeepgramTranscript, showInterimTranscript, clearInterimTranscript,
 * updateDeepgramStatus.
 */

import { getCurrentProfile } from '../auth.ts';
import type { DeepgramStatus } from './arena-deepgram.ts';
import type { CurrentDebate } from './arena-types.ts';
import { round } from './arena-feed-state.ts';
import { appendFeedEvent, writeFeedEvent } from './arena-feed-events.ts';


/** Post a final Deepgram transcript as a speech event (same path as typed text). */
export async function handleDeepgramTranscript(text: string, debate: CurrentDebate): Promise<void> {
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
export function showInterimTranscript(text: string): void {
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
export function updateDeepgramStatus(status: DeepgramStatus): void {
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
