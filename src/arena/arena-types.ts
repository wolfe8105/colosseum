/**
 * Arena Types & Constants
 */

import type { SettleResult } from '../staking.ts';
import type { SafeRpcResult } from '../auth.ts';
import type { EquippedItem } from '../powerups.ts';

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
  ruleset?: 'amplified' | 'unplugged';
  spectatorView?: boolean;
  concededBy?: 'a' | 'b' | null;
  _nulled?: boolean;
  _nullReason?: string;
  language?: string;
  tournament_match_id?: string | null;
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
  ruleset?: string;
  total_rounds?: number;
  language?: string;
}

export interface MatchAcceptResponse {
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
  ruleset?: string;
  total_rounds?: number;
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

export interface RankedCheckResult {
  eligible: boolean;
  profile_pct: number;
}

export interface UpdateDebateResult {
  ranked?: boolean;
  winner?: string;
  elo_change_a?: number;
  elo_change_b?: number;
  vote_count_a?: number;
  vote_count_b?: number;
}

export interface ReferenceItem {
  id: string;
  ruling: string;
  ruling_reason?: string;
  submitter_name?: string;
  url?: string;
  description?: string;
  round?: number;
  supports_side?: string;
}

export interface CriterionScore {
  score: number;
  reason: string;
}

export interface SideScores {
  logic: CriterionScore;
  evidence: CriterionScore;
  delivery: CriterionScore;
  rebuttal: CriterionScore;
}

export interface AIScoreResult {
  side_a: SideScores;
  side_b: SideScores;
  overall_winner: string;
  verdict: string;
}

export interface ModQueueItem {
  debate_id: string;
  topic: string;
  category: string;
  mode: string;
  created_at: string;
  debater_a_name: string | null;
  debater_b_name: string | null;
  mod_status: string;
}

export interface ModDebateJoinResult {
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
  ruleset?: string;
  total_rounds?: number;
  language?: string;
}

export interface ModDebateCheckResult {
  status: string;
  debater_a_id: string | null;
  debater_a_name: string;
  debater_b_id: string | null;
  debater_b_name: string;
  topic: string | null;
  ruleset: string | null;
  total_rounds?: number;
  language?: string;
}

export interface QueueCategory {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
}

export interface ModStatusResult {
  mod_status: string;
  mod_requested_by: string | null;
  moderator_id: string | null;
  moderator_display_name: string;
}

export interface PrivateLobbyResult {
  debate_id: string;
  join_code: string | null;
}

export interface PendingChallenge {
  debate_id: string;
  mode: string;
  topic: string | null;
  ranked: boolean;
  challenger_name: string;
  challenger_id: string;
  challenger_elo: number;
  created_at: string;
}

export interface CheckPrivateLobbyResult {
  status: string;
  opponent_id: string | null;
  opponent_name: string | null;
  opponent_elo: number | null;
  player_b_ready: boolean | null;
  total_rounds?: number;
  language?: string;
}

export interface JoinPrivateLobbyResult {
  debate_id: string;
  status: string;
  topic: string | null;
  mode: string;
  opponent_name: string;
  opponent_id: string;
  opponent_elo: number;
  ruleset?: string;
  total_rounds?: number;
  language?: string;
}

// ============================================================
// FEED ROOM TYPES (F-51 Phase 1)
// ============================================================

export type FeedEventType =
  | 'speech'
  | 'round_divider'
  | 'point_award'
  | 'reference_cite'
  | 'reference_challenge'
  | 'mod_ruling'
  | 'power_up'
  | 'sentiment_vote'   // legacy rows — keep for historical replay compat
  | 'sentiment_tip'   // F-58: paid tip (replaces free vote)
  | 'disconnect';

export interface FeedEvent {
  id: string;
  debate_id: string;
  event_type: FeedEventType;
  round: number;
  side: 'a' | 'b' | 'mod' | null;
  content: string;
  score?: number | null;
  reference_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  author_name?: string;
}

/** Reference loaded for a debate via pre-debate loadout picker */
export interface LoadoutReference {
  reference_id: string;
  cited: boolean;
  cited_at: string | null;
  claim: string;
  url: string;
  domain: string;
  author: string;
  source_type: string;
  current_power: number;
  power_ceiling: number;
  rarity: string;
  verification_points: number;
  citation_count: number;
  win_count: number;
  loss_count: number;
}

/** Opponent's cited reference tracked in state for challenge dropdown */
export interface OpponentCitedRef {
  reference_id: string;
  claim: string;
  url: string;
  domain: string;
  source_type: string;
  feed_event_id: string;
  already_challenged: boolean;
}

/** Per-value scoring budget limits per round (Session 235) */
export const FEED_SCORE_BUDGET: Readonly<Record<number, number>> = {
  5: 2,
  4: 3,
  3: 4,
  2: 5,
  1: 6,
};

export type FeedTurnPhase =
  | 'pre_round'       // countdown before first speaker
  | 'speaker_a'       // debater A's turn
  | 'pause_ab'        // 10s pause between A→B
  | 'speaker_b'       // debater B's turn
  | 'pause_ba'        // 10s pause between B→A (between rounds)
  | 'ad_break'        // 60s ad break between rounds (Phase 5)
  | 'final_ad_break'  // 30s ad break after last round (Phase 5)
  | 'vote_gate'       // spectators vote to see results (Phase 5)
  | 'finished';       // debate over

export const FEED_TURN_DURATION = 120;  // 2 minutes per turn
export const FEED_PAUSE_DURATION = 10;  // 10s between turns
export const FEED_TOTAL_ROUNDS = 4;
export const FEED_MAX_CHALLENGES = FEED_TOTAL_ROUNDS - 1;  // 3 challenges per debater per debate
export const FEED_CHALLENGE_RULING_SEC = 60;  // mod has 60s to rule on a challenge
export const FEED_AD_BREAK_DURATION = 60;       // 60s ad break between rounds
export const FEED_FINAL_AD_BREAK_DURATION = 30; // 30s final ad break before vote gate
export const FEED_VOTE_GATE_DURATION = 30;      // 30s vote gate countdown

// ============================================================
// CONSTANTS
// ============================================================

export const MODES: Readonly<Record<DebateMode, ModeInfo>> = {
  live: { id: 'live', icon: '⚖️', name: 'MODERATED LIVE', desc: 'Turn-based moderated debate. Text feed with scoring.', available: 'Opponent + Moderator needed', color: '#E7442A' },
  voicememo: { id: 'voicememo', icon: '🎤', name: 'VOICE MEMO', desc: 'Record & send. Debate on your schedule.', available: 'Async — anytime', color: '#8890A8' },
  text: { id: 'text', icon: '⌨️', name: 'TEXT BATTLE', desc: 'Written arguments. Think before you speak.', available: 'Async — anytime', color: '#555E78' },
  ai: { id: 'ai', icon: '🤖', name: 'AI SPARRING', desc: 'Practice against AI. Instant start.', available: '✅ Always ready', color: '#5DCAA5' },
} as const;

export const QUEUE_AI_PROMPT_SEC: Readonly<Record<DebateMode, number>> = { live: 60, voicememo: 60, text: 60, ai: 0 };
export const QUEUE_HARD_TIMEOUT_SEC: Readonly<Record<DebateMode, number>> = { live: 180, voicememo: 180, text: 180, ai: 0 };

export const QUEUE_CATEGORIES: readonly QueueCategory[] = [
  { id: 'politics',      icon: '🏛️', label: 'Politics' },
  { id: 'sports',        icon: '🏈', label: 'Sports' },
  { id: 'entertainment', icon: '🎬', label: 'Film & TV' },
  { id: 'couples',       icon: '💔', label: 'Couples Court' },
  { id: 'music',         icon: '🎵', label: 'Music' },
  { id: 'trending',      icon: '🔥', label: 'Trending' },
] as const;

export const MATCH_ACCEPT_SEC = 12;
export const MATCH_ACCEPT_POLL_TIMEOUT_SEC = 15;
export const ROUND_DURATION = 120;
export const AI_TOTAL_ROUNDS = 6;
export const OPPONENT_POLL_MS = 3000;
export const OPPONENT_POLL_TIMEOUT_SEC = 120;
export const TEXT_MAX_CHARS = 2000;

export const AI_TOPICS: readonly string[] = [
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

export const AI_RESPONSES: Readonly<Record<string, readonly string[]>> = {
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

export const ROUND_OPTIONS = [
  { rounds: 4, label: '4 Rounds', time: '~22 min' },
  { rounds: 6, label: '6 Rounds', time: '~33 min' },
  { rounds: 8, label: '8 Rounds', time: '~44 min' },
  { rounds: 10, label: '10 Rounds', time: '~55 min' },
];
