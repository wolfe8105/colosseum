/**
 * Arena CSS — debate room shell, header, VS bar, messages, AI typing indicator
 */

export function injectRoomCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* DEBATE ROOM */
    .arena-room { display: flex; flex-direction: column; height: 100%; }
    .arena-room-header { padding: 12px 16px; border-bottom: 1px solid var(--mod-border-subtle); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .arena-room-topic { font-family: var(--mod-font-ui); font-size: var(--mod-font-card-title-size); font-weight: var(--mod-font-card-title-weight); color: var(--mod-text-primary); letter-spacing: var(--mod-font-card-title-spacing); flex: 1; }
    .arena-room-round { font-size: 11px; color: var(--mod-accent); font-weight: 600; letter-spacing: 1px; }
    .arena-room-timer { font-family: var(--mod-font-ui); font-size: 22px; font-weight: 700; color: var(--mod-text-primary); letter-spacing: 2px; min-width: 60px; text-align: right; }
    .arena-room-timer.warning { color: var(--mod-accent); animation: timerPulse 1s ease-in-out infinite; }
    @keyframes timerPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

    /* VS BANNER */
    .arena-vs-bar { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px 16px; background: var(--mod-bg-card); flex-shrink: 0; }
    .arena-debater { display: flex; align-items: center; gap: 8px; }
    .arena-debater.right { flex-direction: row-reverse; }
    .arena-debater-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--mod-bar-secondary); background: var(--mod-bg-card); font-family: var(--mod-font-ui); font-size: 14px; font-weight: 700; color: var(--mod-bar-secondary); display: flex; align-items: center; justify-content: center; }
    .arena-debater-avatar.ai-avatar { border-color: var(--mod-status-open); color: var(--mod-status-open); }
    /* LANDMINE [LM-CSS-002]: empty rule preserved from source (.arena-debater-info { }) */
    .arena-debater-info { }
    .arena-debater-name { font-family: var(--mod-font-ui); font-size: 12px; font-weight: 600; letter-spacing: 1px; color: var(--mod-text-primary); }
    .arena-debater-elo { font-size: 10px; color: var(--mod-text-muted); }
    .arena-vs-text { font-family: var(--mod-font-ui); font-size: 16px; font-weight: 700; color: var(--mod-accent); letter-spacing: 2px; }

    /* MESSAGES AREA */
    .arena-messages { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
    .arena-msg { max-width: 85%; padding: 10px 14px; border-radius: var(--mod-radius-lg); font-size: 14px; line-height: 1.5; word-break: break-word; }
    .arena-msg.side-a { align-self: flex-start; background: var(--mod-accent-muted); border: 1px solid var(--mod-accent-border); color: var(--mod-text-primary); border-bottom-left-radius: var(--mod-radius-sm); }
    .arena-msg.side-b { align-self: flex-end; background: var(--mod-bg-subtle); border: 1px solid var(--mod-bg-subtle); color: var(--mod-text-primary); border-bottom-right-radius: var(--mod-radius-sm); }
    .arena-msg .msg-label { font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
    .arena-msg.side-a .msg-label { color: var(--mod-accent); }
    .arena-msg.side-b .msg-label { color: var(--mod-bar-secondary); }
    .arena-msg .msg-round { font-size: 10px; color: var(--mod-text-muted); margin-top: 4px; }
    .arena-msg.system { align-self: center; max-width: 90%; background: var(--mod-bg-card); border: 1px solid var(--mod-border-subtle); color: var(--mod-text-muted); font-size: 12px; text-align: center; border-radius: var(--mod-radius-md); }

    /* AI TYPING INDICATOR */
    .arena-typing { align-self: flex-end; padding: 10px 18px; background: var(--mod-bg-subtle); border: 1px solid var(--mod-bg-subtle); border-radius: var(--mod-radius-lg); border-bottom-right-radius: var(--mod-radius-sm); display: flex; gap: 4px; }
    .arena-typing .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--mod-bar-secondary); animation: typingDot 1.4s ease-in-out infinite; }
    .arena-typing .dot:nth-child(2) { animation-delay: 0.2s; }
    .arena-typing .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typingDot { 0%,60%,100% { opacity: 0.3; transform: scale(1); } 30% { opacity: 1; transform: scale(1.2); } }
  `;
  document.head.appendChild(style);
}
