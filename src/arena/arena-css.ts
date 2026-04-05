/**
 * Arena CSS — injects all arena styles into <head>
 */

import { cssInjected, set_cssInjected } from './arena-state.ts';

export function injectCSS(): void {
  if (cssInjected) return;
  set_cssInjected(true);
  const style = document.createElement('style');
  style.textContent = `
    /* ===== ARENA STYLES — Session 158 LCARS reskin ===== */

    /* LOBBY */
    .arena-lobby { padding: var(--mod-space-lg); padding-bottom: 80px; }
    .arena-hero { padding: var(--mod-space-xl) var(--mod-space-lg) var(--mod-space-lg); }
    .arena-hero-title { font-family: var(--mod-font-ui); font-size: 11px; font-weight: 600; letter-spacing: 3px; color: var(--mod-text-muted); text-transform: uppercase; margin-bottom: var(--mod-space-xs); }
    .arena-hero-sub { font-size: 13px; color: var(--mod-text-body); margin-bottom: var(--mod-space-lg); line-height: 1.5; }
    .arena-stat-row { display: flex; gap: var(--mod-space-sm); margin-bottom: var(--mod-space-lg); }
    .arena-stat { flex: 1; background: var(--mod-stat-bg); border: 1px solid var(--mod-stat-border); border-radius: var(--mod-radius-md); padding: var(--mod-space-md); text-align: center; }
    .arena-stat-value { font-family: var(--mod-font-ui); font-size: var(--mod-font-stat-size); font-weight: var(--mod-font-stat-weight); color: var(--mod-stat-value); }
    .arena-stat-label { font-size: var(--mod-font-stat-label-size); font-weight: var(--mod-font-stat-label-weight); letter-spacing: var(--mod-font-stat-label-spacing); color: var(--mod-stat-label); text-transform: uppercase; margin-top: 2px; }
    .arena-stat.accent { background: var(--mod-stat-accent-bg); border-color: var(--mod-stat-accent-border); }
    .arena-stat.accent .arena-stat-value { color: var(--mod-stat-accent-value); }
    .arena-stat.accent .arena-stat-label { color: var(--mod-stat-accent-label); }
    .arena-enter-btn { display: flex; align-items: center; justify-content: center; width: 100%; padding: 14px; border-radius: var(--mod-radius-pill); border: none; background: var(--mod-bar-accent); background-image: var(--mod-gloss); color: var(--mod-text-on-accent); font-family: var(--mod-font-ui); font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; min-height: var(--mod-touch-min); -webkit-tap-highlight-color: transparent; transition: background-color 0.1s; }
    .arena-enter-btn:active { background-color: var(--mod-accent-hover); }
    .arena-enter-btn .btn-pulse { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.6); animation: livePulse 1.5s ease-in-out infinite; margin-right: 8px; }
    .arena-btn-row { display: flex; gap: var(--mod-space-sm); margin-top: var(--mod-space-sm); }
    .arena-secondary-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; border-radius: var(--mod-radius-pill); border: 1px solid var(--mod-border-primary); background: var(--mod-bg-card); color: var(--mod-text-body); font-family: var(--mod-font-ui); font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; min-height: var(--mod-touch-min); -webkit-tap-highlight-color: transparent; }
    .arena-secondary-btn:active { background: var(--mod-bg-card-active); }

    /* SECTION HEADERS */
    .arena-section { margin-top: var(--mod-space-xl); }
    .arena-section-title { font-family: var(--mod-font-ui); font-size: 7px; font-weight: 600; letter-spacing: 1px; color: var(--mod-text-muted); text-transform: uppercase; margin-bottom: var(--mod-space-sm); display: flex; align-items: center; gap: 6px; }
    .arena-section-title .section-dot { width: 5px; height: 5px; border-radius: 50%; }
    .arena-section-title .live-dot { background: var(--mod-status-live); animation: livePulse 1.5s ease-in-out infinite; }
    .arena-section-title .gold-dot { background: var(--mod-bar-secondary); }

    /* DEBATE CARDS (lobby) */
    .arena-card { background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); border-left: var(--mod-card-bar-width) solid var(--mod-bar-secondary); border-radius: var(--mod-radius-md); padding: var(--mod-space-md) var(--mod-space-lg); margin-bottom: var(--mod-space-sm); cursor: pointer; transition: background var(--mod-transition-fast); -webkit-tap-highlight-color: transparent; }
    .arena-card:active { background: var(--mod-bg-card-hover); }
    .arena-card.card-live { border-left-color: var(--mod-status-live); }
    .arena-card.card-ai { border-left-color: var(--mod-status-open); }
    .arena-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .arena-card-badge { font-family: var(--mod-font-ui); font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; padding: 2px 8px; border-radius: var(--mod-radius-pill); }
    .arena-card-badge.live { background: var(--mod-status-live-bg); color: var(--mod-status-live); border: 1px solid var(--mod-accent-border); }
    .arena-card-badge.verdict { background: var(--mod-status-waiting-bg); color: var(--mod-text-sub); border: 1px solid var(--mod-border-secondary); }
    .arena-card-badge.ai { background: var(--mod-status-open-bg); color: var(--mod-status-open); border: 1px solid rgba(93,202,165,0.2); }
    .arena-card-badge.text { background: var(--mod-status-waiting-bg); color: var(--mod-text-sub); border: 1px solid var(--mod-border-secondary); }
    .arena-card-meta { font-size: 10px; color: var(--mod-text-muted); }
    .arena-card-topic { font-family: var(--mod-font-ui); font-size: var(--mod-font-card-title-size); font-weight: var(--mod-font-card-title-weight); color: var(--mod-text-primary); letter-spacing: var(--mod-font-card-title-spacing); line-height: 1.35; margin-bottom: 6px; }
    .arena-card-vs { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--mod-text-muted); }
    .arena-card-vs .vs { color: var(--mod-accent); font-family: var(--mod-font-ui); font-weight: 700; letter-spacing: 1px; font-size: 10px; }
    .arena-card-score { font-family: var(--mod-font-ui); font-weight: 700; color: var(--mod-text-sub); }
    .arena-card-action { display: flex; justify-content: flex-end; margin-top: var(--mod-space-sm); }
    .arena-card-btn { padding: 6px 14px; border-radius: var(--mod-radius-pill); border: 1px solid var(--mod-border-accent); background: var(--mod-accent-muted); color: var(--mod-accent-text); font-family: var(--mod-font-ui); font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; }
    .arena-card-btn:active { background: rgba(231,68,42,0.2); }

    /* CHALLENGE FLOW */
    .arena-challenge-cta { background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); border-left: var(--mod-card-bar-width) solid var(--mod-bar-accent); border-radius: var(--mod-radius-md); padding: var(--mod-space-lg); text-align: center; cursor: pointer; transition: background var(--mod-transition-fast); }
    .arena-challenge-cta:active { background: var(--mod-bg-card-hover); }
    .arena-challenge-icon { font-size: 24px; margin-bottom: 4px; }
    .arena-challenge-text { font-family: var(--mod-font-ui); font-size: 11px; font-weight: 600; letter-spacing: 2px; color: var(--mod-accent-text); text-transform: uppercase; }
    .arena-challenge-sub { font-size: 11px; color: var(--mod-text-muted); margin-top: 4px; }

    /* EMPTY STATE */
    .arena-empty { text-align: center; padding: var(--mod-space-2xl) var(--mod-space-lg); color: var(--mod-text-muted); font-size: 13px; }
    .arena-empty .empty-icon { font-size: 32px; margin-bottom: var(--mod-space-sm); display: block; opacity: 0.5; }

    /* MODE SELECT OVERLAY */
    .arena-mode-overlay { position: fixed; inset: 0; z-index: 250; display: flex; flex-direction: column; justify-content: flex-end; }
    .arena-mode-backdrop { position: absolute; inset: 0; background: var(--mod-bg-overlay); }
    .arena-mode-sheet { position: relative; background: var(--mod-bg-base); border-top: 1px solid var(--mod-border-primary); border-radius: 20px 20px 0 0; padding: 20px 16px calc(20px + var(--safe-bottom)); max-height: 85vh; overflow-y: auto; transform: translateY(0); animation: sheetSlideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
    @keyframes sheetSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .arena-mode-handle { width: 36px; height: 4px; border-radius: 2px; background: var(--mod-border-secondary); margin: 0 auto 16px; }
    .arena-mode-title { font-family: var(--mod-font-ui); font-size: 11px; font-weight: 600; letter-spacing: 3px; color: var(--mod-text-muted); text-transform: uppercase; text-align: center; margin-bottom: 4px; }
    .arena-mode-subtitle { font-size: 13px; color: var(--mod-text-body); text-align: center; margin-bottom: 16px; }

    /* MODE CARDS */
    .arena-mode-card { background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); border-left: var(--mod-card-bar-width) solid var(--mod-bar-secondary); border-radius: var(--mod-radius-md); padding: 16px; margin-bottom: 10px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: background var(--mod-transition-fast); -webkit-tap-highlight-color: transparent; }
    .arena-mode-card:active { background: var(--mod-bg-card-hover); }
    .arena-mode-icon { width: 50px; height: 50px; border-radius: var(--mod-radius-md); display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
    .arena-mode-info { flex: 1; }
    .arena-mode-name { font-family: var(--mod-font-ui); font-size: var(--mod-font-card-title-size); font-weight: var(--mod-font-card-title-weight); letter-spacing: var(--mod-font-card-title-spacing); color: var(--mod-text-primary); }
    .arena-mode-desc { font-size: 12px; color: var(--mod-text-body); margin-top: 2px; }
    .arena-mode-avail { font-size: 11px; margin-top: 4px; font-weight: 600; }
    .arena-mode-arrow { color: var(--mod-text-muted); font-size: 18px; }
    .arena-mode-cancel { display: block; width: 100%; padding: 14px; border: 1px solid var(--mod-border-primary); background: none; border-radius: var(--mod-radius-md); color: var(--mod-text-muted); font-family: var(--mod-font-ui); font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 4px; }

    /* TOPIC INPUT */
    .arena-topic-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--mod-border-subtle); }
    .arena-topic-label { font-size: 11px; color: var(--mod-text-muted); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px; font-family: var(--mod-font-ui); }
    .arena-topic-input { width: 100%; padding: 10px 14px; border-radius: var(--mod-radius-md); border: 1px solid var(--mod-border-primary); background: var(--mod-bg-card); color: var(--mod-text-primary); font-family: var(--mod-font-ui); font-size: 14px; outline: none; }
    .arena-topic-input::placeholder { color: var(--mod-text-muted); }
    .arena-topic-input:focus { border-color: var(--mod-accent-border); }

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

    /* POST-DEBATE */
    .arena-post { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 32px 20px; text-align: center; }
    .arena-post-verdict { font-size: 48px; margin-bottom: 12px; }
    .arena-post-title { font-family: var(--mod-font-ui); font-size: 11px; font-weight: 600; letter-spacing: 3px; color: var(--mod-text-muted); text-transform: uppercase; margin-bottom: 8px; }
    .arena-post-topic { font-size: 14px; color: var(--mod-text-body); margin-bottom: 20px; }
    .arena-post-score { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .arena-post-side { text-align: center; }
    .arena-post-side-label { font-size: 11px; color: var(--mod-text-muted); letter-spacing: 1px; margin-bottom: 4px; }
    .arena-clickable-opp { color: var(--mod-accent); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
    .arena-post-side-score { font-family: var(--mod-font-ui); font-size: 32px; font-weight: 700; }
    .arena-post-side-score.winner { color: var(--mod-accent); }
    .arena-post-side-score.loser { color: var(--mod-text-muted); }
    .arena-post-divider { font-family: var(--mod-font-ui); font-size: 14px; color: var(--mod-text-muted); letter-spacing: 1px; }
    .arena-post-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
    .arena-post-btn { padding: 12px 24px; border-radius: var(--mod-radius-pill); border: none; font-family: var(--mod-font-ui); font-size: 12px; font-weight: 600; letter-spacing: 1.5px; cursor: pointer; text-transform: uppercase; }
    .arena-post-btn.primary { background: var(--mod-bar-accent); background-image: var(--mod-gloss); color: var(--mod-text-on-accent); }
    .arena-post-btn.secondary { background: none; border: 1px solid var(--mod-border-primary); color: var(--mod-text-body); }
    .arena-post-btn:active { transform: scale(0.96); }

    /* AI JUDGING STATE */
    .arena-judging { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px 20px; text-align: center; }
    .arena-judging-icon { font-size: 56px; margin-bottom: 16px; animation: arenaJudgePulse 2s ease-in-out infinite; }
    .arena-judging-text { font-family: var(--mod-font-ui); font-size: 13px; font-weight: 600; letter-spacing: 3px; color: var(--mod-text-body); text-transform: uppercase; margin-bottom: 8px; }
    .arena-judging-sub { font-size: 12px; color: var(--mod-text-muted); margin-bottom: 20px; }
    @keyframes arenaJudgePulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }

    /* AI SCORECARD */
    .ai-scorecard { width: 100%; max-width: 380px; margin: 0 auto 20px; text-align: left; }
    .ai-scorecard-header { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px; padding: 12px 16px; border-radius: var(--mod-radius-md); background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); }
    .ai-scorecard-side { text-align: center; min-width: 80px; }
    .ai-scorecard-name { font-size: 11px; color: var(--mod-text-muted); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
    .ai-scorecard-total { font-family: var(--mod-font-ui); font-size: 28px; font-weight: 700; }
    .ai-scorecard-total.winner { color: var(--mod-accent); }
    .ai-scorecard-total.loser { color: var(--mod-text-muted); }
    .ai-scorecard-vs { font-family: var(--mod-font-ui); font-size: 11px; color: var(--mod-text-muted); letter-spacing: 2px; }
    .ai-scorecard-breakdown { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
    .ai-score-criterion { padding: 10px 14px; border-radius: var(--mod-radius-md); background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); }
    .ai-score-criterion-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .ai-score-criterion-label { font-size: 12px; font-weight: 600; color: var(--mod-text-body); letter-spacing: 0.5px; }
    .ai-score-criterion-nums { font-family: var(--mod-font-ui); font-size: 13px; font-weight: 700; color: var(--mod-text-muted); }
    .ai-score-bars { display: flex; flex-direction: column; gap: 3px; margin-bottom: 6px; }
    .ai-score-bar { height: 6px; border-radius: 3px; min-width: 4px; transition: width 0.8s ease; }
    .ai-score-bar.mine { background: var(--mod-accent); }
    .ai-score-bar.theirs { background: var(--mod-bar-secondary); opacity: 0.5; }
    .ai-score-reason { font-size: 11px; color: var(--mod-text-muted); line-height: 1.4; font-style: italic; }
    .ai-scorecard-verdict { text-align: center; font-size: 13px; color: var(--mod-text-body); font-weight: 500; padding: 10px 16px; border-radius: var(--mod-radius-md); background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); line-height: 1.4; }

    /* SPECTATOR COUNT */
    .arena-spectator-bar { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px; font-size: 11px; color: var(--mod-text-muted); }
    .arena-spectator-bar .eye { font-size: 13px; }

    /* BACK BUTTON */
    .arena-back-btn { position: absolute; top: 12px; left: 12px; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--mod-border-primary); background: var(--mod-bg-base); color: var(--mod-text-muted); font-size: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; }
    .arena-back-btn:active { background: var(--mod-bg-card-active); }

    /* UTILITY */
    .arena-fade-in { animation: arenaFadeIn 0.3s ease; }
    @keyframes arenaFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .arena-hidden { display: none !important; }

    /* SESSION 39: MODERATOR UI */

    /* Reference submit button */
    .arena-ref-btn { display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-bg-subtle);background:var(--mod-bg-subtle);color:var(--mod-bar-secondary);font-size:11px;font-weight:600;letter-spacing:1px;cursor:pointer;margin-left:8px;white-space:nowrap; }
    .arena-ref-btn:active { background:var(--mod-bg-subtle); }

    /* Reference submit form (inline under messages) */
    .arena-ref-form { padding:10px 16px;border-top:1px solid var(--mod-border-subtle);background:var(--mod-bg-card); }
    .arena-ref-form input, .arena-ref-form textarea { width:100%;padding:8px 12px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-base);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:13px;outline:none;margin-bottom:6px; }
    .arena-ref-form input:focus, .arena-ref-form textarea:focus { border-color:var(--mod-accent-border); }
    .arena-ref-form textarea { resize:none;min-height:44px; }
    .arena-ref-side-row { display:flex;gap:6px;margin-bottom:8px; }
    .arena-ref-side-btn { flex:1;padding:8px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:none;color:var(--mod-text-muted);font-size:12px;font-weight:600;cursor:pointer;text-align:center; }
    .arena-ref-side-btn.active { border-color:var(--mod-accent-border);color:var(--mod-accent);background:var(--mod-accent-muted); }
    .arena-ref-actions { display:flex;gap:8px; }
    .arena-ref-submit { flex:1;padding:8px;border-radius:var(--mod-radius-md);border:none;background:var(--mod-bg-subtle);color:var(--mod-bar-secondary);font-size:12px;font-weight:600;letter-spacing:1px;cursor:pointer; }
    .arena-ref-submit:active { background:var(--mod-bg-subtle); }
    .arena-ref-cancel { padding:8px 14px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-subtle);background:none;color:var(--mod-text-muted);font-size:12px;cursor:pointer; }

    /* Moderator ruling panel (bottom sheet) */

    /* Ranked / Casual picker */
    .arena-rank-overlay { position: fixed; inset: 0; z-index: 250; display: flex; flex-direction: column; justify-content: flex-end; }
    .arena-rank-backdrop { position: absolute; inset: 0; background: var(--mod-bg-overlay); }
    .arena-rank-sheet { position: relative; background: var(--mod-bg-base); border-top: 1px solid var(--mod-border-primary); border-radius: 20px 20px 0 0; padding: 20px 16px calc(20px + var(--safe-bottom)); max-height: 70vh; overflow-y: auto; animation: sheetSlideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
    .arena-rank-title { font-family: var(--mod-font-ui); font-size: 11px; font-weight: 600; letter-spacing: 3px; color: var(--mod-text-muted); text-transform: uppercase; text-align: center; margin-bottom: 4px; }
    .arena-rank-subtitle { font-size: 13px; color: var(--mod-text-body); text-align: center; margin-bottom: 16px; }
    .arena-rank-card { background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); border-radius: var(--mod-radius-md); padding: 18px 16px; margin-bottom: 12px; cursor: pointer; transition: background var(--mod-transition-fast); -webkit-tap-highlight-color: transparent; }
    .arena-rank-card:active { background: var(--mod-bg-card-hover); }
    .arena-rank-card.casual { border-left: var(--mod-card-bar-width) solid var(--mod-bar-primary); }
    .arena-rank-card.ranked { border-left: var(--mod-card-bar-width) solid var(--mod-bar-accent); }
    .arena-rank-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .arena-rank-card-icon { font-size: 22px; }
    .arena-rank-card-name { font-family: var(--mod-font-ui); font-size: var(--mod-font-card-title-size); font-weight: var(--mod-font-card-title-weight); letter-spacing: var(--mod-font-card-title-spacing); color: var(--mod-text-primary); }
    .arena-rank-card-desc { font-size: 12px; color: var(--mod-text-body); line-height: 1.5; }
    .arena-rank-card-badge { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 1px; padding: 2px 8px; border-radius: var(--mod-radius-pill); margin-top: 8px; }
    .arena-rank-card.casual .arena-rank-card-badge { background: var(--mod-bg-subtle); color: var(--mod-bar-primary); }
    .arena-rank-card.ranked .arena-rank-card-badge { background: var(--mod-accent-muted); color: var(--mod-accent); }
    .arena-rank-cancel { display: block; width: 100%; padding: 14px; border: 1px solid var(--mod-border-primary); background: none; border-radius: var(--mod-radius-md); color: var(--mod-text-muted); font-family: var(--mod-font-ui); font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 4px; }

    /* Ranked/Casual badge in queue + post-debate */
    .arena-rank-badge { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 3px 10px; border-radius: var(--mod-radius-pill); margin-bottom: 8px; }
    .arena-rank-badge.casual { background: var(--mod-bg-subtle); color: var(--mod-bar-primary); }
    .arena-rank-badge.ranked { background: var(--mod-accent-muted); color: var(--mod-accent); }
    .arena-elo-change { font-size: 14px; font-weight: 700; margin-top: 8px; letter-spacing: 1px; }
    .arena-elo-change.positive { color: var(--mod-status-open); }
    .arena-elo-change.negative { color: var(--mod-accent); }
    .arena-elo-change.neutral { color: var(--mod-text-muted); }
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

    /* SESSION 110: Pre-debate screen */
    .arena-pre-debate { display:flex;flex-direction:column;align-items:center;padding:20px 16px;padding-bottom:80px;overflow-y:auto;height:100%; }
    .arena-pre-debate-title { font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:3px;color:var(--mod-text-muted);text-transform:uppercase;margin-bottom:4px;text-align:center; }
    .arena-pre-debate-sub { font-size:13px;color:var(--mod-text-body);text-align:center;margin-bottom:16px; }
    .arena-pre-debate-enter { display:inline-flex;align-items:center;gap:8px;padding:14px 40px;border-radius:var(--mod-radius-pill);border:none;background:var(--mod-bar-accent);background-image:var(--mod-gloss);color:var(--mod-text-on-accent);font-family:var(--mod-font-ui);font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;cursor:pointer;margin-top:16px; }
    .arena-pre-debate-enter:active { transform:scale(0.96); }

    /* SESSION 110: Staking results in post-debate */
    .arena-staking-result { background:var(--mod-accent-muted);border:1px solid var(--mod-accent-border);border-radius:var(--mod-radius-md);padding:14px 20px;margin:12px 0;text-align:center;max-width:300px;width:100%; }
    .arena-staking-result-title { font-family:var(--mod-font-ui);font-size:7px;font-weight:600;letter-spacing:1px;color:var(--mod-text-muted);text-transform:uppercase;margin-bottom:6px; }
    .arena-staking-result-amount { font-family:var(--mod-font-ui);font-size:24px;font-weight:700;letter-spacing:1px; }
    .arena-staking-result-amount.won { color:var(--mod-status-open); }
    .arena-staking-result-amount.lost { color:var(--mod-accent); }
    .arena-staking-result-amount.none { color:var(--mod-text-muted); }
    .arena-staking-result-detail { font-size:11px;color:var(--mod-text-muted);margin-top:4px; }

    /* Moderator assignment picker */
    .mod-picker-section { margin-top:12px;padding-top:12px;border-top:1px solid var(--mod-border-subtle); }
    .mod-picker-label { font-size:11px;color:var(--mod-text-muted);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;font-family:var(--mod-font-ui); }
    .mod-picker-opts { display:flex;flex-direction:column;gap:6px; }
    .mod-picker-opt { display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);cursor:pointer; }
    .mod-picker-opt:active { background:var(--mod-bg-card-active); }
    .mod-picker-opt.selected { border-color:var(--mod-accent-border);background:var(--mod-accent-muted); }
    .mod-picker-avatar { width:32px;height:32px;border-radius:50%;border:2px solid var(--mod-bar-secondary);background:var(--mod-bg-base);color:var(--mod-bar-secondary);font-family:var(--mod-font-ui);font-size:13px;display:flex;align-items:center;justify-content:center; }
    .mod-picker-info { flex:1; }
    .mod-picker-name { font-size:13px;font-weight:600;color:var(--mod-text-primary); }
    .mod-picker-stats { font-size:10px;color:var(--mod-text-muted); }
    .mod-picker-check { width:18px;height:18px;border-radius:50%;border:2px solid var(--mod-text-muted);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--mod-accent); }
    .mod-picker-opt.selected .mod-picker-check { border-color:var(--mod-accent);background:var(--mod-accent-muted); }

    /* Moderator badge in VS bar */
    .arena-mod-bar { display:flex;align-items:center;justify-content:center;gap:6px;padding:4px;font-size:11px;color:var(--mod-bar-secondary);border-bottom:1px solid var(--mod-border-subtle); }
    .arena-mod-bar .mod-icon { font-size:12px; }

    /* Post-debate mod scoring */
    .mod-score-section { margin-top:16px;width:100%;max-width:320px; }
    .mod-score-title { font-family:var(--mod-font-ui);font-size:7px;font-weight:600;letter-spacing:1px;color:var(--mod-text-muted);text-transform:uppercase;text-align:center;margin-bottom:8px; }
    .mod-score-card { background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md);padding:14px;text-align:center; }
    .mod-score-name { font-size:14px;font-weight:600;color:var(--mod-text-primary);margin-bottom:8px; }
    .mod-score-btns { display:flex;gap:10px;justify-content:center; }
    .mod-score-btn { padding:10px 20px;border-radius:var(--mod-radius-md);border:none;font-family:var(--mod-font-ui);font-size:13px;letter-spacing:1px;cursor:pointer; }
    .mod-score-btn.happy { background:rgba(93,202,165,0.12);color:var(--mod-status-open); }
    .mod-score-btn.happy:active { background:rgba(93,202,165,0.25); }
    .mod-score-btn.unhappy { background:var(--mod-accent-muted);color:var(--mod-accent); }
    .mod-score-btn.unhappy:active { background:rgba(231,68,42,0.25); }
    .mod-score-slider-row { margin-top:8px; }
    .mod-score-slider { width:100%;accent-color:var(--mod-accent); }
    .mod-score-val { font-family:var(--mod-font-ui);font-size:16px;color:var(--mod-accent);margin-top:4px; }

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
    .mod-score-submit { margin-top:8px;padding:10px 24px;border-radius:var(--mod-radius-md);border:none;background:var(--mod-bar-accent);background-image:var(--mod-gloss);color:var(--mod-text-on-accent);font-family:var(--mod-font-ui);font-size:13px;letter-spacing:1px;cursor:pointer; }
    .mod-score-submit:active { transform:scale(0.96); }
    .mod-scored { font-size:13px;color:var(--mod-status-open);margin-top:8px; }

    /* Unplugged ruleset styles */
    .arena-rank-badge.unplugged { background:rgba(194,154,88,0.12);border:1px solid rgba(194,154,88,0.35);color:#c29a58; }
    .arena-rank-card.unplugged { border-color:rgba(194,154,88,0.35); }
    .arena-rank-card.unplugged:hover,
    .arena-rank-card.unplugged:active { border-color:#c29a58;background:rgba(194,154,88,0.06); }
    .arena-rank-card.amplified:hover,
    .arena-rank-card.amplified:active { border-color:var(--mod-accent-border);background:var(--mod-accent-muted); }
    .arena-card-badge.unplugged { background:rgba(194,154,88,0.12);border:1px solid rgba(194,154,88,0.35);color:#c29a58; }

    /* ===== F-51 FEED ROOM ===== */

    .feed-room { display:flex;flex-direction:column;height:100%;min-height:0;padding:0; }

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

    /* Feed stream (center) */
    .feed-stream { flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 12px;display:flex;flex-direction:column;gap:6px;min-height:0; }
    .feed-evt { padding:6px 10px;border-radius:var(--mod-radius-md);font-size:14px;line-height:1.4;word-break:break-word;max-width:92%; }
    .feed-evt-a { background:rgba(231,68,42,0.08);border-left:3px solid #E7442A;align-self:flex-start; }
    .feed-evt-b { background:rgba(74,144,217,0.08);border-left:3px solid #4A90D9;align-self:flex-start; }
    .feed-evt-mod { background:rgba(194,154,88,0.10);border-left:3px solid #c29a58;align-self:flex-start; }
    .feed-evt-name { font-size:11px;font-weight:700;letter-spacing:1px;display:block;margin-bottom:2px; }
    .feed-evt-a .feed-evt-name { color:#E7442A; }
    .feed-evt-b .feed-evt-name { color:#4A90D9; }
    .feed-evt-mod .feed-evt-name { color:#c29a58; }
    .feed-evt-text { color:var(--mod-text-primary); }
    .feed-evt-points { text-align:center;align-self:center;max-width:100%; }
    .feed-points-badge { display:inline-block;padding:4px 12px;border-radius:var(--mod-radius-pill);background:rgba(194,154,88,0.15);border:1px solid rgba(194,154,88,0.3);color:#c29a58;font-family:var(--mod-font-ui);font-size:12px;font-weight:700;letter-spacing:1px; }
    .feed-evt-divider { text-align:center;align-self:center;max-width:100%;padding:8px 0; }
    .feed-divider-text { font-family:var(--mod-font-ui);font-size:10px;font-weight:600;letter-spacing:3px;color:var(--mod-text-muted);text-transform:uppercase; }
    .feed-evt-system { text-align:center;align-self:center;font-size:12px;color:var(--mod-text-muted);font-style:italic;padding:4px 8px; }
    .feed-evt-selected { outline:2px solid var(--mod-bar-secondary);outline-offset:2px;border-radius:var(--mod-radius-md); }

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
    .feed-concede-btn { border-color:rgba(231,68,42,0.4);color:#E7442A; }

    /* Moderator score row */
    .feed-mod-score-row { display:flex;align-items:center;gap:6px;margin-top:8px;padding:8px;background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md); }
    .feed-score-prompt { font-size:12px;font-weight:600;color:var(--mod-text-muted);margin-right:4px; }
    .feed-score-btn { width:36px;height:36px;border-radius:50%;border:1px solid var(--mod-border-accent);background:var(--mod-accent-muted);color:var(--mod-accent-text);font-family:var(--mod-font-ui);font-size:14px;font-weight:700;cursor:pointer; }
    .feed-score-btn:active { background:var(--mod-bar-accent);color:var(--mod-text-on-accent); }
    .feed-score-btn-cancel { width:36px;height:36px;border-radius:50%;border:1px solid var(--mod-border-primary);background:none;color:var(--mod-text-muted);font-size:16px;cursor:pointer;margin-left:auto; }
  `;
  document.head.appendChild(style);
}
