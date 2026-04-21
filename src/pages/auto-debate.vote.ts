/**
 * auto-debate.vote.ts — Auto-Debate voting logic
 * showResults, castVoteImpl
 * Extracted from auto-debate.ts (Session 254 track).
 */

import { claimVote } from '../tokens.ts';
import type { AutoDebateData } from './auto-debate.types.ts';

export function showResults(votesA: number, votesB: number, total: number, aiWinner: string, _userVote: string): void {
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

export async function castVoteImpl(
  sb: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  },
  side: string,
  getFingerprint: () => string,
): Promise<void> {
  const d = (window as unknown as Record<string, unknown>)._debate as AutoDebateData | undefined;
  if (!d) return;

  const btnA = document.getElementById('btn-a') as HTMLButtonElement | null;
  const btnB = document.getElementById('btn-b') as HTMLButtonElement | null;
  if (btnA) btnA.disabled = true;
  if (btnB) btnB.disabled = true;
  btnA?.classList.add('voted');
  btnB?.classList.add('voted');
  if (side === 'a') btnA?.classList.add('winner');
  if (side === 'b') btnB?.classList.add('winner');

  // Show optimistic result immediately
  const optA = d.votes_a + (side === 'a' ? 1 : 0);
  const optB = d.votes_b + (side === 'b' ? 1 : 0);
  showResults(optA, optB, d.vote_count + 1, d.winner, side);

  // Persist vote via RPC
  try {
    const { data, error } = await sb.rpc('cast_auto_debate_vote', {
      p_debate_id: d.id,
      p_side: side,
      p_fingerprint: getFingerprint(),
    });
    if (!error && data) {
      const result = data as { success: boolean; votes_a?: number; votes_b?: number; vote_count?: number; error?: string };
      if (result.success && result.votes_a != null) {
        // Update with server-authoritative counts
        showResults(result.votes_a, result.votes_b!, result.vote_count!, d.winner, side);
      }
      // already_voted is not an error for the user — they just see current counts
    }
  } catch (e) {
    console.warn('[auto-debate.vote] cast_auto_debate_vote failed:', e);
  }

  // Claim token reward (fire-and-forget)
  claimVote(d.id).catch(e => console.warn('[auto-debate.vote] claimVote failed', e));
}
