// ============================================================
// THE MODERATOR — AI GENERATOR TYPES
// ============================================================

export interface DebateTopic {
  title: string;
  sideA: string;
  sideB: string;
  description: string;
}

export interface AutoDebateSide {
  label: string;
  position: string;
}

export interface AutoDebateSetup {
  topic: string;
  sideA: AutoDebateSide;
  sideB: AutoDebateSide;
  description: string;
  controversialSide: 'a' | 'b';
  category: string;
}

export interface AutoDebateRoundResult {
  round: number;
  sideA: string;
  sideB: string;
}

export interface RoundScore {
  round: number;
  scoreA: number;
  scoreB: number;
}

export interface AutoDebateScoreResult {
  roundScores: RoundScore[];
  totalA: number;
  totalB: number;
  judgeTake: string;
}
