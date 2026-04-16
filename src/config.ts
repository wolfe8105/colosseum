/**
 * THE MODERATOR — Central Configuration (TypeScript)
 *
 * Runtime module — replaces moderator-config.js when Vite build is active.
 * All constants, escapeHTML, friendlyError live here.
 * Types extracted to config.types.ts (Session 255).
 * showToast extracted to config.toast.ts (Session 255).
 *
 * Migration: Session 126 (Phase 1), Session 138 (cutover — window bridge added)
 */

// ============================================================
// RE-EXPORTS — preserve all existing import paths unchanged
// ============================================================

export type {
  ToastType,
  StripePrices,
  IceServer,
  AppSettings,
  SubscriptionTier,
  SubscriptionTiers,
  TokenEarning,
  TokenConfig,
  DebateSettings,
  FeatureFlags,
  TopicSection,
  PlaceholderMode,
  ModeratorConfig,
} from './config.types';

export { showToast } from './config.toast';

// ============================================================
// INTERNAL IMPORTS
// ============================================================

import type {
  StripePrices,
  IceServer,
  AppSettings,
  SubscriptionTiers,
  TokenConfig,
  DebateSettings,
  FeatureFlags,
  TopicSection,
  PlaceholderMode,
  ModeratorConfig,
} from './config.types';
import { showToast } from './config.toast';

// ============================================================
// CREDENTIALS (read from Vite env vars, fall back to defaults)
// ============================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://faomczmipsccwbhpivmp.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb21jem1pcHNjY3diaHBpdm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTM4NzIsImV4cCI6MjA4Nzc2OTg3Mn0.d11AoWVu074DHo3vjVNNOA-1DT8KaoAXF340ysLoHYI';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51T5T9uPuHT2VlOoCgqdUqtvuez0QHuN9dKcFtYOsclcsjSoSHce8ROcw6zzF5JhPeNkiJK8cJ8DCrB8FU9jhEHwk00GAYHTzzi';

const STRIPE_PRICES: StripePrices = {
  contender_monthly: 'price_1T5THJPuHT2VlOoCYoDarYU5',
  champion_monthly: 'price_1T5THwPuHT2VlOoCQ6TQRBlN',
  creator_monthly: 'price_1T5TIDPuHT2VlOoCyuKuiBmx',
} as const;

const STRIPE_FUNCTION_URL = 'https://faomczmipsccwbhpivmp.supabase.co/functions/v1/create-checkout-session' as const;

// ============================================================
// WEBRTC / SIGNALING
// ============================================================

const SIGNALING_SERVER_URL = null;

const ICE_SERVERS: readonly IceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
] as const;

// ============================================================
// DEEPGRAM
// ============================================================

const DEEPGRAM_API_KEY = 'PASTE_YOUR_DEEPGRAM_API_KEY_HERE' as const;

// ============================================================
// APP SETTINGS
// ============================================================

const APP: AppSettings = {
  name: 'The Moderator',
  tagline: 'Where opinions fight.',
  version: '2.2.0',
  baseUrl: 'https://themoderator.app',
} as const;

// ============================================================
// SUBSCRIPTION TIERS
// ============================================================

const TIERS: SubscriptionTiers = {
  free:      { name: 'Lurker',    price: 0,     tokensPerDay: 10,  ads: true,  features: ['basic_debates', 'spectate', 'vote', 'hot_takes', 'follow'] },
  contender: { name: 'Contender', price: 9.99,  tokensPerDay: 30,  ads: false, features: ['all_free', 'custom_themes', 'priority_match', 'extended_stats'] },
  champion:  { name: 'Champion',  price: 19.99, tokensPerDay: 60,  ads: false, features: ['all_contender', 'exclusive_cosmetics', 'private_rooms', 'analytics', 'recordings'] },
  creator:   { name: 'Creator',   price: 29.99, tokensPerDay: 100, ads: false, features: ['all_champion', 'creator_tools', 'revenue_share', 'early_access', 'overlays'] },
} as const;

// ============================================================
// TOKEN ECONOMY
// ============================================================

const TOKENS: TokenConfig = {
  earning: {
    dailyLogin: 1,
    challenge: 3,
    firstWin: 2,
    streak3: 5,
    streak5: 10,
    streak10: 25,
    referral: 10,
    modWork: 2,
  },
  referralCap: 50,
} as const;

// ============================================================
// DEBATE SETTINGS
// ============================================================

const DEBATE: DebateSettings = {
  roundDurationSec: 120,
  breakDurationSec: 30,
  defaultRounds: 5,
  maxSpectators: 500,
  minEloForRanked: 1000,
  startingElo: 1200,
  formats: ['standard', 'crossfire', 'qa_prep'],
} as const;

// ============================================================
// FEATURE FLAGS
// ============================================================

const FEATURES: FeatureFlags = {
  liveDebates: true,
  asyncDebates: true,
  hotTakes: true,
  predictions: true,
  predictionsUI: true,
  cosmetics: true,
  leaderboard: true,
  notifications: true,
  shareLinks: true,
  profileDepth: true,
  voiceMemo: true,
  followsUI: true,
  rivals: true,
  arena: true,
  aiSparring: true,
  recording: false,
} as const;

// ============================================================
// TOPIC SECTIONS
// ============================================================

const SECTIONS: readonly TopicSection[] = [
  { id: 'politics',      name: 'THE FLOOR',     icon: '🏛️', tier: 1 },
  { id: 'sports',        name: 'THE PRESSBOX',   icon: '🏟️', tier: 1 },
  { id: 'entertainment', name: 'THE SPOTLIGHT',  icon: '🎬', tier: 2 },
  { id: 'couples',       name: 'COUPLES COURT',  icon: '💔', tier: 2 },
  { id: 'trending',      name: 'THE FIRE',       icon: '🔥', tier: 1 },
  { id: 'music',         name: 'THE STAGE',      icon: '🎵', tier: 3 },
] as const;

// ============================================================
// XSS PROTECTION
// ============================================================

/** UUID v4 regex. Canonical — do not duplicate in other modules. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** OWASP 5-char HTML escape. Canonical implementation — do not duplicate. */
export function escapeHTML(str: string | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// ============================================================
// FRIENDLY ERROR MAP
// ============================================================

interface ErrorLike {
  message?: string;
  msg?: string;
  code?: string | number;
  status?: number;
}

export function friendlyError(err: unknown): string {
  if (!err) return 'Something went sideways. Give it another shot.';

  const errObj = err as ErrorLike;
  const msg = (typeof err === 'string' ? err : (errObj.message ?? errObj.msg ?? '')).toLowerCase();
  const code = String(errObj.code ?? '');
  const status = Number(errObj.status) || 0;

  // Rate limit
  if (msg.includes('rate') || msg.includes('too many') || code === '429' || status === 429) {
    return 'Easy there, gladiator. Try again in a few seconds.';
  }

  // Auth / JWT
  if (msg.includes('jwt expired') || code === 'PGRST301' || status === 401) {
    return 'Session timed out. Signing you back in...';
  }
  if (msg.includes('invalid login') || msg.includes('invalid email or password')) {
    return 'Wrong email or password. Double-check and try again.';
  }
  if (msg.includes('email already registered') || msg.includes('already been registered')) {
    return 'That email is already taken. Try logging in instead.';
  }
  if (msg.includes('user not found')) {
    return 'No account found with that email.';
  }

  // Duplicate / unique constraint
  if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('already exists')) {
    return "You're already in. No need to double up.";
  }

  // Network
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('dns') || msg.includes('econnrefused')) {
    return 'Connection lost. Check your signal and try again.';
  }
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted')) {
    return 'That took too long. Tap to try again.';
  }

  // Supabase down / 5xx
  if (status >= 500) {
    return 'Servers are having a moment. Try again shortly.';
  }

  // Permission
  if (msg.includes('permission denied') || msg.includes('not authorized') || status === 403) {
    return "You don't have access to that. Log in or level up.";
  }

  // Mic / media
  if (msg.includes('permission') && (msg.includes('mic') || msg.includes('audio') || msg.includes('media'))) {
    return 'Mic access blocked. Check your browser settings.';
  }

  // Stripe
  if (msg.includes('card') && (msg.includes('declined') || msg.includes('insufficient'))) {
    return 'Payment failed. Check your card and try again.';
  }

  // Fallback
  return 'Something went sideways. Give it another shot.';
}

// ============================================================
// PLACEHOLDER DETECTION
// ============================================================

export function isPlaceholder(val: unknown): boolean {
  return typeof val === 'string' && (val.startsWith('PASTE_') || val.includes('PASTE_HERE'));
}

const placeholderMode: PlaceholderMode = {
  supabase: isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY),
  stripe: isPlaceholder(STRIPE_PUBLISHABLE_KEY),
  stripeFunction: isPlaceholder(STRIPE_FUNCTION_URL),
  signaling: false,
  deepgram: isPlaceholder(DEEPGRAM_API_KEY),
} as const;

const isAnyPlaceholder: boolean = placeholderMode.supabase || placeholderMode.stripe;

// ============================================================
// NAMED EXPORTS (for TypeScript module consumers)
// ============================================================

export {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_PRICES,
  STRIPE_FUNCTION_URL,
  SIGNALING_SERVER_URL,
  ICE_SERVERS,
  DEEPGRAM_API_KEY,
  APP,
  TIERS,
  TOKENS,
  DEBATE,
  FEATURES,
  SECTIONS,
  placeholderMode,
  isAnyPlaceholder,
};

// ============================================================
// DEFAULT EXPORT (full config object matching window.ModeratorConfig shape)
// ============================================================

const config: ModeratorConfig = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_PRICES,
  STRIPE_FUNCTION_URL,
  SIGNALING_SERVER_URL,
  ICE_SERVERS,
  DEEPGRAM_API_KEY,
  APP,
  TIERS,
  TOKENS,
  DEBATE,
  FEATURES,
  SECTIONS,
  placeholderMode,
  isAnyPlaceholder,
  isPlaceholder,
  escapeHTML,
  showToast,
  friendlyError,
} as const;

export default config;
