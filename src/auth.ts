/**
 * THE MODERATOR — Authentication Module (TypeScript)
 *
 * Runtime module — replaces moderator-auth.js when Vite build is active.
 * Depends on: config.ts, @supabase/supabase-js (npm)
 *
 * Migration: Session 126 (Phase 1), Session 138 (cutover — npm import, zero globalThis reads)
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { escapeHTML, SUPABASE_URL, SUPABASE_ANON_KEY, placeholderMode, APP } from './config.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/** Supabase RPC result shape — matches what supabase.rpc() actually returns */
export interface SafeRpcResult<T = unknown> {
  data: T | null;
  error: { message: string; code?: string; status?: number } | null;
}

/** Auth operation result — success or failure with error message */
export interface AuthResult<T = Record<string, unknown>> {
  success: boolean;
  placeholder?: boolean;
  error?: string;
  user?: User;
  session?: Session | null;
  url?: string;
  data?: T;
  count?: number;
}

/** Profile row from the profiles table */
export interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  elo_rating: number;
  token_balance: number;
  level: number;
  xp: number;
  streak_freezes: number;
  questions_answered: number;
  wins: number;
  losses: number;
  draws: number;
  current_streak: number;
  debates_completed: number;
  subscription_tier: string;
  profile_depth_pct: number;
  trust_score: number;
  is_minor: boolean;
  is_moderator: boolean;
  mod_available: boolean;
  mod_rating: number;
  mod_debates_total: number;
  mod_rulings_total: number;
  mod_approval_pct: number;
  created_at: string;
  updated_at?: string;
  /** Profile may have additional columns not listed here */
  [key: string]: unknown;
}

/** Public profile returned by get_public_profile RPC */
export interface PublicProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  elo_rating: number;
  wins: number;
  losses: number;
  current_streak: number;
  level: number;
  debates_completed: number;
  followers: number;
  following: number;
  is_following: boolean;
  subscription_tier: string;
  created_at: string;
  error?: string;
}

/** Follow data row with joined profile */
export interface FollowRow {
  follower_id?: string;
  following_id?: string;
  profiles?: Array<{
    username: string | null;
    display_name: string | null;
    elo_rating: number;
  }>;
}

/** Moderator data for available moderators list */
export interface ModeratorInfo {
  id: string;
  display_name: string | null;
  mod_rating: number;
  mod_debates_total: number;
  mod_approval_pct: number;
}

/** Reference/evidence row */
export interface DebateReference {
  id: string;
  debate_id: string;
  content: string | null;
  reference_type: string | null;
  supports_side: string | null;
  ruling: string | null;
  [key: string]: unknown;
}

/** Rival data */
export interface RivalData {
  id: string;
  target_id: string;
  message: string | null;
  status: string;
  [key: string]: unknown;
}

/** Profile update fields — only safe client-writable fields */
export interface ProfileUpdate {
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  username?: string | null;
}

/** Auth state change listener */
export type AuthListener = (user: User | null, profile: Profile | null) => void;

/** Sign-up parameters */
export interface SignUpParams {
  email: string;
  password: string;
  username: string;
  displayName: string;
  dob: string;
}

/** Log-in parameters */
export interface LogInParams {
  email: string;
  password: string;
}

// ============================================================
// UUID VALIDATOR
// ============================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUUID(s: unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s);
}

// ============================================================
// MODULE STATE
// ============================================================

let supabaseClient: SupabaseClient | null = null;
let currentUser: User | null = null;
let currentProfile: Profile | null = null;
let listeners: AuthListener[] = [];
let isPlaceholderMode = true;

let _resolveReady: () => void;
const readyPromise = new Promise<void>(resolve => { _resolveReady = resolve; });

// ============================================================
// SHARED ESCAPE HELPER
// ============================================================

/** Falls back to inline escape if config not loaded yet */
function esc(s: string | null | undefined): string {
  // During migration, reference the typed escapeHTML from config.ts
  return escapeHTML(s);
}

// ============================================================
// OBSERVER PATTERN
// ============================================================

export function onChange(fn: AuthListener): void {
  listeners.push(fn);
  if (currentUser || currentProfile) fn(currentUser, currentProfile);
}

function _notify(user: User | null, profile: Profile | null): void {
  listeners.forEach(fn => {
    try { fn(user, profile); } catch (e) { console.error('Auth listener error:', e); }
  });
}

// ============================================================
// safeRpc — THE CRITICAL FUNCTION
// ============================================================

/**
 * Wrapper around supabase.rpc() with 401 recovery.
 * On 401/PGRST301: refreshes session once, retries the call.
 * On refresh failure: triggers sign-out.
 *
 * THIS IS THE ENTRY POINT FOR ALL FRONTEND RPC CALLS.
 * Every module must use this (via ModeratorAuth.safeRpc) — never bare supabase.rpc().
 *
 * Usage: const { data, error } = await safeRpc('fn_name', { p_param: value });
 */
export async function safeRpc<T = unknown>(
  fnName: string,
  args: Record<string, unknown> = {}
): Promise<SafeRpcResult<T>> {
  if (!supabaseClient) {
    return { data: null, error: { message: 'Supabase not initialized' } };
  }

  const attempt = async (): Promise<SafeRpcResult<T>> =>
    supabaseClient!.rpc(fnName, args) as unknown as Promise<SafeRpcResult<T>>;

  let result = await attempt();

  // 401 or JWT-expired error codes
  const is401 = result.error != null && (
    (result.error as { status?: number }).status === 401 ||
    result.error.code === 'PGRST301' ||
    (result.error.message ?? '').toLowerCase().includes('jwt expired')
  );

  if (is401) {
    console.warn('safeRpc: 401 on', fnName, '— attempting token refresh');
    const { error: refreshError } = await supabaseClient.auth.refreshSession();
    if (refreshError) {
      console.error('safeRpc: refresh failed, signing out', refreshError);
      void supabaseClient.auth.signOut();
      return { data: null, error: { message: refreshError.message } };
    }
    result = await attempt();
  }

  return result;
}

// ============================================================
// PLACEHOLDER MODE
// ============================================================

function _enterPlaceholderMode(): void {
  isPlaceholderMode = true;
  currentUser = { id: 'placeholder-user', email: 'gladiator@moderator.app' } as User;
  currentProfile = {
    id: 'placeholder-user',
    username: 'gladiator',
    display_name: 'Gladiator',
    elo_rating: 1200,
    wins: 0,
    losses: 0,
    current_streak: 0,
    level: 1,
    xp: 0,
    debates_completed: 0,
    token_balance: 50,
    subscription_tier: 'free',
    profile_depth_pct: 0,
    trust_score: 50,
    is_minor: false,
    avatar_url: null,
    bio: '',
    is_moderator: false,
    mod_available: false,
    mod_rating: 50,
    mod_debates_total: 0,
    mod_rulings_total: 0,
    mod_approval_pct: 0,
    created_at: new Date().toISOString(),
    draws: 0,
    streak_freezes: 0,
    questions_answered: 0,
  };
  _notify(currentUser, currentProfile);
  _resolveReady();
}

// ============================================================
// PROFILE LOADING
// ============================================================

async function _loadProfile(userId: string): Promise<void> {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    currentProfile = data as Profile;
    _notify(currentUser, currentProfile);
  } catch (e) {
    console.error('ModeratorAuth: load profile failed', e);
  }
}

// ============================================================
// INIT
// ============================================================

/**
 * Initialize auth system. Called automatically on DOMContentLoaded.
 * Uses INITIAL_SESSION as sole init path. noOpLock bypasses navigator.locks.
 */
export function init(): void {
  // Config is always available via ES import — no globalThis check needed

  if (placeholderMode.supabase) {
    console.warn('ModeratorAuth: Supabase credentials missing, placeholder mode');
    _enterPlaceholderMode();
    return;
  }

  try {
    // noOpLock bypasses navigator.locks (GitHub issue supabase-js#1594)
    const noOpLock = async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>): Promise<unknown> => {
      return await fn();
    };

    supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      { auth: { lock: noOpLock } } as any
    );
    isPlaceholderMode = false;

    // Safety timeout — if INITIAL_SESSION never fires, resolve ready as guest
    const safetyTimeout = setTimeout(() => {
      if (!currentUser && !currentProfile) {
        console.warn('ModeratorAuth: INITIAL_SESSION never fired after 5s — continuing as guest');
        _resolveReady();
      }
    }, 5000);

    // SOLE init mechanism — INITIAL_SESSION fires once after session loaded from localStorage
    // CRITICAL: No await inside callback, no other Supabase calls in callback
    supabaseClient.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'INITIAL_SESSION') {
        clearTimeout(safetyTimeout);
        if (session?.user) {
          currentUser = session.user;
          setTimeout(() => {
            _loadProfile(session.user.id)
              .then(() => _resolveReady())
              .catch(e => { console.error('ModeratorAuth: profile load failed', e); _resolveReady(); });
          }, 0);
        } else {
          _resolveReady();
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        currentUser = session.user;
        setTimeout(() => void _loadProfile(session.user.id), 0);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        currentUser = session.user;
      } else if (event === 'PASSWORD_RECOVERY' && session?.user) {
        currentUser = session.user;
        _notify(currentUser, currentProfile);
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        currentProfile = null;
        _notify(null, null);
      }
    });
  } catch (e) {
    console.error('ModeratorAuth: Supabase init failed', e);
    _enterPlaceholderMode();
  }
}

// ============================================================
// AUTH OPERATIONS
// ============================================================

export async function signUp({ email, password, username, displayName, dob }: SignUpParams): Promise<AuthResult> {
  if (isPlaceholderMode) return { success: true, placeholder: true };

  try {
    const redirectTo = APP.baseUrl + '/moderator-login.html';

    const { data, error } = await supabaseClient!.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { username, display_name: displayName, date_of_birth: dob },
      },
    });
    if (error) throw error;
    return { success: true, user: data.user ?? undefined, session: data.session };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function logIn({ email, password }: LogInParams): Promise<AuthResult> {
  if (isPlaceholderMode) return { success: true, placeholder: true };

  try {
    const { data, error } = await supabaseClient!.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { success: true, user: data.user, session: data.session };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function oauthLogin(provider: 'google' | 'apple' | string, redirectTo?: string): Promise<AuthResult> {
  if (isPlaceholderMode) return { success: true, placeholder: true };

  try {
    const { data, error } = await supabaseClient!.auth.signInWithOAuth({
      provider: provider as 'google',
      options: { redirectTo: redirectTo ?? window.location.href },
    });
    if (error) throw error;
    return { success: true, url: data.url };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function logOut(): Promise<AuthResult> {
  if (isPlaceholderMode) return { success: true };

  try {
    await Promise.race([
      supabaseClient!.auth.signOut(),
      new Promise<void>(resolve => setTimeout(() => {
        console.warn('ModeratorAuth: signOut timed out after 3s — forcing local cleanup');
        resolve();
      }, 3000)),
    ]);
  } catch (e) {
    console.error('ModeratorAuth: signOut error (continuing anyway)', e);
  }

  currentUser = null;
  currentProfile = null;
  _notify(null, null);
  return { success: true };
}

export async function resetPassword(email: string): Promise<AuthResult> {
  if (isPlaceholderMode) return { success: true, placeholder: true };

  try {
    const { error } = await supabaseClient!.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/moderator-login.html?reset=true`,
    });
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (isPlaceholderMode) return { success: true, placeholder: true };

  try {
    const { error } = await supabaseClient!.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// PROFILE CRUD
// ============================================================

export async function updateProfile(updates: ProfileUpdate): Promise<AuthResult> {
  if (isPlaceholderMode) {
    Object.assign(currentProfile!, updates);
    _notify(currentUser, currentProfile);
    return { success: true };
  }

  try {
    const { error } = await safeRpc('update_profile', {
      p_display_name: updates.display_name !== undefined ? updates.display_name : null,
      p_avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : null,
      p_bio: updates.bio !== undefined ? updates.bio : null,
      p_username: updates.username !== undefined ? updates.username : null,
    });
    if (error) throw error;

    const safeFields: (keyof ProfileUpdate)[] = ['display_name', 'avatar_url', 'bio', 'username'];
    safeFields.forEach(f => {
      if (updates[f] !== undefined && currentProfile) {
        (currentProfile as Record<string, unknown>)[f] = updates[f];
      }
    });
    _notify(currentUser, currentProfile);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteAccount(): Promise<AuthResult> {
  if (isPlaceholderMode) return { success: true };

  try {
    const { error } = await safeRpc('soft_delete_account', {});
    if (error) throw error;

    currentUser = null;
    currentProfile = null;
    _notify(null, null);

    try { await supabaseClient!.auth.signOut(); } catch { /* best-effort */ }

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// FOLLOW SYSTEM
// ============================================================

export async function followUser(targetUserId: string): Promise<AuthResult> {
  if (!isUUID(targetUserId)) return { success: false, error: 'Invalid user ID' };
  if (isPlaceholderMode) return { success: true };

  try {
    const { error } = await safeRpc('follow_user', { p_target_user_id: targetUserId });
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function unfollowUser(targetUserId: string): Promise<AuthResult> {
  if (!isUUID(targetUserId)) return { success: false, error: 'Invalid user ID' };
  if (isPlaceholderMode) return { success: true };

  try {
    const { error } = await safeRpc('unfollow_user', { p_target_user_id: targetUserId });
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getFollowers(userId: string): Promise<AuthResult<FollowRow[]>> {
  if (isPlaceholderMode) return { success: true, data: [], count: 0 };
  try {
    const { data, count, error } = await supabaseClient!
      .from('follows')
      .select('follower_id, profiles!follows_follower_id_fkey(username, display_name, elo_rating)', { count: 'exact' })
      .eq('following_id', userId);
    if (error) throw error;
    return { success: true, data: data as FollowRow[], count: count ?? 0 };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: [], count: 0 };
  }
}

export async function getFollowing(userId: string): Promise<AuthResult<FollowRow[]>> {
  if (isPlaceholderMode) return { success: true, data: [], count: 0 };
  try {
    const { data, count, error } = await supabaseClient!
      .from('follows')
      .select('following_id, profiles!follows_following_id_fkey(username, display_name, elo_rating)', { count: 'exact' })
      .eq('follower_id', userId);
    if (error) throw error;
    return { success: true, data: data as FollowRow[], count: count ?? 0 };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: [], count: 0 };
  }
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  if (isPlaceholderMode) return { followers: 0, following: 0 };
  try {
    const { data, error } = await safeRpc<{ followers: number; following: number }>('get_follow_counts', { p_user_id: userId });
    if (error) throw error;
    return data ?? { followers: 0, following: 0 };
  } catch (e) {
    console.error('getFollowCounts error:', e);
    return { followers: 0, following: 0 };
  }
}

// ============================================================
// PUBLIC PROFILE
// ============================================================

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  if (!isUUID(userId)) return null;
  if (isPlaceholderMode) {
    return {
      id: userId, username: 'gladiator', display_name: 'Gladiator',
      avatar_url: null, bio: 'Placeholder profile',
      elo_rating: 1200, wins: 5, losses: 3, current_streak: 2,
      level: 3, debates_completed: 8,
      followers: 12, following: 8, is_following: false,
      subscription_tier: 'free', created_at: new Date().toISOString(),
    };
  }
  try {
    const { data, error } = await safeRpc<PublicProfile>('get_public_profile', { p_user_id: userId });
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('getPublicProfile error:', e);
    return null;
  }
}

// ============================================================
// RIVALS
// ============================================================

export async function declareRival(targetId: string, message?: string): Promise<AuthResult & { error?: string }> {
  if (!isUUID(targetId)) return { success: false, error: 'Invalid user ID' };
  if (isPlaceholderMode) return { success: true };
  try {
    const { data, error } = await safeRpc<AuthResult>('declare_rival', {
      p_target_id: targetId,
      p_message: message ?? null,
    });
    if (error) throw error;
    return data ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function respondRival(rivalId: string, accept: boolean): Promise<AuthResult> {
  if (isPlaceholderMode) return { success: true };
  try {
    const { data, error } = await safeRpc<AuthResult>('respond_rival', {
      p_rival_id: rivalId,
      p_accept: accept,
    });
    if (error) throw error;
    return data ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getMyRivals(): Promise<RivalData[]> {
  if (isPlaceholderMode) return [];
  try {
    const { data, error } = await safeRpc<RivalData[]>('get_my_rivals');
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error('getMyRivals error:', e);
    return [];
  }
}

// ============================================================
// USER PROFILE MODAL (DOM)
// ============================================================

/**
 * Opens a bottom-sheet modal showing another user's profile.
 * Contains follow/rival buttons with auth gates.
 */
export async function showUserProfile(userId: string): Promise<void> {
  if (!userId || !isUUID(userId) || userId === currentUser?.id) return;

  document.getElementById('user-profile-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'user-profile-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:var(--mod-bg-overlay);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';
  modal.innerHTML = `
    <div style="background:linear-gradient(180deg,#132240 0%,var(--mod-bg-base) 100%);border-top-left-radius:20px;border-top-right-radius:20px;width:100%;max-width:480px;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));">
      <div style="width:40px;height:4px;background:var(--mod-bg-elevated);border-radius:2px;margin:0 auto 20px;"></div>
      <div style="text-align:center;color:#6a7a90;font-size:13px;">Loading profile...</div>
    </div>`;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);

  const profile = await getPublicProfile(userId);
  if (!profile || profile.error) {
    const container = modal.querySelector('div > div:last-child');
    if (container) container.innerHTML = '<div style="text-align:center;color:var(--mod-magenta);font-size:14px;">User not found</div>';
    return;
  }

  // Emoji avatar support (Session 113)
  const avatarUrl = profile.avatar_url ?? '';
  const emojiAvatar = avatarUrl.startsWith('emoji:') ? esc(avatarUrl.slice(6)) : null;
  const initial = emojiAvatar ?? esc((profile.display_name ?? profile.username ?? '?')[0]?.toUpperCase());
  const avatarFontSize = emojiAvatar ? '32px' : '24px';
  const tierLabels: Record<string, string> = { free: 'FREE', contender: 'CONTENDER', champion: 'CHAMPION', creator: 'CREATOR' };
  const tierLabel = tierLabels[profile.subscription_tier] ?? 'FREE';
  const safeName = esc((profile.display_name ?? profile.username ?? 'UNKNOWN')).toUpperCase();
  const safeBio = profile.bio ? esc(profile.bio) : '';

  const lastChild = modal.querySelector('div > div:last-child');
  if (lastChild) lastChild.remove();

  const modalInner = modal.querySelector('div');
  if (!modalInner) return;

  modalInner.innerHTML += `
    <div style="text-align:center;margin-bottom:16px;">
      <div style="width:64px;height:64px;border-radius:50%;border:3px solid var(--mod-accent);background:rgb(10,17,40);color:var(--mod-accent);font-family:var(--mod-font-display);font-size:${avatarFontSize};font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;">${initial}</div>
      <div style="font-family:var(--mod-font-display);font-size:18px;letter-spacing:2px;color:var(--mod-text-heading);">${safeName}</div>
      <div style="font-size:11px;color:var(--mod-accent);letter-spacing:2px;margin-top:4px;">${tierLabel}</div>
      ${safeBio ? `<div style="font-size:13px;color:var(--mod-text-sub);margin-top:8px;line-height:1.4;">${safeBio}</div>` : ''}
      ${profile.username ? `<a href="/u/${encodeURIComponent(profile.username)}" style="display:inline-block;margin-top:8px;font-size:12px;color:var(--mod-accent);text-decoration:none;">View full profile →</a>` : ''}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;">
      <div style="flex:1;text-align:center;background:rgb(10,17,40);border:1px solid var(--mod-border-primary);border-radius:10px;padding:10px 4px;">
        <div style="font-family:var(--mod-font-display);font-size:18px;color:var(--mod-accent);">${Number(profile.elo_rating) || 1200}</div>
        <div style="font-size:10px;color:var(--mod-text-sub);letter-spacing:1px;">ELO</div>
      </div>
      <div style="flex:1;text-align:center;background:rgb(10,17,40);border:1px solid var(--mod-border-primary);border-radius:10px;padding:10px 4px;">
        <div style="font-family:var(--mod-font-display);font-size:18px;color:var(--mod-text-heading);">${Number(profile.wins) || 0}-${Number(profile.losses) || 0}</div>
        <div style="font-size:10px;color:var(--mod-text-sub);letter-spacing:1px;">W-L</div>
      </div>
      <div style="flex:1;text-align:center;background:rgb(10,17,40);border:1px solid var(--mod-border-primary);border-radius:10px;padding:10px 4px;">
        <div style="font-family:var(--mod-font-display);font-size:18px;color:var(--mod-text-heading);">${Number(profile.followers) || 0}</div>
        <div style="font-size:10px;color:var(--mod-text-sub);letter-spacing:1px;">FOLLOWERS</div>
      </div>
      <div style="flex:1;text-align:center;background:rgb(10,17,40);border:1px solid var(--mod-border-primary);border-radius:10px;padding:10px 4px;">
        <div style="font-family:var(--mod-font-display);font-size:18px;color:var(--mod-text-heading);">${Number(profile.following) || 0}</div>
        <div style="font-size:10px;color:var(--mod-text-sub);letter-spacing:1px;">FOLLOWING</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;">
      <button id="upm-follow-btn" style="flex:1;padding:12px;border-radius:10px;font-family:var(--mod-font-display);font-size:14px;letter-spacing:2px;cursor:pointer;border:none;${profile.is_following ? 'background:var(--mod-bg-control);color:var(--mod-text-sub);border:1px solid var(--mod-border-primary);' : 'background:var(--mod-accent);color:var(--mod-bg-base);'}">${profile.is_following ? 'FOLLOWING' : 'FOLLOW'}</button>
      <button id="upm-rival-btn" style="flex:1;padding:12px;background:var(--mod-accent-muted);color:var(--mod-magenta);border:1px solid rgba(204,41,54,0.3);border-radius:10px;font-family:var(--mod-font-display);font-size:14px;letter-spacing:2px;cursor:pointer;">⚔️ RIVAL</button>
      <button style="padding:12px 16px;background:var(--mod-bg-subtle);color:var(--mod-text-sub);border:1px solid var(--mod-border-primary);border-radius:10px;font-size:14px;cursor:pointer;" onclick="document.getElementById('user-profile-modal')?.remove()">✕</button>
    </div>`;

  // Follow button handler
  const followBtn = document.getElementById('upm-follow-btn');
  let isFollowing = profile.is_following;
  followBtn?.addEventListener('click', async () => {
    if (!requireAuth('follow users')) return;
    if (followBtn) followBtn.style.opacity = '0.5';
    if (isFollowing) {
      const result = await unfollowUser(userId);
      if (result.success && followBtn) {
        isFollowing = false;
        followBtn.textContent = 'FOLLOW';
        followBtn.style.background = 'var(--mod-accent)';
        followBtn.style.color = 'var(--mod-bg-base)';
      }
    } else {
      const result = await followUser(userId);
      if (result.success && followBtn) {
        isFollowing = true;
        followBtn.textContent = 'FOLLOWING';
        followBtn.style.background = 'var(--mod-bg-control)';
        followBtn.style.color = 'var(--mod-text-sub)';
      }
    }
    if (followBtn) followBtn.style.opacity = '1';
  });

  // Rival button handler
  const rivalBtn = document.getElementById('upm-rival-btn');
  rivalBtn?.addEventListener('click', async () => {
    if (!requireAuth('declare rivals')) return;
    if (rivalBtn) {
      rivalBtn.style.opacity = '0.5';
      rivalBtn.textContent = '⏳';
    }
    const result = await declareRival(userId);
    if (result.success && rivalBtn) {
      rivalBtn.textContent = '⚔️ SENT';
      rivalBtn.style.background = 'var(--mod-magenta-glow)';
      (rivalBtn as HTMLButtonElement).disabled = true;
    } else if (rivalBtn) {
      console.error('declareRival failed:', result.error);
      rivalBtn.textContent = 'Try again';
      setTimeout(() => { if (rivalBtn) rivalBtn.textContent = '⚔️ RIVAL'; }, 2000);
    }
    if (rivalBtn) rivalBtn.style.opacity = '1';
  });
}

// ============================================================
// MODERATOR FUNCTIONS
// ============================================================

export async function toggleModerator(enabled: boolean): Promise<AuthResult> {
  if (isPlaceholderMode) {
    if (currentProfile) {
      currentProfile.is_moderator = enabled;
      if (!enabled) currentProfile.mod_available = false;
    }
    _notify(currentUser, currentProfile);
    return { success: true };
  }
  try {
    const { data, error } = await safeRpc('toggle_moderator_status', { p_enabled: enabled });
    if (error) throw error;
    if (currentProfile) {
      currentProfile.is_moderator = enabled;
      if (!enabled) currentProfile.mod_available = false;
    }
    _notify(currentUser, currentProfile);
    return (data as AuthResult) ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function toggleModAvailable(available: boolean): Promise<AuthResult> {
  if (isPlaceholderMode) {
    if (currentProfile) currentProfile.mod_available = available;
    _notify(currentUser, currentProfile);
    return { success: true };
  }
  try {
    const { data, error } = await safeRpc('toggle_mod_available', { p_available: available });
    if (error) throw error;
    if (currentProfile) currentProfile.mod_available = available;
    _notify(currentUser, currentProfile);
    return (data as AuthResult) ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateModCategories(categories: string[]): Promise<AuthResult> {
  if (isPlaceholderMode) {
    if (currentProfile) (currentProfile as Record<string, unknown>).mod_categories = categories;
    _notify(currentUser, currentProfile);
    return { success: true };
  }
  try {
    const { data, error } = await safeRpc('update_mod_categories', { p_categories: categories });
    if (error) throw error;
    if (currentProfile) (currentProfile as Record<string, unknown>).mod_categories = categories;
    _notify(currentUser, currentProfile);
    return (data as AuthResult) ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function submitReference(
  debateId: string,
  url: string | null,
  description: string | null,
  _supportsSide?: string
): Promise<AuthResult & { reference_id?: string }> {
  if (isPlaceholderMode) return { success: true, reference_id: 'placeholder-ref-' + Date.now() };
  // SESSION 134: Validate URL protocol to prevent stored XSS via javascript:/data: URLs
  if (url && !/^https?:\/\//i.test(url)) {
    return { success: false, error: 'Invalid URL — must start with http:// or https://' };
  }
  try {
    const { data, error } = await safeRpc('submit_reference', {
      p_debate_id: debateId,
      p_content: url ?? null,
      p_reference_type: description ?? null,
    });
    if (error) throw error;
    return (data as AuthResult & { reference_id?: string }) ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function ruleOnReference(
  referenceId: string,
  ruling: string,
  reason: string | null,
  ruledByType?: string
): Promise<AuthResult> {
  if (isPlaceholderMode) return { success: true };
  try {
    const { data, error } = await safeRpc('rule_on_reference', {
      p_reference_id: referenceId,
      p_ruling: ruling,
      p_reason: reason ?? null,
      p_ruled_by_type: ruledByType ?? 'human',
    });
    if (error) throw error;
    return (data as AuthResult) ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function scoreModerator(debateId: string, score: number): Promise<AuthResult> {
  if (isPlaceholderMode) return { success: true };
  try {
    const { data, error } = await safeRpc('score_moderator', {
      p_debate_id: debateId,
      p_score: score,
    });
    if (error) throw error;
    return (data as AuthResult) ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function assignModerator(
  debateId: string,
  moderatorId: string | null,
  moderatorType?: string
): Promise<AuthResult & { moderator_type?: string }> {
  if (moderatorId && !isUUID(moderatorId)) return { success: false, error: 'Invalid moderator ID' };
  if (isPlaceholderMode) return { success: true, moderator_type: moderatorType ?? 'ai' };
  try {
    const { data, error } = await safeRpc('assign_moderator', {
      p_debate_id: debateId,
      p_moderator_id: moderatorId ?? null,
      p_moderator_type: moderatorType ?? 'human',
    });
    if (error) throw error;
    return (data as AuthResult & { moderator_type?: string }) ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getAvailableModerators(excludeIds?: string[]): Promise<ModeratorInfo[]> {
  if (isPlaceholderMode) return [
    { id: 'mod-1', display_name: 'FairJudge', mod_rating: 82, mod_debates_total: 15, mod_approval_pct: 78 },
    { id: 'mod-2', display_name: 'NeutralMod', mod_rating: 71, mod_debates_total: 8, mod_approval_pct: 65 },
  ];
  try {
    const { data, error } = await safeRpc<ModeratorInfo[]>('get_available_moderators', {
      p_exclude_ids: excludeIds ?? [],
    });
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error('getAvailableModerators error:', e);
    return [];
  }
}

export async function getDebateReferences(debateId: string): Promise<DebateReference[]> {
  if (isPlaceholderMode) return [];
  try {
    const { data, error } = await safeRpc<DebateReference[]>('get_debate_references', {
      p_debate_id: debateId,
    });
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error('getDebateReferences error:', e);
    return [];
  }
}

// ============================================================
// AUTH GATE
// ============================================================

/**
 * Returns true if logged in. If not, shows a sign-up prompt modal and returns false.
 * actionLabel is escaped before innerHTML injection (XSS fix, Session 64).
 */
export function requireAuth(actionLabel?: string): boolean {
  if (currentUser && !isPlaceholderMode) return true;

  document.getElementById('auth-gate-modal')?.remove();

  const safeLabel = esc(actionLabel ?? 'do that');
  const modal = document.createElement('div');
  modal.id = 'auth-gate-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:var(--mod-bg-overlay);z-index:10000;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
  modal.innerHTML = `
    <div style="background:#12122A;border:1px solid var(--mod-accent-border);border-radius:12px;padding:28px 24px;max-width:340px;width:90%;text-align:center;">
      <div style="font-size:32px;margin-bottom:12px;">⚔️</div>
      <div style="font-family:var(--mod-font-display);font-size:20px;font-weight:700;color:var(--mod-accent);margin-bottom:8px;">JOIN THE ARENA</div>
      <div style="font-size:14px;color:#ccc;margin-bottom:20px;">Sign in to ${safeLabel}</div>
      <a href="moderator-plinko.html?returnTo=${returnTo}" style="display:block;background:var(--mod-accent);color:var(--mod-bg-base);font-family:var(--mod-font-display);font-weight:700;font-size:16px;padding:12px;border-radius:8px;text-decoration:none;margin-bottom:10px;">SIGN UP FREE</a>
      <a href="moderator-login.html?returnTo=${returnTo}" style="display:block;color:var(--mod-accent);font-size:14px;text-decoration:none;">Already have an account? Log in</a>
      <button onclick="this.closest('#auth-gate-modal').remove()" style="margin-top:14px;background:none;border:none;color:#666;font-size:13px;cursor:pointer;">Maybe later</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  return false;
}

// ============================================================
// GETTERS (matching the IIFE getter pattern)
// ============================================================

export function getCurrentUser(): User | null { return currentUser; }
export function getCurrentProfile(): Profile | null { return currentProfile; }
export function getIsPlaceholderMode(): boolean { return isPlaceholderMode; }
export function getSupabaseClient(): SupabaseClient | null { return supabaseClient; }

/** The ready promise — resolves when auth state is known (logged in or anonymous) */
export const ready: Promise<void> = readyPromise;

// ============================================================
// DEFAULT EXPORT (full auth object matching window.ModeratorAuth shape)
// ============================================================

const auth = {
  get currentUser() { return currentUser; },
  get currentProfile() { return currentProfile; },
  get isPlaceholderMode() { return isPlaceholderMode; },
  get supabase() { return supabaseClient; },
  ready: readyPromise,
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

// ============================================================

// ============================================================
// AUTO-INIT (same pattern as .js IIFE)
// ============================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
