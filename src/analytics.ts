/**
 * THE COLOSSEUM — Funnel Analytics Module (TypeScript)
 *
 * Typed mirror of colosseum-analytics.js. Zero-dependency event tracker.
 * Works on any page. Generates visitor UUID in localStorage, fires events
 * via raw fetch to Supabase RPC. Never blocks the page. Swallows all errors.
 *
 * Source of truth for runtime: colosseum-analytics.js (until Phase 4 cutover)
 * Source of truth for types: this file
 *
 * Migration: Session 127 (Phase 3)
 */

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
// CONFIG
// ============================================================

const SUPABASE_URL = 'https://faomczmipsccwbhpivmp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb21jem1pcHNjY3diaHBpdm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTM4NzIsImV4cCI6MjA4Nzc2OTg3Mn0.d11AoWVu074DHo3vjVNNOA-1DT8KaoAXF340ysLoHYI';

// ============================================================
// VISITOR ID
// ============================================================

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem('colo_vid');
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
            });
      localStorage.setItem('colo_vid', id);
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
    const cached = localStorage.getItem('colo_src');
    if (cached) return JSON.parse(cached) as TrafficSource;

    const params = new URLSearchParams(location.search);
    const src: TrafficSource = {
      referrer: document.referrer || null,
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null,
    };
    localStorage.setItem('colo_src', JSON.stringify(src));
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
    const key = 'sb-faomczmipsccwbhpivmp-auth-token';
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
    }).catch(() => {
      /* swallow */
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
    const userId = getUserId();
    const wasSeen = localStorage.getItem('colo_uid_seen');

    if (userId && !wasSeen) {
      localStorage.setItem('colo_uid_seen', userId);
      trackEvent('signup', { new_user: true });
    } else if (userId && wasSeen !== userId) {
      localStorage.setItem('colo_uid_seen', userId);
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
export const ColosseumAnalytics = {
  trackEvent,
  checkSignup,
  getVisitorId,
  getTrafficSource,
  getUserId,
} as const;
