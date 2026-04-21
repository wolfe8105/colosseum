// arena-room-end-finalize.ts — apply end-of-debate modifiers + server finalize + side effects.
// Two exports grouped together because they share tight context (debate, winner, scoreA, scoreB,
// citedRefs, aiScores) and splitting further would force passing all of that through 3+ signatures.

import { safeRpc, getCurrentUser, getCurrentProfile } from '../auth.ts';
import { apply_end_of_debate_modifiers as applyEndOfDebateModifiersSchema } from '../contracts/rpc-schemas.ts';
import { showToast } from '../config.ts';
import { citeReference } from '../reference-arsenal.ts';
import { claimDebate, claimAiSparring } from '../tokens.ts';
import { settleStakes } from '../staking.ts';
import { resolveTournamentMatch } from '../tournaments.ts';
import type { CurrentDebate } from './arena-types.ts';
import type { AIScoreResult } from './arena-types-ai-scoring.ts';
import type { UpdateDebateResult, EndOfDebateBreakdown } from './arena-types-results.ts';
import type { LoadoutReference } from './arena-types-feed-room.ts';

export interface ModifierResult {
  scoreA: number | null;
  scoreB: number | null;
  breakdown: EndOfDebateBreakdown | null;
}

export async function applyEndOfDebateModifiers(
  debate: CurrentDebate,
  scoreA: number | null,
  scoreB: number | null,
): Promise<ModifierResult> {
  let breakdown: EndOfDebateBreakdown | null = null;
  try {
    const { data: eodData } = await safeRpc('apply_end_of_debate_modifiers', { p_debate_id: debate.id }, applyEndOfDebateModifiersSchema);
    if (eodData) {
      breakdown = eodData as EndOfDebateBreakdown;
      if (breakdown) {
        const myRole = debate.role;
        // FIX [M-END-001]: 'b' branch now correctly swaps a/b scores from server breakdown.
        if (myRole === 'a') {
          scoreA = breakdown.debater_a.final_score;
          scoreB = breakdown.debater_b.final_score;
        } else if (myRole === 'b') {
          scoreA = breakdown.debater_b.final_score;
          scoreB = breakdown.debater_a.final_score;
        }
      }
    }
  } catch (err) {
    console.warn('[Arena] apply_end_of_debate_modifiers failed (non-fatal):', err);
  }
  return { scoreA, scoreB, breakdown };
}

export interface FinalizeResult {
  winner: string | null;
  scoreA: number | null;
  scoreB: number | null;
  eloChangeMe: number;
}

export async function finalizeDebate(
  debate: CurrentDebate,
  winner: string | null,
  scoreA: number | null,
  scoreB: number | null,
  citedRefs: LoadoutReference[],
  aiScores: AIScoreResult | null,
): Promise<FinalizeResult> {
  let eloChangeMe = 0;

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

  // F-08: Resolve tournament match if this debate is part of one
  if (debate.tournament_match_id && winner) {
    resolveTournamentMatch(debate.tournament_match_id, winner)
      .then((result) => {
        if (result.tournament_complete) {
          showToast('🏆 Tournament complete! Prizes have been distributed.', 'success');
        }
      })
      .catch((e) => console.warn('[Arena] resolve_tournament_match failed (non-fatal):', e));
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
      // LANDMINE [LM-END-003]: redundant dynamic import of ../auth.ts — module-level safeRpc already in scope.
      const { safeRpc } = await import('../auth.ts');
      await safeRpc('settle_sentiment_tips', { p_debate_id: debate.id });
    } catch (err) { console.error('[Arena] settle_sentiment_tips failed:', err); }

    // F-55: pay reference royalties to forgers (batched per-forger, silent in feed)
    try {
      // LANDMINE [LM-END-003]: second redundant dynamic import — aliased as _safeRpc.
      const { safeRpc: _safeRpc } = await import('../auth.ts');
      await _safeRpc('pay_reference_royalties', { p_debate_id: debate.id });
    } catch (err) { console.error('[Arena] pay_reference_royalties failed (non-fatal):', err); }

    // F-18: resolve audition pass/fail if this was an audition debate
    try {
      await safeRpc('resolve_audition_from_debate', { p_debate_id: debate.id });
    } catch (err) { console.error('[Arena] resolve_audition_from_debate failed:', err); }
  }
    // LANDMINE [LM-END-004]: convert_referral `if` is indented as if inside the `if (debate.ruleset !== 'unplugged')` block above,
    // but the closing brace on the line above already ended that block. Preserved indentation for parity with original. Verify intent.
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

  return { winner, scoreA, scoreB, eloChangeMe };
}
