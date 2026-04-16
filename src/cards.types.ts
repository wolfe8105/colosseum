/**
 * THE MODERATOR — Cards Types & Constants
 *
 * Type definitions and static configuration for the Canvas card generator.
 * No imports — pure data shapes and config.
 */

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type CardSize = 'og' | 'story' | 'twitter' | 'square';

export interface CardDimensions {
  readonly w: number;
  readonly h: number;
  readonly label: string;
}

export interface GenerateCardOptions {
  topic?: string;
  sideA?: string;
  sideB?: string;
  yesVotes?: number;
  noVotes?: number;
  size?: CardSize | string;
}

// ============================================================
// CONSTANTS
// ============================================================

export const SIZES: Readonly<Record<CardSize, CardDimensions>> = {
  og: { w: 1200, h: 630, label: 'Link Preview' },
  story: { w: 1080, h: 1920, label: 'Instagram Story' },
  twitter: { w: 1200, h: 675, label: 'Twitter/X' },
  square: { w: 1080, h: 1080, label: 'Square' },
} as const;

export const COLORS = {
  bg1: '#1a2d4a',
  bg2: '#2d5a8e',
  bg3: '#0a1628',
  gold: '#d4a843',
  goldDim: '#b8922e',
  red: '#cc2936',
  green: '#2ecc71',
  white: '#f0f0f0',
  whiteDim: '#a0a8b8',
  cardBg: 'rgba(10, 17, 40, 0.85)',
} as const;

// Preload Antonio for Canvas API — CSS loads it for DOM, but Canvas needs explicit load
if (typeof document !== 'undefined' && document.fonts) {
  document.fonts.load('400 16px "Antonio"').catch((e) => console.warn('[Cards] font load failed:', e));
  document.fonts.load('700 16px "Antonio"').catch((e) => console.warn('[Cards] font load failed:', e));
}

export const CANVAS_FONT = "'Antonio', sans-serif";
