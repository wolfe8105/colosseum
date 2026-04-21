/**
 * THE MODERATOR — Spectator View Controller (TypeScript)
 *
 * Orchestrator + IIFE. Auth, debate loading, live polling.
 *
 * Migration: Session 128 (Phase 4), Session 139 (ES imports, 9 window globals removed)
 * Decomposed: Session 252 — split from 1,056 lines into 8 files.
 */

// LM-SPECTATE-001: The original rpc() wrapper was a thin safeRpc alias scoped
// to the IIFE. Removed — all files import safeRpc directly from auth.ts.

import { ready, getSupabaseClient, safeRpc, getCurrentUser, getIsPlaceholderMode } from '../auth.ts';
import { get_arena_debate_spectator, get_debate_messages, get_debate_replay_data, get_spectator_chat } from '../contracts/rpc-schemas.ts';
import { nudge } from '../nudge.ts';
import '../analytics.ts';
import { state } from './spectate.state.ts';
import { showError, renderSpectateView, renderMessages } from './spectate.render.ts';
import { updateVoteBar, updatePulse } from './spectate.vote.ts';
import { startChatPolling } from './spectate.chat.ts';
import type { DebateMessage, SpectateDebate, ReplayData } from './spectate.types.ts';

async function startPolling(): Promise<void> {
  if (state.pollTimer) clearInterval(state.pollTimer);
  state.pollTimer = setInterval(async () => {
    try {
      let freshDebate: SpectateDebate | null = null;
      const { data: rpcData, error: rpcErr } = await safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId }, get_arena_debate_spectator);
      if (rpcErr || !rpcData) {
        const { data: directData } = await state.sb!.from('arena_debates').select('*').eq('id', state.debateId!).single();
        if (directData) {
          freshDebate = { ...directData, debater_a_name: state.debateData?.debater_a_name || 'Side A', debater_b_name: state.debateData?.debater_b_name || 'Side B' } as SpectateDebate;
        }
      } else {
        freshDebate = rpcData as SpectateDebate;
      }
      if (!freshDebate) return;

      // Update spectator count
      const countEl = document.getElementById('spectator-count');
      if (countEl) countEl.textContent = String(Number(freshDebate.spectator_count) || 1);

      // Update vote counts + audience pulse
      const freshVA = freshDebate.vote_count_a || 0;
      const freshVB = freshDebate.vote_count_b || 0;
      if (freshVA || freshVB) {
        updateVoteBar(freshVA, freshVB);
        updatePulse(freshVA, freshVB);
      }

      // Fetch new messages
      let allMessages: DebateMessage[] = [];
      try {
        const { data: msgData } = await safeRpc('get_debate_messages', { p_debate_id: state.debateId }, get_debate_messages);
        allMessages = (msgData || []) as DebateMessage[];
      } catch(e) {
        const { data: directMsgs } = await state.sb!.from('debate_messages').select('*').eq('debate_id', state.debateId!).order('round').order('created_at').limit(100);
        allMessages = (directMsgs || []) as DebateMessage[];
      }

      if (allMessages.length > 0) {
        const messagesEl = document.getElementById('messages');
        if (messagesEl) {
          if (allMessages.length > state.lastRenderedMessageCount) {
            const newMessages = allMessages.slice(state.lastRenderedMessageCount);
            const newHtml = renderMessages(newMessages, freshDebate);
            const atBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 80;
            messagesEl.insertAdjacentHTML('beforeend', newHtml);
            state.lastRenderedMessageCount = allMessages.length;
            if (atBottom) messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
          }
        }
      }

      // Stop polling if debate ended
      if (freshDebate.status === 'complete' || freshDebate.status === 'completed' || freshDebate.status === 'cancelled' || freshDebate.status === 'canceled') {
        clearInterval(state.pollTimer!);
        state.pollTimer = null;
        if (state.chatPollTimer) { clearInterval(state.chatPollTimer); state.chatPollTimer = null; }
        state.debateData = freshDebate;
        renderSpectateView(freshDebate, allMessages);
        // F-36: Day 3 — watched a full debate
        import('../onboarding-drip.ts').then(({ triggerDripDay }) => triggerDripDay(3)).catch(() => {});
      }
    } catch (err) {
      console.warn('[Spectate] Poll error:', err);
    }
  }, 5000);
}

async function loadDebate(): Promise<void> {
  try {
    let debate: SpectateDebate | null = null;
    const { data: rpcData, error: rpcErr } = await safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId }, get_arena_debate_spectator);

    if (rpcErr) {
      console.warn('[Spectate] RPC error, falling back to direct query:', rpcErr.message);
      const { data: directData, error: directErr } = await state.sb!
        .from('arena_debates')
        .select('*, debater_a_profile:profiles!arena_debates_debater_a_fkey(display_name, username, elo_rating, avatar_url), debater_b_profile:profiles!arena_debates_debater_b_fkey(display_name, username, elo_rating, avatar_url)')
        .eq('id', state.debateId!)
        .single();

      if (directErr || !directData) {
        console.warn('[Spectate] Direct query also failed:', directErr?.message);
        const { data: bareData, error: bareErr } = await state.sb!
          .from('arena_debates')
          .select('*')
          .eq('id', state.debateId!)
          .single();

        if (bareErr || !bareData) {
          showError('Debate not found. ' + (bareErr?.message || ''));
          return;
        }
        debate = {
          ...bareData,
          debater_a_name: 'Side A', debater_a_elo: 1200, debater_a_avatar: null,
          debater_b_name: 'Side B', debater_b_elo: 1200, debater_b_avatar: null,
        } as SpectateDebate;
      } else {
        const pa = (directData as any).debater_a_profile || {};
        const pb = (directData as any).debater_b_profile || {};
        debate = {
          ...directData,
          debater_a_name: pa.display_name || pa.username || 'Side A',
          debater_a_elo: pa.elo_rating || 1200,
          debater_a_avatar: pa.avatar_url || null,
          debater_b_name: pb.display_name || pb.username || 'Side B',
          debater_b_elo: pb.elo_rating || 1200,
          debater_b_avatar: pb.avatar_url || null,
        } as SpectateDebate;
      }
    } else if (!rpcData) {
      showError('Debate not found or has been removed.');
      return;
    } else {
      debate = rpcData as SpectateDebate;
    }

    state.debateData = debate;

    // Session 240: Live feed-room debates → redirect to arena spectator view
    if (debate.status === 'live') {
      window.location.href = '/?spectate=' + encodeURIComponent(state.debateId!);
      return;
    }

    // Update page title + OG (in-page only — mirror handles static OG)
    const topicText = debate.topic || 'Debate';
    document.title = topicText + ' — The Moderator';
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', topicText + ' — Live on The Moderator');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', (debate.debater_a_name || 'Side A') + ' vs ' + (debate.debater_b_name || 'Side B') + ' — Watch live and vote.');

    // Bump spectator count (fire-and-forget)
    safeRpc('bump_spectator_count', { p_debate_id: state.debateId }).catch((e) => console.warn('[Spectate] bump_spectator_count failed:', e));

    // F-58: Log watch for sentiment tip tier progression (fire-and-forget, excludes guests via RPC guard)
    safeRpc('log_debate_watch', { p_debate_id: state.debateId }).catch((e) => console.warn('[Spectate] log_debate_watch failed:', e));

    // Log view event (non-blocking)
    safeRpc('log_event', { p_event_type: 'spectate_view', p_metadata: { debate_id: state.debateId, topic: debate.topic || null } }).catch((e) => console.warn('[Spectate] log_event failed:', e));

    // Load messages
    let messages: DebateMessage[] = [];
    try {
      const { data: msgData } = await safeRpc('get_debate_messages', { p_debate_id: state.debateId }, get_debate_messages);
      messages = (msgData || []) as DebateMessage[];
    } catch(e) {
      const { data: directMsgs } = await state.sb!
        .from('debate_messages')
        .select('*')
        .eq('debate_id', state.debateId!)
        .order('round', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(100);
      messages = (directMsgs || []) as DebateMessage[];
    }

    // Load spectator chat
    try {
      const { data: chatData } = await safeRpc('get_spectator_chat', { p_debate_id: state.debateId, p_limit: 100 }, get_spectator_chat);
      state.chatMessages = (chatData || []) as any[];
      if (state.chatMessages.length > 0) {
        state.lastChatMessageAt = state.chatMessages[state.chatMessages.length - 1].created_at;
      }
    } catch(e) {
      state.chatMessages = [];
    }

    // Load replay enrichment data for completed debates (power-ups, references, mod scores)
    const isComplete = debate.status === 'complete' || debate.status === 'completed';
    if (isComplete) {
      try {
        const { data: rpData } = await safeRpc('get_debate_replay_data', { p_debate_id: state.debateId }, get_debate_replay_data);
        if (rpData) {
          state.replayData = rpData as ReplayData;
        }
      } catch(e) {
        console.warn('[Spectate] Replay data load failed (non-fatal):', e);
        state.replayData = null;
      }
    }

    renderSpectateView(debate, messages);

    // Start polling if debate is active
    const isLive = debate.status === 'live' || debate.status === 'pending' || debate.status === 'round_break' || debate.status === 'voting';
    if (isLive) {
      startPolling();
      startChatPolling();
    } else {
      nudge('replay_entry', '\uD83D\uDC41\uFE0F Watching the replay. Judge for yourself.');
    }
  } catch (err) {
    console.error('[Spectate] Load error:', err);
    showError('Failed to load debate: ' + ((err as Error).message || 'Unknown error'));
  }
}

// LM-SPECTATE-003: IIFE retained — do NOT convert to top-level await.
// Vite target is ES2020/Chrome87. Top-level await fails at build time.
(async function init() {

  // ---- Wait for auth init, then use its Supabase client ----
  await ready;
  state.sb = getSupabaseClient();
  state.app = document.getElementById('app');
  state.loading = document.getElementById('loading');
  state.isLoggedIn = !!(getCurrentUser() && !getIsPlaceholderMode());

  // ---- Back button ----
  document.getElementById('back-btn')?.addEventListener('click', () => {
    if (document.referrer && document.referrer.includes(location.host)) {
      history.back();
    } else {
      window.location.href = '/';
    }
  });

  // ---- Hide JOIN button if logged in ----
  if (getCurrentUser()) {
    const joinBtn = document.getElementById('join-btn');
    if (joinBtn) joinBtn.style.display = 'none';
  }

  // ---- Get debate ID from URL ----
  const params = new URLSearchParams(window.location.search);
  const debateId = params.get('id');

  // SECURITY: Validate UUID format (prevent filter injection)
  if (debateId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(debateId)) {
    if (state.app) state.app.innerHTML = '<div class="error-state">Invalid debate link.</div>';
    if (state.loading) state.loading.style.display = 'none';
    return;
  }

  if (!debateId) {
    if (state.app) state.app.innerHTML = '<div class="error-state">No debate ID provided.<br><a href="/" style="color:var(--gold);">Back to Home</a></div>';
    if (state.loading) state.loading.style.display = 'none';
    return;
  }

  state.debateId = debateId;

  // ---- Cleanup ----
  window.addEventListener('beforeunload', () => {
    if (state.pollTimer) clearInterval(state.pollTimer);
    if (state.chatPollTimer) clearInterval(state.chatPollTimer);
  });

  // ---- Go ----
  loadDebate();
})();
