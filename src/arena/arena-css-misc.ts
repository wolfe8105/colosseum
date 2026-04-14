/**
 * Arena CSS — miscellaneous utilities (spectator bar, back button, fade-in, hidden, ref button)
 */

export function injectMiscCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* SPECTATOR COUNT */
    .arena-spectator-bar { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px; font-size: 11px; color: var(--mod-text-muted); }
    .arena-spectator-bar .eye { font-size: 13px; }

    /* BACK BUTTON */
    .arena-back-btn { position: absolute; top: 12px; left: 12px; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--mod-border-primary); background: var(--mod-bg-base); color: var(--mod-text-muted); font-size: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; }
    .arena-back-btn:active { background: var(--mod-bg-card-active); }

    /* UTILITY */
    .arena-fade-in { animation: arenaFadeIn 0.3s ease; }
    @keyframes arenaFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .arena-hidden { display: none !important; }

    /* SESSION 39: MODERATOR UI */

    /* Reference submit button */
    /* LANDMINE [LM-CSS-001]: :active background matches default — no visual effect. Not fixing (refactor only). */
    .arena-ref-btn { display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-bg-subtle);background:var(--mod-bg-subtle);color:var(--mod-bar-secondary);font-size:11px;font-weight:600;letter-spacing:1px;cursor:pointer;margin-left:8px;white-space:nowrap; }
    .arena-ref-btn:active { background:var(--mod-bg-subtle); }
  `;
  document.head.appendChild(style);
}
