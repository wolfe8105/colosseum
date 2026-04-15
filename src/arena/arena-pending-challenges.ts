/**
 * arena-pending-challenges.ts — Pending challenge cards
 *
 * loadPendingChallenges — fetches and renders inbound challenge cards in the lobby.
 * Extracted from arena-private-lobby.ts (Session 254 track).
 */

import { safeRpc } from '../auth.ts';
import { escapeHTML, showToast, friendlyError, DEBATE } from '../config.ts';
import { set_selectedMode } from './arena-state.ts';
import type { CurrentDebate, DebateMode } from './arena-types.ts';
import type { PendingChallenge, JoinPrivateLobbyResult } from './arena-types-private-lobby.ts';
import { AI_TOPICS } from './arena-constants.ts';
import { randomFrom } from './arena-core.ts';
import { showMatchFound } from './arena-match.ts';

export async function loadPendingChallenges(): Promise<void> {
  try {
    const { data, error } = await safeRpc<PendingChallenge[]>('get_pending_challenges');
    if (error || !data || (data as unknown[]).length === 0) return;

    const challenges = data as PendingChallenge[];
    const section = document.getElementById('arena-pending-challenges-section');
    const feed = document.getElementById('arena-pending-challenges-feed');
    if (!section || !feed) return;

    section.style.display = '';
    feed.innerHTML = challenges.map(c => `
      <div class="arena-card card-live" style="border-left-color:var(--mod-accent);" data-debate-id="${escapeHTML(c.debate_id)}">
        <div class="arena-card-top">
          <span class="arena-card-badge live">\u2694\uFE0F CHALLENGE</span>
          <span class="arena-card-meta">${escapeHTML(c.mode.toUpperCase())}</span>
        </div>
        <div class="arena-card-topic">${c.topic ? escapeHTML(c.topic) : 'Topic: Challenger\'s choice'}</div>
        <div class="arena-card-vs">
          <span>From: ${escapeHTML(c.challenger_name)}</span>
          <span class="vs">\u00B7</span>
          <span>${c.challenger_elo} ELO</span>
        </div>
        <div class="arena-card-action" style="gap:8px;display:flex;justify-content:flex-end;">
          <button class="arena-card-btn challenge-accept-btn" data-debate-id="${escapeHTML(c.debate_id)}" data-mode="${escapeHTML(c.mode)}" data-topic="${escapeHTML(c.topic || '')}" data-opp-id="${escapeHTML(c.challenger_id)}" data-opp-name="${escapeHTML(c.challenger_name)}" data-opp-elo="${c.challenger_elo}" style="border-color:var(--mod-accent-border);color:var(--mod-accent);">ACCEPT</button>
          <button class="arena-card-btn challenge-decline-btn" data-debate-id="${escapeHTML(c.debate_id)}">DECLINE</button>
        </div>
      </div>
    `).join('');

    // Wire accept buttons
    feed.querySelectorAll('.challenge-accept-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const el = btn as HTMLButtonElement;
        el.disabled = true;
        el.textContent = '\u23F3';
        try {
          const { data: joinData, error: joinErr } = await safeRpc<JoinPrivateLobbyResult>('join_private_lobby', {
            p_debate_id: el.dataset.debateId,
            p_join_code: null,
          });
          if (joinErr) throw joinErr;
          const result = joinData as JoinPrivateLobbyResult;
          set_selectedMode(el.dataset.mode as DebateMode);
          const debateData: CurrentDebate = {
            id: result.debate_id,
            topic: result.topic || el.dataset.topic || randomFrom(AI_TOPICS),
            role: 'b',
            mode: el.dataset.mode as DebateMode,
            round: 1,
            totalRounds: result.total_rounds ?? DEBATE.defaultRounds,
            opponentName: el.dataset.oppName || 'Challenger',
            opponentId: el.dataset.oppId || null,
            opponentElo: Number(el.dataset.oppElo) || 1200,
            ranked: false,
            ruleset: (result.ruleset as 'amplified' | 'unplugged') || 'amplified',
            language: result.language ?? 'en',
            messages: [],
          };
          showMatchFound(debateData);
        } catch (err) {
          showToast(friendlyError(err) || 'Could not accept challenge');
          el.disabled = false;
          el.textContent = 'ACCEPT';
        }
      });
    });

    // Wire decline buttons
    feed.querySelectorAll('.challenge-decline-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const el = btn as HTMLButtonElement;
        const debateId = el.dataset.debateId!;
        el.disabled = true;
        try {
          await safeRpc('cancel_private_lobby', { p_debate_id: debateId });
        } catch { /* silent */ }
        // Remove the card
        el.closest('.arena-card')?.remove();
        if (!feed.querySelector('.arena-card')) section.style.display = 'none';
      });
    });
  } catch { /* silent — challenges are optional */ }
}
