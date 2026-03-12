#!/usr/bin/env node
// ============================================================
// THE COLOSSEUM — STATIC MIRROR GENERATOR
// Single-run Node.js script. PM2 runs every 5 minutes on VPS.
// Zero dependencies. Native fetch. String concatenation only.
// If any critical query fails → skip deploy → CDN serves last good build.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SIGNUP_URL = process.env.SIGNUP_URL || 'https://colosseum-six.vercel.app/colosseum-plinko.html';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://colosseum-six.vercel.app';
const MIRROR_DOMAIN = process.env.MIRROR_DOMAIN || 'https://colosseum-f30.pages.dev';
const CLOUDFLARE_PROJECT = process.env.CLOUDFLARE_PROJECT || 'colosseum';
const DEPLOY_ENABLED = process.env.DEPLOY_ENABLED === 'true';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUT_DIR = path.join(__dirname, '_mirror_build');

// ── Categories (NT 9.7 — all 7) ──────────────────────────────
const CATEGORIES = [
  { id: 'politics',      name: 'The Floor',       icon: '🏛️', slug: 'politics' },
  { id: 'sports',        name: 'The Pressbox',    icon: '🏟️', slug: 'sports' },
  { id: 'entertainment', name: 'The Spotlight',   icon: '🎬', slug: 'entertainment' },
  { id: 'couples-court', name: 'Couples Court',   icon: '💔', slug: 'couples-court' },
  { id: 'music',         name: 'Music',           icon: '🎵', slug: 'music' },
  { id: 'movies',        name: 'Movies',          icon: '🎥', slug: 'movies' },
  { id: 'cars',          name: 'Cars',            icon: '🏎️', slug: 'cars' },
];

// ── Supabase REST helper ──────────────────────────────────────
async function supaQuery(table, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      console.error(`[QUERY FAIL] ${table}: ${res.status} ${res.statusText}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[QUERY ERROR] ${table}: ${err.message}`);
    return null;
  }
}

// ── Data fetchers ─────────────────────────────────────────────
async function fetchAutoDebates() {
  return supaQuery('auto_debates', 'status=eq.active&order=created_at.desc&limit=50&select=id,topic,side_a_label,side_b_label,winner,score_a,score_b,category,rounds,created_at,judge_reasoning');
}

async function fetchHotTakes(section) {
  return supaQuery('hot_takes', `section=eq.${encodeURIComponent(section)}&is_active=eq.true&order=created_at.desc&limit=20&select=id,content,section,reaction_count,challenge_count,created_at`);
}

async function fetchLeaderboard() {
  return supaQuery('profiles_public', 'order=elo_rating.desc&limit=25&select=display_name,username,elo_rating,wins,losses,level,debates_completed');
}

// ── HTML helpers ──────────────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Shared CSS ────────────────────────────────────────────────
const CSS = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Barlow+Condensed:wght@400;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{
    font-family:'Barlow Condensed',sans-serif;
    background:linear-gradient(135deg,#1a2d4a 0%,#2d5a8e 25%,#5b8abf 50%,#7aa3d4 75%,#3d5a80 100%);
    background-attachment:fixed;
    color:#fff;min-height:100vh;
    -webkit-font-smoothing:antialiased;
  }
  a{color:#d4a843;text-decoration:none}
  a:hover{text-decoration:underline}
  .container{max-width:640px;margin:0 auto;padding:16px}
  .site-header{text-align:center;padding:32px 16px 24px}
  .site-title{font-family:'Cinzel',serif;font-size:28px;font-weight:900;color:#d4a843;letter-spacing:2px;text-transform:uppercase}
  .site-subtitle{font-size:14px;color:rgba(255,255,255,0.6);margin-top:4px}
  .card{
    background:rgba(10,17,40,0.6);
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
    border:1px solid rgba(212,168,67,0.15);
    border-radius:12px;padding:16px;margin-bottom:12px;
  }
  .card-title{font-family:'Cinzel',serif;font-size:16px;color:#d4a843;margin-bottom:8px}
  .card-text{font-size:14px;line-height:1.5;color:rgba(255,255,255,0.85)}
  .card-meta{font-size:12px;color:rgba(255,255,255,0.4);margin-top:8px}
  .btn{
    display:inline-block;
    font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;
    color:#0a1128;background:#d4a843;
    padding:10px 20px;border-radius:8px;text-transform:uppercase;letter-spacing:1px;
    min-height:44px;line-height:24px;text-align:center;
  }
  .btn:hover{background:#e6be5a;text-decoration:none}
  .btn-outline{background:transparent;color:#d4a843;border:1px solid #d4a843}
  .btn-outline:hover{background:rgba(212,168,67,0.1)}
  .category-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}
  .category-card{
    background:rgba(10,17,40,0.5);border:1px solid rgba(212,168,67,0.12);
    border-radius:10px;padding:16px;text-align:center;
    min-height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;
  }
  .category-card .cat-icon{font-size:28px;margin-bottom:6px}
  .category-card .cat-name{font-family:'Cinzel',serif;font-size:13px;color:#d4a843;text-transform:uppercase;letter-spacing:1px}
  .debate-card{cursor:default}
  .debate-matchup{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0}
  .debate-side{font-weight:600;font-size:14px;flex:1}
  .debate-vs{color:#d4a843;font-family:'Cinzel',serif;font-size:12px;flex-shrink:0}
  .debate-score{display:flex;gap:12px;margin-top:8px}
  .debate-score span{font-size:13px;color:rgba(255,255,255,0.6)}
  .debate-score .winner{color:#d4a843;font-weight:700}
  .verdict-tag{display:inline-block;background:rgba(212,168,67,0.15);color:#d4a843;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;margin-top:8px;text-transform:uppercase}
  .hot-take-card{border-left:3px solid rgba(212,168,67,0.3)}
  .hot-take-card .take-text{font-size:15px;line-height:1.5}
  .hot-take-card .take-stats{font-size:12px;color:rgba(255,255,255,0.4);margin-top:6px}
  .leaderboard-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06)}
  .lb-rank{font-family:'Cinzel',serif;color:#d4a843;font-size:16px;font-weight:700;width:28px;text-align:center}
  .lb-name{flex:1;font-weight:600;font-size:14px}
  .lb-elo{font-family:'Cinzel',serif;color:#d4a843;font-size:15px;font-weight:700}
  .lb-record{font-size:12px;color:rgba(255,255,255,0.4)}
  .section-title{font-family:'Cinzel',serif;font-size:20px;color:#d4a843;margin:24px 0 12px;text-transform:uppercase;letter-spacing:1px}
  .cta-banner{text-align:center;padding:24px 16px;margin:24px 0}
  .cta-banner p{font-size:14px;color:rgba(255,255,255,0.6);margin-bottom:12px}
  .nav-bar{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;justify-content:center}
  .nav-bar a{font-size:13px;padding:6px 12px;border-radius:6px;background:rgba(10,17,40,0.4);border:1px solid rgba(212,168,67,0.1);min-height:44px;display:flex;align-items:center}
  .nav-bar a:hover{background:rgba(212,168,67,0.1);text-decoration:none}
  .footer{text-align:center;padding:32px 16px;font-size:12px;color:rgba(255,255,255,0.3)}
  .empty-state{text-align:center;padding:24px;color:rgba(255,255,255,0.4);font-size:14px}
  .ai-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(212,168,67,0.12);border:1px solid rgba(212,168,67,0.25);color:#d4a843;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px}
  .ai-badge::before{content:'🤖';font-size:13px}
</style>
`;

// ── Shared layout ─────────────────────────────────────────────
function pageHead(title, desc, ogImage) {
  const ogImg = ogImage || `${MIRROR_DOMAIN}/og-card-default.png`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(ogImg)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${MIRROR_DOMAIN}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogImg)}">
${CSS}
</head>
<body>`;
}

function siteHeader() {
  return `
<div class="site-header">
  <div class="site-title">⚔️ The Colosseum</div>
  <div class="site-subtitle">Where opinions become battles</div>
</div>`;
}

function navBar(active) {
  let html = '<nav class="nav-bar">';
  html += `<a href="/" style="${active === 'home' ? 'border-color:#d4a843' : ''}">🏠 Home</a>`;
  html += `<a href="/leaderboard.html" style="${active === 'leaderboard' ? 'border-color:#d4a843' : ''}">🏆 Leaderboard</a>`;
  html += `<a href="/arena.html" style="${active === 'arena' ? 'border-color:#d4a843' : ''}">⚔️ Arena</a>`;
  html += '</nav>';
  return html;
}

function ctaBanner(text, url) {
  const href = url || SIGNUP_URL;
  const label = url ? 'Vote Now — Free' : 'Sign Up Free';
  return `
<div class="cta-banner">
  <p>${esc(text || 'Ready to join the fight?')}</p>
  <a href="${href}" class="btn">${label}</a>
</div>`;
}

function pageFooter() {
  return `
<div class="footer">
  &copy; ${new Date().getFullYear()} The Colosseum &middot;
  <a href="${SIGNUP_URL}">Join</a> &middot;
  <a href="https://colosseum-six.vercel.app/colosseum-terms.html">Terms</a> &middot;
  <a href="https://colosseum-six.vercel.app/colosseum-privacy.html">Privacy</a>
</div>
</body>
</html>`;
}

// ── Debate card snippet ───────────────────────────────────────
function debateCard(d) {
  const winnerLabel = d.winner === 'a' ? d.side_a_label : d.side_b_label;
  return `
<a href="/debate/${esc(d.id)}.html" style="text-decoration:none;color:inherit">
<div class="card debate-card">
  <div class="card-title">${esc(d.topic)}</div>
  <div class="debate-matchup">
    <span class="debate-side">${esc(d.side_a_label)}</span>
    <span class="debate-vs">VS</span>
    <span class="debate-side" style="text-align:right">${esc(d.side_b_label)}</span>
  </div>
  <div class="debate-score">
    <span class="${d.winner === 'a' ? 'winner' : ''}">${esc(d.side_a_label)}: ${d.score_a || 0}</span>
    <span class="${d.winner === 'b' ? 'winner' : ''}">${esc(d.side_b_label)}: ${d.score_b || 0}</span>
  </div>
  <span class="verdict-tag">Winner: ${esc(winnerLabel)}</span>
  <div class="card-meta">🤖 AI Debate · ${d.category ? esc(d.category) + ' · ' : ''}${timeAgo(d.created_at)}</div>
</div>
</a>`;
}

// ── Page builders ─────────────────────────────────────────────

function buildLandingPage(debates) {
  let html = pageHead('The Colosseum — Where Opinions Become Battles', 'Live debates, hot takes, and AI-judged showdowns. Pick a side. Make your voice heard.');
  html += siteHeader();
  html += '<div class="container">';
  html += navBar('home');

  // Category grid
  html += '<div class="section-title">Arenas</div>';
  html += '<div class="category-grid">';
  for (const cat of CATEGORIES) {
    html += `<a href="/category/${cat.slug}.html" class="category-card"><span class="cat-icon">${cat.icon}</span><span class="cat-name">${esc(cat.name)}</span></a>`;
  }
  html += '</div>';

  // Featured debates
  html += '<div class="section-title">Latest Debates</div>';
  if (debates && debates.length > 0) {
    for (const d of debates.slice(0, 6)) {
      html += debateCard(d);
    }
  } else {
    html += '<div class="empty-state">Debates loading soon...</div>';
  }

  html += ctaBanner('Think you can win? Enter the arena.');
  html += '</div>';
  html += pageFooter();
  return html;
}

function buildCategoryPage(cat, takes, debates) {
  const title = `${cat.icon} ${cat.name} — The Colosseum`;
  const desc = `Hot takes and debates in ${cat.name}. Pick a side.`;
  let html = pageHead(title, desc);
  html += siteHeader();
  html += '<div class="container">';
  html += navBar('');

  html += `<div class="section-title">${cat.icon} ${esc(cat.name)}</div>`;

  // Hot takes
  if (takes && takes.length > 0) {
    html += '<div style="margin-bottom:20px">';
    for (const t of takes) {
      html += `
<div class="card hot-take-card">
  <div class="take-text">${esc(t.content)}</div>
  <div class="take-stats">🔥 ${t.reaction_count || 0} reactions · ⚔️ ${t.challenge_count || 0} challenges · ${timeAgo(t.created_at)}</div>
</div>`;
    }
    html += '</div>';
  } else {
    html += '<div class="empty-state">No hot takes yet in this arena. Be the first.</div>';
  }

  // Category debates
  const catDebates = debates ? debates.filter(d => d.category && d.category.toLowerCase() === cat.id.toLowerCase()) : [];
  if (catDebates.length > 0) {
    html += '<div class="section-title">Debates</div>';
    for (const d of catDebates.slice(0, 5)) {
      html += debateCard(d);
    }
  }

  html += ctaBanner(`Drop your hottest ${cat.name.toLowerCase()} take.`);
  html += '</div>';
  html += pageFooter();
  return html;
}

function buildDebatePage(d) {
  const winnerLabel = d.winner === 'a' ? d.side_a_label : d.side_b_label;
  const loserLabel = d.winner === 'a' ? d.side_b_label : d.side_a_label;
  const title = `${d.topic} — ${esc(winnerLabel)} wins | The Colosseum`;
  const desc = `AI judged ${esc(d.side_a_label)} vs ${esc(d.side_b_label)}. ${esc(winnerLabel)} wins ${d.score_a || 0}-${d.score_b || 0}. Do you agree? Vote now.`;

  let html = pageHead(title, desc);
  html += siteHeader();
  html += '<div class="container">';
  html += navBar('');

  // Topic
  html += `<div class="section-title">${esc(d.topic)}</div>`;
  html += '<span class="ai-badge">AI-Generated Debate — Not Real People</span>';
  if (d.category) {
    html += `<div class="card-meta" style="margin-bottom:12px">${esc(d.category)} · ${timeAgo(d.created_at)}</div>`;
  }

  // Matchup
  html += `
<div class="card">
  <div class="debate-matchup">
    <span class="debate-side" style="font-size:18px">${esc(d.side_a_label)}</span>
    <span class="debate-vs" style="font-size:16px">VS</span>
    <span class="debate-side" style="font-size:18px;text-align:right">${esc(d.side_b_label)}</span>
  </div>
</div>`;

  // Rounds
  let rounds = [];
  if (d.rounds) {
    try { rounds = typeof d.rounds === 'string' ? JSON.parse(d.rounds) : d.rounds; } catch (e) { rounds = []; }
  }
  if (rounds.length > 0) {
    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];
      html += `
<div class="card">
  <div class="card-title">Round ${i + 1}</div>
  <div style="margin-bottom:8px"><span style="color:#5b8abf;font-weight:600">${esc(d.side_a_label)}:</span> <span class="card-text">${esc(r.sideA || r.side_a || '')}</span></div>
  <div><span style="color:#bf5b5b;font-weight:600">${esc(d.side_b_label)}:</span> <span class="card-text">${esc(r.sideB || r.side_b || '')}</span></div>
</div>`;
    }
  }

  // Verdict
  html += `
<div class="card" style="border-color:rgba(212,168,67,0.3)">
  <div class="card-title">The Verdict</div>
  <div class="debate-score" style="font-size:20px;margin-bottom:8px">
    <span class="${d.winner === 'a' ? 'winner' : ''}">${esc(d.side_a_label)}: ${d.score_a || 0}</span>
    <span class="${d.winner === 'b' ? 'winner' : ''}">${esc(d.side_b_label)}: ${d.score_b || 0}</span>
  </div>
  <span class="verdict-tag" style="font-size:14px">🏆 ${esc(winnerLabel)} wins</span>
  ${d.judge_reasoning ? `<div class="card-text" style="margin-top:10px">${esc(d.judge_reasoning)}</div>` : ''}
</div>`;

  // CTA — vote / disagree
  html += ctaBanner(`Think ${esc(loserLabel)} was robbed? Cast your vote — no signup required.`, `${APP_BASE_URL}/colosseum-auto-debate.html?id=${d.id}`);
  html += '</div>';
  html += pageFooter();
  return html;
}

function buildLeaderboardPage(profiles) {
  let html = pageHead('Leaderboard — The Colosseum', 'Top debaters ranked by ELO. Who runs the arena?');
  html += siteHeader();
  html += '<div class="container">';
  html += navBar('leaderboard');

  html += '<div class="section-title">🏆 Leaderboard</div>';
  html += '<div class="card">';

  if (profiles && profiles.length > 0) {
    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i];
      html += `
<div class="leaderboard-row">
  <span class="lb-rank">${i + 1}</span>
  <div class="lb-name">${esc(p.display_name || p.username || 'Gladiator')} <span class="lb-record">${p.wins || 0}W-${p.losses || 0}L · Lv${p.level || 1}</span></div>
  <span class="lb-elo">${p.elo_rating || 1200}</span>
</div>`;
    }
  } else {
    html += '<div class="empty-state">Leaderboard populating...</div>';
  }

  html += '</div>';
  html += ctaBanner('Climb the ranks. Enter the arena.');
  html += '</div>';
  html += pageFooter();
  return html;
}

function buildArenaPage(debates) {
  let html = pageHead('Arena — The Colosseum', 'Live debates and AI showdowns happening now.');
  html += siteHeader();
  html += '<div class="container">';
  html += navBar('arena');

  html += '<div class="section-title">⚔️ Arena</div>';

  if (debates && debates.length > 0) {
    for (const d of debates.slice(0, 10)) {
      html += debateCard(d);
    }
  } else {
    html += '<div class="empty-state">No active debates right now. Start one.</div>';
  }

  html += ctaBanner('Challenge someone to a debate.');
  html += '</div>';
  html += pageFooter();
  return html;
}

// ── File writer ───────────────────────────────────────────────
function writeFile(relPath, content) {
  const fullPath = path.join(OUT_DIR, relPath);
  const dir = path.dirname(fullPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`  [BUILT] ${relPath} (${(content.length / 1024).toFixed(1)}KB)`);
}

// ── Deploy ────────────────────────────────────────────────────
function deploy() {
  if (!DEPLOY_ENABLED) {
    console.log('[DEPLOY] Skipped — DEPLOY_ENABLED is not true');
    return true;
  }
  try {
    console.log('[DEPLOY] Running wrangler pages deploy...');
    execSync(`wrangler pages deploy ${OUT_DIR} --project-name=${CLOUDFLARE_PROJECT} --branch=production`, {
      stdio: 'inherit',
      timeout: 60000,
    });
    console.log('[DEPLOY] Success');
    return true;
  } catch (err) {
    console.error(`[DEPLOY FAIL] ${err.message}`);
    return false;
  }
}

// ── Copy static assets ───────────────────────────────────────
function copyStaticAssets() {
  const ogSrc = path.join(__dirname, 'og-card-default.png');
  if (fs.existsSync(ogSrc)) {
    fs.copyFileSync(ogSrc, path.join(OUT_DIR, 'og-card-default.png'));
    console.log('  [COPY] og-card-default.png');
  }
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  console.log(`\n[MIRROR] Build started at ${new Date().toISOString()}`);

  // Clean output dir
  if (fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // ── Fetch all data ──────────────────────────────────────────
  console.log('[FETCH] Querying Supabase...');

  const [debates, leaderboard] = await Promise.all([
    fetchAutoDebates(),
    fetchLeaderboard(),
  ]);

  // Critical check: if auto_debates query failed, skip deploy (LM-045)
  if (debates === null) {
    console.error('[ABORT] Critical query failed (auto_debates). Skipping deploy. CDN serves last good build.');
    process.exit(0);
  }

  console.log(`  auto_debates: ${debates.length} rows`);
  console.log(`  leaderboard: ${leaderboard ? leaderboard.length : 0} rows`);

  // Fetch hot takes per category (non-critical — empty is fine)
  const takesByCategory = {};
  for (const cat of CATEGORIES) {
    takesByCategory[cat.id] = await fetchHotTakes(cat.id);
    const count = takesByCategory[cat.id] ? takesByCategory[cat.id].length : 0;
    console.log(`  hot_takes[${cat.id}]: ${count} rows`);
  }

  // ── Generate pages ─────────────────────────────────────────
  console.log('[BUILD] Generating HTML...');

  // 1. Landing page
  writeFile('index.html', buildLandingPage(debates));

  // 2. Category pages (all 7)
  for (const cat of CATEGORIES) {
    writeFile(`category/${cat.slug}.html`, buildCategoryPage(cat, takesByCategory[cat.id], debates));
  }

  // 3. Individual debate pages (OG tags per page — LM-052)
  for (const d of debates) {
    writeFile(`debate/${d.id}.html`, buildDebatePage(d));
  }

  // 4. Leaderboard
  writeFile('leaderboard.html', buildLeaderboardPage(leaderboard));

  // 5. Arena lobby snapshot
  writeFile('arena.html', buildArenaPage(debates));

  // 6. Static assets
  copyStaticAssets();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const pageCount = 1 + CATEGORIES.length + debates.length + 2; // landing + cats + debates + leaderboard + arena
  console.log(`[BUILD] Done — ${pageCount} pages in ${elapsed}s`);

  // ── Deploy ─────────────────────────────────────────────────
  deploy();
}

main().catch(err => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(0); // Exit 0 so PM2 doesn't rapid-restart — CDN serves last good build
});
