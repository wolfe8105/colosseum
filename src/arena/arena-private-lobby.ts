/**
 * arena-private-lobby.ts — Private lobby create + poll flow
 *
 * createAndWaitPrivateLobby, startPrivateLobbyPoll,
 * onPrivateLobbyMatched, cancelPrivateLobby.
 *
 * joinWithCode extracted to arena-private-lobby.join.ts.
 * loadPendingChallenges extracted to arena-pending-challenges.ts.
 * Session 254 track.
 */

import { safeRpc } from '../auth.ts';
import { escapeHTML, showToast, friendlyError, DEBATE } from '../config.ts';
import {
  view, selectedMode, selectedRanked, selectedRuleset, selectedRounds,
  selectedCategory, privateLobbyPollTimer, privateLobbyDebateId,
  screenEl,
  set_view, set_privateLobbyPollTimer,
  set_privateLobbyDebateId,
} from './arena-state.ts';
import type { CurrentDebate, DebateMode, DebateRole } from './arena-types.ts';
import type { PrivateLobbyResult, CheckPrivateLobbyResult } from './arena-types-private-lobby.ts';
import { AI_TOPICS } from './arena-constants.ts';
import { isPlaceholder, randomFrom, pushArenaState } from './arena-core.utils.ts';
import { showMatchFound } from './arena-match-found.ts';

export async function createAndWaitPrivateLobby(
  mode: string,
  topic: string,
  visibility: 'private' | 'group' | 'code',
  invitedUserId?: string,
  invitedUserName?: string,
  groupId?: string
): Promise<void> {
  set_view('privateLobbyWaiting');
  pushArenaState('privateLobbyWaiting');
  if (screenEl) screenEl.innerHTML = '';

  // Show a loading state while we create the lobby
  const waiting = document.createElement('div');
  waiting.className = 'arena-queue arena-fade-in';
  waiting.id = 'arena-private-waiting';
  waiting.innerHTML = `
    <div class="arena-queue-search-ring" id="arena-private-ring">
      <div class="arena-queue-icon">\uD83D\uDD12</div>
    </div>
    <div class="arena-queue-title" id="arena-private-title">CREATING LOBBY...</div>
    <div class="arena-queue-status" id="arena-private-status">Setting up your private debate</div>
    <div id="arena-private-code-display"></div>
    <button class="arena-queue-cancel" id="arena-private-cancel-btn">\u2715 CANCEL</button>
  `;
  screenEl?.appendChild(waiting);

  document.getElementById('arena-private-cancel-btn')?.addEventListener('click', () => {
    void cancelPrivateLobby();
  });

  if (isPlaceholder()) {
    // Placeholder simulation
    setTimeout(() => {
      onPrivateLobbyMatched({
        debate_id: 'placeholder-' + Date.now(),
        topic: topic || randomFrom(AI_TOPICS),
        role: 'a',
        opponent_name: 'PlaceholderUser',
        opponent_elo: 1200,
        opponent_id: 'placeholder-opp',
      });
    }, 3000);
    return;
  }

  try {
    const { data, error } = await safeRpc<PrivateLobbyResult>('create_private_lobby', {
      p_mode: mode,
      p_topic: topic || null,
      p_category: selectedCategory,
      p_ranked: selectedRanked,
      p_ruleset: selectedRuleset,
      p_visibility: visibility,
      p_invited_user_id: invitedUserId || null,
      p_group_id: groupId || null,
      p_total_rounds: selectedRounds,
    });

    if (error) throw error;
    // RETURNS TABLE comes back as an array — unwrap first row
    const rows = data as unknown as PrivateLobbyResult[];
    const result = Array.isArray(rows) ? rows[0]! : (data as PrivateLobbyResult);
    set_privateLobbyDebateId(result.debate_id);

    // Update waiting screen
    const titleEl = document.getElementById('arena-private-title');
    const statusEl = document.getElementById('arena-private-status');
    const codeDisplay = document.getElementById('arena-private-code-display');

    if (visibility === 'code' && result.join_code) {
      if (titleEl) titleEl.textContent = 'SHARE THIS CODE';
      if (statusEl) statusEl.textContent = 'Waiting for someone to join...';
      if (codeDisplay) codeDisplay.innerHTML = `
        <div style="margin:16px 0;padding:20px 32px;border-radius:var(--mod-radius-md);border:2px solid var(--mod-accent-border);background:var(--mod-accent-muted);text-align:center;">
          <div style="font-family:var(--mod-font-ui);font-size:11px;letter-spacing:3px;color:var(--mod-text-muted);margin-bottom:8px;">JOIN CODE</div>
          <div style="font-family:var(--mod-font-ui);font-size:40px;font-weight:700;color:var(--mod-accent);letter-spacing:8px;">${escapeHTML(result.join_code)}</div>
        </div>
        <button id="arena-challenge-link-btn" style="margin-top:4px;padding:12px 24px;border-radius:20px;border:1px solid var(--mod-accent-border);background:var(--mod-accent-muted);color:var(--mod-accent);font-family:var(--mod-font-ui);font-size:13px;font-weight:600;letter-spacing:1.5px;cursor:pointer;width:100%;text-transform:uppercase;">🔗 Copy Challenge Link</button>
      `;
      document.getElementById('arena-challenge-link-btn')?.addEventListener('click', () => {
        const link = `https://themoderator.app/challenge?code=${encodeURIComponent(result.join_code!)}`;
        navigator.clipboard.writeText(link)
          .then(() => showToast('Challenge link copied!'))
          .catch(() => showToast(link));
      });
    } else if (visibility === 'private') {
      if (titleEl) titleEl.textContent = 'CHALLENGE SENT';
      if (statusEl) statusEl.textContent = `Waiting for ${invitedUserName || 'them'} to accept...`;
    } else if (visibility === 'group') {
      if (titleEl) titleEl.textContent = 'GROUP LOBBY OPEN';
      if (statusEl) statusEl.textContent = 'Waiting for a group member to join...';
    }

    startPrivateLobbyPoll(result.debate_id, mode, topic);
  } catch (err) {
    console.error('[Arena] create_private_lobby error:', err);
    showToast(friendlyError(err) || 'Failed to create lobby');
    const { renderLobby } = await import('./arena-lobby.ts');
    renderLobby();
  }
}

export function startPrivateLobbyPoll(debateId: string, mode: string, topic: string): void {
  if (privateLobbyPollTimer) clearInterval(privateLobbyPollTimer);
  let elapsed = 0;
  const TIMEOUT_SEC = 600; // 10 minutes

  set_privateLobbyPollTimer(setInterval(async () => {
    elapsed += 3;
    if (view !== 'privateLobbyWaiting') {
      clearInterval(privateLobbyPollTimer!);
      set_privateLobbyPollTimer(null);
      return;
    }
    if (elapsed >= TIMEOUT_SEC) {
      clearInterval(privateLobbyPollTimer!);
      set_privateLobbyPollTimer(null);
      void cancelPrivateLobby();
      showToast('Lobby expired — no one joined');
      return;
    }

    try {
      const { data, error } = await safeRpc<CheckPrivateLobbyResult>('check_private_lobby', { p_debate_id: debateId });
      if (error || !data) return;
      const result = data as CheckPrivateLobbyResult;
      if (result.status === 'matched' && result.player_b_ready && result.opponent_id) {
        clearInterval(privateLobbyPollTimer!);
        set_privateLobbyPollTimer(null);
        onPrivateLobbyMatched({
          debate_id: debateId,
          topic: topic || randomFrom(AI_TOPICS),
          role: 'a',
          opponent_name: result.opponent_name || 'Opponent',
          opponent_elo: result.opponent_elo || 1200,
          opponent_id: result.opponent_id,
          total_rounds: result.total_rounds,
          language: result.language,
        });
      } else if (result.status === 'cancelled') {
        clearInterval(privateLobbyPollTimer!);
        set_privateLobbyPollTimer(null);
        showToast('Lobby cancelled');
        const { renderLobby } = await import('./arena-lobby.ts');
        renderLobby();
      }
    } catch { /* retry next tick */ }
  }, 3000));
}

export function onPrivateLobbyMatched(data: {
  debate_id: string; topic: string; role?: DebateRole;
  opponent_name: string; opponent_elo: number; opponent_id: string;
  total_rounds?: number; language?: string;
}): void {
  const debateData: CurrentDebate = {
    id: data.debate_id,
    topic: data.topic,
    role: data.role ?? 'a',
    mode: selectedMode ?? 'text',
    round: 1,
    totalRounds: data.total_rounds ?? DEBATE.defaultRounds,
    opponentName: data.opponent_name,
    opponentId: data.opponent_id,
    opponentElo: data.opponent_elo,
    ranked: selectedRanked,
    ruleset: selectedRuleset,
    language: data.language ?? 'en',
    messages: [],
  };
  showMatchFound(debateData);
}

export async function cancelPrivateLobby(): Promise<void> {
  if (privateLobbyPollTimer) { clearInterval(privateLobbyPollTimer); set_privateLobbyPollTimer(null); }
  if (privateLobbyDebateId && !isPlaceholder()) {
    safeRpc('cancel_private_lobby', { p_debate_id: privateLobbyDebateId }).catch((e) => console.warn('[Arena] cancel_private_lobby failed:', e));
  }
  set_privateLobbyDebateId(null);
  const { renderLobby } = await import('./arena-lobby.ts');
  renderLobby();
}
