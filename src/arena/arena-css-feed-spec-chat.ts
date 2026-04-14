/**
 * Arena CSS — F-07: spectator chat panel + pre-debate spectator share row
 */

export function injectFeedSpecChatCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* F-07: Spectator chat panel (live feed room) */
    .feed-spec-chat-panel { width:100%;margin-top:8px; }
    .spec-chat-wrap { border:1px solid var(--mod-border-primary);border-radius:12px;overflow:hidden;background:var(--mod-bg-card); }
    .spec-chat-hdr { display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer;user-select:none; }
    .spec-chat-hdr-label { font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:2px;color:var(--mod-text-muted);text-transform:uppercase; }
    .spec-chat-hdr-toggle { font-size:10px;color:var(--mod-text-muted); }
    .spec-chat-body { display:flex;flex-direction:column;border-top:1px solid var(--mod-border-subtle); }
    .spec-chat-msgs { max-height:160px;overflow-y:auto;padding:8px 12px;display:flex;flex-direction:column;gap:6px; }
    .spec-chat-empty { font-size:12px;color:var(--mod-text-muted);text-align:center;padding:8px 0; }
    .spec-chat-msg { display:flex;align-items:baseline;gap:6px;font-size:13px;line-height:1.3; }
    .spec-chat-msg.mine .spec-chat-msg-name { color:var(--mod-cyan); }
    .spec-chat-msg-name { font-weight:700;font-size:11px;letter-spacing:0.5px;color:var(--mod-text-muted);white-space:nowrap;flex-shrink:0; }
    .spec-chat-msg-text { color:var(--mod-text-primary);word-break:break-word; }
    .spec-chat-report-btn { background:none;border:none;cursor:pointer;color:var(--mod-text-muted);font-size:10px;opacity:0.4;flex-shrink:0;padding:0 2px;line-height:1; }
    .spec-chat-report-btn:hover { opacity:0.9; }
    .spec-chat-input-row { display:flex;gap:6px;padding:8px 12px;border-top:1px solid var(--mod-border-subtle); }
    .spec-chat-input { flex:1;background:var(--mod-bg-control);border:1px solid var(--mod-border-primary);border-radius:20px;padding:7px 12px;font-size:13px;color:var(--mod-text-primary);outline:none; }
    .spec-chat-input:focus { border-color:var(--mod-border-secondary); }
    .spec-chat-send-btn { background:var(--mod-accent-muted);border:1px solid var(--mod-accent-border);color:var(--mod-accent-text);border-radius:20px;padding:7px 14px;font-size:14px;font-weight:700;cursor:pointer;flex-shrink:0; }
    .spec-chat-send-btn:disabled { opacity:0.4;cursor:default; }
    .spec-chat-login-prompt { padding:10px 12px;font-size:12px;color:var(--mod-text-muted);text-align:center; }
    .spec-chat-send-error { padding:4px 12px 8px;font-size:11px;color:var(--mod-magenta); }

    /* F-07: Pre-debate spectator share link */
    .pre-debate-share-row { display:flex;align-items:center;gap:10px;margin-top:12px;width:100%;max-width:360px;justify-content:center; }
    .pre-debate-share-btn { background:none;border:1px solid var(--mod-border-primary);border-radius:20px;padding:8px 18px;font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:1.5px;color:var(--mod-text-muted);cursor:pointer;text-transform:uppercase;transition:border-color 0.2s,color 0.2s; }
    .pre-debate-share-btn:active { border-color:var(--mod-cyan);color:var(--mod-cyan); }
    .pre-debate-share-confirm { font-size:11px;color:var(--mod-cyan);letter-spacing:1px;font-family:var(--mod-font-ui); }
  `;
  document.head.appendChild(style);
}
