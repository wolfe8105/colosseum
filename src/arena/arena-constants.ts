/**
 * Arena constants and queue categories.
 */

import type { DebateMode, ModeInfo } from './arena-types.ts';

export interface QueueCategory {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
}

export const MODES: Readonly<Record<DebateMode, ModeInfo>> = {
  live: { id: 'live', icon: '⚖️', name: 'MODERATED LIVE', desc: 'Turn-based moderated debate. Text feed with scoring.', available: 'Opponent + Moderator needed', color: 'var(--mod-side-a)' },
  voicememo: { id: 'voicememo', icon: '🎤', name: 'VOICE MEMO', desc: 'Record & send. Debate on your schedule.', available: 'Async — anytime', color: 'var(--mod-text-muted)' },
  text: { id: 'text', icon: '⌨️', name: 'TEXT BATTLE', desc: 'Written arguments. Think before you speak.', available: 'Async — anytime', color: 'var(--mod-text-sub)' },
  ai: { id: 'ai', icon: '🤖', name: 'AI SPARRING', desc: 'Practice against AI. Instant start.', available: '✅ Always ready', color: 'var(--mod-status-open)' },
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

// LANDMINE [LM-TYPES-002]: ROUND_OPTIONS lacks `as const` while every other readonly
// constant in this file uses it. Minor consistency issue — do not fix here.
export const ROUND_OPTIONS = [
  { rounds: 4, label: '4 Rounds', time: '~22 min' },
  { rounds: 6, label: '6 Rounds', time: '~33 min' },
  { rounds: 8, label: '8 Rounds', time: '~44 min' },
  { rounds: 10, label: '10 Rounds', time: '~55 min' },
];
