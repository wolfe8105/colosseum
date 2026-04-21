/**
 * depth-gate.ts — F-63 Spectator participation depth gate
 *
 * Shared utility: checks profile_depth_pct >= 25 before allowing
 * spectator actions (tip, stake, chat). Shows confirm dialog
 * and redirects to profile-depth page if under threshold.
 *
 * Returns true if BLOCKED (caller should abort).
 * Returns false if PASSED (caller can proceed).
 */

import { getCurrentProfile, getCurrentUser } from './auth.ts';

const DEPTH_THRESHOLD = 25;

/**
 * Check if the current user is below the 25% depth threshold.
 *
 * @returns true if the user is BLOCKED and should not proceed.
 *          false if the user passes (or is not logged in — let the
 *          RPC handle the auth error).
 */
export function isDepthBlocked(): boolean {
  const user = getCurrentUser();
  if (!user) return false; // Let auth error flow through RPC

  const profile = getCurrentProfile();
  const pct = Number(profile?.profile_depth_pct) || 0;

  if (pct >= DEPTH_THRESHOLD) return false;

  // Show prompt and redirect
  if (confirm(
    `This action requires at least ${DEPTH_THRESHOLD}% profile completion. ` +
    `Your profile is at ${pct}%. Go fill it out?`
  )) {
    window.location.href = 'moderator-profile-depth.html';
  }

  return true;
}
