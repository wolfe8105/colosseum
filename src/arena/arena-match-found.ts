// arena-match-found.ts — Match-found screen: queue→match transition, UI render,
// decline/return helpers, and AI debate start.
// Part of the arena-match.ts split (Session 254+).
//
// Cycle note: this file ↔ arena-queue.ts is a pre-existing static cycle
// (mirrors the original arena-match.ts ↔ arena-queue.ts cycle).
// arena-match-flow.ts imports returnToQueueAfterDecline from here but is NOT
// imported back statically — only via dynamic import() in showMatchFound button
// handlers, which breaks the would-be found→flow→queue→found cycle.

import { safeRpc, getCurrentProfile } from '../auth.ts';
import { escapeHTML, DEBATE } from '../config.ts';
import {
  selectedMode, selectedRanked, selectedRuleset,
  matchAcceptSeconds, matchFoundDebate, screenEl,
  queuePollTimer, queueElapsedTimer,
  set_matchAcceptTimer, set_matchAcceptSeconds, set_matchFoundDebate, set_view,
  set_queuePollTimer, set_queueElapsedTimer,
} from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import type { MatchData } from './arena-types-match.ts';
import { MATCH_ACCEPT_SEC, AI_TOTAL_ROUNDS, AI_TOPICS } from './arena-constants.ts';
import { isPlaceholder, randomFrom, pushArenaState } from './arena-core.utils.ts';
import { enterRoom } from './arena-room-enter.ts';
import { showPreDebate } from './arena-room-predebate.ts';
import { playIntroMusic } from './arena-sounds.ts';
import { clearMatchAcceptTimers } from './arena-match-timers.ts';
// LANDMINE [LM-MATCH-001]: Static circular dep — found.ts imports enterQueue from
// arena-queue.ts; arena-queue.ts imports onMatchFound + startAIDebate from here.
// Pre-existing (was arena-match.ts ↔ arena-queue.ts). All exports are functions;
// no init-order issue at runtime. Tracked by madge 3-Gate baseline (37 cycles).
import { enterQueue } from './arena-queue.ts';

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
  // LANDMINE [LM-MATCH-002]: opponentElo interpolated into innerHTML without Number() cast.
  // CLAUDE.md requires Number() for numeric innerHTML values. Pre-existing; refactor-only.
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

  // Dynamic imports break the static found→flow cycle. arena-match-flow.ts is
  // pre-cached by Vite; by the time the user interacts it is already loaded.
  document.getElementById('mf-accept-btn')?.addEventListener('click', () => {
    void import('./arena-match-flow.ts').then(({ onMatchAccept }) => onMatchAccept());
  });
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

export function onMatchDecline(): void {
  clearMatchAcceptTimers();
  if (!isPlaceholder() && matchFoundDebate) {
    safeRpc('respond_to_match', { p_debate_id: matchFoundDebate.id, p_accept: false }).catch((e) => console.warn('[Arena] respond_to_match decline failed:', e));
  }
  returnToQueueAfterDecline();
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
