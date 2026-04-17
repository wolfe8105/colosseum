/**
 * THE MODERATOR — Spectate Render
 *
 * Refactored: messages → spectate.render-messages.ts,
 * timeline → spectate.render-timeline.ts.
 */

import { state } from './spectate.state.ts';
import { escHtml, renderAvatar, modeLabel, statusBadge } from './spectate.utils.ts';
import { wireVoteButtons, updateVoteBar } from './spectate.vote.ts';
import { wireChatUI, renderChatMessages } from './spectate.chat.ts';
import { wireShareButtons } from './spectate.share.ts';
import { renderTimeline } from './spectate.render-timeline.ts';
import type { SpectateDebate, DebateMessage, AISideScores } from './spectate.types.ts';

export { renderMessages } from './spectate.render-messages.ts';

export function showError(msg: string): void {
  if (state.loading) state.loading.style.display = 'none';
  if (state.app) state.app.innerHTML = '<div class="error-state">' + escHtml(msg) + '<br><a href="/" style="color:var(--gold);margin-top:12px;display:inline-block;">Back to Home</a></div>';
}

export function renderSpectateView(d: SpectateDebate, messages: DebateMessage[]): void {
  if (state.loading) state.loading.style.display = 'none';
  const isLive = d.status === 'live' || d.status === 'pending' || d.status === 'round_break' || d.status === 'voting';
  let html = '';

  html += '<div class="fade-up" style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;justify-content:center;">';
  html += statusBadge(d.status);
  html += '<span class="mode-badge">' + modeLabel(d.mode) + '</span></div>';

  html += '<div class="topic-card fade-up"><div class="topic-text">' + escHtml(d.topic) + '</div></div>';

  html += '<div class="vs-bar fade-up">';
  html += '<div class="vs-debater">' + renderAvatar(d.debater_a_avatar, d.debater_a_name ?? '', 'side-a');
  html += '<div><div class="vs-name">' + escHtml(d.debater_a_name) + '</div><div class="vs-elo">' + Number(d.debater_a_elo) + ' ELO</div></div></div>';
  html += '<div class="vs-text">VS</div>';
  html += '<div class="vs-debater right">' + renderAvatar(d.debater_b_avatar, d.debater_b_name ?? '', 'side-b');
  html += '<div><div class="vs-name">' + escHtml(d.debater_b_name) + '</div><div class="vs-elo">' + Number(d.debater_b_elo) + ' ELO</div></div></div></div>';

  if (d.moderator_type && d.moderator_type !== 'none') {
    const modLabel = d.moderator_type === 'ai' ? 'AI Moderator' : escHtml(d.moderator_name || 'Human Moderator');
    html += '<div class="mod-bar fade-up">\u2696\uFE0F Moderated by ' + modLabel + '</div>';
  }

  html += '<div class="info-bar fade-up"><span><span class="eye">\uD83D\uDC41\uFE0F</span> <span id="spectator-count">' + (Number(d.spectator_count) || 1) + '</span> watching</span>';
  if (d.current_round && d.total_rounds) html += '<span>\u00B7</span><span>Round ' + Number(d.current_round) + '/' + Number(d.total_rounds) + '</span>';
  html += '</div>';

  const va = Number(d.vote_count_a) || 0;
  const vb = Number(d.vote_count_b) || 0;
  const totalVotes = va + vb;
  html += '<div class="pulse-gauge fade-up" id="pulse-gauge"><div class="pulse-label">AUDIENCE PULSE</div>';
  html += '<div class="pulse-track">';
  if (totalVotes > 0) {
    const pctA = Math.round((va / totalVotes) * 100);
    html += '<div class="pulse-fill-a" id="pulse-a" style="width:' + pctA + '%">' + pctA + '%</div><div class="pulse-fill-b" id="pulse-b" style="width:' + (100 - pctA) + '%">' + (100 - pctA) + '%</div>';
  } else {
    html += '<div class="pulse-fill-a" id="pulse-a" style="width:50%">\u2014</div><div class="pulse-fill-b" id="pulse-b" style="width:50%">\u2014</div></div><div class="pulse-empty">Vote to move the gauge';
  }
  html += '</div><div class="pulse-names"><span>' + escHtml(d.debater_a_name) + '</span><span>' + escHtml(d.debater_b_name) + '</span></div></div>';

  if (isLive) html += '<div class="live-indicator fade-up"><span class="pulse"></span> Auto-updating every 5s</div>';

  html += '<div class="messages fade-up" id="messages">';
  const hasSpeechReplay = (state.replayData?.speech_events?.length ?? 0) > 0;
  if (messages.length === 0 && !hasSpeechReplay) {
    html += '<div class="msg-empty">No messages yet. The debate is getting started...</div>';
  } else {
    html += renderTimeline(messages, d);
  }
  html += '</div>';

  html += '<div class="spec-chat fade-up" id="spec-chat">';
  html += '<div class="spec-chat-header" id="spec-chat-header"><span class="spec-chat-title">SPECTATOR CHAT <span class="spec-chat-count" id="chat-count">' + (state.chatMessages.length > 0 ? '(' + state.chatMessages.length + ')' : '') + '</span></span>';
  html += '<span class="spec-chat-toggle' + (state.chatOpen ? ' open' : '') + '" id="chat-toggle">\u25BC</span></div>';
  html += '<div class="spec-chat-body' + (state.chatOpen ? ' open' : '') + '" id="spec-chat-body"><div class="spec-chat-messages" id="spec-chat-messages">';
  html += state.chatMessages.length === 0 ? '<div class="spec-chat-empty">No messages yet. Be the first to react!</div>' : renderChatMessages(state.chatMessages);
  html += '</div>';
  html += state.isLoggedIn
    ? '<div class="spec-chat-input" id="chat-input-row"><input type="text" id="chat-input" placeholder="Say something..." maxlength="280" autocomplete="off"><button id="chat-send">SEND</button></div>'
    : '<div class="spec-chat-login"><a href="/moderator-login.html">Log in</a> to chat</div>';
  html += '</div></div>';

  if ((d.status === 'complete' || d.status === 'completed') && d.score_a != null) {
    const winnerSide = d.winner;
    html += '<div class="scoreboard fade-up"><div class="score-label">FINAL SCORE</div><div class="score-row">';
    html += '<div class="score-side ' + (winnerSide === 'a' ? 'winner' : '') + '"><span class="score-name">' + escHtml(d.debater_a_name) + '</span><span>' + Number(d.score_a) + '</span></div>';
    html += '<span class="score-dash">\u2014</span>';
    html += '<div class="score-side ' + (winnerSide === 'b' ? 'winner' : '') + '"><span class="score-name">' + escHtml(d.debater_b_name) + '</span><span>' + Number(d.score_b) + '</span></div>';
    html += '</div></div>';
  }

  if ((d.status === 'complete' || d.status === 'completed') && d.moderator_type === 'human' && d.moderator_name && state.replayData && state.replayData.mod_scores.length > 0) {
    html += '<div class="mod-rating-section fade-up"><div class="mod-rating-title">\u2696\uFE0F MODERATOR RATING</div><div class="mod-rating-name">' + escHtml(d.moderator_name) + '</div>';
    const debaterScores = state.replayData.mod_scores.filter(s => s.scorer_role === 'debater');
    const spectatorScores = state.replayData.mod_scores.filter(s => s.scorer_role === 'spectator');
    if (debaterScores.length > 0) {
      html += '<div class="mod-rating-group"><div class="mod-rating-group-label">Debater Ratings</div>';
      for (const s of debaterScores) {
        const verdict = s.score >= 25 ? '\uD83D\uDC4D FAIR' : '\uD83D\uDC4E UNFAIR';
        html += '<div class="mod-rating-row"><span class="mod-rating-scorer">' + escHtml(s.scorer_name) + '</span><span class="mod-rating-verdict ' + (s.score >= 25 ? 'fair' : 'unfair') + '">' + verdict + '</span></div>';
      }
      html += '</div>';
    }
    if (spectatorScores.length > 0) {
      const avgScore = Math.round(spectatorScores.reduce((sum, s) => sum + s.score, 0) / spectatorScores.length);
      html += '<div class="mod-rating-group"><div class="mod-rating-group-label">Spectator Rating (' + spectatorScores.length + ' vote' + (spectatorScores.length !== 1 ? 's' : '') + ')</div>';
      html += '<div class="mod-rating-avg"><div class="mod-rating-bar-track"><div class="mod-rating-bar-fill" style="width:' + (avgScore * 2) + '%"></div></div><span class="mod-rating-score">' + avgScore + '/50</span></div></div>';
    }
    html += '</div>';
  }

  if ((d.status === 'complete' || d.status === 'completed') && d.ai_scorecard) {
    const sc = d.ai_scorecard;
    const nameA = escHtml(d.debater_a_name); const nameB = escHtml(d.debater_b_name);
    const totalA = sc.side_a.logic.score + sc.side_a.evidence.score + sc.side_a.delivery.score + sc.side_a.rebuttal.score;
    const totalB = sc.side_b.logic.score + sc.side_b.evidence.score + sc.side_b.delivery.score + sc.side_b.rebuttal.score;
    html += '<div class="ai-scorecard-section fade-up"><div class="ai-scorecard-header-row">';
    html += '<div class="ai-scorecard-side-col"><span class="ai-scorecard-name">' + nameA + '</span><span class="ai-scorecard-total ' + (totalA >= totalB ? 'winner' : 'loser') + '">' + totalA + '</span></div>';
    html += '<div class="ai-scorecard-vs">VS</div>';
    html += '<div class="ai-scorecard-side-col"><span class="ai-scorecard-name">' + nameB + '</span><span class="ai-scorecard-total ' + (totalB >= totalA ? 'winner' : 'loser') + '">' + totalB + '</span></div></div>';
    const criteria: Array<{ label: string; key: keyof AISideScores }> = [
      { label: '\uD83E\uDDE0 LOGIC', key: 'logic' }, { label: '\uD83D\uDCDA EVIDENCE', key: 'evidence' },
      { label: '\uD83C\uDFA4 DELIVERY', key: 'delivery' }, { label: '\u2694\uFE0F REBUTTAL', key: 'rebuttal' },
    ];
    for (const c of criteria) {
      const a = sc.side_a[c.key]; const b = sc.side_b[c.key];
      html += '<div class="ai-score-criterion"><div class="ai-score-criterion-header"><span class="ai-score-criterion-label">' + c.label + '</span><span class="ai-score-criterion-nums">' + a.score + ' \u2014 ' + b.score + '</span></div>';
      html += '<div class="ai-score-bars"><div class="ai-score-bar side-a" style="width:' + (a.score * 10) + '%"></div><div class="ai-score-bar side-b" style="width:' + (b.score * 10) + '%"></div></div>';
      html += '<div class="ai-score-reason side-a-reason">' + escHtml(a.reason) + '</div>';
      html += '<div class="ai-score-reason side-b-reason">' + escHtml(b.reason) + '</div></div>';
    }
    if (sc.verdict) html += '<div class="ai-scorecard-verdict">' + escHtml(sc.verdict) + '</div>';
    html += '</div>';
  }

  html += '<div class="vote-section fade-up" id="vote-section"><div class="vote-headline">WHO\'S WINNING?</div><div class="vote-sub">Cast your vote. One vote per debate.</div><div class="vote-row">';
  html += '<button class="vote-btn va" id="vote-a">' + escHtml(d.debater_a_name) + '</button><button class="vote-btn vb" id="vote-b">' + escHtml(d.debater_b_name) + '</button></div>';
  html += '<div class="vote-results" id="vote-results"><div class="vote-bar-track"><div class="vote-bar-fill a-fill" id="bar-a" style="width:50%">50%</div><div class="vote-bar-fill b-fill" id="bar-b" style="width:50%">50%</div></div><div class="vote-count" id="vote-count"></div></div></div>';

  html += '<div class="share-bar fade-up"><button class="share-btn" id="share-copy">\uD83D\uDCCB Copy Link</button><button class="share-btn" id="share-x">\uD835\uDD4F Share</button><button class="share-btn" id="share-wa">\uD83D\uDCAC WhatsApp</button><button class="share-btn" id="share-native">\u2197 Share</button></div>';
  html += '<div class="cta-banner fade-up"><div class="cta-headline">THINK YOU COULD DO BETTER?</div><div class="cta-sub">Join The Moderator and debate it yourself. Challenge anyone. Build your record.</div><a href="/moderator-plinko.html" class="cta-btn">ENTER THE ARENA</a></div>';
  html += '<div class="footer fade-up">Live debate on <a href="/">The Moderator</a> \u00B7 <a href="/moderator-terms.html">Terms</a></div>';

  if (state.app) state.app.innerHTML = html;
  state.lastRenderedMessageCount = messages.length;

  wireVoteButtons(d);
  wireShareButtons(d);
  wireChatUI(d);
  if ((d.vote_count_a || 0) + (d.vote_count_b || 0) > 0) updateVoteBar(d.vote_count_a || 0, d.vote_count_b || 0);
}
