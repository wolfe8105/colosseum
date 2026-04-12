import { safeRpc } from '../auth.ts';
import { escapeHTML, showToast, friendlyError, DEBATE } from '../config.ts';
import {
  view, selectedMode, selectedRanked, selectedRuleset, selectedRounds,
  selectedCategory, privateLobbyPollTimer, privateLobbyDebateId,
  screenEl, modDebateId,
  set_view, set_selectedMode, set_privateLobbyPollTimer,
  set_privateLobbyDebateId, set_modDebateId,
} from './arena-state.ts';
import type {
  ArenaView, CurrentDebate, DebateMode, DebateRole,
  PrivateLobbyResult, PendingChallenge, CheckPrivateLobbyResult,
  JoinPrivateLobbyResult, ModDebateJoinResult,
} from './arena-types.ts';
import { AI_TOPICS } from './arena-types.ts';
import { isPlaceholder, randomFrom, pushArenaState } from './arena-core.ts';
import { showMatchFound } from './arena-match.ts';
import { showModDebateWaitingDebater } from './arena-mod-debate.ts';

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
    const rows = data as PrivateLobbyResult[];
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
      if (statusEl) statusEl.textContent = `Waiting for ${escapeHTML(invitedUserName || 'them')} to accept...`;
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

export async function joinWithCode(code: string): Promise<void> {
  if (isPlaceholder()) {
    showToast('Join code not available in preview mode');
    return;
  }
  try {
    const { data, error } = await safeRpc<JoinPrivateLobbyResult>('join_private_lobby', {
      p_debate_id: null,
      p_join_code: code,
    });
    if (error) throw error;
    const result = data as JoinPrivateLobbyResult;
    set_selectedMode(result.mode as DebateMode);
    const debateData: CurrentDebate = {
      id: result.debate_id,
      topic: result.topic || randomFrom(AI_TOPICS),
      role: 'b',
      mode: result.mode as DebateMode,
      round: 1,
      totalRounds: result.total_rounds ?? DEBATE.defaultRounds,
      opponentName: result.opponent_name,
      opponentId: result.opponent_id,
      opponentElo: result.opponent_elo,
      ranked: false,
      ruleset: (result.ruleset as 'amplified' | 'unplugged') || 'amplified',
      language: result.language ?? 'en',
      messages: [],
    };
    showMatchFound(debateData);
  } catch {
    // join_private_lobby failed — try join_mod_debate (mod_created debates use a different RPC)
    try {
      const { data: modData, error: modError } = await safeRpc<ModDebateJoinResult>('join_mod_debate', {
        p_join_code: code,
      });
      if (modError) throw modError;
      const modResult = modData as ModDebateJoinResult;
      set_selectedMode(modResult.mode as DebateMode);

      if (modResult.role === 'b') {
        // Both debaters present — go straight to match found
        const debateData: CurrentDebate = {
          id: modResult.debate_id,
          topic: modResult.topic || randomFrom(AI_TOPICS),
          role: 'b',
          mode: modResult.mode as DebateMode,
          round: 1,
          totalRounds: modResult.total_rounds ?? DEBATE.defaultRounds,
          opponentName: modResult.opponent_name || 'Debater A',
          opponentId: modResult.opponent_id,
          opponentElo: modResult.opponent_elo || 1200,
          ranked: modResult.ranked,
          ruleset: (modResult.ruleset as 'amplified' | 'unplugged') || 'amplified',
          language: modResult.language ?? 'en',
          messages: [],
        };
        showMatchFound(debateData);
      } else {
        // role === 'a' — waiting for second debater, show waiting screen and poll
        set_modDebateId(modResult.debate_id);
        showModDebateWaitingDebater(modResult.debate_id, modResult.topic, modResult.mode as DebateMode, modResult.ranked);
      }
    } catch (modErr) {
      showToast(friendlyError(modErr) || 'Code not found or already taken');
    }
  }
}

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
