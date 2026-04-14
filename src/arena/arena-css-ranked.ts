/**
 * Arena CSS — ranked/casual mode picker + rank badges + ELO change
 */

export function injectRankedCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* Ranked / Casual picker */
    .arena-rank-overlay { position: fixed; inset: 0; z-index: 250; display: flex; flex-direction: column; justify-content: flex-end; }
    .arena-rank-backdrop { position: absolute; inset: 0; background: var(--mod-bg-overlay); }
    .arena-rank-sheet { position: relative; background: var(--mod-bg-base); border-top: 1px solid var(--mod-border-primary); border-radius: 20px 20px 0 0; padding: 20px 16px calc(20px + var(--safe-bottom)); max-height: 70vh; overflow-y: auto; animation: sheetSlideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
    .arena-rank-title { font-family: var(--mod-font-ui); font-size: 11px; font-weight: 600; letter-spacing: 3px; color: var(--mod-text-muted); text-transform: uppercase; text-align: center; margin-bottom: 4px; }
    .arena-rank-subtitle { font-size: 13px; color: var(--mod-text-body); text-align: center; margin-bottom: 16px; }
    .arena-rank-card { background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); border-radius: var(--mod-radius-md); padding: 18px 16px; margin-bottom: 12px; cursor: pointer; transition: background var(--mod-transition-fast); -webkit-tap-highlight-color: transparent; }
    .arena-rank-card:active { background: var(--mod-bg-card-hover); }
    .arena-rank-card.casual { border-left: var(--mod-card-bar-width) solid var(--mod-bar-primary); }
    .arena-rank-card.ranked { border-left: var(--mod-card-bar-width) solid var(--mod-bar-accent); }
    .arena-rank-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .arena-rank-card-icon { font-size: 22px; }
    .arena-rank-card-name { font-family: var(--mod-font-ui); font-size: var(--mod-font-card-title-size); font-weight: var(--mod-font-card-title-weight); letter-spacing: var(--mod-font-card-title-spacing); color: var(--mod-text-primary); }
    .arena-rank-card-desc { font-size: 12px; color: var(--mod-text-body); line-height: 1.5; }
    .arena-rank-card-badge { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 1px; padding: 2px 8px; border-radius: var(--mod-radius-pill); margin-top: 8px; }
    .arena-rank-card.casual .arena-rank-card-badge { background: var(--mod-bg-subtle); color: var(--mod-bar-primary); }
    .arena-rank-card.ranked .arena-rank-card-badge { background: var(--mod-accent-muted); color: var(--mod-accent); }
    .arena-rank-cancel { display: block; width: 100%; padding: 14px; border: 1px solid var(--mod-border-primary); background: none; border-radius: var(--mod-radius-md); color: var(--mod-text-muted); font-family: var(--mod-font-ui); font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 4px; }

    /* Ranked/Casual badge in queue + post-debate */
    .arena-rank-badge { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 3px 10px; border-radius: var(--mod-radius-pill); margin-bottom: 8px; }
    .arena-rank-badge.casual { background: var(--mod-bg-subtle); color: var(--mod-bar-primary); }
    .arena-rank-badge.ranked { background: var(--mod-accent-muted); color: var(--mod-accent); }
    .arena-elo-change { font-size: 14px; font-weight: 700; margin-top: 8px; letter-spacing: 1px; }
    .arena-elo-change.positive { color: var(--mod-status-open); }
    .arena-elo-change.negative { color: var(--mod-accent); }
    .arena-elo-change.neutral { color: var(--mod-text-muted); }
  `;
  document.head.appendChild(style);
}
