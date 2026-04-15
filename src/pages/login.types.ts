/**
 * login.types.ts — Login page type definitions
 * Extracted from login.ts (Session 254 track).
 */

export interface RateLimitState {
  count: number;
  lastAttempt: number;
  lockedUntil: number;
}

export interface RateLimitCheck {
  allowed: boolean;
  message?: string;
}
