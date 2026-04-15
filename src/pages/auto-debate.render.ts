/**
 * auto-debate.render.ts — Auto-Debate rendering functions
 * renderDebate, loadMoreDebates, getCatIcon
 * Extracted from auto-debate.ts (Session 254 track).
 */

import { escapeHTML } from '../config.ts';
import type { AutoDebateData, AutoDebateRound } from './auto-debate.types.ts';

export function getCatIcon(cat: string): string {
  const icons: Record<string, string> = { sports: '🏟️', politics: '🏛️', entertainment: '🎬', couples: '💑', music: '🎵', movies: '🎥', general: '🔥' };
  return icons[cat] ?? icons.general ?? '🔥';
}

export function renderDebate(
  d: AutoDebateData,
  loadingEl: HTMLElement | null,
  app: HTMLElement | null,
  onMoreDebates: (id: string, category: string) => void,
): void {
  const rounds: AutoDebateRound[] = typeof d.rounds === 'string' ? JSON.parse(d.rounds) : d.rounds;
  const marginText = d.margin === 'landslide' ? 'LANDSLIDE' : d.margin === 'clear' ? 'CLEAR WIN' : 'SPLIT DECISION';
  document.title = `${d.topic} — The Moderator`;

  let html = '';

  // Badges
  html += `<div class="fade-up" style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">
    <span class="ai-badge">⚔️ AI DEBATE</span>
    <a href="/?cat=${encodeURIComponent(d.category)}" class="cat-pill" style="text-decoration:none;color:inherit;cursor:pointer;">${getCatIcon(d.category)} ${escapeHTML(d.category || 'general')}</a>
  </div>`;

  // Topic
  html += `<div class="topic-card fade-up">
    <div class="topic-text">${escapeHTML(d.topic)}</div>
    ${d.description ? `<div class="topic-desc">${escapeHTML(d.description)}</div>` : ''}
  </div>`;

  // AI badge
  html += `<div class="ai-generated-badge fade-up"><span class="ai-icon">AI</span>AI-Generated Debate — Not Real People</div>`;

  // Matchup
  html += `<div class="matchup-bar fade-up">
    <a href="/?cat=${encodeURIComponent(d.category)}" class="matchup-side side-a" style="text-decoration:none;color:inherit;cursor:pointer;">${escapeHTML(d.side_a_label)}</a>
    <div class="matchup-vs">VS</div>
    <a href="/?cat=${encodeURIComponent(d.category)}" class="matchup-side side-b" style="text-decoration:none;color:inherit;cursor:pointer;">${escapeHTML(d.side_b_label)}</a>
  </div>`;

  // Rounds
  html += `<div class="section-label fade-up">THE DEBATE</div>`;
  for (const r of rounds) {
    html += `<div class="round-card fade-up">
      <div class="round-header"><span class="round-num">Round ${escapeHTML(String(r.round))}</span></div>
      <div class="round-body">
        <div class="round-argument side-a"><span class="arg-label">${escapeHTML(d.side_a_label)}</span><span class="arg-text">${escapeHTML(r.sideA ?? r.side_a ?? '')}</span></div>
        <div class="round-argument side-b"><span class="arg-label">${escapeHTML(d.side_b_label)}</span><span class="arg-text">${escapeHTML(r.sideB ?? r.side_b ?? '')}</span></div>
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
      <div class="score-side side-a ${d.winner === 'a' ? 'winner' : ''}"><span class="score-name">${escapeHTML(d.side_a_label)}</span><span class="score-number">${Number(d.score_a) || 0}</span></div>
      <span class="score-dash">—</span>
      <div class="score-side side-b ${d.winner === 'b' ? 'winner' : ''}"><span class="score-name">${escapeHTML(d.side_b_label)}</span><span class="score-number">${Number(d.score_b) || 0}</span></div>
    </div>
    ${d.judge_reasoning ? `<div class="judge-label">JUDGE'S TAKE</div><div class="judge-take">"${escapeHTML(d.judge_reasoning)}"</div>` : ''}
  </div>`;

  // Vote
  html += `<div class="vote-section fade-up" id="vote-section">
    <div class="vote-headline">WHO ACTUALLY WON?</div>
    <div class="vote-sub">The AI got it wrong? Prove it. No signup required.</div>
    <div class="vote-row">
      <button class="vote-btn va" data-action="cast-vote" data-side="a" id="btn-a"><span class="vote-label">${escapeHTML(d.side_a_label)}</span></button>
      <button class="vote-btn vb" data-action="cast-vote" data-side="b" id="btn-b"><span class="vote-label">${escapeHTML(d.side_b_label)}</span></button>
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
    <div class="cta-sub">Join The Moderator and debate it yourself. Challenge the verdict. Build your record.</div>
    <a href="/moderator-plinko.html" class="cta-btn">ENTER THE ARENA</a>
  </div>`;

  // Share
  html += `<div class="share-bar fade-up">
    <button class="share-btn" data-action="share-debate" data-method="copy">📋 Copy Link</button>
    <button class="share-btn" data-action="share-debate" data-method="twitter">𝕏 Share</button>
    <button class="share-btn" data-action="share-debate" data-method="native">↗ Share</button>
  </div>`;

  // More Debates
  html += `<div class="more-debates fade-up" id="more-debates"></div>`;

  // Footer
  html += `<div class="footer fade-up">AI-generated debate for entertainment. Scores are deliberately provocative.<br><a href="/">The Moderator</a> · <a href="/moderator-terms.html">Terms</a></div>`;

  // Store for voting (window bridge)
  (window as unknown as Record<string, unknown>)._debate = d;
  (window as unknown as Record<string, unknown>)._rounds = rounds;

  if (loadingEl) loadingEl.style.display = 'none';
  if (app) app.innerHTML = html;

  onMoreDebates(d.id, d.category);
}

export async function loadMoreDebates(
  sb: {
    from: (table: string) => {
      select: (cols: string) => {
        neq: (col: string, val: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }> } };
        eq: (col: string, val: string) => { neq: (col: string, val: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }> } } };
      };
    };
  },
  currentId: string,
  currentCategory: string,
): Promise<void> {
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
      moreHtml += `<a href="/moderator-auto-debate.html?id=${encodeURIComponent(d.id)}" class="more-debate-card">
        <div class="more-debate-topic">${escapeHTML(d.topic)}</div>
        <div class="more-debate-matchup"><span class="mda">${escapeHTML(d.side_a_label)}</span><span class="mdvs">VS</span><span class="mdb">${escapeHTML(d.side_b_label)}</span></div>
        <div class="more-debate-meta"><span>${getCatIcon(d.category)} ${escapeHTML(d.category || 'general')}</span><span>·</span><span class="more-debate-winner">🏆 ${escapeHTML(w)}</span><span>·</span><span>${Number(d.score_a) || 0}-${Number(d.score_b) || 0}</span></div>
      </a>`;
    }
    moreContainer.innerHTML = moreHtml;
  } catch { /* non-blocking */ }
}
