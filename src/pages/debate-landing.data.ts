/**
 * debate-landing.data.ts — Debate seed data and URL init
 * DEBATES constant, custom topic building, URL params, fingerprint.
 * Extracted from debate-landing.ts (Session 254 track).
 */

import type { DebateEntry } from './debate-landing.types.ts';
export { getFingerprint } from '../config.ts';

// ============================================================
// DEMO DEBATES (seed data — backend counts override on load)
// ============================================================

export const DEBATES: Record<string, DebateEntry> = {
  'mahomes-vs-allen': {
    topic: 'Is Patrick Mahomes better than Josh Allen?',
    sideA: 'Mahomes', sideB: 'Allen',
    category: 'sports', catIcon: '🏈', catLabel: 'Sports',
    yesVotes: 847, noVotes: 762,
    takes: [
      { author: 'GridironGuru', text: 'Three rings. End of discussion. Mahomes has more hardware than Allen will ever see.', fire: 42, swords: 18 },
      { author: 'BillsMafia4Life', text: "Allen does more with less. Put him on the Chiefs and he'd have 5 rings by now.", fire: 38, swords: 31 },
      { author: 'NFLAnalytics', text: "Stats don't lie — Allen's rushing adds a dimension Mahomes can't match. Total package.", fire: 27, swords: 12 },
    ]
  },
  'caleb-downs-combine': {
    topic: 'Is Caleb Downs worth a top 10 pick in the 2026 NFL Draft?',
    sideA: 'Yes — Top 10', sideB: 'No — Reach',
    category: 'sports', catIcon: '🏈', catLabel: 'Sports',
    yesVotes: 534, noVotes: 289,
    takes: [
      { author: 'DraftSzn', text: 'Best safety prospect since Ed Reed. You take that every time.', fire: 55, swords: 8 },
      { author: 'ScoutingDept', text: 'Safety at 10 is a luxury pick. Build the trenches first.', fire: 31, swords: 22 },
    ]
  },
  'trump-tariffs': {
    topic: "Will Trump's new tariffs help or hurt the average American?",
    sideA: 'Help', sideB: 'Hurt',
    category: 'politics', catIcon: '🏛️', catLabel: 'Politics',
    yesVotes: 612, noVotes: 871,
    takes: [
      { author: 'EconWatcher', text: 'Every economist agrees: tariffs are a tax on consumers. Your groceries are about to get expensive.', fire: 63, swords: 41 },
      { author: 'MadeInUSA', text: 'Short term pain for long term gain. We need manufacturing back on American soil.', fire: 48, swords: 33 },
    ]
  },
  'beyonce-overrated': {
    topic: 'Is Beyoncé overrated?',
    sideA: 'Yes', sideB: 'No',
    category: 'entertainment', catIcon: '🎤', catLabel: 'Entertainment',
    yesVotes: 223, noVotes: 891,
    takes: [
      { author: 'MusicCritic101', text: 'Talented? Sure. Greatest of all time? The Beyhive has lost its mind.', fire: 72, swords: 88 },
      { author: 'QueenBFan', text: '28 Grammys. Most awarded artist in history. "Overrated" is cope.', fire: 94, swords: 15 },
    ]
  }
};

// ============================================================
// URL PARAMS + CUSTOM TOPIC INIT (module side effects)
// ============================================================

const urlParams = new URLSearchParams(window.location.search);
export const topicSlug: string = urlParams.get('topic') ?? 'mahomes-vs-allen';
export const customTitle: string | null = urlParams.get('title');
export const source: string | null = urlParams.get('src');

// Custom topic support
if (topicSlug && !DEBATES[topicSlug] && customTitle) {
  const catMap: Record<string, [string, string]> = {
    sports: ['🏈', 'Sports'], politics: ['🏛️', 'Politics'],
    entertainment: ['🎤', 'Entertainment'], music: ['🎵', 'Music'], trending: ['🔥', 'Trending'],
  };
  const cat = urlParams.get('cat') ?? 'trending';
  const [catIcon, catLabel] = catMap[cat] ?? ['🔥', 'Trending'];
  DEBATES[topicSlug] = {
    topic: decodeURIComponent(customTitle),
    sideA: 'Yes', sideB: 'No',
    category: cat, catIcon, catLabel,
    yesVotes: 0, noVotes: 0,
    takes: [
      { author: 'The Moderator', text: 'This debate was started from ' + (source === 'telegram' || source === 'telegram-inline' ? 'Telegram' : 'a shared link') + '. Cast your vote and drop a hot take!', fire: 1, swords: 0 },
    ]
  };
}

export const debate: DebateEntry = DEBATES[topicSlug] ?? DEBATES['mahomes-vs-allen']!;
export const voteKey: string = 'colosseum_vote_' + topicSlug;

// Set page title as side effect
document.title = debate.topic + ' — The Moderator';

