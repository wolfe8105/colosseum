/**
 * THE COLOSSEUM — Questionnaire Tier System (TypeScript)
 *
 * Typed mirror of colosseum-tiers.js. Pure utility — zero dependencies.
 * Client-side is DISPLAY ONLY — all RPCs enforce server-side.
 *
 * Migration: Session 126 (Phase 2)
 */

import { escapeHTML } from './config.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type TierLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface TierThreshold {
  readonly min: number;
  readonly tier: TierLevel;
  readonly name: string;
  readonly icon: string;
  readonly maxStake: number;
  readonly slots: number;
}

export interface TierInfo extends TierThreshold {
  readonly stakeCap: number;
  readonly questionsAnswered: number;
}

export interface NextTierInfo {
  readonly tier: TierLevel;
  readonly name: string;
  readonly icon: string;
  readonly questionsNeeded: number;
  readonly totalRequired: number;
  /** Alias used by some callers (e.g. staking locked panel) */
  readonly minQuestions: number;
}

// ============================================================
// TIER THRESHOLDS (descending — first match wins)
// ============================================================

export const TIER_THRESHOLDS: readonly TierThreshold[] = [
  { min: 100, tier: 5, name: 'Legend',     icon: '👑', maxStake: Infinity, slots: 4 },
  { min: 75,  tier: 4, name: 'Champion',   icon: '🏆', maxStake: 100,     slots: 3 },
  { min: 50,  tier: 3, name: 'Gladiator',  icon: '⚔️', maxStake: 50,      slots: 2 },
  { min: 25,  tier: 2, name: 'Contender',  icon: '🥊', maxStake: 25,      slots: 1 },
  { min: 10,  tier: 1, name: 'Spectator+', icon: '👁️', maxStake: 5,       slots: 0 },
  { min: 0,   tier: 0, name: 'Unranked',   icon: '🔒', maxStake: 0,       slots: 0 },
] as const;

export const TIER_COLORS: Readonly<Record<TierLevel, string>> = {
  0: '#6b7280',
  1: '#9ca3af',
  2: '#3b82f6',
  3: '#a855f7',
  4: '#f59e0b',
  5: '#ef4444',
} as const;

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Get tier info from questions_answered count.
 * Returns object with both maxStake and stakeCap (alias) for consumer compat.
 */
export function getTier(questionsAnswered: number): TierInfo {
  const qa = typeof questionsAnswered === 'number' ? questionsAnswered : 0;
  for (const t of TIER_THRESHOLDS) {
    if (qa >= t.min) {
      return {
        ...t,
        stakeCap: t.maxStake,
        questionsAnswered: qa,
      };
    }
  }
  // Fallback (should never hit — tier 0 has min: 0)
  return { tier: 0, name: 'Unranked', icon: '🔒', maxStake: 0, stakeCap: 0, slots: 0, min: 0, questionsAnswered: qa };
}

/** Can this user stake at all? (tier >= 1, maxStake > 0) */
export function canStake(questionsAnswered: number): boolean {
  return getTier(questionsAnswered).maxStake > 0;
}

/** How many power-up slots does this user have? */
export function getPowerUpSlots(questionsAnswered: number): number {
  return getTier(questionsAnswered).slots;
}

/**
 * Get the next tier info (what user is working toward).
 * Returns null if already at max tier.
 */
export function getNextTier(questionsAnswered: number): NextTierInfo | null {
  const qa = typeof questionsAnswered === 'number' ? questionsAnswered : 0;
  const current = getTier(qa);
  if (current.tier >= 5) return null;

  const next = TIER_THRESHOLDS.find(t => t.tier === (current.tier + 1 as TierLevel));
  if (!next) return null;

  return {
    tier: next.tier,
    name: next.name,
    icon: next.icon,
    questionsNeeded: next.min - qa,
    totalRequired: next.min,
    minQuestions: next.min,
  };
}

// ============================================================
// RENDER FUNCTIONS (return HTML strings)
// ============================================================

/** Render a tier badge as an HTML string. */
export function renderTierBadge(questionsAnswered: number): string {
  const t = getTier(questionsAnswered);
  const color = TIER_COLORS[t.tier] ?? '#6b7280';
  return '<span class="tier-badge" style="color:' + color + '; font-weight:600;">' +
    escapeHTML(t.name) + '</span>';
}

/** Render a progress bar toward next tier as HTML string. */
export function renderTierProgress(questionsAnswered: number): string {
  const current = getTier(questionsAnswered);
  const next = getNextTier(questionsAnswered);
  if (!next) {
    return '<div class="tier-progress-complete">Legend — Max Tier</div>';
  }

  const prevEntry = TIER_THRESHOLDS.find(t => t.tier === current.tier);
  const prevMin = prevEntry?.min ?? 0;
  const filled = questionsAnswered - prevMin;
  const band = next.totalRequired - prevMin;
  const pct = band > 0 ? Math.min(100, Math.round((filled / band) * 100)) : 0;

  return '<div class="tier-progress">' +
    '<div class="tier-progress-label">' +
      escapeHTML(String(questionsAnswered)) + '/' + escapeHTML(String(next.totalRequired)) +
      ' — ' + escapeHTML(String(next.questionsNeeded)) + ' more to unlock ' +
      escapeHTML(next.name) +
    '</div>' +
    '<div class="tier-progress-bar">' +
      '<div class="tier-progress-fill" style="width:' + pct + '%"></div>' +
    '</div>' +
  '</div>';
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

const tiers = {
  getTier,
  getNextTier,
  canStake,
  getPowerUpSlots,
  renderTierBadge,
  renderTierProgress,
  TIER_THRESHOLDS,
} as const;

export default tiers;
