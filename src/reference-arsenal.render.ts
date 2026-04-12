/**
 * THE MODERATOR — Reference Arsenal Renderers
 *
 * Reference card renderer, arsenal list, and public library.
 */

import { safeRpc, getCurrentUser } from './auth.ts';
import { escapeHTML, showToast } from './config.ts';
import { compositeScore, powerDisplay } from './reference-arsenal.utils.ts';
import { SOURCE_TYPES, RARITY_COLORS, CHALLENGE_STATUS_LABELS } from './reference-arsenal.constants.ts';
import type { ArsenalReference } from './reference-arsenal.types.ts';

// ============================================================
// REFERENCE CARD RENDERER
// ============================================================

export function renderReferenceCard(
  ref: ArsenalReference,
  showSecondBtn: boolean,
  showEditBtn: boolean = false,
): string {
  const esc = escapeHTML;
  const srcInfo = SOURCE_TYPES[ref.source_type];
  const rarityColor = RARITY_COLORS[ref.rarity];
  const score = compositeScore(ref);
  const statusLabel = CHALLENGE_STATUS_LABELS[ref.challenge_status] || '';

  return `
    <div class="ref-card" data-ref-id="${esc(ref.id)}" style="border-color: ${rarityColor}">
      <div class="ref-card-header">
        <span class="ref-card-type" title="${srcInfo.tier}-tier">${esc(srcInfo.label)}</span>
        <span class="ref-card-rarity" style="color: ${rarityColor}">${ref.rarity.toUpperCase()}</span>
        ${ref.graduated ? '<span class="ref-card-graduated" title="Graduated">\u2B50</span>' : ''}
      </div>
      <div class="ref-card-claim">"${esc(ref.claim_text)}"</div>
      <div class="ref-card-meta">
        <span class="ref-card-title">${esc(ref.source_title)}</span>
        <span class="ref-card-author">${esc(ref.source_author)} \u00B7 ${esc(ref.source_date)}</span>
        <span class="ref-card-locator">Loc: ${esc(ref.locator)}</span>
      </div>
      <div class="ref-card-power">
        <span class="ref-card-power-label">Power ${powerDisplay(ref)}</span>
      </div>
      <div class="ref-card-stats">
        <span title="Seconds">\u{1F44D} ${Number(ref.seconds)}</span>
        <span title="Strikes">\u{1F4C4} ${Number(ref.strikes)}</span>
        <span title="Composite Score">\u2728 ${Number(score)}</span>
      </div>
      ${statusLabel ? `<div class="ref-card-status">${statusLabel}</div>` : ''}
      ${ref.source_url ? `<a class="ref-card-url" href="${esc(ref.source_url)}" target="_blank" rel="noopener">View Source</a>` : ''}
      ${showSecondBtn ? `<button class="ref-card-second-btn" data-ref-id="${esc(ref.id)}">\u{1F44D} Second</button>` : ''}
      ${showEditBtn ? `<button class="ref-card-edit-btn" data-ref-id="${esc(ref.id)}">\u270F\uFE0F Edit</button>` : ''}
      ${showEditBtn ? `<button class="ref-card-delete-btn" data-ref-id="${esc(ref.id)}">\u{1F5D1}\uFE0F Delete</button>` : ''}
    </div>
  `;
}

// ============================================================
// ARSENAL LIST RENDERER
// ============================================================

export async function renderArsenal(container: HTMLElement): Promise<ArsenalReference[]> {
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = '<p class="arsenal-empty">Sign in to view your arsenal.</p>';
    return [];
  }

  container.innerHTML = '<p class="arsenal-loading">Loading arsenal...</p>';

  const { data, error } = await safeRpc<ArsenalReference[]>('get_my_arsenal', {});

  if (error) {
    container.innerHTML = `
      <div class="arsenal-empty">
        <p>Your arsenal is empty.</p>
        <button id="arsenal-forge-btn" class="forge-btn-primary">\u2694 Forge Your First Weapon</button>
      </div>
    `;
    return [];
  }

  const refs = (data || []) as ArsenalReference[];

  if (refs.length === 0) {
    container.innerHTML = `
      <div class="arsenal-empty">
        <p>Your arsenal is empty.</p>
        <button id="arsenal-forge-btn" class="forge-btn-primary">\u2694 Forge Your First Weapon</button>
      </div>
    `;
    return [];
  }

  refs.sort((a, b) => b.current_power - a.current_power || Date.parse(b.created_at) - Date.parse(a.created_at));

  let html = `<div class="arsenal-header">
    <h2>Your Arsenal</h2>
    <button id="arsenal-forge-btn" class="forge-btn-primary">\u2694 Forge New</button>
  </div>`;
  html += `<div class="arsenal-grid">`;
  for (const ref of refs) {
    html += renderReferenceCard(ref, false, true);
  }
  html += `</div>`;

  container.innerHTML = html;

  return refs;
}

// ============================================================
// LIBRARY RENDERER
// ============================================================

export async function renderLibrary(
  container: HTMLElement,
  onSecond: (refId: string) => Promise<void>,
): Promise<void> {
  container.innerHTML = '<p class="arsenal-loading">Loading reference library...</p>';

  const { data, error } = await safeRpc<ArsenalReference[]>('get_reference_library', {});

  if (error) {
    container.innerHTML = '<p class="arsenal-empty">Could not load library.</p>';
    return;
  }

  const refs = (data || []) as ArsenalReference[];
  const user = getCurrentUser();
  const userId = user?.id || null;

  if (refs.length === 0) {
    container.innerHTML = '<p class="arsenal-empty">No references in the library yet. Be the first to forge one.</p>';
    return;
  }

  let html = `<div class="library-grid">`;
  for (const ref of refs) {
    const isOwn = ref.user_id === userId;
    html += renderReferenceCard(ref, !isOwn);
  }
  html += `</div>`;

  container.innerHTML = html;

  // Wire second buttons
  container.querySelectorAll('.ref-card-second-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const refId = (e.currentTarget as HTMLElement).dataset.refId;
      if (!refId) return;
      const button = e.currentTarget as HTMLButtonElement;
      button.disabled = true;
      button.textContent = 'Seconding...';
      try {
        await onSecond(refId);
        button.textContent = '\u2713 Seconded';
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Second failed';
        showToast(msg, 'error');
        button.disabled = false;
        button.textContent = '\u{1F44D} Second';
      }
    });
  });
}
