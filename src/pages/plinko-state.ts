/**
 * plinko-state.ts — Mutable module state for the plinko signup gate.
 * Follows the arena-state.ts setter pattern.
 */

export type SignupMethod = 'oauth' | 'email' | null;

export const TOTAL_STEPS = 5;

export let currentStep = 1;
export let signupMethod: SignupMethod = null;
export let signupEmail = '';
export let signupPassword = '';
export let signupDob = '';
// LANDMINE [LM-PLINKO-001]: isMinor is set by the step-2 age gate but never read anywhere
// in the codebase. Either dead state or an incomplete feature (minor-specific UX was planned
// but not wired). Verify before cleanup.
export let isMinor = false;

export function set_currentStep(v: number): void { currentStep = v; }
export function set_signupMethod(v: SignupMethod): void { signupMethod = v; }
export function set_signupEmail(v: string): void { signupEmail = v; }
export function set_signupPassword(v: string): void { signupPassword = v; }
export function set_signupDob(v: string): void { signupDob = v; }
export function set_isMinor(v: boolean): void { isMinor = v; }
