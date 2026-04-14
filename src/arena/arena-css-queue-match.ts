/**
 * Arena CSS — queue screen (search ring, spinner, feed) + MATCH FOUND screen
 */

export function injectQueueMatchCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* QUEUE */
    .arena-queue { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px 20px; text-align: center; }
    .arena-queue-search-ring { position: relative; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
    .arena-queue-search-ring::before { content: ''; position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--mod-border-primary); border-top-color: var(--mod-accent); animation: queueSpin 1.5s linear infinite; }
    .arena-queue-search-ring::after { content: ''; position: absolute; inset: 6px; border-radius: 50%; border: 1px solid var(--mod-border-subtle); border-bottom-color: var(--mod-accent); animation: queueSpin 2.2s linear infinite reverse; }
    .arena-queue-search-ring.stopped::before, .arena-queue-search-ring.stopped::after { animation: none; border-color: var(--mod-border-subtle); }
    @keyframes queueSpin { to { transform: rotate(360deg); } }
    .arena-queue-icon { font-size: 48px; animation: queueBreathe 2.5s ease-in-out infinite; position: relative; z-index: 1; }
    @keyframes queueBreathe { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.7; } }
    .arena-queue-title { font-family: var(--mod-font-ui); font-size: 11px; font-weight: 600; letter-spacing: 3px; color: var(--mod-text-muted); text-transform: uppercase; margin-bottom: 6px; }
    .arena-queue-timer { font-family: var(--mod-font-ui); font-size: 48px; font-weight: 700; color: var(--mod-text-primary); letter-spacing: 4px; margin-bottom: 8px; }
    .arena-queue-status { font-size: 14px; color: var(--mod-text-body); margin-bottom: 16px; min-height: 20px; }
    .arena-queue-elo { font-size: 12px; color: var(--mod-text-muted); margin-bottom: 20px; }
    .arena-queue-cancel { padding: 12px 32px; border-radius: var(--mod-radius-pill); border: 1px solid var(--mod-border-primary); background: var(--mod-bg-card); color: var(--mod-text-muted); font-family: var(--mod-font-ui); font-size: 14px; cursor: pointer; min-height: 44px; min-width: 44px; letter-spacing: 1px; }
    .arena-queue-cancel:active { background: var(--mod-bg-card-active); }
    .arena-queue-ai-fallback { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid var(--mod-border-primary); border-radius: var(--mod-radius-card, 8px); background: var(--mod-bg-card); width: 100%; max-width: 300px; }
    .arena-queue-ai-fallback-text { font-size: 13px; color: var(--mod-text-body); line-height: 1.4; }
    .arena-queue-timeout-options { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 280px; margin-top: 8px; }
    .arena-queue-pop { font-size: 12px; color: var(--mod-text-muted); margin-bottom: 12px; letter-spacing: 0.5px; min-height: 16px; }
    .arena-queue-feed { width: 100%; max-width: 360px; margin-top: 12px; }
    .arena-queue-feed-label { font-family: var(--mod-font-ui); font-size: 10px; font-weight: 600; letter-spacing: 2px; color: var(--mod-text-muted); text-transform: uppercase; margin-bottom: 8px; text-align: left; }
    .arena-queue-feed .arena-card { margin-bottom: 8px; pointer-events: none; opacity: 0.85; }

    /* MATCH FOUND */
    .arena-match-found { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:40px 20px; text-align:center; }
    .arena-mf-label { font-family:var(--mod-font-display); font-size:20px; font-weight:700; color:var(--mod-accent); letter-spacing:3px; text-transform:uppercase; margin-bottom:24px; }
    .arena-mf-opponent { display:flex; flex-direction:column; align-items:center; gap:6px; margin-bottom:20px; }
    .arena-mf-avatar { width:72px; height:72px; border-radius:50%; border:3px solid var(--mod-accent); background:var(--mod-bg-card); font-family:var(--mod-font-ui); font-size:28px; font-weight:700; color:var(--mod-accent); display:flex; align-items:center; justify-content:center; }
    .arena-mf-name { font-family:var(--mod-font-ui); font-size:18px; font-weight:600; color:var(--mod-text-primary); }
    .arena-mf-elo { font-size:13px; color:var(--mod-text-muted); }
    .arena-mf-topic { font-size:14px; color:var(--mod-text-body); margin-bottom:20px; padding:8px 16px; border:1px solid var(--mod-border-subtle); border-radius:var(--mod-radius-card,8px); max-width:300px; }
    .arena-mf-countdown { font-family:var(--mod-font-ui); font-size:56px; font-weight:700; color:var(--mod-text-primary); margin-bottom:8px; }
    .arena-mf-status { font-size:14px; color:var(--mod-text-body); margin-bottom:20px; min-height:20px; }
    .arena-mf-buttons { display:flex; gap:12px; width:100%; max-width:300px; }
    .arena-mf-btn { flex:1; padding:14px 0; border-radius:var(--mod-radius-pill); font-family:var(--mod-font-ui); font-size:14px; font-weight:600; cursor:pointer; border:none; min-height:44px; letter-spacing:1px; }
    .arena-mf-btn.accept { background:var(--mod-accent); color:#fff; }
    .arena-mf-btn.accept:active { opacity:0.8; }
    .arena-mf-btn.decline { background:var(--mod-bg-card); color:var(--mod-text-muted); border:1px solid var(--mod-border-primary); }
    .arena-mf-btn.decline:active { background:var(--mod-bg-card-active); }
  `;
  document.head.appendChild(style);
}
