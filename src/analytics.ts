/**
 * THE MODERATOR — Funnel Analytics Module (TypeScript)
 *
 * Event firing layer: trackEvent, checkSignup, ModeratorAnalytics facade.
 * Utilities (visitor ID, traffic source, opt-out, key migration) live in
 * analytics.utils.ts.
 *
 * Uses raw fetch() — intentional, fires before auth init.
 *
 * Migration: Session 127 (Phase 3). Split: Session 254+
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
import type { TrafficSource, EventMetadata } from './analytics.utils';
import {
  migrateKeys,
  isOptedOut,
  setAnalyticsOptOut,
  getVisitorId,
  getTrafficSource,
  getUserId,
} from './analytics.utils';

// Re-export utilities so existing import paths continue to work
export type { TrafficSource, EventMetadata };
export { isOptedOut, setAnalyticsOptOut, getVisitorId, getTrafficSource, getUserId };

// ============================================================
// CORE: TRACK EVENT
// ============================================================

export function trackEvent(eventType: string, extra?: Record<string, unknown>): void {
  try {
    if (isOptedOut()) return;

    const vid = getVisitorId();
    const src = getTrafficSource();
    const userId = getUserId();

    const metadata: EventMetadata = {
      visitor_id: vid,
      page: location.pathname + location.search,
      referrer: src.referrer,
      utm_source: src.utm_source,
      utm_medium: src.utm_medium,
      utm_campaign: src.utm_campaign,
    };

    // Merge any extra fields
    if (extra && typeof extra === 'object') {
      for (const k of Object.keys(extra)) {
        metadata[k] = extra[k];
      }
    }

    const body: Record<string, unknown> = {
      p_event_type: eventType,
      p_metadata: metadata,
    };

    // Only include user_id if authenticated (UUID format required)
    if (userId) body['p_user_id'] = userId;

    fetch(SUPABASE_URL + '/rest/v1/rpc/log_event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    }).catch((e) => {
      console.warn('[Analytics] event send failed:', e);
    });
  } catch {
    // Never block the page. Never throw. Analytics is optional.
  }
}

// ============================================================
// SIGNUP DETECTION
// ============================================================

export function checkSignup(): void {
  try {
    if (isOptedOut()) return;

    migrateKeys();
    const userId = getUserId();
    const wasSeen = localStorage.getItem('mod_uid_seen');

    if (userId && !wasSeen) {
      localStorage.setItem('mod_uid_seen', userId);
      trackEvent('signup', { new_user: true });
    } else if (userId && wasSeen !== userId) {
      localStorage.setItem('mod_uid_seen', userId);
      trackEvent('signup', { new_user: true, switched: true });
    }
  } catch {
    /* swallow */
  }
}

// ============================================================
// WINDOW GLOBAL BRIDGE (removed in Phase 4)
// ============================================================

/** Analytics module export */
export const ModeratorAnalytics = {
  trackEvent,
  checkSignup,
  getVisitorId,
  getTrafficSource,
  getUserId,
  isOptedOut,
  setAnalyticsOptOut,
} as const;
