/**
 * Arena CSS — reference submit form + moderator ruling bottom sheet
 */

export function injectReferencesCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* Reference submit form (inline under messages) */
    .arena-ref-form { padding:10px 16px;border-top:1px solid var(--mod-border-subtle);background:var(--mod-bg-card); }
    .arena-ref-form input, .arena-ref-form textarea { width:100%;padding:8px 12px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-base);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:13px;outline:none;margin-bottom:6px; }
    .arena-ref-form input:focus, .arena-ref-form textarea:focus { border-color:var(--mod-accent-border); }
    .arena-ref-form textarea { resize:none;min-height:44px; }
    .arena-ref-side-row { display:flex;gap:6px;margin-bottom:8px; }
    .arena-ref-side-btn { flex:1;padding:8px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:none;color:var(--mod-text-muted);font-size:12px;font-weight:600;cursor:pointer;text-align:center; }
    .arena-ref-side-btn.active { border-color:var(--mod-accent-border);color:var(--mod-accent);background:var(--mod-accent-muted); }
    .arena-ref-actions { display:flex;gap:8px; }
    /* LANDMINE [LM-CSS-001]: .arena-ref-submit:active matches default background — no visual effect. Not fixing (refactor only). */
    .arena-ref-submit { flex:1;padding:8px;border-radius:var(--mod-radius-md);border:none;background:var(--mod-bg-subtle);color:var(--mod-bar-secondary);font-size:12px;font-weight:600;letter-spacing:1px;cursor:pointer; }
    .arena-ref-submit:active { background:var(--mod-bg-subtle); }
    .arena-ref-cancel { padding:8px 14px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-subtle);background:none;color:var(--mod-text-muted);font-size:12px;cursor:pointer; }

    /* Moderator ruling panel (bottom sheet) */
    .mod-ruling-overlay { position:fixed;inset:0;z-index:300;display:flex;flex-direction:column;justify-content:flex-end; }
    .mod-ruling-backdrop { position:absolute;inset:0;background:var(--mod-bg-overlay); }
    .mod-ruling-sheet { position:relative;background:var(--mod-bg-base);border-top:2px solid var(--mod-accent);border-radius:20px 20px 0 0;padding:20px 16px calc(20px + var(--safe-bottom));max-height:70vh;overflow-y:auto;animation:sheetSlideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
    .mod-ruling-handle { width:36px;height:4px;border-radius:2px;background:var(--mod-border-secondary);margin:0 auto 12px; }
    .mod-ruling-title { font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:3px;color:var(--mod-text-muted);text-transform:uppercase;text-align:center;margin-bottom:4px; }
    .mod-ruling-sub { font-size:12px;color:var(--mod-text-body);text-align:center;margin-bottom:14px; }
    .mod-ruling-ref { background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md);padding:12px;margin-bottom:12px; }
    .mod-ruling-ref-meta { font-size:10px;color:var(--mod-text-muted);letter-spacing:1px;margin-bottom:4px; }
    .mod-ruling-ref-url { font-size:12px;color:var(--mod-bar-secondary);word-break:break-all;margin-bottom:4px; }
    .mod-ruling-ref-desc { font-size:13px;color:var(--mod-text-primary);line-height:1.4; }
    .mod-ruling-ref-side { font-size:11px;color:var(--mod-accent);margin-top:4px; }
    .mod-ruling-reason { width:100%;padding:8px 12px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:13px;resize:none;min-height:44px;outline:none;margin-bottom:10px; }
    .mod-ruling-reason:focus { border-color:var(--mod-accent-border); }
    .mod-ruling-btns { display:flex;gap:10px; }
    .mod-ruling-allow { flex:1;padding:12px;border-radius:var(--mod-radius-md);border:none;background:rgba(93,202,165,0.12);color:var(--mod-status-open);font-family:var(--mod-font-ui);font-size:14px;letter-spacing:2px;cursor:pointer; }
    .mod-ruling-allow:active { background:rgba(93,202,165,0.25); }
    .mod-ruling-deny { flex:1;padding:12px;border-radius:var(--mod-radius-md);border:none;background:var(--mod-accent-muted);color:var(--mod-accent);font-family:var(--mod-font-ui);font-size:14px;letter-spacing:2px;cursor:pointer; }
    .mod-ruling-deny:active { background:rgba(231,68,42,0.25); }
    .mod-ruling-timer { font-size:11px;color:var(--mod-text-muted);text-align:center;margin-bottom:8px; }
  `;
  document.head.appendChild(style);
}
