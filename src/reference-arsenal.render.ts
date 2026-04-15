/**
 * THE MODERATOR — Reference Arsenal Card Renderers
 *
 * renderReferenceCard  — single card (used in My Arsenal + bottom sheet)
 * renderArsenal        — My Arsenal tab with socket dots
 *
 * renderArmory / renderLibrary moved to reference-arsenal.armory.ts
 */

import { safeRpc, getCurrentUser } from './auth.ts';
import { escapeHTML } from './config.ts';
import { compositeScore, powerDisplay } from './reference-arsenal.utils.ts';
import { SOURCE_TYPES, RARITY_COLORS, CHALLENGE_STATUS_LABELS } from './reference-arsenal.constants.ts';
import type { ArsenalReference, Rarity } from './reference-arsenal.types.ts';

export const RARITY_SOCKET_COUNT: Record<Rarity, number> = {
  common: 1, uncommon: 2, rare: 3, legendary: 4, mythic: 5,
};

export function rarityCardStyle(rarity: Rarity): string {
  if (rarity === 'mythic') {
    return `border:1.5px solid ${RARITY_COLORS.mythic};background:rgba(239,68,68,0.06);`;
  }
  return `border-left:3px solid ${RARITY_COLORS[rarity]};border-top:1px solid var(--mod-border-subtle);border-right:1px solid var(--mod-border-subtle);border-bottom:1px solid var(--mod-border-subtle);`;
}

function renderSocketDots(ref: ArsenalReference): string {
  const total = RARITY_SOCKET_COUNT[ref.rarity] ?? 1;
  const socketMap = new Map((ref.sockets ?? []).map(s => [s.socket_index, s.effect_id]));
  let dots = '';
  for (let i = 0; i < total; i++) {
    const eid = socketMap.get(i);
    dots += eid
      ? `<span class="ref-socket-dot filled" title="${escapeHTML(eid)}"></span>`
      : `<span class="ref-socket-dot empty"></span>`;
  }
  return `<div class="ref-socket-dots">${dots}</div>`;
}

// ============================================================
// REFERENCE CARD
// ============================================================

export function renderReferenceCard(
  ref: ArsenalReference,
  showSecondBtn: boolean,
  showEditBtn: boolean = false,
): string {
  const esc = escapeHTML;
  const srcInfo = SOURCE_TYPES[ref.source_type];
  const score = compositeScore(ref);
  const statusLabel = CHALLENGE_STATUS_LABELS[ref.challenge_status] || '';

  return `
    <div class="ref-card" data-ref-id="${esc(ref.id)}" style="${rarityCardStyle(ref.rarity)}">
      <div class="ref-card-header">
        <span class="ref-card-type">${esc(srcInfo.label)}</span>
        <span class="ref-card-rarity" style="color:${RARITY_COLORS[ref.rarity]}">${ref.rarity.toUpperCase()}</span>
        ${ref.graduated ? '<span class="ref-card-graduated">⭐</span>' : ''}
      </div>
      <div class="ref-card-claim">"${esc(ref.claim_text)}"</div>
      <div class="ref-card-meta">
        <span class="ref-card-title">${esc(ref.source_title)}</span>
        <span class="ref-card-author">${esc(ref.source_author)} · ${esc(ref.source_date)}</span>
        <span class="ref-card-locator">Loc: ${esc(ref.locator)}</span>
      </div>
      ${ref.owner_username ? `<div class="ref-card-forger">⚒ ${esc(ref.owner_username)}</div>` : ''}
      <div class="ref-card-power">Power ${powerDisplay(ref)}</div>
      <div class="ref-card-stats">
        <span>👍 ${Number(ref.seconds)}</span>
        <span>📄 ${Number(ref.strikes)}</span>
        <span>✨ ${Number(score)}</span>
      </div>
      ${ref.sockets != null ? renderSocketDots(ref) : ''}
      ${statusLabel ? `<div class="ref-card-status">${statusLabel}</div>` : ''}
      ${ref.source_url ? `<a class="ref-card-url" href="${esc(ref.source_url)}" target="_blank" rel="noopener">View Source</a>` : ''}
      ${showSecondBtn ? `<button class="ref-card-second-btn" data-ref-id="${esc(ref.id)}">👍 Second</button>` : ''}
      ${showEditBtn ? `<button class="ref-card-edit-btn" data-ref-id="${esc(ref.id)}">✏️ Edit</button>` : ''}
      ${showEditBtn ? `<button class="ref-card-delete-btn" data-ref-id="${esc(ref.id)}">🗑️ Delete</button>` : ''}
    </div>`;
}

// ============================================================
// MY ARSENAL
// ============================================================

export async function renderArsenal(container: HTMLElement): Promise<ArsenalReference[]> {
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = '<p class="arsenal-empty">Sign in to view your arsenal.</p>';
    return [];
  }
  container.innerHTML = '<p class="arsenal-loading">Loading arsenal...</p>';

  const { data, error } = await safeRpc<ArsenalReference[]>('get_my_arsenal', {});
  const refs = (data || []) as ArsenalReference[];

  if (error || refs.length === 0) {
    container.innerHTML = `<div class="arsenal-empty">
      <p>${error ? 'Could not load your arsenal.' : 'Your arsenal is empty.'}</p>
      <button id="arsenal-forge-btn" class="forge-btn-primary">⚔ Forge Your First Weapon</button>
    </div>`;
    return [];
  }

  refs.sort((a, b) => b.current_power - a.current_power || Date.parse(b.created_at) - Date.parse(a.created_at));

  let html = `<div class="arsenal-header">
    <h2>Your Arsenal</h2>
    <button id="arsenal-forge-btn" class="forge-btn-primary">⚔ Forge New</button>
  </div><div class="arsenal-grid">`;
  for (const ref of refs) html += renderReferenceCard(ref, false, true);
  html += '</div>';
  container.innerHTML = html;
  return refs;
}
