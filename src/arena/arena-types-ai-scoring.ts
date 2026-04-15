/**
 * AI scoring result types.
 */

export interface CriterionScore {
  score: number;
  reason: string;
}

export interface SideScores {
  logic: CriterionScore;
  evidence: CriterionScore;
  delivery: CriterionScore;
  rebuttal: CriterionScore;
}

export interface AIScoreResult {
  side_a: SideScores;
  side_b: SideScores;
  overall_winner: string;
  verdict: string;
}
