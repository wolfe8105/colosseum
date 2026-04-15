// arena-match.ts — Match found, accept/decline, AI debate start
// Part of the arena.ts monolith split

import { safeRpc, getCurrentUser, getCurrentProfile } from '../auth.ts';
import { escapeHTML, DEBATE } from '../config.ts';
import {
  selectedMode, selectedRanked, selectedRuleset, selectedWantMod, selectedRounds,
  matchAcceptTimer, matchAcceptPollTimer, matchAcceptSeconds, matchFoundDebate,
  screenEl, view,
  queuePollTimer, queueElapsedTimer,
  set_matchAcceptTimer, set_matchAcceptPollTimer, set_matchAcceptSeconds,
  set_matchFoundDebate, set_selectedWantMod, set_view,
  set_queuePollTimer, set_queueElapsedTimer,
} from './arena-state.ts';
import type { CurrentDebate, DebateRole } from './arena-types.ts';
import type { MatchData, MatchAcceptResponse } from './arena-types-match.ts';
import { MATCH_ACCEPT_SEC, MATCH_ACCEPT_POLL_TIMEOUT_SEC, AI_TOTAL_ROUNDS, AI_TOPICS } from './arena-constants.ts';
import { isPlaceholder, randomFrom, pushArenaState } from './arena-core.ts';
import { showPreDebate, enterRoom } from './arena-room-setup.ts';
import { enterQueue } from './arena-queue.ts';
import { playIntroMusic } from './arena-sounds.ts';

function clearQueueTimersInline(): void {
  if (queuePollTimer) { clearInterval(queuePollTimer); set_queuePollTimer(null); }
  if (queueElapsedTimer) { clearInterval(queueElapsedTimer); set_queueElapsedTimer(null); }
}

export function onMatchFound(data: MatchData): void {
  clearQueueTimersInline();
  const statusEl = document.getElementById('arena-queue-status');
  if (statusEl) {
    statusEl.textContent = '\uD83C\uDFAF OPPONENT FOUND!';
    statusEl.style.color = 'var(--mod-accent)';
  }
  setTimeout(() => {
    const debateData: CurrentDebate = {
      id: data.debate_id,
      topic: data.topic ?? randomFrom(AI_TOPICS),
      role: data.role ?? 'a',
      mode: selectedMode ?? 'text',
      round: 1,
      totalRounds: data.total_rounds ?? DEBATE.defaultRounds,
      opponentName: data.opponent_name ?? 'Opponent',
      opponentId: data.opponent_id ?? null,
      opponentElo: data.opponent_elo ?? 1200,
      ranked: selectedRanked,
      ruleset: (data.ruleset as 'amplified' | 'unplugged') || selectedRuleset,
      language: data.language ?? 'en',
      messages: [],
    };
    if (selectedMode === 'ai' || !data.opponent_id) {
      enterRoom(debateData);
    } else {
      showMatchFound(debateData);
    }
  }, 1200);
}

export function clearMatchAcceptTimers(): void {
  if (matchAcceptTimer) { clearInterval(matchAcceptTimer); set_matchAcceptTimer(null); }
  if (matchAcceptPollTimer) { clearInterval(matchAcceptPollTimer); set_matchAcceptPollTimer(null); }
}

export function showMatchFound(debateData: CurrentDebate): void {
  clearMatchAcceptTimers();
  set_matchFoundDebate(debateData);
  set_view('matchFound');
  pushArenaState('matchFound');
  if (screenEl) screenEl.innerHTML = '';

  set_matchAcceptSeconds(MATCH_ACCEPT_SEC);

  const opInitial = (debateData.opponentName[0] || '?').toUpperCase();
  const mf = document.createElement('div');
  mf.className = 'arena-match-found arena-fade-in';
  mf.innerHTML = `
    <div class="arena-mf-label">\u2694\uFE0F MATCH FOUND</div>
    <div class="arena-mf-opponent">
      <div class="arena-mf-avatar">${opInitial}</div>
      <div class="arena-mf-name">${escapeHTML(debateData.opponentName)}</div>
      <div class="arena-mf-elo">${debateData.opponentElo} ELO</div>
    </div>
    <div class="arena-mf-topic">${escapeHTML(debateData.topic)}</div>
    <div class="arena-mf-countdown" id="mf-countdown">${matchAcceptSeconds}</div>
    <div class="arena-mf-status" id="mf-status">Accept before time runs out</div>
    <div class="arena-mf-buttons">
      <button class="arena-mf-btn accept" id="mf-accept-btn">ACCEPT</button>
      <button class="arena-mf-btn decline" id="mf-decline-btn">DECLINE</button>
    </div>
  `;
  screenEl?.appendChild(mf);

  document.getElementById('mf-accept-btn')?.addEventListener('click', () => onMatchAccept());
  document.getElementById('mf-decline-btn')?.addEventListener('click', () => onMatchDecline());

  // F-21: Play the user's own intro music
  const profile = getCurrentProfile();
  playIntroMusic(profile?.intro_music_id ?? 'gladiator', profile?.custom_intro_url);

  set_matchAcceptTimer(setInterval(() => {
    set_matchAcceptSeconds(matchAcceptSeconds - 1);
    const cdEl = document.getElementById('mf-countdown');
    if (cdEl) cdEl.textContent = String(matchAcceptSeconds);
    if (matchAcceptSeconds <= 0) {
      onMatchDecline();
    }
  }, 1000));
}

export async function onMatchAccept(): Promise<void> {
  clearInterval(matchAcceptTimer!);
  set_matchAcceptTimer(null);
  const acceptBtn = document.getElementById('mf-accept-btn') as HTMLButtonElement | null;
  const declineBtn = document.getElementById('mf-decline-btn') as HTMLButtonElement | null;
  if (acceptBtn) { acceptBtn.disabled = true; acceptBtn.style.opacity = '0.5'; }
  if (declineBtn) { declineBtn.disabled = true; declineBtn.style.opacity = '0.5'; }

  const statusEl = document.getElementById('mf-status');
  if (statusEl) statusEl.textContent = 'Waiting for opponent\u2026';

  if (!isPlaceholder() && matchFoundDebate) {
    const { error } = await safeRpc('respond_to_match', { p_debate_id: matchFoundDebate.id, p_accept: true });
    if (error) {
      if (statusEl) statusEl.textContent = 'Error \u2014 retrying\u2026';
      if (acceptBtn) { acceptBtn.disabled = false; acceptBtn.style.opacity = '1'; }
      if (declineBtn) { declineBtn.disabled = false; declineBtn.style.opacity = '1'; }
      return;
    }
  }

  // Start polling for opponent acceptance
  let pollElapsed = 0;
  let _pollInFlight = false;
  set_matchAcceptPollTimer(setInterval(async () => {
    pollElapsed += 1.5;
    if (pollElapsed >= MATCH_ACCEPT_POLL_TIMEOUT_SEC) {
      onOpponentDeclined();
      return;
    }
    if (!matchFoundDebate || isPlaceholder()) {
      onMatchConfirmed();
      return;
    }
    if (_pollInFlight) return;
    _pollInFlight = true;
    try {
      const { data, error } = await safeRpc<MatchAcceptResponse>('check_match_acceptance', { p_debate_id: matchFoundDebate.id });
      if (error || !data) return;
      const resp = data as MatchAcceptResponse;
      if (resp.status === 'cancelled') {
        onOpponentDeclined();
        return;
      }
      const myCol = matchFoundDebate.role === 'a' ? resp.player_a_ready : resp.player_b_ready;
      const opCol = matchFoundDebate.role === 'a' ? resp.player_b_ready : resp.player_a_ready;
      if (opCol === false) { onOpponentDeclined(); return; }
      if (myCol === true && opCol === true) { onMatchConfirmed(); return; }
    } catch { /* retry next tick */ } finally { _pollInFlight = false; }
  }, 1500));
}

export function onMatchDecline(): void {
  clearMatchAcceptTimers();
  if (!isPlaceholder() && matchFoundDebate) {
    safeRpc('respond_to_match', { p_debate_id: matchFoundDebate.id, p_accept: false }).catch((e) => console.warn('[Arena] respond_to_match decline failed:', e));
  }
  returnToQueueAfterDecline();
}

export function onMatchConfirmed(): void {
  clearMatchAcceptTimers();
  const statusEl = document.getElementById('mf-status');
  if (statusEl) statusEl.textContent = '\u2705 Both ready \u2014 entering battle!';
  if (matchFoundDebate) {
    if (selectedWantMod && !isPlaceholder()) {
      safeRpc('request_mod_for_debate', { p_debate_id: matchFoundDebate.id }).catch((e) => console.warn('[Arena] request_mod_for_debate failed:', e));
    }
    set_selectedWantMod(false);
    setTimeout(() => { void showPreDebate(matchFoundDebate!); }, 800);
  }
}

export function onOpponentDeclined(): void {
  clearMatchAcceptTimers();
  const statusEl = document.getElementById('mf-status');
  if (statusEl) statusEl.textContent = 'Opponent declined \u2014 returning to queue\u2026';
  const acceptBtn = document.getElementById('mf-accept-btn') as HTMLButtonElement | null;
  const declineBtn = document.getElementById('mf-decline-btn') as HTMLButtonElement | null;
  if (acceptBtn) { acceptBtn.disabled = true; acceptBtn.style.opacity = '0.5'; }
  if (declineBtn) { declineBtn.disabled = true; declineBtn.style.opacity = '0.5'; }
  setTimeout(() => returnToQueueAfterDecline(), 1500);
}

export function returnToQueueAfterDecline(): void {
  set_matchFoundDebate(null);
  if (selectedMode) {
    enterQueue(selectedMode, '');
  } else {
    void import('./arena-lobby.ts').then(({ renderLobby }) => renderLobby());
  }
}

export async function startAIDebate(topic: string): Promise<void> {
  const chosenTopic = topic || randomFrom(AI_TOPICS);
  let debateId = 'ai-local-' + Date.now();

  if (!isPlaceholder()) {
    try {
      const { data, error } = await safeRpc<{ debate_id: string }>('create_ai_debate', { p_category: 'general', p_topic: chosenTopic });
      if (!error && data) debateId = (data as { debate_id: string }).debate_id;
    } catch { /* use local */ }
  }

  void showPreDebate({
    id: debateId,
    topic: chosenTopic,
    role: 'a',
    mode: 'ai',
    round: 1,
    totalRounds: AI_TOTAL_ROUNDS,
    opponentName: 'AI Sparring Bot',
    opponentElo: 1200,
    ranked: false,
    ruleset: 'amplified',
    messages: [],
  });
}
