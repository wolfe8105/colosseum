/**
 * Arena CSS — Feed phase 4 & 5 features:
 *   Deepgram STT indicators, ad break overlay, sentiment gauge,
 *   spectator vote tip strip, vote gate, disconnect banner/event,
 *   mod action buttons, nulled post-debate
 *
 * LANDMINE [LM-CSS-004]: This file references @keyframes livePulse (e.g. via other
 * feed elements) and relies on it existing in a global stylesheet or sibling module
 * (likely modifiers.ts). If livePulse is ever removed, multiple pulse animations
 * across the arena silently stop animating. Verify before deletion.
 */

export function injectFeedPhase4_5CSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* SESSION 238: Phase 4 — Deepgram STT indicators */
    .feed-interim-transcript { padding:4px 12px;font-size:12px;color:var(--mod-text-muted);font-style:italic;min-height:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis; }
    .feed-deepgram-status { text-align:center;font-size:11px;padding:4px 0;color:var(--mod-text-muted);letter-spacing:1px; }

    /* Phase 5 — Ad break overlay */
    .feed-ad-overlay {
      position:absolute;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.92);
      display:flex;align-items:center;justify-content:center;
      z-index:50;
      animation:feedAdFadeIn 0.3s ease;
    }
    @keyframes feedAdFadeIn { from{opacity:0} to{opacity:1} }
    .feed-ad-inner { text-align:center;width:100%;max-width:400px;padding:24px 16px; }
    .feed-ad-label {
      font-family:var(--mod-font-display);font-size:18px;letter-spacing:4px;
      color:var(--mod-accent-cyan);margin-bottom:8px;
    }
    .feed-ad-countdown { font-size:14px;color:var(--mod-text-muted);margin-bottom:24px; }
    .feed-ad-slot { min-height:250px;display:flex;align-items:center;justify-content:center; }
    .feed-ad-placeholder {
      width:300px;height:250px;
      border:1px dashed rgba(255,255,255,0.15);border-radius:8px;
      display:flex;align-items:center;justify-content:center;
      color:rgba(255,255,255,0.2);font-size:24px;letter-spacing:6px;
      font-family:var(--mod-font-display);
    }

    /* Phase 5 — Sentiment gauge */
    .feed-sentiment-gauge {
      display:flex;height:6px;border-radius:3px;overflow:hidden;
      margin:4px 12px 0;background:rgba(255,255,255,0.05);
    }
    .feed-sentiment-fill-a {
      background:var(--mod-accent-cyan);transition:width 0.6s ease;height:100%;
    }
    .feed-sentiment-fill-b {
      background:var(--mod-accent-magenta);transition:width 0.6s ease;height:100%;
    }

    /* Phase 5 — Spectator vote controls */
    /* F-58 — Sentiment Tip Strip */
    .feed-spectator-controls { padding:10px 12px; }
    .feed-tip-label {
      font-family:var(--mod-font-display);font-size:11px;letter-spacing:2px;
      color:var(--mod-text-muted);text-align:center;margin-bottom:8px;
    }
    .feed-tip-row {
      display:flex;align-items:center;gap:6px;margin-bottom:6px;
    }
    .feed-tip-side-label {
      font-family:var(--mod-font-display);font-size:11px;letter-spacing:1px;
      min-width:56px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      flex-shrink:0;
    }
    .feed-tip-label-a { color:var(--mod-accent-cyan); }
    .feed-tip-label-b { color:var(--mod-accent-magenta); }
    .feed-tip-btn {
      flex:1;padding:10px 4px;border-radius:6px;
      font-family:var(--mod-font-display);font-size:13px;font-weight:700;
      border:1px solid transparent;cursor:pointer;min-height:44px;
      transition:opacity 0.15s, transform 0.1s, background 0.15s;
    }
    .feed-tip-btn:disabled { opacity:0.35;cursor:default; }
    .feed-tip-btn:not(:disabled):active { transform:scale(0.94); }
    .feed-tip-btn-a {
      background:rgba(0,224,255,0.12);color:var(--mod-accent-cyan);
      border-color:rgba(0,224,255,0.25);
    }
    .feed-tip-btn-a:not(:disabled):hover {
      background:rgba(0,224,255,0.22);border-color:var(--mod-accent-cyan);
    }
    .feed-tip-btn-b {
      background:rgba(204,41,54,0.12);color:var(--mod-accent-magenta);
      border-color:rgba(204,41,54,0.25);
    }
    .feed-tip-btn-b:not(:disabled):hover {
      background:rgba(204,41,54,0.22);border-color:var(--mod-accent-magenta);
    }
    .feed-tip-status {
      font-size:11px;color:var(--mod-text-muted);text-align:center;
      margin-top:4px;letter-spacing:1px;min-height:16px;
    }

    /* Phase 5 — Vote gate overlay */
    .feed-vote-gate {
      position:absolute;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.95);
      display:flex;align-items:center;justify-content:center;
      z-index:60;animation:feedAdFadeIn 0.3s ease;
    }
    .feed-vote-gate-inner { text-align:center;width:100%;max-width:400px;padding:24px 16px; }
    .feed-vote-gate-title {
      font-family:var(--mod-font-display);font-size:20px;letter-spacing:4px;
      color:var(--mod-accent-orange);margin-bottom:8px;
    }
    .feed-vote-gate-sub { font-size:14px;color:var(--mod-text-muted);margin-bottom:24px; }
    .feed-vote-gate-row { display:flex;gap:16px;justify-content:center;margin-bottom:16px; }
    .feed-vote-gate-timer { font-size:13px;color:var(--mod-text-muted); }

    /* Phase 5 — Disconnect banner */
    .feed-disconnect-banner {
      background:#b71c1c; /* TODO: needs CSS var token */ color:var(--mod-text-on-accent);text-align:center;padding:10px 16px;
      font-size:14px;font-weight:600;letter-spacing:0.5px;
      animation:feedDisconnectPulse 1.5s ease-in-out infinite;
    }
    @keyframes feedDisconnectPulse {
      0%,100%{opacity:1} 50%{opacity:0.7}
    }

    /* Phase 5 — Disconnect feed event */
    .feed-evt-disconnect {
      background:rgba(183,28,28,0.15);border-left:3px solid #b71c1c; /* TODO: needs CSS var token */
      padding:8px 12px;margin:4px 0;border-radius:4px;
      color:#ef9a9a; /* TODO: needs CSS var token */ font-size:13px;
    }
    .feed-disconnect-icon { margin-right:6px; }

    /* Phase 5 — Mod action buttons (eject/null) */
    .feed-mod-action-row {
      display:flex;gap:8px;margin-top:8px;justify-content:flex-end;
    }
    .feed-mod-action-btn {
      background:transparent;border:1px solid rgba(183,28,28,0.5);color:#ef9a9a; /* TODO: needs CSS var token */
      font-size:11px;padding:4px 10px;border-radius:4px;cursor:pointer;
      text-transform:uppercase;letter-spacing:0.5px;
      transition:background 0.2s,border-color 0.2s;
    }
    .feed-mod-action-btn:hover { background:rgba(183,28,28,0.2);border-color:#b71c1c; /* TODO: needs CSS var token */ }
    .feed-mod-action-btn:active { background:rgba(183,28,28,0.35); }

    /* Phase 5 — Nulled post-debate screen */
    .arena-null-reason {
      font-size:14px;color:var(--mod-text-muted);margin-top:8px;
      text-align:center;font-style:italic;
    }
  `;
  document.head.appendChild(style);
}
