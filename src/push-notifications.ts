/**
 * push-notifications.ts — OneSignal web push integration
 *
 * Initializes OneSignal after the user is authenticated.
 * Sets the external user ID (Supabase UUID) so push notifications
 * can be targeted per-user from the backend or Supabase Edge Functions.
 *
 * Pat: sign up at https://onesignal.com (free), create a Web app,
 * copy the App ID, and add it to Vercel env vars as VITE_ONESIGNAL_APP_ID.
 * That's all you need to do — everything else is wired here.
 */

import { getCurrentUser } from './auth.ts';

// OneSignal App ID — set VITE_ONESIGNAL_APP_ID in Vercel env vars
// Falls back to empty string which disables push gracefully
const ONESIGNAL_APP_ID = (import.meta as any).env?.VITE_ONESIGNAL_APP_ID ?? '';

declare global {
  interface Window {
    OneSignalDeferred: ((OneSignal: any) => void)[];
    OneSignal: any;
  }
}

let _initialized = false;

/**
 * Call this after the user has authenticated.
 * Safe to call multiple times — noops after first call.
 */
export async function initPushNotifications(): Promise<void> {
  if (_initialized) return;
  if (!ONESIGNAL_APP_ID) {
    console.warn('[Push] VITE_ONESIGNAL_APP_ID not set — push notifications disabled');
    return;
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    // Browser doesn't support push — not an error
    return;
  }

  _initialized = true;

  // OneSignal deferred init pattern
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      // Don't auto-prompt — we ask at the right moment (after user takes an action)
      autoRegister: false,
      notifyButton: { enable: false },
      // Use our existing service worker scope
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      serviceWorkerParam: { scope: '/' },
    });

    // Tag the user with their Supabase UUID so we can target them server-side
    const user = getCurrentUser();
    if (user?.id) {
      await OneSignal.login(user.id);
    }
  });
}

/**
 * Prompt the user to allow push notifications.
 * Call this at a high-engagement moment (e.g. after posting a debate,
 * after accepting a challenge) — not on cold app open.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !window.OneSignal) return false;
  try {
    await window.OneSignal.Notifications.requestPermission();
    return window.OneSignal.Notifications.permission;
  } catch {
    return false;
  }
}

/**
 * Returns true if the user has already granted push permission.
 */
export function hasPushPermission(): boolean {
  if (!window.OneSignal) return false;
  return window.OneSignal.Notifications.permission === true;
}

/**
 * Unsubscribe the user from push (e.g. on sign out).
 */
export async function disablePushNotifications(): Promise<void> {
  if (!window.OneSignal) return;
  try {
    await window.OneSignal.logout();
  } catch { /* silent */ }
}
