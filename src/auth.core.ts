/**
 * THE MODERATOR — Auth Core (module state, init, utilities)
 *
 * Contains: module-level state, ready promise, init,
 * observer pattern, placeholder mode, profile loading, getters.
 *
 * safeRpc   → auth.rpc.ts
 * requireAuth → auth.gate.ts
 *
 * LANDMINE [LM-AUTH-001] — _notify and module state access pattern
 * auth.ops.ts and auth.moderator.ts need to mutate currentProfile and call _notify.
 * They do this by importing getCurrentProfile() (returns the live object reference)
 * and mutating it directly — this works because JS objects are passed by reference.
 * _notify is exported from auth.core.ts for this purpose.
 * If auth state is ever refactored to immutable/frozen objects, this breaks silently.
 * Add to THE-MODERATOR-LAND-MINE-MAP.md when session allows.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { UUID_RE, SUPABASE_URL, SUPABASE_ANON_KEY, placeholderMode } from './config.ts';
import type { Profile, AuthListener } from './auth.types.ts';

// ============================================================
// MODULE STATE
// ============================================================

let supabaseClient: SupabaseClient | null = null;
let currentUser: User | null = null;
let currentProfile: Profile | null = null;
let currentSession: Session | null = null;
const listeners: AuthListener[] = [];
let isPlaceholderMode = true;

let _resolveReady: () => void;
const readyPromise = new Promise<void>(resolve => { _resolveReady = resolve; });

// ============================================================
// UUID VALIDATOR
// ============================================================

export function isUUID(s: unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s);
}

// ============================================================
// OBSERVER PATTERN
// ============================================================

export function onChange(fn: AuthListener): void {
  listeners.push(fn);
  if (currentUser || currentProfile) {
    try { fn(currentUser, currentProfile); } catch (e) { console.error('[auth] onChange immediate callback threw', e); }
  }
}

export function _notify(user: User | null, profile: Profile | null): void {
  listeners.forEach(fn => {
    try { fn(user, profile); } catch (e) { console.error('Auth listener error:', e); }
  });
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
    const { data, error } = await supabaseClient.rpc('get_own_profile');

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
        currentSession = session;
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
        currentSession = session;
        currentUser = session.user;
        setTimeout(() => void _loadProfile(session.user.id), 0);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        currentSession = session;
        currentUser = session.user;
      } else if (event === 'PASSWORD_RECOVERY' && session?.user) {
        currentSession = session;
        currentUser = session.user;
        _notify(currentUser, currentProfile);
      } else if (event === 'SIGNED_OUT') {
        currentSession = null;
        currentUser = null;
        currentProfile = null;
        _notify(null, null);
        // BUG-16 fix: redirect to login so user doesn't see broken null-profile app
        if (window.location.pathname.indexOf('moderator-plinko') === -1 &&
            window.location.pathname.indexOf('moderator-login') === -1 &&
            window.location.pathname.indexOf('challenge') === -1) {
          window.location.href = 'moderator-plinko.html';
        }
      }
    });
  } catch (e) {
    console.error('ModeratorAuth: Supabase init failed', e);
    _enterPlaceholderMode();
  }
}

// ============================================================
// PROFILE REFRESH (re-fetch from DB and notify all listeners)
// ============================================================

/**
 * Re-fetches the current user's profile from the database and
 * pushes the updated data to all onChange listeners (sidebar, etc.).
 * Call after any action that mutates profile-level stats:
 * debate completion, token spend/earn, ELO change, etc.
 */
export async function refreshProfile(): Promise<void> {
  if (!supabaseClient || !currentUser) return;
  try {
    const { data, error } = await supabaseClient.rpc('get_own_profile');
    if (error) throw error;
    currentProfile = data as Profile;
    _notify(currentUser, currentProfile);
  } catch (e) {
    console.error('[auth] refreshProfile failed:', e);
  }
}

// ============================================================
// GETTERS (matching the IIFE getter pattern)
// ============================================================

export function getCurrentUser(): User | null { return currentUser; }
export function getCurrentProfile(): Profile | null { return currentProfile; }
export function getIsPlaceholderMode(): boolean { return isPlaceholderMode; }
export function getSupabaseClient(): SupabaseClient | null { return supabaseClient; }
/** Returns the stored access_token from the last INITIAL_SESSION/SIGNED_IN event. */
export function getAccessToken(): string | null { return currentSession?.access_token ?? null; }

/** The ready promise — resolves when auth state is known (logged in or anonymous) */
export const ready: Promise<void> = readyPromise;

// ============================================================
// STATE MUTATORS (used by auth.ops.ts for logOut/deleteAccount)
// ============================================================

export function _clearAuthState(): void {
  currentUser = null;
  currentProfile = null;
}

export function _setCurrentUser(user: User | null): void {
  currentUser = user;
}

export function _setCurrentProfile(profile: Profile | null): void {
  currentProfile = profile;
}

// ============================================================
// AUTO-INIT (same pattern as .js IIFE)
// ============================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
