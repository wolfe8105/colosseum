/**
 * Arena CSS — Unplugged ruleset color overrides
 */

export function injectUnpluggedCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* Unplugged ruleset styles */
    .arena-rank-badge.unplugged { background:rgba(194,154,88,0.12);border:1px solid rgba(194,154,88,0.35);color:var(--mod-gold); }
    .arena-rank-card.unplugged { border-color:rgba(194,154,88,0.35); }
    .arena-rank-card.unplugged:hover,
    .arena-rank-card.unplugged:active { border-color:var(--mod-gold); background:rgba(194,154,88,0.06); }
    .arena-rank-card.amplified:hover,
    .arena-rank-card.amplified:active { border-color:var(--mod-accent-border);background:var(--mod-accent-muted); }
    .arena-card-badge.unplugged { background:rgba(194,154,88,0.12);border:1px solid rgba(194,154,88,0.35);color:var(--mod-gold); }
  `;
  document.head.appendChild(style);
}
