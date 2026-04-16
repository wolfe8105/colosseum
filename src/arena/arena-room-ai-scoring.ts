// arena-room-ai-scoring.ts — Post-debate AI scoring & scorecard rendering
// Split from arena-room-ai.ts

import { escapeHTML, SUPABASE_URL } from '../config.ts';
import type { DebateMessage, DebateRole } from './arena-types.ts';
import type { SideScores, AIScoreResult, CriterionScore } from './arena-types-ai-scoring.ts';
import { getUserJwt } from './arena-room-ai-response.ts';

export async function requestAIScoring(topic: string, messages: DebateMessage[]): Promise<AIScoreResult | null> {
  const messageHistory = messages.map((m) => ({
    role: m.role,
    content: m.text,
  }));

  try {
    const supabaseUrl = SUPABASE_URL;
    if (!supabaseUrl) throw new Error('No supabase URL');

    const edgeUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1/ai-sparring';
    const jwt = await getUserJwt();
    if (!jwt) throw new Error('Not authenticated');

    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwt,
      },
      body: JSON.stringify({ mode: 'score', topic, messageHistory }),
    });

    if (!res.ok) throw new Error('Scoring API error: ' + res.status);
    const data = await res.json() as { scores?: AIScoreResult };
    if (data?.scores) return data.scores;
    throw new Error('No scores in response');
  } catch (err) {
    console.warn('[Arena] AI scoring failed, falling back to random:', err);
    return null;
  }
}

export function sumSideScore(side: SideScores): number {
  return side.logic.score + side.evidence.score + side.delivery.score + side.rebuttal.score;
}

export function renderAIScorecard(
  myName: string,
  oppName: string,
  myRole: DebateRole,
  scores: AIScoreResult
): string {
  const mySide = myRole === 'a' ? scores.side_a : scores.side_b;
  const oppSide = myRole === 'a' ? scores.side_b : scores.side_a;
  const myTotal = sumSideScore(mySide);
  const oppTotal = sumSideScore(oppSide);

  function renderBar(label: string, mine: CriterionScore, theirs: CriterionScore): string {
    const myPct = mine.score * 10;
    const theirPct = theirs.score * 10;
    return `
      <div class="ai-score-criterion">
        <div class="ai-score-criterion-header">
          <span class="ai-score-criterion-label">${label}</span>
          <span class="ai-score-criterion-nums">${mine.score} \u2014 ${theirs.score}</span>
        </div>
        <div class="ai-score-bars">
          <div class="ai-score-bar mine" style="width: ${myPct}%"></div>
          <div class="ai-score-bar theirs" style="width: ${theirPct}%"></div>
        </div>
        <div class="ai-score-reason">${escapeHTML(mine.reason)}</div>
      </div>
    `;
  }

  return `
    <div class="ai-scorecard">
      <div class="ai-scorecard-header">
        <div class="ai-scorecard-side">
          <div class="ai-scorecard-name">${escapeHTML(myName)}</div>
          <div class="ai-scorecard-total ${myTotal >= oppTotal ? 'winner' : 'loser'}">${myTotal}</div>
        </div>
        <div class="ai-scorecard-vs">VS</div>
        <div class="ai-scorecard-side">
          <div class="ai-scorecard-name">${escapeHTML(oppName)}</div>
          <div class="ai-scorecard-total ${oppTotal >= myTotal ? 'winner' : 'loser'}">${oppTotal}</div>
        </div>
      </div>
      <div class="ai-scorecard-breakdown">
        ${renderBar('\uD83E\uDDE0 LOGIC', mySide.logic, oppSide.logic)}
        ${renderBar('\uD83D\uDCDA EVIDENCE', mySide.evidence, oppSide.evidence)}
        ${renderBar('\uD83C\uDFA4 DELIVERY', mySide.delivery, oppSide.delivery)}
        ${renderBar('\u2694\uFE0F REBUTTAL', mySide.rebuttal, oppSide.rebuttal)}
      </div>
      <div class="ai-scorecard-verdict">${escapeHTML(scores.verdict)}</div>
    </div>
  `;
}
