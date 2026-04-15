/**
 * debate-landing.types.ts — Debate Landing page type definitions
 * Extracted from debate-landing.ts (Session 254 track).
 */

export interface HotTake {
  author: string;
  text: string;
  fire: number;
  swords: number;
}

export interface DebateEntry {
  topic: string;
  sideA: string;
  sideB: string;
  category: string;
  catIcon: string;
  catLabel: string;
  yesVotes: number;
  noVotes: number;
  takes: HotTake[];
  is_auto?: boolean;
}
