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

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://faomczmipsccwbhpivmp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BASE_URL = 'https://themoderator.app';

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getCategoryLabel(category) {
  const map = {
    'politics': '🏛️ Politics',
    'sports': '🏆 Sports',
    'entertainment': '🎬 Entertainment',
    'couples-court': '💑 Couples Court',
    'music': '🎵 Music',
    'movies': '🎥 Movies',
    'cars': '🚗 Cars',
  };
  return map[category] || '🎙️ Open Debate';
}

function getModeLabel(mode) {
  const map = {
    'text': 'Text Battle',
    'voice_memo': 'Voice Memo',
    'live_audio': 'Live Audio',
    'ai_sparring': 'AI Sparring',
  };
  return map[mode] || 'Debate';
}

function buildChallengeHtml(preview, code) {
  const challenger = escapeHtml(preview.challenger_display_name || preview.challenger_username);
  const username = escapeHtml(preview.challenger_username);
  const topic = escapeHtml(preview.topic || 'Open Debate');
  const category = getCategoryLabel(preview.category);
  const mode = getModeLabel(preview.mode);
  const elo = preview.challenger_elo || 1000;
  const safeCode = encodeURIComponent(code.toUpperCase());

  const ogTitle = `${challenger} challenged you to a debate — The Moderator`;
  const ogDesc = `"${preview.topic || 'Open Debate'}" — ${category} · ${mode}. Accept the challenge and defend your position.`;
  const ogUrl = `${BASE_URL}/challenge?code=${safeCode}`;
  const ogImage = `${BASE_URL}/og-card-default.png`;

  // After login, returnTo sends user to /?joinCode=CODE&screen=arena
  // home.ts reads screen param → navigateTo('arena')
  // arena.ts init() reads joinCode param → joinWithCode()
  const returnTo = encodeURIComponent(`/?joinCode=${code.toUpperCase()}&screen=arena`);
  const acceptUrl = `${BASE_URL}/login?returnTo=${returnTo}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#1a2d4a">

  <!-- Dynamic OG Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDesc}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${ogUrl}">
  <meta property="og:site_name" content="The Moderator">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDesc}">
  <meta name="twitter:image" content="${ogImage}">

  <title>${ogTitle}</title>
  <link rel="canonical" href="${ogUrl}">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Barlow+Condensed:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-1:#1a2d4a;--bg-2:#2d5a8e;--bg-3:#5b8abf;--bg-4:#7aa3d4;--bg-5:#3d5a80;
      --navy:#0a1628;--card-bg:rgba(10,17,40,0.6);--card-border:rgba(255,255,255,0.22);
      --red:#cc2936;--gold:#d4a843;--gold-dim:#b8922e;
      --white:#f0f0f0;--white-dim:#a0a8b8;
      --font-display:'Cinzel',serif;--font-body:'Barlow Condensed',sans-serif;
      --safe-top:env(safe-area-inset-top,0px);--safe-bottom:env(safe-area-inset-bottom,0px);
    }
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    html{-webkit-text-size-adjust:100%}
    body{
      font-family:var(--font-body);color:var(--white);min-height:100dvh;
      background:var(--bg-1);display:flex;flex-direction:column;align-items:center;
      -webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;
      padding:0 0 calc(40px + var(--safe-bottom));
    }
    body::before{content:'';position:fixed;inset:0;background:linear-gradient(135deg,#1a2d4a 0%,#2d5a8e 25%,#5b8abf 50%,#7aa3d4 70%,#3d5a80 100%);z-index:-2}
    body::after{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 30% 20%,rgba(212,168,67,0.08) 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,rgba(204,41,54,0.06) 0%,transparent 50%);z-index:-1}

    .top-bar{
      width:100%;padding:calc(12px + var(--safe-top)) 16px 12px;
      background:rgba(10,17,40,0.5);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
      border-bottom:1px solid rgba(255,255,255,0.08);
      display:flex;align-items:center;justify-content:space-between;
      position:sticky;top:0;z-index:100;
    }
    .logo{font-family:var(--font-display);font-size:16px;font-weight:700;letter-spacing:3px;color:var(--gold);text-transform:uppercase;text-decoration:none}
    .logo .the{font-weight:400;color:var(--white-dim);font-size:11px;letter-spacing:4px;display:block;line-height:1;margin-bottom:-2px}

    .container{width:100%;max-width:520px;padding:0 16px;display:flex;flex-direction:column;gap:16px;margin-top:32px}

    .vs-header{text-align:center;margin-bottom:8px}
    .vs-eyebrow{font-size:11px;letter-spacing:3px;color:var(--white-dim);text-transform:uppercase;margin-bottom:12px}
    .vs-title{font-family:var(--font-display);font-size:13px;font-weight:700;letter-spacing:4px;color:var(--gold);text-transform:uppercase}

    .challenger-card{
      background:var(--card-bg);border:1px solid var(--card-border);
      border-radius:16px;padding:24px 20px;text-align:center;
      backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    }
    .challenger-avatar{
      width:72px;height:72px;border-radius:50%;
      background:linear-gradient(135deg,var(--gold-dim),var(--gold));
      display:flex;align-items:center;justify-content:center;
      font-family:var(--font-display);font-size:28px;font-weight:700;color:var(--navy);
      border:3px solid rgba(212,168,67,0.4);margin:0 auto 12px;
    }
    .challenger-name{font-family:var(--font-display);font-size:20px;font-weight:700;letter-spacing:2px;color:var(--white)}
    .challenger-username{font-size:14px;color:var(--white-dim);letter-spacing:1px;margin-top:4px}
    .challenger-elo{font-family:var(--font-display);font-size:28px;font-weight:900;color:var(--gold);margin-top:8px;letter-spacing:2px}
    .challenger-elo-label{font-size:11px;color:var(--white-dim);letter-spacing:2px;text-transform:uppercase}

    .topic-card{
      background:var(--card-bg);border:2px solid rgba(204,41,54,0.4);
      border-radius:16px;padding:24px 20px;text-align:center;
      backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    }
    .topic-eyebrow{font-size:11px;letter-spacing:3px;color:var(--white-dim);text-transform:uppercase;margin-bottom:10px}
    .topic-text{font-family:var(--font-display);font-size:18px;font-weight:700;letter-spacing:1px;color:var(--white);line-height:1.4}
    .topic-meta{display:flex;justify-content:center;gap:12px;margin-top:14px;flex-wrap:wrap}
    .topic-tag{
      padding:5px 14px;border-radius:20px;
      background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
      font-size:13px;color:var(--white-dim);letter-spacing:0.5px;
    }

    .accept-btn{
      display:block;width:100%;padding:18px;border-radius:14px;
      background:var(--red);color:var(--white);border:none;
      font-family:var(--font-body);font-size:17px;font-weight:700;letter-spacing:2px;
      text-transform:uppercase;cursor:pointer;text-decoration:none;text-align:center;
      transition:all 0.2s;
    }
    .accept-btn:active{transform:scale(0.97);background:#e63946}

    .footer-note{text-align:center;font-size:13px;color:var(--white-dim);line-height:1.5}
    .footer-note a{color:var(--gold-dim);text-decoration:none}

    .page-footer{text-align:center;padding:24px 0 8px;font-size:12px;color:rgba(160,168,184,0.5);letter-spacing:1px}
    .page-footer a{color:var(--gold-dim);text-decoration:none}
  </style>
</head>
<body>
  <div class="top-bar">
    <a href="${BASE_URL}" class="logo"><span class="the">THE</span>MODERATOR</a>
  </div>

  <div class="container">
    <div class="vs-header">
      <div class="vs-eyebrow">You've been challenged</div>
      <div class="vs-title">⚔️ Accept or back down ⚔️</div>
    </div>

    <div class="challenger-card">
      <div class="challenger-avatar">${escapeHtml((preview.challenger_display_name || preview.challenger_username || '?')[0].toUpperCase())}</div>
      <div class="challenger-name">${challenger}</div>
      <div class="challenger-username">@${username}</div>
      <div class="challenger-elo">${elo}</div>
      <div class="challenger-elo-label">ELO Rating</div>
    </div>

    <div class="topic-card">
      <div class="topic-eyebrow">The Topic</div>
      <div class="topic-text">${topic}</div>
      <div class="topic-meta">
        <span class="topic-tag">${escapeHtml(category)}</span>
        <span class="topic-tag">${escapeHtml(mode)}</span>
      </div>
    </div>

    <a href="${acceptUrl}" class="accept-btn">⚔️ Accept the Challenge</a>

    <div class="footer-note">
      You'll need a free account to debate.<br>
      Already have one? <a href="${acceptUrl}">Sign in to accept.</a>
    </div>

    <div class="page-footer">
      <a href="${BASE_URL}">The Moderator</a> — Where opinions fight.
    </div>
  </div>
</body>
</html>`;
}

function buildExpiredHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#1a2d4a">
  <title>Challenge Expired — The Moderator</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Barlow+Condensed:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Barlow Condensed',sans-serif;color:#f0f0f0;min-height:100dvh;background:#1a2d4a;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px;}
    body::before{content:'';position:fixed;inset:0;background:linear-gradient(135deg,#1a2d4a 0%,#2d5a8e 25%,#5b8abf 50%,#7aa3d4 70%,#3d5a80 100%);z-index:-1}
    h1{font-family:'Cinzel',serif;font-size:26px;color:#d4a843;letter-spacing:3px;margin-bottom:16px}
    p{font-size:16px;color:#a0a8b8;margin-bottom:24px;letter-spacing:0.5px;line-height:1.5}
    a{padding:14px 32px;border-radius:12px;border:none;background:#cc2936;color:#f0f0f0;font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;letter-spacing:1.5px;text-decoration:none;text-transform:uppercase;}
  </style>
</head>
<body>
  <h1>CHALLENGE EXPIRED</h1>
  <p>This challenge link is no longer active.<br>The lobby may have filled or timed out.</p>
  <a href="${BASE_URL}">Enter The Moderator</a>
</body>
</html>`;
}

export default async function handler(req, res) {
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
}
