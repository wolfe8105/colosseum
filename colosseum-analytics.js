// ═══════════════════════════════════════════════════════════
// THE COLOSSEUM — FUNNEL ANALYTICS
// Zero-dependency event tracker. Works on any page.
// Generates visitor UUID in localStorage, fires events via Supabase RPC.
// Never blocks the page. Swallows all errors.
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────
  const SUPABASE_URL = 'https://faomczmipsccwbhpivmp.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb21jem1pcHNjY3diaHBpdm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTM4NzIsImV4cCI6MjA4Nzc2OTg3Mn0.d11AoWVu074DHo3vjVNNOA-1DT8KaoAXF340ysLoHYI';

  // ── Visitor ID (persists across sessions) ───────────────
  function getVisitorId() {
    try {
      var id = localStorage.getItem('colo_vid');
      if (!id) {
        id = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
              var r = (Math.random() * 16) | 0;
              return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
            });
        localStorage.setItem('colo_vid', id);
      }
      return id;
    } catch (e) {
      // Private browsing or localStorage blocked — generate ephemeral ID
      return 'ephemeral-' + Math.random().toString(36).slice(2);
    }
  }

  // ── Traffic source (captured once on first visit) ───────
  function getTrafficSource() {
    try {
      var cached = localStorage.getItem('colo_src');
      if (cached) return JSON.parse(cached);

      var params = new URLSearchParams(location.search);
      var src = {
        referrer: document.referrer || null,
        utm_source: params.get('utm_source') || null,
        utm_medium: params.get('utm_medium') || null,
        utm_campaign: params.get('utm_campaign') || null
      };
      localStorage.setItem('colo_src', JSON.stringify(src));
      return src;
    } catch (e) {
      return { referrer: document.referrer || null, utm_source: null, utm_medium: null, utm_campaign: null };
    }
  }

  // ── Get authenticated user ID (if any) ──────────────────
  function getUserId() {
    try {
      var key = 'sb-faomczmipsccwbhpivmp-auth-token';
      var stored = localStorage.getItem(key);
      if (!stored) return null;
      var parsed = JSON.parse(stored);
      return (parsed && parsed.user && parsed.user.id) ? parsed.user.id : null;
    } catch (e) {
      return null;
    }
  }

  // ── Core: fire event via raw fetch ──────────────────────
  // No Supabase JS client needed. Just POST to the RPC endpoint.
  // log_event() is SECURITY DEFINER — works with anon key.
  function trackEvent(eventType, extra) {
    try {
      var vid = getVisitorId();
      var src = getTrafficSource();
      var userId = getUserId();

      var metadata = {
        visitor_id: vid,
        page: location.pathname + location.search,
        referrer: src.referrer,
        utm_source: src.utm_source,
        utm_medium: src.utm_medium,
        utm_campaign: src.utm_campaign
      };

      // Merge any extra fields (debate_id, topic, side, etc.)
      if (extra && typeof extra === 'object') {
        for (var k in extra) {
          if (extra.hasOwnProperty(k)) metadata[k] = extra[k];
        }
      }

      var body = {
        p_event_type: eventType,
        p_metadata: metadata
      };

      // Only include user_id if authenticated (UUID format required)
      if (userId) body.p_user_id = userId;

      fetch(SUPABASE_URL + '/rest/v1/rpc/log_event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
        },
        body: JSON.stringify(body)
      }).catch(function () { /* swallow */ });
    } catch (e) {
      // Never block the page. Never throw. Analytics is optional.
    }
  }

  // ── Signup detection ────────────────────────────────────
  // If user is authenticated now but wasn't on last page view,
  // fire a 'signup' event to mark the conversion.
  function checkSignup() {
    try {
      var userId = getUserId();
      var wasSeen = localStorage.getItem('colo_uid_seen');

      if (userId && !wasSeen) {
        // First time we see an authenticated user on this device
        localStorage.setItem('colo_uid_seen', userId);
        trackEvent('signup', { new_user: true });
      } else if (userId && wasSeen !== userId) {
        // Different user on same device (rare but possible)
        localStorage.setItem('colo_uid_seen', userId);
        trackEvent('signup', { new_user: true, switched: true });
      }
    } catch (e) { /* swallow */ }
  }

  // ── Auto-fire on page load ──────────────────────────────
  trackEvent('page_view');
  checkSignup();

  // ── Expose globally ─────────────────────────────────────
  // Usage from any page: coloTrack('button_click', { button: 'vote_yes' })
  window.coloTrack = trackEvent;

})();
