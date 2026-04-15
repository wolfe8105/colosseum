// arena-room-end-transcript.ts — Session 113: transcript bottom-sheet overlay
// Attached after renderPostDebate paints the DOM.

import { getCurrentProfile } from '../auth.ts';
import { escapeHTML } from '../config.ts';
import type { CurrentDebate } from './arena-types.ts';

export function attachTranscriptHandler(debate: CurrentDebate): void {
  document.getElementById('arena-transcript')?.addEventListener('click', () => {
    document.getElementById('arena-transcript-overlay')?.remove();

    const transcriptProfile = getCurrentProfile();
    const transcriptMyName = transcriptProfile?.display_name || 'You';
    const msgs = debate.messages || [];

    const transcriptOverlay = document.createElement('div');
    transcriptOverlay.id = 'arena-transcript-overlay';
    transcriptOverlay.className = 'arena-transcript-overlay';

    let lastRound = 0;
    let msgHtml = '';
    if (msgs.length === 0) {
      msgHtml = '<div class="arena-transcript-empty">No messages recorded.</div>';
    } else {
      msgs.forEach((m) => {
        if (m.round !== lastRound) {
          msgHtml += `<div class="arena-transcript-round">\u2014 Round ${m.round} \u2014</div>`;
          lastRound = m.round;
        }
        const isMe = m.role === 'user';
        const msgSide = isMe ? debate.role : (debate.role === 'a' ? 'b' : 'a');
        const msgName = isMe ? transcriptMyName : debate.opponentName;
        msgHtml += `<div class="arena-transcript-msg side-${msgSide}">
          <div class="t-name">${escapeHTML(msgName)}</div>
          <div class="t-text">${escapeHTML(m.text)}</div>
        </div>`;
      });
    }

    transcriptOverlay.innerHTML = `
      <div class="arena-transcript-sheet">
        <div class="arena-transcript-header">
          <div class="arena-transcript-handle"></div>
          <div class="arena-transcript-title">\uD83D\uDCDD DEBATE TRANSCRIPT</div>
          <div class="arena-transcript-topic">${escapeHTML(debate.topic)}</div>
        </div>
        <div class="arena-transcript-body">${msgHtml}</div>
      </div>`;

    transcriptOverlay.addEventListener('click', (e: Event) => {
      if (e.target === transcriptOverlay) transcriptOverlay.remove();
    });
    document.body.appendChild(transcriptOverlay);
  });
}
