/**
 * THE MODERATOR — Reference Arsenal Loadout Picker
 *
 * Pre-debate loadout picker. Renders a selectable grid of
 * the user's arsenal (max 5 selections).
 */

import { safeRpc } from './auth.ts';
import { escapeHTML } from './config.ts';
import { powerDisplay } from './reference-arsenal.utils.ts';
import { SOURCE_TYPES, RARITY_COLORS } from './reference-arsenal.constants.ts';
import { saveDebateLoadout } from './reference-arsenal.debate.ts';
import type { ArsenalReference } from './reference-arsenal.types.ts';

export async function renderLoadoutPicker(
  container: HTMLElement,
  debateId: string,
  initialRefs: string[] = [],
): Promise<void> {
  container.innerHTML = '<p style="color:var(--mod-text-muted);text-align:center;font-size:13px;">Loading arsenal...</p>';

  let arsenal: ArsenalReference[];
  try {
    const { data, error } = await safeRpc<ArsenalReference[]>('get_my_arsenal', {});
    if (error || !data) { arsenal = []; }
    else { arsenal = data as ArsenalReference[]; }
  } catch {
    arsenal = [];
  }

  // Filter out frozen refs (can't be loaded)
  arsenal = arsenal.filter(r => r.challenge_status !== 'frozen');

  if (arsenal.length === 0) {
    container.innerHTML = `
      <div class="ref-loadout-empty">
        <span style="font-size:13px;color:var(--mod-text-muted);">No references forged. Enter battle without weapons.</span>
      </div>
    `;
    return;
  }

  arsenal.sort((a, b) => b.current_power - a.current_power || Date.parse(b.created_at) - Date.parse(a.created_at));

  const selected = new Set<string>(
    initialRefs.filter(id => arsenal.some(r => r.id === id)).slice(0, 5)
  );

  function render(): void {
    let html = `<div class="ref-loadout-header">
      <span class="ref-loadout-title">\u2694\uFE0F REFERENCE LOADOUT</span>
      <span class="ref-loadout-count" id="ref-loadout-count">${selected.size}/5</span>
    </div>`;
    html += '<div class="ref-loadout-grid">';
    for (const ref of arsenal) {
      const isSelected = selected.has(ref.id);
      const isDisabled = !isSelected && selected.size >= 5;
      const srcInfo = SOURCE_TYPES[ref.source_type];
      const rarityColor = RARITY_COLORS[ref.rarity];
      html += `
        <div class="ref-loadout-card${isSelected ? ' selected' : ''}${isDisabled ? ' disabled' : ''}"
             data-ref-id="${escapeHTML(ref.id)}">
          <div class="ref-loadout-card-top">
            <span class="ref-loadout-type" style="border-color:${rarityColor}">${escapeHTML(srcInfo?.label || ref.source_type)}</span>
            <span class="ref-loadout-power">PWR ${powerDisplay(ref)}</span>
          </div>
          <div class="ref-loadout-claim">${escapeHTML(ref.claim_text)}</div>
          <div class="ref-loadout-meta">${escapeHTML(ref.source_title)} \u00B7 ${escapeHTML(ref.source_author)}</div>
          ${isSelected ? '<div class="ref-loadout-check">\u2705</div>' : ''}
        </div>
      `;
    }
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.ref-loadout-card:not(.disabled)').forEach((card) => {
      card.addEventListener('click', () => {
        const refId = (card as HTMLElement).dataset.refId;
        if (!refId) return;
        if (selected.has(refId)) {
          selected.delete(refId);
        } else if (selected.size < 5) {
          selected.add(refId);
        }
        render();
        saveDebateLoadout(debateId, Array.from(selected)).catch((e) =>
          console.warn('[Arena] Loadout save failed:', e)
        );
      });
    });
  }

  render();
}
