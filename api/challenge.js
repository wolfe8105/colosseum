// ============================================================
// THE MODERATOR — Challenge Link Page (Serverless Function)
// Session 188 — F-39
//
// WHAT THIS DOES:
// 1. Looks up join_code via get_challenge_preview RPC
// 2. Returns full HTML with dynamic OG tags (crawlers see real data)
// 3. Renders challenge landing page — no auth required to view
// 4. "Accept" button routes through login → auto-joins lobby
//
// ROUTE: /challenge?code=XXXXXX (via vercel.json rewrite)
//
// WHY SERVERLESS:
// Bluesky/Discord crawlers don't execute JS.
// OG tags must be baked in server-side for link previews.
// ============================================================

// LANDMINE [LM-CHALLENGE-001]: Original file used ESM `export default` syntax in a
// Vercel Node.js serverless function. Converted to CommonJS `module.exports` during split.

const { buildChallengeHtml, buildExpiredHtml } = require('./challenge.html');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://faomczmipsccwbhpivmp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BASE_URL = 'https://themoderator.app'; // eslint-disable-line no-unused-vars

module.exports = async function handler(req, res) {
  if (!SUPABASE_ANON_KEY) {
    console.error('challenge.js: SUPABASE_ANON_KEY env var not set');
    return res.status(500).send('Server configuration error');
  }

  const code = (req.query.code || '').toString().trim().toUpperCase();

  if (!code || !/^[A-Z0-9]{4,10}$/.test(code)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(404).send(buildExpiredHtml());
  }

  try {
    const apiUrl = `${SUPABASE_URL}/rest/v1/rpc/get_challenge_preview`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ p_join_code: code }),
    });

    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);

    const data = await response.json();

    if (!data || data.length === 0) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(404).send(buildExpiredHtml());
    }

    const preview = data[0];

    // Lobby must still be open
    if (!['pending', 'lobby'].includes(preview.status)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(410).send(buildExpiredHtml());
    }

    const html = buildChallengeHtml(preview, code);
    // Short cache — lobby state can change fast
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return res.status(200).send(html);

  } catch (err) {
    console.error('Challenge fetch error:', err.message);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(500).send(buildExpiredHtml());
  }
};
