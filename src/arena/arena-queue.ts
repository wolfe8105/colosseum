// arena-queue.ts — Queue management (enter, poll, timeout, leave)
// Part of the arena.ts monolith split

import { safeRpc, getCurrentProfile } from '../auth.ts';
import { friendlyError, FEATURES } from '../config.ts';
import {
  view, selectedMode, selectedRanked, selectedRuleset, selectedRounds,
  selectedCategory, queuePollTimer, queueElapsedTimer, queueSeconds,
  queueErrorState, aiFallbackShown, _queuePollInFlight, screenEl,
  set_view, set_selectedMode, set_queuePollTimer, set_queueElapsedTimer,
  set_queueSeconds, set_queueErrorState, set_aiFallbackShown,
  set__queuePollInFlight, set_selectedRuleset,
} from './arena-state.ts';
import type { ArenaView, DebateMode } from './arena-types.ts';
import type { ArenaFeedItem } from './arena-types-feed-list.ts';
import type { MatchData } from './arena-types-match.ts';
import { MODES, QUEUE_AI_PROMPT_SEC, QUEUE_HARD_TIMEOUT_SEC, QUEUE_CATEGORIES, AI_TOPICS } from './arena-constants.ts';
import { isPlaceholder, formatTimer, pushArenaState, randomFrom } from './arena-core.ts';
import { onMatchFound, startAIDebate } from './arena-match.ts';

export function enterQueue(mode: DebateMode | string, topic: string): void {
  set_selectedMode(mode as DebateMode);
  set_view('queue');
  pushArenaState('queue');

  if (mode === 'ai') {
    void startAIDebate(topic);
    return;
  }

  if (!FEATURES.liveDebates) return;

  if (screenEl) screenEl.innerHTML = '';
  set_queueSeconds(0);
  set_queueErrorState(false);
  set_aiFallbackShown(false);

  const modeInfo = MODES[mode as DebateMode];
  const profile = getCurrentProfile();
  const elo = profile?.elo_rating || 1200;

  const queueEl = document.createElement('div');
  queueEl.className = 'arena-queue arena-fade-in';
  queueEl.innerHTML = `
    <div class="arena-rank-badge ${selectedRuleset === 'unplugged' ? 'unplugged' : selectedRanked ? 'ranked' : 'casual'}">${selectedRuleset === 'unplugged' ? '\uD83C\uDFB8 UNPLUGGED' : selectedRanked ? '\u2694\uFE0F RANKED' : '\uD83C\uDF7A CASUAL'}</div>
    <div class="arena-queue-search-ring" id="arena-queue-ring">
      <div class="arena-queue-icon">${modeInfo.icon}</div>
    </div>
    <div class="arena-queue-title">${modeInfo.name}${selectedCategory ? ` · ${QUEUE_CATEGORIES.find(c => c.id === selectedCategory)?.label ?? selectedCategory}` : ''}</div>
    <div class="arena-queue-timer" id="arena-queue-timer">0:00</div>
    <div class="arena-queue-status" id="arena-queue-status">Searching for a worthy opponent...</div>
    ${selectedRuleset !== 'unplugged' ? `<div class="arena-queue-elo">Your ELO: ${elo}${selectedRanked ? ' (on the line)' : ''}</div>` : ''}
    <div class="arena-queue-pop" id="arena-queue-pop"></div>
    <div id="arena-queue-ai-prompt"></div>
    <button class="arena-queue-cancel" id="arena-queue-cancel">\u2715 CANCEL</button>
    <div class="arena-queue-feed" id="arena-queue-feed"></div>
  `;
  screenEl?.appendChild(queueEl);

  document.getElementById('arena-queue-cancel')?.addEventListener('click', leaveQueue);

  // Fetch live debates for spectator feed (fire-and-forget)
  // B-09: filter by selected category, fall back to general feed if empty
  (async () => {
    try {
      let { data } = await safeRpc<ArenaFeedItem[]>('get_arena_feed', { p_limit: 5, p_category: selectedCategory });
      const feedEl = document.getElementById('arena-queue-feed');
      if (!feedEl || view !== 'queue') return;
      let items = data as ArenaFeedItem[] | null;

      // Fallback: if category filter returned nothing, load general feed
      if ((!items || items.length === 0) && selectedCategory) {
        const fallback = await safeRpc<ArenaFeedItem[]>('get_arena_feed', { p_limit: 5, p_category: null });
        items = fallback.data as ArenaFeedItem[] | null;
      }

      if (items && items.length > 0) {
        const live = items.filter((d: ArenaFeedItem) => d.status === 'live');
        const recent = items.filter((d: ArenaFeedItem) => d.status !== 'live').slice(0, 3);
        const cards = [...live, ...recent].slice(0, 4);
        if (cards.length > 0) {
          const { renderArenaFeedCard } = await import('./arena-lobby.cards.ts');
          feedEl.innerHTML = `<div class="arena-queue-feed-label">\uD83D\uDC41\uFE0F Live in the Arena</div>`
            + cards.map((d: ArenaFeedItem) => renderArenaFeedCard(d, d.status === 'live' ? 'live' : 'verdict')).join('');
        }
      } else {
        feedEl.innerHTML = `<div class="arena-queue-feed-label" style="opacity:0.4;">\u2014 no active debates right now \u2014</div>`;
      }
    } catch { /* feed is optional */ }
  })();

  set_queueElapsedTimer(setInterval(() => {
    if (queueErrorState) return;
    set_queueSeconds(queueSeconds + 1);
    const timerEl = document.getElementById('arena-queue-timer');
    if (timerEl) timerEl.textContent = formatTimer(queueSeconds);

    // Status text progression
    updateQueueStatus(queueSeconds);

    // AI Sparring prompt at 60s (queue keeps running)
    const aiPromptSec = QUEUE_AI_PROMPT_SEC[mode as DebateMode] ?? 60;
    if (aiPromptSec > 0 && queueSeconds === aiPromptSec && !aiFallbackShown) {
      showAIFallbackPrompt();
    }

    // Hard timeout — give up
    const hardTimeout = QUEUE_HARD_TIMEOUT_SEC[mode as DebateMode] ?? 180;
    if (hardTimeout > 0 && queueSeconds >= hardTimeout) {
      onQueueTimeout();
    }
  }, 1000));

  if (!isPlaceholder()) {
    void joinServerQueue(mode as DebateMode, topic);
  } else {
    // Placeholder: simulate finding a match after a few seconds
    setTimeout(() => {
      if (view === 'queue') {
        onMatchFound({
          debate_id: 'placeholder-' + Date.now(),
          topic: topic || randomFrom(AI_TOPICS),
          role: 'a',
          opponent_name: 'PlaceholderUser',
          opponent_elo: 1200 + Math.floor(Math.random() * 200) - 100,
        });
      }
    }, 3000 + Math.random() * 4000);
  }
}

export function updateQueueStatus(seconds: number): void {
  const statusEl = document.getElementById('arena-queue-status');
  if (!statusEl) return;

  if (aiFallbackShown) {
    statusEl.textContent = 'Queue still active \u2014 searching...';
  } else if (seconds <= 15) {
    statusEl.textContent = 'Searching for a worthy opponent...';
  } else if (seconds <= 30) {
    statusEl.textContent = 'Expanding search range...';
  } else if (seconds <= 45) {
    statusEl.textContent = 'Searching all regions...';
  } else {
    statusEl.textContent = 'Still looking...';
  }
}

export function showAIFallbackPrompt(): void {
  set_aiFallbackShown(true);
  const promptEl = document.getElementById('arena-queue-ai-prompt');
  if (!promptEl) return;

  promptEl.innerHTML = `
    <div class="arena-queue-ai-fallback arena-fade-in">
      <div class="arena-queue-ai-fallback-text">\uD83E\uDD16 No opponents yet. Sharpen your skills while you wait?</div>
      <button class="arena-post-btn primary" id="arena-queue-ai-spar">SPAR WITH AI</button>
    </div>
  `;
  document.getElementById('arena-queue-ai-spar')?.addEventListener('click', () => {
    leaveQueue();
    enterQueue('ai', '');
  });
}

export async function joinServerQueue(mode: DebateMode, topic: string): Promise<void> {
  try {
    const { data, error } = await safeRpc<MatchData>('join_debate_queue', {
      p_mode: mode,
      p_category: selectedCategory,
      p_topic: topic || null,
      p_ranked: selectedRanked,
      p_ruleset: selectedRuleset,
      p_total_rounds: selectedRounds,
    });
    if (error) throw error;
    if ((data as MatchData)?.status === 'matched') {
      onMatchFound(data as MatchData);
    } else {
      set_queuePollTimer(setInterval(async () => {
        if (view !== 'queue') return;
        if (_queuePollInFlight) return;
        set__queuePollInFlight(true);
        try {
          const { data: status, error: pollErr } = await safeRpc<MatchData>('check_queue_status');
          if (pollErr) throw pollErr;
          if (view !== 'queue') return;

          // Update queue population count
          const qc = (status as Record<string, unknown>)?.queue_count;
          const popEl = document.getElementById('arena-queue-pop');
          if (popEl) {
            const count = typeof qc === 'number' ? qc : 0;
            popEl.textContent = count > 0 ? `${count} other${count !== 1 ? 's' : ''} searching` : '';
          }

          if (status && (status as MatchData).status === 'matched') {
            onMatchFound(status as MatchData);
          }
        } catch { /* handled */ } finally {
          set__queuePollInFlight(false);
        }
      }, 4000));
    }
  } catch (err) {
    console.error('[Arena] Queue join error:', err);
    set_queueErrorState(true);
    const statusEl = document.getElementById('arena-queue-status');
    if (statusEl) statusEl.textContent = friendlyError(err) || 'Queue error \u2014 try again';
  }
}

export function onQueueTimeout(): void {
  clearQueueTimers();

  // Stop the search ring animation
  const ringEl = document.getElementById('arena-queue-ring');
  if (ringEl) ringEl.classList.add('stopped');

  const statusEl = document.getElementById('arena-queue-status');
  if (statusEl) {
    statusEl.textContent = 'No opponents available right now.';
    statusEl.style.color = 'var(--mod-muted, #8890A8)';
  }

  // Clear AI prompt if it was showing
  const promptEl = document.getElementById('arena-queue-ai-prompt');
  if (promptEl) promptEl.innerHTML = '';

  // Show final options
  const queueEl = screenEl?.querySelector('.arena-queue');
  if (queueEl) {
    const alt = document.createElement('div');
    alt.className = 'arena-queue-timeout-options arena-fade-in';
    alt.innerHTML = `
      <button class="arena-post-btn primary" id="arena-try-ai">\uD83E\uDD16 SPAR WITH AI INSTEAD</button>
      <button class="arena-post-btn secondary" id="arena-try-again">\uD83D\uDD04 TRY AGAIN</button>
      <button class="arena-post-btn secondary" id="arena-back-lobby">\u2190 BACK TO LOBBY</button>
    `;
    queueEl.appendChild(alt);
    document.getElementById('arena-try-ai')?.addEventListener('click', () => { enterQueue('ai', ''); });
    document.getElementById('arena-try-again')?.addEventListener('click', () => { enterQueue(selectedMode!, ''); });
    document.getElementById('arena-back-lobby')?.addEventListener('click', async () => { const { renderLobby } = await import('./arena-lobby.ts'); renderLobby(); });
  }

  if (!isPlaceholder()) {
    safeRpc('leave_debate_queue').catch((e) => console.warn('[Arena] leave_debate_queue failed:', e));
  }
}

export function leaveQueue(): void {
  clearQueueTimers();
  if (!isPlaceholder()) {
    safeRpc('leave_debate_queue').catch((e) => console.warn('[Arena] leave_debate_queue failed:', e));
  }
  void import('./arena-lobby.ts').then(({ renderLobby }) => renderLobby());
}

export function clearQueueTimers(): void {
  if (queuePollTimer) { clearInterval(queuePollTimer); set_queuePollTimer(null); }
  if (queueElapsedTimer) { clearInterval(queueElapsedTimer); set_queueElapsedTimer(null); }
}
