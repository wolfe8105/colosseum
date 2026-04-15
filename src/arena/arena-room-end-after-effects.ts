// arena-room-end-after-effects.ts — F-57 Phase 3 "After Effects" breakdown renderer.
// Renders the end-of-debate modifier chain:
//   Raw: 47 → +2 Point Surge → -1 Point Siphon → Final: 48
// Returns empty string if no adjustments fired.

import { escapeHTML } from '../config.ts';
import type { EndOfDebateBreakdown } from './arena-types-results.ts';

export function renderAfterEffects(
  breakdown: EndOfDebateBreakdown | null,
  myRole: string,
): string {
  if (!breakdown) return '';

  const myData  = myRole === 'a' ? breakdown.debater_a : breakdown.debater_b;
  const oppData = myRole === 'a' ? breakdown.debater_b : breakdown.debater_a;

  const myAdj  = myData.adjustments  ?? [];
  const oppAdj = oppData.adjustments ?? [];
  const invEffects = breakdown.inventory_effects ?? [];

  if (myAdj.length === 0 && oppAdj.length === 0 && invEffects.length === 0) return '';

  function renderChain(d: typeof myData, label: string): string {
    if (d.adjustments.length === 0) return '';
    const steps = d.adjustments.map(adj => {
      const sign = adj.delta >= 0 ? '+' : '';
      const cls  = adj.delta >= 0 ? 'positive' : 'negative';
      return `<span class="ae-step ae-step--${cls}">${sign}${adj.delta} ${escapeHTML(adj.effect_name)}</span>`;
    }).join('<span class="ae-arrow">→</span>');

    return `
      <div class="ae-row">
        <span class="ae-label">${escapeHTML(label)}</span>
        <span class="ae-raw">${d.raw_score}</span>
        <span class="ae-arrow">→</span>
        ${steps}
        <span class="ae-arrow">→</span>
        <span class="ae-final">${d.final_score}</span>
      </div>`;
  }

  function renderInventoryEvent(ev: Record<string, unknown>): string {
    const EFFECT_LABELS: Record<string, string> = {
      mirror:         '🪞 Mirror',
      burn_notice:    '🔥 Burn Notice',
      parasite:       '🦠 Parasite',
      chain_reaction: '⛓ Chain Reaction',
    };
    const effectKey = ev['effect'] as string;
    const label     = EFFECT_LABELS[effectKey] ?? escapeHTML(effectKey);

    let detail = '';
    switch (effectKey) {
      case 'mirror':
        detail = `Copied <strong>${escapeHTML(String(ev['copied_effect_id']))}</strong> from opponent's ref`;
        break;
      case 'burn_notice':
        detail = `Destroyed opponent's <strong>${escapeHTML(String(ev['burned_effect_id']))}</strong>`;
        break;
      case 'parasite': {
        const src = ev['source'] === 'socketed' ? 'ripped from their ref' : 'taken from inventory';
        detail = `Stole <strong>${escapeHTML(String(ev['stolen_effect_id']))}</strong> (${src})`;
        break;
      }
      case 'chain_reaction':
        detail = `<strong>${escapeHTML(String(ev['regenerated_effect']))}</strong> power-up ×${ev['new_powerup_qty']} added to inventory`;
        break;
      default:
        detail = escapeHTML(JSON.stringify(ev));
    }

    return `
      <div class="ae-inv-row">
        <span class="ae-inv-label">${label}</span>
        <span class="ae-inv-detail">${detail}</span>
      </div>`;
  }

  const myChain    = renderChain(myData,  'You');
  const oppChain   = renderChain(oppData, 'Opponent');
  const invSection = invEffects.length > 0
    ? `<div class="ae-inv-section">
         <div class="ae-inv-header">🎒 INVENTORY</div>
         ${invEffects.map(renderInventoryEvent).join('')}
       </div>`
    : '';

  if (!myChain && !oppChain && !invSection) return '';

  return `
    <div class="arena-after-effects">
      <div class="arena-after-effects__title">⚡ AFTER EFFECTS</div>
      ${myChain}
      ${oppChain}
      ${invSection}
    </div>`;
}
