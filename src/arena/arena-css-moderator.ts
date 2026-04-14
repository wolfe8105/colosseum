/**
 * Arena CSS — moderator picker, mod bar badge, post-debate mod scoring controls
 */

export function injectModeratorCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* Moderator assignment picker */
    .mod-picker-section { margin-top:12px;padding-top:12px;border-top:1px solid var(--mod-border-subtle); }
    .mod-picker-label { font-size:11px;color:var(--mod-text-muted);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;font-family:var(--mod-font-ui); }
    .mod-picker-opts { display:flex;flex-direction:column;gap:6px; }
    .mod-picker-opt { display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);cursor:pointer; }
    .mod-picker-opt:active { background:var(--mod-bg-card-active); }
    .mod-picker-opt.selected { border-color:var(--mod-accent-border);background:var(--mod-accent-muted); }
    .mod-picker-avatar { width:32px;height:32px;border-radius:50%;border:2px solid var(--mod-bar-secondary);background:var(--mod-bg-base);color:var(--mod-bar-secondary);font-family:var(--mod-font-ui);font-size:13px;display:flex;align-items:center;justify-content:center; }
    .mod-picker-info { flex:1; }
    .mod-picker-name { font-size:13px;font-weight:600;color:var(--mod-text-primary); }
    .mod-picker-stats { font-size:10px;color:var(--mod-text-muted); }
    .mod-picker-check { width:18px;height:18px;border-radius:50%;border:2px solid var(--mod-text-muted);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--mod-accent); }
    .mod-picker-opt.selected .mod-picker-check { border-color:var(--mod-accent);background:var(--mod-accent-muted); }

    /* Moderator badge in VS bar */
    .arena-mod-bar { display:flex;align-items:center;justify-content:center;gap:6px;padding:4px;font-size:11px;color:var(--mod-bar-secondary);border-bottom:1px solid var(--mod-border-subtle); }
    .arena-mod-bar .mod-icon { font-size:12px; }

    /* Post-debate mod scoring */
    .mod-score-section { margin-top:16px;width:100%;max-width:320px; }
    .mod-score-title { font-family:var(--mod-font-ui);font-size:7px;font-weight:600;letter-spacing:1px;color:var(--mod-text-muted);text-transform:uppercase;text-align:center;margin-bottom:8px; }
    .mod-score-card { background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md);padding:14px;text-align:center; }
    .mod-score-name { font-size:14px;font-weight:600;color:var(--mod-text-primary);margin-bottom:8px; }
    .mod-score-btns { display:flex;gap:10px;justify-content:center; }
    .mod-score-btn { padding:10px 20px;border-radius:var(--mod-radius-md);border:none;font-family:var(--mod-font-ui);font-size:13px;letter-spacing:1px;cursor:pointer; }
    .mod-score-btn.happy { background:rgba(93,202,165,0.12);color:var(--mod-status-open); }
    .mod-score-btn.happy:active { background:rgba(93,202,165,0.25); }
    .mod-score-btn.unhappy { background:var(--mod-accent-muted);color:var(--mod-accent); }
    .mod-score-btn.unhappy:active { background:rgba(231,68,42,0.25); }
    .mod-score-slider-row { margin-top:8px; }
    .mod-score-slider { width:100%;accent-color:var(--mod-accent); }
    .mod-score-val { font-family:var(--mod-font-ui);font-size:16px;color:var(--mod-accent);margin-top:4px; }
    .mod-score-submit { margin-top:8px;padding:10px 24px;border-radius:var(--mod-radius-md);border:none;background:var(--mod-bar-accent);background-image:var(--mod-gloss);color:var(--mod-text-on-accent);font-family:var(--mod-font-ui);font-size:13px;letter-spacing:1px;cursor:pointer; }
    .mod-score-submit:active { transform:scale(0.96); }
    .mod-scored { font-size:13px;color:var(--mod-status-open);margin-top:8px; }
  `;
  document.head.appendChild(style);
}
