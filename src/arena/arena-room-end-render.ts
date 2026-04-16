// arena-room-end-render.ts — post-debate screen HTML + event wiring.
// Delegates after-effects rendering and transcript overlay to sibling modules.

import { getCurrentUser, getCurrentProfile, declareRival, showUserProfile } from '../auth.ts';
import { escapeHTML, showToast } from '../config.ts';
import { shareResult } from '../share.ts';
import { nudge } from '../nudge.ts';
import { screenEl, set_selectedRanked } from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import type { AIScoreResult } from './arena-types-ai-scoring.ts';
import type { EndOfDebateBreakdown } from './arena-types-results.ts';
import { enterQueue } from './arena-queue.ts';
import { renderModScoring } from './arena-mod-scoring.ts';
import { renderAIScorecard } from './arena-room-ai-scoring.ts';
import { injectAdSlot } from './arena-ads.ts';
import { renderAfterEffects } from './arena-room-end-after-effects.ts';
import { attachTranscriptHandler } from './arena-room-end-transcript.ts';

export interface PostDebateContext {
  scoreA: number;
  scoreB: number;
  winner: string;
  aiScores: AIScoreResult | null;
  eloChangeMe: number;
  endOfDebateBreakdown: EndOfDebateBreakdown | null;
  myName: string;
}

export function renderPostDebate(debate: CurrentDebate, ctx: PostDebateContext): void {
  const { scoreA, scoreB, winner, aiScores, eloChangeMe, endOfDebateBreakdown, myName } = ctx;
  const isDraw = winner === 'draw';
  const didWin = !isDraw && winner === debate.role;

  const eloSign = eloChangeMe >= 0 ? '+' : '';
  const eloClass = eloChangeMe > 0 ? 'positive' : eloChangeMe < 0 ? 'negative' : 'neutral';
  const eloHtml = debate.ruleset === 'unplugged'
    ? '<div class="arena-elo-change neutral">\uD83C\uDFB8 Unplugged \u2014 No Rating Change</div>'
    : debate.ranked
      ? `<div class="arena-elo-change ${eloClass}">${eloSign}${eloChangeMe} ELO</div>`
      : `<div class="arena-elo-change neutral">Casual \u2014 No Rating Change</div>`;

  if (screenEl) screenEl.innerHTML = '';
  const post = document.createElement('div');
  post.className = 'arena-post arena-fade-in';
  post.innerHTML = `
    <div class="arena-rank-badge ${debate.ruleset === 'unplugged' ? 'unplugged' : debate.ranked ? 'ranked' : 'casual'}">${debate.ruleset === 'unplugged' ? '\uD83C\uDFB8 UNPLUGGED' : debate.ranked ? '\u2694\uFE0F RANKED' : '\uD83C\uDF7A CASUAL'}</div>
    <div class="arena-post-verdict">${isDraw ? '\uD83E\uDD1D' : didWin ? '\uD83C\uDFC6' : '\uD83D\uDC80'}</div>
    <div class="arena-post-title">${isDraw ? 'DRAW' : didWin ? 'VICTORY' : 'DEFEAT'}</div>
    ${eloHtml}
    ${debate._stakingResult && debate._stakingResult.payout != null ? `
    <div class="arena-staking-result">
      <div class="arena-staking-result-title">\uD83E\uDE99 STAKING RESULTS</div>
      <div class="arena-staking-result-amount ${debate._stakingResult.payout > 0 ? 'won' : debate._stakingResult.payout < 0 ? 'lost' : 'none'}">
        ${debate._stakingResult.payout > 0 ? '+' : ''}${debate._stakingResult.payout} tokens
      </div>
    </div>` : ''}
    <div class="arena-post-topic">${escapeHTML(debate.topic)}</div>
    <div class="arena-post-score">
      <div class="arena-post-side">
        <div class="arena-post-side-label">${escapeHTML(myName)}</div>
        <div class="arena-post-side-score ${isDraw ? 'neutral' : debate.role === winner ? 'winner' : 'loser'}">${Number(debate.role === 'a' ? scoreA : scoreB)}</div>
      </div>
      <div class="arena-post-divider">\u2014</div>
      <div class="arena-post-side">
        <div class="arena-post-side-label${debate.opponentId ? ' arena-clickable-opp' : ''}" ${debate.opponentId ? `data-opp-id="${escapeHTML(debate.opponentId)}"` : ''}>${escapeHTML(debate.opponentName)}</div>
        <div class="arena-post-side-score ${isDraw ? 'neutral' : debate.role !== winner ? 'winner' : 'loser'}">${Number(debate.role === 'a' ? scoreB : scoreA)}</div>
      </div>
    </div>
    ${aiScores ? renderAIScorecard(myName, debate.opponentName, debate.role, aiScores) : ''}
    ${renderAfterEffects(endOfDebateBreakdown, debate.role ?? 'a')}
    ${debate.opponentId && debate.mode !== 'ai' ? `
    <div class="arena-post-actions" style="margin-bottom:0">
      <button class="arena-post-btn secondary" id="arena-add-rival">\u2694\uFE0F ADD RIVAL</button>
    </div>` : ''}
    <div class="arena-post-actions">
      <button class="arena-post-btn primary" id="arena-rematch">\u2694\uFE0F REMATCH</button>
      <button class="arena-post-btn secondary" id="arena-share-result">\uD83D\uDD17 SHARE</button>
      ${debate.messages && debate.messages.length > 0 ? '<button class="arena-post-btn secondary" id="arena-transcript">\uD83D\uDCDD TRANSCRIPT</button>' : ''}
      <button class="arena-post-btn secondary" id="arena-back-to-lobby">\u2190 LOBBY</button>
    </div>
  `;
  screenEl?.appendChild(post);

  // F-43 Slot 1: Final score reveal ad
  // LANDMINE [LM-END-006]: injectAdSlot(post) is called twice on the same container (here and after renderModScoring). Verify intent.
  injectAdSlot(post);

  // FIX 1: Post-debate moderator recruitment nudge
  if (getCurrentUser() && getCurrentProfile()?.is_moderator !== true) {
    nudge('become_moderator_post_debate', '\uD83E\uDDD1\u200D\u2696\uFE0F Think you could call it better? Become a Moderator \u2192 Settings');
  }

  // Session 39: Moderator scoring section
  if (debate.moderatorId && debate.moderatorName) {
    renderModScoring(debate, post);
  }

  // F-43 Slot 2: Debater scorecard / post-verdict ad
  // LANDMINE [LM-END-006]: second injectAdSlot(post) call — same container as above. Verify intent.
  injectAdSlot(post, { marginTop: '8px' });

  document.getElementById('arena-rematch')?.addEventListener('click', () => {
    set_selectedRanked(debate.ranked || false);
    enterQueue(debate.mode, debate.topic);
  });

  document.getElementById('arena-share-result')?.addEventListener('click', () => {
    shareResult({
      debateId: debate.id,
      topic: debate.topic,
      winner: isDraw ? 'Draw' : didWin ? myName : debate.opponentName,
      spectators: 0,
    });
  });

  document.getElementById('arena-back-to-lobby')?.addEventListener('click', async () => {
    const { renderLobby } = await import('./arena-lobby.ts');
    renderLobby();
  });

  // Add as Rival
  document.getElementById('arena-add-rival')?.addEventListener('click', async () => {
    if (!debate.opponentId) return;
    const btn = document.getElementById('arena-add-rival') as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = '\u23F3 Adding...'; }
    try {
      const result = await declareRival(debate.opponentId);
      if (result && !result.error) {
        if (btn) btn.textContent = '\u2705 RIVAL ADDED';
        showToast('\u2694\uFE0F Rival declared!', 'success');
      } else {
        if (btn) { btn.textContent = '\u2694\uFE0F ADD RIVAL'; btn.disabled = false; }
        showToast('Could not add rival', 'error');
      }
    } catch {
      if (btn) { btn.textContent = '\u2694\uFE0F ADD RIVAL'; btn.disabled = false; }
    }
  });

  // Tap opponent name → profile modal
  post.querySelector('.arena-clickable-opp')?.addEventListener('click', () => {
    if (!debate.opponentId) return;
    void showUserProfile(debate.opponentId);
  });

  attachTranscriptHandler(debate);
}
