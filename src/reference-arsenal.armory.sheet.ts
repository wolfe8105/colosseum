/**
 * reference-arsenal.armory.sheet.ts — Armory bottom sheet
 *
 * openSheet  — populate and open the detail sheet for a reference
 * closeSheet — close the armory bottom sheet
 *
 * Extracted from reference-arsenal.armory.ts (Session 254 track).
 */

import { escapeHTML, sanitizeUrl, showToast } from './config.ts';
import { powerDisplay } from './reference-arsenal.utils.ts';
import { SOURCE_TYPES, RARITY_COLORS, CHALLENGE_STATUS_LABELS } from './reference-arsenal.constants.ts';
import { secondReference, challengeReference } from './reference-arsenal.rpc.ts';
import type { ArsenalReference } from './reference-arsenal.types.ts';

export function closeSheet(): void {
  document.getElementById('armory-sheet-backdrop')?.classList.remove('open');
  document.getElementById('armory-sheet')?.classList.remove('open');
}

export function openSheet(ref: ArsenalReference, myId: string | null, onReload: () => void): void {
  const body    = document.getElementById('armory-sheet-body');
  const actions = document.getElementById('armory-sheet-actions');
  if (!body || !actions) return;
  const esc = escapeHTML;
  const srcInfo = SOURCE_TYPES[ref.source_type];
  body.innerHTML = `
    <div class="sheet-rarity" style="color:${RARITY_COLORS[ref.rarity]}">${ref.rarity.toUpperCase()}${ref.graduated ? ' ⭐' : ''}</div>
    <div class="sheet-claim">"${esc(ref.claim_text)}"</div>
    <table class="sheet-table">
      <tr><td>Source</td><td>${esc(ref.source_title)}</td></tr>
      <tr><td>Author</td><td>${esc(ref.source_author)}</td></tr>
      <tr><td>Date</td><td>${esc(ref.source_date)}</td></tr>
      <tr><td>Locator</td><td>${esc(ref.locator)}</td></tr>
      <tr><td>Type</td><td>${srcInfo.label}</td></tr>
      <tr><td>Forger</td><td>${esc(ref.owner_username ?? '—')}</td></tr>
      <tr><td>Power</td><td>${powerDisplay(ref)}</td></tr>
      <tr><td>Seconds</td><td>${Number(ref.seconds)}</td></tr>
      <tr><td>Strikes</td><td>${Number(ref.strikes)}</td></tr>
      <tr><td>Status</td><td>${CHALLENGE_STATUS_LABELS[ref.challenge_status] || '✅ Clean'}</td></tr>
    </table>
    ${ref.source_url ? `<a class="sheet-link" href="${sanitizeUrl(ref.source_url ?? state?.source_url ?? '')}" target="_blank" rel="noopener">🔗 View Source</a>` : ''}`;

  const isOwn = ref.user_id === myId;
  const isFrozen = ref.challenge_status === 'frozen';
  actions.innerHTML = `
    ${!isOwn ? `<button class="sheet-btn sheet-second-btn" data-ref-id="${esc(ref.id)}">👍 Second</button>` : ''}
    ${!isOwn && !isFrozen ? `<button class="sheet-btn sheet-challenge-btn">⚔ Challenge</button>` : ''}
    <button class="sheet-btn sheet-close-btn">Close</button>`;

  actions.querySelector('.sheet-close-btn')?.addEventListener('click', closeSheet);
  actions.querySelector('.sheet-second-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    btn.disabled = true; btn.textContent = 'Seconding...';
    try {
      await secondReference(ref.id);
      showToast('Seconded! 👍', 'success');
      btn.textContent = '✓ Seconded';
      closeSheet(); void onReload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Second failed', 'error');
      btn.textContent = '👍 Second';
    } finally {
      btn.disabled = false;
    }
  });
  actions.querySelector('.sheet-challenge-btn')?.addEventListener('click', () => {
    body.innerHTML += `
      <div class="sheet-challenge-form">
        <label class="sheet-challenge-label">Grounds for challenge</label>
        <textarea id="armory-challenge-grounds" class="sheet-challenge-ta" rows="3" maxlength="280" placeholder="Why is this reference inaccurate or miscategorized?"></textarea>
        <p class="sheet-challenge-hint">Challenging escrows tokens. If denied, escrow is burned.</p>
      </div>`;
    const submitBtn = document.createElement('button');
    submitBtn.className = 'sheet-btn sheet-challenge-submit';
    submitBtn.textContent = 'Submit Challenge';
    actions.insertBefore(submitBtn, actions.firstChild);
    submitBtn.addEventListener('click', async () => {
      const grounds = (document.getElementById('armory-challenge-grounds') as HTMLTextAreaElement)?.value?.trim();
      if (!grounds || grounds.length < 5) { showToast('Add grounds for the challenge', 'error'); return; }
      submitBtn.disabled = true; submitBtn.textContent = 'Submitting...';
      try {
        const result = await challengeReference(ref.id, grounds, null);
        if (result.action === 'shield_blocked') {
          showToast('Citation Shield active — cannot be challenged', 'error');
        } else {
          showToast('Challenge filed ⚔', 'success');
          closeSheet(); void onReload();
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Challenge failed', 'error');
        submitBtn.disabled = false; submitBtn.textContent = 'Submit Challenge';
      }
    });
  });

  document.getElementById('armory-sheet-backdrop')?.classList.add('open');
  document.getElementById('armory-sheet')?.classList.add('open');
}
