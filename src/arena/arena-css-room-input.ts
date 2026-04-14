/**
 * Arena CSS — room input area (text, live audio mic, voice memo)
 */

export function injectRoomInputCSS(): void {
  const style = document.createElement('style');
  style.textContent = `
    /* INPUT AREA */
    .arena-input-area { padding: 10px 16px calc(10px + var(--safe-bottom)); border-top: 1px solid var(--mod-border-subtle); background: var(--mod-bg-base); backdrop-filter: blur(10px); flex-shrink: 0; }
    .arena-text-row { display: flex; gap: 8px; align-items: flex-end; }
    .arena-text-input { flex: 1; min-height: 44px; max-height: 120px; padding: 10px 14px; border-radius: var(--mod-radius-md); border: 1px solid var(--mod-border-primary); background: var(--mod-bg-card); color: var(--mod-text-primary); font-family: var(--mod-font-ui); font-size: 14px; resize: none; outline: none; }
    .arena-text-input::placeholder { color: var(--mod-text-muted); }
    .arena-text-input:focus { border-color: var(--mod-accent-border); }
    .arena-send-btn { width: 44px; height: 44px; border-radius: 50%; border: none; background: var(--mod-bar-accent); background-image: var(--mod-gloss); color: var(--mod-text-on-accent); font-size: 18px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .arena-send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .arena-send-btn:active:not(:disabled) { transform: scale(0.94); }
    .arena-char-count { font-size: 10px; color: var(--mod-text-muted); text-align: right; margin-top: 4px; }

    /* LIVE AUDIO CONTROLS */
    .arena-audio-controls { display: flex; align-items: center; justify-content: center; gap: 20px; padding: 8px 0; }
    .arena-mic-btn { width: 60px; height: 60px; border-radius: 50%; border: 2px solid var(--mod-accent); background: var(--mod-accent-muted); color: var(--mod-accent); font-size: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .arena-mic-btn.muted { border-color: var(--mod-text-muted); color: var(--mod-text-muted); background: var(--mod-bg-card); }
    .arena-mic-btn:active { transform: scale(0.94); }
    .arena-audio-status { font-size: 12px; color: var(--mod-text-muted); text-align: center; }
    .arena-waveform { width: 100%; height: 40px; border-radius: var(--mod-radius-md); background: var(--mod-bg-card); }

    /* VOICE MEMO CONTROLS */
    .arena-vm-controls { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 8px 0; }
    .arena-record-btn { width: 60px; height: 60px; border-radius: 50%; border: 3px solid var(--mod-bar-secondary); background: rgba(136,144,168,0.08); color: var(--mod-bar-secondary); font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .arena-record-btn.recording { border-color: var(--mod-accent); color: var(--mod-accent); background: var(--mod-accent-muted); animation: recordPulse 1.5s ease-in-out infinite; }
    @keyframes recordPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(231,68,42,0.3); } 50% { box-shadow: 0 0 0 12px rgba(231,68,42,0); } }
    .arena-vm-status { font-size: 12px; color: var(--mod-text-muted); }
    .arena-vm-timer { font-family: var(--mod-font-ui); font-size: 18px; color: var(--mod-text-primary); }
  `;
  document.head.appendChild(style);
}
