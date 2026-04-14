/**
 * Arena CSS — F-51 FEED ROOM: shell, header, topic, scoreboard, timer, spectator/audio bars
 */

export function injectFeedRoomCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* ===== F-51 FEED ROOM ===== */

    .feed-room { display:flex;flex-direction:column;height:100%;min-height:0;padding:0;position:relative; }

    /* Header: topic + scoreboard + spectators */
    .feed-header { flex-shrink:0;padding:12px 16px 8px;border-bottom:1px solid var(--mod-border-subtle); }
    .feed-topic { font-family:var(--mod-font-ui);font-size:13px;font-weight:600;color:var(--mod-text-primary);text-align:center;margin-bottom:10px;line-height:1.35; }
    .feed-scoreboard { display:flex;align-items:center;justify-content:space-between;gap:8px; }
    .feed-score-side { display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;flex:1; }
    .feed-score-name { font-family:var(--mod-font-ui);font-size:11px;font-weight:700;letter-spacing:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%; }
    .feed-side-a .feed-score-name { color:#E7442A; }
    .feed-side-b .feed-score-name { color:#4A90D9; }
    .feed-score-label { font-size:9px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--mod-text-muted); }
    .feed-score-pts { font-family:var(--mod-font-ui);font-size:20px;font-weight:800;color:var(--mod-text-primary); }
    .feed-timer-block { display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0; }
    .feed-timer { font-family:var(--mod-font-ui);font-size:24px;font-weight:800;color:var(--mod-text-primary);letter-spacing:2px; }
    .feed-timer.warning { color:#E7442A;animation:livePulse 0.8s ease-in-out infinite; }
    .feed-round-label { font-size:9px;font-weight:600;letter-spacing:2px;color:var(--mod-text-muted);text-transform:uppercase; }
    .feed-turn-label { font-size:11px;font-weight:600;color:var(--mod-bar-secondary);letter-spacing:1px; }
    .feed-spectator-bar { text-align:center;font-size:11px;color:var(--mod-text-muted);margin-top:6px; }
    .feed-spectator-bar .eye { font-size:13px; }
    .feed-audio-status { text-align:center;font-size:11px;padding:2px 0;color:var(--mod-text-muted);letter-spacing:1px;min-height:0; }
  `;
  document.head.appendChild(style);
}
