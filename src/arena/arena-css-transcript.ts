/**
 * Arena CSS — SESSION 113: Transcript bottom sheet
 */

export function injectTranscriptCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* SESSION 113: Transcript bottom sheet */
    .arena-transcript-overlay { position:fixed;inset:0;background:var(--mod-bg-overlay);z-index:10000;display:flex;align-items:flex-end;justify-content:center; }
    .arena-transcript-sheet { background:var(--mod-bg-base);border-top-left-radius:20px;border-top-right-radius:20px;width:100%;max-width:480px;max-height:80vh;display:flex;flex-direction:column;padding-bottom:max(12px,env(safe-area-inset-bottom)); }
    .arena-transcript-header { padding:16px 20px 12px;border-bottom:1px solid var(--mod-border-subtle);flex-shrink:0; }
    .arena-transcript-handle { width:40px;height:4px;background:var(--mod-border-secondary);border-radius:2px;margin:0 auto 12px; }
    .arena-transcript-title { font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:3px;color:var(--mod-text-muted);text-transform:uppercase;text-align:center; }
    .arena-transcript-topic { font-size:12px;color:var(--mod-text-body);text-align:center;margin-top:4px; }
    .arena-transcript-body { flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 16px;display:flex;flex-direction:column;gap:8px; }
    .arena-transcript-round { font-size:10px;color:var(--mod-text-muted);letter-spacing:2px;text-align:center;padding:8px 0 4px;text-transform:uppercase; }
    .arena-transcript-msg { padding:10px 14px;border-radius:var(--mod-radius-lg);max-width:85%; }
    .arena-transcript-msg.side-a { background:var(--mod-accent-muted);border:1px solid var(--mod-accent-border);align-self:flex-start; }
    .arena-transcript-msg.side-b { background:var(--mod-bg-subtle);border:1px solid var(--mod-bg-subtle);align-self:flex-end; }
    .arena-transcript-msg .t-name { font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:4px; }
    .arena-transcript-msg.side-a .t-name { color:var(--mod-accent); }
    .arena-transcript-msg.side-b .t-name { color:var(--mod-bar-secondary); }
    .arena-transcript-msg .t-text { font-size:14px;color:var(--mod-text-primary);line-height:1.4;word-break:break-word; }
    .arena-transcript-empty { text-align:center;color:var(--mod-text-muted);font-size:13px;padding:24px 0; }
  `;
  document.head.appendChild(style);
}
