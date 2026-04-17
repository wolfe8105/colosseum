/**
 * Arena CSS — feed controls (input/send/actions), mod score row, pin button, score badges
 */

export function injectFeedControlsCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* Controls (bottom thumb zone) */
    .feed-controls { flex-shrink:0;padding:8px 12px calc(8px + env(safe-area-inset-bottom));border-top:1px solid var(--mod-border-subtle);background:var(--mod-bg-base); }
    .feed-input-row { display:flex;gap:8px;align-items:flex-end; }
    .feed-text-input { flex:1;padding:10px 14px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;outline:none;resize:none;min-height:40px; }
    .feed-text-input::placeholder { color:var(--mod-text-muted); }
    .feed-text-input:focus { border-color:var(--mod-accent-border); }
    .feed-text-input:disabled,
    .feed-input-frozen { opacity:0.4;background:var(--mod-bg-subtle);cursor:not-allowed; }
    .feed-send-btn { width:44px;height:44px;border-radius:50%;border:none;background:var(--mod-bar-accent);color:var(--mod-text-on-accent);font-size:18px;font-weight:700;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center; }
    .feed-send-btn:disabled { opacity:0.35;cursor:not-allowed; }
    .feed-send-btn:active:not(:disabled) { transform:scale(0.92); }
    .feed-action-row { display:flex;gap:8px;margin-top:8px; }
    .feed-action-btn { padding:10px 16px;border-radius:var(--mod-radius-pill);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);color:var(--mod-text-body);font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;min-height:var(--mod-touch-min); }
    .feed-action-btn:disabled { opacity:0.35;cursor:not-allowed; }
    .feed-finish-btn { border-color:var(--mod-accent-border);color:var(--mod-accent-text); }
    .feed-concede-btn { border-color:rgba(231,68,42,0.4);color:var(--mod-side-a); }

    /* Moderator score row */
    .feed-mod-score-row { display:flex;align-items:center;gap:6px;margin-top:8px;padding:8px;background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md); }
    .feed-score-prompt { font-size:12px;font-weight:600;color:var(--mod-text-muted);margin-right:4px; }
    .feed-score-btn { width:36px;height:36px;border-radius:50%;border:1px solid var(--mod-border-accent);background:var(--mod-accent-muted);color:var(--mod-accent-text);font-family:var(--mod-font-ui);font-size:14px;font-weight:700;cursor:pointer; }
    .feed-score-btn:active { background:var(--mod-bar-accent);color:var(--mod-text-on-accent); }
    .feed-score-btn-cancel { width:36px;height:36px;border-radius:50%;border:1px solid var(--mod-border-primary);background:none;color:var(--mod-text-muted);font-size:16px;cursor:pointer;margin-left:auto; }

    /* Phase 2: Pin button (mod-only, invisible to others) */
    .feed-pin-btn { position:absolute;top:4px;right:4px;width:24px;height:24px;border:none;background:none;color:var(--mod-text-muted);font-size:13px;cursor:pointer;opacity:0.4;transition:opacity 0.15s;padding:0;line-height:24px;text-align:center; }
    .feed-pin-btn:hover { opacity:1; }
    .feed-pin-btn.pinned { opacity:1;color:var(--mod-gold); }
    /* LANDMINE [LM-CSS-003]: position:relative declared here on .feed-evt-a/b couples feed-stream selectors to the pin-button feature. If stream rules are edited without moving this, pin positioning breaks. */
    .feed-evt-a, .feed-evt-b { position:relative; }
    .feed-evt-pinned { box-shadow:inset 0 0 0 1px rgba(194,154,88,0.4); }

    /* Phase 2: Score button budget badges */
    .feed-score-btn-wrap { position:relative;display:inline-flex; }
    .feed-score-badge { position:absolute;top:-6px;right:-6px;min-width:16px;height:16px;border-radius:8px;background:var(--mod-bar-accent);color:var(--mod-text-on-accent);font-family:var(--mod-font-ui);font-size:9px;font-weight:700;line-height:16px;text-align:center;padding:0 3px;pointer-events:none; }
    .feed-score-btn:disabled { opacity:0.2;cursor:not-allowed; }
    .feed-score-btn:disabled + .feed-score-badge { background:var(--mod-text-muted); }
  `;
  document.head.appendChild(style);
}
