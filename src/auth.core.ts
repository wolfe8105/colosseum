/**
 * THE MODERATOR — Auth Core (module state, init, utilities)
 *
 * Contains: module-level state, ready promise, safeRpc, init, requireAuth,
 * observer pattern, placeholder mode, profile loading, getters.
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
import { escapeHTML, UUID_RE, SUPABASE_URL, SUPABASE_ANON_KEY, placeholderMode, APP, FEATURES } from './config.ts';
import type { Profile, AuthListener, SafeRpcResult } from './auth.types.ts';

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
  return escapeHTML(s);
}

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
    <div style="background:#12122A; /* TODO: needs CSS var token */ border:1px solid var(--mod-accent-border);border-radius:12px;padding:28px 24px;max-width:340px;width:90%;text-align:center;">
      <div style="font-size:32px;margin-bottom:12px;">⚔️</div>
      <div style="font-family:var(--mod-font-display);font-size:20px;font-weight:700;color:var(--mod-accent);margin-bottom:8px;">JOIN THE ARENA</div>
      <div style="font-size:14px;color:#ccc; /* TODO: needs CSS var token */ margin-bottom:20px;">Sign in to ${safeLabel}</div>
      <a href="moderator-plinko.html?returnTo=${returnTo}" style="display:block;background:var(--mod-accent);color:var(--mod-bg-base);font-family:var(--mod-font-display);font-weight:700;font-size:16px;padding:12px;border-radius:8px;text-decoration:none;margin-bottom:10px;">SIGN UP FREE</a>
      <a href="moderator-login.html?returnTo=${returnTo}" style="display:block;color:var(--mod-accent);font-size:14px;text-decoration:none;">Already have an account? Log in</a>
      <button id="auth-gate-close-btn" style="margin-top:14px;background:none;border:none;color:#666; /* TODO: needs CSS var token */ font-size:13px;cursor:pointer;">Maybe later</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('auth-gate-close-btn')?.addEventListener('click', () => {
    document.getElementById('auth-gate-modal')?.remove();
  });
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
