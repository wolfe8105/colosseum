// arena-room-end.ts — endCurrentDebate
// Part of the arena.ts monolith split

import { safeRpc, getCurrentUser, getCurrentProfile, declareRival, showUserProfile } from '../auth.ts';
import { escapeHTML, showToast, friendlyError } from '../config.ts';
import { citeReference } from '../reference-arsenal.ts';
import { claimDebate, claimAiSparring } from '../tokens.ts';
import { settleStakes } from '../staking.ts';
import { removeShieldIndicator } from '../powerups.ts';
import { leaveDebate } from '../webrtc.ts';
import { shareResult } from '../share.ts';
import { nudge } from '../nudge.ts';
import {
  view, currentDebate, roundTimer, silenceTimer, shieldActive,
  activatedPowerUps, equippedForDebate, screenEl,
  selectedRanked, loadedRefs,
  set_view, set_roundTimer, set_silenceTimer, set_shieldActive,
  set_selectedRanked,
} from './arena-state.ts';
import type { CurrentDebate, AIScoreResult, UpdateDebateResult, DebateRole } from './arena-types.ts';
import { isPlaceholder, pushArenaState } from './arena-core.ts';
import { enterQueue } from './arena-queue.ts';
import { stopOpponentPoll } from './arena-room-live.ts';
import { stopReferencePoll } from './arena-mod-refs.ts';
import { stopModStatusPoll } from './arena-mod-queue.ts';
import { renderModScoring } from './arena-mod-scoring.ts';
import { requestAIScoring, sumSideScore, renderAIScorecard } from './arena-room-ai.ts';
import { cleanupFeedRoom } from './arena-feed-room.ts';

export async function endCurrentDebate(): Promise<void> {
  set_view('postDebate');
  pushArenaState('postDebate');
  if (roundTimer) clearInterval(roundTimer);
  stopReferencePoll();
  stopModStatusPoll();
  stopOpponentPoll();
  document.getElementById('mod-request-modal')?.remove();

  const debate = currentDebate!;

  // Snapshot cited references before cleanup wipes loadedRefs
  const citedRefs = debate.mode === 'live' ? loadedRefs.filter((r) => r.cited) : [];

  if (debate.mode === 'live') {
    // F-51: Clean up feed room (unsubscribe Realtime, clear turn timer)
    cleanupFeedRoom();
    // Legacy live audio cleanup (safe to call even if not connected)
    leaveDebate();
  }

  // Phase 5: Nulled debate — skip scoring, Elo, tokens entirely
  if (debate._nulled) {
    // Clean up power-up state
    if (silenceTimer) { clearInterval(silenceTimer); set_silenceTimer(null); }
    removeShieldIndicator();
    set_shieldActive(false);
    activatedPowerUps.clear();
    document.getElementById('powerup-silence-overlay')?.remove();
    document.getElementById('powerup-reveal-popup')?.remove();

    const reason = debate._nullReason || 'Debate nulled';
    if (screenEl) screenEl.innerHTML = '';
    const post = document.createElement('div');
    post.className = 'arena-post arena-fade-in';
    post.innerHTML = `
      <div class="arena-rank-badge casual">\u26A0\uFE0F NULLED</div>
      <div class="arena-post-verdict">\u26D4</div>
      <div class="arena-post-title">DEBATE NULLED</div>
      <div class="arena-elo-change neutral">No Rating Change</div>
      <div class="arena-post-topic">${escapeHTML(debate.topic)}</div>
      <div class="arena-null-reason">${escapeHTML(reason)}</div>
      <div class="arena-post-actions">
        <button class="arena-post-btn primary" id="arena-back-to-lobby">\u2190 LOBBY</button>
      </div>
    `;
    screenEl?.appendChild(post);
    document.getElementById('arena-back-to-lobby')?.addEventListener('click', async () => { const { renderLobby } = await import('./arena-lobby.ts'); renderLobby(); });
    return;
  }

  // Generate scores
  let scoreA: number | null = null;
  let scoreB: number | null = null;
  let aiScores: AIScoreResult | null = null;
  let winner: string | null = null;

  // Phase 5: Concede — always a loss for the conceder
  if (debate.concededBy) {
    winner = debate.concededBy === 'a' ? 'b' : 'a';
    scoreA = null;
    scoreB = null;
  } else if (debate.mode === 'ai' && debate.messages.length > 0) {
    // Show "judging" state while AI scores
    if (screenEl) {
      screenEl.innerHTML = '';
      const judging = document.createElement('div');
      judging.className = 'arena-post arena-fade-in';
      judging.innerHTML = `
        <div class="arena-judging">
          <div class="arena-judging-icon">\u2696\uFE0F</div>
          <div class="arena-judging-text">THE JUDGE IS REVIEWING...</div>
          <div class="arena-judging-sub">Analyzing ${debate.messages.length} arguments across ${debate.round} rounds</div>
          <div class="arena-typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        </div>
      `;
      screenEl.appendChild(judging);
    }

    aiScores = await requestAIScoring(debate.topic, debate.messages);
    if (aiScores) {
      scoreA = sumSideScore(aiScores.side_a);
      scoreB = sumSideScore(aiScores.side_b);
    } else {
      // Fallback if scoring API fails
      scoreA = 60 + Math.floor(Math.random() * 30);
      scoreB = 60 + Math.floor(Math.random() * 30);
    }
    winner = scoreA >= scoreB ? 'a' : 'b';
  } else if (debate.mode === 'ai' || !debate.opponentId) {
    scoreA = 60 + Math.floor(Math.random() * 30);
    scoreB = 60 + Math.floor(Math.random() * 30);
    winner = scoreA >= scoreB ? 'a' : 'b';
  } else {
    // Human PvP — server determines winner from spectator votes
    scoreA = null;
    scoreB = null;
    winner = null;
  }

  let eloChangeMe = 0;
  if (!debate.modView && !isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
    try {
      const { data: result, error } = await safeRpc<UpdateDebateResult>('update_arena_debate', {
        p_debate_id: debate.id,
        p_status: 'complete',
        p_current_round: debate.round || 1,
        p_winner: winner,
        p_score_a: scoreA,
        p_score_b: scoreB,
      });
      if (!error && result) {
        const r = result as UpdateDebateResult;
        // Server returns authoritative winner (especially for human PvP)
        if (r.winner) winner = r.winner;
        // For human PvP, use vote counts as display scores
        if (scoreA == null && r.vote_count_a != null) scoreA = r.vote_count_a;
        if (scoreB == null && r.vote_count_b != null) scoreB = r.vote_count_b;
        if (r.ranked) {
          eloChangeMe = debate.role === 'a' ? (r.elo_change_a || 0) : (r.elo_change_b || 0);
        }
      }
    } catch (e) {
      console.warn('[Arena] Finalize error:', e);
    }

    // F-51 Phase 3: Update arsenal reference win/loss stats
    if (winner && debate.role && citedRefs.length > 0) {
      const outcome: 'win' | 'loss' = debate.role === winner ? 'win' : 'loss';
      for (const ref of citedRefs) {
        citeReference(ref.reference_id, debate.id, outcome)
          .catch((e) => console.warn('[Arena] cite_reference outcome failed:', e));
      }
    }

    // Session 234: Persist AI scorecard for replay
    if (aiScores) {
      try {
        await safeRpc('save_ai_scorecard', {
          p_debate_id: debate.id,
          p_scorecard: aiScores,
        });
      } catch (e) {
        console.warn('[Arena] AI scorecard save failed (non-fatal):', e);
      }
    }

    if (debate.ruleset !== 'unplugged') {
      if (debate.mode === 'ai') claimAiSparring(debate.id);
      else claimDebate(debate.id);

      try {
        // Session 230: winner + multiplier params removed — SQL reads both server-side
        const stakeResult = await settleStakes(debate.id);
        debate._stakingResult = stakeResult;
      } catch (err) { console.error('[Arena] settleStakes failed:', err); }

      // F-58: settle sentiment tips (50% refund to winning side)
      try {
        const { safeRpc } = await import('../auth.ts');
        await safeRpc('settle_sentiment_tips', { p_debate_id: debate.id });
      } catch (err) { console.error('[Arena] settle_sentiment_tips failed:', err); }

      // F-18: resolve audition pass/fail if this was an audition debate
      try {
        const { getSupabaseClient } = await import('../auth.ts');
        const _sb = getSupabaseClient();
        await _sb.rpc('resolve_audition_from_debate', { p_debate_id: debate.id });
      } catch (err) { console.error('[Arena] resolve_audition_from_debate failed:', err); }
    }
  }

  // Ensure scores have display values
  if (scoreA == null) scoreA = 0;
  if (scoreB == null) scoreB = 0;
  if (!winner) winner = 'draw';

  const isDraw = winner === 'draw';
  const didWin = !isDraw && winner === debate.role;

  nudge('final_score', isDraw ? '\uD83E\uDD1D Draw. Evenly matched.' : didWin ? '\uD83C\uDFC6 Victory. The arena remembers.' : '\uD83D\uDC80 Defeat. Come back stronger.', isDraw ? 'info' : didWin ? 'success' : 'info');

  // Clean up power-up state
  if (silenceTimer) { clearInterval(silenceTimer); set_silenceTimer(null); }
  removeShieldIndicator();
  set_shieldActive(false);
  activatedPowerUps.clear();
  document.getElementById('powerup-silence-overlay')?.remove();
  document.getElementById('powerup-reveal-popup')?.remove();

  // Render post-debate screen
  const profile = getCurrentProfile();
  const myName = profile?.display_name || 'You';

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

  // FIX 1: Post-debate moderator recruitment nudge
  if (getCurrentUser() && getCurrentProfile()?.is_moderator !== true) {
    nudge('become_moderator_post_debate', '\uD83E\uDDD1\u200D\u2696\uFE0F Think you could call it better? Become a Moderator \u2192 Settings');
  }

  // Session 39: Moderator scoring section
  if (debate.moderatorId && debate.moderatorName) {
    renderModScoring(debate, post);
  }

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

  document.getElementById('arena-back-to-lobby')?.addEventListener('click', async () => { const { renderLobby } = await import('./arena-lobby.ts'); renderLobby(); });

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

  // Session 113: Transcript view
  document.getElementById('arena-transcript')?.addEventListener('click', () => {
    document.getElementById('arena-transcript-overlay')?.remove();

    const transcriptProfile = getCurrentProfile();
    const transcriptMyName = transcriptProfile?.display_name || 'You';
    const msgs = debate.messages || [];

    const transcriptOverlay = document.createElement('div');
    transcriptOverlay.id = 'arena-transcript-overlay';
    transcriptOverlay.className = 'arena-transcript-overlay';

    let lastRound = 0;
    let msgHtml = '';
    if (msgs.length === 0) {
      msgHtml = '<div class="arena-transcript-empty">No messages recorded.</div>';
    } else {
      msgs.forEach((m) => {
        if (m.round !== lastRound) {
          msgHtml += `<div class="arena-transcript-round">\u2014 Round ${m.round} \u2014</div>`;
          lastRound = m.round;
        }
        const isMe = m.role === 'user';
        const msgSide = isMe ? debate.role : (debate.role === 'a' ? 'b' : 'a');
        const msgName = isMe ? transcriptMyName : debate.opponentName;
        msgHtml += `<div class="arena-transcript-msg side-${msgSide}">
          <div class="t-name">${escapeHTML(msgName)}</div>
          <div class="t-text">${escapeHTML(m.text)}</div>
        </div>`;
      });
    }

    transcriptOverlay.innerHTML = `
      <div class="arena-transcript-sheet">
        <div class="arena-transcript-header">
          <div class="arena-transcript-handle"></div>
          <div class="arena-transcript-title">\uD83D\uDCDD DEBATE TRANSCRIPT</div>
          <div class="arena-transcript-topic">${escapeHTML(debate.topic)}</div>
        </div>
        <div class="arena-transcript-body">${msgHtml}</div>
      </div>`;

    transcriptOverlay.addEventListener('click', (e: Event) => {
      if (e.target === transcriptOverlay) transcriptOverlay.remove();
    });
    document.body.appendChild(transcriptOverlay);
  });
}
