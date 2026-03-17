/**
 * THE COLOSSEUM — Global Type Declarations (Migration Bridge)
 *
 * This file declares the window globals exposed by existing IIFE modules.
 * As each module is migrated to TypeScript with proper imports, its
 * declaration here should be removed. When this file is empty, the
 * migration is complete.
 *
 * Source of truth: THE-COLOSSEUM-WIRING-MANIFEST.md Section 8 (Source Map)
 *
 * MIGRATED (Session 126):
 *   - ColosseumConfig → src/config.ts (types re-exported below for window global)
 *   - ColosseumAuth → src/auth.ts (types re-exported below for window global)
 */

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { ColosseumConfig } from '../config.ts';
import type { SafeRpcResult, Profile, AuthResult, ProfileUpdate, AuthListener } from '../auth.ts';

// --- Supabase Client ---

/** Created in colosseum-auth.js via createClient() with noOpLock config */
declare const supabase: SupabaseClient;

// --- ColosseumConfig (colosseum-config.js → src/config.ts) ---
// Full type defined in src/config.ts. Window global matches that shape.

// --- ColosseumAuth (colosseum-auth.js → src/auth.ts) ---
// Full types defined in src/auth.ts.

interface ColosseumAuthGlobal {
  readonly currentUser: User | null;
  readonly currentProfile: Profile | null;
  readonly isPlaceholderMode: boolean;
  readonly supabase: SupabaseClient | null;
  ready: Promise<void>;
  init: () => void;
  signUp: (params: { email: string; password: string; username: string; displayName: string; dob: string }) => Promise<AuthResult>;
  logIn: (params: { email: string; password: string }) => Promise<AuthResult>;
  oauthLogin: (provider: string, redirectTo?: string) => Promise<AuthResult>;
  logOut: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  updateProfile: (updates: ProfileUpdate) => Promise<AuthResult>;
  deleteAccount: () => Promise<AuthResult>;
  followUser: (targetId: string) => Promise<AuthResult>;
  unfollowUser: (targetId: string) => Promise<AuthResult>;
  getFollowers: (userId: string) => Promise<AuthResult>;
  getFollowing: (userId: string) => Promise<AuthResult>;
  getFollowCounts: (userId: string) => Promise<{ followers: number; following: number }>;
  getPublicProfile: (userId: string) => Promise<unknown>;
  declareRival: (targetId: string, message?: string) => Promise<AuthResult>;
  respondRival: (rivalId: string, accept: boolean) => Promise<AuthResult>;
  getMyRivals: () => Promise<unknown[]>;
  showUserProfile: (userId: string) => Promise<void>;
  toggleModerator: (enabled: boolean) => Promise<AuthResult>;
  toggleModAvailable: (available: boolean) => Promise<AuthResult>;
  submitReference: (debateId: string, url: string | null, description: string | null, supportsSide?: string) => Promise<AuthResult>;
  ruleOnReference: (referenceId: string, ruling: string, reason: string | null, ruledByType?: string) => Promise<AuthResult>;
  scoreModerator: (debateId: string, score: number) => Promise<AuthResult>;
  assignModerator: (debateId: string, moderatorId: string | null, moderatorType?: string) => Promise<AuthResult>;
  getAvailableModerators: (excludeIds?: string[]) => Promise<unknown[]>;
  getDebateReferences: (debateId: string) => Promise<unknown[]>;
  safeRpc: <T = unknown>(rpcName: string, params?: Record<string, unknown>) => Promise<SafeRpcResult<T>>;
  requireAuth: (actionLabel?: string) => boolean;
  onChange: (fn: AuthListener) => void;
  _notify: (user: User | null, profile: Profile | null) => void;
}

/** Re-export Profile type so it's available to non-migrated .ts consumers */
type ColosseumProfile = Profile;

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
    ColosseumConfig: ColosseumConfig;
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
