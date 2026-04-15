/**
 * arena-deepgram.types.ts — Deepgram type definitions
 * Extracted from arena-deepgram.ts (Session 254 track).
 */

export type TranscriptCallback = (text: string) => void;
export type StatusCallback = (status: DeepgramStatus) => void;
export type DeepgramStatus = 'connecting' | 'live' | 'paused' | 'stopped' | 'error';

export interface DeepgramResult {
  type: 'Results';
  is_final: boolean;
  speech_final: boolean;
  channel: {
    alternatives: Array<{
      transcript: string;
      confidence: number;
    }>;
  };
}
