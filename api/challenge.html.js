// ============================================================
// THE MODERATOR — Challenge Link Page: HTML Builders
// Split from challenge.js (Session 188 — F-39)
// ============================================================

import { escapeHtml, getCategoryLabel, getModeLabel } from './challenge.helpers.js';

const BASE_URL = 'https://themoderator.app';

function buildChallengeHtml(preview, code) {
  const challenger = escapeHtml(preview.challenger_display_name || preview.challenger_username);
  const username = escapeHtml(preview.challenger_username);
  const topic = escapeHtml(preview.topic || 'Open Debate');
  const category = getCategoryLabel(preview.category);
  const mode = getModeLabel(preview.mode);
  const elo = preview.challenger_elo || 1000;
  const safeCode = encodeURIComponent(code.toUpperCase());

  const ogTitle = `${challenger} challenged you to a debate — The Moderator`;
  const ogDesc = `"${topic}" — ${category} · ${mode}. Accept the challenge and defend your position.`;
  const ogUrl = `${BASE_URL}/challenge?code=${safeCode}`;
  const ogImage = `${BASE_URL}/og-card-default.png`;

  // After login, returnTo sends user to /?joinCode=CODE&screen=arena
  // home.ts reads screen param → navigateTo('arena')
  // arena.ts init() reads joinCode param → joinWithCode()
  const returnTo = encodeURIComponent(`/?joinCode=${code.toUpperCase()}&screen=arena`);
  const acceptUrl = `${BASE_URL}/login?returnTo=${returnTo}`;

  // LANDMINE [LM-CHALLENGE-002]: escapeHtml(category) — category is already the output of
  // getCategoryLabel(), which returns hardcoded emoji strings. The escape call is a no-op.
  // LANDMINE [LM-CHALLENGE-003]: escapeHtml(mode) — same; mode is getCategoryLabel() output.
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#000000">

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
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Barlow+Condensed:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --mod-bg-base:#000000;--mod-bg-card:rgba(22,28,38,0.78);
      --mod-cyan:#00ffee;--mod-cyan-dark:#00ccbb;--mod-cyan-glow:rgba(0,255,238,0.25);
      --mod-magenta:#ff1a75;--mod-magenta-dark:#ee0060;--mod-magenta-glow:rgba(255,26,117,0.25);
      --mod-orange-neon:#ff8800;
      --mod-text-primary:#b8c0d0;--mod-text-heading:#e8eaf0;--mod-text-muted:#4a5060;--mod-text-sub:#7a8298;
      --mod-border-primary:rgba(255,255,255,0.08);--mod-border-subtle:rgba(255,255,255,0.05);
      --mod-gold:#c29a58;
      --font-display:'Orbitron',sans-serif;--font-body:'Barlow Condensed',sans-serif;
      --safe-top:env(safe-area-inset-top,0px);--safe-bottom:env(safe-area-inset-bottom,0px);
    }
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    html{-webkit-text-size-adjust:100%}
    body{
      font-family:var(--font-body);color:var(--mod-text-primary);min-height:100dvh;
      background:var(--mod-bg-base);display:flex;flex-direction:column;align-items:center;
      -webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;
      padding:0 0 calc(40px + var(--safe-bottom));
    }
    body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(0,255,238,0.06) 0%,transparent 60%),radial-gradient(ellipse at 80% 100%,rgba(255,26,117,0.04) 0%,transparent 50%);z-index:-1}

    .top-bar{
      width:100%;padding:calc(12px + var(--safe-top)) 16px 12px;
      background:rgba(6,6,8,0.75);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
      border-bottom:1px solid var(--mod-border-primary);
      display:flex;align-items:center;justify-content:space-between;
      position:sticky;top:0;z-index:100;
    }
    .logo{font-family:var(--font-display);font-size:14px;font-weight:700;letter-spacing:3px;color:var(--mod-cyan);text-transform:uppercase;text-decoration:none}
    .logo .the{font-weight:400;color:var(--mod-text-sub);font-size:10px;letter-spacing:4px;display:block;line-height:1;margin-bottom:-2px}

    .container{width:100%;max-width:520px;padding:0 16px;display:flex;flex-direction:column;gap:16px;margin-top:32px}

    .vs-header{text-align:center;margin-bottom:8px}
    .vs-eyebrow{font-size:11px;letter-spacing:3px;color:var(--mod-text-sub);text-transform:uppercase;margin-bottom:12px}
    .vs-title{font-family:var(--font-display);font-size:12px;font-weight:700;letter-spacing:4px;color:var(--mod-cyan);text-transform:uppercase}

    .challenger-card{
      background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);
      border-radius:16px;padding:24px 20px;text-align:center;
      backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    }
    .challenger-avatar{
      width:72px;height:72px;border-radius:50%;
      background:linear-gradient(135deg,var(--mod-cyan-dark),var(--mod-cyan));
      display:flex;align-items:center;justify-content:center;
      font-family:var(--font-display);font-size:28px;font-weight:700;color:var(--mod-bg-base);
      border:3px solid var(--mod-cyan-glow);margin:0 auto 12px;
    }
    .challenger-name{font-family:var(--font-display);font-size:18px;font-weight:700;letter-spacing:2px;color:var(--mod-text-heading)}
    .challenger-username{font-size:14px;color:var(--mod-text-sub);letter-spacing:1px;margin-top:4px}
    .challenger-elo{font-family:var(--font-display);font-size:28px;font-weight:900;color:var(--mod-cyan);margin-top:8px;letter-spacing:2px}
    .challenger-elo-label{font-size:11px;color:var(--mod-text-sub);letter-spacing:2px;text-transform:uppercase}

    .topic-card{
      background:var(--mod-bg-card);border:2px solid var(--mod-magenta-glow);
      border-radius:16px;padding:24px 20px;text-align:center;
      backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    }
    .topic-eyebrow{font-size:11px;letter-spacing:3px;color:var(--mod-text-sub);text-transform:uppercase;margin-bottom:10px}
    .topic-text{font-family:var(--font-display);font-size:16px;font-weight:700;letter-spacing:1px;color:var(--mod-text-heading);line-height:1.4}
    .topic-meta{display:flex;justify-content:center;gap:12px;margin-top:14px;flex-wrap:wrap}
    .topic-tag{
      padding:5px 14px;border-radius:20px;
      background:rgba(255,255,255,0.05);border:1px solid var(--mod-border-primary);
      font-size:13px;color:var(--mod-text-sub);letter-spacing:0.5px;
    }

    .accept-btn{
      display:block;width:100%;padding:18px;border-radius:14px;
      background:var(--mod-magenta);color:#ffffff;border:none;
      font-family:var(--font-body);font-size:17px;font-weight:700;letter-spacing:2px;
      text-transform:uppercase;cursor:pointer;text-decoration:none;text-align:center;
      transition:all 0.2s;box-shadow:0 0 20px var(--mod-magenta-glow);
    }
    .accept-btn:active{transform:scale(0.97);background:var(--mod-magenta-dark)}

    .footer-note{text-align:center;font-size:13px;color:var(--mod-text-sub);line-height:1.5}
    .footer-note a{color:var(--mod-cyan-dark);text-decoration:none}

    .page-footer{text-align:center;padding:24px 0 8px;font-size:12px;color:rgba(160,168,184,0.3);letter-spacing:1px}
    .page-footer a{color:var(--mod-cyan-dark);text-decoration:none}
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
  <meta name="theme-color" content="#000000">
  <title>Challenge Expired — The Moderator</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Barlow+Condensed:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Barlow Condensed',sans-serif;color:#b8c0d0;min-height:100dvh;background:#000000;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px;}
    body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(0,255,238,0.06) 0%,transparent 60%),radial-gradient(ellipse at 80% 100%,rgba(255,26,117,0.04) 0%,transparent 50%);z-index:-1}
    h1{font-family:'Orbitron',sans-serif;font-size:22px;color:#00ffee;letter-spacing:3px;margin-bottom:16px}
    p{font-size:16px;color:#7a8298;margin-bottom:24px;letter-spacing:0.5px;line-height:1.5}
    a{padding:14px 32px;border-radius:12px;border:none;background:#ff1a75;color:#ffffff;font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;letter-spacing:1.5px;text-decoration:none;text-transform:uppercase;box-shadow:0 0 20px rgba(255,26,117,0.25);}
  </style>
</head>
<body>
  <h1>CHALLENGE EXPIRED</h1>
  <p>This challenge link is no longer active.<br>The lobby may have filled or timed out.</p>
  <a href="${BASE_URL}">Enter The Moderator</a>
</body>
</html>`;
}

export { buildChallengeHtml, buildExpiredHtml };
