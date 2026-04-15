/**
 * arena-feed-wiring.ts — DOM event listener wiring for the feed room.
 *
 * Orchestrator. Owns the HTML templates for all three control variants
 * (debater / spectator / moderator) and dispatches to the role-specific
 * wirer from the section files.
 *
 * renderControls lives here (not in arena-feed-ui.ts) because it calls
 * wire* functions, and dependency direction is ui → machine → wiring.
 */

import { escapeHTML } from '../config.ts';
import { challengesRemaining } from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import {
  FEED_SCORE_BUDGET, FEED_MAX_CHALLENGES,
} from './arena-types-feed-room.ts';
// LANDMINE [LM-WIRING-005]: FEED_MAX_CHALLENGES imported but never used —
// dead import, part of the L-A6 family in AUDIT-FINDINGS.md. Preserved to
// match the strict "no cleanup" refactor rule.
import { wireDebaterControls } from './arena-feed-wiring-debater.ts';
import { wireSpectatorTipButtons } from './arena-feed-wiring-spectator.ts';
import { wireModControls } from './arena-feed-wiring-mod.ts';


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
    // Spectator controls: sentiment tip strip (F-58)
    const aName = debate.debaterAName || 'Side A';
    const bName = debate.debaterBName || 'Side B';
    controlsEl.innerHTML = `
      <div class="feed-spectator-controls">
        <div class="feed-tip-label" id="feed-tip-label">TIP THE DEBATE</div>
        <div class="feed-tip-row feed-tip-row-a">
          <span class="feed-tip-side-label feed-tip-label-a">${escapeHTML(aName)}</span>
          <button class="feed-tip-btn feed-tip-btn-a" data-side="a" data-amount="2"  disabled>2</button>
          <button class="feed-tip-btn feed-tip-btn-a" data-side="a" data-amount="3"  disabled>3</button>
          <button class="feed-tip-btn feed-tip-btn-a" data-side="a" data-amount="5"  disabled>5</button>
          <button class="feed-tip-btn feed-tip-btn-a" data-side="a" data-amount="10" disabled>10</button>
        </div>
        <div class="feed-tip-row feed-tip-row-b">
          <span class="feed-tip-side-label feed-tip-label-b">${escapeHTML(bName)}</span>
          <button class="feed-tip-btn feed-tip-btn-b" data-side="b" data-amount="2"  disabled>2</button>
          <button class="feed-tip-btn feed-tip-btn-b" data-side="b" data-amount="3"  disabled>3</button>
          <button class="feed-tip-btn feed-tip-btn-b" data-side="b" data-amount="5"  disabled>5</button>
          <button class="feed-tip-btn feed-tip-btn-b" data-side="b" data-amount="10" disabled>10</button>
        </div>
        <div class="feed-tip-status" id="feed-tip-status">Loading...</div>
      </div>
    `;
    void wireSpectatorTipButtons(debate);
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
