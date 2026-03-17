/**
 * THE COLOSSEUM — Global Type Declarations (Migration Bridge)
 *
 * This file declares the window globals exposed by existing IIFE modules.
 * As each module is migrated to TypeScript with proper imports, its
 * declaration here should be removed. When this file is empty, the
 * migration is complete.
 *
 * Source of truth: THE-COLOSSEUM-WIRING-MANIFEST.md Section 8 (Source Map)
 */

import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

// --- Supabase Client ---

/** Created in colosseum-auth.js via createClient() with noOpLock config */
declare const supabase: SupabaseClient;

// --- ColosseumConfig (colosseum-config.js) ---

interface ColosseumConfigGlobal {
  supabaseUrl: string;
  supabaseAnonKey: string;
  stripePublicKey: string;
  app: {
    baseUrl: string;
    name: string;
  };
  features: Record<string, boolean>;
  escHtml: (str: string) => string;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  friendlyError: (error: unknown) => string;
}

// --- ColosseumAuth (colosseum-auth.js) ---

interface SafeRpcResult<T = unknown> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

interface ColosseumAuthGlobal {
  ready: Promise<void>;
  safeRpc: <T = unknown>(rpcName: string, params?: Record<string, unknown>) => Promise<SafeRpcResult<T>>;
  getUser: () => User | null;
  getProfile: () => ColosseumProfile | null;
  signIn: (provider: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<ColosseumProfile>) => Promise<SafeRpcResult>;
  showUserProfile: (userId: string) => void;
  followUser: (targetId: string) => Promise<SafeRpcResult>;
  unfollowUser: (targetId: string) => Promise<SafeRpcResult>;
  declareRival: (targetId: string) => Promise<SafeRpcResult>;
  deleteAccount: () => Promise<void>;
}

/** Matches profiles table - will be replaced by database.ts auto-generated type */
interface ColosseumProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  elo_rating: number;
  token_balance: number;
  level: number;
  xp: number;
  streak_freezes: number;
  questions_answered: number;
  wins: number;
  losses: number;
  draws: number;
  [key: string]: unknown;
}

// --- ColosseumTokens (colosseum-tokens.js) ---

interface ColosseumTokensGlobal {
  claimHotTake: (takeId: string) => Promise<void>;
  claimReaction: (takeId: string) => Promise<void>;
  claimPrediction: (predictionId: string) => Promise<void>;
  claimVote: (debateId: string) => Promise<void>;
  claimMilestone: (key: string) => Promise<void>;
  showTokenAnimation: (amount: number) => void;
}

// --- ColosseumTiers (colosseum-tiers.js) ---

type TierLevel = 0 | 1 | 2 | 3 | 4 | 5;

interface TierInfo {
  level: TierLevel;
  name: string;
  minQuestions: number;
  maxStake: number;
  powerUpSlots: number;
}

interface ColosseumTiersGlobal {
  getTier: (questionsAnswered: number) => TierInfo;
  getNextTier: (questionsAnswered: number) => TierInfo | null;
  renderTierBadge: (questionsAnswered: number) => string;
  renderTierProgress: (questionsAnswered: number) => string;
}

// --- ColosseumArena (colosseum-arena.js) ---

type DebateStatus = 'pending' | 'lobby' | 'matched' | 'live' | 'completed';
type DebateMode = 'live_audio' | 'voice_memo' | 'text_battle' | 'ai_sparring';

interface ColosseumArenaGlobal {
  renderLobby: () => void;
  [key: string]: unknown;
}

// --- ColosseumAsync (colosseum-async.js) ---

interface ColosseumAsyncGlobal {
  loadFeed: (category?: string) => Promise<void>;
  [key: string]: unknown;
}

// --- ColosseumNotifications (colosseum-notifications.js) ---

interface ColosseumNotificationsGlobal {
  startPolling: () => void;
  stopPolling: () => void;
  getUnreadCount: () => number;
  [key: string]: unknown;
}

// --- ColosseumLeaderboard (colosseum-leaderboard.js) ---

interface ColosseumLeaderboardGlobal {
  render: (containerId: string) => void;
  [key: string]: unknown;
}

// --- ColosseumShare (colosseum-share.js) ---

interface ColosseumShareGlobal {
  shareResult: (data: Record<string, unknown>) => Promise<void>;
  [key: string]: unknown;
}

// --- ColosseumCards (colosseum-cards.js) ---

interface ColosseumCardsGlobal {
  generateCard: (data: Record<string, unknown>) => Promise<HTMLCanvasElement>;
  [key: string]: unknown;
}

// --- ColosseumScoring (colosseum-scoring.js) ---

interface ColosseumScoringGlobal {
  calculateElo: (ratingA: number, ratingB: number, scoreA: number, scoreB: number) => { newA: number; newB: number };
  [key: string]: unknown;
}

// --- ColosseumPayments (colosseum-payments.js) ---

interface ColosseumPaymentsGlobal {
  subscribe: (tier: string, billing: string) => Promise<void>;
  buyTokens: (packId: string) => Promise<void>;
  [key: string]: unknown;
}

// --- ColosseumPaywall (colosseum-paywall.js) ---

interface ColosseumPaywallGlobal {
  gate: (feature: string) => boolean;
  [key: string]: unknown;
}

// --- ColosseumWebRTC (colosseum-webrtc.js) ---

interface ColosseumWebRTCGlobal {
  joinDebate: (debateId: string, role: string) => Promise<void>;
  leaveDebate: () => void;
  toggleMute: () => void;
  createWaveform: (container: HTMLElement) => void;
  [key: string]: unknown;
}

// --- ColosseumVoiceMemo (colosseum-voicememo.js) ---

interface ColosseumVoiceMemoGlobal {
  [key: string]: unknown;
}

// --- ColosseumAnalytics (colosseum-analytics.js) ---

interface ColosseumAnalyticsGlobal {
  trackEvent: (eventType: string, metadata?: Record<string, unknown>) => void;
  [key: string]: unknown;
}

// --- Window Augmentation ---

declare global {
  interface Window {
    ColosseumConfig: ColosseumConfigGlobal;
    ColosseumAuth: ColosseumAuthGlobal;
    ColosseumTokens: ColosseumTokensGlobal;
    ColosseumTiers: ColosseumTiersGlobal;
    ColosseumArena: ColosseumArenaGlobal;
    ColosseumAsync: ColosseumAsyncGlobal;
    ColosseumNotifications: ColosseumNotificationsGlobal;
    ColosseumLeaderboard: ColosseumLeaderboardGlobal;
    ColosseumShare: ColosseumShareGlobal;
    ColosseumCards: ColosseumCardsGlobal;
    ColosseumScoring: ColosseumScoringGlobal;
    ColosseumPayments: ColosseumPaymentsGlobal;
    ColosseumPaywall: ColosseumPaywallGlobal;
    ColosseumWebRTC: ColosseumWebRTCGlobal;
    ColosseumVoiceMemo: ColosseumVoiceMemoGlobal;
    ColosseumAnalytics: ColosseumAnalyticsGlobal;
  }
}

export {};
