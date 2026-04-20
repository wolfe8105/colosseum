// ============================================================
// THE MODERATOR — Public Profile Page (Serverless Function)
// Session 61 — March 8, 2026
//
// WHAT THIS DOES:
// 1. Fetches user profile from Supabase profiles_public view
// 2. Returns full HTML with dynamic OG tags (crawlers see real data)
// 3. Renders a mobile-first profile page matching design DNA
//
// ROUTE: /u/:username → /api/profile?username=:username (via vercel.json rewrite)
//
// WHY SERVERLESS:
// Social crawlers (Bluesky, Discord, Lemmy, Google) don't execute JS.
// They only read the initial HTML. This function bakes OG tags into
// the HTML server-side so shared profile links show real user data.
// ============================================================

import { buildProfileHtml, build404Html } from './profile.html.js';

// LANDMINE [LM-PROFILE-001]: BASE_URL is also declared in profile.html.js.
// Both files need it independently. Consider extracting to a shared constants
// module if a third consumer appears.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BASE_URL = process.env.BASE_URL || 'https://themoderator.app';

// In-memory cache: username → { html, expiresAt }
// Survives across requests within the same serverless instance.
// TTL: 60 seconds. Protects Supabase from concurrent spikes on viral links.
const profileCache = new Map();
const CACHE_TTL_MS = 60_000;

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('profile.js: SUPABASE_URL or SUPABASE_ANON_KEY env var not set');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(build404Html('error'));
  }

  const { username } = req.query;

  // Validate username
  if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(404).send(build404Html(username || 'unknown'));
  }

  try {
    // Check in-memory cache first
    const cached = profileCache.get(username);
    if (cached && cached.expiresAt > Date.now()) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).send(cached.html);
    }

    // Query Supabase REST API directly (no SDK needed)
    const apiUrl = `${SUPABASE_URL}/rest/v1/profiles_public?username=eq.${encodeURIComponent(username)}&select=*&limit=1`;
    const profileAbort = new AbortController();
    const profileTimeout = setTimeout(() => profileAbort.abort(), 5000);
    let response;
    try {
      response = await fetch(apiUrl, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Accept': 'application/json',
        },
        signal: profileAbort.signal,
      });
    } finally {
      clearTimeout(profileTimeout);
    }

    if (!response.ok) {
      throw new Error(`Supabase returned ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(404).send(build404Html(username));
    }

    const profile = data[0];
    const html = buildProfileHtml(profile);

    // Populate in-memory cache
    profileCache.set(username, { html, expiresAt: Date.now() + CACHE_TTL_MS });

    // Cache for 5 minutes at the CDN edge — profile data doesn't change that fast
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(html);

  } catch (err) {
    console.error('Profile fetch error:', err.message);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(500).send(build404Html(username));
  }
}
