/**
 * THE MODERATOR — Arena Module (TypeScript)
 *
 * Typed mirror of moderator-arena.js. Debate arena, matchmaking, debate room.
 * 4 modes: Live Audio, Voice Memo, Text Battle, AI Sparring.
 * Ranked vs Casual, moderator UX, power-up integration, staking settlement.
 *
 * Source of truth for runtime: moderator-arena.js (until Phase 4 cutover)
 * Source of truth for types: this file
 *
 * NOTE: The runtime .js file is 2500+ lines, largely CSS injection and HTML
 * templates. This TypeScript mirror types ALL function signatures, state, and
 * interfaces. Render functions reference the same HTML templates — full HTML
 * lives in moderator-arena.js.
 *
 * Migration: Session 127 (Phase 3). ES imports: Session 141.
 */

import {
  safeRpc, getSupabaseClient, getCurrentUser, getCurrentProfile,
  assignModerator, getDebateReferences, declareRival, showUserProfile,
  submitReference, ruleOnReference, scoreModerator, getAvailableModerators,
  toggleModerator,
  ready,
} from './auth.ts';
import {
  escapeHTML, SUPABASE_URL, isAnyPlaceholder,
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
import { navigateTo } from './navigation.ts';
import { nudge } from './nudge.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type ArenaView = 'lobby' | 'modeSelect' | 'queue' | 'matchFound' | 'room' | 'preDebate' | 'postDebate' | 'privateLobbyWaiting' | 'modQueue' | 'modDebatePicker' | 'modDebateWaiting';
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
  modView?: boolean;
  debaterAName?: string;
  debaterBName?: string;
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

interface MatchAcceptResponse {
  player_a_ready: boolean | null;
  player_b_ready: boolean | null;
  status: string;
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
  live: { id: 'live', icon: '🎙️', name: 'LIVE AUDIO', desc: 'Real-time voice debate. 2 min rounds.', available: 'Opponent needed', color: '#E7442A' },
  voicememo: { id: 'voicememo', icon: '🎤', name: 'VOICE MEMO', desc: 'Record & send. Debate on your schedule.', available: 'Async — anytime', color: '#8890A8' },
  text: { id: 'text', icon: '⌨️', name: 'TEXT BATTLE', desc: 'Written arguments. Think before you speak.', available: 'Async — anytime', color: '#555E78' },
  ai: { id: 'ai', icon: '🤖', name: 'AI SPARRING', desc: 'Practice against AI. Instant start.', available: '✅ Always ready', color: '#5DCAA5' },
} as const;

const QUEUE_AI_PROMPT_SEC: Readonly<Record<DebateMode, number>> = { live: 60, voicememo: 60, text: 60, ai: 0 };
const QUEUE_HARD_TIMEOUT_SEC: Readonly<Record<DebateMode, number>> = { live: 180, voicememo: 180, text: 180, ai: 0 };

interface QueueCategory { readonly id: string; readonly icon: string; readonly label: string; }
const QUEUE_CATEGORIES: readonly QueueCategory[] = [
  { id: 'politics',      icon: '🏛️', label: 'Politics' },
  { id: 'sports',        icon: '🏈', label: 'Sports' },
  { id: 'entertainment', icon: '🎬', label: 'Film & TV' },
  { id: 'couples',       icon: '💔', label: 'Couples Court' },
  { id: 'music',         icon: '🎵', label: 'Music' },
  { id: 'trending',      icon: '🔥', label: 'Trending' },
] as const;
const MATCH_ACCEPT_SEC = 12;
const MATCH_ACCEPT_POLL_TIMEOUT_SEC = 15;
const ROUND_DURATION = 120;
const AI_TOTAL_ROUNDS = 6;
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
let queueErrorState = false;
let aiFallbackShown = false;
let matchAcceptTimer: ReturnType<typeof setInterval> | null = null;
let matchAcceptPollTimer: ReturnType<typeof setInterval> | null = null;
let matchAcceptSeconds = 0;
let matchFoundDebate: CurrentDebate | null = null;
let currentDebate: CurrentDebate | null = null;
let roundTimer: ReturnType<typeof setInterval> | null = null;
let roundTimeLeft = 0;
let screenEl: HTMLElement | null = null;
let cssInjected = false;
let selectedModerator: SelectedModerator | null = null;
let selectedRanked = false;
let selectedCategory: string | null = null;
let privateLobbyPollTimer: ReturnType<typeof setInterval> | null = null;
let privateLobbyDebateId: string | null = null;
let modQueuePollTimer: ReturnType<typeof setInterval> | null = null;
let selectedWantMod: boolean = false;
let modStatusPollTimer: ReturnType<typeof setInterval> | null = null;
let modRequestModalShown: boolean = false;
let modDebatePollTimer: ReturnType<typeof setInterval> | null = null;
let modDebateId: string | null = null;
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
let _queuePollInFlight = false;
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

const _onPopState = () => {
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
  if (view === 'matchFound') {
    clearMatchAcceptTimers();
    matchFoundDebate = null;
  }

  // All back navigation returns to lobby
  if (view !== 'lobby') renderLobby();
};
window.addEventListener('popstate', _onPopState);

// ============================================================
// CSS INJECTION
// ============================================================

function injectCSS(): void {
  if (cssInjected) return;
  cssInjected = true;
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
  selectedCategory = null;
  selectedWantMod = false;
  if (privateLobbyPollTimer) { clearInterval(privateLobbyPollTimer); privateLobbyPollTimer = null; }
  privateLobbyDebateId = null;
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
      <div class="arena-hero-title">Arena</div>
      <div class="arena-hero-sub">Pick a mode. Find an opponent. Settle it.</div>
      <div class="arena-stat-row">
        <div class="arena-stat accent">
          <div class="arena-stat-value"><span data-token-balance>0</span></div>
          <div class="arena-stat-label">Tokens</div>
        </div>
        <div class="arena-stat">
          <div class="arena-stat-value">${loginStreak}</div>
          <div class="arena-stat-label">Day Streak</div>
        </div>
      </div>
      <button class="arena-enter-btn" id="arena-enter-btn">
        <span class="btn-pulse"></span> ENTER THE ARENA
      </button>
      <div class="arena-btn-row">
        <button class="arena-secondary-btn" id="arena-private-btn">\u2694\uFE0F PRIVATE DEBATE</button>
        <button class="arena-secondary-btn" id="arena-powerup-shop-btn">\u26A1 POWER-UPS</button>
      </div>
      ${profile?.is_moderator ? `<div class="arena-btn-row" style="margin-top:0;"><button class="arena-secondary-btn" id="arena-mod-queue-btn" style="width:100%;">🧑‍⚖️ MOD QUEUE</button></div>` : ''}
      ${getCurrentUser() && !profile?.is_moderator ? `
      <div id="arena-mod-banner" style="background:var(--mod-bg-card);border:1px solid var(--mod-cyan);border-radius:10px;padding:14px 16px;margin-top:8px;text-align:center;">
        <div style="font-family:var(--mod-font-display);font-size:15px;color:var(--mod-cyan);letter-spacing:1px;margin-bottom:4px;">THE MODERATOR NEEDS MODERATORS</div>
        <div style="font-size:12px;color:var(--mod-text-sub);margin-bottom:10px;">Judge debates. Score arguments. Build your rep.</div>
        <button class="arena-secondary-btn" id="arena-become-mod-btn" style="width:100%;border-color:var(--mod-cyan);color:var(--mod-cyan);">🧑‍⚖️ BECOME A MODERATOR</button>
      </div>` : ''}
      <div class="arena-btn-row" style="margin-top:0;">
        <input id="arena-join-code-input" type="text" maxlength="6" placeholder="JOIN CODE" style="flex:1;padding:10px 14px;border-radius:var(--mod-radius-pill);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:13px;letter-spacing:3px;text-transform:uppercase;outline:none;min-height:44px;">
        <button class="arena-secondary-btn" id="arena-join-code-btn" style="flex:0 0 auto;padding:10px 18px;">GO</button>
      </div>
    </div>
    <div class="arena-section" id="arena-pending-challenges-section" style="display:none;">
      <div class="arena-section-title"><span class="section-dot live-dot"></span> CHALLENGES FOR YOU</div>
      <div id="arena-pending-challenges-feed"></div>
    </div>
    <div class="arena-section" id="arena-live-section">
      <div class="arena-section-title"><span class="section-dot live-dot"></span> LIVE NOW</div>
      <div id="arena-live-feed"></div>
    </div>
    <div class="arena-section" id="arena-challenge-section">
      <div class="arena-section-title"><span class="section-dot gold-dot"></span> OPEN CHALLENGES</div>
      <div class="arena-challenge-cta" id="arena-challenge-cta">
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
  document.getElementById('arena-private-btn')?.addEventListener('click', showPrivateLobbyPicker);
  document.getElementById('arena-mod-queue-btn')?.addEventListener('click', showModQueue);

  // Wire moderator recruitment banner
  document.getElementById('arena-become-mod-btn')?.addEventListener('click', async () => {
    const result = await toggleModerator(true);
    if (!result.error) {
      showToast('🧑‍⚖️ You are now a Moderator!', 'success');
      renderLobby();
    } else {
      showToast('⚠️ Could not enable moderator mode. Try again.', 'error');
    }
  });

  // Wire join code input
  const joinCodeInput = document.getElementById('arena-join-code-input') as HTMLInputElement | null;
  document.getElementById('arena-join-code-btn')?.addEventListener('click', () => {
    const code = joinCodeInput?.value?.trim().toUpperCase() || '';
    if (code.length === 6) void joinWithCode(code);
    else showToast('Enter a 6-character code');
  });
  joinCodeInput?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const code = joinCodeInput.value.trim().toUpperCase();
      if (code.length === 6) void joinWithCode(code);
    }
  });

  // Wire challenge CTA — navigate to home carousel
  document.getElementById('arena-challenge-cta')?.addEventListener('click', () => {
    navigateTo('home');
  });

  // Load lobby content
  void loadLobbyFeed();
  if (!isPlaceholder()) void loadPendingChallenges();

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
  const isLive = d.status === 'live';
  const badge = isLive ? '<span class="arena-card-badge live">\u25CF LIVE</span>'
    : isAuto ? '<span class="arena-card-badge ai">AI DEBATE</span>'
    : '<span class="arena-card-badge verdict">VERDICT</span>';
  const votes = (d.vote_count_a || 0) + (d.vote_count_b || 0);
  const action = isLive ? 'SPECTATE' : 'VIEW';
  const cardClass = isLive ? 'card-live' : isAuto ? 'card-ai' : '';

  return `<div class="arena-card ${cardClass}" data-link="${isAuto ? 'moderator-auto-debate.html' : 'moderator-spectate.html'}?id=${encodeURIComponent(d.id)}">
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
  return `<div class="arena-card card-ai" data-link="moderator-auto-debate.html?id=${encodeURIComponent(d.id)}">
    <div class="arena-card-top"><span class="arena-card-badge ai">AI DEBATE</span></div>
    <div class="arena-card-topic">${escapeHTML(d.topic)}</div>
    <div class="arena-card-vs">
      <span>${escapeHTML(d.side_a_label)}</span>
      <span class="vs">VS</span>
      <span>${escapeHTML(d.side_b_label)}</span>
      <span class="arena-card-score">${Number(d.score_a)}\u2013${Number(d.score_b)}</span>
    </div>
    <div class="arena-card-action"><button class="arena-card-btn">VIEW</button></div>
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

export async function showPowerUpShop(): Promise<void> {
  if (!getCurrentUser() && !isPlaceholder()) {
    window.location.href = 'moderator-plinko.html';
    return;
  }
  view = 'powerUpShop' as ArenaView;
  pushArenaState('powerUpShop');
  const tokenBalance = Number(getCurrentProfile()?.token_balance) || 0;
  const shopHtml = await renderShop(tokenBalance);

  if (screenEl) {
    screenEl.innerHTML = `
      <div style="padding:16px;padding-bottom:80px;max-width:480px;margin:0 auto;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <button id="powerup-shop-back" style="
            background:none;border:none;color:var(--mod-text-body);
            font-family:var(--mod-font-ui);font-size:14px;
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
    window.location.href = 'moderator-plinko.html';
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
              window.location.href = 'moderator-profile-depth.html';
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
    window.location.href = 'moderator-plinko.html';
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
      if (mode === 'ai') {
        enterQueue(mode, topic);
      } else if (maybeRoutePrivate(mode, topic)) {
        // routed to private lobby sub-picker — nothing more to do
      } else {
        showCategoryPicker(mode, topic);
      }
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

  container.replaceChildren();
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
// CATEGORY PICKER
// ============================================================

function showCategoryPicker(mode: string, topic: string): void {
  const overlay = document.createElement('div');
  overlay.className = 'arena-cat-overlay';
  overlay.id = 'arena-cat-overlay';
  overlay.innerHTML = `
    <style>
      .arena-cat-overlay { position:fixed; inset:0; z-index:300; display:flex; align-items:flex-end; }
      .arena-cat-backdrop { position:absolute; inset:0; background:var(--mod-bg-overlay); }
      .arena-cat-sheet { position:relative; width:100%; background:var(--mod-bg-base); border-radius:var(--mod-radius-lg) var(--mod-radius-lg) 0 0; padding:20px 20px calc(20px + var(--safe-bottom)); z-index:1; animation:slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
      @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
      .arena-cat-handle { width:36px; height:4px; border-radius:2px; background:var(--mod-border-primary); margin:0 auto 16px; }
      .arena-cat-title { font-family:var(--mod-font-ui); font-size:11px; font-weight:600; letter-spacing:3px; color:var(--mod-text-muted); text-transform:uppercase; text-align:center; margin-bottom:6px; }
      .arena-cat-subtitle { font-size:13px; color:var(--mod-text-body); text-align:center; margin-bottom:20px; }
      .arena-cat-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
      .arena-cat-btn { display:flex; align-items:center; gap:10px; padding:14px 16px; border-radius:var(--mod-radius-md); border:1px solid var(--mod-border-primary); background:var(--mod-bg-card); cursor:pointer; transition:all 0.15s; }
      .arena-cat-btn:active, .arena-cat-btn.selected { border-color:var(--mod-accent); background:var(--mod-accent-muted); }
      .arena-cat-icon { font-size:20px; flex-shrink:0; }
      .arena-cat-label { font-family:var(--mod-font-ui); font-size:13px; font-weight:600; color:var(--mod-text-primary); letter-spacing:0.5px; }
      .arena-cat-any { width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:14px; border-radius:var(--mod-radius-md); border:1px solid var(--mod-border-subtle); background:transparent; cursor:pointer; font-family:var(--mod-font-ui); font-size:13px; color:var(--mod-text-muted); letter-spacing:1px; margin-bottom:12px; transition:all 0.15s; }
      .arena-cat-any:active { background:var(--mod-bg-card); }
      .arena-cat-cancel { width:100%; padding:12px; border-radius:var(--mod-radius-pill); border:none; background:transparent; color:var(--mod-text-muted); font-family:var(--mod-font-ui); font-size:14px; cursor:pointer; }
    </style>
    <div class="arena-cat-backdrop" id="arena-cat-backdrop"></div>
    <div class="arena-cat-sheet">
      <div class="arena-cat-handle"></div>
      <div class="arena-cat-title">Choose Your Arena</div>
      <div class="arena-cat-subtitle">You'll only match opponents in the same room</div>
      <div class="arena-cat-grid">
        ${QUEUE_CATEGORIES.map(c => `
          <button class="arena-cat-btn" data-cat="${c.id}">
            <span class="arena-cat-icon">${c.icon}</span>
            <span class="arena-cat-label">${c.label}</span>
          </button>
        `).join('')}
      </div>
      <button class="arena-cat-any" id="arena-cat-any">⚡ ANY CATEGORY — FASTEST MATCH</button>
      <label id="arena-want-mod-row" style="display:flex;align-items:center;gap:10px;padding:12px 4px;cursor:pointer;user-select:none;">
        <input type="checkbox" id="arena-want-mod-toggle" style="width:18px;height:18px;accent-color:var(--mod-accent-primary);cursor:pointer;">
        <span style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-body);">🧑‍⚖️ Request a moderator for this debate</span>
      </label>
      <button class="arena-cat-cancel" id="arena-cat-cancel">Back</button>
    </div>
  `;
  document.body.appendChild(overlay);
  pushArenaState('categoryPicker');

  // Wire category buttons
  overlay.querySelectorAll('.arena-cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCategory = (btn as HTMLElement).dataset.cat ?? null;
      selectedWantMod = (document.getElementById('arena-want-mod-toggle') as HTMLInputElement | null)?.checked ?? false;
      overlay.remove();
      enterQueue(mode, topic);
    });
  });

  // Wire "any" button
  document.getElementById('arena-cat-any')?.addEventListener('click', () => {
    selectedCategory = null;
    selectedWantMod = (document.getElementById('arena-want-mod-toggle') as HTMLInputElement | null)?.checked ?? false;
    overlay.remove();
    enterQueue(mode, topic);
  });

  // Wire cancel — go back to lobby
  document.getElementById('arena-cat-cancel')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });

  // Backdrop tap = cancel
  document.getElementById('arena-cat-backdrop')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
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
  queueErrorState = false;
  aiFallbackShown = false;

  const modeInfo = MODES[mode as DebateMode];
  const profile = getCurrentProfile();
  const elo = profile?.elo_rating || 1200;

  const queueEl = document.createElement('div');
  queueEl.className = 'arena-queue arena-fade-in';
  queueEl.innerHTML = `
    <div class="arena-rank-badge ${selectedRanked ? 'ranked' : 'casual'}">${selectedRanked ? '\u2694\uFE0F RANKED' : '\uD83C\uDF7A CASUAL'}</div>
    <div class="arena-queue-search-ring" id="arena-queue-ring">
      <div class="arena-queue-icon">${modeInfo.icon}</div>
    </div>
    <div class="arena-queue-title">${modeInfo.name}${selectedCategory ? ` · ${QUEUE_CATEGORIES.find(c => c.id === selectedCategory)?.label ?? selectedCategory}` : ''}</div>
    <div class="arena-queue-timer" id="arena-queue-timer">0:00</div>
    <div class="arena-queue-status" id="arena-queue-status">Searching for a worthy opponent...</div>
    <div class="arena-queue-elo">Your ELO: ${elo}${selectedRanked ? ' (on the line)' : ''}</div>
    <div class="arena-queue-pop" id="arena-queue-pop"></div>
    <div id="arena-queue-ai-prompt"></div>
    <button class="arena-queue-cancel" id="arena-queue-cancel">\u2715 CANCEL</button>
    <div class="arena-queue-feed" id="arena-queue-feed"></div>
  `;
  screenEl?.appendChild(queueEl);

  document.getElementById('arena-queue-cancel')?.addEventListener('click', leaveQueue);

  // Fetch live debates for spectator feed (fire-and-forget)
  // B-09: filter by selected category, fall back to general feed if empty
  (async () => {
    try {
      let { data } = await safeRpc<ArenaFeedItem[]>('get_arena_feed', { p_limit: 5, p_category: selectedCategory });
      const feedEl = document.getElementById('arena-queue-feed');
      if (!feedEl || view !== 'queue') return;
      let items = data as ArenaFeedItem[] | null;

      // Fallback: if category filter returned nothing, load general feed
      if ((!items || items.length === 0) && selectedCategory) {
        const fallback = await safeRpc<ArenaFeedItem[]>('get_arena_feed', { p_limit: 5, p_category: null });
        items = fallback.data as ArenaFeedItem[] | null;
      }

      if (items && items.length > 0) {
        const live = items.filter((d: ArenaFeedItem) => d.status === 'live');
        const recent = items.filter((d: ArenaFeedItem) => d.status !== 'live').slice(0, 3);
        const cards = [...live, ...recent].slice(0, 4);
        if (cards.length > 0) {
          feedEl.innerHTML = `<div class="arena-queue-feed-label">\uD83D\uDC41\uFE0F Live in the Arena</div>`
            + cards.map((d: ArenaFeedItem) => renderArenaFeedCard(d, d.status === 'live' ? 'live' : 'verdict')).join('');
        }
      } else {
        feedEl.innerHTML = `<div class="arena-queue-feed-label" style="opacity:0.4;">\u2014 no active debates right now \u2014</div>`;
      }
    } catch { /* feed is optional */ }
  })();

  queueElapsedTimer = setInterval(() => {
    if (queueErrorState) return;
    queueSeconds++;
    const timerEl = document.getElementById('arena-queue-timer');
    if (timerEl) timerEl.textContent = formatTimer(queueSeconds);

    // Status text progression
    updateQueueStatus(queueSeconds);

    // AI Sparring prompt at 60s (queue keeps running)
    const aiPromptSec = QUEUE_AI_PROMPT_SEC[mode as DebateMode] ?? 60;
    if (aiPromptSec > 0 && queueSeconds === aiPromptSec && !aiFallbackShown) {
      showAIFallbackPrompt();
    }

    // Hard timeout — give up
    const hardTimeout = QUEUE_HARD_TIMEOUT_SEC[mode as DebateMode] ?? 180;
    if (hardTimeout > 0 && queueSeconds >= hardTimeout) {
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

function updateQueueStatus(seconds: number): void {
  const statusEl = document.getElementById('arena-queue-status');
  if (!statusEl) return;

  if (aiFallbackShown) {
    statusEl.textContent = 'Queue still active \u2014 searching...';
  } else if (seconds <= 15) {
    statusEl.textContent = 'Searching for a worthy opponent...';
  } else if (seconds <= 30) {
    statusEl.textContent = 'Expanding search range...';
  } else if (seconds <= 45) {
    statusEl.textContent = 'Searching all regions...';
  } else {
    statusEl.textContent = 'Still looking...';
  }
}

function showAIFallbackPrompt(): void {
  aiFallbackShown = true;
  const promptEl = document.getElementById('arena-queue-ai-prompt');
  if (!promptEl) return;

  promptEl.innerHTML = `
    <div class="arena-queue-ai-fallback arena-fade-in">
      <div class="arena-queue-ai-fallback-text">\uD83E\uDD16 No opponents yet. Sharpen your skills while you wait?</div>
      <button class="arena-post-btn primary" id="arena-queue-ai-spar">SPAR WITH AI</button>
    </div>
  `;
  document.getElementById('arena-queue-ai-spar')?.addEventListener('click', () => {
    leaveQueue();
    enterQueue('ai', '');
  });
}

async function joinServerQueue(mode: DebateMode, topic: string): Promise<void> {
  try {
    const { data, error } = await safeRpc<MatchData>('join_debate_queue', {
      p_mode: mode,
      p_category: selectedCategory,
      p_topic: topic || null,
      p_ranked: selectedRanked,
    });
    if (error) throw error;
    if ((data as MatchData)?.status === 'matched') {
      onMatchFound(data as MatchData);
    } else {
      queuePollTimer = setInterval(async () => {
        if (view !== 'queue') return;
        if (_queuePollInFlight) return;
        _queuePollInFlight = true;
        try {
          const { data: status, error: pollErr } = await safeRpc<MatchData>('check_queue_status');
          if (pollErr) throw pollErr;
          if (view !== 'queue') return;

          // Update queue population count
          const qc = (status as Record<string, unknown>)?.queue_count;
          const popEl = document.getElementById('arena-queue-pop');
          if (popEl) {
            const count = typeof qc === 'number' ? qc : 0;
            popEl.textContent = count > 0 ? `${count} other${count !== 1 ? 's' : ''} searching` : '';
          }

          if (status && (status as MatchData).status === 'matched') {
            onMatchFound(status as MatchData);
          }
        } catch { /* handled */ } finally {
          _queuePollInFlight = false;
        }
      }, 4000);
    }
  } catch (err) {
    console.error('[Arena] Queue join error:', err);
    queueErrorState = true;
    const statusEl = document.getElementById('arena-queue-status');
    if (statusEl) statusEl.textContent = friendlyError(err) || 'Queue error \u2014 try again';
  }
}

function onMatchFound(data: MatchData): void {
  clearQueueTimers();
  const statusEl = document.getElementById('arena-queue-status');
  if (statusEl) {
    statusEl.textContent = '\uD83C\uDFAF OPPONENT FOUND!';
    statusEl.style.color = 'var(--mod-accent)';
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
      showMatchFound(debateData);
    }
  }, 1200);
}

function onQueueTimeout(): void {
  clearQueueTimers();

  // Stop the search ring animation
  const ringEl = document.getElementById('arena-queue-ring');
  if (ringEl) ringEl.classList.add('stopped');

  const statusEl = document.getElementById('arena-queue-status');
  if (statusEl) {
    statusEl.textContent = 'No opponents available right now.';
    statusEl.style.color = 'var(--mod-muted, #8890A8)';
  }

  // Clear AI prompt if it was showing
  const promptEl = document.getElementById('arena-queue-ai-prompt');
  if (promptEl) promptEl.innerHTML = '';

  // Show final options
  const queueEl = screenEl?.querySelector('.arena-queue');
  if (queueEl) {
    const alt = document.createElement('div');
    alt.className = 'arena-queue-timeout-options arena-fade-in';
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
// MATCH FOUND — ACCEPT/DECLINE (F-02)
// ============================================================

function clearMatchAcceptTimers(): void {
  if (matchAcceptTimer) { clearInterval(matchAcceptTimer); matchAcceptTimer = null; }
  if (matchAcceptPollTimer) { clearInterval(matchAcceptPollTimer); matchAcceptPollTimer = null; }
}

function showMatchFound(debateData: CurrentDebate): void {
  clearMatchAcceptTimers();
  matchFoundDebate = debateData;
  view = 'matchFound';
  pushArenaState('matchFound');
  if (screenEl) screenEl.innerHTML = '';

  matchAcceptSeconds = MATCH_ACCEPT_SEC;

  const opInitial = (debateData.opponentName[0] || '?').toUpperCase();
  const mf = document.createElement('div');
  mf.className = 'arena-match-found arena-fade-in';
  mf.innerHTML = `
    <div class="arena-mf-label">\u2694\uFE0F MATCH FOUND</div>
    <div class="arena-mf-opponent">
      <div class="arena-mf-avatar">${opInitial}</div>
      <div class="arena-mf-name">${escapeHTML(debateData.opponentName)}</div>
      <div class="arena-mf-elo">${debateData.opponentElo} ELO</div>
    </div>
    <div class="arena-mf-topic">${escapeHTML(debateData.topic)}</div>
    <div class="arena-mf-countdown" id="mf-countdown">${matchAcceptSeconds}</div>
    <div class="arena-mf-status" id="mf-status">Accept before time runs out</div>
    <div class="arena-mf-buttons">
      <button class="arena-mf-btn accept" id="mf-accept-btn">ACCEPT</button>
      <button class="arena-mf-btn decline" id="mf-decline-btn">DECLINE</button>
    </div>
  `;
  screenEl?.appendChild(mf);

  document.getElementById('mf-accept-btn')?.addEventListener('click', () => onMatchAccept());
  document.getElementById('mf-decline-btn')?.addEventListener('click', () => onMatchDecline());

  matchAcceptTimer = setInterval(() => {
    matchAcceptSeconds--;
    const cdEl = document.getElementById('mf-countdown');
    if (cdEl) cdEl.textContent = String(matchAcceptSeconds);
    if (matchAcceptSeconds <= 0) {
      onMatchDecline();
    }
  }, 1000);
}

async function onMatchAccept(): Promise<void> {
  clearInterval(matchAcceptTimer!);
  matchAcceptTimer = null;
  const acceptBtn = document.getElementById('mf-accept-btn') as HTMLButtonElement | null;
  const declineBtn = document.getElementById('mf-decline-btn') as HTMLButtonElement | null;
  if (acceptBtn) { acceptBtn.disabled = true; acceptBtn.style.opacity = '0.5'; }
  if (declineBtn) { declineBtn.disabled = true; declineBtn.style.opacity = '0.5'; }

  const statusEl = document.getElementById('mf-status');
  if (statusEl) statusEl.textContent = 'Waiting for opponent\u2026';

  if (!isPlaceholder() && matchFoundDebate) {
    const { error } = await safeRpc('respond_to_match', { p_debate_id: matchFoundDebate.id, p_accept: true });
    if (error) {
      if (statusEl) statusEl.textContent = 'Error \u2014 retrying\u2026';
      if (acceptBtn) { acceptBtn.disabled = false; acceptBtn.style.opacity = '1'; }
      if (declineBtn) { declineBtn.disabled = false; declineBtn.style.opacity = '1'; }
      return;
    }
  }

  // Start polling for opponent acceptance
  let pollElapsed = 0;
  matchAcceptPollTimer = setInterval(async () => {
    pollElapsed += 1.5;
    if (pollElapsed >= MATCH_ACCEPT_POLL_TIMEOUT_SEC) {
      onOpponentDeclined();
      return;
    }
    if (!matchFoundDebate || isPlaceholder()) {
      onMatchConfirmed();
      return;
    }
    try {
      const { data, error } = await safeRpc<MatchAcceptResponse>('check_match_acceptance', { p_debate_id: matchFoundDebate.id });
      if (error || !data) return;
      const resp = data as MatchAcceptResponse;
      if (resp.status === 'cancelled') {
        onOpponentDeclined();
        return;
      }
      const myCol = matchFoundDebate.role === 'a' ? resp.player_a_ready : resp.player_b_ready;
      const opCol = matchFoundDebate.role === 'a' ? resp.player_b_ready : resp.player_a_ready;
      if (opCol === false) { onOpponentDeclined(); return; }
      if (myCol === true && opCol === true) { onMatchConfirmed(); return; }
    } catch { /* retry next tick */ }
  }, 1500);
}

function onMatchDecline(): void {
  clearMatchAcceptTimers();
  if (!isPlaceholder() && matchFoundDebate) {
    safeRpc('respond_to_match', { p_debate_id: matchFoundDebate.id, p_accept: false }).catch(() => {});
  }
  returnToQueueAfterDecline();
}

function onMatchConfirmed(): void {
  clearMatchAcceptTimers();
  const statusEl = document.getElementById('mf-status');
  if (statusEl) statusEl.textContent = '\u2705 Both ready \u2014 entering battle!';
  if (matchFoundDebate) {
    if (selectedWantMod && !isPlaceholder()) {
      safeRpc('request_mod_for_debate', { p_debate_id: matchFoundDebate.id }).catch(() => {});
    }
    selectedWantMod = false;
    setTimeout(() => { void showPreDebate(matchFoundDebate!); }, 800);
  }
}

function onOpponentDeclined(): void {
  clearMatchAcceptTimers();
  const statusEl = document.getElementById('mf-status');
  if (statusEl) statusEl.textContent = 'Opponent declined \u2014 returning to queue\u2026';
  const acceptBtn = document.getElementById('mf-accept-btn') as HTMLButtonElement | null;
  const declineBtn = document.getElementById('mf-decline-btn') as HTMLButtonElement | null;
  if (acceptBtn) { acceptBtn.disabled = true; acceptBtn.style.opacity = '0.5'; }
  if (declineBtn) { declineBtn.disabled = true; declineBtn.style.opacity = '0.5'; }
  setTimeout(() => returnToQueueAfterDecline(), 1500);
}

function returnToQueueAfterDecline(): void {
  matchFoundDebate = null;
  if (selectedMode) {
    enterQueue(selectedMode, '');
  } else {
    renderLobby();
  }
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
    totalRounds: AI_TOTAL_ROUNDS,
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

  nudge('enter_debate', '⚔️ You\'re in. Make every word count.');

  // Session 121: Set debate status to 'live'
  if (debate.mode === 'ai' && !isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
    safeRpc('update_arena_debate', { p_debate_id: debate.id, p_status: 'live' }).catch((e: unknown) => {
      console.warn('[Arena] Status update to live failed:', e);
    });
  }

  const profile = getCurrentProfile();
  const isModView = debate.modView === true;
  const myName = isModView ? (debate.debaterAName || 'Debater A') : (profile?.display_name || profile?.username || 'You');
  const myElo = profile?.elo_rating || 1200;
  const myInitial = isModView ? (debate.debaterAName?.[0] || 'A').toUpperCase() : (myName[0] || '?').toUpperCase();
  const oppName = isModView ? (debate.debaterBName || 'Debater B') : debate.opponentName;
  const oppInitial = (oppName[0] || '?').toUpperCase();
  const isAI = debate.mode === 'ai';

  const room = document.createElement('div');
  room.className = 'arena-room arena-fade-in';
  room.innerHTML = `
    <div class="arena-room-header">
      <div class="arena-rank-badge ${debate.ranked ? 'ranked' : 'casual'}" style="margin-bottom:6px">${debate.ranked ? '\u2694\uFE0F RANKED' : '\uD83C\uDF7A CASUAL'}</div>
      <div class="arena-room-topic">${escapeHTML(debate.topic)}</div>
      <div class="arena-room-round" id="arena-round-label">ROUND ${debate.round}/${debate.totalRounds}</div>
      ${debate.mode === 'live' ? `<div class="arena-room-timer" id="arena-room-timer">${formatTimer(ROUND_DURATION)}</div>` : ''}
    </div>
    ${isAI ? `<div class="ai-generated-badge" style="align-self:center;margin:0 0 4px;">
      <span class="ai-icon">AI</span>
      AI Sparring Partner \u2014 Not a Real Person
    </div>` : ''}
    <div class="arena-vs-bar">
      <div class="arena-debater">
        <div class="arena-debater-avatar">${myInitial}</div>
        <div class="arena-debater-info">
          <div class="arena-debater-name">${escapeHTML(myName)}</div>
          <div class="arena-debater-elo">${Number(myElo)} ELO <span style="color:var(--mod-bar-secondary);margin-left:6px;font-size:11px;">\uD83E\uDE99 ${Number(profile?.token_balance) || 0}</span></div>
        </div>
      </div>
      <div class="arena-vs-text">VS</div>
      <div class="arena-debater right">
        <div class="arena-debater-avatar ${isAI ? 'ai-avatar' : ''}">${isAI ? '\uD83E\uDD16' : oppInitial}</div>
        <div class="arena-debater-info" style="text-align:right;">
          <div class="arena-debater-name">${escapeHTML(oppName)}</div>
          <div class="arena-debater-elo">${isModView ? '' : `${Number(debate.opponentElo)} ELO`}</div>
        </div>
      </div>
    </div>
    <div id="powerup-loadout-container"></div>
    <div class="arena-spectator-bar"><span class="eye">\uD83D\uDC41\uFE0F</span> <span id="arena-spectator-count">0</span> watching</div>
    <div class="arena-messages" id="arena-messages"></div>
    <div class="arena-input-area" id="arena-input-area" ${isModView ? 'style="display:none;"' : ''}></div>
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
      vsBar.parentNode?.insertBefore(modBar, vsBar.nextSibling);
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
          messagesEl.parentNode?.insertBefore(barContainer.firstElementChild, messagesEl.nextSibling);
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

  // Session 39: Start reference polling if moderator assigned (or mod is observing)
  if ((selectedModerator || debate.modView) && debate.id && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
    startReferencePoll(debate.id);
  }

  // F-47: Start mod status poll for human debates — skip if this user IS the mod
  if (!debate.modView && debate.mode !== 'ai' && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-') && !isPlaceholder()) {
    startModStatusPoll(debate.id);
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
            <button class="arena-card-btn arena-hidden" id="arena-vm-send" style="border-color:var(--mod-accent-border);color:var(--mod-accent);">SEND</button>
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

// Session 208: Get user JWT for Edge Function auth (audit #32)
async function getUserJwt(): Promise<string | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session?.access_token ?? null;
  } catch {
    return null;
  }
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
    const jwt = await getUserJwt();
    if (!jwt) throw new Error('Not authenticated');

    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwt,
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

// ============================================================
// AI SCORING — post-debate analysis
// ============================================================

interface CriterionScore {
  score: number;
  reason: string;
}

interface SideScores {
  logic: CriterionScore;
  evidence: CriterionScore;
  delivery: CriterionScore;
  rebuttal: CriterionScore;
}

interface AIScoreResult {
  side_a: SideScores;
  side_b: SideScores;
  overall_winner: string;
  verdict: string;
}

async function requestAIScoring(topic: string, messages: DebateMessage[]): Promise<AIScoreResult | null> {
  const messageHistory = messages.map((m) => ({
    role: m.role,
    content: m.text,
  }));

  try {
    const supabaseUrl = SUPABASE_URL;
    if (!supabaseUrl) throw new Error('No supabase URL');

    const edgeUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1/ai-sparring';
    const jwt = await getUserJwt();
    if (!jwt) throw new Error('Not authenticated');

    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwt,
      },
      body: JSON.stringify({ mode: 'score', topic, messageHistory }),
    });

    if (!res.ok) throw new Error('Scoring API error: ' + res.status);
    const data = await res.json() as { scores?: AIScoreResult };
    if (data?.scores) return data.scores;
    throw new Error('No scores in response');
  } catch (err) {
    console.warn('[Arena] AI scoring failed, falling back to random:', err);
    return null;
  }
}

function sumSideScore(side: SideScores): number {
  return side.logic.score + side.evidence.score + side.delivery.score + side.rebuttal.score;
}

function renderAIScorecard(
  myName: string,
  oppName: string,
  myRole: DebateRole,
  scores: AIScoreResult
): string {
  const mySide = myRole === 'a' ? scores.side_a : scores.side_b;
  const oppSide = myRole === 'a' ? scores.side_b : scores.side_a;
  const myTotal = sumSideScore(mySide);
  const oppTotal = sumSideScore(oppSide);

  function renderBar(label: string, mine: CriterionScore, theirs: CriterionScore): string {
    const myPct = mine.score * 10;
    const theirPct = theirs.score * 10;
    return `
      <div class="ai-score-criterion">
        <div class="ai-score-criterion-header">
          <span class="ai-score-criterion-label">${label}</span>
          <span class="ai-score-criterion-nums">${mine.score} \u2014 ${theirs.score}</span>
        </div>
        <div class="ai-score-bars">
          <div class="ai-score-bar mine" style="width: ${myPct}%"></div>
          <div class="ai-score-bar theirs" style="width: ${theirPct}%"></div>
        </div>
        <div class="ai-score-reason">${escapeHTML(mine.reason)}</div>
      </div>
    `;
  }

  return `
    <div class="ai-scorecard">
      <div class="ai-scorecard-header">
        <div class="ai-scorecard-side">
          <div class="ai-scorecard-name">${escapeHTML(myName)}</div>
          <div class="ai-scorecard-total ${myTotal >= oppTotal ? 'winner' : 'loser'}">${myTotal}</div>
        </div>
        <div class="ai-scorecard-vs">VS</div>
        <div class="ai-scorecard-side">
          <div class="ai-scorecard-name">${escapeHTML(oppName)}</div>
          <div class="ai-scorecard-total ${oppTotal >= myTotal ? 'winner' : 'loser'}">${oppTotal}</div>
        </div>
      </div>
      <div class="ai-scorecard-breakdown">
        ${renderBar('\uD83E\uDDE0 LOGIC', mySide.logic, oppSide.logic)}
        ${renderBar('\uD83D\uDCDA EVIDENCE', mySide.evidence, oppSide.evidence)}
        ${renderBar('\uD83C\uDFA4 DELIVERY', mySide.delivery, oppSide.delivery)}
        ${renderBar('\u2694\uFE0F REBUTTAL', mySide.rebuttal, oppSide.rebuttal)}
      </div>
      <div class="ai-scorecard-verdict">${escapeHTML(scores.verdict)}</div>
    </div>
  `;
}

function advanceRound(): void {
  const debate = currentDebate!;
  if (debate.round >= debate.totalRounds) {
    setTimeout(() => void endCurrentDebate(), 1500);
    return;
  }
  debate.round++;
  nudge('round_end', '🔔 Round complete. Stay sharp.');
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

  onWebRTC('disconnected', (data: unknown) => {
    const { recovering } = data as { state: string; recovering?: boolean };
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) {
      statusEl.textContent = recovering
        ? '\uD83D\uDFE1 Connection interrupted — reconnecting...'
        : '\uD83D\uDD34 Connection lost';
    }
  });

  // Session 208: ICE restart feedback (audit #14)
  onWebRTC('reconnecting', (data: unknown) => {
    const { attempt, max } = data as { attempt: number; max: number };
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = `\uD83D\uDFE1 Reconnecting (${attempt}/${max})...`;
  });

  onWebRTC('connectionFailed', () => {
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = '\uD83D\uDD34 Connection failed \u2014 audio unavailable';
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
  stopModStatusPoll();
  document.getElementById('mod-request-modal')?.remove();

  const debate = currentDebate!;

  if (debate.mode === 'live') {
    leaveDebate();
  }

  // Generate scores
  let scoreA: number;
  let scoreB: number;
  let aiScores: AIScoreResult | null = null;

  if (debate.mode === 'ai' && debate.messages.length > 0) {
    // Show "judging" state while AI scores
    if (screenEl) {
      screenEl.innerHTML = '';
      const judging = document.createElement('div');
      judging.className = 'arena-post arena-fade-in';
      judging.innerHTML = `
        <div class="arena-judging">
          <div class="arena-judging-icon">\u2696\uFE0F</div>
          <div class="arena-judging-text">THE JUDGE IS REVIEWING...</div>
          <div class="arena-judging-sub">Analyzing ${debate.messages.length} arguments across ${debate.round} rounds</div>
          <div class="arena-typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        </div>
      `;
      screenEl.appendChild(judging);
    }

    aiScores = await requestAIScoring(debate.topic, debate.messages);
    if (aiScores) {
      scoreA = sumSideScore(aiScores.side_a);
      scoreB = sumSideScore(aiScores.side_b);
    } else {
      // Fallback if scoring API fails
      scoreA = 60 + Math.floor(Math.random() * 30);
      scoreB = 60 + Math.floor(Math.random() * 30);
    }
  } else if (debate.mode === 'ai' || !debate.opponentId) {
    scoreA = 60 + Math.floor(Math.random() * 30);
    scoreB = 60 + Math.floor(Math.random() * 30);
  } else {
    scoreA = 70;
    scoreB = 70;
  }
  const winner: DebateRole = scoreA >= scoreB ? 'a' : 'b';
  const didWin = winner === debate.role;

  nudge('final_score', didWin ? '🏆 Victory. The arena remembers.' : '💀 Defeat. Come back stronger.', didWin ? 'success' : 'info');
  let eloChangeMe = 0;
  if (!debate.modView && !isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
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
    ${aiScores ? renderAIScorecard(myName, debate.opponentName, debate.role, aiScores) : ''}
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

  // FIX 1: Post-debate moderator recruitment nudge
  if (getCurrentUser() && getCurrentProfile()?.is_moderator !== true) {
    nudge('become_moderator_post_debate', '🧑‍⚖️ Think you could call it better? Become a Moderator → Settings');
  }

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
    messages.parentNode?.insertBefore(form, messages.nextSibling);
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

    const jwt = await getUserJwt();
    if (!jwt) throw new Error('Not authenticated');
    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwt,
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
        if (scoredEl) { scoredEl.textContent = '\u274C ' + (friendlyError(result.error) || String(result.error)); scoredEl.style.display = 'block'; scoredEl.style.color = 'var(--mod-accent)'; }
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
      if (scoredEl) { scoredEl.textContent = '\u274C ' + (friendlyError(result.error) || String(result.error)); scoredEl.style.display = 'block'; scoredEl.style.color = 'var(--mod-accent)'; }
      if (submitBtn) { submitBtn.textContent = 'SUBMIT SCORE'; submitBtn.disabled = false; }
    } else {
      if (scoredEl) { scoredEl.textContent = '\u2705 Score submitted'; scoredEl.style.display = 'block'; }
      if (submitBtn) submitBtn.remove();
    }
  });
}

// ============================================================
// F-46: PRIVATE LOBBY
// ============================================================

interface PrivateLobbyResult {
  debate_id: string;
  join_code: string | null;
}

interface PendingChallenge {
  debate_id: string;
  mode: string;
  topic: string | null;
  ranked: boolean;
  challenger_name: string;
  challenger_id: string;
  challenger_elo: number;
  created_at: string;
}

interface CheckPrivateLobbyResult {
  status: string;
  opponent_id: string | null;
  opponent_name: string | null;
  opponent_elo: number | null;
  player_b_ready: boolean | null;
}

interface JoinPrivateLobbyResult {
  debate_id: string;
  status: string;
  topic: string | null;
  mode: string;
  opponent_name: string;
  opponent_id: string;
  opponent_elo: number;
}

export function showPrivateLobbyPicker(): void {
  if (!getCurrentUser() && !isPlaceholder()) {
    window.location.href = 'moderator-plinko.html';
    return;
  }
  const overlay = document.createElement('div');
  overlay.id = 'arena-private-overlay';
  overlay.innerHTML = `
    <style>
      #arena-private-overlay { position:fixed;inset:0;z-index:300;display:flex;align-items:flex-end; }
      .arena-private-backdrop { position:absolute;inset:0;background:var(--mod-bg-overlay); }
      .arena-private-sheet { position:relative;width:100%;background:var(--mod-bg-base);border-radius:var(--mod-radius-lg) var(--mod-radius-lg) 0 0;padding:20px 20px calc(20px + var(--safe-bottom));z-index:1;animation:slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
      @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
      .arena-private-handle { width:36px;height:4px;border-radius:2px;background:var(--mod-border-primary);margin:0 auto 16px; }
      .arena-private-title { font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:3px;color:var(--mod-text-muted);text-transform:uppercase;text-align:center;margin-bottom:6px; }
      .arena-private-sub { font-size:13px;color:var(--mod-text-body);text-align:center;margin-bottom:20px; }
      .arena-private-card { display:flex;align-items:center;gap:14px;padding:16px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);cursor:pointer;margin-bottom:10px;transition:background 0.15s; }
      .arena-private-card:active { background:var(--mod-bg-card-hover); }
      .arena-private-card-icon { font-size:26px;flex-shrink:0; }
      .arena-private-card-name { font-family:var(--mod-font-ui);font-size:13px;font-weight:600;letter-spacing:0.5px;color:var(--mod-text-primary); }
      .arena-private-card-desc { font-size:12px;color:var(--mod-text-muted);margin-top:2px; }
      .arena-private-cancel { width:100%;padding:12px;border-radius:var(--mod-radius-pill);border:none;background:transparent;color:var(--mod-text-muted);font-family:var(--mod-font-ui);font-size:14px;cursor:pointer;margin-top:4px; }
    </style>
    <div class="arena-private-backdrop" id="arena-private-backdrop"></div>
    <div class="arena-private-sheet">
      <div class="arena-private-handle"></div>
      <div class="arena-private-title">Private Debate</div>
      <div class="arena-private-sub">Pick who can join</div>
      <div class="arena-private-card" id="arena-private-username">
        <div class="arena-private-card-icon">\u2694\uFE0F</div>
        <div>
          <div class="arena-private-card-name">CHALLENGE BY USERNAME</div>
          <div class="arena-private-card-desc">Send a direct challenge to one specific user</div>
        </div>
      </div>
      <div class="arena-private-card" id="arena-private-group">
        <div class="arena-private-card-icon">\uD83D\uDEE1\uFE0F</div>
        <div>
          <div class="arena-private-card-name">GROUP MEMBERS ONLY</div>
          <div class="arena-private-card-desc">Any member of one of your groups can join</div>
        </div>
      </div>
      <div class="arena-private-card" id="arena-private-code">
        <div class="arena-private-card-icon">\uD83D\uDD11</div>
        <div>
          <div class="arena-private-card-name">SHAREABLE JOIN CODE</div>
          <div class="arena-private-card-desc">Get a 6-character code — share it anywhere</div>
        </div>
      </div>
      <button class="arena-private-cancel" id="arena-private-cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  pushArenaState('privatePicker');

  document.getElementById('arena-private-username')?.addEventListener('click', () => {
    overlay.remove();
    showModeSelectThen('username');
  });
  document.getElementById('arena-private-group')?.addEventListener('click', () => {
    overlay.remove();
    showModeSelectThen('group');
  });
  document.getElementById('arena-private-code')?.addEventListener('click', () => {
    overlay.remove();
    showModeSelectThen('code');
  });
  document.getElementById('arena-private-cancel')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });
  document.getElementById('arena-private-backdrop')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });
}

// Capture the private lobby type chosen, then flow through mode select → category picker
let _pendingPrivateType: 'username' | 'group' | 'code' | null = null;

function showModeSelectThen(privateType: 'username' | 'group' | 'code'): void {
  _pendingPrivateType = privateType;
  showModeSelect();
}

// Called from inside showModeSelect() card click — intercepts non-AI modes
// when _pendingPrivateType is set, routes to private lobby sub-picker instead of queue
function maybeRoutePrivate(mode: string, topic: string): boolean {
  if (!_pendingPrivateType) return false;
  const type = _pendingPrivateType;
  _pendingPrivateType = null;
  if (mode === 'ai') return false; // AI can't be private
  if (type === 'username') showUserSearchPicker(mode, topic);
  else if (type === 'group') void showGroupLobbyPicker(mode, topic);
  else if (type === 'code') void createAndWaitPrivateLobby(mode, topic, 'code');
  return true;
}

function showUserSearchPicker(mode: string, topic: string): void {
  const overlay = document.createElement('div');
  overlay.id = 'arena-user-search-overlay';
  overlay.innerHTML = `
    <style>
      #arena-user-search-overlay { position:fixed;inset:0;z-index:300;display:flex;align-items:flex-end; }
      .arena-user-search-backdrop { position:absolute;inset:0;background:var(--mod-bg-overlay); }
      .arena-user-search-sheet { position:relative;width:100%;background:var(--mod-bg-base);border-radius:var(--mod-radius-lg) var(--mod-radius-lg) 0 0;padding:20px 20px calc(20px + var(--safe-bottom));z-index:1;max-height:70vh;display:flex;flex-direction:column;animation:slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
      .arena-user-search-handle { width:36px;height:4px;border-radius:2px;background:var(--mod-border-primary);margin:0 auto 16px; }
      .arena-user-search-title { font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:3px;color:var(--mod-text-muted);text-transform:uppercase;text-align:center;margin-bottom:16px; }
      .arena-user-search-input { width:100%;padding:12px 16px;border-radius:var(--mod-radius-pill);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;outline:none;margin-bottom:12px;min-height:44px; }
      .arena-user-search-input:focus { border-color:var(--mod-accent-border); }
      .arena-user-search-results { flex:1;overflow-y:auto; }
      .arena-user-row { display:flex;align-items:center;gap:12px;padding:12px;border-radius:var(--mod-radius-md);cursor:pointer;transition:background 0.1s; }
      .arena-user-row:active { background:var(--mod-bg-card); }
      .arena-user-avatar { width:40px;height:40px;border-radius:50%;border:2px solid var(--mod-bar-secondary);background:var(--mod-bg-card);font-family:var(--mod-font-ui);font-size:16px;font-weight:700;color:var(--mod-bar-secondary);display:flex;align-items:center;justify-content:center;flex-shrink:0; }
      .arena-user-name { font-family:var(--mod-font-ui);font-size:14px;font-weight:600;color:var(--mod-text-primary); }
      .arena-user-elo { font-size:11px;color:var(--mod-text-muted); }
      .arena-user-search-cancel { width:100%;padding:12px;border:none;background:transparent;color:var(--mod-text-muted);font-family:var(--mod-font-ui);font-size:14px;cursor:pointer;margin-top:8px;flex-shrink:0; }
    </style>
    <div class="arena-user-search-backdrop" id="arena-user-search-backdrop"></div>
    <div class="arena-user-search-sheet">
      <div class="arena-user-search-handle"></div>
      <div class="arena-user-search-title">Challenge by Username</div>
      <input class="arena-user-search-input" id="arena-user-search-input" type="text" placeholder="Search username..." autocomplete="off">
      <div class="arena-user-search-results" id="arena-user-search-results">
        <div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:20px 0;">Type to search</div>
      </div>
      <button class="arena-user-search-cancel" id="arena-user-search-cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  pushArenaState('userSearch');

  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  const input = document.getElementById('arena-user-search-input') as HTMLInputElement;
  const results = document.getElementById('arena-user-search-results')!;

  input.addEventListener('input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    const q = input.value.trim();
    if (q.length < 1) {
      results.innerHTML = '<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:20px 0;">Type to search</div>';
      return;
    }
    results.innerHTML = '<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:20px 0;">\u23F3 Searching...</div>';
    searchTimer = setTimeout(async () => {
      try {
        const { data, error } = await safeRpc<{ id: string; username: string; display_name: string; elo_rating: number }[]>(
          'search_users_by_username', { p_query: q }
        );
        if (error || !data || (data as unknown[]).length === 0) {
          results.innerHTML = '<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:20px 0;">No users found</div>';
          return;
        }
        results.innerHTML = (data as { id: string; username: string; display_name: string; elo_rating: number }[]).map(u => `
          <div class="arena-user-row" data-uid="${escapeHTML(u.id)}" data-uname="${escapeHTML(u.display_name || u.username)}">
            <div class="arena-user-avatar">${(u.display_name || u.username || '?')[0].toUpperCase()}</div>
            <div>
              <div class="arena-user-name">${escapeHTML(u.display_name || u.username)}</div>
              <div class="arena-user-elo">${u.elo_rating} ELO</div>
            </div>
          </div>
        `).join('');
        results.querySelectorAll('.arena-user-row').forEach(row => {
          row.addEventListener('click', () => {
            const uid = (row as HTMLElement).dataset.uid!;
            const uname = (row as HTMLElement).dataset.uname!;
            overlay.remove();
            void createAndWaitPrivateLobby(mode, topic, 'private', uid, uname);
          });
        });
      } catch {
        results.innerHTML = '<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:20px 0;">Search failed — try again</div>';
      }
    }, 350);
  });

  document.getElementById('arena-user-search-cancel')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });
  document.getElementById('arena-user-search-backdrop')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });
}

async function showGroupLobbyPicker(mode: string, topic: string): Promise<void> {
  const overlay = document.createElement('div');
  overlay.id = 'arena-group-pick-overlay';
  overlay.innerHTML = `
    <style>
      #arena-group-pick-overlay { position:fixed;inset:0;z-index:300;display:flex;align-items:flex-end; }
      .arena-group-pick-backdrop { position:absolute;inset:0;background:var(--mod-bg-overlay); }
      .arena-group-pick-sheet { position:relative;width:100%;background:var(--mod-bg-base);border-radius:var(--mod-radius-lg) var(--mod-radius-lg) 0 0;padding:20px 20px calc(20px + var(--safe-bottom));z-index:1;max-height:70vh;overflow-y:auto;animation:slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
      .arena-group-pick-handle { width:36px;height:4px;border-radius:2px;background:var(--mod-border-primary);margin:0 auto 16px; }
      .arena-group-pick-title { font-family:var(--mod-font-ui);font-size:11px;font-weight:600;letter-spacing:3px;color:var(--mod-text-muted);text-transform:uppercase;text-align:center;margin-bottom:16px; }
      .arena-group-row { display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);cursor:pointer;margin-bottom:10px;transition:background 0.1s; }
      .arena-group-row:active { background:var(--mod-bg-card-hover); }
      .arena-group-row-name { font-family:var(--mod-font-ui);font-size:14px;font-weight:600;color:var(--mod-text-primary); }
      .arena-group-row-count { font-size:11px;color:var(--mod-text-muted); }
      .arena-group-pick-cancel { width:100%;padding:12px;border:none;background:transparent;color:var(--mod-text-muted);font-family:var(--mod-font-ui);font-size:14px;cursor:pointer;margin-top:4px; }
    </style>
    <div class="arena-group-pick-backdrop" id="arena-group-pick-backdrop"></div>
    <div class="arena-group-pick-sheet">
      <div class="arena-group-pick-handle"></div>
      <div class="arena-group-pick-title">Select Your Group</div>
      <div id="arena-group-pick-list">\u23F3 Loading...</div>
      <button class="arena-group-pick-cancel" id="arena-group-pick-cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  pushArenaState('groupPick');

  const listEl = document.getElementById('arena-group-pick-list')!;

  try {
    const { data, error } = await safeRpc<{ id: string; name: string; member_count: number }[]>('get_my_groups');
    if (error || !data || (data as unknown[]).length === 0) {
      listEl.innerHTML = '<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:20px 0;">You\'re not in any groups yet</div>';
    } else {
      listEl.innerHTML = (data as { id: string; name: string; member_count: number }[]).map(g => `
        <div class="arena-group-row" data-gid="${escapeHTML(g.id)}" data-gname="${escapeHTML(g.name)}">
          <div class="arena-group-row-name">${escapeHTML(g.name)}</div>
          <div class="arena-group-row-count">${g.member_count} members</div>
        </div>
      `).join('');
      listEl.querySelectorAll('.arena-group-row').forEach(row => {
        row.addEventListener('click', () => {
          const gid = (row as HTMLElement).dataset.gid!;
          overlay.remove();
          void createAndWaitPrivateLobby(mode, topic, 'group', undefined, undefined, gid);
        });
      });
    }
  } catch {
    listEl.innerHTML = '<div style="text-align:center;color:var(--mod-text-muted);font-size:13px;padding:20px 0;">Failed to load groups</div>';
  }

  document.getElementById('arena-group-pick-cancel')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });
  document.getElementById('arena-group-pick-backdrop')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });
}

async function createAndWaitPrivateLobby(
  mode: string,
  topic: string,
  visibility: 'private' | 'group' | 'code',
  invitedUserId?: string,
  invitedUserName?: string,
  groupId?: string
): Promise<void> {
  view = 'privateLobbyWaiting';
  pushArenaState('privateLobbyWaiting');
  if (screenEl) screenEl.innerHTML = '';

  // Show a loading state while we create the lobby
  const waiting = document.createElement('div');
  waiting.className = 'arena-queue arena-fade-in';
  waiting.id = 'arena-private-waiting';
  waiting.innerHTML = `
    <div class="arena-queue-search-ring" id="arena-private-ring">
      <div class="arena-queue-icon">\uD83D\uDD12</div>
    </div>
    <div class="arena-queue-title" id="arena-private-title">CREATING LOBBY...</div>
    <div class="arena-queue-status" id="arena-private-status">Setting up your private debate</div>
    <div id="arena-private-code-display"></div>
    <button class="arena-queue-cancel" id="arena-private-cancel-btn">\u2715 CANCEL</button>
  `;
  screenEl?.appendChild(waiting);

  document.getElementById('arena-private-cancel-btn')?.addEventListener('click', () => {
    void cancelPrivateLobby();
  });

  if (isPlaceholder()) {
    // Placeholder simulation
    setTimeout(() => {
      onPrivateLobbyMatched({
        debate_id: 'placeholder-' + Date.now(),
        topic: topic || randomFrom(AI_TOPICS),
        role: 'a',
        opponent_name: 'PlaceholderUser',
        opponent_elo: 1200,
        opponent_id: 'placeholder-opp',
      });
    }, 3000);
    return;
  }

  try {
    const { data, error } = await safeRpc<PrivateLobbyResult>('create_private_lobby', {
      p_mode: mode,
      p_topic: topic || null,
      p_category: selectedCategory,
      p_ranked: selectedRanked,
      p_visibility: visibility,
      p_invited_user_id: invitedUserId || null,
      p_group_id: groupId || null,
    });

    if (error) throw error;
    // RETURNS TABLE comes back as an array — unwrap first row
    const rows = data as PrivateLobbyResult[];
    const result = Array.isArray(rows) ? rows[0]! : (data as PrivateLobbyResult);
    privateLobbyDebateId = result.debate_id;

    // Update waiting screen
    const titleEl = document.getElementById('arena-private-title');
    const statusEl = document.getElementById('arena-private-status');
    const codeDisplay = document.getElementById('arena-private-code-display');

    if (visibility === 'code' && result.join_code) {
      if (titleEl) titleEl.textContent = 'SHARE THIS CODE';
      if (statusEl) statusEl.textContent = 'Waiting for someone to join...';
      if (codeDisplay) codeDisplay.innerHTML = `
        <div style="margin:16px 0;padding:20px 32px;border-radius:var(--mod-radius-md);border:2px solid var(--mod-accent-border);background:var(--mod-accent-muted);text-align:center;">
          <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:3px;color:var(--mod-text-muted);margin-bottom:8px;">JOIN CODE</div>
          <div style="font-family:var(--mod-font-ui);font-size:40px;font-weight:700;color:var(--mod-accent);letter-spacing:8px;">${escapeHTML(result.join_code)}</div>
        </div>
        <button id="arena-challenge-link-btn" style="margin-top:4px;padding:12px 24px;border-radius:20px;border:1px solid var(--mod-accent-border);background:var(--mod-accent-muted);color:var(--mod-accent);font-family:var(--mod-font-ui);font-size:13px;font-weight:600;letter-spacing:1.5px;cursor:pointer;width:100%;text-transform:uppercase;">🔗 Copy Challenge Link</button>
      `;
      document.getElementById('arena-challenge-link-btn')?.addEventListener('click', () => {
        const link = `https://themoderator.app/challenge?code=${encodeURIComponent(result.join_code!)}`;
        navigator.clipboard.writeText(link)
          .then(() => showToast('Challenge link copied!'))
          .catch(() => showToast(link));
      });
    } else if (visibility === 'private') {
      if (titleEl) titleEl.textContent = 'CHALLENGE SENT';
      if (statusEl) statusEl.textContent = `Waiting for ${escapeHTML(invitedUserName || 'them')} to accept...`;
    } else if (visibility === 'group') {
      if (titleEl) titleEl.textContent = 'GROUP LOBBY OPEN';
      if (statusEl) statusEl.textContent = 'Waiting for a group member to join...';
    }

    startPrivateLobbyPoll(result.debate_id, mode, topic);
  } catch (err) {
    console.error('[Arena] create_private_lobby error:', err);
    showToast(friendlyError(err) || 'Failed to create lobby');
    renderLobby();
  }
}

function startPrivateLobbyPoll(debateId: string, mode: string, topic: string): void {
  if (privateLobbyPollTimer) clearInterval(privateLobbyPollTimer);
  let elapsed = 0;
  const TIMEOUT_SEC = 600; // 10 minutes

  privateLobbyPollTimer = setInterval(async () => {
    elapsed += 3;
    if (view !== 'privateLobbyWaiting') {
      clearInterval(privateLobbyPollTimer!);
      privateLobbyPollTimer = null;
      return;
    }
    if (elapsed >= TIMEOUT_SEC) {
      clearInterval(privateLobbyPollTimer!);
      privateLobbyPollTimer = null;
      void cancelPrivateLobby();
      showToast('Lobby expired — no one joined');
      return;
    }

    try {
      const { data, error } = await safeRpc<CheckPrivateLobbyResult>('check_private_lobby', { p_debate_id: debateId });
      if (error || !data) return;
      const result = data as CheckPrivateLobbyResult;
      if (result.status === 'matched' && result.player_b_ready && result.opponent_id) {
        clearInterval(privateLobbyPollTimer!);
        privateLobbyPollTimer = null;
        onPrivateLobbyMatched({
          debate_id: debateId,
          topic: topic || randomFrom(AI_TOPICS),
          role: 'a',
          opponent_name: result.opponent_name || 'Opponent',
          opponent_elo: result.opponent_elo || 1200,
          opponent_id: result.opponent_id,
        });
      } else if (result.status === 'cancelled') {
        clearInterval(privateLobbyPollTimer!);
        privateLobbyPollTimer = null;
        showToast('Lobby cancelled');
        renderLobby();
      }
    } catch { /* retry next tick */ }
  }, 3000);
}

function onPrivateLobbyMatched(data: {
  debate_id: string; topic: string; role?: DebateRole;
  opponent_name: string; opponent_elo: number; opponent_id: string;
}): void {
  const debateData: CurrentDebate = {
    id: data.debate_id,
    topic: data.topic,
    role: data.role ?? 'a',
    mode: selectedMode ?? 'text',
    round: 1,
    totalRounds: 3,
    opponentName: data.opponent_name,
    opponentId: data.opponent_id,
    opponentElo: data.opponent_elo,
    ranked: selectedRanked,
    messages: [],
  };
  showMatchFound(debateData);
}

async function cancelPrivateLobby(): Promise<void> {
  if (privateLobbyPollTimer) { clearInterval(privateLobbyPollTimer); privateLobbyPollTimer = null; }
  if (privateLobbyDebateId && !isPlaceholder()) {
    safeRpc('cancel_private_lobby', { p_debate_id: privateLobbyDebateId }).catch(() => {});
  }
  privateLobbyDebateId = null;
  renderLobby();
}

async function joinWithCode(code: string): Promise<void> {
  if (isPlaceholder()) {
    showToast('Join code not available in preview mode');
    return;
  }
  try {
    const { data, error } = await safeRpc<JoinPrivateLobbyResult>('join_private_lobby', {
      p_debate_id: null,
      p_join_code: code,
    });
    if (error) throw error;
    const result = data as JoinPrivateLobbyResult;
    selectedMode = result.mode as DebateMode;
    const debateData: CurrentDebate = {
      id: result.debate_id,
      topic: result.topic || randomFrom(AI_TOPICS),
      role: 'b',
      mode: result.mode as DebateMode,
      round: 1,
      totalRounds: 3,
      opponentName: result.opponent_name,
      opponentId: result.opponent_id,
      opponentElo: result.opponent_elo,
      ranked: false,
      messages: [],
    };
    showMatchFound(debateData);
  } catch {
    // join_private_lobby failed — try join_mod_debate (mod_created debates use a different RPC)
    try {
      const { data: modData, error: modError } = await safeRpc<ModDebateJoinResult>('join_mod_debate', {
        p_join_code: code,
      });
      if (modError) throw modError;
      const modResult = modData as ModDebateJoinResult;
      selectedMode = modResult.mode as DebateMode;

      if (modResult.role === 'b') {
        // Both debaters present — go straight to match found
        const debateData: CurrentDebate = {
          id: modResult.debate_id,
          topic: modResult.topic || randomFrom(AI_TOPICS),
          role: 'b',
          mode: modResult.mode as DebateMode,
          round: 1,
          totalRounds: 3,
          opponentName: modResult.opponent_name || 'Debater A',
          opponentId: modResult.opponent_id,
          opponentElo: modResult.opponent_elo || 1200,
          ranked: modResult.ranked,
          messages: [],
        };
        showMatchFound(debateData);
      } else {
        // role === 'a' — waiting for second debater, show waiting screen and poll
        modDebateId = modResult.debate_id;
        showModDebateWaitingDebater(modResult.debate_id, modResult.topic, modResult.mode as DebateMode, modResult.ranked);
      }
    } catch (modErr) {
      showToast(friendlyError(modErr) || 'Code not found or already taken');
    }
  }
}

async function loadPendingChallenges(): Promise<void> {
  try {
    const { data, error } = await safeRpc<PendingChallenge[]>('get_pending_challenges');
    if (error || !data || (data as unknown[]).length === 0) return;

    const challenges = data as PendingChallenge[];
    const section = document.getElementById('arena-pending-challenges-section');
    const feed = document.getElementById('arena-pending-challenges-feed');
    if (!section || !feed) return;

    section.style.display = '';
    feed.innerHTML = challenges.map(c => `
      <div class="arena-card card-live" style="border-left-color:var(--mod-accent);" data-debate-id="${escapeHTML(c.debate_id)}">
        <div class="arena-card-top">
          <span class="arena-card-badge live">\u2694\uFE0F CHALLENGE</span>
          <span class="arena-card-meta">${escapeHTML(c.mode.toUpperCase())}</span>
        </div>
        <div class="arena-card-topic">${c.topic ? escapeHTML(c.topic) : 'Topic: Challenger\'s choice'}</div>
        <div class="arena-card-vs">
          <span>From: ${escapeHTML(c.challenger_name)}</span>
          <span class="vs">\u00B7</span>
          <span>${c.challenger_elo} ELO</span>
        </div>
        <div class="arena-card-action" style="gap:8px;display:flex;justify-content:flex-end;">
          <button class="arena-card-btn challenge-accept-btn" data-debate-id="${escapeHTML(c.debate_id)}" data-mode="${escapeHTML(c.mode)}" data-topic="${escapeHTML(c.topic || '')}" data-opp-id="${escapeHTML(c.challenger_id)}" data-opp-name="${escapeHTML(c.challenger_name)}" data-opp-elo="${c.challenger_elo}" style="border-color:var(--mod-accent-border);color:var(--mod-accent);">ACCEPT</button>
          <button class="arena-card-btn challenge-decline-btn" data-debate-id="${escapeHTML(c.debate_id)}">DECLINE</button>
        </div>
      </div>
    `).join('');

    // Wire accept buttons
    feed.querySelectorAll('.challenge-accept-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const el = btn as HTMLButtonElement;
        el.disabled = true;
        el.textContent = '\u23F3';
        try {
          const { data: joinData, error: joinErr } = await safeRpc<JoinPrivateLobbyResult>('join_private_lobby', {
            p_debate_id: el.dataset.debateId,
            p_join_code: null,
          });
          if (joinErr) throw joinErr;
          const result = joinData as JoinPrivateLobbyResult;
          selectedMode = el.dataset.mode as DebateMode;
          const debateData: CurrentDebate = {
            id: result.debate_id,
            topic: result.topic || el.dataset.topic || randomFrom(AI_TOPICS),
            role: 'b',
            mode: el.dataset.mode as DebateMode,
            round: 1,
            totalRounds: 3,
            opponentName: el.dataset.oppName || 'Challenger',
            opponentId: el.dataset.oppId || null,
            opponentElo: Number(el.dataset.oppElo) || 1200,
            ranked: false,
            messages: [],
          };
          showMatchFound(debateData);
        } catch (err) {
          showToast(friendlyError(err) || 'Could not accept challenge');
          el.disabled = false;
          el.textContent = 'ACCEPT';
        }
      });
    });

    // Wire decline buttons
    feed.querySelectorAll('.challenge-decline-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const el = btn as HTMLButtonElement;
        const debateId = el.dataset.debateId!;
        el.disabled = true;
        try {
          await safeRpc('cancel_private_lobby', { p_debate_id: debateId });
        } catch { /* silent */ }
        // Remove the card
        el.closest('.arena-card')?.remove();
        if (!feed.querySelector('.arena-card')) section.style.display = 'none';
      });
    });
  } catch { /* silent — challenges are optional */ }
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
  // F-39: Auto-join via challenge link (?joinCode=XXXXXX)
  const challengeCode = new URLSearchParams(window.location.search).get('joinCode');
  if (challengeCode) {
    window.history.replaceState({}, '', window.location.pathname);
    void joinWithCode(challengeCode.toUpperCase());
  }
}

// ============================================================
// F-47 STEP 5 — MOD QUEUE
// ============================================================

interface ModQueueItem {
  debate_id: string;
  topic: string;
  category: string;
  mode: string;
  created_at: string;
  debater_a_name: string | null;
  debater_b_name: string | null;
  mod_status: string;
}

interface ModDebateJoinResult {
  debate_id: string;
  role: string;
  status: string;
  topic: string;
  mode: string;
  ranked: boolean;
  moderator_name: string;
  opponent_name: string | null;
  opponent_id: string | null;
  opponent_elo: number | null;
}

interface ModDebateCheckResult {
  status: string;
  debater_a_id: string | null;
  debater_a_name: string;
  debater_b_id: string | null;
  debater_b_name: string;
}

function showModQueue(): void {
  view = 'modQueue';
  history.pushState({ arenaView: 'modQueue' }, '');
  if (screenEl) {
    screenEl.innerHTML = '';
    screenEl.style.position = 'relative';
  }

  const profile = getCurrentProfile();
  const container = document.createElement('div');
  container.className = 'arena-lobby arena-fade-in';
  container.innerHTML = `
    <div class="arena-hero" style="padding-bottom:8px;">
      <div class="arena-hero-title">Mod Queue</div>
      <div class="arena-hero-sub">Debates waiting for a moderator</div>
    </div>
    <div style="padding:0 16px 16px;">
      <button class="arena-secondary-btn" id="mod-queue-back" style="width:100%;margin-bottom:16px;">← BACK</button>
      ${profile?.is_moderator ? `<button class="arena-secondary-btn" id="mod-queue-create-debate" style="width:100%;margin-bottom:16px;border-color:var(--mod-accent-primary);color:var(--mod-accent-primary);">⚔️ CREATE DEBATE</button>` : ''}
      <div id="mod-queue-list"></div>
    </div>
  `;
  screenEl?.appendChild(container);

  document.getElementById('mod-queue-back')?.addEventListener('click', () => {
    stopModQueuePoll();
    renderLobby();
  });

  document.getElementById('mod-queue-create-debate')?.addEventListener('click', () => {
    stopModQueuePoll();
    showModDebatePicker();
  });

  void loadModQueue();
  startModQueuePoll();
}

async function loadModQueue(): Promise<void> {
  const listEl = document.getElementById('mod-queue-list');
  if (!listEl) return;

  const { data, error } = await safeRpc<ModQueueItem[]>('browse_mod_queue');

  if (error) {
    const msg = (error as { message?: string }).message ?? String(error);
    if (msg.includes('Not an available moderator')) {
      listEl.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--mod-text-secondary);font-family:var(--mod-font-ui);font-size:13px;">You're not set to Available.<br>Toggle in Settings to receive requests.</div>`;
    } else {
      showToast(msg);
    }
    return;
  }

  const rows = (data as ModQueueItem[]) ?? [];

  if (rows.length === 0) {
    listEl.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--mod-text-secondary);font-family:var(--mod-font-ui);font-size:13px;">No debates waiting for a moderator right now.</div>`;
    return;
  }

  listEl.innerHTML = rows.map(row => {
    const waitMs = Date.now() - new Date(row.created_at).getTime();
    const waitMin = Math.floor(waitMs / 60000);
    const waitSec = Math.floor((waitMs % 60000) / 1000);
    const waitStr = waitMin > 0 ? `${waitMin}m ${waitSec}s` : `${waitSec}s`;
    const nameA = row.debater_a_name ?? 'Unknown';
    const nameB = row.debater_b_name ?? 'TBD';
    return `
      <div style="background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md);padding:14px 16px;margin-bottom:12px;">
        <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:1.5px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:6px;">${row.category} · ${row.mode}</div>
        <div style="font-family:var(--mod-font-body);font-size:15px;font-weight:600;color:var(--mod-text-primary);margin-bottom:8px;">${row.topic}</div>
        <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-secondary);margin-bottom:12px;">${nameA} vs ${nameB} · waiting ${waitStr}</div>
        <button class="arena-secondary-btn mod-queue-claim-btn" data-debate-id="${row.debate_id}" style="width:100%;background:var(--mod-accent-primary);color:#fff;border-color:var(--mod-accent-primary);">REQUEST TO MOD</button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll<HTMLButtonElement>('.mod-queue-claim-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const debateId = btn.dataset.debateId!;
      void claimModRequest(debateId, btn);
    });
  });
}

async function claimModRequest(debateId: string, btn: HTMLButtonElement): Promise<void> {
  btn.disabled = true;
  btn.textContent = 'REQUESTING…';

  const { error } = await safeRpc('request_to_moderate', { p_debate_id: debateId });

  if (error) {
    btn.disabled = false;
    btn.textContent = 'REQUEST TO MOD';
    showToast('Another mod got there first — queue refreshed');
    void loadModQueue();
    return;
  }

  stopModQueuePoll();

  const listEl = document.getElementById('mod-queue-list');
  if (listEl) {
    listEl.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;font-weight:600;">Request sent.<br><span style="font-weight:400;color:var(--mod-text-secondary);font-size:13px;">Waiting for the debaters to accept.</span></div>`;
  }
}

function startModQueuePoll(): void {
  if (modQueuePollTimer) clearInterval(modQueuePollTimer);
  modQueuePollTimer = setInterval(() => {
    if (view !== 'modQueue') {
      clearInterval(modQueuePollTimer!);
      modQueuePollTimer = null;
      return;
    }
    void loadModQueue();
  }, 5000);
}

function stopModQueuePoll(): void {
  if (modQueuePollTimer) {
    clearInterval(modQueuePollTimer);
    modQueuePollTimer = null;
  }
}

// ============================================================
// F-47 STEP 6 — MOD STATUS POLL + REQUEST MODAL
// ============================================================

interface ModStatusResult {
  mod_status: string;
  mod_requested_by: string | null;
  moderator_id: string | null;
  moderator_display_name: string;
}

function startModStatusPoll(debateId: string): void {
  stopModStatusPoll();
  modRequestModalShown = false;
  modStatusPollTimer = setInterval(async () => {
    if (view !== 'room') {
      stopModStatusPoll();
      return;
    }
    try {
      const { data, error } = await safeRpc<ModStatusResult>('get_debate_mod_status', { p_debate_id: debateId });
      if (error || !data) return;
      const result = data as ModStatusResult;
      if (result.mod_status === 'requested' && !modRequestModalShown) {
        showModRequestModal(result.moderator_display_name, result.moderator_id ?? '', debateId);
      } else if (result.mod_status === 'claimed' || result.mod_status === 'none') {
        document.getElementById('mod-request-modal')?.remove();
        stopModStatusPoll();
      }
    } catch { /* retry next tick */ }
  }, 4000);
}

function stopModStatusPoll(): void {
  if (modStatusPollTimer) {
    clearInterval(modStatusPollTimer);
    modStatusPollTimer = null;
  }
}

function showModRequestModal(modName: string, modId: string, debateId: string): void {
  modRequestModalShown = true;
  document.getElementById('mod-request-modal')?.remove();

  let secondsLeft = 30;
  const modal = document.createElement('div');
  modal.id = 'mod-request-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:var(--mod-bg-overlay);';
  modal.innerHTML = `
    <div style="background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-lg);padding:28px 24px;max-width:320px;width:90%;text-align:center;">
      <div style="font-size:32px;margin-bottom:12px;">🧑‍⚖️</div>
      <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:2px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:8px;">Moderator Request</div>
      <div style="font-family:var(--mod-font-body);font-size:16px;font-weight:600;color:var(--mod-text-primary);margin-bottom:6px;">${modName}</div>
      <div style="font-family:var(--mod-font-body);font-size:14px;color:var(--mod-text-secondary);margin-bottom:20px;">wants to moderate this debate</div>
      <div id="mod-req-countdown" style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-muted);margin-bottom:20px;">Auto-declining in ${secondsLeft}s</div>
      <div style="display:flex;gap:10px;">
        <button id="mod-req-decline" style="flex:1;padding:12px;border-radius:var(--mod-radius-pill);border:1px solid var(--mod-border-primary);background:transparent;color:var(--mod-text-body);font-family:var(--mod-font-ui);font-size:13px;font-weight:600;letter-spacing:1px;cursor:pointer;">DECLINE</button>
        <button id="mod-req-accept" style="flex:1;padding:12px;border-radius:var(--mod-radius-pill);border:none;background:var(--mod-accent-primary);color:#fff;font-family:var(--mod-font-ui);font-size:13px;font-weight:600;letter-spacing:1px;cursor:pointer;">ACCEPT</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const countdownTimer = setInterval(() => {
    secondsLeft--;
    const cdEl = document.getElementById('mod-req-countdown');
    if (cdEl) cdEl.textContent = `Auto-declining in ${secondsLeft}s`;
    if (secondsLeft <= 0) {
      clearInterval(countdownTimer);
      void handleModResponse(false, debateId, modal, modId, modName);
    }
  }, 1000);

  document.getElementById('mod-req-accept')?.addEventListener('click', () => {
    clearInterval(countdownTimer);
    void handleModResponse(true, debateId, modal, modId, modName);
  });

  document.getElementById('mod-req-decline')?.addEventListener('click', () => {
    clearInterval(countdownTimer);
    void handleModResponse(false, debateId, modal, modId, modName);
  });
}

async function handleModResponse(accept: boolean, debateId: string, modal: HTMLElement, modId: string, modName: string): Promise<void> {
  const acceptBtn = document.getElementById('mod-req-accept') as HTMLButtonElement | null;
  const declineBtn = document.getElementById('mod-req-decline') as HTMLButtonElement | null;
  if (acceptBtn) acceptBtn.disabled = true;
  if (declineBtn) declineBtn.disabled = true;

  const { error } = await safeRpc('respond_to_mod_request', { p_debate_id: debateId, p_accept: accept });

  if (error) {
    modal.remove();
    modRequestModalShown = false;
    return;
  }

  modal.remove();
  if (accept) {
    stopModStatusPoll();
    if (currentDebate) {
      currentDebate.moderatorId = modId;
      currentDebate.moderatorName = modName;
    }
    showToast('Moderator accepted — debate is now moderated');
  } else {
    modRequestModalShown = false;
    // poll continues — mod_status reset to 'waiting' by RPC
  }
}

// ============================================================
// F-48 — MOD-INITIATED DEBATE
// ============================================================

function showModDebatePicker(): void {
  view = 'modDebatePicker';
  history.pushState({ arenaView: 'modDebatePicker' }, '');
  if (screenEl) screenEl.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'arena-lobby arena-fade-in';
  container.innerHTML = `
    <div class="arena-hero" style="padding-bottom:8px;">
      <div class="arena-hero-title">Create Debate</div>
      <div class="arena-hero-sub">Set the stage — debaters join with your code</div>
    </div>
    <div style="padding:0 16px 24px;">
      <button class="arena-secondary-btn" id="mod-debate-picker-back" style="width:100%;margin-bottom:20px;">← BACK</button>

      <div style="margin-bottom:14px;">
        <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:1.5px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:8px;">Mode</div>
        <select id="mod-debate-mode" style="width:100%;padding:12px;background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;">
          <option value="text">Text Battle</option>
          <option value="live">Live Audio</option>
          <option value="voicememo">Voice Memo</option>
        </select>
      </div>

      <div style="margin-bottom:14px;">
        <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:1.5px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:8px;">Category</div>
        <select id="mod-debate-category" style="width:100%;padding:12px;background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;">
          <option value="">— Any —</option>
          <option value="politics">Politics</option>
          <option value="sports">Sports</option>
          <option value="entertainment">Entertainment</option>
          <option value="music">Music</option>
          <option value="movies">Movies</option>
          <option value="general">General</option>
        </select>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:1.5px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:8px;">Topic <span style="font-weight:400;text-transform:none;">(optional)</span></div>
        <input id="mod-debate-topic" type="text" placeholder="Leave blank for open debate" maxlength="200"
          style="width:100%;padding:12px;background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:var(--mod-radius-md);color:var(--mod-text-primary);font-family:var(--mod-font-body);font-size:14px;box-sizing:border-box;" />
      </div>

      <label style="display:flex;align-items:center;gap:10px;margin-bottom:20px;cursor:pointer;">
        <input type="checkbox" id="mod-debate-ranked" style="width:18px;height:18px;" />
        <span style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-body);">Ranked debate</span>
      </label>

      <button class="arena-primary-btn" id="mod-debate-create-btn" style="width:100%;">⚔️ CREATE &amp; GET CODE</button>
    </div>
  `;
  screenEl?.appendChild(container);

  document.getElementById('mod-debate-picker-back')?.addEventListener('click', () => {
    showModQueue();
  });

  document.getElementById('mod-debate-create-btn')?.addEventListener('click', () => {
    void createModDebate();
  });
}

async function createModDebate(): Promise<void> {
  const btn = document.getElementById('mod-debate-create-btn') as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

  const mode = (document.getElementById('mod-debate-mode') as HTMLSelectElement)?.value || 'text';
  const category = (document.getElementById('mod-debate-category') as HTMLSelectElement)?.value || null;
  const topic = (document.getElementById('mod-debate-topic') as HTMLInputElement)?.value.trim() || null;
  const ranked = (document.getElementById('mod-debate-ranked') as HTMLInputElement)?.checked || false;

  try {
    const { data, error } = await safeRpc<{ debate_id: string; join_code: string }>('create_mod_debate', {
      p_mode: mode,
      p_topic: topic,
      p_category: category || null,
      p_ranked: ranked,
    });
    if (error) throw error;
    const result = data as { debate_id: string; join_code: string };
    modDebateId = result.debate_id;
    showModDebateWaitingMod(result.debate_id, result.join_code, topic || 'Open Debate', mode as DebateMode, ranked);
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '⚔️ CREATE & GET CODE'; }
    showToast(friendlyError(err) || 'Could not create debate');
  }
}

function showModDebateWaitingMod(debateId: string, joinCode: string, topic: string, mode: DebateMode, ranked: boolean): void {
  view = 'modDebateWaiting';
  history.pushState({ arenaView: 'modDebateWaiting' }, '');
  if (screenEl) screenEl.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'arena-lobby arena-fade-in';
  container.innerHTML = `
    <div class="arena-hero" style="padding-bottom:8px;">
      <div class="arena-hero-title">Waiting for Debaters</div>
      <div class="arena-hero-sub">${escapeHTML(topic)}</div>
    </div>
    <div style="padding:0 16px 24px;text-align:center;">
      <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:2px;color:var(--mod-text-secondary);text-transform:uppercase;margin-bottom:10px;">Join Code</div>
      <div style="font-family:var(--mod-font-display);font-size:40px;font-weight:700;color:var(--mod-accent-primary);letter-spacing:6px;margin-bottom:6px;">${escapeHTML(joinCode)}</div>
      <div style="font-family:var(--mod-font-body);font-size:13px;color:var(--mod-text-secondary);margin-bottom:24px;">Share this code with your two debaters</div>
      <div id="mod-debate-slots" style="margin-bottom:24px;">
        <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-secondary);margin-bottom:6px;">Debater A: <span id="slot-a-name" style="color:var(--mod-text-muted);">waiting…</span></div>
        <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-secondary);">Debater B: <span id="slot-b-name" style="color:var(--mod-text-muted);">waiting…</span></div>
      </div>
      <button class="arena-secondary-btn" id="mod-debate-cancel-btn" style="width:100%;">CANCEL</button>
    </div>
  `;
  screenEl?.appendChild(container);

  document.getElementById('mod-debate-cancel-btn')?.addEventListener('click', () => {
    void cancelModDebate(debateId);
  });

  startModDebatePoll(debateId, mode, ranked);
}

function showModDebateWaitingDebater(debateId: string, topic: string, mode: DebateMode, ranked: boolean): void {
  view = 'modDebateWaiting';
  history.pushState({ arenaView: 'modDebateWaiting' }, '');
  if (screenEl) screenEl.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'arena-lobby arena-fade-in';
  container.innerHTML = `
    <div class="arena-hero" style="padding-bottom:8px;">
      <div class="arena-hero-title">Waiting for Opponent</div>
      <div class="arena-hero-sub">${escapeHTML(topic || 'Open Debate')}</div>
    </div>
    <div style="padding:0 16px 24px;text-align:center;">
      <div style="font-family:var(--mod-font-body);font-size:14px;color:var(--mod-text-secondary);margin-bottom:24px;">You're in. Waiting for the second debater to join…</div>
      <button class="arena-secondary-btn" id="mod-debate-debater-cancel-btn" style="width:100%;">LEAVE</button>
    </div>
  `;
  screenEl?.appendChild(container);

  document.getElementById('mod-debate-debater-cancel-btn')?.addEventListener('click', () => {
    stopModDebatePoll();
    renderLobby();
  });

  startModDebatePoll(debateId, mode, ranked);
}

function startModDebatePoll(debateId: string, mode: DebateMode, ranked: boolean): void {
  stopModDebatePoll();
  modDebatePollTimer = setInterval(async () => {
    if (view !== 'modDebateWaiting') {
      stopModDebatePoll();
      return;
    }
    try {
      const { data, error } = await safeRpc<ModDebateCheckResult>('check_mod_debate', { p_debate_id: debateId });
      if (error || !data) return;
      const result = data as ModDebateCheckResult;

      // Update slot display for mod's waiting screen
      const slotA = document.getElementById('slot-a-name');
      const slotB = document.getElementById('slot-b-name');
      if (slotA && result.debater_a_name) slotA.textContent = result.debater_a_name || 'waiting…';
      if (slotB && result.debater_b_name) slotB.textContent = result.debater_b_name || 'waiting…';

      if (result.status === 'matched') {
        stopModDebatePoll();
        onModDebateReady(debateId, result, mode, ranked);
      }
    } catch { /* retry next tick */ }
  }, 4000);
}

function stopModDebatePoll(): void {
  if (modDebatePollTimer) {
    clearInterval(modDebatePollTimer);
    modDebatePollTimer = null;
  }
}

function onModDebateReady(debateId: string, result: ModDebateCheckResult, mode: DebateMode, ranked: boolean): void {
  const profile = getCurrentProfile();
  const isActualMod = profile?.id !== result.debater_a_id && profile?.id !== result.debater_b_id;

  if (isActualMod) {
    // Moderator enters room in observer mode
    const debateData: CurrentDebate = {
      id: debateId,
      topic: 'Moderated Debate',
      role: 'a',
      mode,
      round: 1,
      totalRounds: 3,
      opponentName: result.debater_b_name || 'Debater B',
      opponentId: result.debater_b_id,
      opponentElo: 1200,
      ranked,
      messages: [],
      modView: true,
      debaterAName: result.debater_a_name || 'Debater A',
      debaterBName: result.debater_b_name || 'Debater B',
    };
    enterRoom(debateData);
  } else {
    // Debater A — now matched, go to match found
    const role: DebateRole = profile?.id === result.debater_a_id ? 'a' : 'b';
    const opponentName = role === 'a' ? (result.debater_b_name || 'Debater B') : (result.debater_a_name || 'Debater A');
    const opponentId = role === 'a' ? result.debater_b_id : result.debater_a_id;
    const debateData: CurrentDebate = {
      id: debateId,
      topic: 'Moderated Debate',
      role,
      mode,
      round: 1,
      totalRounds: 3,
      opponentName,
      opponentId,
      opponentElo: 1200,
      ranked,
      messages: [],
    };
    showMatchFound(debateData);
  }
}

async function cancelModDebate(debateId: string): Promise<void> {
  stopModDebatePoll();
  try {
    await safeRpc('cancel_private_lobby', { p_debate_id: debateId });
  } catch { /* silent */ }
  modDebateId = null;
  showModQueue();
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

export function destroy(): void {
  if (queueElapsedTimer) { clearInterval(queueElapsedTimer); queueElapsedTimer = null; }
  if (queuePollTimer) { clearInterval(queuePollTimer); queuePollTimer = null; }
  if (roundTimer) { clearInterval(roundTimer); roundTimer = null; }
  if (vmTimer) { clearInterval(vmTimer); vmTimer = null; }
  if (referencePollTimer) { clearInterval(referencePollTimer); referencePollTimer = null; }
  if (_rulingCountdownTimer) { clearInterval(_rulingCountdownTimer); _rulingCountdownTimer = null; }
  window.removeEventListener('popstate', _onPopState);
}

// ============================================================
// AUTO-INIT (matches .js IIFE — waits for auth ready)
// ============================================================

ready.then(() => init()).catch(() => init());
