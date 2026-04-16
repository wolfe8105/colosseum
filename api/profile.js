// ============================================================
// THE COLOSSEUM — Public Profile Page (Serverless Function)
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

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://faomczmipsccwbhpivmp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BASE_URL = process.env.BASE_URL || 'https://themoderator.app';

// In-memory cache: username → { html, expiresAt }
// Survives across requests within the same serverless instance.
// TTL: 60 seconds. Protects Supabase from concurrent spikes on viral links.
const profileCache = new Map();
const CACHE_TTL_MS = 60_000;

function escapeHtml(str) {
  if (!str) return '';
  return str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function sanitizeAvatarUrl(url) {
  if (!url) return null;
  // Only allow https:// URLs — blocks javascript:, data:, etc.
  if (/^https:\/\//i.test(url)) return url;
  return null;
}

function getRankTier(elo) {
  if (elo >= 1800) return { name: 'Legendary', color: '#d4a843', icon: '👑' };
  if (elo >= 1500) return { name: 'Champion', color: '#d4a843', icon: '⚔️' };
  if (elo >= 1300) return { name: 'Contender', color: '#7aa3d4', icon: '🛡️' };
  if (elo >= 1100) return { name: 'Gladiator', color: '#5b8abf', icon: '⚡' };
  return { name: 'Rookie', color: '#a0a8b8', icon: '🏛️' };
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getInitials(displayName, username) {
  const name = displayName || username || '?';
  return name.charAt(0).toUpperCase();
}

// SESSION 113: Parse emoji avatar format ('emoji:⚔️' → '⚔️', else null)
function parseEmojiAvatar(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return null;
  if (avatarUrl.startsWith('emoji:')) return avatarUrl.slice(6);
  return null;
}

function buildProfileHtml(profile) {
  const p = profile;
  const rank = getRankTier(p.elo_rating || 1000);
  const displayName = escapeHtml(p.display_name || p.username);
  const username = escapeHtml(p.username);
  const bio = escapeHtml(p.bio || 'No bio yet.');
  const elo = p.elo_rating || 1000;
  const wins = p.wins || 0;
  const losses = p.losses || 0;
  const draws = p.draws || 0;
  const totalDebates = p.debates_completed || 0;
  const streak = p.current_streak || 0;
  const bestStreak = p.best_streak || 0;
  const level = p.level || 1;
  const xp = p.xp || 0;
  const memberSince = formatDate(p.created_at);
  const profilePct = p.profile_depth_pct || 0;
  const initial = getInitials(p.display_name, p.username);
  const winRate = totalDebates > 0 ? Math.round((wins / totalDebates) * 100) : 0;
  const emojiAvatar = parseEmojiAvatar(p.avatar_url);
  const safeAvatarUrl = emojiAvatar ? null : sanitizeAvatarUrl(p.avatar_url);

  // OG tags
  const ogTitle = `${displayName} — Elo ${elo} | The Moderator`;
  const ogDesc = bio !== 'No bio yet.'
    ? `${bio.substring(0, 120)} — ${wins}W ${losses}L ${draws}D`
    : `${rank.name} debater — ${wins}W ${losses}L ${draws}D — Level ${level}`;
  const ogUrl = `${BASE_URL}/u/${username}`;
  const ogImage = `${BASE_URL}/og-card-default.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#1a2d4a">

<!-- Dynamic OG Meta Tags — Server-rendered for crawlers -->
<meta property="og:type" content="profile">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDesc}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${ogUrl}">
<meta property="og:site_name" content="The Moderator">
<meta property="profile:username" content="${username}">

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
  --navy:#0a1628;--navy-light:#132240;--navy-mid:#1a2d4a;
  --card-bg:rgba(10,17,40,0.6);--card-border:rgba(255,255,255,0.22);--card-border-hover:rgba(255,255,255,0.4);
  --red:#cc2936;--red-hover:#e63946;--gold:#d4a843;--gold-dim:#b8922e;
  --white:#f0f0f0;--white-dim:#a0a8b8;--success:#2ecc71;--error:#e74c3c;
  --font-display:'Cinzel',serif;--font-body:'Barlow Condensed',sans-serif;
  --safe-top:env(safe-area-inset-top,0px);--safe-bottom:env(safe-area-inset-bottom,0px);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  font-family:var(--font-body);color:var(--white);min-height:100dvh;
  background:var(--bg-1);overflow-y:auto;
  -webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;
  display:flex;flex-direction:column;align-items:center;
  padding:0 0 calc(40px + var(--safe-bottom));
}
body::before{content:'';position:fixed;inset:0;background:linear-gradient(135deg,#1a2d4a 0%,#2d5a8e 25%,#5b8abf 50%,#7aa3d4 70%,#3d5a80 100%);z-index:-2}
body::after{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 30% 20%,rgba(212,168,67,0.06) 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,rgba(204,41,54,0.04) 0%,transparent 50%);z-index:-1}

/* TOP BAR */
.top-bar{
  width:100%;padding:calc(12px + var(--safe-top)) 16px 12px;
  background:rgba(10,17,40,0.5);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid rgba(255,255,255,0.08);
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;z-index:100;
}
.logo{font-family:var(--font-display);font-size:16px;font-weight:700;letter-spacing:3px;color:var(--gold);text-transform:uppercase;text-decoration:none}
.logo .the{font-weight:400;color:var(--white-dim);font-size:11px;letter-spacing:4px;display:block;line-height:1;margin-bottom:-2px}
.join-btn{
  padding:8px 18px;border-radius:20px;border:1px solid var(--gold-dim);
  background:rgba(212,168,67,0.1);color:var(--gold);
  font-family:var(--font-body);font-size:14px;font-weight:600;letter-spacing:1px;
  cursor:pointer;transition:all 0.2s;text-decoration:none;
}
.join-btn:active{background:rgba(212,168,67,0.2);transform:scale(0.96)}

/* CONTAINER */
.container{width:100%;max-width:520px;padding:0 16px;display:flex;flex-direction:column;gap:16px;margin-top:24px}

/* PROFILE HEADER */
.profile-header{
  display:flex;flex-direction:column;align-items:center;gap:12px;
  padding:28px 20px 24px;
  background:var(--card-bg);border:1px solid var(--card-border);
  border-radius:16px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
}
.avatar{
  width:80px;height:80px;border-radius:50%;
  background:linear-gradient(135deg,var(--gold-dim),var(--gold));
  display:flex;align-items:center;justify-content:center;
  font-family:var(--font-display);font-size:32px;font-weight:700;color:var(--navy);
  border:3px solid rgba(212,168,67,0.4);
}
.avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}
.profile-name{font-family:var(--font-display);font-size:22px;font-weight:700;letter-spacing:2px;text-align:center;color:var(--white)}
.profile-username{font-size:15px;color:var(--white-dim);letter-spacing:1px;margin-top:-6px}
.profile-bio{font-size:15px;color:var(--white-dim);text-align:center;line-height:1.4;max-width:360px;word-break:break-word}

/* RANK BADGE */
.rank-badge{
  display:inline-flex;align-items:center;gap:6px;
  padding:6px 16px;border-radius:20px;
  font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;
}
.rank-badge.legendary{background:rgba(212,168,67,0.15);border:1px solid rgba(212,168,67,0.3);color:#d4a843}
.rank-badge.champion{background:rgba(212,168,67,0.12);border:1px solid rgba(212,168,67,0.25);color:#d4a843}
.rank-badge.contender{background:rgba(122,163,212,0.12);border:1px solid rgba(122,163,212,0.25);color:#7aa3d4}
.rank-badge.gladiator{background:rgba(91,138,191,0.12);border:1px solid rgba(91,138,191,0.25);color:#5b8abf}
.rank-badge.rookie{background:rgba(160,168,184,0.1);border:1px solid rgba(160,168,184,0.2);color:#a0a8b8}

/* ELO + RECORD */
.elo-display{
  font-family:var(--font-display);font-size:42px;font-weight:900;
  letter-spacing:3px;text-align:center;
}

/* STAT CARDS */
.stat-grid{
  display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;
}
.stat-card{
  background:var(--card-bg);border:1px solid var(--card-border);
  border-radius:12px;padding:14px 8px;text-align:center;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
}
.stat-value{font-family:var(--font-display);font-size:22px;font-weight:700;letter-spacing:1px}
.stat-label{font-size:11px;color:var(--white-dim);letter-spacing:1.5px;text-transform:uppercase;margin-top:4px}

/* WIDE STAT ROW */
.stat-row{
  display:grid;grid-template-columns:1fr 1fr;gap:10px;
}

/* RECORD BAR */
.record-section{
  background:var(--card-bg);border:1px solid var(--card-border);
  border-radius:12px;padding:16px;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
}
.record-header{font-size:12px;color:var(--white-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:12px}
.record-bar{
  display:flex;height:28px;border-radius:8px;overflow:hidden;
  background:rgba(255,255,255,0.05);
}
.record-bar .wins-seg{background:var(--success);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;letter-spacing:1px}
.record-bar .losses-seg{background:var(--red);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;letter-spacing:1px}
.record-bar .draws-seg{background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;letter-spacing:1px;color:var(--white-dim)}
.record-numbers{display:flex;justify-content:space-between;margin-top:10px;font-size:14px;font-weight:500}
.record-numbers .w{color:var(--success)}
.record-numbers .l{color:var(--red)}
.record-numbers .d{color:var(--white-dim)}

/* CTA BUTTONS */
.cta-row{display:flex;gap:10px}
.cta-btn{
  flex:1;padding:14px;border-radius:12px;text-align:center;
  font-family:var(--font-body);font-size:15px;font-weight:600;letter-spacing:1.5px;
  text-transform:uppercase;cursor:pointer;transition:all 0.2s;
  text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;
}
.cta-btn:active{transform:scale(0.97)}
.cta-primary{background:var(--red);color:var(--white);border:none}
.cta-primary:hover{background:var(--red-hover)}
.cta-secondary{background:transparent;color:var(--gold);border:1px solid var(--gold-dim)}
.cta-secondary:hover{background:rgba(212,168,67,0.1)}

/* FOOTER */
.profile-footer{
  text-align:center;padding:20px 0 8px;
  font-size:12px;color:rgba(160,168,184,0.5);letter-spacing:1px;
}
.profile-footer a{color:var(--gold-dim);text-decoration:none}

/* MEMBER SINCE + LEVEL ROW */
.meta-row{
  display:flex;justify-content:center;gap:16px;
  font-size:13px;color:var(--white-dim);letter-spacing:0.5px;
}
.meta-row span{display:flex;align-items:center;gap:4px}
</style>
</head>
<body>

<!-- TOP BAR -->
<div class="top-bar">
  <a href="${BASE_URL}" class="logo"><span class="the">THE</span>COLOSSEUM</a>
  <a href="${BASE_URL}/login" class="join-btn">JOIN THE ARENA</a>
</div>

<!-- PROFILE CONTENT -->
<div class="container">

  <!-- HEADER: Avatar + Name + Rank -->
  <div class="profile-header">
    <div class="avatar"${emojiAvatar ? ' style="font-size:40px;background:rgba(10,17,40,0.6);color:#d4a843;"' : ''}>${safeAvatarUrl ? `<img src="${escapeHtml(safeAvatarUrl)}" alt="${displayName}">` : emojiAvatar ? escapeHtml(emojiAvatar) : initial}</div>
    <div class="profile-name">${displayName}</div>
    <div class="profile-username">@${username}</div>
    ${bio !== 'No bio yet.' ? `<div class="profile-bio">${bio}</div>` : ''}
    <div class="rank-badge ${rank.name.toLowerCase()}">${rank.icon} ${rank.name}</div>
  </div>

  <!-- ELO RATING -->
  <div class="stat-card" style="padding:20px;text-align:center">
    <div class="elo-display" style="color:${rank.color}">${elo}</div>
    <div class="stat-label" style="font-size:13px;margin-top:6px">ELO RATING</div>
  </div>

  <!-- W/L/D RECORD BAR -->
  <div class="record-section">
    <div class="record-header">Debate Record</div>
    ${totalDebates > 0 ? `
    <div class="record-bar">
      ${wins > 0 ? `<div class="wins-seg" style="width:${(wins/totalDebates)*100}%">${wins}W</div>` : ''}
      ${losses > 0 ? `<div class="losses-seg" style="width:${(losses/totalDebates)*100}%">${losses}L</div>` : ''}
      ${draws > 0 ? `<div class="draws-seg" style="width:${(draws/totalDebates)*100}%">${draws}D</div>` : ''}
    </div>
    <div class="record-numbers">
      <span class="w">${wins} Wins</span>
      <span class="d">${draws} Draws</span>
      <span class="l">${losses} Losses</span>
    </div>
    ` : `<div style="text-align:center;color:var(--white-dim);font-size:14px;padding:8px 0">No debates yet — be the first to challenge!</div>`}
  </div>

  <!-- STATS GRID -->
  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-value" style="color:var(--gold)">${totalDebates}</div>
      <div class="stat-label">Debates</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:var(--success)">${winRate}%</div>
      <div class="stat-label">Win Rate</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${level}</div>
      <div class="stat-label">Level</div>
    </div>
  </div>

  <!-- STREAKS -->
  <div class="stat-row">
    <div class="stat-card">
      <div class="stat-value" style="color:${streak > 0 ? 'var(--success)' : 'var(--white-dim)'}">${streak > 0 ? '🔥 ' : ''}${streak}</div>
      <div class="stat-label">Current Streak</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:var(--gold)">${bestStreak}</div>
      <div class="stat-label">Best Streak</div>
    </div>
  </div>

  <!-- MEMBER SINCE + PROFILE DEPTH -->
  <div class="meta-row">
    <span>🏛️ Member since ${memberSince}</span>
    <span>📊 ${profilePct}% profile</span>
  </div>

  <!-- CTA BUTTONS -->
  <div class="cta-row">
    <a href="${BASE_URL}/#arena" class="cta-btn cta-primary">⚔️ Challenge</a>
    <a href="${BASE_URL}/login?returnTo=/u/${username}" class="cta-btn cta-secondary">👤 Follow</a>
  </div>

  <!-- FOOTER -->
  <div class="profile-footer">
    <a href="${BASE_URL}">The Moderator</a> — Where opinions fight.
  </div>

</div>

</body>
</html>`;
}

function build404Html(username) {
  const safe = escapeHtml(username);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#1a2d4a">
<title>User Not Found — The Moderator</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Barlow+Condensed:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{
  font-family:'Barlow Condensed',sans-serif;color:#f0f0f0;min-height:100dvh;
  background:#1a2d4a;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;padding:40px 20px;
}
body::before{content:'';position:fixed;inset:0;background:linear-gradient(135deg,#1a2d4a 0%,#2d5a8e 25%,#5b8abf 50%,#7aa3d4 70%,#3d5a80 100%);z-index:-1}
h1{font-family:'Cinzel',serif;font-size:28px;color:#d4a843;letter-spacing:3px;margin-bottom:16px}
p{font-size:16px;color:#a0a8b8;margin-bottom:24px;letter-spacing:0.5px}
a{
  padding:12px 28px;border-radius:20px;border:1px solid #b8922e;
  background:rgba(212,168,67,0.1);color:#d4a843;
  font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:600;
  letter-spacing:1px;text-decoration:none;
}
</style>
</head>
<body>
  <h1>GLADIATOR NOT FOUND</h1>
  <p>"${safe}" hasn't entered the arena yet.</p>
  <a href="${BASE_URL}">Enter The Moderator</a>
</body>
</html>`;
}

export default async function handler(req, res) {
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
    const response = await fetch(apiUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
      },
    });

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
