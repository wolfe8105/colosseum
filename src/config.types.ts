/**
 * THE MODERATOR — Config Type Definitions
 *
 * Pure type declarations extracted from config.ts (Session 255).
 * No imports. No runtime code.
 */

export type ToastType = 'success' | 'error' | 'info';

export interface StripePrices {
  readonly contender_monthly: string;
  readonly champion_monthly: string;
  readonly creator_monthly: string;
}

export interface IceServer {
  readonly urls: string;
}

export interface AppSettings {
  readonly name: string;
  readonly tagline: string;
  readonly version: string;
  readonly baseUrl: string;
}

export interface SubscriptionTier {
  readonly name: string;
  readonly price: number;
  readonly tokensPerDay: number;
  readonly ads: boolean;
  readonly features: readonly string[];
}

export interface SubscriptionTiers {
  readonly free: SubscriptionTier;
  readonly contender: SubscriptionTier;
  readonly champion: SubscriptionTier;
  readonly creator: SubscriptionTier;
}

export interface TokenEarning {
  readonly dailyLogin: number;
  readonly challenge: number;
  readonly firstWin: number;
  readonly streak3: number;
  readonly streak5: number;
  readonly streak10: number;
  readonly referral: number;
  readonly modWork: number;
}

export interface TokenConfig {
  readonly earning: TokenEarning;
  readonly referralCap: number;
}

export interface DebateSettings {
  readonly roundDurationSec: number;
  readonly breakDurationSec: number;
  readonly defaultRounds: number;
  readonly maxSpectators: number;
  readonly minEloForRanked: number;
  readonly startingElo: number;
  readonly formats: readonly string[];
}

export interface FeatureFlags {
  readonly liveDebates: boolean;
  readonly asyncDebates: boolean;
  readonly hotTakes: boolean;
  readonly predictions: boolean;
  readonly predictionsUI: boolean;
  readonly cosmetics: boolean;
  readonly leaderboard: boolean;
  readonly notifications: boolean;
  readonly shareLinks: boolean;
  readonly profileDepth: boolean;
  readonly voiceMemo: boolean;
  readonly followsUI: boolean;
  readonly rivals: boolean;
  readonly arena: boolean;
  readonly aiSparring: boolean;
  readonly recording: boolean;
}

export interface TopicSection {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly tier: number;
}

export interface PlaceholderMode {
  readonly supabase: boolean;
  readonly stripe: boolean;
  readonly stripeFunction: boolean;
  readonly signaling: boolean;
  readonly deepgram: boolean;
}

/** Full typed shape of what moderator-config.js exposes as window.ModeratorConfig */
export interface ModeratorConfig {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly STRIPE_PUBLISHABLE_KEY: string;
  readonly STRIPE_PRICES: StripePrices;
  readonly STRIPE_FUNCTION_URL: string;
  readonly SIGNALING_SERVER_URL: null;
  readonly ICE_SERVERS: readonly IceServer[];
  readonly DEEPGRAM_API_KEY: string;
  readonly APP: AppSettings;
  readonly TIERS: SubscriptionTiers;
  readonly TOKENS: TokenConfig;
  readonly DEBATE: DebateSettings;
  readonly FEATURES: FeatureFlags;
  readonly SECTIONS: readonly TopicSection[];
  readonly placeholderMode: PlaceholderMode;
  readonly isAnyPlaceholder: boolean;
  readonly isPlaceholder: (val: unknown) => boolean;
  readonly escapeHTML: (str: string | null | undefined) => string;
  readonly showToast: (msg: string, type?: ToastType) => void;
  readonly friendlyError: (err: unknown) => string;
  readonly sanitizeUrl: (url: string | null | undefined) => string;
}
