/**
 * THE MODERATOR — Power-Up Shop Render
 * renderShop — static HTML from CATALOG.
 *
 * LANDMINE [LM-PU-001]: Multiple hardcoded hex/rgba colors in inline styles.
 * #1a1a2e, #2a2a3e, #0f0f1a, #666, #0f0f1a — no CSS var token equivalents yet.
 */

import { CATALOG } from './powerups.types.ts';
import type { PowerUpId, PowerUpCatalogEntry } from './powerups.types.ts';

export function renderShop(tokenBalance: number): string {
  const balance = tokenBalance || 0;
  const items = (Object.entries(CATALOG) as [PowerUpId, PowerUpCatalogEntry][]).map(([id, pu]) => {
    const canAfford = balance >= pu.cost;
    return `
      <div class="powerup-shop-item" style="display:flex;align-items:center;gap:12px;padding:12px;background:#1a1a2e; /* TODO: needs CSS var token */border:1px solid #2a2a3e; /* TODO: needs CSS var token */border-radius:8px;margin-bottom:8px;">
        <div style="font-size:28px;width:40px;text-align:center;">${pu.icon}</div>
        <div style="flex:1;">
          <div style="font-family:var(--mod-font-ui);font-size:15px;font-weight:600;color:var(--mod-text-primary);">${pu.name}</div>
          <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-muted);">${pu.desc}</div>
        </div>
        <button class="powerup-buy-btn" data-id="${id}" data-cost="${pu.cost}" ${canAfford ? '' : 'disabled'} style="padding:8px 14px;border:none;border-radius:6px;background:${canAfford ? 'linear-gradient(135deg,var(--mod-text-heading),#B8860B)' : '#2a2a3e'} /* TODO: needs CSS var token */;color:${canAfford ? '#0f0f1a' : '#666'} /* TODO: needs CSS var token */;font-family:var(--mod-font-ui);font-size:13px;font-weight:600;cursor:${canAfford ? 'pointer' : 'default'};white-space:nowrap;">${Number(pu.cost)} 🪙</button>
      </div>`;
  });

  return `
    <div class="powerup-shop" style="padding:4px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-family:'Oswald',sans-serif;font-size:14px;color:var(--mod-text-heading);letter-spacing:1px;text-transform:uppercase;">POWER-UP SHOP</div>
        <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-muted);">Balance: <span style="color:var(--mod-text-heading);font-weight:600;">${Number(balance)} 🪙</span></div>
      </div>
      ${items.join('')}
    </div>`;
}
