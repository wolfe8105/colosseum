/**
 * THE MODERATOR — Auth Operations (sign up, log in, OAuth, log out, password)
 */

import { getSupabaseClient, getIsPlaceholderMode, getCurrentUser, getCurrentProfile, _notify, _clearAuthState } from './auth.core.ts';
import { APP } from './config.ts';
import type { AuthResult, SignUpParams, LogInParams } from './auth.types.ts';

export async function signUp({ email, password, username, displayName, dob }: SignUpParams): Promise<AuthResult> {
  if (getIsPlaceholderMode()) return { success: true, placeholder: true };

  if (!email || !password) {
    return { success: false, error: 'Email and password are required. Please start over.' };
  }

  try {
    const redirectTo = APP.baseUrl + '/moderator-login.html';

    const { data, error } = await getSupabaseClient()!.auth.signUp({
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
  if (getIsPlaceholderMode()) return { success: true, placeholder: true };

  try {
    const { data, error } = await getSupabaseClient()!.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { success: true, user: data.user, session: data.session };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function oauthLogin(provider: 'google' | 'apple' | string, redirectTo?: string): Promise<AuthResult> {
  if (getIsPlaceholderMode()) return { success: true, placeholder: true };

  try {
    const { data, error } = await getSupabaseClient()!.auth.signInWithOAuth({
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
  if (getIsPlaceholderMode()) return { success: true };

  const notif = (window as { ColosseumNotifications?: { destroy?: () => void } }).ColosseumNotifications;
  notif?.destroy?.();

  try {
    await Promise.race([
      getSupabaseClient()!.auth.signOut(),
      new Promise<void>(resolve => setTimeout(() => {
        console.warn('ModeratorAuth: signOut timed out after 3s — forcing local cleanup');
        resolve();
      }, 3000)),
    ]);
  } catch (e) {
    console.error('ModeratorAuth: signOut error (continuing anyway)', e);
  }

  _clearAuthState();
  _notify(null, null);
  return { success: true };
}

export async function resetPassword(email: string): Promise<AuthResult> {
  if (getIsPlaceholderMode()) return { success: true, placeholder: true };

  try {
    const { error } = await getSupabaseClient()!.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/moderator-login.html?reset=true`,
    });
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (getIsPlaceholderMode()) return { success: true, placeholder: true };

  try {
    const { error } = await getSupabaseClient()!.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
