/**
 * THE MODERATOR — Profile Depth State
 * Shared module-level state, sanitizers, and localStorage initialization.
 */

import { SECTIONS } from './profile-depth.data.ts';
import type { Answers, AnswerValue } from './profile-depth.types.ts';

// ============================================================
// SHARED STATE
// Exported as mutable references so sub-modules can read/write.
// ============================================================

export let answers: Answers = {};
export let completedSections: Set<string> = new Set();
export let activeSection: string | null = null;
export let serverQuestionsAnswered = 0;
export const previouslyAnsweredIds = new Set<string>();

export function setAnswer(id: string, val: AnswerValue): void { answers[id] = val; }
export function setActiveSection(id: string | null): void { activeSection = id; }
export function setServerQuestionsAnswered(n: number): void { serverQuestionsAnswered = n; }
export function addCompletedSection(id: string): void { completedSections.add(id); }

// ============================================================
// SANITIZERS (SESSION 64)
// ============================================================

export function sanitizeAnswers(raw: unknown): Answers {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const clean: Answers = Object.create(null);
  const validIds = new Set<string>();
  SECTIONS.forEach(s => s.questions.forEach(q => validIds.add(q.id)));
  for (const key of Object.keys(raw as Record<string, unknown>)) {
    if (!validIds.has(key)) continue;
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === 'string' && v.length <= 500) clean[key] = v;
    else if (typeof v === 'number' && Number.isFinite(v)) clean[key] = v;
    else if (Array.isArray(v) && v.length <= 20 && v.every((i: unknown) => typeof i === 'string' && (i as string).length <= 200)) clean[key] = v as string[];
  }
  return clean;
}

export function sanitizeCompleted(raw: unknown): Set<string> {
  if (!Array.isArray(raw)) return new Set();
  const validIds = new Set(SECTIONS.map(s => s.id));
  return new Set(raw.filter((id: unknown) => typeof id === 'string' && validIds.has(id as string)) as string[]);
}

// ============================================================
// LOCALSTORAGE INIT
// ============================================================

try {
  answers = sanitizeAnswers(JSON.parse(localStorage.getItem('colosseum_profile_depth') || '{}'));
} catch {
  answers = {};
  localStorage.removeItem('colosseum_profile_depth');
}

try {
  completedSections = sanitizeCompleted(JSON.parse(localStorage.getItem('colosseum_depth_complete') || '[]'));
} catch {
  completedSections = new Set();
  localStorage.removeItem('colosseum_depth_complete');
}

// ============================================================
// SNAPSHOT (Session 117)
// ============================================================

export function snapshotAnswered(): void {
  // LANDMINE [LM-DEPTH-002]: This migration sync fires on every cold start where
  // serverQuestionsAnswered is genuinely 0. A user who truly has 0 server-side answers
  // but has local localStorage data from a prior session will trigger a sync.
  // May over-count if called multiple times across sessions.
  previouslyAnsweredIds.clear();
  SECTIONS.forEach(s => {
    s.questions.forEach(q => {
      if (hasAnswer(answers[q.id])) previouslyAnsweredIds.add(q.id);
    });
  });
}

export function hasAnswer(val: AnswerValue | undefined): boolean {
  if (val === undefined || val === '' || val === null) return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
}
