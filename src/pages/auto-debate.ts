/**
 * THE COLOSSEUM — Auto-Debate Page Controller (TypeScript)
 *
 * Extracted from colosseum-auto-debate.html inline script.
 * AI vs AI debate page. Ungated voting with fingerprint dedup.
 * Rage-click funnel, More Debates discovery section (E279/E280).
 *
 * Migration: Session 128 (Phase 4)
 */

// ES imports (replaces window globals)
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.ts';
import { claimVote } from '../tokens.ts';
import { shareCard } from '../cards.ts';
import '../analytics.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface AutoDebateRound {
  round: number;
  sideA?: string;
  side_a?: string;
  sideB?: string;
  side_b?: string;
}

interface AutoDebateData {
  id: string;
  topic: string;
  description?: string;
  side_a_label: string;
  side_b_label: string;
  side_a?: string;
  side_b?: string;
  winner: 'a' | 'b';
  score_a: number;
  score_b: number;
  margin: string;
  category: string;
  rounds: string | AutoDebateRound[];
  judge_reasoning?: string;
  share_hook?: string;
  votes_a: number;
  votes_b: number;
  vote_count: number;
  yes_votes?: number;
  no_votes?: number;
  is_auto?: boolean;
}

// ============================================================
// INIT
// ============================================================

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => { single: () => Promise<{ data: unknown; error: unknown }> };
      neq: (col: string, val: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }> } };
      order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } };
    };
  };
};

const app = document.getElementById('app');
const loadingEl = document.getElementById('loading');

const urlParams = new URLSearchParams(window.location.search);
const debateId = urlParams.get('id');

// UUID validation
if (debateId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(debateId)) {
  if (app) app.innerHTML = '<div style="text-align:center;padding:40px;color:#cc2936;font-size:16px;">Invalid debate link.</div>';
  if (loadingEl) loadingEl.style.display = 'none';
} else if (!debateId) {
  // No ID — fetch latest and redirect
  (async () => {
    try {
      const { data } = await sb.from('auto_debates').select('id').order('created_at', { ascending: false }).limit(1).single();
      if (data?.id) {
        window.location.replace('/colosseum-auto-debate.html?id=' + data.id);
      } else {
        showError('No debates yet. Check back soon.');
      }
    } catch {
      showError('No debates yet. Check back soon.');
    }
  })();
} else {
  loadDebate();
}

// ============================================================
// HELPERS
// ============================================================

function escHtml(str: unknown): string {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getCatIcon(cat: string): string {
  const icons: Record<string, string> = { sports: '🏟️', politics: '🏛️', entertainment: '🎬', couples: '💑', music: '🎵', movies: '🎥', general: '🔥' };
  return icons[cat] ?? icons.general ?? '🔥';
}

function showError(msg: string): void {
  if (loadingEl) loadingEl.style.display = 'none';
  if (app) app.innerHTML = `<div class="error-state">❌ ${escHtml(msg)}</div>
    <div style="text-align:center;margin-top:20px"><a href="/" class="join-btn">Go to The Colosseum</a></div>`;
}

function getFingerprint(): string {
  let fp = localStorage.getItem('col_fp');
  if (!fp) {
    fp = 'fp_' + Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
    localStorage.setItem('col_fp', fp);
  }
  return fp;
}

// ============================================================
// LOAD DEBATE
// ============================================================

async function loadDebate(): Promise<void> {
  if (!debateId) return;
  try {
    const { data, error } = await sb.from('auto_debates').select('*').eq('id', debateId).single();
    if (error || !data) { showError('Debate not found or has been removed.'); return; }

    // Track view
    try { await sb.rpc('log_event', { p_event_type: 'debate_view', p_metadata: { debate_id: debateId, debate_topic: (data as AutoDebateData).topic ?? null } }); } catch { /* non-blocking */ }

    renderDebate(data as AutoDebateData);
  } catch {
    showError('Failed to load debate. Please try again.');
  }
}

// ============================================================
// RENDER
// ============================================================

function renderDebate(d: AutoDebateData): void {
  const rounds: AutoDebateRound[] = typeof d.rounds === 'string' ? JSON.parse(d.rounds) : d.rounds;
  const marginText = d.margin === 'landslide' ? 'LANDSLIDE' : d.margin === 'clear' ? 'CLEAR WIN' : 'SPLIT DECISION';
  document.title = `${d.topic} — The Colosseum`;

  let html = '';

  // Badges
  html += `<div class="fade-up" style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">
    <span class="ai-badge">⚔️ AI DEBATE</span>
    <a href="/?cat=${encodeURIComponent(d.category)}" class="cat-pill" style="text-decoration:none;color:inherit;cursor:pointer;">${getCatIcon(d.category)} ${escHtml(d.category || 'general')}</a>
  </div>`;

  // Topic
  html += `<div class="topic-card fade-up">
    <div class="topic-text">${escHtml(d.topic)}</div>
    ${d.description ? `<div class="topic-desc">${escHtml(d.description)}</div>` : ''}
  </div>`;

  // AI badge
  html += `<div class="ai-generated-badge fade-up"><span class="ai-icon">AI</span>AI-Generated Debate — Not Real People</div>`;

  // Matchup
  html += `<div class="matchup-bar fade-up">
    <a href="/?cat=${encodeURIComponent(d.category)}" class="matchup-side side-a" style="text-decoration:none;color:inherit;cursor:pointer;">${escHtml(d.side_a_label)}</a>
    <div class="matchup-vs">VS</div>
    <a href="/?cat=${encodeURIComponent(d.category)}" class="matchup-side side-b" style="text-decoration:none;color:inherit;cursor:pointer;">${escHtml(d.side_b_label)}</a>
  </div>`;

  // Rounds
  html += `<div class="section-label fade-up">THE DEBATE</div>`;
  for (const r of rounds) {
    html += `<div class="round-card fade-up">
      <div class="round-header"><span class="round-num">Round ${escHtml(String(r.round))}</span></div>
      <div class="round-body">
        <div class="round-argument side-a"><span class="arg-label">${escHtml(d.side_a_label)}</span><span class="arg-text">${escHtml(r.sideA ?? r.side_a ?? '')}</span></div>
        <div class="round-argument side-b"><span class="arg-label">${escHtml(d.side_b_label)}</span><span class="arg-text">${escHtml(r.sideB ?? r.side_b ?? '')}</span></div>
      </div>
    </div>`;
  }

  // Scoreboard
  const safeMargin = ['close', 'clear', 'landslide'].includes(d.margin) ? d.margin : 'close';
  html += `<div class="section-label fade-up">THE VERDICT</div>`;
  html += `<div class="scoreboard fade-up">
    <div class="score-label">AI JUDGE SCORECARD</div>
    <span class="margin-pill ${safeMargin}">${marginText}</span>
    <div class="score-row">
      <div class="score-side side-a ${d.winner === 'a' ? 'winner' : ''}"><span class="score-name">${escHtml(d.side_a_label)}</span><span class="score-number">${Number(d.score_a) || 0}</span></div>
      <span class="score-dash">—</span>
      <div class="score-side side-b ${d.winner === 'b' ? 'winner' : ''}"><span class="score-name">${escHtml(d.side_b_label)}</span><span class="score-number">${Number(d.score_b) || 0}</span></div>
    </div>
    ${d.judge_reasoning ? `<div class="judge-label">JUDGE'S TAKE</div><div class="judge-take">"${escHtml(d.judge_reasoning)}"</div>` : ''}
  </div>`;

  // Vote
  html += `<div class="vote-section fade-up" id="vote-section">
    <div class="vote-headline">WHO ACTUALLY WON?</div>
    <div class="vote-sub">The AI got it wrong? Prove it. No signup required.</div>
    <div class="vote-row">
      <button class="vote-btn va" onclick="castVote('a')" id="btn-a"><span class="vote-label">${escHtml(d.side_a_label)}</span></button>
      <button class="vote-btn vb" onclick="castVote('b')" id="btn-b"><span class="vote-label">${escHtml(d.side_b_label)}</span></button>
    </div>
    <div class="results-section" id="results">
      <div class="vote-bar-track"><div class="vote-bar-fill a-fill" id="bar-a" style="width:50%">50%</div><div class="vote-bar-fill b-fill" id="bar-b" style="width:50%">50%</div></div>
      <div class="vote-count" id="vote-count"></div>
      <div class="disagree-label" id="disagree-label"></div>
    </div>
  </div>`;

  // CTA
  html += `<div class="cta-banner fade-up">
    <div class="cta-headline">THINK THE AI IS WRONG?</div>
    <div class="cta-sub">Join The Colosseum and debate it yourself. Challenge the verdict. Build your record.</div>
    <a href="/colosseum-plinko.html" class="cta-btn">ENTER THE ARENA</a>
  </div>`;

  // Share
  html += `<div class="share-bar fade-up">
    <button class="share-btn" onclick="shareDebate('copy')">📋 Copy Link</button>
    <button class="share-btn" onclick="shareDebate('twitter')">𝕏 Share</button>
    <button class="share-btn" onclick="shareDebate('native')">↗ Share</button>
  </div>`;

  // More Debates
  html += `<div class="more-debates fade-up" id="more-debates"></div>`;

  // Footer
  html += `<div class="footer fade-up">AI-generated debate for entertainment. Scores are deliberately provocative.<br><a href="/">The Colosseum</a> · <a href="/colosseum-terms.html">Terms</a></div>`;

  // Store for voting
  (window as unknown as Record<string, unknown>)._debate = d;
  (window as unknown as Record<string, unknown>)._rounds = rounds;

  if (loadingEl) loadingEl.style.display = 'none';
  if (app) app.innerHTML = html;

  loadMoreDebates(d.id, d.category);
}

// ============================================================
// MORE DEBATES (E279/E280)
// ============================================================

async function loadMoreDebates(currentId: string, currentCategory: string): Promise<void> {
  try {
    const { data, error } = await sb.from('auto_debates').select('id,topic,side_a_label,side_b_label,winner,score_a,score_b,category,created_at').eq('status', 'active').neq('id', currentId).order('created_at', { ascending: false }).limit(20);
    if (error || !data || data.length === 0) return;

    type MoreDebate = { id: string; topic: string; side_a_label: string; side_b_label: string; winner: string; score_a: number; score_b: number; category: string };
    const items = data as MoreDebate[];
    const sameCat = items.filter(d => d.category === currentCategory);
    const otherCat = items.filter(d => d.category !== currentCategory);
    const sorted = [...sameCat, ...otherCat].slice(0, 6);

    const moreContainer = document.getElementById('more-debates');
    if (!moreContainer || sorted.length === 0) return;

    let moreHtml = '<div class="section-label">MORE DEBATES</div>';
    for (const d of sorted) {
      const w = d.winner === 'a' ? d.side_a_label : d.side_b_label;
      moreHtml += `<a href="/colosseum-auto-debate.html?id=${encodeURIComponent(d.id)}" class="more-debate-card">
        <div class="more-debate-topic">${escHtml(d.topic)}</div>
        <div class="more-debate-matchup"><span class="mda">${escHtml(d.side_a_label)}</span><span class="mdvs">VS</span><span class="mdb">${escHtml(d.side_b_label)}</span></div>
        <div class="more-debate-meta"><span>${getCatIcon(d.category)} ${escHtml(d.category || 'general')}</span><span>·</span><span class="more-debate-winner">🏆 ${escHtml(w)}</span><span>·</span><span>${Number(d.score_a) || 0}-${Number(d.score_b) || 0}</span></div>
      </a>`;
    }
    moreContainer.innerHTML = moreHtml;
  } catch { /* non-blocking */ }
}

// ============================================================
// VOTE
// ============================================================

function showResults(votesA: number, votesB: number, total: number, aiWinner: string, _userVote: string): void {
  const results = document.getElementById('results');
  if (results) results.classList.add('show');

  const t = votesA + votesB || 1;
  const pctA = Math.round((votesA / t) * 100);
  const pctB = 100 - pctA;

  const barA = document.getElementById('bar-a');
  const barB = document.getElementById('bar-b');
  if (barA) { barA.style.width = pctA + '%'; barA.textContent = pctA + '%'; }
  if (barB) { barB.style.width = pctB + '%'; barB.textContent = pctB + '%'; }

  const countEl = document.getElementById('vote-count');
  if (countEl) countEl.textContent = `${total} vote${total !== 1 ? 's' : ''} cast`;

  const audienceWinner = votesA > votesB ? 'a' : 'b';
  const label = document.getElementById('disagree-label');
  if (label) {
    label.textContent = audienceWinner !== aiWinner
      ? '🔥 THE PEOPLE DISAGREE WITH THE AI'
      : 'The audience agrees with the AI... for now.';
  }
}

async function castVoteImpl(side: string): Promise<void> {
  const d = (window as unknown as Record<string, unknown>)._debate as AutoDebateData | undefined;
  if (!d) return;

  const btnA = document.getElementById('btn-a');
  const btnB = document.getElementById('btn-b');
  btnA?.classList.add('voted');
  btnB?.classList.add('voted');
  if (side === 'a') btnA?.classList.add('winner');
  if (side === 'b') btnB?.classList.add('winner');

  try {
    const { data } = await sb.rpc('cast_auto_debate_vote', {
      p_debate_id: d.id, p_fingerprint: getFingerprint(), p_voted_for: side, p_user_id: null,
    });
    const result = data as { error?: boolean; success?: boolean; votes_a?: number; votes_b?: number; vote_count?: number } | null;

    if (result?.error) {
      showResults(d.votes_a, d.votes_b, d.vote_count, d.winner, side);
      return;
    }
    if (result?.success) {
      showResults(result.votes_a ?? 0, result.votes_b ?? 0, result.vote_count ?? 0, d.winner, side);
      claimVote(d.id);
    } else {
      showResults(d.votes_a + (side === 'a' ? 1 : 0), d.votes_b + (side === 'b' ? 1 : 0), d.vote_count + 1, d.winner, side);
    }
  } catch {
    showResults(d.votes_a + (side === 'a' ? 1 : 0), d.votes_b + (side === 'b' ? 1 : 0), d.vote_count + 1, d.winner, side);
  }
}

// ============================================================
// SHARE
// ============================================================

function shareDebateImpl(method: string): void {
  const d = (window as unknown as Record<string, unknown>)._debate as AutoDebateData | undefined;
  if (!d) return;
  const url = window.location.href;
  const text = d.share_hook ?? `AI judged this debate: "${d.topic}" — the result is wild.`;

  if (method === 'copy') {
    navigator.clipboard.writeText(url).then(() => {
      // Attempt to update button text
      const btn = document.querySelector('.share-bar .share-btn:first-child') as HTMLElement | null;
      if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy Link'; }, 2000); }
    }).catch(() => { /* fallback */ });
  } else if (method === 'twitter') {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  } else if (method === 'native') {
    if (d.yes_votes !== undefined) {
      shareCard({ topic: d.topic, sideA: d.side_a ?? 'Side A', sideB: d.side_b ?? 'Side B', yesVotes: d.yes_votes ?? 0, noVotes: d.no_votes ?? 0, size: 'og' });
    } else if (navigator.share) {
      navigator.share({ title: d.topic, text, url }).catch(() => { /* cancelled */ });
    } else {
      navigator.clipboard.writeText(url).catch(() => { /* fallback */ });
    }
  }
}

// ============================================================
// EXPOSE TO ONCLICK
// ============================================================

const win = window as unknown as Record<string, unknown>;
win.castVote = castVoteImpl;
win.shareDebate = shareDebateImpl;
