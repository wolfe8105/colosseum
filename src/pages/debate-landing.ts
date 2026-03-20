/**
 * THE COLOSSEUM — Debate Landing Page Controller (TypeScript)
 *
 * Extracted from colosseum-debate-landing.html inline script.
 * Ungated entry point. Anonymous voting with fingerprint dedup.
 * SESSION 103/107: Backend persistence via landing_vote_counts RPCs.
 *
 * Migration: Session 128 (Phase 4)
 */

// Side-effect imports — ensure modules execute and set window globals
import '../config.ts';
import '../cards.ts';
import '../analytics.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface HotTake {
  author: string;
  text: string;
  fire: number;
  swords: number;
}

interface DebateEntry {
  topic: string;
  sideA: string;
  sideB: string;
  category: string;
  catIcon: string;
  catLabel: string;
  yesVotes: number;
  noVotes: number;
  takes: HotTake[];
  is_auto?: boolean;
}

// ============================================================
// INIT SUPABASE (standalone — this page uses anon client, not ColosseumAuth)
// ============================================================

const cfg = (window as unknown as Record<string, unknown>).ColosseumConfig as Record<string, string> | undefined;
const supabaseLib = (window as unknown as Record<string, { createClient: (url: string, key: string) => unknown }>).supabase;
const sb = supabaseLib.createClient(
  cfg?.SUPABASE_URL ?? 'https://faomczmipsccwbhpivmp.supabase.co',
  cfg?.SUPABASE_ANON_KEY ?? 'PASTE_YOUR_ANON_KEY_HERE'
) as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };

// ============================================================
// ESCAPE HTML
// ============================================================

function escHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ============================================================
// DEMO DEBATES (seed data — backend counts override on load)
// ============================================================

const DEBATES: Record<string, DebateEntry> = {
  'mahomes-vs-allen': {
    topic: 'Is Patrick Mahomes better than Josh Allen?',
    sideA: 'Mahomes', sideB: 'Allen',
    category: 'sports', catIcon: '🏈', catLabel: 'Sports',
    yesVotes: 847, noVotes: 762,
    takes: [
      { author: 'GridironGuru', text: 'Three rings. End of discussion. Mahomes has more hardware than Allen will ever see.', fire: 42, swords: 18 },
      { author: 'BillsMafia4Life', text: "Allen does more with less. Put him on the Chiefs and he'd have 5 rings by now.", fire: 38, swords: 31 },
      { author: 'NFLAnalytics', text: "Stats don't lie — Allen's rushing adds a dimension Mahomes can't match. Total package.", fire: 27, swords: 12 },
    ]
  },
  'caleb-downs-combine': {
    topic: 'Is Caleb Downs worth a top 10 pick in the 2026 NFL Draft?',
    sideA: 'Yes — Top 10', sideB: 'No — Reach',
    category: 'sports', catIcon: '🏈', catLabel: 'Sports',
    yesVotes: 534, noVotes: 289,
    takes: [
      { author: 'DraftSzn', text: 'Best safety prospect since Ed Reed. You take that every time.', fire: 55, swords: 8 },
      { author: 'ScoutingDept', text: 'Safety at 10 is a luxury pick. Build the trenches first.', fire: 31, swords: 22 },
    ]
  },
  'trump-tariffs': {
    topic: "Will Trump's new tariffs help or hurt the average American?",
    sideA: 'Help', sideB: 'Hurt',
    category: 'politics', catIcon: '🏛️', catLabel: 'Politics',
    yesVotes: 612, noVotes: 871,
    takes: [
      { author: 'EconWatcher', text: 'Every economist agrees: tariffs are a tax on consumers. Your groceries are about to get expensive.', fire: 63, swords: 41 },
      { author: 'MadeInUSA', text: 'Short term pain for long term gain. We need manufacturing back on American soil.', fire: 48, swords: 33 },
    ]
  },
  'beyonce-overrated': {
    topic: 'Is Beyoncé overrated?',
    sideA: 'Yes', sideB: 'No',
    category: 'entertainment', catIcon: '🎤', catLabel: 'Entertainment',
    yesVotes: 223, noVotes: 891,
    takes: [
      { author: 'MusicCritic101', text: 'Talented? Sure. Greatest of all time? The Beyhive has lost its mind.', fire: 72, swords: 88 },
      { author: 'QueenBFan', text: '28 Grammys. Most awarded artist in history. "Overrated" is cope.', fire: 94, swords: 15 },
    ]
  }
};

// ============================================================
// STATE
// ============================================================

let voteCounted = false;
const container = document.getElementById('main-container');

function getFingerprint(): string {
  let fp = localStorage.getItem('col_fp');
  if (!fp) {
    fp = 'fp_' + Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
    localStorage.setItem('col_fp', fp);
  }
  return fp;
}

const urlParams = new URLSearchParams(window.location.search);
const topicSlug = urlParams.get('topic') ?? 'mahomes-vs-allen';
const customTitle = urlParams.get('title');
const source = urlParams.get('src');

// Custom topic support
if (topicSlug && !DEBATES[topicSlug] && customTitle) {
  const catMap: Record<string, [string, string]> = {
    sports: ['🏈', 'Sports'], politics: ['🏛️', 'Politics'],
    entertainment: ['🎤', 'Entertainment'], music: ['🎵', 'Music'], trending: ['🔥', 'Trending'],
  };
  const cat = urlParams.get('cat') ?? 'trending';
  const [catIcon, catLabel] = catMap[cat] ?? ['🔥', 'Trending'];
  DEBATES[topicSlug] = {
    topic: decodeURIComponent(customTitle),
    sideA: 'Yes', sideB: 'No',
    category: cat, catIcon, catLabel,
    yesVotes: 0, noVotes: 0,
    takes: [
      { author: 'The Colosseum', text: 'This debate was started from ' + (source === 'telegram' || source === 'telegram-inline' ? 'Telegram' : 'a shared link') + '. Cast your vote and drop a hot take!', fire: 1, swords: 0 },
    ]
  };
}

const debate = DEBATES[topicSlug] ?? DEBATES['mahomes-vs-allen'];
const voteKey = 'colosseum_vote_' + topicSlug;

document.title = debate.topic + ' — The Colosseum';

// ============================================================
// RENDER
// ============================================================

function render(): void {
  if (!container) return;
  const hasVoted = !!localStorage.getItem(voteKey);
  const votedSide = localStorage.getItem(voteKey);

  let html = '';

  // Category pill
  html += `<a href="https://colosseum-six.vercel.app?cat=${encodeURIComponent(debate.category)}" class="cat-pill" style="text-decoration:none;color:inherit;cursor:pointer;"><span class="cat-icon">${escHtml(debate.catIcon)}</span>${escHtml(debate.catLabel)}</a>`;

  html += `<div class="debate-card">`;
  html += `<div class="debate-topic">${escHtml(debate.topic)}</div>`;

  if (debate.is_auto) {
    html += `<div class="ai-generated-badge"><span class="ai-icon">AI</span>AI-Generated Debate — Not Real People</div>`;
  }

  if (!hasVoted) {
    html += `<div class="vote-row">
      <button class="vote-btn yes" onclick="castVote('yes')"><span class="vote-label">${escHtml(debate.sideA)}</span><span class="vote-sub">Pick this side</span></button>
      <button class="vote-btn no" onclick="castVote('no')"><span class="vote-label">${escHtml(debate.sideB)}</span><span class="vote-sub">Pick this side</span></button>
    </div>`;
  } else {
    const yV = debate.yesVotes + (!voteCounted && votedSide === 'yes' ? 1 : 0);
    const nV = debate.noVotes + (!voteCounted && votedSide === 'no' ? 1 : 0);
    const tot = yV + nV || 1;
    const yPct = Math.round((yV / tot) * 100);
    const nPct = 100 - yPct;
    html += `<div class="vote-row">
      <button class="vote-btn yes voted ${votedSide === 'yes' ? 'winner' : ''}"><span class="vote-label">${escHtml(debate.sideA)}</span><span class="vote-sub">${votedSide === 'yes' ? '✓ Your pick' : ''}</span></button>
      <button class="vote-btn no voted ${votedSide === 'no' ? 'winner' : ''}"><span class="vote-label">${escHtml(debate.sideB)}</span><span class="vote-sub">${votedSide === 'no' ? '✓ Your pick' : ''}</span></button>
    </div>`;
    html += `<div class="results-section show">
      <div class="vote-bar-track"><div class="vote-bar-fill yes-fill" style="width:${yPct}%">${yPct}%</div><div class="vote-bar-fill no-fill" style="width:${nPct}%">${nPct}%</div></div>
      <div class="vote-count">${(yV + nV).toLocaleString()} votes</div>
    </div>`;
  }

  if (hasVoted) {
    html += `<div class="share-row">
      <button class="share-btn" onclick="shareDebate('copy')">📋 Copy Link</button>
      <button class="share-btn" onclick="shareDebate('x')">𝕏 Share</button>
      <button class="share-btn" onclick="shareDebate('native')">📤 Share</button>
      <button class="share-btn" onclick="downloadCard()">🖼️ Save Card</button>
    </div>`;
  }

  html += `</div>`;

  // Hot Takes
  if (debate.takes?.length) {
    html += `<div class="section-label">🔥 Hot Takes</div><div class="takes-list">`;
    debate.takes.forEach(t => {
      html += `<div class="take-card">
        <a href="/u/${encodeURIComponent(t.author)}" class="take-author" style="text-decoration:none;color:inherit;cursor:pointer;">@${escHtml(t.author)}</a>
        <div class="take-text">${escHtml(t.text)}</div>
        <div class="take-reactions"><span>🔥 ${Number(t.fire) || 0}</span><span>⚔️ ${Number(t.swords) || 0}</span></div>
      </div>`;
    });
    html += `</div>`;
  }

  // CTA Banner
  html += `<div class="cta-banner">
    <div class="cta-headline">⚔️ Want to debate this?</div>
    <div class="cta-sub">Sign up in 10 seconds. Argue your side. Win Elo. Earn glory.</div>
    <div class="cta-oauth-row">
      <button class="oauth-btn google" onclick="goSignup()">Google</button>
      <button class="oauth-btn apple" onclick="goSignup()">Apple</button>
    </div>
    <span class="cta-email-link" onclick="goSignup()">or use email →</span>
  </div>`;

  // More Debates
  const otherSlugs = Object.keys(DEBATES).filter(s => s !== topicSlug);
  if (otherSlugs.length) {
    html += `<div class="section-label">⚔️ More Debates</div><div class="more-debates">`;
    otherSlugs.forEach(slug => {
      const d = DEBATES[slug];
      if (!d) return;
      const dTotal = d.yesVotes + d.noVotes;
      html += `<div class="mini-debate" onclick="window.location.href='/debate?topic=${encodeURIComponent(slug)}'">
        <div class="mini-topic">${escHtml(d.topic)}</div>
        <div class="mini-meta"><span class="mini-cat">${escHtml(d.catIcon)} ${escHtml(d.catLabel)}</span><span>${dTotal.toLocaleString()} votes</span></div>
      </div>`;
    });
    html += `</div>`;
  }

  container.innerHTML = html;
}

// ============================================================
// VOTE (optimistic + backend sync)
// ============================================================

function castVote(side: string): void {
  localStorage.setItem(voteKey, side);
  voteCounted = false;
  spawnConfetti();
  render();

  sb.rpc('cast_landing_vote', { p_topic: topicSlug, p_side: side, p_fingerprint: getFingerprint() })
    .then(({ data, error }) => {
      if (error) { console.warn('Landing vote RPC error:', error.message); return; }
      const d = data as { yes_votes?: number; no_votes?: number } | null;
      if (d && typeof d.yes_votes === 'number') {
        debate.yesVotes = d.yes_votes;
        debate.noVotes = d.no_votes ?? 0;
        voteCounted = true;
        render();
      }
    })
    .catch((err: unknown) => { console.warn('Landing vote network error:', err); });
}

// ============================================================
// BACKEND COUNTS
// ============================================================

async function loadBackendCounts(): Promise<void> {
  try {
    const allTopics = Object.keys(DEBATES);
    const { data, error } = await sb.rpc('get_landing_votes', { p_topics: allTopics });
    if (error || !data) return;

    const counts = data as Record<string, { yes_votes: number; no_votes: number }>;
    for (const [slug, c] of Object.entries(counts)) {
      if (DEBATES[slug]) {
        DEBATES[slug].yesVotes = Number(c.yes_votes) || 0;
        DEBATES[slug].noVotes = Number(c.no_votes) || 0;
      }
    }

    if (localStorage.getItem(voteKey)) voteCounted = true;
    render();
  } catch (err) {
    console.warn('Failed to load backend vote counts:', err);
  }
}

// ============================================================
// CONFETTI
// ============================================================

function spawnConfetti(): void {
  const colors = ['#d4a843', '#cc2936', '#2ecc71', '#5b8abf', '#f0f0f0', '#e63946'];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = (Math.random() * 30 - 10) + 'vh';
    el.style.background = colors[Math.floor(Math.random() * colors.length)] ?? '#d4a843';
    el.style.animationDelay = (Math.random() * 0.4) + 's';
    el.style.animationDuration = (0.8 + Math.random() * 0.6) + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
}

// ============================================================
// SHARE
// ============================================================

function shareDebate(method: string): void {
  const url = window.location.href;
  const text = `${debate.topic} — Cast your vote!`;

  if (method === 'copy') {
    navigator.clipboard.writeText(url).then(() => showToast('Link copied!')).catch(() => showToast('Could not copy'));
  } else if (method === 'x') {
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
  } else if (method === 'native') {
    if (navigator.share) {
      navigator.share({ title: debate.topic, text, url }).catch(() => { /* cancelled */ });
    } else {
      navigator.clipboard.writeText(url).then(() => showToast('Link copied!')).catch(() => { /* fallback */ });
    }
  }
}

function downloadCard(): void {
  const cards = window.ColosseumCards as unknown as Record<string, unknown> | undefined;
  const dlCard = cards?.downloadCard as ((opts: Record<string, unknown>) => void) | undefined;
  if (dlCard) {
    const votedSide = localStorage.getItem(voteKey);
    const yV = debate.yesVotes + (!voteCounted && votedSide === 'yes' ? 1 : 0);
    const nV = debate.noVotes + (!voteCounted && votedSide === 'no' ? 1 : 0);
    dlCard({ topic: debate.topic, sideA: debate.sideA, sideB: debate.sideB, yesVotes: yV, noVotes: nV, size: 'og' });
  } else {
    showToast('Card generator not loaded');
  }
}

function showToast(msg: string): void {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(10,17,40,0.95);color:#f0f0f0;padding:10px 20px;border-radius:10px;font-family:var(--font-body);font-size:14px;font-weight:600;z-index:9999;border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(10px);';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function goSignup(): void {
  window.location.href = 'colosseum-plinko.html';
}

// ============================================================
// EXPOSE TO ONCLICK HANDLERS (used in dynamic innerHTML)
// ============================================================

const win = window as unknown as Record<string, unknown>;
win.castVote = castVote;
win.shareDebate = shareDebate;
win.downloadCard = downloadCard;
win.goSignup = goSignup;

// ============================================================
// INIT
// ============================================================

render();
loadBackendCounts();
