/**
 * api/invite.js
 * F-59 Invite Rewards | Session 268 | April 12, 2026
 *
 * Handles GET /i/:code — the short invite link.
 * Records the click server-side, then redirects to plinko.
 *
 * Route: /i/:code → /api/invite?code=:code (via vercel.json rewrite)
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const APP_BASE = 'https://themoderator.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = async function handler(req, res) {
  const code = req.query.code;

  if (!code || !/^[a-z0-9]{5}$/.test(code)) {
    return res.redirect(302, `${APP_BASE}/moderator-plinko.html`);
  }

  // Record the click via service-role RPC (unauthenticated — no user session yet)
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      ?? req.socket?.remoteAddress
      ?? null;

    await supabase.rpc('record_invite_click', {
      p_ref_code:  code,
      p_device_id: null,   // client-side device ID set in localStorage by plinko.ts
      p_ip:        ip,
    });
  } catch {
    // Non-blocking — click recording failure should not break the invite flow
  }

  // Redirect to plinko, preserving the ref code so plinko.ts can call attribute_signup
  res.redirect(302, `${APP_BASE}/moderator-plinko.html?ref=${encodeURIComponent(code)}`);
};
