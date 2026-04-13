/**
 * THE MODERATOR — Spectator View Rendering
 *
 * All HTML rendering. showError, renderMessages, renderTimeline, renderSpectateView.
 */

import { state } from './spectate.state.ts';
import { escHtml, renderAvatar, modeLabel, statusBadge } from './spectate.utils.ts';
import { wireVoteButtons, updateVoteBar } from './spectate.vote.ts';
import { wireChatUI, renderChatMessages } from './spectate.chat.ts';
import { wireShareButtons } from './spectate.share.ts';
import type { SpectateDebate, DebateMessage, ReplayPowerUp, ReplayReference, ReplayPointAward, ReplaySpeechEvent, TimelineEntry, AISideScores } from './spectate.types.ts';

export function showError(msg: string): void {
  if (state.loading) state.loading.style.display = 'none';
  if (state.app) state.app.innerHTML = '<div class="error-state">' + escHtml(msg) + '<br><a href="/" style="color:var(--gold);margin-top:12px;display:inline-block;">Back to Home</a></div>';
}

export function renderMessages(messages: DebateMessage[], d: SpectateDebate): string {
  let html = '';
  let lastRound = 0;
  for (const m of messages) {
    if (m.round && m.round !== lastRound) {
      html += '<div class="round-divider">\u2014 Round ' + Number(m.round) + ' \u2014</div>';
      lastRound = m.round;
    }
    const side = m.side || 'a';
    const isAI = m.is_ai;
    const name = isAI ? '\uD83E\uDD16 AI'
      : side === 'a' ? (d.debater_a_name || 'Side A')
      : (d.debater_b_name || 'Side B');
    html += '<div class="msg side-' + escHtml(side) + '">';
    html += '<div class="msg-name">' + escHtml(name) + '</div>';
    html += '<div class="msg-text">' + escHtml(m.content) + '</div>';
    html += '<div class="msg-round">Round ' + Number(m.round) + '</div>';
    html += '</div>';
    if (m.created_at && (!state.lastMessageTime || m.created_at > state.lastMessageTime)) {
      state.lastMessageTime = m.created_at;
    }
  }
  return html;
}

/**
 * F-05: Format a point award badge label.
 * Mirrors the logic in arena-feed-events.ts so live feed and replay
 * always display the same format.
 *
 * No modifier:       "+3 pts"
 * Pure multiplier:   "+3 × 1.5 = 4.5 pts"
 * Pure flat:         "+5 pts"  (flat folded into final, no × shown)
 * Both:              "+3 × 1.5 + 1 = 5.5 pts"
 * Modifier = 1×:     "+3 pts"  (× 1.0 suppressed — no clutter)
 */
function formatPointBadge(pa: ReplayPointAward): string {
  const meta       = pa.metadata;
  const base       = Number(meta?.base_score       ?? pa.base_score ?? 0);
  const mult       = Number(meta?.in_debate_multiplier ?? 1.0);
  const flat       = Number(meta?.in_debate_flat   ?? 0);
  const final      = Number(meta?.final_contribution ?? base);
  const hasMult    = mult !== 1.0;
  const hasFlat    = flat !== 0;

  if (!hasMult && !hasFlat) return '+' + base + ' pts';
  if (hasMult && !hasFlat)  return '+' + base + ' \u00D7 ' + mult + ' = ' + final + ' pts';
  if (!hasMult && hasFlat)  return '+' + final + ' pts';
  return '+' + base + ' \u00D7 ' + mult + ' + ' + flat + ' = ' + final + ' pts';
}

function renderTimeline(messages: DebateMessage[], d: SpectateDebate): string {
  const rd = state.replayData;

  // F-05: Build a map of scored_event_id → ReplayPointAward so speech
  // entries can look up their award in O(1).
  const pointAwardMap = new Map<string, ReplayPointAward>();
  const orphanAwards: ReplayPointAward[] = [];   // awards with no linkable speech event
  if (rd?.point_awards?.length) {
    for (const pa of rd.point_awards) {
      const sid = pa.metadata?.scored_event_id;
      if (sid) {
        pointAwardMap.set(String(sid), pa);
      } else {
        orphanAwards.push(pa);
      }
    }
  }

  // F-05: Detect F-51 debate by presence of speech_events bucket.
  // For these debates dialogue lives in debate_feed_events, not debate_messages.
  const hasSpeechEvents = (rd?.speech_events?.length ?? 0) > 0;

  // No enrichment data at all → plain message list (fast path for live polls)
  const hasEnrichment = rd && (
    rd.power_ups.length > 0 ||
    rd.references.length > 0 ||
    hasSpeechEvents ||
    (rd.point_awards?.length ?? 0) > 0
  );
  if (!hasEnrichment && messages.length > 0) {
    return renderMessages(messages, d);
  }

  // Build unified timeline entries
  const entries: TimelineEntry[] = [];

  if (hasSpeechEvents) {
    // F-51 moderated debate — use feed speech events as the message source
    for (const se of rd!.speech_events) {
      entries.push({
        type: 'speech',
        timestamp: se.created_at,
        round: se.round,
        side: se.side,
        data: se,
      });
    }
    // Orphan point awards (no scored_event_id) render as standalone score entries
    for (const pa of orphanAwards) {
      entries.push({
        type: 'score',
        timestamp: pa.created_at,
        round: pa.round,
        side: pa.side,
        data: pa,
      });
    }
  } else {
    // Older debate (AI sparring / private lobby) — use debate_messages
    for (const m of messages) {
      entries.push({
        type: 'message',
        timestamp: m.created_at || '1970-01-01T00:00:00Z',
        round: m.round,
        side: m.side,
        data: m,
      });
    }
    // All point awards render as standalone entries (no speech event to link to)
    for (const pa of [...orphanAwards, ...pointAwardMap.values()]) {
      entries.push({
        type: 'score',
        timestamp: pa.created_at,
        round: pa.round,
        side: pa.side,
        data: pa,
      });
    }
  }

  if (rd?.power_ups?.length) {
    for (const pu of rd.power_ups) {
      entries.push({ type: 'power_up', timestamp: pu.activated_at, round: null, side: pu.side, data: pu });
    }
  }
  if (rd?.references?.length) {
    for (const ref of rd.references) {
      entries.push({ type: 'reference', timestamp: ref.created_at, round: ref.round, side: ref.side, data: ref });
    }
  }

  // Sort chronologically
  entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let html = '';
  let lastRound = 0;

  for (const entry of entries) {

    // ── debate_messages (older debates) ─────────────────────
    if (entry.type === 'message') {
      const m = entry.data as DebateMessage;
      if (m.round && m.round !== lastRound) {
        html += '<div class="round-divider">\u2014 Round ' + Number(m.round) + ' \u2014</div>';
        lastRound = m.round;
      }
      const side = m.side || 'a';
      const name = m.is_ai ? '\uD83E\uDD16 AI'
        : side === 'a' ? (d.debater_a_name || 'Side A')
        : (d.debater_b_name || 'Side B');
      html += '<div class="msg side-' + escHtml(side) + '">';
      html += '<div class="msg-name">' + escHtml(name) + '</div>';
      html += '<div class="msg-text">' + escHtml(m.content) + '</div>';
      html += '<div class="msg-round">Round ' + Number(m.round) + '</div>';
      html += '</div>';
      if (m.created_at && (!state.lastMessageTime || m.created_at > state.lastMessageTime)) {
        state.lastMessageTime = m.created_at;
      }

    // ── F-51 speech events — inline point award badge ───────
    } else if (entry.type === 'speech') {
      const se = entry.data as ReplaySpeechEvent;
      if (se.round && se.round !== lastRound) {
        html += '<div class="round-divider">\u2014 Round ' + Number(se.round) + ' \u2014</div>';
        lastRound = se.round;
      }
      const side = se.side || 'a';
      html += '<div class="msg side-' + escHtml(side) + '">';
      html += '<div class="msg-name">' + escHtml(se.debater_name) + '</div>';
      html += '<div class="msg-text">' + escHtml(se.content || '') + '</div>';
      // F-05: Attach inline point award if this speech event was scored
      const award = pointAwardMap.get(se.id);
      if (award) {
        const awardSideClass = award.side === 'a' ? 'award-side-a' : 'award-side-b';
        html += '<div class="msg-score-badge ' + awardSideClass + '">\u26A1 ' + formatPointBadge(award) + '</div>';
      }
      html += '<div class="msg-round">Round ' + Number(se.round) + '</div>';
      html += '</div>';
      if (se.created_at && (!state.lastMessageTime || se.created_at > state.lastMessageTime)) {
        state.lastMessageTime = se.created_at;
      }

    // ── Standalone score entry (older debates / orphan awards) ─
    } else if (entry.type === 'score') {
      const pa = entry.data as ReplayPointAward;
      const sideClass = pa.side === 'a' ? 'side-a' : 'side-b';
      const sideName  = pa.side === 'a' ? (d.debater_a_name || 'Side A') : (d.debater_b_name || 'Side B');
      html += '<div class="timeline-event score-event ' + sideClass + '">';
      html += '<span class="timeline-icon">\u26A1</span>';
      html += '<span class="timeline-text">' + formatPointBadge(pa) + ' for <strong>' + escHtml(sideName) + '</strong></span>';
      html += '</div>';

    // ── Power-up ─────────────────────────────────────────────
    } else if (entry.type === 'power_up') {
      const pu = entry.data as ReplayPowerUp;
      const sideClass = pu.side === 'a' ? 'side-a' : 'side-b';
      html += '<div class="timeline-event power-up-event ' + sideClass + '">';
      html += '<span class="timeline-icon">' + escHtml(pu.power_up_icon) + '</span>';
      html += '<span class="timeline-text">' + escHtml(pu.user_name) + ' used <strong>' + escHtml(pu.power_up_name) + '</strong></span>';
      html += '</div>';

    // ── Reference ────────────────────────────────────────────
    } else if (entry.type === 'reference') {
      const ref = entry.data as ReplayReference;
      const sideClass = ref.side === 'a' ? 'side-a' : 'side-b';
      const rulingIcon = ref.ruling === 'accepted' ? '\u2705' : ref.ruling === 'rejected' ? '\u274C' : '\u23F3';
      const rulingText = ref.ruling === 'accepted' ? 'Accepted' : ref.ruling === 'rejected' ? 'Rejected' : 'Pending';
      html += '<div class="timeline-event reference-event ' + sideClass + '">';
      html += '<span class="timeline-icon">\uD83D\uDCCE</span>';
      html += '<span class="timeline-text">' + escHtml(ref.submitter_name) + ' cited a source</span>';
      if (ref.description) {
        html += '<div class="ref-desc">' + escHtml(ref.description) + '</div>';
      }
      if (ref.url) {
        html += '<div class="ref-url">' + escHtml(ref.url) + '</div>';
      }
      html += '<div class="ref-ruling">' + rulingIcon + ' ' + rulingText;
      if (ref.ruling_reason) {
        html += ' \u2014 ' + escHtml(ref.ruling_reason);
      }
      html += '</div>';
      html += '</div>';
    }
  }

  return html;
}

export function renderSpectateView(d: SpectateDebate, messages: DebateMessage[]): void {
  if (state.loading) state.loading.style.display = 'none';
  const isLive = d.status === 'live' || d.status === 'pending' || d.status === 'round_break' || d.status === 'voting';
  let html = '';

  // Status + mode badges
  html += '<div class="fade-up" style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;justify-content:center;">';
  html += statusBadge(d.status);
  html += '<span class="mode-badge">' + modeLabel(d.mode) + '</span>';
  html += '</div>';

  // Topic
  html += '<div class="topic-card fade-up"><div class="topic-text">' + escHtml(d.topic) + '</div></div>';

  // VS bar
  html += '<div class="vs-bar fade-up">';
  html += '<div class="vs-debater">';
  html += renderAvatar(d.debater_a_avatar, d.debater_a_name, 'side-a');
  html += '<div><div class="vs-name">' + escHtml(d.debater_a_name) + '</div>';
  html += '<div class="vs-elo">' + Number(d.debater_a_elo) + ' ELO</div></div>';
  html += '</div>';
  html += '<div class="vs-text">VS</div>';
  html += '<div class="vs-debater right">';
  html += renderAvatar(d.debater_b_avatar, d.debater_b_name, 'side-b');
  html += '<div><div class="vs-name">' + escHtml(d.debater_b_name) + '</div>';
  html += '<div class="vs-elo">' + Number(d.debater_b_elo) + ' ELO</div></div>';
  html += '</div>';
  html += '</div>';

  // Moderator bar
  if (d.moderator_type && d.moderator_type !== 'none') {
    const modLabel = d.moderator_type === 'ai' ? 'AI Moderator' : escHtml(d.moderator_name || 'Human Moderator');
    html += '<div class="mod-bar fade-up">\u2696\uFE0F Moderated by ' + modLabel + '</div>';
  }

  // Info bar: spectators + round
  html += '<div class="info-bar fade-up">';
  html += '<span><span class="eye">\uD83D\uDC41\uFE0F</span> <span id="spectator-count">' + (Number(d.spectator_count) || 1) + '</span> watching</span>';
  if (d.current_round && d.total_rounds) {
    html += '<span>\u00B7</span>';
    html += '<span>Round ' + Number(d.current_round) + '/' + Number(d.total_rounds) + '</span>';
  }
  html += '</div>';

  // === AUDIENCE PULSE GAUGE ===
  const va = Number(d.vote_count_a) || 0;
  const vb = Number(d.vote_count_b) || 0;
  const totalVotes = va + vb;
  html += '<div class="pulse-gauge fade-up" id="pulse-gauge">';
  html += '<div class="pulse-label">AUDIENCE PULSE</div>';
  if (totalVotes > 0) {
    const pctA = Math.round((va / totalVotes) * 100);
    const pctB = 100 - pctA;
    html += '<div class="pulse-track">';
    html += '<div class="pulse-fill-a" id="pulse-a" style="width:' + pctA + '%">' + pctA + '%</div>';
    html += '<div class="pulse-fill-b" id="pulse-b" style="width:' + pctB + '%">' + pctB + '%</div>';
    html += '</div>';
  } else {
    html += '<div class="pulse-track">';
    html += '<div class="pulse-fill-a" id="pulse-a" style="width:50%">\u2014</div>';
    html += '<div class="pulse-fill-b" id="pulse-b" style="width:50%">\u2014</div>';
    html += '</div>';
    html += '<div class="pulse-empty">Vote to move the gauge</div>';
  }
  html += '<div class="pulse-names"><span>' + escHtml(d.debater_a_name) + '</span><span>' + escHtml(d.debater_b_name) + '</span></div>';
  html += '</div>';

  // Live polling indicator
  if (isLive) {
    html += '<div class="live-indicator fade-up"><span class="pulse"></span> Auto-updating every 5s</div>';
  }

  // Message stream (enriched with power-ups, references, and point awards for completed debates)
  html += '<div class="messages fade-up" id="messages">';
  const hasSpeechReplay = (state.replayData?.speech_events?.length ?? 0) > 0;
  if (messages.length === 0 && !hasSpeechReplay) {
    html += '<div class="msg-empty">No messages yet. The debate is getting started...</div>';
  } else {
    html += renderTimeline(messages, d);
  }
  html += '</div>';

  // === SPECTATOR CHAT ===
  html += '<div class="spec-chat fade-up" id="spec-chat">';
  html += '<div class="spec-chat-header" id="spec-chat-header">';
  html += '<span class="spec-chat-title">SPECTATOR CHAT <span class="spec-chat-count" id="chat-count">' + (state.chatMessages.length > 0 ? '(' + state.chatMessages.length + ')' : '') + '</span></span>';
  html += '<span class="spec-chat-toggle' + (state.chatOpen ? ' open' : '') + '" id="chat-toggle">\u25BC</span>';
  html += '</div>';
  html += '<div class="spec-chat-body' + (state.chatOpen ? ' open' : '') + '" id="spec-chat-body">';
  html += '<div class="spec-chat-messages" id="spec-chat-messages">';
  if (state.chatMessages.length === 0) {
    html += '<div class="spec-chat-empty">No messages yet. Be the first to react!</div>';
  } else {
    html += renderChatMessages(state.chatMessages);
  }
  html += '</div>';
  if (state.isLoggedIn) {
    html += '<div class="spec-chat-input" id="chat-input-row">';
    html += '<input type="text" id="chat-input" placeholder="Say something..." maxlength="280" autocomplete="off">';
    html += '<button id="chat-send">SEND</button>';
    html += '</div>';
  } else {
    html += '<div class="spec-chat-login"><a href="/moderator-login.html">Log in</a> to chat</div>';
  }
  html += '</div></div>';

  // Scoreboard (if complete)
  if ((d.status === 'complete' || d.status === 'completed') && d.score_a != null) {
    const winnerSide = d.winner;
    html += '<div class="scoreboard fade-up">';
    html += '<div class="score-label">FINAL SCORE</div>';
    html += '<div class="score-row">';
    html += '<div class="score-side ' + (winnerSide === 'a' ? 'winner' : '') + '">';
    html += '<span class="score-name">' + escHtml(d.debater_a_name) + '</span>';
    html += '<span>' + Number(d.score_a) + '</span></div>';
    html += '<span class="score-dash">\u2014</span>';
    html += '<div class="score-side ' + (winnerSide === 'b' ? 'winner' : '') + '">';
    html += '<span class="score-name">' + escHtml(d.debater_b_name) + '</span>';
    html += '<span>' + Number(d.score_b) + '</span></div>';
    html += '</div></div>';
  }

  // Moderator rating (if human-moderated and scores exist)
  if ((d.status === 'complete' || d.status === 'completed') && d.moderator_type === 'human' && d.moderator_name && state.replayData && state.replayData.mod_scores.length > 0) {
    html += '<div class="mod-rating-section fade-up">';
    html += '<div class="mod-rating-title">\u2696\uFE0F MODERATOR RATING</div>';
    html += '<div class="mod-rating-name">' + escHtml(d.moderator_name) + '</div>';

    const debaterScores = state.replayData.mod_scores.filter(s => s.scorer_role === 'debater');
    const spectatorScores = state.replayData.mod_scores.filter(s => s.scorer_role === 'spectator');

    if (debaterScores.length > 0) {
      html += '<div class="mod-rating-group">';
      html += '<div class="mod-rating-group-label">Debater Ratings</div>';
      for (const s of debaterScores) {
        const verdict = s.score >= 25 ? '\uD83D\uDC4D FAIR' : '\uD83D\uDC4E UNFAIR';
        html += '<div class="mod-rating-row"><span class="mod-rating-scorer">' + escHtml(s.scorer_name) + '</span><span class="mod-rating-verdict ' + (s.score >= 25 ? 'fair' : 'unfair') + '">' + verdict + '</span></div>';
      }
      html += '</div>';
    }

    if (spectatorScores.length > 0) {
      const avgScore = Math.round(spectatorScores.reduce((sum, s) => sum + s.score, 0) / spectatorScores.length);
      html += '<div class="mod-rating-group">';
      html += '<div class="mod-rating-group-label">Spectator Rating (' + spectatorScores.length + ' vote' + (spectatorScores.length !== 1 ? 's' : '') + ')</div>';
      html += '<div class="mod-rating-avg">';
      html += '<div class="mod-rating-bar-track"><div class="mod-rating-bar-fill" style="width:' + (avgScore * 2) + '%"></div></div>';
      html += '<span class="mod-rating-score">' + avgScore + '/50</span>';
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // AI Scorecard (if persisted — AI sparring debates only)
  if ((d.status === 'complete' || d.status === 'completed') && d.ai_scorecard) {
    const sc = d.ai_scorecard;
    const nameA = escHtml(d.debater_a_name);
    const nameB = escHtml(d.debater_b_name);
    const totalA = (sc.side_a.logic.score + sc.side_a.evidence.score + sc.side_a.delivery.score + sc.side_a.rebuttal.score);
    const totalB = (sc.side_b.logic.score + sc.side_b.evidence.score + sc.side_b.delivery.score + sc.side_b.rebuttal.score);

    html += '<div class="ai-scorecard-section fade-up">';
    html += '<div class="ai-scorecard-header-row">';
    html += '<div class="ai-scorecard-side-col"><span class="ai-scorecard-name">' + nameA + '</span><span class="ai-scorecard-total ' + (totalA >= totalB ? 'winner' : 'loser') + '">' + totalA + '</span></div>';
    html += '<div class="ai-scorecard-vs">VS</div>';
    html += '<div class="ai-scorecard-side-col"><span class="ai-scorecard-name">' + nameB + '</span><span class="ai-scorecard-total ' + (totalB >= totalA ? 'winner' : 'loser') + '">' + totalB + '</span></div>';
    html += '</div>';

    const criteria: Array<{ label: string; key: keyof AISideScores }> = [
      { label: '\uD83E\uDDE0 LOGIC', key: 'logic' },
      { label: '\uD83D\uDCDA EVIDENCE', key: 'evidence' },
      { label: '\uD83C\uDFA4 DELIVERY', key: 'delivery' },
      { label: '\u2694\uFE0F REBUTTAL', key: 'rebuttal' },
    ];
    for (const c of criteria) {
      const a = sc.side_a[c.key];
      const b = sc.side_b[c.key];
      html += '<div class="ai-score-criterion">';
      html += '<div class="ai-score-criterion-header"><span class="ai-score-criterion-label">' + c.label + '</span><span class="ai-score-criterion-nums">' + a.score + ' \u2014 ' + b.score + '</span></div>';
      html += '<div class="ai-score-bars"><div class="ai-score-bar side-a" style="width:' + (a.score * 10) + '%"></div><div class="ai-score-bar side-b" style="width:' + (b.score * 10) + '%"></div></div>';
      html += '<div class="ai-score-reason">' + escHtml(a.reason) + '</div>';
      html += '</div>';
    }

    if (sc.verdict) {
      html += '<div class="ai-scorecard-verdict">' + escHtml(sc.verdict) + '</div>';
    }
    html += '</div>';
  }

  // Vote section
  html += '<div class="vote-section fade-up" id="vote-section">';
  html += '<div class="vote-headline">WHO\'S WINNING?</div>';
  html += '<div class="vote-sub">Cast your vote. One vote per debate.</div>';
  html += '<div class="vote-row">';
  html += '<button class="vote-btn va" id="vote-a">' + escHtml(d.debater_a_name) + '</button>';
  html += '<button class="vote-btn vb" id="vote-b">' + escHtml(d.debater_b_name) + '</button>';
  html += '</div>';
  html += '<div class="vote-results" id="vote-results">';
  html += '<div class="vote-bar-track"><div class="vote-bar-fill a-fill" id="bar-a" style="width:50%">50%</div><div class="vote-bar-fill b-fill" id="bar-b" style="width:50%">50%</div></div>';
  html += '<div class="vote-count" id="vote-count"></div>';
  html += '</div></div>';

  // Share bar (enhanced with WhatsApp + social proof)
  html += '<div class="share-bar fade-up">';
  html += '<button class="share-btn" id="share-copy">\uD83D\uDCCB Copy Link</button>';
  html += '<button class="share-btn" id="share-x">\uD835\uDD4F Share</button>';
  html += '<button class="share-btn" id="share-wa">\uD83D\uDCAC WhatsApp</button>';
  html += '<button class="share-btn" id="share-native">\u2197 Share</button>';
  html += '</div>';

  // CTA
  html += '<div class="cta-banner fade-up">';
  html += '<div class="cta-headline">THINK YOU COULD DO BETTER?</div>';
  html += '<div class="cta-sub">Join The Moderator and debate it yourself. Challenge anyone. Build your record.</div>';
  html += '<a href="/moderator-plinko.html" class="cta-btn">ENTER THE ARENA</a>';
  html += '</div>';

  // Footer
  html += '<div class="footer fade-up">Live debate on <a href="/">The Moderator</a> \u00B7 <a href="/moderator-terms.html">Terms</a></div>';

  if (state.app) state.app.innerHTML = html;
  state.lastRenderedMessageCount = messages.length;

  wireVoteButtons(d);
  wireShareButtons(d);
  wireChatUI(d);

  if ((d.vote_count_a || 0) + (d.vote_count_b || 0) > 0) {
    updateVoteBar(d.vote_count_a || 0, d.vote_count_b || 0);
  }
}
