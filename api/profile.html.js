// ============================================================
// THE MODERATOR — Profile Page HTML Builders
// Split from api/profile.js (Session refactor)
//
// Exports: buildProfileHtml, build404Html
// ============================================================

// LANDMINE [LM-PROFILE-001]: BASE_URL is also declared in profile.js (orchestrator).
// Both files need it independently. Consider extracting to a shared constants module
// if a third consumer appears.
const BASE_URL = process.env.BASE_URL || 'https://themoderator.app';

import { getProfileCSS } from './profile.css.js';

import {
  escapeHtml,
  sanitizeAvatarUrl,
  getRankTier,
  formatDate,
  getInitials,
  parseEmojiAvatar,
} from './profile.helpers.js';

export function buildProfileHtml(profile) {
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
<meta name="mobile-web-app-capable" content="yes">
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

<style>${getProfileCSS()}</style>
</head>
<body>

<!-- TOP BAR -->
<div class="top-bar">
  <a href="${BASE_URL}" class="logo"><span class="the">THE</span>MODERATOR</a>
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
    <a href="${BASE_URL}/login?returnTo=/u/${username}" class="cta-btn cta-secondary">👤 Sign in to Follow</a>
  </div>

  <!-- FOOTER -->
  <div class="profile-footer">
    <a href="${BASE_URL}">The Moderator</a> — Where opinions fight.
  </div>

</div>

</body>
</html>`;
}

export function build404Html(username) {
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
  <h1>DEBATER NOT FOUND</h1>
  <p>"${safe}" hasn't entered the arena yet.</p>
  <a href="${BASE_URL}">Enter The Moderator</a>
</body>
</html>`;
}
