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
 * Migration: Session 127 (Phase 3)
 */

import type { SafeRpcResult } from './auth.ts';

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
  _stakingResult?: { payout: number; success: boolean } | null;
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

// ============================================================
// AUTH / CONFIG BRIDGE
// ============================================================

declare const ColosseumConfig: {
  escapeHTML: (str: string) => string;
  isAnyPlaceholder: boolean;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  showToast?: (msg: string, type: string) => void;
  friendlyError?: (err: unknown) => string;
};

declare const ColosseumAuth: {
  supabase: {
    from: (table: string) => unknown;
    rpc: (name: string, params?: Record<string, unknown>) => Promise<SafeRpcResult>;
  } | null;
  isPlaceholderMode: boolean;
  currentUser: { id: string } | null;
  currentProfile: {
    display_name?: string;
    username?: string;
    elo_rating?: number;
    token_balance?: number;
    questions_answered?: number;
    login_streak?: number;
  } | null;
  safeRpc: <T = unknown>(rpcName: string, params?: Record<string, unknown>) => Promise<SafeRpcResult<T>>;
  requireAuth: (label: string) => boolean;
  declareRival: (targetId: string) => Promise<{ error?: unknown }>;
  showUserProfile: (userId: string) => void;
  submitReference: (debateId: string, url: string | null, desc: string | null, side?: string | null) => Promise<{ error?: unknown }>;
  ruleOnReference: (refId: string, ruling: string, reason: string | null, type?: string) => Promise<{ error?: unknown }>;
  assignModerator: (debateId: string, modId: string | null, modType: string) => Promise<void>;
  getAvailableModerators: (excludeIds: string[]) => Promise<AvailableModerator[]>;
  getDebateReferences: (debateId: string) => Promise<unknown[]>;
};

declare const ColosseumWebRTC: {
  joinDebate: (id: string, role: string) => Promise<void>;
  leaveDebate: () => void;
  toggleMute: () => void;
  createWaveform: (stream: MediaStream, canvas: HTMLCanvasElement) => void;
  on: (event: string, cb: (data: Record<string, unknown>) => void) => void;
  localStream: MediaStream | null;
} | undefined;

declare const ColosseumVoiceMemo: {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  retake: () => void;
  send: () => Promise<void>;
} | undefined;

declare const ColosseumShare: {
  shareResult: (data: Record<string, unknown>) => void;
} | undefined;

declare const ColosseumTokens: {
  claimDebate: (id: string) => void;
  claimAiSparring: (id: string) => void;
  balance?: number;
} | undefined;

declare const ColosseumStaking: {
  getPool: (id: string) => Promise<unknown>;
  renderStakingPanel: (id: string, a: string, b: string, pool: unknown, qa: number) => string;
  wireStakingPanel: (id: string) => void;
  settleStakes: (id: string, winner: string, multiplier: number) => Promise<{ payout: number; success: boolean }>;
} | undefined;

declare const ColosseumPowerUps: {
  getMyPowerUps: (id: string) => Promise<{ inventory: unknown[]; equipped: PowerUpEquipped[]; questions_answered: number }>;
  getOpponentPowerUps: (id: string) => Promise<{ success: boolean; equipped: PowerUpEquipped[] }>;
  renderLoadout: (inv: unknown[], eq: unknown[], qa: number, id: string) => string;
  wireLoadout: (id: string, cb?: (result: unknown) => void) => void;
  renderActivationBar: (equipped: PowerUpEquipped[]) => string | null;
  wireActivationBar: (id: string, handlers: { onSilence: () => void; onShield: () => void; onReveal: () => Promise<void> }) => void;
  hasMultiplier: (equipped: PowerUpEquipped[]) => boolean;
  renderSilenceOverlay: (name: string) => ReturnType<typeof setInterval>;
  renderShieldIndicator: () => void;
  removeShieldIndicator?: () => void;
  renderRevealPopup: (equipped: PowerUpEquipped[]) => void;
} | undefined;

declare function navigateTo(screen: string): void;

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
export let equippedForDebate: PowerUpEquipped[] = [];
export let silenceTimer: ReturnType<typeof setInterval> | null = null;
export let _rulingCountdownTimer: ReturnType<typeof setInterval> | null = null;

// Voice memo state
let vmRecording = false;
let vmTimer: ReturnType<typeof setInterval> | null = null;
let vmSeconds = 0;

// ============================================================
// HELPERS
// ============================================================

function getSupabase(): typeof ColosseumAuth.supabase {
  return (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.supabase) ? ColosseumAuth.supabase : null;
}

function isPlaceholder(): boolean {
  return !getSupabase() || (typeof ColosseumConfig !== 'undefined' && ColosseumConfig.isAnyPlaceholder);
}

async function safeRpc<T = unknown>(name: string, params?: Record<string, unknown>): Promise<SafeRpcResult<T>> {
  if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.safeRpc) {
    return ColosseumAuth.safeRpc<T>(name, params);
  }
  const sb = getSupabase();
  if (!sb) return { data: null, error: { message: 'Supabase not available' } };
  return sb.rpc(name, params) as Promise<SafeRpcResult<T>>;
}

function currentUser(): { id: string } | null {
  return (typeof ColosseumAuth !== 'undefined') ? ColosseumAuth.currentUser : null;
}

function currentProfile(): typeof ColosseumAuth.currentProfile {
  return (typeof ColosseumAuth !== 'undefined') ? ColosseumAuth.currentProfile : null;
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const sanitize: (s: string) => string =
  typeof ColosseumConfig !== 'undefined' ? ColosseumConfig.escapeHTML : (s: string) => s;

// ============================================================
// BROWSER HISTORY (Session 121 rewrite)
// ============================================================

function pushArenaState(viewName: string): void {
  history.pushState({ arenaView: viewName }, '');
}

// ============================================================
// CSS INJECTION — full CSS lives in colosseum-arena.js
// ============================================================

function injectCSS(): void {
  if (cssInjected) return;
  cssInjected = true;
  // Full CSS injection (300+ lines) in colosseum-arena.js
  // TypeScript mirror defers to runtime .js for styles
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
  history.replaceState({ arenaView: 'lobby' }, '');
  if (screenEl) screenEl.innerHTML = '';
  // Full lobby rendering in colosseum-arena.js
  void loadLobbyFeed();
}

async function loadLobbyFeed(): Promise<void> {
  // Full implementation in colosseum-arena.js
  // Loads live debates and recent verdicts from get_arena_feed RPC
}

// ============================================================
// MODE SELECT / RANKED PICKER
// ============================================================

export function showRankedPicker(): void {
  if (!currentUser() && !isPlaceholder()) {
    window.location.href = 'colosseum-plinko.html';
    return;
  }
  // Full overlay rendering in colosseum-arena.js
  pushArenaState('rankedPicker');
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
  if (!currentUser() && !isPlaceholder()) {
    window.location.href = 'colosseum-plinko.html';
    return;
  }
  // Full mode select overlay in colosseum-arena.js
  pushArenaState('modeSelect');
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
  // Full queue UI rendering in colosseum-arena.js

  queueElapsedTimer = setInterval(() => {
    queueSeconds++;
    const timeout = QUEUE_TIMEOUT_SEC[mode as DebateMode] ?? 60;
    if (queueSeconds >= timeout) {
      onQueueTimeout();
    }
  }, 1000);

  if (!isPlaceholder()) {
    void joinServerQueue(mode as DebateMode, topic);
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
  }
}

function onMatchFound(data: MatchData): void {
  clearQueueTimers();
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
    opponentElo: '???',
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

  // Full pre-debate UI rendering in colosseum-arena.js
  // Renders staking panel via ColosseumStaking.renderStakingPanel()
  // Renders power-up loadout via ColosseumPowerUps.renderLoadout()
  // ENTER BATTLE button wired to enterRoom()
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
    safeRpc('update_arena_debate', { p_debate_id: debate.id, p_status: 'live' }).catch(() => {});
  }

  // Full room UI rendering in colosseum-arena.js
  // Includes: VS banner, message stream, input controls, power-up bar, moderator bar

  addSystemMessage(`Round ${debate.round} — Make your argument.`);

  if (debate.mode === 'live') {
    startLiveRoundTimer();
    void initLiveAudio();
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
  }
}

async function handleAIResponse(debate: CurrentDebate, _userText: string): Promise<void> {
  const aiText = await generateAIDebateResponse(debate.topic, _userText, debate.round, debate.totalRounds);
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
    const supabaseUrl = typeof ColosseumConfig !== 'undefined' ? ColosseumConfig.SUPABASE_URL : null;
    if (!supabaseUrl) throw new Error('No supabase URL');

    const edgeUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1/ai-sparring';
    const anonKey = typeof ColosseumConfig !== 'undefined' ? ColosseumConfig.SUPABASE_ANON_KEY : null;

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
    return randomFrom(templates) + ' The research on this topic suggests a more complex picture than most people acknowledge.';
  }
}

function advanceRound(): void {
  const debate = currentDebate!;
  if (debate.round >= debate.totalRounds) {
    setTimeout(() => void endCurrentDebate(), 1500);
    return;
  }
  debate.round++;
  addSystemMessage(`Round ${debate.round} of ${debate.totalRounds} — Your turn.`);
  if (debate.mode === 'live') startLiveRoundTimer();
}

// ============================================================
// LIVE AUDIO MODE
// ============================================================

function startLiveRoundTimer(): void {
  roundTimeLeft = ROUND_DURATION;
  if (roundTimer) clearInterval(roundTimer);
  roundTimer = setInterval(() => {
    roundTimeLeft--;
    if (roundTimeLeft <= 0) {
      if (roundTimer) clearInterval(roundTimer);
      addSystemMessage("⏱️ Time's up for this round!");
      advanceRound();
    }
  }, 1000);
}

async function initLiveAudio(): Promise<void> {
  if (typeof ColosseumWebRTC === 'undefined') return;
  const debate = currentDebate!;
  ColosseumWebRTC.on('debateEnd', () => { void endCurrentDebate(); });
  try {
    await ColosseumWebRTC.joinDebate(debate.id, debate.role);
  } catch { /* mic access blocked */ }
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
    if (typeof ColosseumVoiceMemo !== 'undefined') ColosseumVoiceMemo.retake?.();
    resetVoiceMemoUI();
  });
  document.getElementById('arena-vm-send')?.addEventListener('click', () => { void sendVoiceMemo(); });
}

async function startVoiceMemoRecording(): Promise<void> {
  vmRecording = true;
  vmSeconds = 0;
  vmTimer = setInterval(() => {
    vmSeconds++;
    if (vmSeconds >= 120) stopVoiceMemoRecording();
  }, 1000);
  if (typeof ColosseumVoiceMemo !== 'undefined') {
    try { await ColosseumVoiceMemo.startRecording(); } catch { resetVoiceMemoUI(); }
  }
}

function stopVoiceMemoRecording(): void {
  vmRecording = false;
  if (vmTimer) clearInterval(vmTimer);
  if (typeof ColosseumVoiceMemo !== 'undefined') {
    void ColosseumVoiceMemo.stopRecording?.();
  }
}

function resetVoiceMemoUI(): void {
  vmRecording = false;
  vmSeconds = 0;
  if (vmTimer) clearInterval(vmTimer);
}

async function sendVoiceMemo(): Promise<void> {
  const debate = currentDebate!;
  addMessage(debate.role, `🎤 Voice memo (${formatTimer(vmSeconds)})`, debate.round, false);
  resetVoiceMemoUI();
  if (typeof ColosseumVoiceMemo !== 'undefined') {
    await ColosseumVoiceMemo.send?.();
  }
  addSystemMessage('Voice memo sent — waiting for opponent...');
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

  const profile = currentProfile();
  const isMe = side === debate?.role;
  const name = isAI ? '🤖 AI' : isMe ? (profile?.display_name ?? 'You') : (debate?.opponentName ?? 'Opponent');

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

  if (debate.mode === 'live' && typeof ColosseumWebRTC !== 'undefined') {
    ColosseumWebRTC.leaveDebate();
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

  // Update Supabase
  if (!isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
    try {
      await safeRpc('update_arena_debate', {
        p_debate_id: debate.id,
        p_status: 'complete',
        p_current_round: debate.round || 1,
        p_winner: winner,
        p_score_a: scoreA,
        p_score_b: scoreB,
      });
    } catch { /* warned */ }

    if (typeof ColosseumTokens !== 'undefined') {
      if (debate.mode === 'ai') ColosseumTokens.claimAiSparring(debate.id);
      else ColosseumTokens.claimDebate(debate.id);
    }

    if (typeof ColosseumStaking !== 'undefined') {
      try {
        const hasMulti = typeof ColosseumPowerUps !== 'undefined' && ColosseumPowerUps?.hasMultiplier(equippedForDebate);
        const stakeResult = await ColosseumStaking.settleStakes(debate.id, winner, hasMulti ? 2 : 1);
        debate._stakingResult = stakeResult;
      } catch { /* warned */ }
    }
  }

  // Clean up power-up state
  if (silenceTimer) { clearInterval(silenceTimer); silenceTimer = null; }
  shieldActive = false;
  activatedPowerUps.clear();

  // Full post-debate UI rendering in colosseum-arena.js
  // Includes: victory/defeat banner, scores, staking results, moderator scoring,
  // rematch/share/transcript/lobby buttons
}

// ============================================================
// MODERATOR UI (Session 39)
// ============================================================

export async function assignSelectedMod(debateId: string): Promise<void> {
  if (!selectedModerator || isPlaceholder()) return;
  if (debateId.startsWith('ai-local-') || debateId.startsWith('placeholder-')) return;
  try {
    if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.assignModerator) {
      await ColosseumAuth.assignModerator(debateId, selectedModerator.id, selectedModerator.type);
    }
  } catch { /* warned */ }
}

export function addReferenceButton(): void {
  if (currentDebate?.mode === 'ai') return;
  // Full implementation in colosseum-arena.js
}

export function showReferenceForm(): void {
  // Full implementation in colosseum-arena.js
}

export function hideReferenceForm(): void {
  document.getElementById('arena-ref-form')?.remove();
}

export function showRulingPanel(_ref: unknown): void {
  // Full implementation in colosseum-arena.js — 60s countdown, allow/deny buttons
}

export function startReferencePoll(debateId: string): void {
  if (referencePollTimer) clearInterval(referencePollTimer);
  referencePollTimer = setInterval(async () => {
    try {
      const refs = await ColosseumAuth?.getDebateReferences?.(debateId);
      if (refs) pendingReferences = refs;
    } catch { /* silent */ }
  }, 5000);
}

function stopReferencePoll(): void {
  if (referencePollTimer) { clearInterval(referencePollTimer); referencePollTimer = null; }
  pendingReferences = [];
}

export function renderModScoring(_debate: CurrentDebate, _container: HTMLElement): void {
  // Full implementation in colosseum-arena.js — 100-point scoring system
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
// WINDOW GLOBAL BRIDGE (removed in Phase 4)
// ============================================================

export const ColosseumArenaExport = {
  init,
  renderLobby,
  showModeSelect,
  enterQueue,
  get view() { return view; },
  get currentDebate() { return getCurrentDebate(); },
} as const;
