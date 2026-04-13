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
import { injectAdSlot } from './arena-ads.ts';

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
  // F-57 Phase 3: Apply end-of-debate modifiers to final scores BEFORE update_arena_debate
  // so the modified scores drive winner determination and Elo calculation.
  // Only runs for real debates (not AI-local or placeholder).
  // InventoryEffect: one entry per fired inventory effect (mirror/burn_notice/parasite/chain_reaction)
  type InventoryEffect =
    | { effect: 'mirror';         copied_effect_id: string;      from_ref_id: string; new_modifier_id: string }
    | { effect: 'burn_notice';    burned_effect_id: string;      from_ref_id: string }
    | { effect: 'parasite';       stolen_effect_id: string;      source: 'free_inventory' | 'socketed'; modifier_id: string; from_ref_id?: string }
    | { effect: 'chain_reaction'; regenerated_effect: string;    new_powerup_qty: number };

  let endOfDebateBreakdown: {
    debater_a: { raw_score: number; adjustments: { effect_name: string; delta: number; source?: string }[]; final_score: number };
    debater_b: { raw_score: number; adjustments: { effect_name: string; delta: number; source?: string }[]; final_score: number };
    inventory_effects?: InventoryEffect[];
  } | null = null;

  if (!debate.modView && !isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-') && debate.mode !== 'ai') {
    try {
      const { data: eodData } = await safeRpc('apply_end_of_debate_modifiers', { p_debate_id: debate.id });
      if (eodData) {
        endOfDebateBreakdown = eodData as typeof endOfDebateBreakdown;
        // Update local score vars so update_arena_debate gets modified totals
        if (endOfDebateBreakdown) {
          const myRole = debate.role;
          if (myRole === 'a') {
            scoreA = endOfDebateBreakdown.debater_a.final_score;
            scoreB = endOfDebateBreakdown.debater_b.final_score;
          } else if (myRole === 'b') {
            scoreA = endOfDebateBreakdown.debater_a.final_score;
            scoreB = endOfDebateBreakdown.debater_b.final_score;
          }
        }
      }
    } catch (err) {
      console.warn('[Arena] apply_end_of_debate_modifiers failed (non-fatal):', err);
    }
  }

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

    // F-28: Resolve any bounty attempt locked in for this debate
    if (debate.ranked && winner) {
      safeRpc('resolve_bounty_attempt', {
        p_debate_id: debate.id,
        p_winner_id: winner,
      }).catch((e) => console.warn('[Arena] resolve_bounty_attempt failed (non-fatal):', e));
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

      // F-55: pay reference royalties to forgers (batched per-forger, silent in feed)
      try {
        const { safeRpc: _safeRpc } = await import('../auth.ts');
        await _safeRpc('pay_reference_royalties', { p_debate_id: debate.id });
      } catch (err) { console.error('[Arena] pay_reference_royalties failed (non-fatal):', err); }

      // F-18: resolve audition pass/fail if this was an audition debate
      try {
        const { getSupabaseClient } = await import('../auth.ts');
        const _sb = getSupabaseClient();
        await _sb.rpc('resolve_audition_from_debate', { p_debate_id: debate.id });
      } catch (err) { console.error('[Arena] resolve_audition_from_debate failed:', err); }
    }
      // Only for human PvP ranked debates (not AI sparring, not casual)
      if (debate.mode !== 'ai' && debate.ranked) {
        try {
          const userId = getCurrentUser()?.id;
          const profile = getCurrentProfile();
          // wins/losses haven't been incremented locally yet — server side has the real count.
          // We fire unconditionally; convert_referral is idempotent (checks for signed_up row).
          if (userId && profile) {
            void safeRpc('convert_referral', { p_invitee_user_id: userId });
          }
        } catch (err) { console.warn('[Arena] convert_referral failed (non-fatal):', err); }
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

// ── F-57 Phase 3: "After Effects" breakdown renderer ──────────
// Renders the end-of-debate modifier chain:
// Raw: 47 → +2 Point Surge → -1 Point Siphon → Final: 48
// Returns empty string if no adjustments fired.

function renderAfterEffects(
  breakdown: {
    debater_a: { raw_score: number; adjustments: { effect_name: string; delta: number }[]; final_score: number };
    debater_b: { raw_score: number; adjustments: { effect_name: string; delta: number }[]; final_score: number };
    inventory_effects?: Array<Record<string, unknown>>;
  } | null,
  myRole: string,
): string {
  if (!breakdown) return '';

  const myData   = myRole === 'a' ? breakdown.debater_a : breakdown.debater_b;
  const oppData  = myRole === 'a' ? breakdown.debater_b : breakdown.debater_a;

  const myAdj  = myData.adjustments  ?? [];
  const oppAdj = oppData.adjustments ?? [];
  const invEffects = breakdown.inventory_effects ?? [];

  if (myAdj.length === 0 && oppAdj.length === 0 && invEffects.length === 0) return '';

  function renderChain(d: typeof myData, label: string): string {
    if (d.adjustments.length === 0) return '';
    const steps = d.adjustments.map(adj => {
      const sign  = adj.delta >= 0 ? '+' : '';
      const cls   = adj.delta >= 0 ? 'positive' : 'negative';
      return `<span class="ae-step ae-step--${cls}">${sign}${adj.delta} ${escapeHTML(adj.effect_name)}</span>`;
    }).join('<span class="ae-arrow">→</span>');

    return `
      <div class="ae-row">
        <span class="ae-label">${escapeHTML(label)}</span>
        <span class="ae-raw">${d.raw_score}</span>
        <span class="ae-arrow">→</span>
        ${steps}
        <span class="ae-arrow">→</span>
        <span class="ae-final">${d.final_score}</span>
      </div>`;
  }

  // Render a single inventory effect event as a human-readable pill row
  function renderInventoryEvent(ev: Record<string, unknown>): string {
    const EFFECT_LABELS: Record<string, string> = {
      mirror:         '🪞 Mirror',
      burn_notice:    '🔥 Burn Notice',
      parasite:       '🦠 Parasite',
      chain_reaction: '⛓ Chain Reaction',
    };
    const effectKey  = ev['effect'] as string;
    const label      = EFFECT_LABELS[effectKey] ?? escapeHTML(effectKey);

    let detail = '';
    switch (effectKey) {
      case 'mirror':
        detail = `Copied <strong>${escapeHTML(String(ev['copied_effect_id']))}</strong> from opponent's ref`;
        break;
      case 'burn_notice':
        detail = `Destroyed opponent's <strong>${escapeHTML(String(ev['burned_effect_id']))}</strong>`;
        break;
      case 'parasite': {
        const src = ev['source'] === 'socketed' ? 'ripped from their ref' : 'taken from inventory';
        detail = `Stole <strong>${escapeHTML(String(ev['stolen_effect_id']))}</strong> (${src})`;
        break;
      }
      case 'chain_reaction':
        detail = `<strong>${escapeHTML(String(ev['regenerated_effect']))}</strong> power-up ×${ev['new_powerup_qty']} added to inventory`;
        break;
      default:
        detail = escapeHTML(JSON.stringify(ev));
    }

    return `
      <div class="ae-inv-row">
        <span class="ae-inv-label">${label}</span>
        <span class="ae-inv-detail">${detail}</span>
      </div>`;
  }

  const myChain    = renderChain(myData,  'You');
  const oppChain   = renderChain(oppData, 'Opponent');
  const invSection = invEffects.length > 0
    ? `<div class="ae-inv-section">
         <div class="ae-inv-header">🎒 INVENTORY</div>
         ${invEffects.map(renderInventoryEvent).join('')}
       </div>`
    : '';

  if (!myChain && !oppChain && !invSection) return '';

  return `
    <div class="arena-after-effects">
      <div class="arena-after-effects__title">⚡ AFTER EFFECTS</div>
      ${myChain}
      ${oppChain}
      ${invSection}
    </div>`;
}
