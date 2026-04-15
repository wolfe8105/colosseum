/**
 * Arena Types — Core
 */

import type { SettleResult } from '../staking.ts';

// LANDMINE [LM-TYPES-001]: DebateStatus includes both 'completed' and 'complete'.
// These look like the same state with two spellings. One is probably legacy from
// the DB, one is post-migration. Verify before cleanup.

export type ArenaView = 'lobby' | 'modeSelect' | 'queue' | 'matchFound' | 'room' | 'preDebate' | 'postDebate' | 'privateLobbyWaiting' | 'modQueue' | 'modDebatePicker' | 'modDebateWaiting';
export type DebateMode = 'live' | 'voicememo' | 'text' | 'ai';
export type DebateStatus = 'pending' | 'lobby' | 'matched' | 'live' | 'completed' | 'complete'; // LANDMINE [LM-TYPES-001]
export type DebateRole = 'a' | 'b';

export interface ModeInfo {
  readonly id: DebateMode;
  readonly icon: string;
  readonly name: string;
  readonly desc: string;
  readonly available: string;
  readonly color: string;
}

export interface DebateMessage {
  role: 'user' | 'assistant';
  text: string;
  round: number;
}

export interface CurrentDebate {
  id: string;
  topic: string;
  role: DebateRole;
  mode: DebateMode;
  round: number;
  totalRounds: number;
  opponentName: string;
  opponentId?: string | null;
  opponentElo: number | string;
  ranked: boolean;
  messages: DebateMessage[];
  moderatorType?: string | null;
  moderatorId?: string | null;
  moderatorName?: string | null;
  _stakingResult?: SettleResult | null;
  debater_a?: string;
  debater_b?: string;
  modView?: boolean;
  debaterAName?: string;
  debaterBName?: string;
  ruleset?: 'amplified' | 'unplugged';
  spectatorView?: boolean;
  concededBy?: 'a' | 'b' | null;
  _nulled?: boolean;
  _nullReason?: string;
  language?: string;
  tournament_match_id?: string | null;
}

export interface SelectedModerator {
  type: 'human' | 'ai';
  id: string | null;
  name: string;
}
