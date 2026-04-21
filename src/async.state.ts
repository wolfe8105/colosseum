/**
 * THE MODERATOR — Async Module: Shared Mutable State
 *
 * F-68: Hot take state removed. Only predictions + standalone questions remain.
 */

import type {
  Prediction,
  StandaloneQuestion,
} from './async.types.ts';

// ============================================================
// PRIVATE BACKING VARIABLES
// ============================================================

let _predictions: Prediction[] = [];
let _standaloneQuestions: StandaloneQuestion[] = [];
const _predictingInFlight: Set<string> = new Set();

// ============================================================
// STATE OBJECT
// ============================================================

export const state = {
  get predictions(): Prediction[] { return _predictions; },
  set predictions(v: Prediction[]) { _predictions = v; },

  get standaloneQuestions(): StandaloneQuestion[] { return _standaloneQuestions; },
  set standaloneQuestions(v: StandaloneQuestion[]) { _standaloneQuestions = v; },

  get predictingInFlight(): Set<string> { return _predictingInFlight; },
};

// ============================================================
// PLACEHOLDER DATA
// ============================================================

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
