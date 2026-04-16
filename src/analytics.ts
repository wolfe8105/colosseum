/**
 * THE MODERATOR — Funnel Analytics Module (TypeScript)
 *
 * Typed mirror of moderator-analytics.js. Zero-dependency event tracker.
 * Works on any page. Generates visitor UUID in localStorage, fires events
 * via raw fetch to Supabase RPC. Never blocks the page. Swallows all errors.
 *
 * Source of truth for runtime: moderator-analytics.js (until Phase 4 cutover)
 * Source of truth for types: this file
 *
 * Migration: Session 127 (Phase 3)
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface TrafficSource {
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

export interface EventMetadata extends Record<string, unknown> {
  visitor_id: string;
  page: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

// ============================================================
// KEY MIGRATION (colo_ → mod_) + OPT-OUT
// ============================================================

const KEY_MIGRATIONS: [string, string][] = [
  ['colo_vid', 'mod_vid'],
  ['colo_src', 'mod_src'],
  ['colo_uid_seen', 'mod_uid_seen'],
];

let _migrated = false;
function migrateKeys(): void {
  if (_migrated) return;
  _migrated = true;
  try {
    for (const [oldKey, newKey] of KEY_MIGRATIONS) {
      const val = localStorage.getItem(oldKey);
      if (val && !localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, val);
      }
      if (val) localStorage.removeItem(oldKey);
    }
  } catch {
    /* swallow — private browsing or localStorage blocked */
  }
}

/** Returns true if user has opted out of analytics tracking. */
export function isOptedOut(): boolean {
  try {
    return localStorage.getItem('mod_analytics_opt_out') === '1';
  } catch {
    return false;
  }
}

/** Set analytics opt-out. Pass true to opt out, false to opt back in. */
export function setAnalyticsOptOut(optOut: boolean): void {
  try {
    if (optOut) {
      localStorage.setItem('mod_analytics_opt_out', '1');
    } else {
      localStorage.removeItem('mod_analytics_opt_out');
    }
  } catch {
    /* swallow */
  }
}

// ============================================================
// VISITOR ID
// ============================================================

export function getVisitorId(): string {
  try {
    migrateKeys();
    let id = localStorage.getItem('mod_vid');
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = Math.floor(Math.random() * 16);
              return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
            });
      localStorage.setItem('mod_vid', id);
    }
    return id;
  } catch {
    // Private browsing or localStorage blocked
    return 'ephemeral-' + Math.random().toString(36).slice(2);
  }
}

// ============================================================
// TRAFFIC SOURCE
// ============================================================

export function getTrafficSource(): TrafficSource {
  try {
    migrateKeys();
    const cached = localStorage.getItem('mod_src');
    if (cached) return JSON.parse(cached) as TrafficSource;

    const params = new URLSearchParams(location.search);
    const src: TrafficSource = {
      referrer: document.referrer || null,
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null,
    };
    localStorage.setItem('mod_src', JSON.stringify(src));
    return src;
  } catch {
    return { referrer: document.referrer || null, utm_source: null, utm_medium: null, utm_campaign: null };
  }
}

// ============================================================
// USER ID
// ============================================================

export function getUserId(): string | null {
  try {
    // Session 222: AUTH-BUG-4 — derive key from SUPABASE_URL, not hardcoded.
    // Format: sb-{projectRef}-auth-token
    const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
    const key = `sb-${ref}-auth-token`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { user?: { id?: string } } | null;
    return parsed?.user?.id ?? null;
  } catch {
    return null;
  }
}

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

/** Runtime exposure: window.coloTrack = trackEvent */
export const ModeratorAnalytics = {
  trackEvent,
  checkSignup,
  getVisitorId,
  getTrafficSource,
  getUserId,
  isOptedOut,
  setAnalyticsOptOut,
} as const;
