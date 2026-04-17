/**
 * Arena CSS — feed stream events (side a/b/mod, points, dividers, system)
 */

export function injectFeedStreamCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* Feed stream (center) */
    .feed-stream { flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 12px;display:flex;flex-direction:column;gap:6px;min-height:0; }
    .feed-evt { padding:6px 10px;border-radius:var(--mod-radius-md);font-size:14px;line-height:1.4;word-break:break-word;max-width:92%; }
    .feed-evt-a { background:rgba(231,68,42,0.08);border-left:3px solid var(--mod-side-a); align-self:flex-start; }
    .feed-evt-b { background:rgba(74,144,217,0.08);border-left:3px solid var(--mod-side-b); align-self:flex-start; }
    .feed-evt-mod { background:rgba(194,154,88,0.10);border-left:3px solid var(--mod-gold); align-self:flex-start; }
    .feed-evt-name { font-size:11px;font-weight:700;letter-spacing:1px;display:block;margin-bottom:2px; }
    .feed-evt-a .feed-evt-name { color:var(--mod-side-a); }
    .feed-evt-b .feed-evt-name { color:var(--mod-side-b); }
    .feed-evt-mod .feed-evt-name { color:var(--mod-gold); }
    .feed-evt-text { color:var(--mod-text-primary); }
    .feed-evt-points { text-align:center;align-self:center;max-width:100%; }
    .feed-points-badge { display:inline-block;padding:4px 12px;border-radius:var(--mod-radius-pill);background:rgba(194,154,88,0.15);border:1px solid rgba(194,154,88,0.3);color:var(--mod-gold); font-family:var(--mod-font-ui);font-size:12px;font-weight:700;letter-spacing:1px; }
    .feed-evt-divider { text-align:center;align-self:center;max-width:100%;padding:8px 0; }
    .feed-divider-text { font-family:var(--mod-font-ui);font-size:10px;font-weight:600;letter-spacing:3px;color:var(--mod-text-muted);text-transform:uppercase; }
    .feed-evt-system { text-align:center;align-self:center;font-size:12px;color:var(--mod-text-muted);font-style:italic;padding:4px 8px; }
    .feed-evt-selected { outline:2px solid var(--mod-bar-secondary);outline-offset:2px;border-radius:var(--mod-radius-md); }
  `;
  document.head.appendChild(style);
}
