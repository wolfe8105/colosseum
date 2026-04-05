/**
 * THE MODERATOR — Spectator View Controller (TypeScript)
 *
 * Extracted from moderator-spectate.html inline script.
 * Live/completed debate spectating, message stream, spectator chat,
 * audience pulse gauge, voting, share with social proof.
 *
 * Migration: Session 128 (Phase 4), Session 139 (ES imports, 9 window globals removed)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ready, getSupabaseClient, safeRpc, getCurrentUser, getCurrentProfile, getIsPlaceholderMode } from '../auth.ts';
import type { SafeRpcResult } from '../auth.ts';
import { claimVote } from '../tokens.ts';
import { nudge } from '../nudge.ts';
import '../analytics.ts';

/** Debate shape returned by get_arena_debate_spectator RPC or direct query */
interface SpectateDebate {
  status: string | null;
  mode: string | null;
  topic: string | null;
  debater_a_name: string | null;
  debater_a_elo: number | null;
  debater_a_avatar: string | null;
  debater_b_name: string | null;
  debater_b_elo: number | null;
  debater_b_avatar: string | null;
  moderator_type: string | null;
  moderator_id: string | null;
  moderator_name: string | null;
  ruleset: string | null;
  spectator_count: number | null;
  current_round: number | null;
  total_rounds: number | null;
  vote_count_a: number | null;
  vote_count_b: number | null;
  score_a: number | null;
  score_b: number | null;
  winner: string | null;
  ai_scorecard: AIScorecard | null;
}

/** AI scorecard criterion (Logic/Evidence/Delivery/Rebuttal) */
interface AICriterion {
  score: number;
  reason: string;
}

/** AI scorecard side scores */
interface AISideScores {
  logic: AICriterion;
  evidence: AICriterion;
  delivery: AICriterion;
  rebuttal: AICriterion;
}

/** AI scorecard persisted in arena_debates.ai_scorecard */
interface AIScorecard {
  side_a: AISideScores;
  side_b: AISideScores;
  overall_winner: string;
  verdict: string;
}

/** Power-up activation event from replay data */
interface ReplayPowerUp {
  power_up_id: string;
  user_id: string;
  activated_at: string;
  power_up_name: string;
  power_up_icon: string;
  user_name: string;
  side: string;
}

/** Reference citation from replay data */
interface ReplayReference {
  id: string;
  submitter_id: string;
  round: number | null;
  url: string;
  description: string;
  supports_side: string;
  ruling: string;
  ruling_reason: string | null;
  created_at: string;
  ruled_at: string | null;
  submitter_name: string;
  side: string;
}

/** Moderator score from replay data */
interface ReplayModScore {
  scorer_id: string;
  scorer_role: string;
  score: number;
  created_at: string;
  scorer_name: string;
}

/** Combined replay enrichment data */
interface ReplayData {
  power_ups: ReplayPowerUp[];
  references: ReplayReference[];
  mod_scores: ReplayModScore[];
}

/** Unified timeline entry for rendering */
interface TimelineEntry {
  type: 'message' | 'power_up' | 'reference';
  timestamp: string;
  round: number | null;
  side: string | null;
  data: DebateMessage | ReplayPowerUp | ReplayReference;
}

/** Single debate message (argument in a round) */
interface DebateMessage {
  round: number | null;
  side: string | null;
  is_ai: boolean | null;
  content: string | null;
  created_at: string | null;
}

/** Spectator chat message */
interface SpectatorChatMessage {
  display_name: string | null;
  message: string | null;
  created_at: string | null;
  user_id: string | null;
}

(async function init() {

  // ---- Wait for auth init, then use its Supabase client ----
  await ready;
  const sb: SupabaseClient | null = getSupabaseClient();

  // Wrapper: safeRpc with 401 recovery
  async function rpc(name: string, params?: Record<string, unknown>): Promise<SafeRpcResult> {
    return safeRpc(name, params);
  }

  const app = document.getElementById('app');
  const loading = document.getElementById('loading');
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let chatPollTimer: ReturnType<typeof setInterval> | null = null;
  let lastChatMessageAt: string | null = null;
  let lastMessageTime: string | null = null;
  let lastRenderedMessageCount = 0;
  let debateData: SpectateDebate | null = null;
  let chatMessages: SpectatorChatMessage[] = [];
  let chatOpen = true;
  let replayData: ReplayData | null = null;
  const isLoggedIn = !!(getCurrentUser() && !getIsPlaceholderMode());

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
    app.innerHTML = '<div class="error-state">Invalid debate link.</div>';
    loading.style.display = 'none';
    return;
  }

  if (!debateId) {
    app.innerHTML = '<div class="error-state">No debate ID provided.<br><a href="/" style="color:var(--gold);">Back to Home</a></div>';
    loading.style.display = 'none';
    return;
  }

  // ---- Helpers ----
  function escHtml(str: unknown) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseAvatar(avatarUrl: string | null, fallbackName: string) {
    if (avatarUrl && avatarUrl.startsWith('emoji:')) {
      return { type: 'emoji', value: avatarUrl.replace('emoji:', '') };
    }
    return { type: 'initial', value: (fallbackName || '?')[0].toUpperCase() };
  }

  function renderAvatar(avatarUrl: string | null, name: string, sideClass: string) {
    const av = parseAvatar(avatarUrl, name);
    if (av.type === 'emoji') {
      return '<div class="vs-avatar emoji">' + escHtml(av.value) + '</div>';
    }
    return '<div class="vs-avatar ' + sideClass + '">' + escHtml(av.value) + '</div>';
  }

  function modeLabel(mode: string | null) {
    const map = { live: '🎙️ LIVE AUDIO', voicememo: '🎤 VOICE MEMO', text: '⌨️ TEXT', ai: '🤖 AI SPARRING' };
    return map[mode] || mode?.toUpperCase() || 'DEBATE';
  }

  function statusBadge(status: string | null) {
    if (status === 'live') return '<span class="status-badge live"><span class="dot"></span> LIVE</span>';
    if (status === 'complete' || status === 'completed') return '<span class="status-badge complete">COMPLETE</span>';
    if (status === 'voting') return '<span class="status-badge voting">VOTING</span>';
    return '<span class="status-badge complete">' + escHtml(status?.toUpperCase() || 'UNKNOWN') + '</span>';
  }

  function timeAgo(ts: string | null) {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    return Math.floor(diff / 3600) + 'h';
  }

  // ---- Load debate ----
  async function loadDebate() {
    try {
      let debate = null;
      const { data: rpcData, error: rpcErr } = await rpc('get_arena_debate_spectator', { p_debate_id: debateId });

      if (rpcErr) {
        console.warn('[Spectate] RPC error, falling back to direct query:', rpcErr.message);
        const { data: directData, error: directErr } = await sb
          .from('arena_debates')
          .select('*, debater_a_profile:profiles!arena_debates_debater_a_fkey(display_name, username, elo_rating, avatar_url), debater_b_profile:profiles!arena_debates_debater_b_fkey(display_name, username, elo_rating, avatar_url)')
          .eq('id', debateId)
          .single();

        if (directErr || !directData) {
          console.warn('[Spectate] Direct query also failed:', directErr?.message);
          const { data: bareData, error: bareErr } = await sb
            .from('arena_debates')
            .select('*')
            .eq('id', debateId)
            .single();

          if (bareErr || !bareData) {
            showError('Debate not found. ' + (bareErr?.message || ''));
            return;
          }
          debate = {
            ...bareData,
            debater_a_name: 'Side A', debater_a_elo: 1200, debater_a_avatar: null,
            debater_b_name: 'Side B', debater_b_elo: 1200, debater_b_avatar: null,
          };
        } else {
          const pa = directData.debater_a_profile || {};
          const pb = directData.debater_b_profile || {};
          debate = {
            ...directData,
            debater_a_name: pa.display_name || pa.username || 'Side A',
            debater_a_elo: pa.elo_rating || 1200,
            debater_a_avatar: pa.avatar_url || null,
            debater_b_name: pb.display_name || pb.username || 'Side B',
            debater_b_elo: pb.elo_rating || 1200,
            debater_b_avatar: pb.avatar_url || null,
          };
        }
      } else if (!rpcData) {
        showError('Debate not found or has been removed.');
        return;
      } else {
        debate = rpcData;
      }

      debateData = debate;

      // Update page title + OG (in-page only — mirror handles static OG)
      const topicText = debate.topic || 'Debate';
      document.title = topicText + ' — The Moderator';
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', topicText + ' — Live on The Moderator');
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', (debate.debater_a_name || 'Side A') + ' vs ' + (debate.debater_b_name || 'Side B') + ' — Watch live and vote.');

      // Bump spectator count (fire-and-forget)
      rpc('bump_spectator_count', { p_debate_id: debateId }).catch((e) => console.warn('[Spectate] bump_spectator_count failed:', e));

      // Log view event (non-blocking)
      rpc('log_event', { p_event_type: 'spectate_view', p_metadata: { debate_id: debateId, topic: debate.topic || null } }).catch((e) => console.warn('[Spectate] log_event failed:', e));

      // Load messages
      let messages = [];
      try {
        const { data: msgData } = await rpc('get_debate_messages', { p_debate_id: debateId });
        messages = msgData || [];
      } catch(e) {
        const { data: directMsgs } = await sb
          .from('debate_messages')
          .select('*')
          .eq('debate_id', debateId)
          .order('round', { ascending: true })
          .order('created_at', { ascending: true })
          .limit(100);
        messages = directMsgs || [];
      }

      // Load spectator chat
      try {
        const { data: chatData } = await rpc('get_spectator_chat', { p_debate_id: debateId, p_limit: 100 });
        chatMessages = chatData || [];
        if (chatMessages.length > 0) {
          lastChatMessageAt = chatMessages[chatMessages.length - 1].created_at;
        }
      } catch(e) {
        chatMessages = [];
      }

      // Load replay enrichment data for completed debates (power-ups, references, mod scores)
      const isComplete = debate.status === 'complete' || debate.status === 'completed';
      if (isComplete) {
        try {
          const { data: rpData } = await rpc('get_debate_replay_data', { p_debate_id: debateId });
          if (rpData) {
            replayData = rpData as ReplayData;
          }
        } catch(e) {
          console.warn('[Spectate] Replay data load failed (non-fatal):', e);
          replayData = null;
        }
      }

      renderSpectateView(debate, messages);

      // Start polling if debate is active
      const isLive = debate.status === 'live' || debate.status === 'pending' || debate.status === 'round_break' || debate.status === 'voting';
      if (isLive) {
        startPolling();
        startChatPolling();
      } else {
        nudge('replay_entry', '👁️ Watching the replay. Judge for yourself.');
      }
    } catch (err) {
      console.error('[Spectate] Load error:', err);
      showError('Failed to load debate: ' + ((err as Error).message || 'Unknown error'));
    }
  }

  function showError(msg: string) {
    loading.style.display = 'none';
    app.innerHTML = '<div class="error-state">' + escHtml(msg) + '<br><a href="/" style="color:var(--gold);margin-top:12px;display:inline-block;">Back to Home</a></div>';
  }

  // ---- Render ----
  function renderSpectateView(d: SpectateDebate, messages: DebateMessage[]) {
    loading.style.display = 'none';
    const isLive = d.status === 'live' || d.status === 'pending' || d.status === 'round_break' || d.status === 'voting';
    let html = '';

    // Status + mode badges
    html += '<div class="fade-up" style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;justify-content:center;">';
    html += statusBadge(d.status);
    html += '<span class="mode-badge">' + modeLabel(d.mode) + '</span>';
    html += '</div>';

    // Topic
    html += '<div class="topic-card fade-up"><div class="topic-text">' + escHtml(d.topic) + '</div></div>';

    // VS bar
    html += '<div class="vs-bar fade-up">';
    html += '<div class="vs-debater">';
    html += renderAvatar(d.debater_a_avatar, d.debater_a_name, 'side-a');
    html += '<div><div class="vs-name">' + escHtml(d.debater_a_name) + '</div>';
    html += '<div class="vs-elo">' + Number(d.debater_a_elo) + ' ELO</div></div>';
    html += '</div>';
    html += '<div class="vs-text">VS</div>';
    html += '<div class="vs-debater right">';
    html += renderAvatar(d.debater_b_avatar, d.debater_b_name, 'side-b');
    html += '<div><div class="vs-name">' + escHtml(d.debater_b_name) + '</div>';
    html += '<div class="vs-elo">' + Number(d.debater_b_elo) + ' ELO</div></div>';
    html += '</div>';
    html += '</div>';

    // Moderator bar
    if (d.moderator_type && d.moderator_type !== 'none') {
      const modLabel = d.moderator_type === 'ai' ? 'AI Moderator' : escHtml(d.moderator_name || 'Human Moderator');
      html += '<div class="mod-bar fade-up">\u2696\uFE0F Moderated by ' + modLabel + '</div>';
    }

    // Info bar: spectators + round
    html += '<div class="info-bar fade-up">';
    html += '<span><span class="eye">👁️</span> <span id="spectator-count">' + (Number(d.spectator_count) || 1) + '</span> watching</span>';
    if (d.current_round && d.total_rounds) {
      html += '<span>·</span>';
      html += '<span>Round ' + Number(d.current_round) + '/' + Number(d.total_rounds) + '</span>';
    }
    html += '</div>';

    // === AUDIENCE PULSE GAUGE ===
    const va = Number(d.vote_count_a) || 0;
    const vb = Number(d.vote_count_b) || 0;
    const totalVotes = va + vb;
    html += '<div class="pulse-gauge fade-up" id="pulse-gauge">';
    html += '<div class="pulse-label">AUDIENCE PULSE</div>';
    if (totalVotes > 0) {
      const pctA = Math.round((va / totalVotes) * 100);
      const pctB = 100 - pctA;
      html += '<div class="pulse-track">';
      html += '<div class="pulse-fill-a" id="pulse-a" style="width:' + pctA + '%">' + pctA + '%</div>';
      html += '<div class="pulse-fill-b" id="pulse-b" style="width:' + pctB + '%">' + pctB + '%</div>';
      html += '</div>';
    } else {
      html += '<div class="pulse-track">';
      html += '<div class="pulse-fill-a" id="pulse-a" style="width:50%">—</div>';
      html += '<div class="pulse-fill-b" id="pulse-b" style="width:50%">—</div>';
      html += '</div>';
      html += '<div class="pulse-empty">Vote to move the gauge</div>';
    }
    html += '<div class="pulse-names"><span>' + escHtml(d.debater_a_name) + '</span><span>' + escHtml(d.debater_b_name) + '</span></div>';
    html += '</div>';

    // Live polling indicator
    if (isLive) {
      html += '<div class="live-indicator fade-up"><span class="pulse"></span> Auto-updating every 5s</div>';
    }

    // Message stream (enriched with power-ups and references for completed debates)
    html += '<div class="messages fade-up" id="messages">';
    if (messages.length === 0) {
      html += '<div class="msg-empty">No messages yet. The debate is getting started...</div>';
    } else {
      html += renderTimeline(messages, d);
    }
    html += '</div>';

    // === SPECTATOR CHAT ===
    html += '<div class="spec-chat fade-up" id="spec-chat">';
    html += '<div class="spec-chat-header" id="spec-chat-header">';
    html += '<span class="spec-chat-title">SPECTATOR CHAT <span class="spec-chat-count" id="chat-count">' + (chatMessages.length > 0 ? '(' + chatMessages.length + ')' : '') + '</span></span>';
    html += '<span class="spec-chat-toggle' + (chatOpen ? ' open' : '') + '" id="chat-toggle">▼</span>';
    html += '</div>';
    html += '<div class="spec-chat-body' + (chatOpen ? ' open' : '') + '" id="spec-chat-body">';
    html += '<div class="spec-chat-messages" id="spec-chat-messages">';
    if (chatMessages.length === 0) {
      html += '<div class="spec-chat-empty">No messages yet. Be the first to react!</div>';
    } else {
      html += renderChatMessages(chatMessages);
    }
    html += '</div>';
    if (isLoggedIn) {
      html += '<div class="spec-chat-input" id="chat-input-row">';
      html += '<input type="text" id="chat-input" placeholder="Say something..." maxlength="280" autocomplete="off">';
      html += '<button id="chat-send">SEND</button>';
      html += '</div>';
    } else {
      html += '<div class="spec-chat-login"><a href="/moderator-login.html">Log in</a> to chat</div>';
    }
    html += '</div></div>';

    // Scoreboard (if complete)
    if ((d.status === 'complete' || d.status === 'completed') && d.score_a != null) {
      const winnerSide = d.winner;
      html += '<div class="scoreboard fade-up">';
      html += '<div class="score-label">FINAL SCORE</div>';
      html += '<div class="score-row">';
      html += '<div class="score-side ' + (winnerSide === 'a' ? 'winner' : '') + '">';
      html += '<span class="score-name">' + escHtml(d.debater_a_name) + '</span>';
      html += '<span>' + Number(d.score_a) + '</span></div>';
      html += '<span class="score-dash">—</span>';
      html += '<div class="score-side ' + (winnerSide === 'b' ? 'winner' : '') + '">';
      html += '<span class="score-name">' + escHtml(d.debater_b_name) + '</span>';
      html += '<span>' + Number(d.score_b) + '</span></div>';
      html += '</div></div>';
    }

    // Moderator rating (if human-moderated and scores exist)
    if ((d.status === 'complete' || d.status === 'completed') && d.moderator_type === 'human' && d.moderator_name && replayData && replayData.mod_scores.length > 0) {
      html += '<div class="mod-rating-section fade-up">';
      html += '<div class="mod-rating-title">\u2696\uFE0F MODERATOR RATING</div>';
      html += '<div class="mod-rating-name">' + escHtml(d.moderator_name) + '</div>';

      const debaterScores = replayData.mod_scores.filter(s => s.scorer_role === 'debater');
      const spectatorScores = replayData.mod_scores.filter(s => s.scorer_role === 'spectator');

      if (debaterScores.length > 0) {
        html += '<div class="mod-rating-group">';
        html += '<div class="mod-rating-group-label">Debater Ratings</div>';
        for (const s of debaterScores) {
          const verdict = s.score >= 25 ? '\uD83D\uDC4D FAIR' : '\uD83D\uDC4E UNFAIR';
          html += '<div class="mod-rating-row"><span class="mod-rating-scorer">' + escHtml(s.scorer_name) + '</span><span class="mod-rating-verdict ' + (s.score >= 25 ? 'fair' : 'unfair') + '">' + verdict + '</span></div>';
        }
        html += '</div>';
      }

      if (spectatorScores.length > 0) {
        const avgScore = Math.round(spectatorScores.reduce((sum, s) => sum + s.score, 0) / spectatorScores.length);
        html += '<div class="mod-rating-group">';
        html += '<div class="mod-rating-group-label">Spectator Rating (' + spectatorScores.length + ' vote' + (spectatorScores.length !== 1 ? 's' : '') + ')</div>';
        html += '<div class="mod-rating-avg">';
        html += '<div class="mod-rating-bar-track"><div class="mod-rating-bar-fill" style="width:' + (avgScore * 2) + '%"></div></div>';
        html += '<span class="mod-rating-score">' + avgScore + '/50</span>';
        html += '</div>';
        html += '</div>';
      }
      html += '</div>';
    }

    // AI Scorecard (if persisted — AI sparring debates only)
    if ((d.status === 'complete' || d.status === 'completed') && d.ai_scorecard) {
      const sc = d.ai_scorecard;
      const nameA = escHtml(d.debater_a_name);
      const nameB = escHtml(d.debater_b_name);
      const totalA = (sc.side_a.logic.score + sc.side_a.evidence.score + sc.side_a.delivery.score + sc.side_a.rebuttal.score);
      const totalB = (sc.side_b.logic.score + sc.side_b.evidence.score + sc.side_b.delivery.score + sc.side_b.rebuttal.score);

      html += '<div class="ai-scorecard-section fade-up">';
      html += '<div class="ai-scorecard-header-row">';
      html += '<div class="ai-scorecard-side-col"><span class="ai-scorecard-name">' + nameA + '</span><span class="ai-scorecard-total ' + (totalA >= totalB ? 'winner' : 'loser') + '">' + totalA + '</span></div>';
      html += '<div class="ai-scorecard-vs">VS</div>';
      html += '<div class="ai-scorecard-side-col"><span class="ai-scorecard-name">' + nameB + '</span><span class="ai-scorecard-total ' + (totalB >= totalA ? 'winner' : 'loser') + '">' + totalB + '</span></div>';
      html += '</div>';

      const criteria: Array<{ label: string; key: keyof AISideScores }> = [
        { label: '\uD83E\uDDE0 LOGIC', key: 'logic' },
        { label: '\uD83D\uDCDA EVIDENCE', key: 'evidence' },
        { label: '\uD83C\uDFA4 DELIVERY', key: 'delivery' },
        { label: '\u2694\uFE0F REBUTTAL', key: 'rebuttal' },
      ];
      for (const c of criteria) {
        const a = sc.side_a[c.key];
        const b = sc.side_b[c.key];
        html += '<div class="ai-score-criterion">';
        html += '<div class="ai-score-criterion-header"><span class="ai-score-criterion-label">' + c.label + '</span><span class="ai-score-criterion-nums">' + a.score + ' \u2014 ' + b.score + '</span></div>';
        html += '<div class="ai-score-bars"><div class="ai-score-bar side-a" style="width:' + (a.score * 10) + '%"></div><div class="ai-score-bar side-b" style="width:' + (b.score * 10) + '%"></div></div>';
        html += '<div class="ai-score-reason">' + escHtml(a.reason) + '</div>';
        html += '</div>';
      }

      if (sc.verdict) {
        html += '<div class="ai-scorecard-verdict">' + escHtml(sc.verdict) + '</div>';
      }
      html += '</div>';
    }

    // Vote section
    html += '<div class="vote-section fade-up" id="vote-section">';
    html += '<div class="vote-headline">WHO\'S WINNING?</div>';
    html += '<div class="vote-sub">Cast your vote. One vote per debate.</div>';
    html += '<div class="vote-row">';
    html += '<button class="vote-btn va" id="vote-a">' + escHtml(d.debater_a_name) + '</button>';
    html += '<button class="vote-btn vb" id="vote-b">' + escHtml(d.debater_b_name) + '</button>';
    html += '</div>';
    html += '<div class="vote-results" id="vote-results">';
    html += '<div class="vote-bar-track"><div class="vote-bar-fill a-fill" id="bar-a" style="width:50%">50%</div><div class="vote-bar-fill b-fill" id="bar-b" style="width:50%">50%</div></div>';
    html += '<div class="vote-count" id="vote-count"></div>';
    html += '</div></div>';

    // Share bar (enhanced with WhatsApp + social proof)
    html += '<div class="share-bar fade-up">';
    html += '<button class="share-btn" id="share-copy">📋 Copy Link</button>';
    html += '<button class="share-btn" id="share-x">𝕏 Share</button>';
    html += '<button class="share-btn" id="share-wa">💬 WhatsApp</button>';
    html += '<button class="share-btn" id="share-native">↗ Share</button>';
    html += '</div>';

    // CTA
    html += '<div class="cta-banner fade-up">';
    html += '<div class="cta-headline">THINK YOU COULD DO BETTER?</div>';
    html += '<div class="cta-sub">Join The Moderator and debate it yourself. Challenge anyone. Build your record.</div>';
    html += '<a href="/moderator-plinko.html" class="cta-btn">ENTER THE ARENA</a>';
    html += '</div>';

    // Footer
    html += '<div class="footer fade-up">Live debate on <a href="/">The Moderator</a> · <a href="/moderator-terms.html">Terms</a></div>';

    app.innerHTML = html;
    lastRenderedMessageCount = messages.length;

    wireVoteButtons(d);
    wireShareButtons(d);
    wireChatUI(d);

    if ((d.vote_count_a || 0) + (d.vote_count_b || 0) > 0) {
      updateVoteBar(d.vote_count_a || 0, d.vote_count_b || 0);
    }
  }

  // ---- Enriched Timeline (completed debates with power-ups + references) ----
  function renderTimeline(messages: DebateMessage[], d: SpectateDebate) {
    // If no replay data, fall back to basic message rendering
    if (!replayData || (replayData.power_ups.length === 0 && replayData.references.length === 0)) {
      return renderMessages(messages, d);
    }

    // Build unified timeline entries
    const entries: TimelineEntry[] = [];

    for (const m of messages) {
      entries.push({
        type: 'message',
        timestamp: m.created_at || '1970-01-01T00:00:00Z',
        round: m.round,
        side: m.side,
        data: m,
      });
    }

    for (const pu of replayData.power_ups) {
      entries.push({
        type: 'power_up',
        timestamp: pu.activated_at,
        round: null,
        side: pu.side,
        data: pu,
      });
    }

    for (const ref of replayData.references) {
      entries.push({
        type: 'reference',
        timestamp: ref.created_at,
        round: ref.round,
        side: ref.side,
        data: ref,
      });
    }

    // Sort by timestamp
    entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let html = '';
    let lastRound = 0;

    for (const entry of entries) {
      if (entry.type === 'message') {
        const m = entry.data as DebateMessage;
        if (m.round && m.round !== lastRound) {
          html += '<div class="round-divider">\u2014 Round ' + Number(m.round) + ' \u2014</div>';
          lastRound = m.round;
        }
        const side = m.side || 'a';
        const isAI = m.is_ai;
        const name = isAI ? '\uD83E\uDD16 AI'
          : side === 'a' ? (d.debater_a_name || 'Side A')
          : (d.debater_b_name || 'Side B');
        html += '<div class="msg side-' + escHtml(side) + '">';
        html += '<div class="msg-name">' + escHtml(name) + '</div>';
        html += '<div class="msg-text">' + escHtml(m.content) + '</div>';
        html += '<div class="msg-round">Round ' + Number(m.round) + '</div>';
        html += '</div>';
        if (m.created_at && (!lastMessageTime || m.created_at > lastMessageTime)) {
          lastMessageTime = m.created_at;
        }

      } else if (entry.type === 'power_up') {
        const pu = entry.data as ReplayPowerUp;
        const sideClass = pu.side === 'a' ? 'side-a' : 'side-b';
        html += '<div class="timeline-event power-up-event ' + sideClass + '">';
        html += '<span class="timeline-icon">' + escHtml(pu.power_up_icon) + '</span>';
        html += '<span class="timeline-text">' + escHtml(pu.user_name) + ' used <strong>' + escHtml(pu.power_up_name) + '</strong></span>';
        html += '</div>';

      } else if (entry.type === 'reference') {
        const ref = entry.data as ReplayReference;
        const sideClass = ref.side === 'a' ? 'side-a' : 'side-b';
        const rulingIcon = ref.ruling === 'accepted' ? '\u2705' : ref.ruling === 'rejected' ? '\u274C' : '\u23F3';
        const rulingText = ref.ruling === 'accepted' ? 'Accepted' : ref.ruling === 'rejected' ? 'Rejected' : 'Pending';
        html += '<div class="timeline-event reference-event ' + sideClass + '">';
        html += '<span class="timeline-icon">\uD83D\uDCCE</span>';
        html += '<span class="timeline-text">' + escHtml(ref.submitter_name) + ' cited a source</span>';
        if (ref.description) {
          html += '<div class="ref-desc">' + escHtml(ref.description) + '</div>';
        }
        if (ref.url) {
          html += '<div class="ref-url">' + escHtml(ref.url) + '</div>';
        }
        html += '<div class="ref-ruling">' + rulingIcon + ' ' + rulingText;
        if (ref.ruling_reason) {
          html += ' \u2014 ' + escHtml(ref.ruling_reason);
        }
        html += '</div>';
        html += '</div>';
      }
    }

    return html;
  }

  // ---- Debate Messages (used by live polling to append new messages) ----
  function renderMessages(messages: DebateMessage[], d: SpectateDebate) {
    let html = '';
    let lastRound = 0;
    for (const m of messages) {
      if (m.round && m.round !== lastRound) {
        html += '<div class="round-divider">— Round ' + Number(m.round) + ' —</div>';
        lastRound = m.round;
      }
      const side = m.side || 'a';
      const isAI = m.is_ai;
      const name = isAI ? '🤖 AI'
        : side === 'a' ? (d.debater_a_name || 'Side A')
        : (d.debater_b_name || 'Side B');
      html += '<div class="msg side-' + escHtml(side) + '">';
      html += '<div class="msg-name">' + escHtml(name) + '</div>';
      html += '<div class="msg-text">' + escHtml(m.content) + '</div>';
      html += '<div class="msg-round">Round ' + Number(m.round) + '</div>';
      html += '</div>';
      if (m.created_at && (!lastMessageTime || m.created_at > lastMessageTime)) {
        lastMessageTime = m.created_at;
      }
    }
    return html;
  }

  // ---- Spectator Chat Messages ----
  function renderChatMessages(msgs: SpectatorChatMessage[]) {
    let html = '';
    for (const m of msgs) {
      html += '<div class="sc-msg">';
      html += '<span class="sc-msg-name">' + escHtml(m.display_name) + '</span>';
      html += '<span class="sc-msg-text">' + escHtml(m.message) + '</span>';
      html += '<span class="sc-msg-time">' + timeAgo(m.created_at) + '</span>';
      html += '</div>';
    }
    return html;
  }

  // ---- Chat UI ----
  function wireChatUI(d: SpectateDebate) {
    const header = document.getElementById('spec-chat-header');
    if (header) {
      header.addEventListener('click', () => {
        chatOpen = !chatOpen;
        const body = document.getElementById('spec-chat-body');
        const toggle = document.getElementById('chat-toggle');
        if (body) body.classList.toggle('open', chatOpen);
        if (toggle) toggle.classList.toggle('open', chatOpen);
      });
    }

    if (!isLoggedIn) return;

    const input = document.getElementById('chat-input') as HTMLInputElement | null;
    const sendBtn = document.getElementById('chat-send') as HTMLButtonElement | null;
    if (!input || !sendBtn) return;

    let sending = false;

    async function sendChat() {
      if (sending) return;
      const msg = input.value.trim();
      if (!msg || msg.length > 280) return;

      sending = true;
      sendBtn.disabled = true;
      input.value = '';

      try {
        const { data, error } = await rpc('send_spectator_chat', {
          p_debate_id: debateId,
          p_message: msg
        });

        if (error) {
          console.warn('[Spectate] Chat send error:', error.message);
          input.value = msg;
        } else if (data && data.success === false) {
          console.warn('[Spectate] Chat rejected:', data.error);
          input.placeholder = data.error || 'Error';
          setTimeout(() => { input.placeholder = 'Say something...'; }, 2000);
          if (data.error && !data.error.includes('Slow down')) {
            input.value = msg;
          }
        } else {
          // Optimistic append
          const displayName = data?.display_name || getCurrentProfile()?.display_name || 'You';
          chatMessages.push({
            display_name: displayName,
            message: msg,
            created_at: new Date().toISOString(),
            user_id: getCurrentUser()?.id || null
          });
          refreshChatUI();
        }
      } catch (err) {
        console.warn('[Spectate] Chat error:', err);
        input.value = msg;
      }

      sending = false;
      sendBtn.disabled = false;
      input.focus();
    }

    sendBtn.addEventListener('click', sendChat);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
  }

  function refreshChatUI() {
    const container = document.getElementById('spec-chat-messages');
    const countEl = document.getElementById('chat-count');
    if (!container) return;

    if (chatMessages.length === 0) {
      container.innerHTML = '<div class="spec-chat-empty">No messages yet. Be the first to react!</div>';
    } else {
      container.innerHTML = renderChatMessages(chatMessages);
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
    if (countEl) countEl.textContent = chatMessages.length > 0 ? '(' + chatMessages.length + ')' : '';
  }

  // ---- Audience Pulse Update ----
  function updatePulse(va: number, vb: number) {
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

  // ---- Polling (live debates) ----
  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      try {
        let freshDebate = null;
        const { data: rpcData, error: rpcErr } = await rpc('get_arena_debate_spectator', { p_debate_id: debateId });
        if (rpcErr || !rpcData) {
          const { data: directData } = await sb.from('arena_debates').select('*').eq('id', debateId).single();
          if (directData) {
            freshDebate = { ...directData, debater_a_name: debateData?.debater_a_name || 'Side A', debater_b_name: debateData?.debater_b_name || 'Side B' };
          }
        } else {
          freshDebate = rpcData;
        }
        if (!freshDebate) return;

        // Update spectator count
        const countEl = document.getElementById('spectator-count');
        if (countEl) countEl.textContent = Number(freshDebate.spectator_count) || 1;

        // Update vote counts + audience pulse
        const freshVA = freshDebate.vote_count_a || 0;
        const freshVB = freshDebate.vote_count_b || 0;
        if (freshVA || freshVB) {
          updateVoteBar(freshVA, freshVB);
          updatePulse(freshVA, freshVB);
        }

        // Fetch new messages
        let allMessages = [];
        try {
          const { data: msgData } = await rpc('get_debate_messages', { p_debate_id: debateId });
          allMessages = msgData || [];
        } catch(e) {
          const { data: directMsgs } = await sb.from('debate_messages').select('*').eq('debate_id', debateId).order('round').order('created_at').limit(100);
          allMessages = directMsgs || [];
        }

        if (allMessages.length > 0) {
          const messagesEl = document.getElementById('messages');
          if (messagesEl) {
            if (allMessages.length > lastRenderedMessageCount) {
              const newMessages = allMessages.slice(lastRenderedMessageCount);
              const newHtml = renderMessages(newMessages, freshDebate);
              const atBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 80;
              messagesEl.insertAdjacentHTML('beforeend', newHtml);
              lastRenderedMessageCount = allMessages.length;
              if (atBottom) messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
            }
          }
        }

        // Stop polling if debate ended
        if (freshDebate.status === 'complete' || freshDebate.status === 'completed' || freshDebate.status === 'cancelled' || freshDebate.status === 'canceled') {
          clearInterval(pollTimer);
          pollTimer = null;
          if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
          debateData = freshDebate;
          renderSpectateView(freshDebate, allMessages);
        }
      } catch (err) {
        console.warn('[Spectate] Poll error:', err);
      }
    }, 5000);
  }

  // ---- Chat Polling (staggered from debate poll) ----
  function startChatPolling() {
    if (chatPollTimer) clearInterval(chatPollTimer);
    chatPollTimer = setInterval(async () => {
      try {
        const { data: freshChat } = await rpc('get_spectator_chat', { p_debate_id: debateId, p_limit: 100 });
        if (!freshChat || freshChat.length === 0) return;
        const newMessages = lastChatMessageAt
          ? freshChat.filter((m: SpectatorChatMessage) => m.created_at > lastChatMessageAt!)
          : freshChat;
        if (newMessages.length === 0) return;
        chatMessages.push(...newMessages);
        lastChatMessageAt = chatMessages[chatMessages.length - 1].created_at;
        refreshChatUI();
      } catch (e) {
        // Silent fail on chat poll
      }
    }, 6000);
  }

  // ---- Voting ----
  function wireVoteButtons(d: SpectateDebate) {
    const btnA = document.getElementById('vote-a');
    const btnB = document.getElementById('vote-b');
    if (!btnA || !btnB) return;
    btnA.addEventListener('click', () => castVote('a', d));
    btnB.addEventListener('click', () => castVote('b', d));
  }

  let _voteCast = false;
  async function castVote(side: string, d: SpectateDebate) {
    if (_voteCast) return;
    _voteCast = true;
    const btnA = document.getElementById('vote-a') as HTMLButtonElement | null;
    const btnB = document.getElementById('vote-b') as HTMLButtonElement | null;

    if (btnA) btnA.disabled = true;
    if (btnB) btnB.disabled = true;
    btnA?.classList.add('voted');
    btnB?.classList.add('voted');
    if (side === 'a') btnA?.classList.add('selected');
    if (side === 'b') btnB?.classList.add('selected');

    try {
      const { data, error } = await rpc('vote_arena_debate', {
        p_debate_id: debateId,
        p_vote: side,
      });
      if (error) console.warn('[Spectate] Vote error:', error.message);

      nudge('first_vote', '🗳️ Vote cast. Your voice shapes the verdict.');

      const { data: fresh } = await rpc('get_arena_debate_spectator', { p_debate_id: debateId });
      if (fresh) {
        updateVoteBar(fresh.vote_count_a || 0, fresh.vote_count_b || 0);
        updatePulse(fresh.vote_count_a || 0, fresh.vote_count_b || 0);
      } else {
        const fva = (d.vote_count_a || 0) + (side === 'a' ? 1 : 0);
        const fvb = (d.vote_count_b || 0) + (side === 'b' ? 1 : 0);
        updateVoteBar(fva, fvb);
        updatePulse(fva, fvb);
      }

      claimVote(debateId);
    } catch (err) {
      const fva = (d.vote_count_a || 0) + (side === 'a' ? 1 : 0);
      const fvb = (d.vote_count_b || 0) + (side === 'b' ? 1 : 0);
      updateVoteBar(fva, fvb);
      updatePulse(fva, fvb);
    }
  }

  function updateVoteBar(va: number, vb: number) {
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

  // ---- Sharing (social proof + WhatsApp) ----
  function wireShareButtons(d: SpectateDebate) {
    const url = window.location.href;
    const specCount = Number(d.spectator_count) || 0;
    const proofText = specCount > 1 ? specCount + ' watching — ' : '';
    const text = '⚔️ ' + proofText + (d.topic || 'Live Debate') + ' — Watch on The Moderator';

    document.getElementById('share-copy')?.addEventListener('click', () => {
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('share-copy');
        if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy Link'; }, 2000); }
      }).catch((e) => console.warn('[Spectate] clipboard copy failed:', e));
    });

    document.getElementById('share-x')?.addEventListener('click', () => {
      window.open('https://x.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank');
    });

    document.getElementById('share-wa')?.addEventListener('click', () => {
      window.open('https://wa.me/?text=' + encodeURIComponent(text + '\n' + url), '_blank');
    });

    document.getElementById('share-native')?.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({ title: d.topic || 'Live Debate', text: text, url: url }).catch(() => {});
      } else {
        navigator.clipboard.writeText(url).catch((e) => console.warn('[Spectate] clipboard fallback failed:', e));
      }
    });
  }

  // ---- Cleanup ----
  window.addEventListener('beforeunload', () => {
    if (pollTimer) clearInterval(pollTimer);
    if (chatPollTimer) clearInterval(chatPollTimer);
  });

  // ---- Go ----
  loadDebate();
})();
