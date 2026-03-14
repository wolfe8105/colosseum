// ============================================================
// COLOSSEUM ARENA — Debate Arena, Matchmaking, Debate Room
// Session 24: Full build — Lobby, Queue, Room (4 modes)
// Modes: Live Audio, Voice Memo (async), Text Async, AI Sparring
// Session 39: Moderator UX — picker, evidence, ruling panel, AI auto-ruling, post-debate scoring
// Session 44: Ranked vs Casual — arena picker, Elo changes for ranked, profile gate
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
  let selectedModerator = null;    // { id, type } — 'human'|'ai'|null
  let selectedRanked = false;      // true = ranked (Elo moves), false = casual
  let referencePollTimer = null;
  let pendingReferences = [];      // references waiting for mod ruling
  let activatedPowerUps = new Set(); // track which power-ups activated this debate
  let shieldActive = false;          // shield blocks next reference denial
  let equippedForDebate = [];        // power-ups equipped for current debate
  let silenceTimer = null;           // silence countdown timer ref

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

  // SESSION 63: Delegate to ColosseumAuth.safeRpc for 401 retry + standardized errors
  async function safeRpc(name, params) {
    if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.safeRpc) {
      return ColosseumAuth.safeRpc(name, params);
    }
    // Fallback: raw rpc
    const sb = getSupabase();
    if (!sb) return { data: null, error: { message: 'Supabase not available' } };
    return sb.rpc(name, params);
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

  const sanitize = (s) => ColosseumConfig.escapeHTML(s);

  // ========== BROWSER HISTORY (back button support) ==========
  // Pattern from web: push on overlay open, history.back() on close-by-user.
  // Skip flag prevents async popstate from closing the NEXT overlay.
  let _skipNextPop = false;

  function pushArenaState(viewName) {
    history.pushState({ arenaView: viewName }, '');
  }

  let _rulingCountdownTimer = null; // SESSION 63: Track ruling panel timer for cleanup

  window.addEventListener('popstate', (e) => {
    if (_skipNextPop) { _skipNextPop = false; return; }

    // Overlays: back button consumed the entry, just remove
    const rankOverlay = document.getElementById('arena-rank-overlay');
    if (rankOverlay) { rankOverlay.remove(); return; }
    const modeOverlay = document.getElementById('arena-mode-overlay');
    if (modeOverlay) { modeOverlay.remove(); return; }
    // SESSION 63: Handle ruling panel overlay — clean up timer on back
    const rulingOverlay = document.getElementById('mod-ruling-overlay');
    if (rulingOverlay) { clearInterval(_rulingCountdownTimer); rulingOverlay.remove(); return; }

    // Real screen transitions
    if (view === 'postDebate') {
      renderLobby();
    } else if (view === 'room') {
      clearInterval(roundTimer);
      clearInterval(_rulingCountdownTimer);
      stopReferencePoll();
      if (currentDebate?.mode === 'live' && typeof ColosseumWebRTC !== 'undefined') {
        ColosseumWebRTC.leaveDebate();
      }
      renderLobby();
    } else if (view === 'queue') {
      leaveQueue();
    }
  });

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
      .arena-clickable-opp { color: var(--gold); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
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

      /* SESSION 39: MODERATOR UI */

      /* Reference submit button */
      .arena-ref-btn { display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;border:1px solid rgba(91,138,191,0.3);background:rgba(91,138,191,0.08);color:#7aa3d4;font-size:11px;font-weight:600;letter-spacing:1px;cursor:pointer;margin-left:8px;white-space:nowrap; }
      .arena-ref-btn:active { background:rgba(91,138,191,0.2); }

      /* Reference submit form (inline under messages) */
      .arena-ref-form { padding:10px 16px;border-top:1px solid rgba(255,255,255,0.06);background:rgba(10,17,40,0.4); }
      .arena-ref-form input, .arena-ref-form textarea { width:100%;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:var(--white);font-family:var(--font-body);font-size:13px;outline:none;margin-bottom:6px; }
      .arena-ref-form input:focus, .arena-ref-form textarea:focus { border-color:rgba(91,138,191,0.4); }
      .arena-ref-form textarea { resize:none;min-height:44px; }
      .arena-ref-side-row { display:flex;gap:6px;margin-bottom:8px; }
      .arena-ref-side-btn { flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:none;color:var(--white-dim);font-size:12px;font-weight:600;cursor:pointer;text-align:center; }
      .arena-ref-side-btn.active { border-color:var(--gold);color:var(--gold);background:rgba(212,168,67,0.1); }
      .arena-ref-actions { display:flex;gap:8px; }
      .arena-ref-submit { flex:1;padding:8px;border-radius:8px;border:none;background:rgba(91,138,191,0.2);color:#7aa3d4;font-size:12px;font-weight:600;letter-spacing:1px;cursor:pointer; }
      .arena-ref-submit:active { background:rgba(91,138,191,0.35); }
      .arena-ref-cancel { padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:none;color:var(--white-dim);font-size:12px;cursor:pointer; }

      /* Moderator ruling panel (bottom sheet) */

      /* Ranked / Casual picker */
      .arena-rank-overlay { position: fixed; inset: 0; z-index: 250; display: flex; flex-direction: column; justify-content: flex-end; }
      .arena-rank-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.6); }
      .arena-rank-sheet { position: relative; background: var(--navy); border-top: 1px solid rgba(255,255,255,0.1); border-radius: 20px 20px 0 0; padding: 20px 16px calc(20px + var(--safe-bottom)); max-height: 70vh; overflow-y: auto; animation: sheetSlideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
      .arena-rank-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; text-align: center; margin-bottom: 4px; }
      .arena-rank-subtitle { font-size: 13px; color: var(--white-dim); text-align: center; margin-bottom: 16px; }
      .arena-rank-card { background: var(--card-bg); border: 2px solid var(--card-border); border-radius: 14px; padding: 18px 16px; margin-bottom: 12px; cursor: pointer; transition: border-color 0.2s, background 0.2s; -webkit-tap-highlight-color: transparent; }
      .arena-rank-card:active { background: rgba(255,255,255,0.03); }
      .arena-rank-card.casual { border-left: 4px solid #5b8abf; }
      .arena-rank-card.ranked { border-left: 4px solid #d4a843; }
      .arena-rank-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
      .arena-rank-card-icon { font-size: 22px; }
      .arena-rank-card-name { font-family: var(--font-display); font-size: 16px; font-weight: 700; letter-spacing: 2px; color: var(--white); }
      .arena-rank-card-desc { font-size: 12px; color: var(--white-dim); line-height: 1.5; }
      .arena-rank-card-badge { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 1px; padding: 2px 8px; border-radius: 4px; margin-top: 8px; }
      .arena-rank-card.casual .arena-rank-card-badge { background: rgba(91,138,191,0.2); color: #5b8abf; }
      .arena-rank-card.ranked .arena-rank-card-badge { background: rgba(212,168,67,0.2); color: #d4a843; }
      .arena-rank-cancel { display: block; width: 100%; padding: 14px; border: 1px solid rgba(255,255,255,0.1); background: none; border-radius: 12px; color: var(--white-dim); font-family: var(--font-body); font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 4px; }

      /* Ranked/Casual badge in queue + post-debate */
      .arena-rank-badge { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 3px 10px; border-radius: 4px; margin-bottom: 8px; }
      .arena-rank-badge.casual { background: rgba(91,138,191,0.2); color: #5b8abf; }
      .arena-rank-badge.ranked { background: rgba(212,168,67,0.2); color: #d4a843; }
      .arena-elo-change { font-size: 14px; font-weight: 700; margin-top: 8px; letter-spacing: 1px; }
      .arena-elo-change.positive { color: #2ecc71; }
      .arena-elo-change.negative { color: #cc2936; }
      .arena-elo-change.neutral { color: var(--white-dim); }
      .mod-ruling-overlay { position:fixed;inset:0;z-index:300;display:flex;flex-direction:column;justify-content:flex-end; }
      .mod-ruling-backdrop { position:absolute;inset:0;background:rgba(0,0,0,0.6); }
      .mod-ruling-sheet { position:relative;background:var(--navy);border-top:2px solid var(--gold);border-radius:20px 20px 0 0;padding:20px 16px calc(20px + var(--safe-bottom));max-height:70vh;overflow-y:auto;animation:sheetSlideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
      .mod-ruling-handle { width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.15);margin:0 auto 12px; }
      .mod-ruling-title { font-family:var(--font-display);font-size:16px;letter-spacing:2px;color:var(--gold);text-align:center;margin-bottom:4px; }
      .mod-ruling-sub { font-size:12px;color:var(--white-dim);text-align:center;margin-bottom:14px; }
      .mod-ruling-ref { background:rgba(10,17,40,0.5);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;margin-bottom:12px; }
      .mod-ruling-ref-meta { font-size:10px;color:var(--white-dim);letter-spacing:1px;margin-bottom:4px; }
      .mod-ruling-ref-url { font-size:12px;color:#7aa3d4;word-break:break-all;margin-bottom:4px; }
      .mod-ruling-ref-desc { font-size:13px;color:var(--white);line-height:1.4; }
      .mod-ruling-ref-side { font-size:11px;color:var(--gold);margin-top:4px; }
      .mod-ruling-reason { width:100%;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:var(--white);font-family:var(--font-body);font-size:13px;resize:none;min-height:44px;outline:none;margin-bottom:10px; }
      .mod-ruling-reason:focus { border-color:var(--gold-dim); }
      .mod-ruling-btns { display:flex;gap:10px; }
      .mod-ruling-allow { flex:1;padding:12px;border-radius:10px;border:none;background:rgba(46,204,113,0.15);color:var(--success);font-family:var(--font-display);font-size:14px;letter-spacing:2px;cursor:pointer; }
      .mod-ruling-allow:active { background:rgba(46,204,113,0.3); }
      .mod-ruling-deny { flex:1;padding:12px;border-radius:10px;border:none;background:rgba(204,41,54,0.15);color:var(--red);font-family:var(--font-display);font-size:14px;letter-spacing:2px;cursor:pointer; }
      .mod-ruling-deny:active { background:rgba(204,41,54,0.3); }
      .mod-ruling-timer { font-size:11px;color:var(--white-dim);text-align:center;margin-bottom:8px; }

      /* SESSION 110: Pre-debate screen */
      .arena-pre-debate { display:flex;flex-direction:column;align-items:center;padding:20px 16px;padding-bottom:80px;overflow-y:auto;height:100%; }
      .arena-pre-debate-title { font-family:var(--font-display);font-size:18px;font-weight:700;letter-spacing:3px;color:var(--gold);text-transform:uppercase;margin-bottom:4px;text-align:center; }
      .arena-pre-debate-sub { font-size:13px;color:var(--white-dim);text-align:center;margin-bottom:16px; }
      .arena-pre-debate-enter { display:inline-flex;align-items:center;gap:8px;padding:14px 40px;border-radius:30px;border:none;background:linear-gradient(135deg,var(--red),#e63946);color:#fff;font-family:var(--font-display);font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;box-shadow:0 4px 24px rgba(204,41,54,0.35);margin-top:16px; }
      .arena-pre-debate-enter:active { transform:scale(0.96); }

      /* SESSION 110: Staking results in post-debate */
      .arena-staking-result { background:rgba(212,168,67,0.08);border:1px solid rgba(212,168,67,0.2);border-radius:12px;padding:14px 20px;margin:12px 0;text-align:center;max-width:300px;width:100%; }
      .arena-staking-result-title { font-family:var(--font-display);font-size:12px;letter-spacing:2px;color:var(--gold);margin-bottom:6px; }
      .arena-staking-result-amount { font-family:var(--font-display);font-size:24px;font-weight:700;letter-spacing:1px; }
      .arena-staking-result-amount.won { color:#2ecc71; }
      .arena-staking-result-amount.lost { color:var(--red); }
      .arena-staking-result-amount.none { color:var(--white-dim); }
      .arena-staking-result-detail { font-size:11px;color:var(--white-dim);margin-top:4px; }

      /* Moderator assignment picker */
      .mod-picker-section { margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06); }
      .mod-picker-label { font-size:11px;color:var(--white-dim);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px; }
      .mod-picker-opts { display:flex;flex-direction:column;gap:6px; }
      .mod-picker-opt { display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);cursor:pointer; }
      .mod-picker-opt:active { background:rgba(255,255,255,0.06); }
      .mod-picker-opt.selected { border-color:var(--gold);background:rgba(212,168,67,0.08); }
      .mod-picker-avatar { width:32px;height:32px;border-radius:50%;border:2px solid var(--gold-dim);background:var(--navy);color:var(--gold);font-family:var(--font-display);font-size:13px;display:flex;align-items:center;justify-content:center; }
      .mod-picker-info { flex:1; }
      .mod-picker-name { font-size:13px;font-weight:600;color:var(--white); }
      .mod-picker-stats { font-size:10px;color:var(--white-dim); }
      .mod-picker-check { width:18px;height:18px;border-radius:50%;border:2px solid var(--white-dim);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--gold); }
      .mod-picker-opt.selected .mod-picker-check { border-color:var(--gold);background:rgba(212,168,67,0.2); }

      /* Moderator badge in VS bar */
      .arena-mod-bar { display:flex;align-items:center;justify-content:center;gap:6px;padding:4px;font-size:11px;color:var(--gold);border-bottom:1px solid rgba(212,168,67,0.1); }
      .arena-mod-bar .mod-icon { font-size:12px; }

      /* Post-debate mod scoring */
      .mod-score-section { margin-top:16px;width:100%;max-width:320px; }
      .mod-score-title { font-family:var(--font-display);font-size:13px;letter-spacing:2px;color:var(--gold);text-align:center;margin-bottom:8px; }
      .mod-score-card { background:rgba(10,17,40,0.5);border:1px solid rgba(212,168,67,0.15);border-radius:12px;padding:14px;text-align:center; }
      .mod-score-name { font-size:14px;font-weight:600;color:var(--white);margin-bottom:8px; }
      .mod-score-btns { display:flex;gap:10px;justify-content:center; }
      .mod-score-btn { padding:10px 20px;border-radius:10px;border:none;font-family:var(--font-display);font-size:13px;letter-spacing:1px;cursor:pointer; }
      .mod-score-btn.happy { background:rgba(46,204,113,0.15);color:var(--success); }
      .mod-score-btn.happy:active { background:rgba(46,204,113,0.3); }
      .mod-score-btn.unhappy { background:rgba(204,41,54,0.15);color:var(--red); }
      .mod-score-btn.unhappy:active { background:rgba(204,41,54,0.3); }
      .mod-score-slider-row { margin-top:8px; }
      .mod-score-slider { width:100%;accent-color:var(--gold); }
      .mod-score-val { font-family:var(--font-display);font-size:16px;color:var(--gold);margin-top:4px; }

      /* SESSION 113: Transcript bottom sheet */
      .arena-transcript-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:flex-end;justify-content:center; }
      .arena-transcript-sheet { background:linear-gradient(180deg,#132240 0%,#0a1628 100%);border-top-left-radius:20px;border-top-right-radius:20px;width:100%;max-width:480px;max-height:80vh;display:flex;flex-direction:column;padding-bottom:max(12px,env(safe-area-inset-bottom)); }
      .arena-transcript-header { padding:16px 20px 12px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0; }
      .arena-transcript-handle { width:40px;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin:0 auto 12px; }
      .arena-transcript-title { font-family:var(--font-display);font-size:16px;letter-spacing:2px;color:var(--gold);text-align:center; }
      .arena-transcript-topic { font-size:12px;color:var(--white-dim);text-align:center;margin-top:4px; }
      .arena-transcript-body { flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 16px;display:flex;flex-direction:column;gap:8px; }
      .arena-transcript-round { font-size:10px;color:var(--gold-dim);letter-spacing:2px;text-align:center;padding:8px 0 4px;text-transform:uppercase; }
      .arena-transcript-msg { padding:10px 14px;border-radius:12px;max-width:85%; }
      .arena-transcript-msg.side-a { background:rgba(91,138,191,0.12);border:1px solid rgba(91,138,191,0.2);align-self:flex-start; }
      .arena-transcript-msg.side-b { background:rgba(204,41,54,0.12);border:1px solid rgba(204,41,54,0.2);align-self:flex-end; }
      .arena-transcript-msg .t-name { font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:4px; }
      .arena-transcript-msg.side-a .t-name { color:#7aa3d4; }
      .arena-transcript-msg.side-b .t-name { color:#cc2936; }
      .arena-transcript-msg .t-text { font-size:14px;color:var(--white);line-height:1.4;word-break:break-word; }
      .arena-transcript-empty { text-align:center;color:var(--white-dim);font-size:13px;padding:24px 0; }
      .mod-score-submit { margin-top:8px;padding:10px 24px;border-radius:10px;border:none;background:var(--gold);color:var(--navy);font-family:var(--font-display);font-size:13px;letter-spacing:1px;cursor:pointer; }
      .mod-score-submit:active { transform:scale(0.96); }
      .mod-scored { font-size:13px;color:var(--success);margin-top:8px; }
    `;
    document.head.appendChild(style);
  }

  // ========== LOBBY ==========
  function renderLobby() {
    view = 'lobby';
    selectedMode = null;
    selectedModerator = null;
    selectedRanked = false;
    stopReferencePoll();
    // SESSION 110: Clean up power-up state
    activatedPowerUps.clear();
    shieldActive = false;
    equippedForDebate = [];
    if (silenceTimer) { clearInterval(silenceTimer); silenceTimer = null; }
    ColosseumPowerUps?.removeShieldIndicator?.();
    document.getElementById('powerup-silence-overlay')?.remove();
    document.getElementById('powerup-reveal-popup')?.remove();
    history.replaceState({ arenaView: 'lobby' }, '');
    screenEl.innerHTML = '';
    screenEl.style.position = 'relative';

    const lobby = document.createElement('div');
    lobby.className = 'arena-lobby arena-fade-in';

    // Hero CTA
    lobby.innerHTML = `
      <div class="arena-hero">
        <div class="arena-hero-title">⚔️ The Arena</div>
        <div class="arena-hero-sub">Where opinions fight. Pick a mode. Find an opponent. Settle it.</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:10px 0 4px;">
          <span style="color:#D4A843;font-weight:700;font-size:15px;">🪙 <span data-token-balance>${typeof ColosseumTokens !== 'undefined' && ColosseumTokens.balance != null ? ColosseumTokens.balance.toLocaleString() : '0'}</span> tokens</span>
          <span style="color:#a0a8b8;font-size:13px;">|</span>
          <span style="color:#5b8abf;font-size:13px;">🔥 ${Number(currentProfile()?.login_streak) || 0}-day streak</span>
        </div>
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
    document.getElementById('arena-enter-btn')?.addEventListener('click', showRankedPicker);

    // Wire challenge CTA — navigate to home carousel
    document.getElementById('arena-challenge-cta')?.addEventListener('click', () => {
      if (typeof navigateTo === 'function') navigateTo('home');
    });

    // Load lobby content
    loadLobbyFeed();

    // SESSION 63: Event delegation for arena card links (replaces inline onclick)
    lobby.addEventListener('click', (e) => {
      const card = e.target.closest('.arena-card[data-link]');
      if (card) window.location.href = card.dataset.link;
    });
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
      const { data, error } = await safeRpc('get_arena_feed', { p_limit: 20 });

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

    return `<div class="arena-card" ${isAuto ? `data-link="colosseum-auto-debate.html?id=${encodeURIComponent(d.id)}"` : ''}>
      <div class="arena-card-top">${badge}<span class="arena-card-meta">${votes} vote${votes !== 1 ? 's' : ''}</span></div>
      <div class="arena-card-topic">${sanitize(d.topic || 'Untitled Debate')}</div>
      <div class="arena-card-vs">
        <span>${sanitize(d.debater_a_name || 'Side A')}</span>
        <span class="vs">VS</span>
        <span>${sanitize(d.debater_b_name || 'Side B')}</span>
        ${d.score_a != null ? `<span class="arena-card-score">${Number(d.score_a)}–${Number(d.score_b)}</span>` : ''}
      </div>
      <div class="arena-card-action"><button class="arena-card-btn">${action}</button></div>
    </div>`;
  }

  function renderAutoDebateCard(d) {
    const votes = 0; // Would need a count query
    return `<div class="arena-card" data-link="colosseum-auto-debate.html?id=${encodeURIComponent(d.id)}">
      <div class="arena-card-top"><span class="arena-card-badge ai">AI DEBATE</span><span class="arena-card-meta">Leg 3</span></div>
      <div class="arena-card-topic">${sanitize(d.topic)}</div>
      <div class="arena-card-vs">
        <span>${sanitize(d.side_a_label)}</span>
        <span class="vs">VS</span>
        <span>${sanitize(d.side_b_label)}</span>
        <span class="arena-card-score">${Number(d.score_a)}–${Number(d.score_b)}</span>
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
          <span class="arena-card-score">${Number(p.sa)}–${Number(p.sb)}</span>
        </div>
      </div>
    `).join('');
  }

  // ========== MODE SELECT ==========
  // ========== RANKED / CASUAL PICKER ==========
  function showRankedPicker() {
    if (!currentUser() && !isPlaceholder()) {
      window.location.href = 'colosseum-plinko.html';
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'arena-rank-overlay';
    overlay.id = 'arena-rank-overlay';
    overlay.innerHTML = `
      <div class="arena-rank-backdrop" id="arena-rank-backdrop"></div>
      <div class="arena-rank-sheet">
        <div class="arena-mode-handle"></div>
        <div class="arena-rank-title">Choose Your Arena</div>
        <div class="arena-rank-subtitle">Casual for fun. Ranked when it counts.</div>

        <div class="arena-rank-card casual" data-ranked="false">
          <div class="arena-rank-card-header">
            <div class="arena-rank-card-icon">🍺</div>
            <div class="arena-rank-card-name">CASUAL</div>
          </div>
          <div class="arena-rank-card-desc">
            No pressure. ELO doesn't move. No profile needed. Just argue.
          </div>
          <div class="arena-rank-card-badge">OPEN TO EVERYONE</div>
        </div>

        <div class="arena-rank-card ranked" data-ranked="true">
          <div class="arena-rank-card-header">
            <div class="arena-rank-card-icon">⚔️</div>
            <div class="arena-rank-card-name">RANKED</div>
          </div>
          <div class="arena-rank-card-desc">
            ELO on the line. Wins count. Leaderboard moves. Requires profile.
          </div>
          <div class="arena-rank-card-badge">PROFILE REQUIRED · 25%+</div>
        </div>

        <button class="arena-rank-cancel" id="arena-rank-cancel">Cancel</button>
      </div>
    `;
    document.body.appendChild(overlay);
    pushArenaState('rankedPicker');

    // Wire card clicks
    overlay.querySelectorAll('.arena-rank-card').forEach(card => {
      card.addEventListener('click', async () => {
        const isRanked = card.dataset.ranked === 'true';

        // Ranked eligibility check
        if (isRanked && !isPlaceholder()) {
          try {
            const { data, error } = await safeRpc('check_ranked_eligible');
            if (error) throw error;
            if (!data.eligible) {
              closeRankedPicker();
              // Redirect to profile with a message
              if (confirm('Ranked mode requires at least 25% profile completion. Your profile is at ' + data.profile_pct + '%. Go fill it out?')) {
                window.location.href = 'colosseum-profile-depth.html';
              }
              return;
            }
          } catch (e) {
            console.warn('[Arena] Ranked check error:', e);
          }
        }

        selectedRanked = isRanked;
        closeRankedPicker();
        showModeSelect();
      });
    });

    // Wire close
    document.getElementById('arena-rank-backdrop')?.addEventListener('click', closeRankedPicker);
    document.getElementById('arena-rank-cancel')?.addEventListener('click', closeRankedPicker);
  }

  function closeRankedPicker() {
    const overlay = document.getElementById('arena-rank-overlay');
    if (overlay) {
      overlay.remove();
      _skipNextPop = true;
      history.back();
    }
  }

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
        <div class="mod-picker-section" id="mod-picker-section">
          <div class="mod-picker-label">Moderator (optional)</div>
          <div class="mod-picker-opts" id="mod-picker-opts">
            <div class="mod-picker-opt selected" data-mod-type="none" data-mod-id="">
              <div class="mod-picker-avatar">—</div>
              <div class="mod-picker-info">
                <div class="mod-picker-name">No Moderator</div>
                <div class="mod-picker-stats">Debate without moderation</div>
              </div>
              <div class="mod-picker-check">✓</div>
            </div>
            <div class="mod-picker-opt" data-mod-type="ai" data-mod-id="">
              <div class="mod-picker-avatar">🤖</div>
              <div class="mod-picker-info">
                <div class="mod-picker-name">AI Moderator</div>
                <div class="mod-picker-stats">Instant rulings, always available</div>
              </div>
              <div class="mod-picker-check"></div>
            </div>
          </div>
          <div id="mod-picker-humans" style="margin-top:6px;"></div>
        </div>
        <button class="arena-mode-cancel" id="arena-mode-cancel">Cancel</button>
      </div>
    `;
    document.body.appendChild(overlay);
    pushArenaState('modeSelect');

    // Wire mode cards
    overlay.querySelectorAll('.arena-mode-card').forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.dataset.mode;
        const topic = document.getElementById('arena-topic-input')?.value?.trim() || '';
        // Capture selected moderator
        const selOpt = overlay.querySelector('.mod-picker-opt.selected');
        if (selOpt) {
          const modType = selOpt.dataset.modType;
          const modId = selOpt.dataset.modId;
          const modName = selOpt.querySelector('.mod-picker-name')?.textContent || '';
          selectedModerator = modType === 'none' ? null : { type: modType, id: modId || null, name: modName };
        } else {
          selectedModerator = null;
        }
        closeModeSelect();
        enterQueue(mode, topic);
      });
    });

    // Wire mod picker selection
    wireModPicker(overlay);

    // Load available human moderators
    loadAvailableModerators(overlay);

    // Wire close
    document.getElementById('arena-mode-backdrop')?.addEventListener('click', closeModeSelect);
    document.getElementById('arena-mode-cancel')?.addEventListener('click', closeModeSelect);
  }

  function closeModeSelect() {
    const overlay = document.getElementById('arena-mode-overlay');
    if (overlay) {
      overlay.remove();
      _skipNextPop = true;
      history.back();
    }
  }

  // SESSION 39: Moderator picker logic
  function wireModPicker(container) {
    container.querySelectorAll('.mod-picker-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        container.querySelectorAll('.mod-picker-opt').forEach(o => {
          o.classList.remove('selected');
          o.querySelector('.mod-picker-check').textContent = '';
        });
        opt.classList.add('selected');
        opt.querySelector('.mod-picker-check').textContent = '✓';
      });
    });
  }

  async function loadAvailableModerators(overlay) {
    if (typeof ColosseumAuth === 'undefined' || !ColosseumAuth.getAvailableModerators) return;
    const user = currentUser();
    const excludeIds = user ? [user.id] : [];
    const mods = await ColosseumAuth.getAvailableModerators(excludeIds);
    const container = overlay.querySelector('#mod-picker-humans');
    if (!container || !mods || mods.length === 0) return;

    mods.forEach(m => {
      const initial = (m.display_name || m.username || '?')[0].toUpperCase();
      const opt = document.createElement('div');
      opt.className = 'mod-picker-opt';
      opt.dataset.modType = 'human';
      opt.dataset.modId = m.id;
      opt.innerHTML = `
        <div class="mod-picker-avatar">${initial}</div>
        <div class="mod-picker-info">
          <div class="mod-picker-name">${sanitize(m.display_name || m.username)}</div>
          <div class="mod-picker-stats">Rating: ${Number(m.mod_rating).toFixed(0)} · ${m.mod_debates_total} debates · ${Number(m.mod_approval_pct).toFixed(0)}% approval</div>
        </div>
        <div class="mod-picker-check"></div>
      `;
      opt.addEventListener('click', () => {
        overlay.querySelectorAll('.mod-picker-opt').forEach(o => {
          o.classList.remove('selected');
          o.querySelector('.mod-picker-check').textContent = '';
        });
        opt.classList.add('selected');
        opt.querySelector('.mod-picker-check').textContent = '✓';
      });
      container.appendChild(opt);
    });
  }

  // ========== QUEUE ==========
  function enterQueue(mode, topic) {
    selectedMode = mode;
    view = 'queue';
    pushArenaState('queue');

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
      <div class="arena-rank-badge ${selectedRanked ? 'ranked' : 'casual'}">${selectedRanked ? '⚔️ RANKED' : '🍺 CASUAL'}</div>
      <div class="arena-queue-icon">${modeInfo.icon}</div>
      <div class="arena-queue-title">${modeInfo.name}</div>
      <div class="arena-queue-status" id="arena-queue-status">Searching for a worthy opponent...</div>
      <div class="arena-queue-timer" id="arena-queue-timer">0:00</div>
      <div class="arena-queue-elo">Your ELO: ${elo}${selectedRanked ? ' (on the line)' : ''}</div>
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
      const { data, error } = await safeRpc('join_debate_queue', {
        p_mode: mode,
        p_category: null,
        p_topic: topic || null,
        p_ranked: selectedRanked,
      });

      if (error) throw error;

      if (data.status === 'matched') {
        onMatchFound(data);
      } else {
        // Start polling for match
        queuePollTimer = setInterval(async () => {
          // SESSION 63: Guard against race condition — if timeout already fired
          // and changed view, don't process stale poll responses
          if (view !== 'queue') return;
          try {
            const { data: status, error: pollErr } = await safeRpc('check_queue_status');
            if (pollErr) throw pollErr;
            if (view !== 'queue') return; // re-check after async await
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
      if (statusEl) statusEl.textContent = ColosseumConfig?.friendlyError?.(err) || 'Queue error — try again';
    }
  }

  function onMatchFound(data) {
    clearQueueTimers();
    const statusEl = document.getElementById('arena-queue-status');
    if (statusEl) {
      statusEl.textContent = '🎯 OPPONENT FOUND!';
      statusEl.style.color = 'var(--gold)';
    }
    // Brief pause then enter pre-debate screen (or room for AI)
    setTimeout(() => {
      const debateData = {
        id: data.debate_id,
        topic: data.topic || randomFrom(AI_TOPICS),
        role: data.role || 'a',
        mode: selectedMode,
        round: 1,
        totalRounds: 3,
        opponentName: data.opponent_name || 'Opponent',
        opponentId: data.opponent_id || null,
        opponentElo: data.opponent_elo || 1200,
        ranked: selectedRanked,
        messages: [],
      };
      // AI and placeholder modes skip pre-debate
      if (selectedMode === 'ai' || !data.opponent_id) {
        enterRoom(debateData);
      } else {
        showPreDebate(debateData);
      }
    }, 1200);
  }

  // ========== SESSION 110: PRE-DEBATE SCREEN (staking + loadout) ==========
  async function showPreDebate(debateData) {
    view = 'room'; // use room view for back-button handling
    pushArenaState('preDebate');
    currentDebate = debateData;
    screenEl.innerHTML = '';

    // Reset activation state
    activatedPowerUps.clear();
    shieldActive = false;
    equippedForDebate = [];
    if (silenceTimer) { clearInterval(silenceTimer); silenceTimer = null; }

    const profile = currentProfile();
    const myName = profile?.display_name || profile?.username || 'You';
    const tokenBalance = Number(profile?.token_balance) || 0;

    const pre = document.createElement('div');
    pre.className = 'arena-pre-debate arena-fade-in';
    pre.innerHTML = `
      <div class="arena-rank-badge ${debateData.ranked ? 'ranked' : 'casual'}">${debateData.ranked ? '⚔️ RANKED' : '🍺 CASUAL'}</div>
      <div class="arena-pre-debate-title">⚔️ PREPARE FOR BATTLE</div>
      <div class="arena-pre-debate-sub">${sanitize(debateData.topic)}</div>
      <div class="arena-vs-bar" style="width:100%;max-width:360px;border-radius:12px;margin-bottom:16px;">
        <div class="arena-debater">
          <div class="arena-debater-avatar">${(myName[0] || '?').toUpperCase()}</div>
          <div class="arena-debater-info">
            <div class="arena-debater-name">${sanitize(myName)}</div>
            <div class="arena-debater-elo">${Number(profile?.elo_rating) || 1200} ELO</div>
          </div>
        </div>
        <div class="arena-vs-text">VS</div>
        <div class="arena-debater right">
          <div class="arena-debater-avatar">${(debateData.opponentName[0] || '?').toUpperCase()}</div>
          <div class="arena-debater-info" style="text-align:right;">
            <div class="arena-debater-name">${sanitize(debateData.opponentName)}</div>
            <div class="arena-debater-elo">${Number(debateData.opponentElo)} ELO</div>
          </div>
        </div>
      </div>
      <div id="pre-debate-staking" style="width:100%;max-width:360px;"></div>
      <div id="pre-debate-loadout" style="width:100%;max-width:360px;"></div>
      <button class="arena-pre-debate-enter" id="pre-debate-enter-btn">
        <span class="btn-pulse"></span> ENTER BATTLE
      </button>
    `;
    screenEl.appendChild(pre);

    // Render staking panel if available
    const stakingEl = document.getElementById('pre-debate-staking');
    if (stakingEl && typeof ColosseumStaking !== 'undefined') {
      try {
        const pool = await ColosseumStaking.getPool(debateData.id);
        const sideALabel = myName;
        const sideBLabel = debateData.opponentName;
        const qa = profile?.questions_answered || 0;
        stakingEl.innerHTML = ColosseumStaking.renderStakingPanel(debateData.id, sideALabel, sideBLabel, pool, qa);
        ColosseumStaking.wireStakingPanel(debateData.id);
      } catch (e) {
        console.warn('[Arena] Staking panel error:', e);
      }
    }

    // Render power-up loadout if available
    const loadoutEl = document.getElementById('pre-debate-loadout');
    if (loadoutEl && typeof ColosseumPowerUps !== 'undefined') {
      try {
        const puData = await ColosseumPowerUps.getMyPowerUps(debateData.id);
        loadoutEl.innerHTML = ColosseumPowerUps.renderLoadout(
          puData.inventory || [], puData.equipped || [],
          puData.questions_answered || 0, debateData.id
        );
        ColosseumPowerUps.wireLoadout(debateData.id, (result) => {
          // Refresh loadout after equipping
          showPreDebateLoadout(debateData, loadoutEl);
        });
      } catch (e) {
        console.warn('[Arena] Power-up loadout error:', e);
      }
    }

    // Wire enter button
    document.getElementById('pre-debate-enter-btn')?.addEventListener('click', async () => {
      // Fetch final equipped state before entering
      if (typeof ColosseumPowerUps !== 'undefined') {
        try {
          const finalData = await ColosseumPowerUps.getMyPowerUps(debateData.id);
          equippedForDebate = finalData.equipped || [];
        } catch (e) {
          equippedForDebate = [];
        }
      }
      enterRoom(debateData);
    });
  }

  // Helper: refresh loadout panel after equip
  async function showPreDebateLoadout(debateData, container) {
    if (!container || typeof ColosseumPowerUps === 'undefined') return;
    try {
      const puData = await ColosseumPowerUps.getMyPowerUps(debateData.id);
      container.innerHTML = ColosseumPowerUps.renderLoadout(
        puData.inventory || [], puData.equipped || [],
        puData.questions_answered || 0, debateData.id
      );
      ColosseumPowerUps.wireLoadout(debateData.id, () => {
        showPreDebateLoadout(debateData, container);
      });
    } catch (e) { /* silent */ }
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
      safeRpc('leave_debate_queue').catch(() => {});
    }
  }

  function leaveQueue() {
    clearQueueTimers();
    if (!isPlaceholder()) {
      safeRpc('leave_debate_queue').catch(() => {});
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
        const { data, error } = await safeRpc('create_ai_debate', { p_category: 'general', p_topic: chosenTopic });
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
      ranked: false,
      messages: [],
    });
  }

  // ========== DEBATE ROOM ==========
  function enterRoom(debate) {
    view = 'room';
    pushArenaState('room');
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
        <div class="arena-rank-badge ${debate.ranked ? 'ranked' : 'casual'}" style="margin-bottom:6px">${debate.ranked ? '⚔️ RANKED' : '🍺 CASUAL'}</div>
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
            <div class="arena-debater-elo">${Number(myElo)} ELO <span style="color:#D4A843;margin-left:6px;font-size:11px;">🪙 ${Number(profile?.token_balance) || 0}</span></div>
          </div>
        </div>
        <div class="arena-vs-text">VS</div>
        <div class="arena-debater right">
          <div class="arena-debater-avatar ${isAI ? 'ai-avatar' : ''}">${isAI ? '🤖' : oppInitial}</div>
          <div class="arena-debater-info" style="text-align:right;">
            <div class="arena-debater-name">${sanitize(debate.opponentName)}</div>
            <div class="arena-debater-elo">${Number(debate.opponentElo)} ELO</div>
          </div>
        </div>
      </div>
      <!-- TODO: E131 Share Live Debate Link — needs spectator flow (E153/E155/E156) wired first
           so shared links have a destination page for viewers. -->
      <div id="staking-panel-container"></div>
      <div id="powerup-loadout-container"></div>
      <div class="arena-spectator-bar"><span class="eye">👁️</span> <span id="arena-spectator-count">0</span> watching</div>
      <div class="arena-messages" id="arena-messages"></div>
      <div class="arena-input-area" id="arena-input-area"></div>
    `;
    screenEl.appendChild(room);

    // Add system message
    addSystemMessage(`Round ${debate.round} — Make your argument.`);

    // SESSION 39: Assign selected moderator
    if (selectedModerator && debate.id) {
      assignSelectedMod(debate.id);
      debate.moderatorType = selectedModerator.type;
      debate.moderatorId = selectedModerator.id || null;
      debate.moderatorName = selectedModerator.name || (selectedModerator.type === 'ai' ? 'AI Moderator' : 'Moderator');
      // Add mod bar
      const vsBar = room.querySelector('.arena-vs-bar');
      if (vsBar) {
        const modBar = document.createElement('div');
        modBar.className = 'arena-mod-bar';
        modBar.innerHTML = `<span class="mod-icon">⚖️</span> Moderator: ${sanitize(debate.moderatorName)}`;
        vsBar.parentNode.insertBefore(modBar, vsBar.nextSibling);
      }
    }

    // SESSION 109: Load staking panel
    if (typeof ColosseumStaking !== 'undefined' && debate.id && !debate.id.startsWith('placeholder-')) {
      (async () => {
        try {
          const poolData = await ColosseumStaking.getPool(debate.id);
          const stakingContainer = document.getElementById('staking-panel-container');
          if (stakingContainer) {
            const sideALabel = sanitize(myName);
            const sideBLabel = sanitize(debate.opponentName);
            stakingContainer.innerHTML = ColosseumStaking.renderStakingPanel(
              debate.id, sideALabel, sideBLabel, poolData,
              profile?.questions_answered || 0
            );
            ColosseumStaking.wireStakingPanel(debate.id, (result) => {
              // After stake placed, refresh the panel to show updated pool
              ColosseumStaking.getPool(debate.id).then(updated => {
                if (stakingContainer) {
                  stakingContainer.innerHTML = ColosseumStaking.renderStakingPanel(
                    debate.id, sideALabel, sideBLabel, updated,
                    profile?.questions_answered || 0
                  );
                }
              });
            });
          }
        } catch (e) {
          console.warn('[Arena] Staking panel load error:', e);
        }
      })();
    }

    // SESSION 109: Load power-up loadout
    if (typeof ColosseumPowerUps !== 'undefined' && debate.id && !debate.id.startsWith('placeholder-')) {
      (async () => {
        try {
          const data = await ColosseumPowerUps.getMyPowerUps(debate.id);
          const loadoutContainer = document.getElementById('powerup-loadout-container');
          if (loadoutContainer && data) {
            loadoutContainer.innerHTML = ColosseumPowerUps.renderLoadout(
              data.inventory, data.equipped,
              profile?.questions_answered || 0, debate.id
            );
            ColosseumPowerUps.wireLoadout(debate.id, async () => {
              // After equip/unequip, refresh the loadout display
              const refreshed = await ColosseumPowerUps.getMyPowerUps(debate.id);
              if (loadoutContainer && refreshed) {
                loadoutContainer.innerHTML = ColosseumPowerUps.renderLoadout(
                  refreshed.inventory, refreshed.equipped,
                  profile?.questions_answered || 0, debate.id
                );
                ColosseumPowerUps.wireLoadout(debate.id);
              }
            });
          }
        } catch (e) {
          console.warn('[Arena] Power-up loadout load error:', e);
        }
      })();
    }

    // Render mode-specific controls
    renderInputControls(debate.mode);

    // SESSION 39: Add reference button for non-AI modes
    addReferenceButton();

    // SESSION 110: Add power-up activation bar if equipped
    if (equippedForDebate.length > 0 && typeof ColosseumPowerUps !== 'undefined') {
      const barHtml = ColosseumPowerUps.renderActivationBar(equippedForDebate);
      if (barHtml) {
        const messagesEl = room.querySelector('.arena-messages');
        if (messagesEl) {
          const barContainer = document.createElement('div');
          barContainer.innerHTML = barHtml;
          messagesEl.parentNode.insertBefore(barContainer.firstElementChild, messagesEl.nextSibling);
        }
        // Wire activation handlers
        ColosseumPowerUps.wireActivationBar(debate.id, {
          onSilence: () => {
            addSystemMessage('🤫 You silenced ' + sanitize(debate.opponentName) + ' for 10 seconds!');
            silenceTimer = ColosseumPowerUps.renderSilenceOverlay(debate.opponentName);
            activatedPowerUps.add('silence');
          },
          onShield: () => {
            shieldActive = true;
            ColosseumPowerUps.renderShieldIndicator();
            addSystemMessage('🛡️ Shield activated! Your next reference challenge will be blocked.');
            activatedPowerUps.add('shield');
          },
          onReveal: async () => {
            addSystemMessage('👁️ Revealing opponent\'s power-ups...');
            const oppData = await ColosseumPowerUps.getOpponentPowerUps(debate.id);
            if (oppData.success) {
              ColosseumPowerUps.renderRevealPopup(oppData.equipped || []);
            } else {
              addSystemMessage('Could not reveal opponent\'s loadout.');
            }
            activatedPowerUps.add('reveal');
          }
        });
        // Show passive multiplier badge in system message
        if (ColosseumPowerUps.hasMultiplier(equippedForDebate)) {
          addSystemMessage('⚡ 2x Multiplier active — staking payouts doubled if you win!');
        }
      }
    }

    // SESSION 39: Start reference polling if moderator assigned
    if (selectedModerator && debate.id && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
      startReferencePoll(debate.id);
    }

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
        await safeRpc('submit_debate_message', {
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
        await safeRpc('submit_debate_message', {
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

      // SESSION 52: Authorization header required — Edge Function has JWT verification on by default
      const anonKey = (typeof ColosseumConfig !== 'undefined') ? ColosseumConfig.SUPABASE_ANON_KEY : null;
      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(anonKey ? { 'Authorization': 'Bearer ' + anonKey } : {}),
        },
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
      document.getElementById('arena-audio-status').textContent = 'Mic access blocked. Check your browser settings.';
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
  async function endCurrentDebate() {
    view = 'postDebate';
    pushArenaState('postDebate');
    clearInterval(roundTimer);
    stopReferencePoll();

    const debate = currentDebate;

    // Clean up live audio
    if (debate.mode === 'live' && typeof ColosseumWebRTC !== 'undefined') {
      ColosseumWebRTC.leaveDebate();
    }

    // Generate scores — random only for AI sparring/placeholder; draw for real matches
    let scoreA, scoreB;
    if (debate.mode === 'ai' || !debate.opponentId) {
      // AI sparring — random scoring is fine
      scoreA = 60 + Math.floor(Math.random() * 30);
      scoreB = 60 + Math.floor(Math.random() * 30);
    } else {
      // Real match — equal scores until proper scoring exists
      scoreA = 70;
      scoreB = 70;
    }
    const winner = scoreA >= scoreB ? 'a' : 'b';
    const didWin = winner === debate.role;

    // Update Supabase — now returns Elo changes for ranked
    let eloChangeMe = 0;
    let eloChangeOpp = 0;
    if (!isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
      try {
        const { data: result, error } = await safeRpc('update_arena_debate', {
          p_debate_id: debate.id,
          p_status: 'complete',
          p_current_round: debate.round || 1,
          p_winner: winner,
          p_score_a: scoreA,
          p_score_b: scoreB,
        });
        if (!error && result && result.ranked) {
          eloChangeMe = debate.role === 'a' ? result.elo_change_a : result.elo_change_b;
          eloChangeOpp = debate.role === 'a' ? result.elo_change_b : result.elo_change_a;
        }
      } catch (e) {
        console.warn('[Arena] Finalize error:', e);
      }
      // SESSION 109: Settle stakes — distribute winnings
      if (typeof ColosseumStaking !== 'undefined') {
        try {
          await ColosseumStaking.settleStakes(debate.id, winner);
        } catch (e) {
          console.warn('[Arena] Stake settlement error:', e);
        }
      }
      // Session 71: Token earn for debate completion
      if (typeof ColosseumTokens !== 'undefined') {
        if (debate.mode === 'ai') {
          ColosseumTokens.claimAiSparring(debate.id);
        } else {
          ColosseumTokens.claimDebate(debate.id);
        }
      }
      // Session 110: Settle stakes
      if (typeof ColosseumStaking !== 'undefined') {
        try {
          const hasMulti = typeof ColosseumPowerUps !== 'undefined' && ColosseumPowerUps.hasMultiplier(equippedForDebate);
          const stakeResult = await ColosseumStaking.settleStakes(debate.id, winner, hasMulti ? 2 : 1);
          debate._stakingResult = stakeResult; // attach for post-debate display
        } catch (e) {
          console.warn('[Arena] Settle stakes error:', e);
        }
      }
    }

    // Session 110: Clean up power-up state
    if (silenceTimer) { clearInterval(silenceTimer); silenceTimer = null; }
    ColosseumPowerUps?.removeShieldIndicator?.();
    shieldActive = false;
    activatedPowerUps.clear();
    document.getElementById('powerup-silence-overlay')?.remove();
    document.getElementById('powerup-reveal-popup')?.remove();

    // Render post-debate screen
    const profile = currentProfile();
    const myName = profile?.display_name || 'You';
    const myElo = profile?.elo_rating || 1200;

    // Elo change display
    const eloSign = eloChangeMe >= 0 ? '+' : '';
    const eloClass = eloChangeMe > 0 ? 'positive' : eloChangeMe < 0 ? 'negative' : 'neutral';
    const eloHtml = debate.ranked
      ? `<div class="arena-elo-change ${eloClass}">${eloSign}${eloChangeMe} ELO</div>`
      : `<div class="arena-elo-change neutral">Casual — No Rating Change</div>`;

    screenEl.innerHTML = '';
    const post = document.createElement('div');
    post.className = 'arena-post arena-fade-in';
    post.innerHTML = `
      <div class="arena-rank-badge ${debate.ranked ? 'ranked' : 'casual'}">${debate.ranked ? '⚔️ RANKED' : '🍺 CASUAL'}</div>
      <div class="arena-post-verdict">${didWin ? '🏆' : '💀'}</div>
      <div class="arena-post-title">${didWin ? 'VICTORY' : 'DEFEAT'}</div>
      ${eloHtml}
      ${debate._stakingResult && debate._stakingResult.payout != null ? `
      <div class="arena-staking-result">
        <div class="arena-staking-result-title">🪙 STAKING RESULTS</div>
        <div class="arena-staking-result-amount ${debate._stakingResult.payout > 0 ? 'won' : debate._stakingResult.payout < 0 ? 'lost' : 'none'}">
          ${debate._stakingResult.payout > 0 ? '+' : ''}${debate._stakingResult.payout} tokens
        </div>
        ${ColosseumPowerUps?.hasMultiplier?.(equippedForDebate) ? '<div class="arena-staking-result-detail">⚡ 2x Multiplier applied</div>' : ''}
      </div>` : ''}
      <div class="arena-post-topic">${sanitize(debate.topic)}</div>
      <div class="arena-post-score">
        <div class="arena-post-side">
          <div class="arena-post-side-label">${sanitize(myName)}</div>
          <div class="arena-post-side-score ${debate.role === winner ? 'winner' : 'loser'}">${Number(debate.role === 'a' ? scoreA : scoreB)}</div>
        </div>
        <div class="arena-post-divider">—</div>
        <div class="arena-post-side">
          <div class="arena-post-side-label${debate.opponentId ? ' arena-clickable-opp' : ''}" ${debate.opponentId ? `data-opp-id="${sanitize(debate.opponentId)}"` : ''}>${sanitize(debate.opponentName)}</div>
          <div class="arena-post-side-score ${debate.role !== winner ? 'winner' : 'loser'}">${Number(debate.role === 'a' ? scoreB : scoreA)}</div>
        </div>
      </div>
      ${debate.opponentId && debate.mode !== 'ai' ? `
      <div class="arena-post-actions" style="margin-bottom:0">
        <button class="arena-post-btn secondary" id="arena-add-rival">⚔️ ADD RIVAL</button>
      </div>` : ''}
      <div class="arena-post-actions">
        <button class="arena-post-btn primary" id="arena-rematch">⚔️ REMATCH</button>
        <button class="arena-post-btn secondary" id="arena-share-result">🔗 SHARE</button>
        ${debate.messages && debate.messages.length > 0 ? '<button class="arena-post-btn secondary" id="arena-transcript">📝 TRANSCRIPT</button>' : ''}
        <button class="arena-post-btn secondary" id="arena-back-to-lobby">← LOBBY</button>
      </div>
    `;
    screenEl.appendChild(post);

    // SESSION 39: Moderator scoring section
    if (debate.moderatorId && debate.moderatorName) {
      renderModScoring(debate, post);
    }

    document.getElementById('arena-rematch')?.addEventListener('click', () => {
      selectedRanked = debate.ranked || false;
      enterQueue(debate.mode, debate.topic);
    });
    document.getElementById('arena-share-result')?.addEventListener('click', () => {
      if (typeof ColosseumShare !== 'undefined' && ColosseumShare.shareResult) {
        ColosseumShare.shareResult({
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

    // E144: Add as Rival
    document.getElementById('arena-add-rival')?.addEventListener('click', async () => {
      if (!debate.opponentId) return;
      const btn = document.getElementById('arena-add-rival');
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Adding...'; }
      try {
        if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.declareRival) {
          const result = await ColosseumAuth.declareRival(debate.opponentId);
          if (result && !result.error) {
            if (btn) btn.textContent = '✅ RIVAL ADDED';
            if (ColosseumConfig?.showToast) ColosseumConfig.showToast('⚔️ Rival declared!', 'success');
          } else {
            if (btn) { btn.textContent = '⚔️ ADD RIVAL'; btn.disabled = false; }
            if (ColosseumConfig?.showToast) ColosseumConfig.showToast('Could not add rival', 'error');
          }
        }
      } catch (e) {
        if (btn) { btn.textContent = '⚔️ ADD RIVAL'; btn.disabled = false; }
      }
    });

    // E145/E149: Tap opponent name → profile modal
    post.querySelector('.arena-clickable-opp')?.addEventListener('click', () => {
      if (!debate.opponentId) return;
      if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.showUserProfile) {
        ColosseumAuth.showUserProfile(debate.opponentId);
      }
    });

    // SESSION 113: Transcript view
    document.getElementById('arena-transcript')?.addEventListener('click', () => {
      document.getElementById('arena-transcript-overlay')?.remove();

      const profile = currentProfile();
      const myName = profile?.display_name || 'You';
      const msgs = debate.messages || [];

      const overlay = document.createElement('div');
      overlay.id = 'arena-transcript-overlay';
      overlay.className = 'arena-transcript-overlay';

      let lastRound = 0;
      let msgHtml = '';
      if (msgs.length === 0) {
        msgHtml = '<div class="arena-transcript-empty">No messages recorded.</div>';
      } else {
        msgs.forEach(m => {
          if (m.round !== lastRound) {
            msgHtml += `<div class="arena-transcript-round">— Round ${m.round} —</div>`;
            lastRound = m.round;
          }
          const isMe = m.role === 'user';
          const side = isMe ? debate.role : (debate.role === 'a' ? 'b' : 'a');
          const name = isMe ? myName : debate.opponentName;
          msgHtml += `<div class="arena-transcript-msg side-${side}">
            <div class="t-name">${sanitize(name)}</div>
            <div class="t-text">${sanitize(m.text)}</div>
          </div>`;
        });
      }

      overlay.innerHTML = `
        <div class="arena-transcript-sheet">
          <div class="arena-transcript-header">
            <div class="arena-transcript-handle"></div>
            <div class="arena-transcript-title">📝 DEBATE TRANSCRIPT</div>
            <div class="arena-transcript-topic">${sanitize(debate.topic)}</div>
          </div>
          <div class="arena-transcript-body">${msgHtml}</div>
        </div>`;

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });
      document.body.appendChild(overlay);
    });
  }

  // ========== SESSION 39: MODERATOR UI ==========

  // Assign moderator after debate is created
  async function assignSelectedMod(debateId) {
    if (!selectedModerator || isPlaceholder()) return;
    if (!debateId || debateId.startsWith('ai-local-') || debateId.startsWith('placeholder-')) return;
    try {
      if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.assignModerator) {
        await ColosseumAuth.assignModerator(debateId, selectedModerator.id, selectedModerator.type);
      }
    } catch (e) {
      console.warn('[Arena] Moderator assignment failed:', e);
    }
  }

  // Add reference submit button to input area
  function addReferenceButton() {
    const inputArea = document.getElementById('arena-input-area');
    if (!inputArea) return;
    // Don't add for AI sparring mode
    if (currentDebate?.mode === 'ai') return;

    const existing = document.getElementById('arena-ref-btn');
    if (existing) return;

    const btn = document.createElement('button');
    btn.className = 'arena-ref-btn';
    btn.id = 'arena-ref-btn';
    btn.innerHTML = '📎 EVIDENCE';
    btn.addEventListener('click', showReferenceForm);
    inputArea.appendChild(btn);
  }

  function showReferenceForm() {
    // Remove existing form
    hideReferenceForm();
    const debate = currentDebate;
    if (!debate) return;

    const form = document.createElement('div');
    form.className = 'arena-ref-form arena-fade-in';
    form.id = 'arena-ref-form';
    form.innerHTML = `
      <input type="url" id="arena-ref-url" placeholder="URL (optional)" autocomplete="off">
      <textarea id="arena-ref-desc" placeholder="Describe the evidence..." maxlength="500" rows="2"></textarea>
      <div class="arena-ref-side-row">
        <button class="arena-ref-side-btn" data-side="a">Supports Side A</button>
        <button class="arena-ref-side-btn" data-side="b">Supports Side B</button>
      </div>
      <div class="arena-ref-actions">
        <button class="arena-ref-submit" id="arena-ref-submit-btn">SUBMIT EVIDENCE</button>
        <button class="arena-ref-cancel" id="arena-ref-cancel-btn">✕</button>
      </div>
    `;

    const messages = document.getElementById('arena-messages');
    if (messages) {
      messages.parentNode.insertBefore(form, messages.nextSibling);
    } else {
      screenEl.appendChild(form);
    }

    // Wire side buttons
    let selectedSide = null;
    form.querySelectorAll('.arena-ref-side-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        form.querySelectorAll('.arena-ref-side-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSide = btn.dataset.side;
      });
    });

    document.getElementById('arena-ref-submit-btn')?.addEventListener('click', async () => {
      const url = document.getElementById('arena-ref-url')?.value?.trim() || '';
      const desc = document.getElementById('arena-ref-desc')?.value?.trim() || '';
      if (!url && !desc) return;

      const submitBtn = document.getElementById('arena-ref-submit-btn');
      if (submitBtn) { submitBtn.textContent = '⏳'; submitBtn.disabled = true; }

      if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.submitReference) {
        const result = await ColosseumAuth.submitReference(debate.id, url, desc, selectedSide);
        if (result?.error) {
          addSystemMessage('❌ ' + (ColosseumConfig?.friendlyError?.(result.error) || result.error));
        } else {
          addSystemMessage('📎 Evidence submitted — awaiting moderator ruling');
          // SESSION 39: AI moderator auto-rules
          if (debate.moderatorType === 'ai' && result?.reference_id) {
            requestAIModRuling(debate, result.reference_id, url, desc, selectedSide);
          }
        }
      }
      hideReferenceForm();
    });

    document.getElementById('arena-ref-cancel-btn')?.addEventListener('click', hideReferenceForm);
  }

  function hideReferenceForm() {
    document.getElementById('arena-ref-form')?.remove();
  }

  // Moderator ruling panel — shown when there are pending references
  function showRulingPanel(ref) {
    // Remove existing
    document.getElementById('mod-ruling-overlay')?.remove();

    const sideLabel = ref.supports_side === 'a' ? 'Side A' : ref.supports_side === 'b' ? 'Side B' : 'Neutral';

    const overlay = document.createElement('div');
    overlay.className = 'mod-ruling-overlay';
    overlay.id = 'mod-ruling-overlay';
    overlay.innerHTML = `
      <div class="mod-ruling-backdrop"></div>
      <div class="mod-ruling-sheet">
        <div class="mod-ruling-handle"></div>
        <div class="mod-ruling-title">⚖️ RULING NEEDED</div>
        <div class="mod-ruling-sub">Evidence submitted by ${sanitize(ref.submitter_name || 'Unknown')}</div>
        <div class="mod-ruling-timer" id="mod-ruling-timer">60s auto-allow</div>
        <div class="mod-ruling-ref">
          <div class="mod-ruling-ref-meta">ROUND ${ref.round || '?'} · ${sideLabel}</div>
          ${ref.url ? `<div class="mod-ruling-ref-url">${sanitize(ref.url)}</div>` : ''}
          ${ref.description ? `<div class="mod-ruling-ref-desc">${sanitize(ref.description)}</div>` : ''}
          <div class="mod-ruling-ref-side">Supports: ${sideLabel}</div>
        </div>
        <textarea class="mod-ruling-reason" id="mod-ruling-reason" placeholder="Reason for ruling (optional)" maxlength="300"></textarea>
        <div class="mod-ruling-btns">
          <button class="mod-ruling-allow" id="mod-ruling-allow">✅ ALLOW</button>
          <button class="mod-ruling-deny" id="mod-ruling-deny">❌ DENY</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Auto-allow countdown — SESSION 63: stored in module var for cleanup on back/transition
    let countdown = 60;
    const timerEl = overlay.querySelector('#mod-ruling-timer');
    if (_rulingCountdownTimer) clearInterval(_rulingCountdownTimer);
    _rulingCountdownTimer = setInterval(() => {
      countdown--;
      if (timerEl) timerEl.textContent = countdown + 's auto-allow';
      if (countdown <= 0) {
        clearInterval(_rulingCountdownTimer);
        _rulingCountdownTimer = null;
        overlay.remove();
        // Auto-allow: call the RPC so evidence is marked allowed in the database
        if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.ruleOnReference) {
          ColosseumAuth.ruleOnReference(ref.id, 'allowed', 'Auto-allowed (moderator timeout)').catch(() => {});
        }
      }
    }, 1000);

    // Wire buttons
    overlay.querySelector('#mod-ruling-allow')?.addEventListener('click', async () => {
      clearInterval(_rulingCountdownTimer);
      _rulingCountdownTimer = null;
      const reason = document.getElementById('mod-ruling-reason')?.value?.trim() || '';
      if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.ruleOnReference) {
        const result = await ColosseumAuth.ruleOnReference(ref.id, 'allowed', reason);
        if (result?.error) {
          addSystemMessage('❌ Ruling failed: ' + (ColosseumConfig?.friendlyError?.(result.error) || result.error));
        } else {
          addSystemMessage('✅ Evidence ALLOWED by moderator' + (reason ? ': ' + reason : ''));
        }
      }
      overlay.remove();
    });

    overlay.querySelector('#mod-ruling-deny')?.addEventListener('click', async () => {
      clearInterval(_rulingCountdownTimer);
      _rulingCountdownTimer = null;
      const reason = document.getElementById('mod-ruling-reason')?.value?.trim() || '';
      if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.ruleOnReference) {
        const result = await ColosseumAuth.ruleOnReference(ref.id, 'denied', reason);
        if (result?.error) {
          addSystemMessage('❌ Ruling failed: ' + (ColosseumConfig?.friendlyError?.(result.error) || result.error));
        } else {
          addSystemMessage('❌ Evidence DENIED by moderator' + (reason ? ': ' + reason : ''));
        }
      }
      overlay.remove();
    });

    // Close on backdrop tap
    overlay.querySelector('.mod-ruling-backdrop')?.addEventListener('click', () => {
      // Don't close — moderator must rule. But allow dismiss if they tap backdrop 3 times.
    });
  }

  // Poll for pending references (moderator view)
  function startReferencePoll(debateId) {
    if (referencePollTimer) clearInterval(referencePollTimer);
    const seenRefs = new Set();

    referencePollTimer = setInterval(async () => {
      if (typeof ColosseumAuth === 'undefined' || !ColosseumAuth.getDebateReferences) return;
      const refs = await ColosseumAuth.getDebateReferences(debateId);
      const profile = currentProfile();
      if (!profile || !refs) return;

      // Check if we're the moderator — show ruling panel for pending refs
      const debate = currentDebate;
      if (debate?.moderatorId && debate.moderatorId === profile.id) {
        refs.filter(r => r.ruling === 'pending' && !seenRefs.has(r.id)).forEach(ref => {
          seenRefs.add(ref.id);
          showRulingPanel(ref);
        });
      }

      // For debaters — show system messages for rulings
      refs.filter(r => (r.ruling === 'allowed' || r.ruling === 'denied') && !seenRefs.has(r.id + '-ruled')).forEach(ref => {
        seenRefs.add(ref.id + '-ruled');
        // SESSION 110: Shield blocks reference denials
        if (ref.ruling === 'denied' && shieldActive) {
          shieldActive = false;
          ColosseumPowerUps?.removeShieldIndicator?.();
          addSystemMessage('🛡️ SHIELD BLOCKED a reference denial! Evidence stays.');
          return;
        }
        const icon = ref.ruling === 'allowed' ? '✅' : '❌';
        addSystemMessage(`${icon} Evidence ${ref.ruling.toUpperCase()}${ref.ruling_reason ? ': ' + ref.ruling_reason : ''}`);
      });
    }, 3000);
  }

  function stopReferencePoll() {
    if (referencePollTimer) { clearInterval(referencePollTimer); referencePollTimer = null; }
  }

  // SESSION 39: Call AI Moderator Edge Function for auto-ruling
  async function requestAIModRuling(debate, referenceId, url, description, supportsSide) {
    try {
      const supabaseUrl = (typeof ColosseumConfig !== 'undefined' && ColosseumConfig.SUPABASE_URL)
        ? ColosseumConfig.SUPABASE_URL : null;
      if (!supabaseUrl) throw new Error('No supabase URL');

      const edgeUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1/ai-moderator';

      // Build debate context from recent messages
      const recentMessages = (debate.messages || []).slice(-6).map(m =>
        `${m.role === 'user' ? 'Side A' : 'Side B'} (R${m.round}): ${m.text}`
      ).join('\n');

      // SESSION 63: Authorization header required — Edge Functions verify JWT by default (same as ai-sparring)
      const anonKey = (typeof ColosseumConfig !== 'undefined') ? ColosseumConfig.SUPABASE_ANON_KEY : null;
      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(anonKey ? { 'Authorization': 'Bearer ' + anonKey } : {}),
        },
        body: JSON.stringify({
          topic: debate.topic,
          reference: { url, description, supports_side: supportsSide },
          round: debate.round,
          debateContext: recentMessages || null,
        }),
      });

      if (!res.ok) throw new Error('Edge Function error: ' + res.status);

      const data = await res.json();
      const ruling = data?.ruling || 'allowed';
      const reason = data?.reason || 'AI ruling.';

      // Apply the ruling via RPC
      if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.ruleOnReference) {
        const result = await ColosseumAuth.ruleOnReference(referenceId, ruling, '🤖 ' + reason, 'ai');
        if (result?.error) {
          console.warn('[Arena] AI mod ruling RPC failed:', result.error);
          // Still show the ruling in chat
        }
      }

      const icon = ruling === 'allowed' ? '✅' : '❌';
      addSystemMessage(`${icon} AI Moderator: Evidence ${ruling.toUpperCase()} — ${reason}`);

    } catch (err) {
      console.warn('[Arena] AI Moderator Edge Function failed:', err.message);
      // Fallback: auto-allow per LM-087
      if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.ruleOnReference) {
        await ColosseumAuth.ruleOnReference(referenceId, 'allowed', '🤖 Auto-allowed (AI moderator unavailable)', 'ai');
      }
      addSystemMessage('✅ AI Moderator: Evidence AUTO-ALLOWED (moderator unavailable)');
    }
  }

  // Post-debate moderator scoring section
  function renderModScoring(debate, container) {
    if (!debate.moderatorId || !debate.moderatorName) return;
    const profile = currentProfile();
    if (!profile) return;

    const isDebater = (profile.id === debate.debater_a || profile.id === debate.debater_b);
    const isMod = (profile.id === debate.moderatorId);
    if (isMod) return; // Can't score yourself

    const section = document.createElement('div');
    section.className = 'mod-score-section';

    if (isDebater) {
      // Debaters: 0 (unhappy) or 25 (happy)
      section.innerHTML = `
        <div class="mod-score-title">RATE THE MODERATOR</div>
        <div class="mod-score-card">
          <div class="mod-score-name">⚖️ ${sanitize(debate.moderatorName)}</div>
          <div class="mod-score-btns">
            <button class="mod-score-btn happy" data-score="25">👍 FAIR</button>
            <button class="mod-score-btn unhappy" data-score="0">👎 UNFAIR</button>
          </div>
          <div class="mod-scored" id="mod-scored" style="display:none;"></div>
        </div>
      `;
    } else {
      // Spectators: 1-50 slider
      section.innerHTML = `
        <div class="mod-score-title">RATE THE MODERATOR</div>
        <div class="mod-score-card">
          <div class="mod-score-name">⚖️ ${sanitize(debate.moderatorName)}</div>
          <div class="mod-score-slider-row">
            <input type="range" class="mod-score-slider" id="mod-score-slider" min="1" max="50" value="25">
            <div class="mod-score-val" id="mod-score-val">25</div>
          </div>
          <button class="mod-score-submit" id="mod-score-submit">SUBMIT SCORE</button>
          <div class="mod-scored" id="mod-scored" style="display:none;"></div>
        </div>
      `;
    }

    container.appendChild(section);

    // Wire debater buttons
    section.querySelectorAll('.mod-score-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const score = parseInt(btn.dataset.score);
        section.querySelectorAll('.mod-score-btn').forEach(b => { b.disabled = true; b.style.opacity = '0.4'; });
        if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.scoreModerator) {
          const result = await ColosseumAuth.scoreModerator(debate.id, score);
          const scoredEl = document.getElementById('mod-scored');
          if (result?.error) {
            if (scoredEl) { scoredEl.textContent = '❌ ' + (ColosseumConfig?.friendlyError?.(result.error) || result.error); scoredEl.style.display = 'block'; scoredEl.style.color = 'var(--red)'; }
          } else {
            if (scoredEl) { scoredEl.textContent = '✅ Score submitted'; scoredEl.style.display = 'block'; }
          }
        }
      });
    });

    // Wire spectator slider + submit
    const slider = document.getElementById('mod-score-slider');
    const valEl = document.getElementById('mod-score-val');
    if (slider && valEl) {
      slider.addEventListener('input', () => { valEl.textContent = slider.value; });
    }
    document.getElementById('mod-score-submit')?.addEventListener('click', async () => {
      const score = parseInt(slider?.value || 25);
      const submitBtn = document.getElementById('mod-score-submit');
      if (submitBtn) { submitBtn.textContent = '⏳'; submitBtn.disabled = true; }
      if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.scoreModerator) {
        const result = await ColosseumAuth.scoreModerator(debate.id, score);
        const scoredEl = document.getElementById('mod-scored');
        if (result?.error) {
          if (scoredEl) { scoredEl.textContent = '❌ ' + (ColosseumConfig?.friendlyError?.(result.error) || result.error); scoredEl.style.display = 'block'; scoredEl.style.color = 'var(--red)'; }
          if (submitBtn) { submitBtn.textContent = 'SUBMIT SCORE'; submitBtn.disabled = false; }
        } else {
          if (scoredEl) { scoredEl.textContent = '✅ Score submitted'; scoredEl.style.display = 'block'; }
          if (submitBtn) submitBtn.remove();
        }
      }
    });
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
