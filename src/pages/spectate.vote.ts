/**
 * THE MODERATOR — Spectator View Voting
 *
 * Vote buttons, castVote logic, vote bar, audience pulse gauge.
 */

import { safeRpc } from '../auth.ts';
import { get_arena_debate_spectator } from '../contracts/rpc-schemas.ts';
import { claimVote } from '../tokens.ts';
import { nudge } from '../nudge.ts';
import { state } from './spectate.state.ts';
import type { SpectateDebate } from './spectate.types.ts';

export function wireVoteButtons(d: SpectateDebate): void {
  const btnA = document.getElementById('vote-a');
  const btnB = document.getElementById('vote-b');
  if (!btnA || !btnB) return;
  btnA.addEventListener('click', () => castVote('a', d));
  btnB.addEventListener('click', () => castVote('b', d));
}

async function castVote(side: string, d: SpectateDebate): Promise<void> {
  if (state.voteCast) return;
  state.voteCast = true;
  const btnA = document.getElementById('vote-a') as HTMLButtonElement | null;
  const btnB = document.getElementById('vote-b') as HTMLButtonElement | null;

  if (btnA) btnA.disabled = true;
  if (btnB) btnB.disabled = true;
  btnA?.classList.add('voted');
  btnB?.classList.add('voted');
  if (side === 'a') btnA?.classList.add('selected');
  if (side === 'b') btnB?.classList.add('selected');

  try {
    const { error } = await safeRpc('vote_arena_debate', {
      p_debate_id: state.debateId,
      p_vote: side,
    });

    // SV-2: bail on server rejection — do not nudge, claim, or update UI as if vote succeeded
    if (error) {
      console.warn('[Spectate] Vote rejected by server:', error.message);
      state.voteCast = false;
      if (btnA) btnA.disabled = false;
      if (btnB) btnB.disabled = false;
      btnA?.classList.remove('voted', 'selected');
      btnB?.classList.remove('voted', 'selected');
      return;
    }

    nudge('first_vote', '🗳️ Vote cast. Your voice shapes the verdict.');

    const { data: rawFresh } = await safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId }, get_arena_debate_spectator);
    const fresh = rawFresh as { vote_count_a?: number; vote_count_b?: number } | null;
    if (fresh) {
      updateVoteBar(fresh.vote_count_a || 0, fresh.vote_count_b || 0);
      updatePulse(fresh.vote_count_a || 0, fresh.vote_count_b || 0);
    } else {
      const fva = (d.vote_count_a || 0) + (side === 'a' ? 1 : 0);
      const fvb = (d.vote_count_b || 0) + (side === 'b' ? 1 : 0);
      updateVoteBar(fva, fvb);
      updatePulse(fva, fvb);
    }

    claimVote(state.debateId!);
  } catch (err) {
    // SV-1: reset voteCast so user can retry after unexpected throw
    console.warn('[Spectate] Vote error:', err);
    state.voteCast = false;
    if (btnA) btnA.disabled = false;
    if (btnB) btnB.disabled = false;
    btnA?.classList.remove('voted', 'selected');
    btnB?.classList.remove('voted', 'selected');
  }
}

export function updateVoteBar(va: number, vb: number): void {
  const results = document.getElementById('vote-results');
  const barA = document.getElementById('bar-a');
  const barB = document.getElementById('bar-b');
  const countEl = document.getElementById('vote-count');
  if (!results) return;

  results.classList.add('show');
  const total = va + vb || 1;
  const pctA = Math.round((va / total) * 100);
  const pctB = 100 - pctA;

  if (barA) { barA.style.width = pctA + '%'; barA.textContent = pctA + '%'; }
  if (barB) { barB.style.width = pctB + '%'; barB.textContent = pctB + '%'; }
  if (countEl) countEl.textContent = total + ' vote' + (total !== 1 ? 's' : '');
}

export function updatePulse(va: number, vb: number): void {
  const total = va + vb;
  const pulseA = document.getElementById('pulse-a');
  const pulseB = document.getElementById('pulse-b');
  if (!pulseA || !pulseB) return;

  if (total === 0) {
    pulseA.style.width = '50%';
    pulseA.textContent = '—';
    pulseB.style.width = '50%';
    pulseB.textContent = '—';
  } else {
    const pctA = Math.round((va / total) * 100);
    const pctB = 100 - pctA;
    pulseA.style.width = pctA + '%';
    pulseA.textContent = pctA + '%';
    pulseB.style.width = pctB + '%';
    pulseB.textContent = pctB + '%';
  }

  const emptyEl = document.querySelector('.pulse-empty');
  if (total > 0 && emptyEl) emptyEl.remove();
}
