/**
 * Arena CSS — mode select overlay, mode cards, topic input
 */

export function injectModeSelectCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* MODE SELECT OVERLAY */
    .arena-mode-overlay { position: fixed; inset: 0; z-index: 250; display: flex; flex-direction: column; justify-content: flex-end; }
    .arena-mode-backdrop { position: absolute; inset: 0; background: var(--mod-bg-overlay); }
    .arena-mode-sheet { position: relative; background: var(--mod-bg-base); border-top: 1px solid var(--mod-border-primary); border-radius: 20px 20px 0 0; padding: 20px 16px calc(20px + var(--safe-bottom)); max-height: 85vh; overflow-y: auto; transform: translateY(0); animation: sheetSlideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
    @keyframes sheetSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .arena-mode-handle { width: 36px; height: 4px; border-radius: 2px; background: var(--mod-border-secondary); margin: 0 auto 16px; }
    .arena-mode-title { font-family: var(--mod-font-ui); font-size: 11px; font-weight: 600; letter-spacing: 3px; color: var(--mod-text-muted); text-transform: uppercase; text-align: center; margin-bottom: 4px; }
    .arena-mode-subtitle { font-size: 13px; color: var(--mod-text-body); text-align: center; margin-bottom: 16px; }

    /* MODE CARDS */
    .arena-mode-card { background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); border-left: var(--mod-card-bar-width) solid var(--mod-bar-secondary); border-radius: var(--mod-radius-md); padding: 16px; margin-bottom: 10px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: background var(--mod-transition-fast); -webkit-tap-highlight-color: transparent; }
    .arena-mode-card:active { background: var(--mod-bg-card-hover); }
    .arena-mode-icon { width: 50px; height: 50px; border-radius: var(--mod-radius-md); display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
    .arena-mode-info { flex: 1; }
    .arena-mode-name { font-family: var(--mod-font-ui); font-size: var(--mod-font-card-title-size); font-weight: var(--mod-font-card-title-weight); letter-spacing: var(--mod-font-card-title-spacing); color: var(--mod-text-primary); }
    .arena-mode-desc { font-size: 12px; color: var(--mod-text-body); margin-top: 2px; }
    .arena-mode-avail { font-size: 11px; margin-top: 4px; font-weight: 600; }
    .arena-mode-arrow { color: var(--mod-text-muted); font-size: 18px; }
    .arena-mode-cancel { display: block; width: 100%; padding: 14px; border: 1px solid var(--mod-border-primary); background: none; border-radius: var(--mod-radius-md); color: var(--mod-text-muted); font-family: var(--mod-font-ui); font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 4px; }

    /* TOPIC INPUT */
    .arena-topic-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--mod-border-subtle); }
    .arena-topic-label { font-size: 11px; color: var(--mod-text-muted); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px; font-family: var(--mod-font-ui); }
    .arena-topic-input { width: 100%; padding: 10px 14px; border-radius: var(--mod-radius-md); border: 1px solid var(--mod-border-primary); background: var(--mod-bg-card); color: var(--mod-text-primary); font-family: var(--mod-font-ui); font-size: 14px; outline: none; }
    .arena-topic-input::placeholder { color: var(--mod-text-muted); }
    .arena-topic-input:focus { border-color: var(--mod-accent-border); }
  `;
  document.head.appendChild(style);
}
