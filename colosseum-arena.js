// ============================================================
// COLOSSEUM ARENA — Debate Arena, Matchmaking, Debate Room
// Session 24: Full build — Lobby, Queue, Room (4 modes)
// Modes: Live Audio, Voice Memo (async), Text Async, AI Sparring
// Renders into #screen-arena
// ============================================================

window.ColosseumArena = (() => {
  'use strict';

  // ========== STATE ==========
  let view = 'lobby';        // lobby | modeSelect | queue | room | postDebate
  let selectedMode = null;    // live | voicememo | text | ai
  let queuePollTimer = null;
  let queueElapsedTimer = null;
  let queueSeconds = 0;
  let currentDebate = null;   // { id, topic, role, mode, round, totalRounds, opponentName, opponentElo, messages }
  let roundTimer = null;
  let roundTimeLeft = 0;
  let screenEl = null;
  let cssInjected = false;

  // ========== CONSTANTS ==========
  const MODES = {
    live:      { id: 'live',      icon: '🎙️', name: 'LIVE AUDIO',  desc: 'Real-time voice debate. 2 min rounds.', available: 'Opponent needed', color: '#cc2936' },
    voicememo: { id: 'voicememo', icon: '🎤', name: 'VOICE MEMO',  desc: 'Record & send. Debate on your schedule.', available: 'Async — anytime', color: '#d4a843' },
    text:      { id: 'text',      icon: '⌨️',  name: 'TEXT BATTLE', desc: 'Written arguments. Think before you speak.', available: 'Async — anytime', color: '#5b8abf' },
    ai:        { id: 'ai',        icon: '🤖', name: 'AI SPARRING', desc: 'Practice against AI. Instant start.', available: '✅ Always ready', color: '#2ecc71' },
  };

  const QUEUE_TIMEOUT_SEC = { live: 90, voicememo: 10, text: 10, ai: 0 };
  const ROUND_DURATION = 120; // seconds per round for live mode
  const TEXT_MAX_CHARS = 2000;

  // Placeholder debate topics for AI sparring
  const AI_TOPICS = [
    'Social media does more harm than good',
    'College education is overpriced for what it delivers',
    'Remote work is better than office work',
    'AI will replace most white-collar jobs within 10 years',
    'The death penalty should be abolished worldwide',
    'Professional athletes are overpaid',
    'Standardized testing should be eliminated',
    'Privacy is more important than national security',
    'Capitalism is the best economic system',
    'Video games are a legitimate art form',
  ];

  // AI response templates (placeholder — will be replaced by Groq Edge Function)
  const AI_RESPONSES = {
    opening: [
      "Let me offer a counterpoint that I think deserves serious consideration.",
      "I appreciate that perspective, but the evidence actually points in a different direction.",
      "That's a popular position, but let me challenge it from a different angle.",
    ],
    rebuttal: [
      "While that argument has surface appeal, it overlooks several critical factors.",
      "I hear what you're saying, but the data tells a more nuanced story.",
      "That's a fair point, but consider this counterargument.",
    ],
    closing: [
      "In summary, when we look at the full picture, the weight of evidence supports my position.",
      "To wrap up — the fundamental issue here comes down to priorities, and I believe I've shown why mine are better aligned with reality.",
      "I'll close by saying this: good arguments need good evidence, and I believe I've presented the stronger case today.",
    ],
  };

  // ========== HELPERS ==========
  function getSupabase() {
    return (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.supabase) ? ColosseumAuth.supabase : null;
  }

  function isPlaceholder() {
    return !getSupabase() || (typeof ColosseumConfig !== 'undefined' && ColosseumConfig.isAnyPlaceholder);
  }

  function currentUser() {
    return (typeof ColosseumAuth !== 'undefined') ? ColosseumAuth.currentUser : null;
  }

  function currentProfile() {
    return (typeof ColosseumAuth !== 'undefined') ? ColosseumAuth.currentProfile : null;
  }

  function formatTimer(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function sanitize(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ========== CSS INJECTION ==========
  function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      /* ===== ARENA STYLES — Session 24 ===== */

      /* LOBBY */
      .arena-lobby { padding: 16px; padding-bottom: 80px; }
      .arena-hero { text-align: center; padding: 24px 16px 20px; }
      .arena-hero-title { font-family: var(--font-display); font-size: 20px; font-weight: 700; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; margin-bottom: 4px; }
      .arena-hero-sub { font-size: 13px; color: var(--white-dim); margin-bottom: 16px; }
      .arena-enter-btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; border-radius: 30px; border: none; background: linear-gradient(135deg, var(--red), #e63946); color: #fff; font-family: var(--font-display); font-size: 15px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; box-shadow: 0 4px 24px rgba(204,41,54,0.35); transition: transform 0.15s, box-shadow 0.15s; -webkit-tap-highlight-color: transparent; }
      .arena-enter-btn:active { transform: scale(0.96); box-shadow: 0 2px 12px rgba(204,41,54,0.25); }
      .arena-enter-btn .btn-pulse { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.8); animation: livePulse 1.5s ease-in-out infinite; }

      /* SECTION HEADERS */
      .arena-section { margin-top: 20px; }
      .arena-section-title { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: 3px; color: var(--white-dim); text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
      .arena-section-title .section-dot { width: 6px; height: 6px; border-radius: 50%; }
      .arena-section-title .live-dot { background: var(--red); animation: livePulse 1.5s ease-in-out infinite; }
      .arena-section-title .gold-dot { background: var(--gold); }

      /* DEBATE CARDS (lobby) */
      .arena-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer; transition: border-color 0.2s; -webkit-tap-highlight-color: transparent; }
      .arena-card:active { border-color: var(--card-border-hover); }
      .arena-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      .arena-card-badge { font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; }
      .arena-card-badge.live { background: rgba(204,41,54,0.15); color: var(--red); }
      .arena-card-badge.verdict { background: rgba(212,168,67,0.12); color: var(--gold); }
      .arena-card-badge.ai { background: rgba(46,204,113,0.12); color: var(--success); }
      .arena-card-badge.text { background: rgba(91,138,191,0.12); color: #7aa3d4; }
      .arena-card-meta { font-size: 11px; color: var(--white-dim); }
      .arena-card-topic { font-family: var(--font-display); font-size: 15px; font-weight: 600; color: var(--white); letter-spacing: 0.5px; line-height: 1.3; margin-bottom: 8px; }
      .arena-card-vs { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--white-dim); }
      .arena-card-vs .vs { color: var(--red); font-family: var(--font-display); font-weight: 700; letter-spacing: 1px; }
      .arena-card-score { font-family: var(--font-display); font-weight: 700; color: var(--gold); }
      .arena-card-action { display: flex; justify-content: flex-end; margin-top: 8px; }
      .arena-card-btn { padding: 6px 16px; border-radius: 16px; border: 1px solid var(--gold-dim); background: rgba(212,168,67,0.08); color: var(--gold); font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; }
      .arena-card-btn:active { background: rgba(212,168,67,0.2); }

      /* CHALLENGE FLOW */
      .arena-challenge-cta { background: var(--card-bg); border: 1px solid rgba(212,168,67,0.2); border-radius: 14px; padding: 16px; text-align: center; cursor: pointer; transition: border-color 0.2s; }
      .arena-challenge-cta:active { border-color: rgba(212,168,67,0.4); }
      .arena-challenge-icon { font-size: 28px; margin-bottom: 6px; }
      .arena-challenge-text { font-family: var(--font-display); font-size: 13px; letter-spacing: 2px; color: var(--gold); }
      .arena-challenge-sub { font-size: 12px; color: var(--white-dim); margin-top: 4px; }

      /* EMPTY STATE */
      .arena-empty { text-align: center; padding: 32px 16px; color: var(--white-dim); font-size: 14px; }
      .arena-empty .empty-icon { font-size: 40px; margin-bottom: 10px; display: block; }

      /* MODE SELECT OVERLAY */
      .arena-mode-overlay { position: fixed; inset: 0; z-index: 250; display: flex; flex-direction: column; justify-content: flex-end; }
      .arena-mode-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.6); }
      .arena-mode-sheet { position: relative; background: var(--navy); border-top: 1px solid rgba(255,255,255,0.1); border-radius: 20px 20px 0 0; padding: 20px 16px calc(20px + var(--safe-bottom)); max-height: 85vh; overflow-y: auto; transform: translateY(0); animation: sheetSlideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
      @keyframes sheetSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      .arena-mode-handle { width: 36px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.15); margin: 0 auto 16px; }
      .arena-mode-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; text-align: center; margin-bottom: 4px; }
      .arena-mode-subtitle { font-size: 13px; color: var(--white-dim); text-align: center; margin-bottom: 16px; }

      /* MODE CARDS */
      .arena-mode-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 14px; padding: 16px; margin-bottom: 10px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: border-color 0.2s, background 0.2s; -webkit-tap-highlight-color: transparent; }
      .arena-mode-card:active { border-color: var(--card-border-hover); background: rgba(255,255,255,0.03); }
      .arena-mode-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
      .arena-mode-info { flex: 1; }
      .arena-mode-name { font-family: var(--font-display); font-size: 14px; font-weight: 700; letter-spacing: 2px; color: var(--white); }
      .arena-mode-desc { font-size: 12px; color: var(--white-dim); margin-top: 2px; }
      .arena-mode-avail { font-size: 11px; margin-top: 4px; font-weight: 600; }
      .arena-mode-arrow { color: var(--white-dim); font-size: 18px; }
      .arena-mode-cancel { display: block; width: 100%; padding: 14px; border: 1px solid rgba(255,255,255,0.1); background: none; border-radius: 12px; color: var(--white-dim); font-family: var(--font-body); font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 4px; }

      /* TOPIC INPUT */
      .arena-topic-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); }
      .arena-topic-label { font-size: 11px; color: var(--white-dim); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px; }
      .arena-topic-input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: var(--white); font-family: var(--font-body); font-size: 14px; outline: none; }
      .arena-topic-input::placeholder { color: var(--white-dim); }
      .arena-topic-input:focus { border-color: rgba(212,168,67,0.3); }

      /* QUEUE */
      .arena-queue { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px 20px; text-align: center; }
      .arena-queue-icon { font-size: 56px; margin-bottom: 16px; animation: queueBreathe 2.5s ease-in-out infinite; }
      @keyframes queueBreathe { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.7; } }
      .arena-queue-title { font-family: var(--font-display); font-size: 18px; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; margin-bottom: 6px; }
      .arena-queue-status { font-size: 14px; color: var(--white-dim); margin-bottom: 20px; }
      .arena-queue-timer { font-family: var(--font-display); font-size: 48px; font-weight: 700; color: var(--white); letter-spacing: 4px; margin-bottom: 24px; }
      .arena-queue-elo { font-size: 12px; color: var(--white-dim); margin-bottom: 24px; }
      .arena-queue-cancel { padding: 12px 32px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); color: var(--white-dim); font-family: var(--font-body); font-size: 14px; cursor: pointer; }
      .arena-queue-cancel:active { background: rgba(255,255,255,0.08); }

      /* DEBATE ROOM */
      .arena-room { display: flex; flex-direction: column; height: 100%; }
      .arena-room-header { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
      .arena-room-topic { font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--white); letter-spacing: 1px; flex: 1; }
      .arena-room-round { font-size: 11px; color: var(--gold); font-weight: 600; letter-spacing: 1px; }
      .arena-room-timer { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--white); letter-spacing: 2px; min-width: 60px; text-align: right; }
      .arena-room-timer.warning { color: var(--red); animation: timerPulse 1s ease-in-out infinite; }
      @keyframes timerPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

      /* VS BANNER */
      .arena-vs-bar { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px 16px; background: rgba(10,17,40,0.4); flex-shrink: 0; }
      .arena-debater { display: flex; align-items: center; gap: 8px; }
      .arena-debater.right { flex-direction: row-reverse; }
      .arena-debater-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--gold-dim); background: var(--card-bg); font-family: var(--font-display); font-size: 14px; font-weight: 700; color: var(--gold); display: flex; align-items: center; justify-content: center; }
      .arena-debater-avatar.ai-avatar { border-color: var(--success); color: var(--success); }
      .arena-debater-info { }
      .arena-debater-name { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: 1px; color: var(--white); }
      .arena-debater-elo { font-size: 10px; color: var(--white-dim); }
      .arena-vs-text { font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--red); letter-spacing: 2px; }

      /* MESSAGES AREA */
      .arena-messages { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
      .arena-msg { max-width: 85%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5; word-break: break-word; }
      .arena-msg.side-a { align-self: flex-start; background: rgba(212,168,67,0.1); border: 1px solid rgba(212,168,67,0.15); color: var(--white); border-bottom-left-radius: 4px; }
      .arena-msg.side-b { align-self: flex-end; background: rgba(91,138,191,0.1); border: 1px solid rgba(91,138,191,0.15); color: var(--white); border-bottom-right-radius: 4px; }
      .arena-msg .msg-label { font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
      .arena-msg.side-a .msg-label { color: var(--gold); }
      .arena-msg.side-b .msg-label { color: #7aa3d4; }
      .arena-msg .msg-round { font-size: 10px; color: var(--white-dim); margin-top: 4px; }
      .arena-msg.system { align-self: center; max-width: 90%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); color: var(--white-dim); font-size: 12px; text-align: center; border-radius: 10px; }

      /* AI TYPING INDICATOR */
      .arena-typing { align-self: flex-end; padding: 10px 18px; background: rgba(91,138,191,0.08); border: 1px solid rgba(91,138,191,0.1); border-radius: 14px; border-bottom-right-radius: 4px; display: flex; gap: 4px; }
      .arena-typing .dot { width: 6px; height: 6px; border-radius: 50%; background: #7aa3d4; animation: typingDot 1.4s ease-in-out infinite; }
      .arena-typing .dot:nth-child(2) { animation-delay: 0.2s; }
      .arena-typing .dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes typingDot { 0%,60%,100% { opacity: 0.3; transform: scale(1); } 30% { opacity: 1; transform: scale(1.2); } }

      /* INPUT AREA */
      .arena-input-area { padding: 10px 16px calc(10px + var(--safe-bottom)); border-top: 1px solid rgba(255,255,255,0.08); background: rgba(10,17,40,0.5); backdrop-filter: blur(10px); flex-shrink: 0; }
      .arena-text-row { display: flex; gap: 8px; align-items: flex-end; }
      .arena-text-input { flex: 1; min-height: 44px; max-height: 120px; padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: var(--white); font-family: var(--font-body); font-size: 14px; resize: none; outline: none; }
      .arena-text-input::placeholder { color: var(--white-dim); }
      .arena-text-input:focus { border-color: rgba(212,168,67,0.3); }
      .arena-send-btn { width: 44px; height: 44px; border-radius: 50%; border: none; background: linear-gradient(135deg, var(--gold-dim), var(--gold)); color: var(--navy); font-size: 18px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
      .arena-send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .arena-send-btn:active:not(:disabled) { transform: scale(0.94); }
      .arena-char-count { font-size: 10px; color: var(--white-dim); text-align: right; margin-top: 4px; }

      /* LIVE AUDIO CONTROLS */
      .arena-audio-controls { display: flex; align-items: center; justify-content: center; gap: 20px; padding: 8px 0; }
      .arena-mic-btn { width: 60px; height: 60px; border-radius: 50%; border: 2px solid var(--red); background: rgba(204,41,54,0.1); color: var(--red); font-size: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
      .arena-mic-btn.muted { border-color: var(--white-dim); color: var(--white-dim); background: rgba(255,255,255,0.04); }
      .arena-mic-btn:active { transform: scale(0.94); }
      .arena-audio-status { font-size: 12px; color: var(--white-dim); text-align: center; }
      .arena-waveform { width: 100%; height: 40px; border-radius: 6px; background: rgba(255,255,255,0.02); }

      /* VOICE MEMO CONTROLS */
      .arena-vm-controls { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 8px 0; }
      .arena-record-btn { width: 60px; height: 60px; border-radius: 50%; border: 3px solid var(--gold); background: rgba(212,168,67,0.1); color: var(--gold); font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
      .arena-record-btn.recording { border-color: var(--red); color: var(--red); background: rgba(204,41,54,0.15); animation: recordPulse 1.5s ease-in-out infinite; }
      @keyframes recordPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(204,41,54,0.3); } 50% { box-shadow: 0 0 0 12px rgba(204,41,54,0); } }
      .arena-vm-status { font-size: 12px; color: var(--white-dim); }
      .arena-vm-timer { font-family: var(--font-display); font-size: 18px; color: var(--white); }

      /* POST-DEBATE */
      .arena-post { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 32px 20px; text-align: center; }
      .arena-post-verdict { font-size: 48px; margin-bottom: 12px; }
      .arena-post-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; margin-bottom: 8px; }
      .arena-post-topic { font-size: 14px; color: var(--white-dim); margin-bottom: 20px; }
      .arena-post-score { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
      .arena-post-side { text-align: center; }
      .arena-post-side-label { font-size: 11px; color: var(--white-dim); letter-spacing: 1px; margin-bottom: 4px; }
      .arena-post-side-score { font-family: var(--font-display); font-size: 32px; font-weight: 700; }
      .arena-post-side-score.winner { color: var(--gold); }
      .arena-post-side-score.loser { color: var(--white-dim); }
      .arena-post-divider { font-family: var(--font-display); font-size: 14px; color: var(--white-dim); letter-spacing: 1px; }
      .arena-post-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
      .arena-post-btn { padding: 12px 24px; border-radius: 24px; border: none; font-family: var(--font-display); font-size: 13px; font-weight: 600; letter-spacing: 1.5px; cursor: pointer; text-transform: uppercase; }
      .arena-post-btn.primary { background: linear-gradient(135deg, var(--gold-dim), var(--gold)); color: var(--navy); }
      .arena-post-btn.secondary { background: none; border: 1px solid var(--gold-dim); color: var(--gold); }
      .arena-post-btn:active { transform: scale(0.96); }

      /* SPECTATOR COUNT */
      .arena-spectator-bar { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px; font-size: 11px; color: var(--white-dim); }
      .arena-spectator-bar .eye { font-size: 13px; }

      /* BACK BUTTON */
      .arena-back-btn { position: absolute; top: 12px; left: 12px; width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); background: rgba(10,17,40,0.6); color: var(--white-dim); font-size: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; }
      .arena-back-btn:active { background: rgba(255,255,255,0.08); }

      /* UTILITY */
      .arena-fade-in { animation: arenaFadeIn 0.3s ease; }
      @keyframes arenaFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .arena-hidden { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  // ========== LOBBY ==========
  function renderLobby() {
    view = 'lobby';
    selectedMode = null;
    screenEl.innerHTML = '';
    screenEl.style.position = 'relative';

    const lobby = document.createElement('div');
    lobby.className = 'arena-lobby arena-fade-in';

    // Hero CTA
    lobby.innerHTML = `
      <div class="arena-hero">
        <div class="arena-hero-title">⚔️ The Arena</div>
        <div class="arena-hero-sub">Where opinions fight. Pick a mode. Find an opponent. Settle it.</div>
        <button class="arena-enter-btn" id="arena-enter-btn">
          <span class="btn-pulse"></span> ENTER THE ARENA
        </button>
      </div>
      <div class="arena-section" id="arena-live-section">
        <div class="arena-section-title"><span class="section-dot live-dot"></span> LIVE NOW</div>
        <div id="arena-live-feed"></div>
      </div>
      <div class="arena-section" id="arena-challenge-section">
        <div class="arena-section-title"><span class="section-dot gold-dot"></span> OPEN CHALLENGES</div>
        <div class="arena-challenge-cta" id="arena-challenge-cta">
          <div class="arena-challenge-icon">⚡</div>
          <div class="arena-challenge-text">DISAGREE WITH SOMEONE?</div>
          <div class="arena-challenge-sub">Find a hot take you hate → challenge them to debate it</div>
        </div>
      </div>
      <div class="arena-section" id="arena-verdicts-section">
        <div class="arena-section-title"><span class="section-dot gold-dot"></span> RECENT VERDICTS</div>
        <div id="arena-verdicts-feed"></div>
      </div>
    `;
    screenEl.appendChild(lobby);

    // Wire enter button
    document.getElementById('arena-enter-btn')?.addEventListener('click', showModeSelect);

    // Wire challenge CTA — navigate to home carousel
    document.getElementById('arena-challenge-cta')?.addEventListener('click', () => {
      if (typeof navigateTo === 'function') navigateTo('home');
    });

    // Load lobby content
    loadLobbyFeed();
  }

  async function loadLobbyFeed() {
    const liveFeed = document.getElementById('arena-live-feed');
    const verdictsFeed = document.getElementById('arena-verdicts-feed');
    if (!liveFeed || !verdictsFeed) return;

    if (isPlaceholder()) {
      // Placeholder content — shows what the lobby will look like
      liveFeed.innerHTML = renderPlaceholderCards('live');
      verdictsFeed.innerHTML = renderPlaceholderCards('verdict');
      return;
    }

    try {
      const sb = getSupabase();
      const { data, error } = await sb.rpc('get_arena_feed', { p_limit: 20 });

      if (error || !data || data.length === 0) {
        // Fall back to auto-debates only
        const { data: autoData } = await sb.from('auto_debates')
          .select('id, topic, side_a_label, side_b_label, score_a, score_b, status, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(10);

        if (autoData && autoData.length > 0) {
          liveFeed.innerHTML = '<div class="arena-empty"><span class="empty-icon">🏛️</span>No live debates yet — be the first to enter the arena</div>';
          verdictsFeed.innerHTML = autoData.map(d => renderAutoDebateCard(d)).join('');
        } else {
          liveFeed.innerHTML = renderPlaceholderCards('live');
          verdictsFeed.innerHTML = renderPlaceholderCards('verdict');
        }
        return;
      }

      const live = data.filter(d => d.status === 'live' || d.status === 'pending');
      const complete = data.filter(d => d.status === 'complete' || d.status === 'voting' || d.source === 'auto_debate');

      liveFeed.innerHTML = live.length > 0
        ? live.map(d => renderArenaFeedCard(d, 'live')).join('')
        : '<div class="arena-empty"><span class="empty-icon">🏛️</span>No live debates right now — be the first</div>';

      verdictsFeed.innerHTML = complete.length > 0
        ? complete.map(d => renderArenaFeedCard(d, 'verdict')).join('')
        : '<div class="arena-empty"><span class="empty-icon">📜</span>No verdicts yet</div>';

    } catch (err) {
      console.error('[Arena] Feed load error:', err);
      liveFeed.innerHTML = renderPlaceholderCards('live');
      verdictsFeed.innerHTML = renderPlaceholderCards('verdict');
    }
  }

  function renderArenaFeedCard(d, type) {
    const isAuto = d.source === 'auto_debate';
    const badge = d.status === 'live' ? '<span class="arena-card-badge live">● LIVE</span>'
      : isAuto ? '<span class="arena-card-badge ai">AI DEBATE</span>'
      : '<span class="arena-card-badge verdict">VERDICT</span>';
    const votes = (d.vote_count_a || 0) + (d.vote_count_b || 0);
    const action = d.status === 'live' ? 'SPECTATE' : 'VIEW VERDICT';
    const link = isAuto ? `colosseum-auto-debate.html?id=${d.id}` : '#';

    return `<div class="arena-card" onclick="${isAuto ? `window.location.href='${link}'` : ''}">
      <div class="arena-card-top">${badge}<span class="arena-card-meta">${votes} vote${votes !== 1 ? 's' : ''}</span></div>
      <div class="arena-card-topic">${sanitize(d.topic || 'Untitled Debate')}</div>
      <div class="arena-card-vs">
        <span>${sanitize(d.debater_a_name || 'Side A')}</span>
        <span class="vs">VS</span>
        <span>${sanitize(d.debater_b_name || 'Side B')}</span>
        ${d.score_a != null ? `<span class="arena-card-score">${d.score_a}–${d.score_b}</span>` : ''}
      </div>
      <div class="arena-card-action"><button class="arena-card-btn">${action}</button></div>
    </div>`;
  }

  function renderAutoDebateCard(d) {
    const votes = 0; // Would need a count query
    return `<div class="arena-card" onclick="window.location.href='colosseum-auto-debate.html?id=${d.id}'">
      <div class="arena-card-top"><span class="arena-card-badge ai">AI DEBATE</span><span class="arena-card-meta">Leg 3</span></div>
      <div class="arena-card-topic">${sanitize(d.topic)}</div>
      <div class="arena-card-vs">
        <span>${sanitize(d.side_a_label)}</span>
        <span class="vs">VS</span>
        <span>${sanitize(d.side_b_label)}</span>
        <span class="arena-card-score">${d.score_a}–${d.score_b}</span>
      </div>
      <div class="arena-card-action"><button class="arena-card-btn">VIEW VERDICT</button></div>
    </div>`;
  }

  function renderPlaceholderCards(type) {
    if (type === 'live') {
      return `<div class="arena-empty"><span class="empty-icon">🏛️</span>No live debates yet — be the first to enter the arena</div>`;
    }
    // Show placeholder verdict cards
    const placeholders = [
      { topic: 'Is LeBron the GOAT?', a: 'Yes Camp', b: 'Jordan Forever', sa: 72, sb: 85 },
      { topic: 'Pineapple belongs on pizza', a: 'Pro Pineapple', b: 'Pizza Purists', sa: 61, sb: 39 },
      { topic: 'Remote work is here to stay', a: 'Remote Warriors', b: 'Office Advocates', sa: 78, sb: 55 },
    ];
    return placeholders.map(p => `
      <div class="arena-card">
        <div class="arena-card-top"><span class="arena-card-badge verdict">VERDICT</span></div>
        <div class="arena-card-topic">${p.topic}</div>
        <div class="arena-card-vs">
          <span>${p.a}</span><span class="vs">VS</span><span>${p.b}</span>
          <span class="arena-card-score">${p.sa}–${p.sb}</span>
        </div>
      </div>
    `).join('');
  }

  // ========== MODE SELECT ==========
  function showModeSelect() {
    if (!currentUser() && !isPlaceholder()) {
      window.location.href = 'colosseum-plinko.html';
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'arena-mode-overlay';
    overlay.id = 'arena-mode-overlay';
    overlay.innerHTML = `
      <div class="arena-mode-backdrop" id="arena-mode-backdrop"></div>
      <div class="arena-mode-sheet">
        <div class="arena-mode-handle"></div>
        <div class="arena-mode-title">Choose Your Weapon</div>
        <div class="arena-mode-subtitle">Pick how you want to fight</div>
        ${Object.values(MODES).map(m => `
          <div class="arena-mode-card" data-mode="${m.id}">
            <div class="arena-mode-icon" style="background:${m.color}15; border: 1px solid ${m.color}30;">${m.icon}</div>
            <div class="arena-mode-info">
              <div class="arena-mode-name">${m.name}</div>
              <div class="arena-mode-desc">${m.desc}</div>
              <div class="arena-mode-avail" style="color:${m.color}">${m.available}</div>
            </div>
            <div class="arena-mode-arrow">→</div>
          </div>
        `).join('')}
        <div class="arena-topic-section">
          <div class="arena-topic-label">Topic (optional)</div>
          <input class="arena-topic-input" id="arena-topic-input" type="text" placeholder="e.g. Is AI going to take all our jobs?" maxlength="200">
        </div>
        <button class="arena-mode-cancel" id="arena-mode-cancel">Cancel</button>
      </div>
    `;
    document.body.appendChild(overlay);

    // Wire mode cards
    overlay.querySelectorAll('.arena-mode-card').forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.dataset.mode;
        const topic = document.getElementById('arena-topic-input')?.value?.trim() || '';
        closeModeSelect();
        enterQueue(mode, topic);
      });
    });

    // Wire close
    document.getElementById('arena-mode-backdrop')?.addEventListener('click', closeModeSelect);
    document.getElementById('arena-mode-cancel')?.addEventListener('click', closeModeSelect);
  }

  function closeModeSelect() {
    const overlay = document.getElementById('arena-mode-overlay');
    if (overlay) overlay.remove();
  }

  // ========== QUEUE ==========
  function enterQueue(mode, topic) {
    selectedMode = mode;
    view = 'queue';

    // AI mode — instant, no queue
    if (mode === 'ai') {
      startAIDebate(topic);
      return;
    }

    screenEl.innerHTML = '';
    queueSeconds = 0;

    const modeInfo = MODES[mode];
    const profile = currentProfile();
    const elo = profile?.elo_rating || 1200;

    const queueEl = document.createElement('div');
    queueEl.className = 'arena-queue arena-fade-in';
    queueEl.innerHTML = `
      <div class="arena-queue-icon">${modeInfo.icon}</div>
      <div class="arena-queue-title">${modeInfo.name}</div>
      <div class="arena-queue-status" id="arena-queue-status">Searching for a worthy opponent...</div>
      <div class="arena-queue-timer" id="arena-queue-timer">0:00</div>
      <div class="arena-queue-elo">Your ELO: ${elo}</div>
      <button class="arena-queue-cancel" id="arena-queue-cancel">Cancel</button>
    `;
    screenEl.appendChild(queueEl);

    document.getElementById('arena-queue-cancel')?.addEventListener('click', leaveQueue);

    // Start elapsed timer
    queueElapsedTimer = setInterval(() => {
      queueSeconds++;
      const timerEl = document.getElementById('arena-queue-timer');
      if (timerEl) timerEl.textContent = formatTimer(queueSeconds);

      // Timeout check
      const timeout = QUEUE_TIMEOUT_SEC[mode] || 60;
      if (queueSeconds >= timeout) {
        onQueueTimeout();
      }
    }, 1000);

    // Join queue in Supabase
    if (!isPlaceholder()) {
      joinServerQueue(mode, topic);
    } else {
      // Placeholder: simulate finding a match after a few seconds
      setTimeout(() => {
        if (view === 'queue') {
          onMatchFound({
            debate_id: 'placeholder-' + Date.now(),
            topic: topic || randomFrom(AI_TOPICS),
            role: 'a',
            opponent_name: 'PlaceholderUser',
            opponent_elo: 1200 + Math.floor(Math.random() * 200) - 100,
          });
        }
      }, 3000 + Math.random() * 4000);
    }
  }

  async function joinServerQueue(mode, topic) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb.rpc('join_debate_queue', {
        p_mode: mode,
        p_category: null,
        p_topic: topic || null,
      });

      if (error) throw error;

      if (data.status === 'matched') {
        onMatchFound(data);
      } else {
        // Start polling for match
        queuePollTimer = setInterval(async () => {
          try {
            const { data: status, error: pollErr } = await sb.rpc('check_queue_status');
            if (pollErr) throw pollErr;
            if (status && status.status === 'matched') {
              onMatchFound(status);
            }
          } catch (e) {
            console.warn('[Arena] Queue poll error:', e);
          }
        }, 2000);
      }
    } catch (err) {
      console.error('[Arena] Queue join error:', err);
      const statusEl = document.getElementById('arena-queue-status');
      if (statusEl) statusEl.textContent = 'Queue error — try again';
    }
  }

  function onMatchFound(data) {
    clearQueueTimers();
    const statusEl = document.getElementById('arena-queue-status');
    if (statusEl) {
      statusEl.textContent = '🎯 OPPONENT FOUND!';
      statusEl.style.color = 'var(--gold)';
    }
    // Brief pause then enter room
    setTimeout(() => {
      enterRoom({
        id: data.debate_id,
        topic: data.topic || randomFrom(AI_TOPICS),
        role: data.role || 'a',
        mode: selectedMode,
        round: 1,
        totalRounds: 3,
        opponentName: data.opponent_name || 'Opponent',
        opponentElo: data.opponent_elo || 1200,
        messages: [],
      });
    }, 1200);
  }

  function onQueueTimeout() {
    clearQueueTimers();
    const statusEl = document.getElementById('arena-queue-status');
    if (statusEl) {
      statusEl.innerHTML = 'No opponents found.<br><br>';
    }

    // Offer alternatives
    const queueEl = screenEl.querySelector('.arena-queue');
    if (queueEl) {
      const alt = document.createElement('div');
      alt.style.cssText = 'display:flex;flex-direction:column;gap:10px;width:100%;max-width:280px;';
      alt.innerHTML = `
        <button class="arena-post-btn primary" id="arena-try-ai">🤖 SPAR WITH AI INSTEAD</button>
        <button class="arena-post-btn secondary" id="arena-try-again">🔄 TRY AGAIN</button>
        <button class="arena-post-btn secondary" id="arena-back-lobby">← BACK TO LOBBY</button>
      `;
      queueEl.appendChild(alt);
      document.getElementById('arena-try-ai')?.addEventListener('click', () => { enterQueue('ai', ''); });
      document.getElementById('arena-try-again')?.addEventListener('click', () => { enterQueue(selectedMode, ''); });
      document.getElementById('arena-back-lobby')?.addEventListener('click', renderLobby);
    }

    // Leave server queue
    if (!isPlaceholder()) {
      getSupabase()?.rpc('leave_debate_queue').catch(() => {});
    }
  }

  function leaveQueue() {
    clearQueueTimers();
    if (!isPlaceholder()) {
      getSupabase()?.rpc('leave_debate_queue').catch(() => {});
    }
    renderLobby();
  }

  function clearQueueTimers() {
    if (queuePollTimer) { clearInterval(queuePollTimer); queuePollTimer = null; }
    if (queueElapsedTimer) { clearInterval(queueElapsedTimer); queueElapsedTimer = null; }
  }

  // ========== AI DEBATE (instant start) ==========
  async function startAIDebate(topic) {
    const chosenTopic = topic || randomFrom(AI_TOPICS);
    let debateId = 'ai-local-' + Date.now();

    if (!isPlaceholder()) {
      try {
        const sb = getSupabase();
        const { data, error } = await sb.rpc('create_ai_debate', { p_topic: chosenTopic });
        if (!error && data) debateId = data.debate_id;
      } catch (e) {
        console.warn('[Arena] AI debate creation failed, using local mode:', e);
      }
    }

    enterRoom({
      id: debateId,
      topic: chosenTopic,
      role: 'a',
      mode: 'ai',
      round: 1,
      totalRounds: 3,
      opponentName: 'AI Sparring Bot',
      opponentElo: '???',
      messages: [],
    });
  }

  // ========== DEBATE ROOM ==========
  function enterRoom(debate) {
    view = 'room';
    currentDebate = debate;
    screenEl.innerHTML = '';

    const profile = currentProfile();
    const myName = profile?.display_name || profile?.username || 'You';
    const myElo = profile?.elo_rating || 1200;
    const myInitial = (myName[0] || '?').toUpperCase();
    const oppInitial = (debate.opponentName[0] || '?').toUpperCase();
    const isAI = debate.mode === 'ai';

    const room = document.createElement('div');
    room.className = 'arena-room arena-fade-in';
    room.innerHTML = `
      <div class="arena-room-header">
        <div class="arena-room-topic">${sanitize(debate.topic)}</div>
        ${isAI ? `<div class="ai-generated-badge" style="margin-top:8px">
          <span class="ai-icon">AI</span>
          AI Sparring Partner — Not a Real Person
        </div>` : ''}
        <div class="arena-room-round" id="arena-round-label">ROUND ${debate.round}/${debate.totalRounds}</div>
        ${debate.mode === 'live' ? `<div class="arena-room-timer" id="arena-room-timer">${formatTimer(ROUND_DURATION)}</div>` : ''}
      </div>
      <div class="arena-vs-bar">
        <div class="arena-debater">
          <div class="arena-debater-avatar">${myInitial}</div>
          <div class="arena-debater-info">
            <div class="arena-debater-name">${sanitize(myName)}</div>
            <div class="arena-debater-elo">${myElo} ELO</div>
          </div>
        </div>
        <div class="arena-vs-text">VS</div>
        <div class="arena-debater right">
          <div class="arena-debater-avatar ${isAI ? 'ai-avatar' : ''}">${isAI ? '🤖' : oppInitial}</div>
          <div class="arena-debater-info" style="text-align:right;">
            <div class="arena-debater-name">${sanitize(debate.opponentName)}</div>
            <div class="arena-debater-elo">${debate.opponentElo} ELO</div>
          </div>
        </div>
      </div>
      <div class="arena-spectator-bar"><span class="eye">👁️</span> <span id="arena-spectator-count">0</span> watching</div>
      <div class="arena-messages" id="arena-messages"></div>
      <div class="arena-input-area" id="arena-input-area"></div>
    `;
    screenEl.appendChild(room);

    // Add system message
    addSystemMessage(`Round ${debate.round} — Make your argument.`);

    // Render mode-specific controls
    renderInputControls(debate.mode);

    // Start round timer for live mode
    if (debate.mode === 'live') {
      startLiveRoundTimer();
      initLiveAudio();
    }
  }

  function renderInputControls(mode) {
    const inputArea = document.getElementById('arena-input-area');
    if (!inputArea) return;

    switch (mode) {
      case 'text':
      case 'ai':
        inputArea.innerHTML = `
          <div class="arena-text-row">
            <textarea class="arena-text-input" id="arena-text-input" placeholder="Type your argument..." maxlength="${TEXT_MAX_CHARS}" rows="2"></textarea>
            <button class="arena-send-btn" id="arena-send-btn" disabled>→</button>
          </div>
          <div class="arena-char-count"><span id="arena-char-count">0</span> / ${TEXT_MAX_CHARS}</div>
        `;
        const input = document.getElementById('arena-text-input');
        const sendBtn = document.getElementById('arena-send-btn');
        const charCount = document.getElementById('arena-char-count');
        input?.addEventListener('input', () => {
          const len = input.value.length;
          charCount.textContent = len;
          sendBtn.disabled = len === 0;
          // Auto-resize
          input.style.height = 'auto';
          input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });
        sendBtn?.addEventListener('click', () => submitTextArgument());
        // Enter key to submit (shift+enter for newline)
        input?.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitTextArgument(); }
        });
        break;

      case 'live':
        inputArea.innerHTML = `
          <canvas class="arena-waveform" id="arena-waveform" width="300" height="40"></canvas>
          <div class="arena-audio-controls">
            <button class="arena-mic-btn" id="arena-mic-btn">🎙️</button>
          </div>
          <div class="arena-audio-status" id="arena-audio-status">Connecting audio...</div>
        `;
        document.getElementById('arena-mic-btn')?.addEventListener('click', toggleLiveMute);
        break;

      case 'voicememo':
        inputArea.innerHTML = `
          <div class="arena-vm-controls">
            <div class="arena-vm-status" id="arena-vm-status">Tap to record your argument</div>
            <div class="arena-vm-timer arena-hidden" id="arena-vm-timer">0:00</div>
            <button class="arena-record-btn" id="arena-record-btn">⏺</button>
            <div style="display:flex;gap:10px;margin-top:8px;">
              <button class="arena-card-btn arena-hidden" id="arena-vm-cancel">RETAKE</button>
              <button class="arena-card-btn arena-hidden" id="arena-vm-send" style="border-color:var(--gold);color:var(--gold);">SEND</button>
            </div>
          </div>
        `;
        wireVoiceMemoControls();
        break;
    }
  }

  // ========== TEXT / AI MODE ==========
  async function submitTextArgument() {
    const input = document.getElementById('arena-text-input');
    if (!input || !input.value.trim()) return;

    const text = input.value.trim();
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('arena-char-count').textContent = '0';
    document.getElementById('arena-send-btn').disabled = true;

    const debate = currentDebate;
    const side = debate.role === 'a' ? 'a' : 'b';

    // Add user's message
    addMessage(side, text, debate.round, false);

    // Save to Supabase
    if (!isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
      try {
        await getSupabase().rpc('submit_debate_message', {
          p_debate_id: debate.id,
          p_round: debate.round,
          p_side: side,
          p_content: text,
        });
      } catch (e) { console.warn('[Arena] Message save error:', e); }
    }

    // AI mode: generate response
    if (debate.mode === 'ai') {
      await handleAIResponse(debate, text);
    } else {
      // Text async: show waiting for opponent
      addSystemMessage('Waiting for opponent\'s response...');
      // In a real async flow, we'd poll or use realtime subscription
      // For now, simulate opponent response after delay
      if (isPlaceholder() || debate.id.startsWith('placeholder-')) {
        setTimeout(() => {
          const oppSide = side === 'a' ? 'b' : 'a';
          addMessage(oppSide, generateSimulatedResponse(debate.round), debate.round, false);
          advanceRound();
        }, 2000 + Math.random() * 3000);
      }
    }
  }

  async function handleAIResponse(debate, userText) {
    // Show typing indicator
    const messages = document.getElementById('arena-messages');
    const typing = document.createElement('div');
    typing.className = 'arena-typing';
    typing.id = 'arena-ai-typing';
    typing.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    messages?.appendChild(typing);
    messages?.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });

    // Disable input while AI is "thinking"
    const input = document.getElementById('arena-text-input');
    const sendBtn = document.getElementById('arena-send-btn');
    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    // Generate AI response
    // Groq Edge Function call via Supabase (Session 25)
    const aiText = await generateAIDebateResponse(debate.topic, userText, debate.round, debate.totalRounds);

    // Remove typing indicator
    document.getElementById('arena-ai-typing')?.remove();

    // Add AI message
    addMessage('b', aiText, debate.round, true);

    // Save AI message to Supabase
    if (!isPlaceholder() && !debate.id.startsWith('ai-local-')) {
      try {
        await getSupabase().rpc('submit_debate_message', {
          p_debate_id: debate.id,
          p_round: debate.round,
          p_side: 'b',
          p_content: aiText,
          p_is_ai: true,
        });
      } catch (e) { console.warn('[Arena] AI message save error:', e); }
    }

    // Re-enable input
    if (input) input.disabled = false;

    // Advance round
    advanceRound();
  }

  async function generateAIDebateResponse(topic, userArg, round, totalRounds) {
    // Build message history for full conversation context
    const messageHistory = (currentDebate?.messages || []).map(m => ({
      role: m.role,
      content: m.text,
    }));

    // Try Groq Edge Function
    try {
      const supabaseUrl = (typeof ColosseumConfig !== 'undefined' && ColosseumConfig.SUPABASE_URL)
        ? ColosseumConfig.SUPABASE_URL
        : null;

      if (!supabaseUrl) throw new Error('No supabase URL');

      const edgeUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1/ai-sparring';

      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, userArg, round, totalRounds, messageHistory }),
      });

      if (!res.ok) throw new Error('Edge Function error: ' + res.status);

      const data = await res.json();
      if (data?.response) return data.response;
      throw new Error('Empty response');

    } catch (err) {
      console.warn('[Arena] Groq Edge Function failed, using fallback:', err.message);

      // Fallback: canned responses with simulated delay
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 1800));

      const templates = round === 1 ? AI_RESPONSES.opening
        : round >= totalRounds ? AI_RESPONSES.closing
        : AI_RESPONSES.rebuttal;

      const opener = randomFrom(templates);
      const fillers = [
        'When we look at "' + topic + '" from a practical standpoint, the nuances become clearer.',
        'The research on this topic suggests a more complex picture than most people acknowledge.',
        'History shows us that similar arguments have played out before, and the results speak for themselves.',
        'If we follow your logic to its conclusion, we end up in some uncomfortable territory.',
        'The strongest version of your argument still has a fundamental flaw at its core.',
      ];

      return opener + ' ' + randomFrom(fillers);
    }
  }

  function generateSimulatedResponse(round) {
    const responses = [
      "I see your point, but I think you're overlooking a key factor here. The data actually suggests the opposite conclusion when you control for external variables.",
      "That's a common argument, but it falls apart under scrutiny. Consider what happens when we apply that logic consistently across all cases.",
      "While I respect that position, I've seen compelling evidence that points in a different direction entirely. Let me lay it out.",
      "You raise an interesting point, but I think the premise itself is flawed. Here's why that framing doesn't hold up.",
    ];
    return randomFrom(responses);
  }

  function advanceRound() {
    const debate = currentDebate;
    if (debate.round >= debate.totalRounds) {
      // Debate complete
      setTimeout(() => endCurrentDebate(), 1500);
      return;
    }

    debate.round++;
    addSystemMessage(`Round ${debate.round} of ${debate.totalRounds} — Your turn.`);

    const roundLabel = document.getElementById('arena-round-label');
    if (roundLabel) roundLabel.textContent = `ROUND ${debate.round}/${debate.totalRounds}`;

    // Reset timer for live mode
    if (debate.mode === 'live') {
      startLiveRoundTimer();
    }
  }

  // ========== LIVE AUDIO MODE ==========
  function startLiveRoundTimer() {
    roundTimeLeft = ROUND_DURATION;
    clearInterval(roundTimer);
    const timerEl = document.getElementById('arena-room-timer');

    roundTimer = setInterval(() => {
      roundTimeLeft--;
      if (timerEl) {
        timerEl.textContent = formatTimer(roundTimeLeft);
        timerEl.classList.toggle('warning', roundTimeLeft <= 15);
      }
      if (roundTimeLeft <= 0) {
        clearInterval(roundTimer);
        addSystemMessage('⏱️ Time\'s up for this round!');
        advanceRound();
      }
    }, 1000);
  }

  async function initLiveAudio() {
    if (typeof ColosseumWebRTC === 'undefined') {
      document.getElementById('arena-audio-status').textContent = 'WebRTC module not loaded';
      return;
    }

    const debate = currentDebate;

    // Wire WebRTC events
    ColosseumWebRTC.on('micReady', () => {
      document.getElementById('arena-audio-status').textContent = 'Microphone ready';
      const canvas = document.getElementById('arena-waveform');
      if (canvas && ColosseumWebRTC.localStream) {
        ColosseumWebRTC.createWaveform(ColosseumWebRTC.localStream, canvas);
      }
    });

    ColosseumWebRTC.on('connected', () => {
      document.getElementById('arena-audio-status').textContent = '🟢 Connected — debate is live!';
    });

    ColosseumWebRTC.on('disconnected', () => {
      document.getElementById('arena-audio-status').textContent = '🔴 Connection lost';
    });

    ColosseumWebRTC.on('muteChanged', ({ muted }) => {
      const btn = document.getElementById('arena-mic-btn');
      if (btn) {
        btn.classList.toggle('muted', muted);
        btn.textContent = muted ? '🔇' : '🎙️';
      }
      document.getElementById('arena-audio-status').textContent = muted ? 'Muted' : 'Unmuted — speaking';
    });

    ColosseumWebRTC.on('tick', ({ timeLeft }) => {
      const timerEl = document.getElementById('arena-room-timer');
      if (timerEl) {
        timerEl.textContent = formatTimer(timeLeft);
        timerEl.classList.toggle('warning', timeLeft <= 15);
      }
    });

    ColosseumWebRTC.on('debateEnd', () => {
      endCurrentDebate();
    });

    try {
      await ColosseumWebRTC.joinDebate(debate.id, debate.role);
    } catch (err) {
      document.getElementById('arena-audio-status').textContent = 'Failed to start audio — check mic permissions';
    }
  }

  function toggleLiveMute() {
    if (typeof ColosseumWebRTC !== 'undefined') {
      ColosseumWebRTC.toggleMute();
    }
  }

  // ========== VOICE MEMO MODE ==========
  let vmRecording = false;
  let vmTimer = null;
  let vmSeconds = 0;

  function wireVoiceMemoControls() {
    const recordBtn = document.getElementById('arena-record-btn');
    const cancelBtn = document.getElementById('arena-vm-cancel');
    const sendBtn = document.getElementById('arena-vm-send');

    recordBtn?.addEventListener('click', () => {
      if (!vmRecording) {
        startVoiceMemoRecording();
      } else {
        stopVoiceMemoRecording();
      }
    });

    cancelBtn?.addEventListener('click', () => {
      if (typeof ColosseumVoiceMemo !== 'undefined') ColosseumVoiceMemo.retake?.();
      resetVoiceMemoUI();
    });

    sendBtn?.addEventListener('click', () => {
      sendVoiceMemo();
    });
  }

  async function startVoiceMemoRecording() {
    vmRecording = true;
    vmSeconds = 0;
    const recordBtn = document.getElementById('arena-record-btn');
    const statusEl = document.getElementById('arena-vm-status');
    const timerEl = document.getElementById('arena-vm-timer');

    recordBtn?.classList.add('recording');
    recordBtn.textContent = '⏹';
    statusEl.textContent = 'Recording...';
    timerEl?.classList.remove('arena-hidden');

    vmTimer = setInterval(() => {
      vmSeconds++;
      if (timerEl) timerEl.textContent = formatTimer(vmSeconds);
      if (vmSeconds >= 120) stopVoiceMemoRecording(); // 2 min max
    }, 1000);

    if (typeof ColosseumVoiceMemo !== 'undefined') {
      try { await ColosseumVoiceMemo.startRecording(); } catch (e) {
        statusEl.textContent = 'Mic access denied';
        resetVoiceMemoUI();
      }
    }
  }

  function stopVoiceMemoRecording() {
    vmRecording = false;
    clearInterval(vmTimer);

    const recordBtn = document.getElementById('arena-record-btn');
    const statusEl = document.getElementById('arena-vm-status');
    const cancelBtn = document.getElementById('arena-vm-cancel');
    const sendBtn = document.getElementById('arena-vm-send');

    recordBtn?.classList.remove('recording');
    recordBtn.textContent = '⏺';
    statusEl.textContent = `Recorded ${formatTimer(vmSeconds)} — send or retake`;
    cancelBtn?.classList.remove('arena-hidden');
    sendBtn?.classList.remove('arena-hidden');

    if (typeof ColosseumVoiceMemo !== 'undefined') {
      ColosseumVoiceMemo.stopRecording?.();
    }
  }

  function resetVoiceMemoUI() {
    vmRecording = false;
    vmSeconds = 0;
    clearInterval(vmTimer);

    const recordBtn = document.getElementById('arena-record-btn');
    const statusEl = document.getElementById('arena-vm-status');
    const timerEl = document.getElementById('arena-vm-timer');
    const cancelBtn = document.getElementById('arena-vm-cancel');
    const sendBtn = document.getElementById('arena-vm-send');

    recordBtn?.classList.remove('recording');
    if (recordBtn) recordBtn.textContent = '⏺';
    if (statusEl) statusEl.textContent = 'Tap to record your argument';
    timerEl?.classList.add('arena-hidden');
    cancelBtn?.classList.add('arena-hidden');
    sendBtn?.classList.add('arena-hidden');
  }

  async function sendVoiceMemo() {
    const debate = currentDebate;
    const side = debate.role;

    // Add message representing voice memo
    addMessage(side, `🎤 Voice memo (${formatTimer(vmSeconds)})`, debate.round, false);
    resetVoiceMemoUI();

    if (typeof ColosseumVoiceMemo !== 'undefined') {
      await ColosseumVoiceMemo.send?.();
    }

    addSystemMessage('Voice memo sent — waiting for opponent...');

    // Simulate opponent response for now
    if (isPlaceholder() || debate.id.startsWith('placeholder-')) {
      setTimeout(() => {
        const oppSide = side === 'a' ? 'b' : 'a';
        addMessage(oppSide, '🎤 Voice memo (0:47)', debate.round, false);
        advanceRound();
      }, 3000 + Math.random() * 4000);
    }
  }

  // ========== MESSAGE RENDERING ==========
  function addMessage(side, text, round, isAI) {
    const messages = document.getElementById('arena-messages');
    if (!messages) return;

    const profile = currentProfile();
    const debate = currentDebate;

    // Track message history for AI context
    if (debate && debate.messages) {
      debate.messages.push({
        role: side === debate.role ? 'user' : 'assistant',
        text: text,
        round: round,
      });
    }

    const isMe = (side === debate.role);
    const name = isAI ? '🤖 AI'
      : isMe ? (profile?.display_name || 'You')
      : debate.opponentName;

    const msg = document.createElement('div');
    msg.className = `arena-msg side-${side} arena-fade-in`;
    msg.innerHTML = `
      <div class="msg-label">${sanitize(name)}</div>
      <div>${sanitize(text)}</div>
      <div class="msg-round">Round ${round}</div>
    `;
    messages.appendChild(msg);
    messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
  }

  function addSystemMessage(text) {
    const messages = document.getElementById('arena-messages');
    if (!messages) return;

    const msg = document.createElement('div');
    msg.className = 'arena-msg system arena-fade-in';
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
  }

  // ========== END DEBATE ==========
  function endCurrentDebate() {
    view = 'postDebate';
    clearInterval(roundTimer);

    const debate = currentDebate;

    // Clean up live audio
    if (debate.mode === 'live' && typeof ColosseumWebRTC !== 'undefined') {
      ColosseumWebRTC.leaveDebate();
    }

    // Generate scores (placeholder scoring)
    const scoreA = 60 + Math.floor(Math.random() * 30);
    const scoreB = 60 + Math.floor(Math.random() * 30);
    const winner = scoreA >= scoreB ? 'a' : 'b';
    const didWin = winner === debate.role;

    // Update Supabase
    if (!isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
      getSupabase()?.rpc('update_arena_debate', {
        p_debate_id: debate.id,
        p_status: 'complete',
        p_winner: winner,
        p_score_a: scoreA,
        p_score_b: scoreB,
      }).catch(() => {});
    }

    // Render post-debate screen
    const profile = currentProfile();
    const myName = profile?.display_name || 'You';

    screenEl.innerHTML = '';
    const post = document.createElement('div');
    post.className = 'arena-post arena-fade-in';
    post.innerHTML = `
      <div class="arena-post-verdict">${didWin ? '🏆' : '💀'}</div>
      <div class="arena-post-title">${didWin ? 'VICTORY' : 'DEFEAT'}</div>
      <div class="arena-post-topic">${sanitize(debate.topic)}</div>
      <div class="arena-post-score">
        <div class="arena-post-side">
          <div class="arena-post-side-label">${sanitize(myName)}</div>
          <div class="arena-post-side-score ${debate.role === winner ? 'winner' : 'loser'}">${debate.role === 'a' ? scoreA : scoreB}</div>
        </div>
        <div class="arena-post-divider">—</div>
        <div class="arena-post-side">
          <div class="arena-post-side-label">${sanitize(debate.opponentName)}</div>
          <div class="arena-post-side-score ${debate.role !== winner ? 'winner' : 'loser'}">${debate.role === 'a' ? scoreB : scoreA}</div>
        </div>
      </div>
      <div class="arena-post-actions">
        <button class="arena-post-btn primary" id="arena-rematch">⚔️ REMATCH</button>
        <button class="arena-post-btn secondary" id="arena-share-result">🔗 SHARE</button>
        <button class="arena-post-btn secondary" id="arena-back-to-lobby">← LOBBY</button>
      </div>
    `;
    screenEl.appendChild(post);

    document.getElementById('arena-rematch')?.addEventListener('click', () => {
      enterQueue(debate.mode, debate.topic);
    });
    document.getElementById('arena-share-result')?.addEventListener('click', () => {
      if (typeof ColosseumShare !== 'undefined' && ColosseumShare.shareDebateResult) {
        ColosseumShare.shareDebateResult({
          debateId: debate.id,
          topic: debate.topic,
          winner: didWin ? myName : debate.opponentName,
          scoreA, scoreB,
        });
      } else {
        // Fallback: try Web Share API
        try {
          navigator.share({
            title: `${debate.topic} — The Colosseum`,
            text: `${didWin ? 'I won' : 'I lost'} a debate: "${debate.topic}" (${scoreA}–${scoreB})`,
            url: window.location.origin,
          }).catch(() => {});
        } catch (e) {}
      }
    });
    document.getElementById('arena-back-to-lobby')?.addEventListener('click', renderLobby);
  }

  // ========== INIT ==========
  function init() {
    injectCSS();
    screenEl = document.getElementById('screen-arena');
    if (!screenEl) {
      console.warn('[Arena] #screen-arena not found');
      return;
    }
    renderLobby();
  }

  // Auto-init when DOM is ready
  function autoInit() {
    if (document.getElementById('screen-arena')) {
      init();
    } else {
      // Wait for DOM
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        // screen-arena might be added later, observe
        const observer = new MutationObserver(() => {
          if (document.getElementById('screen-arena')) {
            observer.disconnect();
            init();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    }
  }

  autoInit();

  // ========== PUBLIC API ==========
  return {
    init,
    renderLobby,
    showModeSelect,
    enterQueue,
    get view() { return view; },
    get currentDebate() { return currentDebate ? { ...currentDebate } : null; },
  };

})();
