/**
 * LANDMINE [LM-ASYNC-001] — _placingPrediction undeclared variable
 * In the original async.ts, placePrediction() calls `if (_placingPrediction) return;`
 * but _placingPrediction was never declared anywhere in the file.
 * This guard was always falsy and did nothing. The real dedup guard is
 * state.predictingInFlight (a Set). The dead reference has been removed.
 * Add to THE-MODERATOR-LAND-MINE-MAP.md when session allows.
 */

/**
 * THE MODERATOR — Async Module: Shared Mutable State
 *
 * All module-level state for the async subsystem lives here.
 * Single exported `state` object with getters/setters.
 */

import type {
  HotTake,
  Prediction,
  StandaloneQuestion,
  CategoryFilter,
} from './async.types.ts';

// ============================================================
// PRIVATE BACKING VARIABLES
// ============================================================

let _hotTakes: HotTake[] = [];
let _predictions: Prediction[] = [];
let _standaloneQuestions: StandaloneQuestion[] = [];
let _currentFilter: CategoryFilter = 'all';
let _pendingChallengeId: string | null = null;
const _reactingIds: Set<string> = new Set();
let _postingInFlight = false;
let _challengeInFlight = false;
const _predictingInFlight: Set<string> = new Set();
const _wiredContainers: WeakSet<HTMLElement> = new WeakSet();

// ============================================================
// STATE OBJECT
// ============================================================

export const state = {
  get hotTakes(): HotTake[] { return _hotTakes; },
  set hotTakes(v: HotTake[]) { _hotTakes = v; },

  get predictions(): Prediction[] { return _predictions; },
  set predictions(v: Prediction[]) { _predictions = v; },

  get standaloneQuestions(): StandaloneQuestion[] { return _standaloneQuestions; },
  set standaloneQuestions(v: StandaloneQuestion[]) { _standaloneQuestions = v; },

  get currentFilter(): CategoryFilter { return _currentFilter; },
  set currentFilter(v: CategoryFilter) { _currentFilter = v; },

  get pendingChallengeId(): string | null { return _pendingChallengeId; },
  set pendingChallengeId(v: string | null) { _pendingChallengeId = v; },

  get reactingIds(): Set<string> { return _reactingIds; },

  get postingInFlight(): boolean { return _postingInFlight; },
  set postingInFlight(v: boolean) { _postingInFlight = v; },

  get challengeInFlight(): boolean { return _challengeInFlight; },
  set challengeInFlight(v: boolean) { _challengeInFlight = v; },

  get predictingInFlight(): Set<string> { return _predictingInFlight; },

  get wiredContainers(): WeakSet<HTMLElement> { return _wiredContainers; },
};

// ============================================================
// PLACEHOLDER DATA
// ============================================================

export const PLACEHOLDER_TAKES: Record<string, HotTake[]> = {
  all: [
    {
      id: 't1',
      user_id: 'u1',
      user: 'SHARPMIND',
      elo: 1847,
      text: 'AI is going to make 50% of white-collar jobs obsolete by 2030. Not a question of if.',
      section: 'trending',
      reactions: 1247,
      challenges: 23,
      time: '2h',
      userReacted: false,
    },
    {
      id: 't2',
      user_id: 'u2',
      user: 'BOLDCLAIM',
      elo: 1280,
      text: "Patrick Mahomes is already the greatest QB ever. Stats don't lie.",
      section: 'sports',
      reactions: 531,
      challenges: 11,
      time: '45m',
      userReacted: false,
    },
    {
      id: 't3',
      user_id: 'u3',
      user: 'SENATEWATCH',
      elo: 1340,
      text: 'Term limits would fix 80% of Congress overnight. Change my mind.',
      section: 'politics',
      reactions: 312,
      challenges: 4,
      time: '12m',
      userReacted: false,
    },
    {
      id: 't4',
      user_id: 'u4',
      user: 'FILMTAKES',
      elo: 1190,
      text: 'Christopher Nolan peaked at The Dark Knight. Everything since is style over substance.',
      section: 'entertainment',
      reactions: 402,
      challenges: 8,
      time: '15m',
      userReacted: false,
    },
    {
      id: 't5',
      user_id: 'u5',
      user: 'TECHBRO_NO',
      elo: 1590,
      text: "Every generation thinks they're living through the apocalypse. AI doomerism is no different.",
      section: 'trending',
      reactions: 894,
      challenges: 17,
      time: '3h',
      userReacted: false,
    },
    {
      id: 't6',
      user_id: 'u6',
      user: 'HOOPHEAD',
      elo: 1420,
      text: 'The NBA play-in tournament is the best thing the league has done in 20 years.',
      section: 'sports',
      reactions: 247,
      challenges: 6,
      time: '8m',
      userReacted: false,
    },
  ],
  politics: [],
  sports: [],
  entertainment: [],
  trending: [],
};

export const PLACEHOLDER_PREDICTIONS: Prediction[] = [
  {
    debate_id: 'd1',
    topic: 'Should the Electoral College Be Abolished?',
    p1: 'ConstitutionFan',
    p2: 'DirectDemocrat',
    p1_elo: 1340,
    p2_elo: 1290,
    total: 847,
    pct_a: 38,
    pct_b: 62,
    user_pick: null,
    status: 'live',
  },
  {
    debate_id: 'd2',
    topic: "MJ vs LeBron — Who's the Real GOAT?",
    p1: 'ChicagoBull',
    p2: 'AkronHammer',
    p1_elo: 1580,
    p2_elo: 1620,
    total: 2341,
    pct_a: 55,
    pct_b: 45,
    user_pick: null,
    status: 'live',
  },
  {
    debate_id: 'd3',
    topic: 'AI Will Replace 50% of Jobs by 2030',
    p1: 'TechRealist',
    p2: 'HumanFirst',
    p1_elo: 1490,
    p2_elo: 1310,
    total: 1205,
    pct_a: 67,
    pct_b: 33,
    user_pick: null,
    status: 'scheduled',
  },
];

// Populate category filters
PLACEHOLDER_TAKES.all!.forEach((t) => {
  PLACEHOLDER_TAKES[t.section]?.push(t);
});
