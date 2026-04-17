/**
 * THE MODERATOR — Authentication Orchestrator (TypeScript)
 *
 * Thin re-export surface. All logic lives in sub-modules:
 *   auth.types.ts      — type definitions (no runtime)
 *   auth.core.ts       — module state, init, getters, auto-init
 *   auth.rpc.ts        — safeRpc (401-recovery RPC wrapper)
 *   auth.gate.ts       — requireAuth (sign-up prompt modal)
 *   auth.ops.ts        — signUp, logIn, oauthLogin, logOut, resetPassword, updatePassword
 *   auth.follows.ts    — followUser, unfollowUser, getFollowers, getFollowing, getFollowCounts
 *   auth.rivals.ts     — declareRival, respondRival, getMyRivals
 *   auth.moderator.ts  — toggleModerator, toggleModAvailable, updateModCategories,
 *                         submitReference, ruleOnReference, scoreModerator,
 *                         assignModerator, getAvailableModerators, getDebateReferences
 *   auth.profile.ts    — updateProfile, deleteAccount, getPublicProfile, showUserProfile
 *
 * External importers continue to import from './auth.ts' with zero changes.
 */

// --- Core ---
export { isUUID, onChange, init,
         getCurrentUser, getCurrentProfile, getIsPlaceholderMode,
         getSupabaseClient, getAccessToken, ready } from './auth.core.ts';

// --- RPC wrapper ---
export { safeRpc } from './auth.rpc.ts';

// --- Auth gate ---
export { requireAuth } from './auth.gate.ts';

// --- Auth operations ---
export { signUp, logIn, oauthLogin, logOut,
         resetPassword, updatePassword } from './auth.ops.ts';

// --- Follows ---
export { followUser, unfollowUser, getFollowers,
         getFollowing, getFollowCounts } from './auth.follows.ts';

// --- Rivals ---
export { declareRival, respondRival, getMyRivals } from './auth.rivals.ts';

// --- Moderator ---
export { toggleModerator, toggleModAvailable, updateModCategories,
         submitReference, ruleOnReference, scoreModerator,
         assignModerator, getAvailableModerators,
         getDebateReferences } from './auth.moderator.ts';

// --- Profile ---
export { updateProfile, deleteAccount, getPublicProfile,
         showUserProfile } from './auth.profile.ts';

// --- Types ---
export type { SafeRpcResult, AuthResult, Profile, PublicProfile,
              FollowRow, ModeratorInfo, DebateReference, RivalData,
              ProfileUpdate, AuthListener, SignUpParams,
              LogInParams } from './auth.types.ts';

// ============================================================
// DEFAULT EXPORT (full auth object matching window.ModeratorAuth shape)
// ============================================================

import { getCurrentUser, getCurrentProfile, getIsPlaceholderMode, getSupabaseClient,
         ready, init, onChange } from './auth.core.ts';
import { safeRpc } from './auth.rpc.ts';
import { requireAuth } from './auth.gate.ts';
import { signUp, logIn, oauthLogin, logOut, resetPassword, updatePassword } from './auth.ops.ts';
import { followUser, unfollowUser, getFollowers, getFollowing, getFollowCounts } from './auth.follows.ts';
import { declareRival, respondRival, getMyRivals } from './auth.rivals.ts';
import { toggleModerator, toggleModAvailable, updateModCategories,
         submitReference, ruleOnReference, scoreModerator,
         assignModerator, getAvailableModerators, getDebateReferences } from './auth.moderator.ts';
import { updateProfile, deleteAccount, getPublicProfile, showUserProfile } from './auth.profile.ts';

const auth = {
  get currentUser() { return getCurrentUser(); },
  get currentProfile() { return getCurrentProfile(); },
  get isPlaceholderMode() { return getIsPlaceholderMode(); },
  get supabase() { return getSupabaseClient(); },
  ready,
  init,
  signUp,
  logIn,
  oauthLogin,
  logOut,
  resetPassword,
  updatePassword,
  updateProfile,
  deleteAccount,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowCounts,
  getPublicProfile,
  declareRival,
  respondRival,
  getMyRivals,
  showUserProfile,
  toggleModerator,
  toggleModAvailable,
  updateModCategories,
  submitReference,
  ruleOnReference,
  scoreModerator,
  assignModerator,
  getAvailableModerators,
  getDebateReferences,
  safeRpc,
  requireAuth,
  onChange,
} as const;

export default auth;
