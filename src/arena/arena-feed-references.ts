/**
 * arena-feed-references.ts — Cite/challenge dropdown UI and reference popup.
 *
 * showCiteDropdown, showChallengeDropdown, hideDropdown, showReferencePopup.
 *
 * NOTE: pauseFeed and showChallengeRulingPanel are NOT here — they moved to
 * arena-feed-machine.ts (see LANDMINE [LM-FEEDROOM-001]).
 */

import { escapeHTML, showToast } from '../config.ts';
import {
  citeDebateReference, fileReferenceChallenge,
} from '../reference-arsenal.ts';
import {
  currentDebate,
  loadedRefs, opponentCitedRefs,
  challengesRemaining,
  set_loadedRefs,
  set_challengesRemaining,
  set_activeChallengeRefId, set_activeChallengeId,
} from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import { round } from './arena-feed-state.ts';
import { updateCiteButtonState, updateChallengeButtonState } from './arena-feed-ui.ts';
import { pauseFeed } from './arena-feed-machine.ts';


export function showCiteDropdown(debate: CurrentDebate): void {
  hideDropdown();
  const dropdown = document.getElementById('feed-ref-dropdown');
  if (!dropdown) return;

  const uncited = loadedRefs.filter((r) => !r.cited);
  if (uncited.length === 0) { showToast('No references remaining', 'error'); return; }

  let html = '<div class="feed-dropdown-title">\uD83D\uDCC4 Select reference to cite:</div>';
  for (const ref of uncited) {
    html += `
      <div class="feed-dropdown-item" data-ref-id="${escapeHTML(ref.reference_id)}">
        <span class="feed-dropdown-claim">"${escapeHTML(ref.claim_text)}"</span>
        <span class="feed-dropdown-meta">${escapeHTML(ref.source_title)} \u00B7 PWR ${Number(ref.current_power)}</span>
      </div>
    `;
  }
  html += '<div class="feed-dropdown-cancel" id="feed-dropdown-close">\u2715 Cancel</div>';
  dropdown.innerHTML = html;
  dropdown.style.display = 'block';

  dropdown.querySelector('#feed-dropdown-close')?.addEventListener('click', hideDropdown);
  dropdown.querySelectorAll('.feed-dropdown-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const refId = (item as HTMLElement).dataset.refId;
      if (!refId) return;
      hideDropdown();
      try {
        await citeDebateReference(debate.id, refId, round, debate.role || 'a');
        // Mark as cited locally so dropdown updates immediately
        const updated = loadedRefs.map((r) =>
          r.reference_id === refId ? { ...r, cited: true, cited_at: new Date().toISOString() } : r
        );
        set_loadedRefs(updated);
        updateCiteButtonState();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Cite failed';
        showToast(msg, 'error');
      }
    });
  });
}

export function showChallengeDropdown(debate: CurrentDebate): void {
  hideDropdown();
  const dropdown = document.getElementById('feed-ref-dropdown');
  if (!dropdown) return;

  const challengeable = opponentCitedRefs.filter((r) => !r.already_challenged);
  if (challengeable.length === 0) { showToast('No references to challenge', 'error'); return; }
  if (challengesRemaining <= 0) { showToast('No challenges remaining', 'error'); return; }

  let html = '<div class="feed-dropdown-title">\u2694\uFE0F Select reference to challenge:</div>';
  for (const ref of challengeable) {
    html += `
      <div class="feed-dropdown-item feed-dropdown-challenge" data-ref-id="${escapeHTML(ref.reference_id)}">
        <span class="feed-dropdown-claim">"${escapeHTML(ref.claim)}"</span>
        <span class="feed-dropdown-meta">${escapeHTML(ref.domain)}</span>
      </div>
    `;
  }
  html += '<div class="feed-dropdown-cancel" id="feed-dropdown-close">\u2715 Cancel</div>';
  dropdown.innerHTML = html;
  dropdown.style.display = 'block';

  dropdown.querySelector('#feed-dropdown-close')?.addEventListener('click', hideDropdown);
  dropdown.querySelectorAll('.feed-dropdown-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const refId = (item as HTMLElement).dataset.refId;
      if (!refId) return;
      hideDropdown();
      try {
        const result = await fileReferenceChallenge(debate.id, refId, round, debate.role || 'a');
        if (result.blocked) {
          // Shield absorbed it — no pause needed
          showToast('\uD83D\uDEE1\uFE0F Shield blocked the challenge!', 'info');
        } else {
          // Challenge filed — pause the debate
          set_challengesRemaining(result.challenges_remaining ?? (challengesRemaining - 1));
          updateChallengeButtonState();
          set_activeChallengeRefId(refId);
          set_activeChallengeId(result.challenge_id || null);  // F-55: store for rule_on_reference
          pauseFeed(debate);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Challenge failed';
        showToast(msg, 'error');
      }
    });
  });
}

export function hideDropdown(): void {
  const dropdown = document.getElementById('feed-ref-dropdown');
  if (dropdown) { dropdown.style.display = 'none'; dropdown.innerHTML = ''; }
}

export function showReferencePopup(el: HTMLElement): void {
  // Remove any existing popup
  document.getElementById('feed-ref-popup')?.remove();

  const url = el.dataset.url || '';
  const sourceTitle = el.dataset.sourceTitle || '';
  const sourceType = el.dataset.sourceType || '';
  const claim = el.textContent?.trim() || '';

  const popup = document.createElement('div');
  popup.className = 'feed-ref-popup';
  popup.id = 'feed-ref-popup';
  popup.innerHTML = `
    <div class="feed-ref-popup-inner">
      <div class="feed-ref-popup-claim">"${escapeHTML(claim)}"</div>
      <div class="feed-ref-popup-meta">
        <span class="feed-ref-popup-type">${escapeHTML(sourceType.replace(/_/g, ' '))}</span>
        <span class="feed-ref-popup-domain">${escapeHTML(sourceTitle)}</span>
      </div>
      ${url ? `<a class="feed-ref-popup-link" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">Open source \u2197</a>` : ''}
      <button class="feed-ref-popup-close" id="feed-ref-popup-close">\u2715</button>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById('feed-ref-popup-close')?.addEventListener('click', () => popup.remove());
  popup.addEventListener('click', (e) => {
    if (e.target === popup) popup.remove();
  });
}
