/**
 * THE COLOSSEUM — Arena Module (TypeScript)
 *
 * Typed mirror of colosseum-arena.js. Debate arena, matchmaking, debate room.
 * 4 modes: Live Audio, Voice Memo, Text Battle, AI Sparring.
 * Ranked vs Casual, moderator UX, power-up integration, staking settlement.
 *
 * Source of truth for runtime: colosseum-arena.js (until Phase 4 cutover)
 * Source of truth for types: this file
 *
 * NOTE: The runtime .js file is 2500+ lines, largely CSS injection and HTML
 * templates. This TypeScript mirror types ALL function signatures, state, and
 * interfaces. Render functions reference the same HTML templates — full HTML
 * lives in colosseum-arena.js.
 *
 * Migration: Session 127 (Phase 3). ES imports: Session 141.
 */

import {
  safeRpc, getSupabaseClient, getCurrentUser, getCurrentProfile,
  assignModerator, getDebateReferences, declareRival, showUserProfile,
  submitReference, ruleOnReference, scoreModerator, getAvailableModerators,
  ready,
} from './auth.ts';
import {
  escapeHTML, SUPABASE_URL, SUPABASE_ANON_KEY, isAnyPlaceholder,
  showToast, friendlyError,
} from './config.ts';
import { claimDebate, claimAiSparring } from './tokens.ts';
import { settleStakes, getPool, renderStakingPanel, wireStakingPanel } from './staking.ts';
import {
  hasMultiplier, buy as buyPowerUp, getMyPowerUps, renderShop,
  renderLoadout, wireLoadout, renderActivationBar, wireActivationBar,
  renderSilenceOverlay, renderRevealPopup, renderShieldIndicator,
  removeShieldIndicator, getOpponentPowerUps,
} from './powerups.ts';
import {
  joinDebate, leaveDebate, on as onWebRTC,
  toggleMute, createWaveform, getLocalStream,
} from './webrtc.ts';
import { startRecording, stopRecording, retake as vmRetake, send as vmSend } from './voicememo.ts';
import { shareResult } from './share.ts';
import type { SafeRpcResult } from './auth.ts';
import type { SettleResult, PoolData, StakeResult } from './staking.ts';
import type { EquippedItem, InventoryItem, PowerUpResult } from './powerups.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type ArenaView = 'lobby' | 'modeSelect' | 'queue' | 'room' | 'preDebate' | 'postDebate';
export type DebateMode = 'live' | 'voicememo' | 'text' | 'ai';
export type DebateStatus = 'pending' | 'lobby' | 'matched' | 'live' | 'completed' | 'complete';
export type DebateRole = 'a' | 'b';

export interface ModeInfo {
  readonly id: DebateMode;
  readonly icon: string;
  readonly name: string;
  readonly desc: string;
  readonly available: string;
  readonly color: string;
}

export interface DebateMessage {
  role: 'user' | 'assistant';
  text: string;
  round: number;
}

export interface CurrentDebate {
  id: string;
  topic: string;
  role: DebateRole;
  mode: DebateMode;
  round: number;
  totalRounds: number;
  opponentName: string;
  opponentId?: string | null;
  opponentElo: number | string;
  ranked: boolean;
  messages: DebateMessage[];
  moderatorType?: string | null;
  moderatorId?: string | null;
  moderatorName?: string | null;
  _stakingResult?: SettleResult | null;
  debater_a?: string;
  debater_b?: string;
}

export interface SelectedModerator {
  type: 'human' | 'ai';
  id: string | null;
  name: string;
}

export interface MatchData {
  debate_id: string;
  topic?: string;
  role?: DebateRole;
  opponent_name?: string;
  opponent_id?: string | null;
  opponent_elo?: number;
  status?: string;
}

export interface ArenaFeedItem {
  id: string;
  topic?: string;
  status: string;
  source?: string;
  vote_count_a?: number;
  vote_count_b?: number;
  score_a?: number | null;
  score_b?: number | null;
  debater_a_name?: string;
  debater_b_name?: string;
}

export interface AutoDebateItem {
  id: string;
  topic: string;
  side_a_label: string;
  side_b_label: string;
  score_a: number;
  score_b: number;
  status: string;
  created_at: string;
}

export interface AvailableModerator {
  id: string;
  display_name?: string;
  username?: string;
  mod_rating: number;
  mod_debates_total: number;
  mod_approval_pct: number;
}

export interface PowerUpEquipped {
  power_up_id: string;
  name: string;
  type: string;
  activated: boolean;
}

interface RankedCheckResult {
  eligible: boolean;
  profile_pct: number;
}

interface UpdateDebateResult {
  ranked?: boolean;
  elo_change_a?: number;
  elo_change_b?: number;
}

interface ReferenceItem {
  id: string;
  ruling: string;
  ruling_reason?: string;
  submitter_name?: string;
  url?: string;
  description?: string;
  round?: number;
  supports_side?: string;
}


// ============================================================
// CONSTANTS
// ============================================================

export const MODES: Readonly<Record<DebateMode, ModeInfo>> = {
  live: { id: 'live', icon: '🎙️', name: 'LIVE AUDIO', desc: 'Real-time voice debate. 2 min rounds.', available: 'Opponent needed', color: '#cc2936' },
  voicememo: { id: 'voicememo', icon: '🎤', name: 'VOICE MEMO', desc: 'Record & send. Debate on your schedule.', available: 'Async — anytime', color: '#d4a843' },
  text: { id: 'text', icon: '⌨️', name: 'TEXT BATTLE', desc: 'Written arguments. Think before you speak.', available: 'Async — anytime', color: '#5b8abf' },
  ai: { id: 'ai', icon: '🤖', name: 'AI SPARRING', desc: 'Practice against AI. Instant start.', available: '✅ Always ready', color: '#2ecc71' },
} as const;

const QUEUE_TIMEOUT_SEC: Readonly<Record<DebateMode, number>> = { live: 90, voicememo: 10, text: 10, ai: 0 };
const ROUND_DURATION = 120;
export const TEXT_MAX_CHARS = 2000;

const AI_TOPICS: readonly string[] = [
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

const AI_RESPONSES: Readonly<Record<string, readonly string[]>> = {
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

// ============================================================
// STATE
// ============================================================

let view: ArenaView = 'lobby';
let selectedMode: DebateMode | null = null;
let queuePollTimer: ReturnType<typeof setInterval> | null = null;
let queueElapsedTimer: ReturnType<typeof setInterval> | null = null;
let queueSeconds = 0;
let currentDebate: CurrentDebate | null = null;
let roundTimer: ReturnType<typeof setInterval> | null = null;
let roundTimeLeft = 0;
let screenEl: HTMLElement | null = null;
let cssInjected = false;
let selectedModerator: SelectedModerator | null = null;
let selectedRanked = false;
export let referencePollTimer: ReturnType<typeof setInterval> | null = null;
export let pendingReferences: unknown[] = [];
export let activatedPowerUps: Set<string> = new Set();
export let shieldActive = false;
export let equippedForDebate: EquippedItem[] = [];
export let silenceTimer: ReturnType<typeof setInterval> | null = null;
export let _rulingCountdownTimer: ReturnType<typeof setInterval> | null = null;

// Voice memo state
let vmRecording = false;
let vmTimer: ReturnType<typeof setInterval> | null = null;
let vmSeconds = 0;

// ============================================================
// HELPERS
// ============================================================

function isPlaceholder(): boolean {
  return !getSupabaseClient() || isAnyPlaceholder;
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ============================================================
// BROWSER HISTORY (Session 121 rewrite)
// ============================================================

function pushArenaState(viewName: string): void {
  history.pushState({ arenaView: viewName }, '');
}

window.addEventListener('popstate', () => {
  // Clean up any overlays still in DOM
  document.getElementById('arena-rank-overlay')?.remove();
  document.getElementById('arena-mode-overlay')?.remove();
  const rulingOverlay = document.getElementById('mod-ruling-overlay');
  if (rulingOverlay) { clearInterval(_rulingCountdownTimer!); rulingOverlay.remove(); }

  // Clean up current view state
  if (view === 'room' || view === 'preDebate') {
    clearInterval(roundTimer!);
    clearInterval(_rulingCountdownTimer!);
    stopReferencePoll();
    if (currentDebate?.mode === 'live') {
      leaveDebate();
    }
  }
  if (view === 'queue') {
    clearQueueTimers();
    if (!isPlaceholder()) safeRpc('leave_debate_queue').catch(() => {});
  }

  // All back navigation returns to lobby
  if (view !== 'lobby') renderLobby();
});

// ============================================================
// CSS INJECTION
// ============================================================

function injectCSS(): void {
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

// ============================================================
// LOBBY
// ============================================================

export function renderLobby(): void {
  view = 'lobby';
  selectedMode = null;
  selectedModerator = null;
  selectedRanked = false;
  stopReferencePoll();
  activatedPowerUps.clear();
  shieldActive = false;
  equippedForDebate = [];
  if (silenceTimer) { clearInterval(silenceTimer); silenceTimer = null; }
  removeShieldIndicator();
  document.getElementById('powerup-silence-overlay')?.remove();
  document.getElementById('powerup-reveal-popup')?.remove();
  history.replaceState({ arenaView: 'lobby' }, '');
  if (screenEl) {
    screenEl.innerHTML = '';
    screenEl.style.position = 'relative';
  }

  const profile = getCurrentProfile();
  const loginStreak = Number(profile?.login_streak) || 0;

  const lobby = document.createElement('div');
  lobby.className = 'arena-lobby arena-fade-in';

  lobby.innerHTML = `
    <div class="arena-hero">
      <div class="arena-hero-title">\u2694\uFE0F The Arena</div>
      <div class="arena-hero-sub">Where opinions fight. Pick a mode. Find an opponent. Settle it.</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:10px 0 4px;">
        <span style="color:#D4A843;font-weight:700;font-size:15px;">\uD83E\uDE99 <span data-token-balance>0</span> tokens</span>
        <span style="color:#a0a8b8;font-size:13px;">|</span>
        <span style="color:#5b8abf;font-size:13px;">\uD83D\uDD25 ${loginStreak}-day streak</span>
      </div>
      <button class="arena-enter-btn" id="arena-enter-btn">
        <span class="btn-pulse"></span> ENTER THE ARENA
      </button>
      <button id="arena-powerup-shop-btn" style="
        display:inline-flex;align-items:center;gap:8px;
        margin-top:10px;padding:10px 24px;
        border-radius:30px;border:1px solid rgba(212,168,67,0.4);
        background:rgba(212,168,67,0.08);
        color:#D4AF37;font-family:'Barlow Condensed',sans-serif;
        font-size:14px;font-weight:600;letter-spacing:1px;cursor:pointer;
      ">\u26A1 POWER-UP SHOP</button>
    </div>
    <div class="arena-section" id="arena-live-section">
      <div class="arena-section-title"><span class="section-dot live-dot"></span> LIVE NOW</div>
      <div id="arena-live-feed"></div>
    </div>
    <div class="arena-section" id="arena-challenge-section">
      <div class="arena-section-title"><span class="section-dot gold-dot"></span> OPEN CHALLENGES</div>
      <div class="arena-challenge-cta" id="arena-challenge-cta">
        <div class="arena-challenge-icon">\u26A1</div>
        <div class="arena-challenge-text">DISAGREE WITH SOMEONE?</div>
        <div class="arena-challenge-sub">Find a hot take you hate \u2192 challenge them to debate it</div>
      </div>
    </div>
    <div class="arena-section" id="arena-verdicts-section">
      <div class="arena-section-title"><span class="section-dot gold-dot"></span> RECENT VERDICTS</div>
      <div id="arena-verdicts-feed"></div>
    </div>
  `;
  screenEl?.appendChild(lobby);

  // Wire enter button
  document.getElementById('arena-enter-btn')?.addEventListener('click', showRankedPicker);
  document.getElementById('arena-powerup-shop-btn')?.addEventListener('click', showPowerUpShop);

  // Wire challenge CTA — navigate to home carousel
  document.getElementById('arena-challenge-cta')?.addEventListener('click', () => {
    if (typeof (window as unknown as Record<string, unknown>).navigateTo === 'function') {
      (window as unknown as Record<string, unknown> & { navigateTo: (s: string) => void }).navigateTo('home');
    }
  });

  // Load lobby content
  void loadLobbyFeed();

  // Event delegation for arena card links
  lobby.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    const card = target.closest('.arena-card[data-link]') as HTMLElement | null;
    if (card) window.location.href = card.dataset.link!;
  });
}

async function loadLobbyFeed(): Promise<void> {
  const liveFeed = document.getElementById('arena-live-feed');
  const verdictsFeed = document.getElementById('arena-verdicts-feed');
  if (!liveFeed || !verdictsFeed) return;

  if (isPlaceholder()) {
    liveFeed.innerHTML = renderPlaceholderCards('live');
    verdictsFeed.innerHTML = renderPlaceholderCards('verdict');
    return;
  }

  try {
    const sb = getSupabaseClient();
    const { data, error } = await safeRpc<ArenaFeedItem[]>('get_arena_feed', { p_limit: 20 });

    if (error || !data || (data as ArenaFeedItem[]).length === 0) {
      // Fall back to auto-debates only
      const { data: autoData } = await sb!.from('auto_debates')
        .select('id, topic, side_a_label, side_b_label, score_a, score_b, status, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (autoData && autoData.length > 0) {
        liveFeed.innerHTML = '<div class="arena-empty"><span class="empty-icon">\uD83C\uDFDB\uFE0F</span>No live debates yet \u2014 be the first to enter the arena</div>';
        verdictsFeed.innerHTML = (autoData as AutoDebateItem[]).map((d: AutoDebateItem) => renderAutoDebateCard(d)).join('');
      } else {
        liveFeed.innerHTML = renderPlaceholderCards('live');
        verdictsFeed.innerHTML = renderPlaceholderCards('verdict');
      }
      return;
    }

    const feedData = data as ArenaFeedItem[];
    const live = feedData.filter((d: ArenaFeedItem) => d.status === 'live' || d.status === 'pending');
    const complete = feedData.filter((d: ArenaFeedItem) => d.status === 'complete' || d.status === 'voting' || d.source === 'auto_debate');

    liveFeed.innerHTML = live.length > 0
      ? live.map((d: ArenaFeedItem) => renderArenaFeedCard(d, 'live')).join('')
      : '<div class="arena-empty"><span class="empty-icon">\uD83C\uDFDB\uFE0F</span>No live debates right now \u2014 be the first</div>';

    verdictsFeed.innerHTML = complete.length > 0
      ? complete.map((d: ArenaFeedItem) => renderArenaFeedCard(d, 'verdict')).join('')
      : '<div class="arena-empty"><span class="empty-icon">\uD83D\uDCDC</span>No verdicts yet</div>';

  } catch (err) {
    console.error('[Arena] Feed load error:', err);
    liveFeed.innerHTML = renderPlaceholderCards('live');
    verdictsFeed.innerHTML = renderPlaceholderCards('verdict');
  }
}

function renderArenaFeedCard(d: ArenaFeedItem, _type: string): string {
  const isAuto = d.source === 'auto_debate';
  const badge = d.status === 'live' ? '<span class="arena-card-badge live">\u25CF LIVE</span>'
    : isAuto ? '<span class="arena-card-badge ai">AI DEBATE</span>'
    : '<span class="arena-card-badge verdict">VERDICT</span>';
  const votes = (d.vote_count_a || 0) + (d.vote_count_b || 0);
  const action = d.status === 'live' ? 'SPECTATE' : 'VIEW VERDICT';

  return `<div class="arena-card" data-link="${isAuto ? 'colosseum-auto-debate.html' : 'colosseum-spectate.html'}?id=${encodeURIComponent(d.id)}">
    <div class="arena-card-top">${badge}<span class="arena-card-meta">${votes} vote${votes !== 1 ? 's' : ''}</span></div>
    <div class="arena-card-topic">${escapeHTML(d.topic || 'Untitled Debate')}</div>
    <div class="arena-card-vs">
      <span>${escapeHTML(d.debater_a_name || 'Side A')}</span>
      <span class="vs">VS</span>
      <span>${escapeHTML(d.debater_b_name || 'Side B')}</span>
      ${d.score_a != null ? `<span class="arena-card-score">${Number(d.score_a)}\u2013${Number(d.score_b)}</span>` : ''}
    </div>
    <div class="arena-card-action"><button class="arena-card-btn">${action}</button></div>
  </div>`;
}

function renderAutoDebateCard(d: AutoDebateItem): string {
  return `<div class="arena-card" data-link="colosseum-auto-debate.html?id=${encodeURIComponent(d.id)}">
    <div class="arena-card-top"><span class="arena-card-badge ai">AI DEBATE</span><span class="arena-card-meta">Leg 3</span></div>
    <div class="arena-card-topic">${escapeHTML(d.topic)}</div>
    <div class="arena-card-vs">
      <span>${escapeHTML(d.side_a_label)}</span>
      <span class="vs">VS</span>
      <span>${escapeHTML(d.side_b_label)}</span>
      <span class="arena-card-score">${Number(d.score_a)}\u2013${Number(d.score_b)}</span>
    </div>
    <div class="arena-card-action"><button class="arena-card-btn">VIEW VERDICT</button></div>
  </div>`;
}

function renderPlaceholderCards(type: string): string {
  if (type === 'live') {
    return `<div class="arena-empty"><span class="empty-icon">\uD83C\uDFDB\uFE0F</span>No live debates yet \u2014 be the first to enter the arena</div>`;
  }
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
        <span class="arena-card-score">${Number(p.sa)}\u2013${Number(p.sb)}</span>
      </div>
    </div>
  `).join('');
}

// ============================================================
// POWER-UP SHOP
// ============================================================

function showPowerUpShop(): void {
  if (!getCurrentUser() && !isPlaceholder()) {
    window.location.href = 'colosseum-plinko.html';
    return;
  }
  view = 'powerUpShop' as ArenaView;
  pushArenaState('powerUpShop');
  const tokenBalance = Number(getCurrentProfile()?.token_balance) || 0;
  const shopHtml = renderShop(tokenBalance);

  if (screenEl) {
    screenEl.innerHTML = `
      <div style="padding:16px;padding-bottom:80px;max-width:480px;margin:0 auto;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <button id="powerup-shop-back" style="
            background:none;border:none;color:#D4AF37;
            font-family:'Barlow Condensed',sans-serif;font-size:14px;
            font-weight:600;cursor:pointer;letter-spacing:1px;padding:0;
          ">\u2190 BACK</button>
        </div>
        ${shopHtml}
      </div>
    `;
  }

  document.getElementById('powerup-shop-back')?.addEventListener('click', () => {
    renderLobby();
  });

  // Wire buy buttons
  document.querySelectorAll('.powerup-buy-btn').forEach((btn) => {
    const buttonEl = btn as HTMLButtonElement;
    buttonEl.addEventListener('click', async () => {
      const id = buttonEl.dataset.id;
      const cost = Number(buttonEl.dataset.cost);
      buttonEl.disabled = true;
      buttonEl.textContent = '...';
      const result = await buyPowerUp(id!, 1);
      if (result.success) {
        showToast('Power-up purchased! \uD83C\uDF89');
        showPowerUpShop(); // re-render with updated balance
      } else {
        showToast(result.error || 'Purchase failed');
        buttonEl.disabled = false;
        buttonEl.textContent = `${cost} \uD83E\uDE99`;
      }
    });
  });
}

// ============================================================
// MODE SELECT / RANKED PICKER
// ============================================================

export function showRankedPicker(): void {
  if (!getCurrentUser() && !isPlaceholder()) {
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
          <div class="arena-rank-card-icon">\uD83C\uDF7A</div>
          <div class="arena-rank-card-name">CASUAL</div>
        </div>
        <div class="arena-rank-card-desc">
          No pressure. ELO doesn't move. No profile needed. Just argue.
        </div>
        <div class="arena-rank-card-badge">OPEN TO EVERYONE</div>
      </div>

      <div class="arena-rank-card ranked" data-ranked="true">
        <div class="arena-rank-card-header">
          <div class="arena-rank-card-icon">\u2694\uFE0F</div>
          <div class="arena-rank-card-name">RANKED</div>
        </div>
        <div class="arena-rank-card-desc">
          ELO on the line. Wins count. Leaderboard moves. Requires profile.
        </div>
        <div class="arena-rank-card-badge">PROFILE REQUIRED \u00B7 25%+</div>
      </div>

      <button class="arena-rank-cancel" id="arena-rank-cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  pushArenaState('rankedPicker');

  // Wire card clicks
  overlay.querySelectorAll('.arena-rank-card').forEach((card) => {
    const cardEl = card as HTMLElement;
    cardEl.addEventListener('click', async () => {
      const isRanked = cardEl.dataset.ranked === 'true';

      // Ranked eligibility check
      if (isRanked && !isPlaceholder()) {
        try {
          const { data, error } = await safeRpc<RankedCheckResult>('check_ranked_eligible');
          if (error) throw error;
          const result = data as RankedCheckResult;
          if (!result.eligible) {
            closeRankedPicker();
            if (confirm('Ranked mode requires at least 25% profile completion. Your profile is at ' + result.profile_pct + '%. Go fill it out?')) {
              window.location.href = 'colosseum-profile-depth.html';
            }
            return;
          }
        } catch (e) {
          console.warn('[Arena] Ranked check error:', e);
        }
      }

      selectedRanked = isRanked;
      closeRankedPicker(true);
      showModeSelect();
    });
  });

  // Wire close
  document.getElementById('arena-rank-backdrop')?.addEventListener('click', () => closeRankedPicker());
  document.getElementById('arena-rank-cancel')?.addEventListener('click', () => closeRankedPicker());
}

export function closeRankedPicker(forward?: boolean): void {
  const overlay = document.getElementById('arena-rank-overlay');
  if (overlay) {
    overlay.remove();
    if (forward) {
      history.replaceState({ arenaView: 'lobby' }, '');
    } else {
      history.back();
    }
  }
}

export function showModeSelect(): void {
  if (!getCurrentUser() && !isPlaceholder()) {
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
          <div class="arena-mode-arrow">\u2192</div>
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
            <div class="mod-picker-avatar">\u2014</div>
            <div class="mod-picker-info">
              <div class="mod-picker-name">No Moderator</div>
              <div class="mod-picker-stats">Debate without moderation</div>
            </div>
            <div class="mod-picker-check">\u2713</div>
          </div>
          <div class="mod-picker-opt" data-mod-type="ai" data-mod-id="">
            <div class="mod-picker-avatar">\uD83E\uDD16</div>
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
  overlay.querySelectorAll('.arena-mode-card').forEach((card) => {
    const cardEl = card as HTMLElement;
    cardEl.addEventListener('click', () => {
      const mode = cardEl.dataset.mode!;
      const topic = (document.getElementById('arena-topic-input') as HTMLInputElement | null)?.value?.trim() || '';
      // Capture selected moderator
      const selOpt = overlay.querySelector('.mod-picker-opt.selected') as HTMLElement | null;
      if (selOpt) {
        const modType = selOpt.dataset.modType!;
        const modId = selOpt.dataset.modId!;
        const modName = selOpt.querySelector('.mod-picker-name')?.textContent || '';
        selectedModerator = modType === 'none' ? null : { type: modType as 'human' | 'ai', id: modId || null, name: modName };
      } else {
        selectedModerator = null;
      }
      closeModeSelect(true);
      enterQueue(mode, topic);
    });
  });

  // Wire mod picker selection
  wireModPicker(overlay);

  // Load available human moderators
  void loadAvailableModerators(overlay);

  // Wire close
  document.getElementById('arena-mode-backdrop')?.addEventListener('click', () => closeModeSelect());
  document.getElementById('arena-mode-cancel')?.addEventListener('click', () => closeModeSelect());
}

export function closeModeSelect(forward?: boolean): void {
  const overlay = document.getElementById('arena-mode-overlay');
  if (overlay) {
    overlay.remove();
    if (forward) {
      history.replaceState({ arenaView: 'lobby' }, '');
    } else {
      history.back();
    }
  }
}

// Session 39: Moderator picker logic
function wireModPicker(container: HTMLElement): void {
  container.querySelectorAll('.mod-picker-opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      container.querySelectorAll('.mod-picker-opt').forEach((o) => {
        o.classList.remove('selected');
        const check = o.querySelector('.mod-picker-check');
        if (check) check.textContent = '';
      });
      opt.classList.add('selected');
      const check = opt.querySelector('.mod-picker-check');
      if (check) check.textContent = '\u2713';
    });
  });
}

async function loadAvailableModerators(overlay: HTMLElement): Promise<void> {
  const user = getCurrentUser();
  const excludeIds = user ? [user.id] : [];
  const mods = await getAvailableModerators(excludeIds);
  const container = overlay.querySelector('#mod-picker-humans') as HTMLElement | null;
  if (!container || !mods || mods.length === 0) return;

  mods.forEach((m) => {
    const initial = ((m as AvailableModerator).display_name || (m as AvailableModerator).username || '?')[0].toUpperCase();
    const opt = document.createElement('div');
    opt.className = 'mod-picker-opt';
    opt.dataset.modType = 'human';
    opt.dataset.modId = (m as AvailableModerator).id;
    opt.innerHTML = `
      <div class="mod-picker-avatar">${initial}</div>
      <div class="mod-picker-info">
        <div class="mod-picker-name">${escapeHTML((m as AvailableModerator).display_name || (m as AvailableModerator).username)}</div>
        <div class="mod-picker-stats">Rating: ${Number((m as AvailableModerator).mod_rating).toFixed(0)} \u00B7 ${(m as AvailableModerator).mod_debates_total} debates \u00B7 ${Number((m as AvailableModerator).mod_approval_pct).toFixed(0)}% approval</div>
      </div>
      <div class="mod-picker-check"></div>
    `;
    opt.addEventListener('click', () => {
      overlay.querySelectorAll('.mod-picker-opt').forEach((o) => {
        o.classList.remove('selected');
        const check = o.querySelector('.mod-picker-check');
        if (check) check.textContent = '';
      });
      opt.classList.add('selected');
      const check = opt.querySelector('.mod-picker-check');
      if (check) check.textContent = '\u2713';
    });
    container.appendChild(opt);
  });
}

// ============================================================
// QUEUE
// ============================================================

export function enterQueue(mode: DebateMode | string, topic: string): void {
  selectedMode = mode as DebateMode;
  view = 'queue';
  pushArenaState('queue');

  if (mode === 'ai') {
    void startAIDebate(topic);
    return;
  }

  if (screenEl) screenEl.innerHTML = '';
  queueSeconds = 0;

  const modeInfo = MODES[mode as DebateMode];
  const profile = getCurrentProfile();
  const elo = profile?.elo_rating || 1200;

  const queueEl = document.createElement('div');
  queueEl.className = 'arena-queue arena-fade-in';
  queueEl.innerHTML = `
    <div class="arena-rank-badge ${selectedRanked ? 'ranked' : 'casual'}">${selectedRanked ? '\u2694\uFE0F RANKED' : '\uD83C\uDF7A CASUAL'}</div>
    <div class="arena-queue-icon">${modeInfo.icon}</div>
    <div class="arena-queue-title">${modeInfo.name}</div>
    <div class="arena-queue-status" id="arena-queue-status">Searching for a worthy opponent...</div>
    <div class="arena-queue-timer" id="arena-queue-timer">0:00</div>
    <div class="arena-queue-elo">Your ELO: ${elo}${selectedRanked ? ' (on the line)' : ''}</div>
    <button class="arena-queue-cancel" id="arena-queue-cancel">Cancel</button>
  `;
  screenEl?.appendChild(queueEl);

  document.getElementById('arena-queue-cancel')?.addEventListener('click', leaveQueue);

  queueElapsedTimer = setInterval(() => {
    queueSeconds++;
    const timerEl = document.getElementById('arena-queue-timer');
    if (timerEl) timerEl.textContent = formatTimer(queueSeconds);

    const timeout = QUEUE_TIMEOUT_SEC[mode as DebateMode] ?? 60;
    if (queueSeconds >= timeout) {
      onQueueTimeout();
    }
  }, 1000);

  if (!isPlaceholder()) {
    void joinServerQueue(mode as DebateMode, topic);
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

async function joinServerQueue(mode: DebateMode, topic: string): Promise<void> {
  try {
    const { data, error } = await safeRpc<MatchData>('join_debate_queue', {
      p_mode: mode,
      p_category: null,
      p_topic: topic || null,
      p_ranked: selectedRanked,
    });
    if (error) throw error;
    if ((data as MatchData)?.status === 'matched') {
      onMatchFound(data as MatchData);
    } else {
      queuePollTimer = setInterval(async () => {
        if (view !== 'queue') return;
        try {
          const { data: status, error: pollErr } = await safeRpc<MatchData>('check_queue_status');
          if (pollErr) throw pollErr;
          if (view !== 'queue') return;
          if (status && (status as MatchData).status === 'matched') {
            onMatchFound(status as MatchData);
          }
        } catch { /* handled */ }
      }, 2000);
    }
  } catch (err) {
    console.error('[Arena] Queue join error:', err);
    const statusEl = document.getElementById('arena-queue-status');
    if (statusEl) statusEl.textContent = friendlyError(err) || 'Queue error \u2014 try again';
  }
}

function onMatchFound(data: MatchData): void {
  clearQueueTimers();
  const statusEl = document.getElementById('arena-queue-status');
  if (statusEl) {
    statusEl.textContent = '\uD83C\uDFAF OPPONENT FOUND!';
    statusEl.style.color = 'var(--gold)';
  }
  setTimeout(() => {
    const debateData: CurrentDebate = {
      id: data.debate_id,
      topic: data.topic ?? randomFrom(AI_TOPICS),
      role: data.role ?? 'a',
      mode: selectedMode ?? 'text',
      round: 1,
      totalRounds: 3,
      opponentName: data.opponent_name ?? 'Opponent',
      opponentId: data.opponent_id ?? null,
      opponentElo: data.opponent_elo ?? 1200,
      ranked: selectedRanked,
      messages: [],
    };
    if (selectedMode === 'ai' || !data.opponent_id) {
      enterRoom(debateData);
    } else {
      void showPreDebate(debateData);
    }
  }, 1200);
}

function onQueueTimeout(): void {
  clearQueueTimers();
  const statusEl = document.getElementById('arena-queue-status');
  if (statusEl) {
    statusEl.innerHTML = 'No opponents found.<br><br>';
  }

  // Offer alternatives
  const queueEl = screenEl?.querySelector('.arena-queue');
  if (queueEl) {
    const alt = document.createElement('div');
    alt.style.cssText = 'display:flex;flex-direction:column;gap:10px;width:100%;max-width:280px;';
    alt.innerHTML = `
      <button class="arena-post-btn primary" id="arena-try-ai">\uD83E\uDD16 SPAR WITH AI INSTEAD</button>
      <button class="arena-post-btn secondary" id="arena-try-again">\uD83D\uDD04 TRY AGAIN</button>
      <button class="arena-post-btn secondary" id="arena-back-lobby">\u2190 BACK TO LOBBY</button>
    `;
    queueEl.appendChild(alt);
    document.getElementById('arena-try-ai')?.addEventListener('click', () => { enterQueue('ai', ''); });
    document.getElementById('arena-try-again')?.addEventListener('click', () => { enterQueue(selectedMode!, ''); });
    document.getElementById('arena-back-lobby')?.addEventListener('click', renderLobby);
  }

  if (!isPlaceholder()) {
    safeRpc('leave_debate_queue').catch(() => {});
  }
}

export function leaveQueue(): void {
  clearQueueTimers();
  if (!isPlaceholder()) {
    safeRpc('leave_debate_queue').catch(() => {});
  }
  renderLobby();
}

function clearQueueTimers(): void {
  if (queuePollTimer) { clearInterval(queuePollTimer); queuePollTimer = null; }
  if (queueElapsedTimer) { clearInterval(queueElapsedTimer); queueElapsedTimer = null; }
}

// ============================================================
// AI DEBATE (instant start)
// ============================================================

async function startAIDebate(topic: string): Promise<void> {
  const chosenTopic = topic || randomFrom(AI_TOPICS);
  let debateId = 'ai-local-' + Date.now();

  if (!isPlaceholder()) {
    try {
      const { data, error } = await safeRpc<{ debate_id: string }>('create_ai_debate', { p_category: 'general', p_topic: chosenTopic });
      if (!error && data) debateId = (data as { debate_id: string }).debate_id;
    } catch { /* use local */ }
  }

  void showPreDebate({
    id: debateId,
    topic: chosenTopic,
    role: 'a',
    mode: 'ai',
    round: 1,
    totalRounds: 3,
    opponentName: 'AI Sparring Bot',
    opponentElo: 1200,
    ranked: false,
    messages: [],
  });
}

// ============================================================
// PRE-DEBATE SCREEN (staking + loadout)
// ============================================================

export async function showPreDebate(debateData: CurrentDebate): Promise<void> {
  view = 'room';
  pushArenaState('preDebate');
  currentDebate = debateData;
  if (screenEl) screenEl.innerHTML = '';

  activatedPowerUps.clear();
  shieldActive = false;
  equippedForDebate = [];
  if (silenceTimer) { clearInterval(silenceTimer); silenceTimer = null; }

  const profile = getCurrentProfile();
  const myName = profile?.display_name || profile?.username || 'You';
  const tokenBalance = Number(profile?.token_balance) || 0;

  const pre = document.createElement('div');
  pre.className = 'arena-pre-debate arena-fade-in';
  pre.innerHTML = `
    <div class="arena-rank-badge ${debateData.ranked ? 'ranked' : 'casual'}">${debateData.ranked ? '\u2694\uFE0F RANKED' : '\uD83C\uDF7A CASUAL'}</div>
    <div class="arena-pre-debate-title">\u2694\uFE0F PREPARE FOR BATTLE</div>
    <div class="arena-pre-debate-sub">${escapeHTML(debateData.topic)}</div>
    <div class="arena-vs-bar" style="width:100%;max-width:360px;border-radius:12px;margin-bottom:16px;">
      <div class="arena-debater">
        <div class="arena-debater-avatar">${(myName[0] || '?').toUpperCase()}</div>
        <div class="arena-debater-info">
          <div class="arena-debater-name">${escapeHTML(myName)}</div>
          <div class="arena-debater-elo">${Number(profile?.elo_rating) || 1200} ELO</div>
        </div>
      </div>
      <div class="arena-vs-text">VS</div>
      <div class="arena-debater right">
        <div class="arena-debater-avatar">${(debateData.opponentName[0] || '?').toUpperCase()}</div>
        <div class="arena-debater-info" style="text-align:right;">
          <div class="arena-debater-name">${escapeHTML(debateData.opponentName)}</div>
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
  screenEl?.appendChild(pre);

  // Render staking panel
  const stakingEl = document.getElementById('pre-debate-staking');
  if (stakingEl) {
    try {
      const pool = await getPool(debateData.id);
      const sideALabel = myName;
      const sideBLabel = debateData.opponentName;
      const qa = (profile as Record<string, unknown>)?.questions_answered as number || 0;
      stakingEl.innerHTML = renderStakingPanel(debateData.id, sideALabel, sideBLabel, pool, qa);
      wireStakingPanel(debateData.id);
    } catch (e) {
      console.warn('[Arena] Staking panel error:', e);
    }
  }

  // Render power-up loadout
  const loadoutEl = document.getElementById('pre-debate-loadout');
  if (loadoutEl) {
    try {
      const puData = await getMyPowerUps(debateData.id);
      loadoutEl.innerHTML = renderLoadout(
        puData.inventory || [], puData.equipped || [],
        puData.questions_answered || 0, debateData.id
      );
      wireLoadout(debateData.id, () => {
        void showPreDebateLoadout(debateData, loadoutEl);
      });
    } catch (e) {
      console.warn('[Arena] Power-up loadout error:', e);
    }
  }

  // Wire enter button
  document.getElementById('pre-debate-enter-btn')?.addEventListener('click', async () => {
    try {
      const finalData = await getMyPowerUps(debateData.id);
      equippedForDebate = finalData.equipped || [];
    } catch {
      equippedForDebate = [];
    }
    enterRoom(debateData);
  });
}

// Helper: refresh loadout panel after equip
async function showPreDebateLoadout(debateData: CurrentDebate, container: HTMLElement): Promise<void> {
  if (!container) return;
  try {
    const puData = await getMyPowerUps(debateData.id);
    container.innerHTML = renderLoadout(
      puData.inventory || [], puData.equipped || [],
      puData.questions_answered || 0, debateData.id
    );
    wireLoadout(debateData.id, () => {
      void showPreDebateLoadout(debateData, container);
    });
  } catch { /* silent */ }
}

// ============================================================
// DEBATE ROOM
// ============================================================

export function enterRoom(debate: CurrentDebate): void {
  view = 'room';
  pushArenaState('room');
  currentDebate = debate;
  if (screenEl) screenEl.innerHTML = '';

  // Session 121: Set debate status to 'live'
  if (debate.mode === 'ai' && !isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
    safeRpc('update_arena_debate', { p_debate_id: debate.id, p_status: 'live' }).catch((e: unknown) => {
      console.warn('[Arena] Status update to live failed:', e);
    });
  }

  const profile = getCurrentProfile();
  const myName = profile?.display_name || profile?.username || 'You';
  const myElo = profile?.elo_rating || 1200;
  const myInitial = (myName[0] || '?').toUpperCase();
  const oppInitial = (debate.opponentName[0] || '?').toUpperCase();
  const isAI = debate.mode === 'ai';

  const room = document.createElement('div');
  room.className = 'arena-room arena-fade-in';
  room.innerHTML = `
    <div class="arena-room-header">
      <div class="arena-rank-badge ${debate.ranked ? 'ranked' : 'casual'}" style="margin-bottom:6px">${debate.ranked ? '\u2694\uFE0F RANKED' : '\uD83C\uDF7A CASUAL'}</div>
      <div class="arena-room-topic">${escapeHTML(debate.topic)}</div>
      ${isAI ? `<div class="ai-generated-badge" style="margin-top:8px">
        <span class="ai-icon">AI</span>
        AI Sparring Partner \u2014 Not a Real Person
      </div>` : ''}
      <div class="arena-room-round" id="arena-round-label">ROUND ${debate.round}/${debate.totalRounds}</div>
      ${debate.mode === 'live' ? `<div class="arena-room-timer" id="arena-room-timer">${formatTimer(ROUND_DURATION)}</div>` : ''}
    </div>
    <div class="arena-vs-bar">
      <div class="arena-debater">
        <div class="arena-debater-avatar">${myInitial}</div>
        <div class="arena-debater-info">
          <div class="arena-debater-name">${escapeHTML(myName)}</div>
          <div class="arena-debater-elo">${Number(myElo)} ELO <span style="color:#D4A843;margin-left:6px;font-size:11px;">\uD83E\uDE99 ${Number(profile?.token_balance) || 0}</span></div>
        </div>
      </div>
      <div class="arena-vs-text">VS</div>
      <div class="arena-debater right">
        <div class="arena-debater-avatar ${isAI ? 'ai-avatar' : ''}">${isAI ? '\uD83E\uDD16' : oppInitial}</div>
        <div class="arena-debater-info" style="text-align:right;">
          <div class="arena-debater-name">${escapeHTML(debate.opponentName)}</div>
          <div class="arena-debater-elo">${Number(debate.opponentElo)} ELO</div>
        </div>
      </div>
    </div>
    <div id="powerup-loadout-container"></div>
    <div class="arena-spectator-bar"><span class="eye">\uD83D\uDC41\uFE0F</span> <span id="arena-spectator-count">0</span> watching</div>
    <div class="arena-messages" id="arena-messages"></div>
    <div class="arena-input-area" id="arena-input-area"></div>
  `;
  screenEl?.appendChild(room);

  // Add system message
  addSystemMessage(`Round ${debate.round} \u2014 Make your argument.`);

  // Session 39: Assign selected moderator
  if (selectedModerator && debate.id) {
    void assignSelectedMod(debate.id);
    debate.moderatorType = selectedModerator.type;
    debate.moderatorId = selectedModerator.id || null;
    debate.moderatorName = selectedModerator.name || (selectedModerator.type === 'ai' ? 'AI Moderator' : 'Moderator');
    // Add mod bar
    const vsBar = room.querySelector('.arena-vs-bar');
    if (vsBar) {
      const modBar = document.createElement('div');
      modBar.className = 'arena-mod-bar';
      modBar.innerHTML = `<span class="mod-icon">\u2696\uFE0F</span> Moderator: ${escapeHTML(debate.moderatorName)}`;
      vsBar.parentNode!.insertBefore(modBar, vsBar.nextSibling);
    }
  }

  // Session 109: Load power-up loadout
  if (debate.id && !debate.id.startsWith('placeholder-')) {
    (async () => {
      try {
        const data = await getMyPowerUps(debate.id);
        const loadoutContainer = document.getElementById('powerup-loadout-container');
        if (loadoutContainer && data) {
          loadoutContainer.innerHTML = renderLoadout(
            data.inventory, data.equipped,
            (profile as Record<string, unknown>)?.questions_answered as number || 0, debate.id
          );
          wireLoadout(debate.id, async () => {
            const refreshed = await getMyPowerUps(debate.id);
            if (loadoutContainer && refreshed) {
              loadoutContainer.innerHTML = renderLoadout(
                refreshed.inventory, refreshed.equipped,
                (profile as Record<string, unknown>)?.questions_answered as number || 0, debate.id
              );
              wireLoadout(debate.id);
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

  // Session 39: Add reference button for non-AI modes
  addReferenceButton();

  // Session 110: Add power-up activation bar if equipped
  if (equippedForDebate.length > 0) {
    const barHtml = renderActivationBar(equippedForDebate);
    if (barHtml) {
      const messagesEl = room.querySelector('.arena-messages');
      if (messagesEl) {
        const barContainer = document.createElement('div');
        barContainer.innerHTML = barHtml;
        if (barContainer.firstElementChild) {
          messagesEl.parentNode!.insertBefore(barContainer.firstElementChild, messagesEl.nextSibling);
        }
      }
      // Wire activation handlers
      wireActivationBar(debate.id, {
        onSilence: () => {
          addSystemMessage('\uD83E\uDD2B You silenced ' + escapeHTML(debate.opponentName) + ' for 10 seconds!');
          silenceTimer = renderSilenceOverlay(debate.opponentName);
          activatedPowerUps.add('silence');
        },
        onShield: () => {
          shieldActive = true;
          renderShieldIndicator();
          addSystemMessage('\uD83D\uDEE1\uFE0F Shield activated! Your next reference challenge will be blocked.');
          activatedPowerUps.add('shield');
        },
        onReveal: async () => {
          addSystemMessage('\uD83D\uDC41\uFE0F Revealing opponent\'s power-ups...');
          const oppData = await getOpponentPowerUps(debate.id);
          if (oppData.success) {
            renderRevealPopup(oppData.equipped || []);
          } else {
            addSystemMessage('Could not reveal opponent\'s loadout.');
          }
          activatedPowerUps.add('reveal');
        },
      });
      // Show passive multiplier badge in system message
      if (hasMultiplier(equippedForDebate)) {
        addSystemMessage('\u26A1 2x Multiplier active \u2014 staking payouts doubled if you win!');
      }
    }
  }

  // Session 39: Start reference polling if moderator assigned
  if (selectedModerator && debate.id && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
    startReferencePoll(debate.id);
  }

  // Start round timer for live mode
  if (debate.mode === 'live') {
    startLiveRoundTimer();
    void initLiveAudio();
  }
}

function renderInputControls(mode: DebateMode): void {
  const inputArea = document.getElementById('arena-input-area');
  if (!inputArea) return;

  switch (mode) {
    case 'text':
    case 'ai':
      inputArea.innerHTML = `
        <div class="arena-text-row">
          <textarea class="arena-text-input" id="arena-text-input" placeholder="Type your argument..." maxlength="${TEXT_MAX_CHARS}" rows="2"></textarea>
          <button class="arena-send-btn" id="arena-send-btn" disabled>\u2192</button>
        </div>
        <div class="arena-char-count"><span id="arena-char-count">0</span> / ${TEXT_MAX_CHARS}</div>
      `;
      {
        const input = document.getElementById('arena-text-input') as HTMLTextAreaElement | null;
        const sendBtn = document.getElementById('arena-send-btn') as HTMLButtonElement | null;
        const charCount = document.getElementById('arena-char-count');
        input?.addEventListener('input', () => {
          const len = input.value.length;
          if (charCount) charCount.textContent = String(len);
          if (sendBtn) sendBtn.disabled = len === 0;
          // Auto-resize
          input.style.height = 'auto';
          input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });
        sendBtn?.addEventListener('click', () => void submitTextArgument());
        // Enter key to submit (shift+enter for newline)
        input?.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submitTextArgument(); }
        });
      }
      break;

    case 'live':
      inputArea.innerHTML = `
        <canvas class="arena-waveform" id="arena-waveform" width="300" height="40"></canvas>
        <div class="arena-audio-controls">
          <button class="arena-mic-btn" id="arena-mic-btn">\uD83C\uDF99\uFE0F</button>
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
          <button class="arena-record-btn" id="arena-record-btn">\u23FA</button>
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

// ============================================================
// TEXT / AI MODE
// ============================================================

export async function submitTextArgument(): Promise<void> {
  const input = document.getElementById('arena-text-input') as HTMLTextAreaElement | null;
  if (!input || !input.value.trim()) return;

  const text = input.value.trim();
  input.value = '';
  input.style.height = 'auto';
  const charCountEl = document.getElementById('arena-char-count');
  if (charCountEl) charCountEl.textContent = '0';
  const sendBtnEl = document.getElementById('arena-send-btn') as HTMLButtonElement | null;
  if (sendBtnEl) sendBtnEl.disabled = true;

  const debate = currentDebate!;
  const side = debate.role;
  addMessage(side, text, debate.round, false);

  if (!isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
    try {
      await safeRpc('submit_debate_message', {
        p_debate_id: debate.id,
        p_round: debate.round,
        p_side: side,
        p_content: text,
      });
    } catch { /* warned */ }
  }

  if (debate.mode === 'ai') {
    await handleAIResponse(debate, text);
  } else {
    // Text async: show waiting for opponent
    addSystemMessage('Waiting for opponent\'s response...');
    if (isPlaceholder() || debate.id.startsWith('placeholder-')) {
      setTimeout(() => {
        const oppSide: DebateRole = side === 'a' ? 'b' : 'a';
        addMessage(oppSide, generateSimulatedResponse(debate.round), debate.round, false);
        advanceRound();
      }, 2000 + Math.random() * 3000);
    }
  }
}

async function handleAIResponse(debate: CurrentDebate, userText: string): Promise<void> {
  // Show typing indicator
  const messages = document.getElementById('arena-messages');
  const typing = document.createElement('div');
  typing.className = 'arena-typing';
  typing.id = 'arena-ai-typing';
  typing.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  messages?.appendChild(typing);
  messages?.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });

  // Disable input while AI is "thinking"
  const input = document.getElementById('arena-text-input') as HTMLTextAreaElement | null;
  const sendBtn = document.getElementById('arena-send-btn') as HTMLButtonElement | null;
  if (input) input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  const aiText = await generateAIDebateResponse(debate.topic, userText, debate.round, debate.totalRounds);

  // Remove typing indicator
  document.getElementById('arena-ai-typing')?.remove();

  addMessage('b', aiText, debate.round, true);

  if (!isPlaceholder() && !debate.id.startsWith('ai-local-')) {
    try {
      await safeRpc('submit_debate_message', {
        p_debate_id: debate.id,
        p_round: debate.round,
        p_side: 'b',
        p_content: aiText,
        p_is_ai: true,
      });
    } catch { /* warned */ }
  }

  // Re-enable input
  if (input) input.disabled = false;

  advanceRound();
}

async function generateAIDebateResponse(
  topic: string,
  _userArg: string,
  round: number,
  totalRounds: number
): Promise<string> {
  const messageHistory = (currentDebate?.messages ?? []).map((m) => ({
    role: m.role,
    content: m.text,
  }));

  try {
    const supabaseUrl = SUPABASE_URL;
    if (!supabaseUrl) throw new Error('No supabase URL');

    const edgeUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1/ai-sparring';
    const anonKey = SUPABASE_ANON_KEY;

    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(anonKey ? { Authorization: 'Bearer ' + anonKey } : {}),
      },
      body: JSON.stringify({ topic, userArg: _userArg, round, totalRounds, messageHistory }),
    });

    if (!res.ok) throw new Error('Edge Function error: ' + res.status);
    const data = await res.json() as { response?: string };
    if (data?.response) return data.response;
    throw new Error('Empty response');
  } catch {
    await new Promise<void>((r) => setTimeout(r, 1200 + Math.random() * 1800));
    const templates = round === 1 ? AI_RESPONSES.opening! : round >= totalRounds ? AI_RESPONSES.closing! : AI_RESPONSES.rebuttal!;
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

function generateSimulatedResponse(_round: number): string {
  const responses = [
    "I see your point, but I think you're overlooking a key factor here. The data actually suggests the opposite conclusion when you control for external variables.",
    "That's a common argument, but it falls apart under scrutiny. Consider what happens when we apply that logic consistently across all cases.",
    "While I respect that position, I've seen compelling evidence that points in a different direction entirely. Let me lay it out.",
    "You raise an interesting point, but I think the premise itself is flawed. Here's why that framing doesn't hold up.",
  ];
  return randomFrom(responses);
}

function advanceRound(): void {
  const debate = currentDebate!;
  if (debate.round >= debate.totalRounds) {
    setTimeout(() => void endCurrentDebate(), 1500);
    return;
  }
  debate.round++;
  addSystemMessage(`Round ${debate.round} of ${debate.totalRounds} \u2014 Your turn.`);

  const roundLabel = document.getElementById('arena-round-label');
  if (roundLabel) roundLabel.textContent = `ROUND ${debate.round}/${debate.totalRounds}`;

  if (debate.mode === 'live') startLiveRoundTimer();
}

// ============================================================
// LIVE AUDIO MODE
// ============================================================

function startLiveRoundTimer(): void {
  roundTimeLeft = ROUND_DURATION;
  if (roundTimer) clearInterval(roundTimer);
  const timerEl = document.getElementById('arena-room-timer');

  roundTimer = setInterval(() => {
    roundTimeLeft--;
    if (timerEl) {
      timerEl.textContent = formatTimer(roundTimeLeft);
      timerEl.classList.toggle('warning', roundTimeLeft <= 15);
    }
    if (roundTimeLeft <= 0) {
      if (roundTimer) clearInterval(roundTimer);
      addSystemMessage("\u23F1\uFE0F Time's up for this round!");
      advanceRound();
    }
  }, 1000);
}

async function initLiveAudio(): Promise<void> {
  const debate = currentDebate!;

  onWebRTC('micReady', () => {
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = 'Microphone ready';
    const canvas = document.getElementById('arena-waveform') as HTMLCanvasElement | null;
    const localStream = getLocalStream();
    if (canvas && localStream) {
      createWaveform(localStream, canvas);
    }
  });

  onWebRTC('connected', () => {
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = '\uD83D\uDFE2 Connected \u2014 debate is live!';
  });

  onWebRTC('disconnected', () => {
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = '\uD83D\uDD34 Connection lost';
  });

  onWebRTC('muteChanged', (data: unknown) => {
    const { muted } = data as { muted: boolean };
    const btn = document.getElementById('arena-mic-btn');
    if (btn) {
      btn.classList.toggle('muted', muted);
      btn.textContent = muted ? '\uD83D\uDD07' : '\uD83C\uDF99\uFE0F';
    }
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = muted ? 'Muted' : 'Unmuted \u2014 speaking';
  });

  onWebRTC('tick', (data: unknown) => {
    const { timeLeft } = data as { timeLeft: number };
    const timerEl = document.getElementById('arena-room-timer');
    if (timerEl) {
      timerEl.textContent = formatTimer(timeLeft);
      timerEl.classList.toggle('warning', timeLeft <= 15);
    }
  });

  onWebRTC('debateEnd', () => { void endCurrentDebate(); });

  try {
    await joinDebate(debate.id, debate.role);
  } catch {
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = 'Mic access blocked. Check your browser settings.';
  }
}

function toggleLiveMute(): void {
  toggleMute();
}

// ============================================================
// VOICE MEMO MODE
// ============================================================

export function wireVoiceMemoControls(): void {
  document.getElementById('arena-record-btn')?.addEventListener('click', () => {
    if (!vmRecording) void startVoiceMemoRecording();
    else stopVoiceMemoRecording();
  });
  document.getElementById('arena-vm-cancel')?.addEventListener('click', () => {
    vmRetake();
    resetVoiceMemoUI();
  });
  document.getElementById('arena-vm-send')?.addEventListener('click', () => { void sendVoiceMemo(); });
}

async function startVoiceMemoRecording(): Promise<void> {
  vmRecording = true;
  vmSeconds = 0;
  const recordBtn = document.getElementById('arena-record-btn');
  const statusEl = document.getElementById('arena-vm-status');
  const timerEl = document.getElementById('arena-vm-timer');

  recordBtn?.classList.add('recording');
  if (recordBtn) recordBtn.textContent = '\u23F9';
  if (statusEl) statusEl.textContent = 'Recording...';
  timerEl?.classList.remove('arena-hidden');

  vmTimer = setInterval(() => {
    vmSeconds++;
    if (timerEl) timerEl.textContent = formatTimer(vmSeconds);
    if (vmSeconds >= 120) stopVoiceMemoRecording();
  }, 1000);
  try {
    await startRecording();
  } catch {
    if (statusEl) statusEl.textContent = 'Mic access denied';
    resetVoiceMemoUI();
  }
}

function stopVoiceMemoRecording(): void {
  vmRecording = false;
  if (vmTimer) clearInterval(vmTimer);

  const recordBtn = document.getElementById('arena-record-btn');
  const statusEl = document.getElementById('arena-vm-status');
  const cancelBtn = document.getElementById('arena-vm-cancel');
  const sendBtn = document.getElementById('arena-vm-send');

  recordBtn?.classList.remove('recording');
  if (recordBtn) recordBtn.textContent = '\u23FA';
  if (statusEl) statusEl.textContent = `Recorded ${formatTimer(vmSeconds)} \u2014 send or retake`;
  cancelBtn?.classList.remove('arena-hidden');
  sendBtn?.classList.remove('arena-hidden');

  void stopRecording();
}

function resetVoiceMemoUI(): void {
  vmRecording = false;
  vmSeconds = 0;
  if (vmTimer) clearInterval(vmTimer);

  const recordBtn = document.getElementById('arena-record-btn');
  const statusEl = document.getElementById('arena-vm-status');
  const timerEl = document.getElementById('arena-vm-timer');
  const cancelBtn = document.getElementById('arena-vm-cancel');
  const sendBtn = document.getElementById('arena-vm-send');

  recordBtn?.classList.remove('recording');
  if (recordBtn) recordBtn.textContent = '\u23FA';
  if (statusEl) statusEl.textContent = 'Tap to record your argument';
  timerEl?.classList.add('arena-hidden');
  cancelBtn?.classList.add('arena-hidden');
  sendBtn?.classList.add('arena-hidden');
}

async function sendVoiceMemo(): Promise<void> {
  const debate = currentDebate!;
  const side = debate.role;

  addMessage(side, `\uD83C\uDF99 Voice memo (${formatTimer(vmSeconds)})`, debate.round, false);
  resetVoiceMemoUI();
  await vmSend();
  addSystemMessage('Voice memo sent \u2014 waiting for opponent...');

  // Simulate opponent response for now
  if (isPlaceholder() || debate.id.startsWith('placeholder-')) {
    setTimeout(() => {
      const oppSide: DebateRole = side === 'a' ? 'b' : 'a';
      addMessage(oppSide, '\uD83C\uDF99 Voice memo (0:47)', debate.round, false);
      advanceRound();
    }, 3000 + Math.random() * 4000);
  }
}

// ============================================================
// MESSAGE RENDERING
// ============================================================

export function addMessage(side: DebateRole, text: string, round: number, isAI: boolean): void {
  const messages = document.getElementById('arena-messages');
  if (!messages) return;

  const debate = currentDebate;
  if (debate?.messages) {
    debate.messages.push({
      role: side === debate.role ? 'user' : 'assistant',
      text,
      round,
    });
  }

  const profile = getCurrentProfile();
  const isMe = side === debate?.role;
  const name = isAI ? '\uD83E\uDD16 AI' : isMe ? (profile?.display_name ?? 'You') : (debate?.opponentName ?? 'Opponent');

  const msg = document.createElement('div');
  msg.className = `arena-msg side-${side} arena-fade-in`;
  msg.innerHTML = `
    <div class="msg-label">${escapeHTML(name)}</div>
    <div>${escapeHTML(text)}</div>
    <div class="msg-round">Round ${round}</div>
  `;
  messages.appendChild(msg);
  messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
}

export function addSystemMessage(text: string): void {
  const messages = document.getElementById('arena-messages');
  if (!messages) return;
  const msg = document.createElement('div');
  msg.className = 'arena-msg system arena-fade-in';
  msg.textContent = text;
  messages.appendChild(msg);
  messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
}

// ============================================================
// END DEBATE
// ============================================================

export async function endCurrentDebate(): Promise<void> {
  view = 'postDebate';
  pushArenaState('postDebate');
  if (roundTimer) clearInterval(roundTimer);
  stopReferencePoll();

  const debate = currentDebate!;

  if (debate.mode === 'live') {
    leaveDebate();
  }

  // Generate scores
  let scoreA: number;
  let scoreB: number;
  if (debate.mode === 'ai' || !debate.opponentId) {
    scoreA = 60 + Math.floor(Math.random() * 30);
    scoreB = 60 + Math.floor(Math.random() * 30);
  } else {
    scoreA = 70;
    scoreB = 70;
  }
  const winner: DebateRole = scoreA >= scoreB ? 'a' : 'b';
  const didWin = winner === debate.role;

  // Update Supabase
  let eloChangeMe = 0;
  if (!isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
    try {
      const { data: result, error } = await safeRpc<UpdateDebateResult>('update_arena_debate', {
        p_debate_id: debate.id,
        p_status: 'complete',
        p_current_round: debate.round || 1,
        p_winner: winner,
        p_score_a: scoreA,
        p_score_b: scoreB,
      });
      if (!error && result && (result as UpdateDebateResult).ranked) {
        const r = result as UpdateDebateResult;
        eloChangeMe = debate.role === 'a' ? (r.elo_change_a || 0) : (r.elo_change_b || 0);
      }
    } catch (e) {
      console.warn('[Arena] Finalize error:', e);
    }

    if (debate.mode === 'ai') claimAiSparring(debate.id);
    else claimDebate(debate.id);

    try {
      const hasMulti = hasMultiplier(equippedForDebate);
      const stakeResult = await settleStakes(debate.id, winner, hasMulti ? 2 : 1);
      debate._stakingResult = stakeResult;
    } catch { /* warned */ }
  }

  // Clean up power-up state
  if (silenceTimer) { clearInterval(silenceTimer); silenceTimer = null; }
  removeShieldIndicator();
  shieldActive = false;
  activatedPowerUps.clear();
  document.getElementById('powerup-silence-overlay')?.remove();
  document.getElementById('powerup-reveal-popup')?.remove();

  // Render post-debate screen
  const profile = getCurrentProfile();
  const myName = profile?.display_name || 'You';

  const eloSign = eloChangeMe >= 0 ? '+' : '';
  const eloClass = eloChangeMe > 0 ? 'positive' : eloChangeMe < 0 ? 'negative' : 'neutral';
  const eloHtml = debate.ranked
    ? `<div class="arena-elo-change ${eloClass}">${eloSign}${eloChangeMe} ELO</div>`
    : `<div class="arena-elo-change neutral">Casual \u2014 No Rating Change</div>`;

  if (screenEl) screenEl.innerHTML = '';
  const post = document.createElement('div');
  post.className = 'arena-post arena-fade-in';
  post.innerHTML = `
    <div class="arena-rank-badge ${debate.ranked ? 'ranked' : 'casual'}">${debate.ranked ? '\u2694\uFE0F RANKED' : '\uD83C\uDF7A CASUAL'}</div>
    <div class="arena-post-verdict">${didWin ? '\uD83C\uDFC6' : '\uD83D\uDC80'}</div>
    <div class="arena-post-title">${didWin ? 'VICTORY' : 'DEFEAT'}</div>
    ${eloHtml}
    ${debate._stakingResult && debate._stakingResult.payout != null ? `
    <div class="arena-staking-result">
      <div class="arena-staking-result-title">\uD83E\uDE99 STAKING RESULTS</div>
      <div class="arena-staking-result-amount ${debate._stakingResult.payout > 0 ? 'won' : debate._stakingResult.payout < 0 ? 'lost' : 'none'}">
        ${debate._stakingResult.payout > 0 ? '+' : ''}${debate._stakingResult.payout} tokens
      </div>
      ${hasMultiplier(equippedForDebate) ? '<div class="arena-staking-result-detail">\u26A1 2x Multiplier applied</div>' : ''}
    </div>` : ''}
    <div class="arena-post-topic">${escapeHTML(debate.topic)}</div>
    <div class="arena-post-score">
      <div class="arena-post-side">
        <div class="arena-post-side-label">${escapeHTML(myName)}</div>
        <div class="arena-post-side-score ${debate.role === winner ? 'winner' : 'loser'}">${Number(debate.role === 'a' ? scoreA : scoreB)}</div>
      </div>
      <div class="arena-post-divider">\u2014</div>
      <div class="arena-post-side">
        <div class="arena-post-side-label${debate.opponentId ? ' arena-clickable-opp' : ''}" ${debate.opponentId ? `data-opp-id="${escapeHTML(debate.opponentId)}"` : ''}>${escapeHTML(debate.opponentName)}</div>
        <div class="arena-post-side-score ${debate.role !== winner ? 'winner' : 'loser'}">${Number(debate.role === 'a' ? scoreB : scoreA)}</div>
      </div>
    </div>
    ${debate.opponentId && debate.mode !== 'ai' ? `
    <div class="arena-post-actions" style="margin-bottom:0">
      <button class="arena-post-btn secondary" id="arena-add-rival">\u2694\uFE0F ADD RIVAL</button>
    </div>` : ''}
    <div class="arena-post-actions">
      <button class="arena-post-btn primary" id="arena-rematch">\u2694\uFE0F REMATCH</button>
      <button class="arena-post-btn secondary" id="arena-share-result">\uD83D\uDD17 SHARE</button>
      ${debate.messages && debate.messages.length > 0 ? '<button class="arena-post-btn secondary" id="arena-transcript">\uD83D\uDCDD TRANSCRIPT</button>' : ''}
      <button class="arena-post-btn secondary" id="arena-back-to-lobby">\u2190 LOBBY</button>
    </div>
  `;
  screenEl?.appendChild(post);

  // Session 39: Moderator scoring section
  if (debate.moderatorId && debate.moderatorName) {
    renderModScoring(debate, post);
  }

  document.getElementById('arena-rematch')?.addEventListener('click', () => {
    selectedRanked = debate.ranked || false;
    enterQueue(debate.mode, debate.topic);
  });

  document.getElementById('arena-share-result')?.addEventListener('click', () => {
    shareResult({
      debateId: debate.id,
      topic: debate.topic,
      winner: didWin ? myName : debate.opponentName,
      spectators: 0,
    });
  });

  document.getElementById('arena-back-to-lobby')?.addEventListener('click', renderLobby);

  // Add as Rival
  document.getElementById('arena-add-rival')?.addEventListener('click', async () => {
    if (!debate.opponentId) return;
    const btn = document.getElementById('arena-add-rival') as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = '\u23F3 Adding...'; }
    try {
      const result = await declareRival(debate.opponentId);
      if (result && !result.error) {
        if (btn) btn.textContent = '\u2705 RIVAL ADDED';
        showToast('\u2694\uFE0F Rival declared!', 'success');
      } else {
        if (btn) { btn.textContent = '\u2694\uFE0F ADD RIVAL'; btn.disabled = false; }
        showToast('Could not add rival', 'error');
      }
    } catch {
      if (btn) { btn.textContent = '\u2694\uFE0F ADD RIVAL'; btn.disabled = false; }
    }
  });

  // Tap opponent name → profile modal
  post.querySelector('.arena-clickable-opp')?.addEventListener('click', () => {
    if (!debate.opponentId) return;
    void showUserProfile(debate.opponentId);
  });

  // Session 113: Transcript view
  document.getElementById('arena-transcript')?.addEventListener('click', () => {
    document.getElementById('arena-transcript-overlay')?.remove();

    const transcriptProfile = getCurrentProfile();
    const transcriptMyName = transcriptProfile?.display_name || 'You';
    const msgs = debate.messages || [];

    const transcriptOverlay = document.createElement('div');
    transcriptOverlay.id = 'arena-transcript-overlay';
    transcriptOverlay.className = 'arena-transcript-overlay';

    let lastRound = 0;
    let msgHtml = '';
    if (msgs.length === 0) {
      msgHtml = '<div class="arena-transcript-empty">No messages recorded.</div>';
    } else {
      msgs.forEach((m) => {
        if (m.round !== lastRound) {
          msgHtml += `<div class="arena-transcript-round">\u2014 Round ${m.round} \u2014</div>`;
          lastRound = m.round;
        }
        const isMe = m.role === 'user';
        const msgSide = isMe ? debate.role : (debate.role === 'a' ? 'b' : 'a');
        const msgName = isMe ? transcriptMyName : debate.opponentName;
        msgHtml += `<div class="arena-transcript-msg side-${msgSide}">
          <div class="t-name">${escapeHTML(msgName)}</div>
          <div class="t-text">${escapeHTML(m.text)}</div>
        </div>`;
      });
    }

    transcriptOverlay.innerHTML = `
      <div class="arena-transcript-sheet">
        <div class="arena-transcript-header">
          <div class="arena-transcript-handle"></div>
          <div class="arena-transcript-title">\uD83D\uDCDD DEBATE TRANSCRIPT</div>
          <div class="arena-transcript-topic">${escapeHTML(debate.topic)}</div>
        </div>
        <div class="arena-transcript-body">${msgHtml}</div>
      </div>`;

    transcriptOverlay.addEventListener('click', (e: Event) => {
      if (e.target === transcriptOverlay) transcriptOverlay.remove();
    });
    document.body.appendChild(transcriptOverlay);
  });
}

// ============================================================
// MODERATOR UI (Session 39)
// ============================================================

export async function assignSelectedMod(debateId: string): Promise<void> {
  if (!selectedModerator || isPlaceholder()) return;
  if (debateId.startsWith('ai-local-') || debateId.startsWith('placeholder-')) return;
  try {
    await assignModerator(debateId, selectedModerator.id, selectedModerator.type);
  } catch { /* warned */ }
}

export function addReferenceButton(): void {
  const inputArea = document.getElementById('arena-input-area');
  if (!inputArea) return;
  if (currentDebate?.mode === 'ai') return;

  const existing = document.getElementById('arena-ref-btn');
  if (existing) return;

  const btn = document.createElement('button');
  btn.className = 'arena-ref-btn';
  btn.id = 'arena-ref-btn';
  btn.innerHTML = '\uD83D\uDCCE EVIDENCE';
  btn.addEventListener('click', showReferenceForm);
  inputArea.appendChild(btn);
}

export function showReferenceForm(): void {
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
      <button class="arena-ref-cancel" id="arena-ref-cancel-btn">\u2715</button>
    </div>
  `;

  const messages = document.getElementById('arena-messages');
  if (messages) {
    messages.parentNode!.insertBefore(form, messages.nextSibling);
  } else {
    screenEl?.appendChild(form);
  }

  // Wire side buttons
  let selectedSide: string | null = null;
  form.querySelectorAll('.arena-ref-side-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      form.querySelectorAll('.arena-ref-side-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSide = (btn as HTMLElement).dataset.side!;
    });
  });

  document.getElementById('arena-ref-submit-btn')?.addEventListener('click', async () => {
    const url = (document.getElementById('arena-ref-url') as HTMLInputElement | null)?.value?.trim() || '';
    const desc = (document.getElementById('arena-ref-desc') as HTMLTextAreaElement | null)?.value?.trim() || '';
    if (!url && !desc) return;

    const submitBtn = document.getElementById('arena-ref-submit-btn') as HTMLButtonElement | null;
    if (submitBtn) { submitBtn.textContent = '\u23F3'; submitBtn.disabled = true; }

    const result = await submitReference(debate.id, url || null, desc || null, selectedSide || undefined);
    if (result?.error) {
      addSystemMessage('\u274C ' + (friendlyError(result.error) || String(result.error)));
    } else {
      addSystemMessage('\uD83D\uDCCE Evidence submitted \u2014 awaiting moderator ruling');
      // Session 39: AI moderator auto-rules
      if (debate.moderatorType === 'ai' && (result as unknown as Record<string, unknown>)?.reference_id) {
        void requestAIModRuling(debate, (result as unknown as Record<string, unknown>).reference_id as string, url, desc, selectedSide);
      }
    }
    hideReferenceForm();
  });

  document.getElementById('arena-ref-cancel-btn')?.addEventListener('click', hideReferenceForm);
}

export function hideReferenceForm(): void {
  document.getElementById('arena-ref-form')?.remove();
}

export function showRulingPanel(ref: ReferenceItem): void {
  document.getElementById('mod-ruling-overlay')?.remove();

  const sideLabel = ref.supports_side === 'a' ? 'Side A' : ref.supports_side === 'b' ? 'Side B' : 'Neutral';

  const overlay = document.createElement('div');
  overlay.className = 'mod-ruling-overlay';
  overlay.id = 'mod-ruling-overlay';
  overlay.innerHTML = `
    <div class="mod-ruling-backdrop"></div>
    <div class="mod-ruling-sheet">
      <div class="mod-ruling-handle"></div>
      <div class="mod-ruling-title">\u2696\uFE0F RULING NEEDED</div>
      <div class="mod-ruling-sub">Evidence submitted by ${escapeHTML(ref.submitter_name || 'Unknown')}</div>
      <div class="mod-ruling-timer" id="mod-ruling-timer">60s auto-allow</div>
      <div class="mod-ruling-ref">
        <div class="mod-ruling-ref-meta">ROUND ${ref.round || '?'} \u00B7 ${sideLabel}</div>
        ${ref.url ? `<div class="mod-ruling-ref-url">${escapeHTML(ref.url)}</div>` : ''}
        ${ref.description ? `<div class="mod-ruling-ref-desc">${escapeHTML(ref.description)}</div>` : ''}
        <div class="mod-ruling-ref-side">Supports: ${sideLabel}</div>
      </div>
      <textarea class="mod-ruling-reason" id="mod-ruling-reason" placeholder="Reason for ruling (optional)" maxlength="300"></textarea>
      <div class="mod-ruling-btns">
        <button class="mod-ruling-allow" id="mod-ruling-allow">\u2705 ALLOW</button>
        <button class="mod-ruling-deny" id="mod-ruling-deny">\u274C DENY</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Auto-allow countdown
  let countdown = 60;
  const timerEl = overlay.querySelector('#mod-ruling-timer');
  if (_rulingCountdownTimer) clearInterval(_rulingCountdownTimer);
  _rulingCountdownTimer = setInterval(() => {
    countdown--;
    if (timerEl) timerEl.textContent = countdown + 's auto-allow';
    if (countdown <= 0) {
      clearInterval(_rulingCountdownTimer!);
      _rulingCountdownTimer = null;
      overlay.remove();
      ruleOnReference(ref.id, 'allowed', 'Auto-allowed (moderator timeout)').catch(() => {});
    }
  }, 1000);

  // Wire buttons
  overlay.querySelector('#mod-ruling-allow')?.addEventListener('click', async () => {
    clearInterval(_rulingCountdownTimer!);
    _rulingCountdownTimer = null;
    const reason = (document.getElementById('mod-ruling-reason') as HTMLTextAreaElement | null)?.value?.trim() || '';
    const result = await ruleOnReference(ref.id, 'allowed', reason);
    if (result?.error) {
      addSystemMessage('\u274C Ruling failed: ' + (friendlyError(result.error) || String(result.error)));
    } else {
      addSystemMessage('\u2705 Evidence ALLOWED by moderator' + (reason ? ': ' + reason : ''));
    }
    overlay.remove();
  });

  overlay.querySelector('#mod-ruling-deny')?.addEventListener('click', async () => {
    clearInterval(_rulingCountdownTimer!);
    _rulingCountdownTimer = null;
    const reason = (document.getElementById('mod-ruling-reason') as HTMLTextAreaElement | null)?.value?.trim() || '';
    const result = await ruleOnReference(ref.id, 'denied', reason);
    if (result?.error) {
      addSystemMessage('\u274C Ruling failed: ' + (friendlyError(result.error) || String(result.error)));
    } else {
      addSystemMessage('\u274C Evidence DENIED by moderator' + (reason ? ': ' + reason : ''));
    }
    overlay.remove();
  });

  // Close on backdrop tap — don't close, moderator must rule
  overlay.querySelector('.mod-ruling-backdrop')?.addEventListener('click', () => {
    // Don't close — moderator must rule.
  });
}

export function startReferencePoll(debateId: string): void {
  if (referencePollTimer) clearInterval(referencePollTimer);
  const seenRefs = new Set<string>();

  referencePollTimer = setInterval(async () => {
    const refs = await getDebateReferences(debateId);
    const profile = getCurrentProfile();
    if (!profile || !refs) return;

    // Check if we're the moderator — show ruling panel for pending refs
    const debate = currentDebate;
    if (debate?.moderatorId && debate.moderatorId === profile.id) {
      (refs as ReferenceItem[]).filter((r: ReferenceItem) => r.ruling === 'pending' && !seenRefs.has(r.id)).forEach((ref: ReferenceItem) => {
        seenRefs.add(ref.id);
        showRulingPanel(ref);
      });
    }

    // For debaters — show system messages for rulings
    (refs as ReferenceItem[]).filter((r: ReferenceItem) => (r.ruling === 'allowed' || r.ruling === 'denied') && !seenRefs.has(r.id + '-ruled')).forEach((ref: ReferenceItem) => {
      seenRefs.add(ref.id + '-ruled');
      // Session 110: Shield blocks reference denials
      if (ref.ruling === 'denied' && shieldActive) {
        shieldActive = false;
        removeShieldIndicator();
        addSystemMessage('\uD83D\uDEE1\uFE0F SHIELD BLOCKED a reference denial! Evidence stays.');
        return;
      }
      const icon = ref.ruling === 'allowed' ? '\u2705' : '\u274C';
      addSystemMessage(`${icon} Evidence ${ref.ruling.toUpperCase()}${ref.ruling_reason ? ': ' + ref.ruling_reason : ''}`);
    });
  }, 3000);
}

function stopReferencePoll(): void {
  if (referencePollTimer) { clearInterval(referencePollTimer); referencePollTimer = null; }
  pendingReferences = [];
}

// Session 39: Call AI Moderator Edge Function for auto-ruling
async function requestAIModRuling(
  debate: CurrentDebate,
  referenceId: string,
  url: string,
  description: string,
  supportsSide: string | null
): Promise<void> {
  try {
    const supabaseUrl = SUPABASE_URL;
    if (!supabaseUrl) throw new Error('No supabase URL');

    const edgeUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1/ai-moderator';

    const recentMessages = (debate.messages || []).slice(-6).map((m) =>
      `${m.role === 'user' ? 'Side A' : 'Side B'} (R${m.round}): ${m.text}`
    ).join('\n');

    const anonKey = SUPABASE_ANON_KEY;
    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(anonKey ? { Authorization: 'Bearer ' + anonKey } : {}),
      },
      body: JSON.stringify({
        topic: debate.topic,
        reference: { url, description, supports_side: supportsSide },
        round: debate.round,
        debateContext: recentMessages || null,
      }),
    });

    if (!res.ok) throw new Error('Edge Function error: ' + res.status);

    const data = await res.json() as { ruling?: string; reason?: string };
    const ruling = data?.ruling || 'allowed';
    const reason = data?.reason || 'AI ruling.';

    const result = await ruleOnReference(referenceId, ruling, '\uD83E\uDD16 ' + reason, 'ai');
    if (result?.error) {
      console.warn('[Arena] AI mod ruling RPC failed:', result.error);
    }

    const icon = ruling === 'allowed' ? '\u2705' : '\u274C';
    addSystemMessage(`${icon} AI Moderator: Evidence ${ruling.toUpperCase()} \u2014 ${reason}`);

  } catch (err) {
    console.warn('[Arena] AI Moderator Edge Function failed:', err);
    await ruleOnReference(referenceId, 'allowed', '\uD83E\uDD16 Auto-allowed (AI moderator unavailable)', 'ai');
    addSystemMessage('\u2705 AI Moderator: Evidence AUTO-ALLOWED (moderator unavailable)');
  }
}

export function renderModScoring(debate: CurrentDebate, container: HTMLElement): void {
  if (!debate.moderatorId || !debate.moderatorName) return;
  const profile = getCurrentProfile();
  if (!profile) return;

  const isDebater = (profile.id === debate.debater_a || profile.id === debate.debater_b);
  const isMod = (profile.id === debate.moderatorId);
  if (isMod) return; // Can't score yourself

  const section = document.createElement('div');
  section.className = 'mod-score-section';

  if (isDebater) {
    section.innerHTML = `
      <div class="mod-score-title">RATE THE MODERATOR</div>
      <div class="mod-score-card">
        <div class="mod-score-name">\u2696\uFE0F ${escapeHTML(debate.moderatorName)}</div>
        <div class="mod-score-btns">
          <button class="mod-score-btn happy" data-score="25">\uD83D\uDC4D FAIR</button>
          <button class="mod-score-btn unhappy" data-score="0">\uD83D\uDC4E UNFAIR</button>
        </div>
        <div class="mod-scored" id="mod-scored" style="display:none;"></div>
      </div>
    `;
  } else {
    section.innerHTML = `
      <div class="mod-score-title">RATE THE MODERATOR</div>
      <div class="mod-score-card">
        <div class="mod-score-name">\u2696\uFE0F ${escapeHTML(debate.moderatorName)}</div>
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
  section.querySelectorAll('.mod-score-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const score = parseInt((btn as HTMLElement).dataset.score!, 10);
      section.querySelectorAll('.mod-score-btn').forEach((b) => { (b as HTMLButtonElement).disabled = true; (b as HTMLElement).style.opacity = '0.4'; });
      const result = await scoreModerator(debate.id, score);
      const scoredEl = document.getElementById('mod-scored');
      if (result?.error) {
        if (scoredEl) { scoredEl.textContent = '\u274C ' + (friendlyError(result.error) || String(result.error)); scoredEl.style.display = 'block'; scoredEl.style.color = 'var(--red)'; }
      } else {
        if (scoredEl) { scoredEl.textContent = '\u2705 Score submitted'; scoredEl.style.display = 'block'; }
      }
    });
  });

  // Wire spectator slider + submit
  const slider = document.getElementById('mod-score-slider') as HTMLInputElement | null;
  const valEl = document.getElementById('mod-score-val');
  if (slider && valEl) {
    slider.addEventListener('input', () => { valEl.textContent = slider.value; });
  }
  document.getElementById('mod-score-submit')?.addEventListener('click', async () => {
    const score = parseInt(slider?.value || '25', 10);
    const submitBtn = document.getElementById('mod-score-submit') as HTMLButtonElement | null;
    if (submitBtn) { submitBtn.textContent = '\u23F3'; submitBtn.disabled = true; }
    const result = await scoreModerator(debate.id, score);
    const scoredEl = document.getElementById('mod-scored');
    if (result?.error) {
      if (scoredEl) { scoredEl.textContent = '\u274C ' + (friendlyError(result.error) || String(result.error)); scoredEl.style.display = 'block'; scoredEl.style.color = 'var(--red)'; }
      if (submitBtn) { submitBtn.textContent = 'SUBMIT SCORE'; submitBtn.disabled = false; }
    } else {
      if (scoredEl) { scoredEl.textContent = '\u2705 Score submitted'; scoredEl.style.display = 'block'; }
      if (submitBtn) submitBtn.remove();
    }
  });
}

// ============================================================
// INIT
// ============================================================

export function init(): void {
  injectCSS();
  screenEl = document.getElementById('screen-arena');
  if (!screenEl) {
    console.warn('[Arena] #screen-arena not found');
    return;
  }
  renderLobby();
  // Auto-open power-up shop if ?shop=1 in URL
  if (new URLSearchParams(window.location.search).get('shop') === '1') {
    showPowerUpShop();
  }
}

// ============================================================
// STATE ACCESSORS
// ============================================================

export function getView(): ArenaView {
  return view;
}

export function getCurrentDebate(): CurrentDebate | null {
  return currentDebate ? { ...currentDebate } : null;
}

// ============================================================
// AUTO-INIT (matches .js IIFE — waits for auth ready)
// ============================================================

ready.then(() => init()).catch(() => init());

// ============================================================
// WINDOW GLOBAL BRIDGE (removed in Phase 4)
// ============================================================

export const ColosseumArenaExport = {
  init,
  renderLobby,
  showModeSelect,
  showPowerUpShop,
  enterQueue,
  get view() { return view; },
  get currentDebate() { return getCurrentDebate(); },
} as const;

(window as unknown as { ColosseumArena: typeof ColosseumArenaExport }).ColosseumArena = ColosseumArenaExport;
