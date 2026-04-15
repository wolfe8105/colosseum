/**
 * THE MODERATOR — Reference Arsenal Constants
 *
 * Source types, categories, rarity colors, challenge status labels.
 */

import type { SourceType, ReferenceCategory, Rarity, ChallengeStatus } from './reference-arsenal.types.ts';

export const SOURCE_TYPES: Record<SourceType, { label: string; ceiling: number; tier: string }> = {
  'primary':  { label: 'Primary Source', ceiling: 5, tier: 'S' },
  'academic': { label: 'Academic',       ceiling: 4, tier: 'A' },
  'book':     { label: 'Book',           ceiling: 3, tier: 'B' },
  'news':     { label: 'News',           ceiling: 1, tier: 'D' },
  'other':    { label: 'Other',          ceiling: 1, tier: 'D' },
};

export const CATEGORIES: ReferenceCategory[] = [
  'politics', 'sports', 'entertainment', 'music', 'couples_court',
];

export const CATEGORY_LABELS: Record<ReferenceCategory, string> = {
  'politics':      'Politics',
  'sports':        'Sports',
  'entertainment': 'Entertainment',
  'music':         'Music',
  'couples_court': 'Couples Court',
};

// TODO: needs CSS var token — all RARITY_COLORS values are hardcoded
export const RARITY_COLORS: Record<Rarity, string> = {
  common:    '#9ca3af',
  uncommon:  '#3b82f6',
  rare:      '#a855f7',
  legendary: '#eab308',
  mythic:    '#ef4444',
};

export const CHALLENGE_STATUS_LABELS: Record<ChallengeStatus, string> = {
  none:             '',
  disputed:         '⚠️ Disputed',
  heavily_disputed: '🔴 Heavily Disputed',
  frozen:           '🧊 Frozen',
};
