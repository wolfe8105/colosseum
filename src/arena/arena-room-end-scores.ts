// arena-room-end-scores.ts — score generation (concede / AI / placeholder / PvP)
// Also renders the "THE JUDGE IS REVIEWING..." loading screen during AI scoring.

import { screenEl } from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import type { AIScoreResult } from './arena-types-ai-scoring.ts';
import { requestAIScoring, sumSideScore } from './arena-room-ai.ts';

export interface GeneratedScores {
  scoreA: number | null;
  scoreB: number | null;
  aiScores: AIScoreResult | null;
  winner: string | null;
}

export async function generateScores(debate: CurrentDebate): Promise<GeneratedScores> {
  let scoreA: number | null = null;
  let scoreB: number | null = null;
  let aiScores: AIScoreResult | null = null;
  let winner: string | null = null;

  // Phase 5: Concede — always a loss for the conceder
  if (debate.concededBy) {
    winner = debate.concededBy === 'a' ? 'b' : 'a';
    return { scoreA, scoreB, aiScores, winner };
  }

  if (debate.mode === 'ai' && debate.messages.length > 0) {
    if (screenEl) {
      screenEl.innerHTML = '';
      const judging = document.createElement('div');
      judging.className = 'arena-post arena-fade-in';
      judging.innerHTML = `
        <div class="arena-judging">
          <div class="arena-judging-icon">\u2696\uFE0F</div>
          <div class="arena-judging-text">THE JUDGE IS REVIEWING...</div>
          <div class="arena-judging-sub">Analyzing ${debate.messages.length} arguments across ${debate.round} rounds</div>
          <div class="arena-typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        </div>
      `;
      screenEl.appendChild(judging);
    }

    aiScores = await requestAIScoring(debate.topic, debate.messages);
    if (aiScores) {
      scoreA = sumSideScore(aiScores.side_a);
      scoreB = sumSideScore(aiScores.side_b);
    } else {
      scoreA = 60 + Math.floor(Math.random() * 30);
      scoreB = 60 + Math.floor(Math.random() * 30);
    }
    winner = scoreA >= scoreB ? 'a' : 'b';
    return { scoreA, scoreB, aiScores, winner };
  }

  if (debate.mode === 'ai' || !debate.opponentId) {
    scoreA = 60 + Math.floor(Math.random() * 30);
    scoreB = 60 + Math.floor(Math.random() * 30);
    winner = scoreA >= scoreB ? 'a' : 'b';
    return { scoreA, scoreB, aiScores, winner };
  }

  // Human PvP — server determines winner from spectator votes; leave all null
  return { scoreA, scoreB, aiScores, winner };
}
