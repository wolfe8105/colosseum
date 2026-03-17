/**
 * THE COLOSSEUM — Spectator View Controller (TypeScript)
 *
 * Extracted from colosseum-spectate.html inline script.
 * Live/completed debate spectating, message stream, spectator chat,
 * audience pulse gauge, voting, share with social proof.
 *
 * Migration: Session 128 (Phase 4)
 * NOTE: Mechanical extraction from IIFE. Type annotations added at
 * key boundaries. tsconfig strict mode will flag remaining issues.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

(async function init() {

  // ---- Wait for auth init, then use its Supabase client ----
  let sb: any;
  try {
    if (typeof (window as any).ColosseumAuth !== 'undefined' && (window as any).ColosseumAuth.ready) {
      await (window as any).ColosseumAuth.ready;
      sb = (window as any).ColosseumAuth.supabase;
    }
  } catch(_e) { /* auth init timeout — fall through */ }

  // Fallback: create our own client if auth didn't provide one
  if (!sb) {
    const cfg = (window as any).ColosseumConfig || {};
    if ((window as any).supabase?.createClient) {
      sb = (window as any).supabase.createClient(
        cfg.SUPABASE_URL || 'https://faomczmipsccwbhpivmp.supabase.co',
        cfg.SUPABASE_ANON_KEY || 'PASTE_YOUR_ANON_KEY_HERE'
      );
    } else {
      const el = document.getElementById('app');
      if (el) el.innerHTML = '<div class="error-state">Failed to initialize. Please refresh.</div>';
      return;
    }
  }

  // Wrapper: use safeRpc when available (401 retry), fall back to sb.rpc
  async function rpc(name: string, params?: Record<string, unknown>): Promise<any> {
    if (typeof (window as any).ColosseumAuth !== 'undefined' && (window as any).ColosseumAuth.safeRpc) {
      return (window as any).ColosseumAuth.safeRpc(name, params);
    }
    return sb.rpc(name, params);
  }

  const app = document.getElementById('app');
  const loading = document.getElementById('loading');
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let chatPollTimer: ReturnType<typeof setInterval> | null = null;
  let lastMessageTime: string | null = null;
  let debateData: any = null;
  let chatMessages: any[] = [];
  let chatOpen = true;
  const ColosseumAuth = (window as any).ColosseumAuth;
  const isLoggedIn = !!(typeof ColosseumAuth !== 'undefined' && ColosseumAuth?.currentUser && !ColosseumAuth?.isPlaceholderMode);

  // ---- Back button ----
  document.getElementById('back-btn').addEventListener('click', () => {
    if (document.referrer && document.referrer.includes(location.host)) {
      history.back();
    } else {
      window.location.href = '/';
    }
  });

  // ---- Hide JOIN button if logged in ----
  if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.currentUser) {
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
  function escHtml(str: any) {
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
      return '<div class="vs-avatar emoji">' + av.value + '</div>';
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
      document.title = topicText + ' — The Colosseum';
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', topicText + ' — Live on The Colosseum');
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', (debate.debater_a_name || 'Side A') + ' vs ' + (debate.debater_b_name || 'Side B') + ' — Watch live and vote.');

      // Bump spectator count (fire-and-forget)
      rpc('bump_spectator_count', { p_debate_id: debateId }).catch(() => {});

      // Log view event (non-blocking)
      rpc('log_event', { p_event_type: 'spectate_view', p_metadata: { debate_id: debateId, topic: debate.topic || null } }).catch(() => {});

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
          .order('created_at', { ascending: true });
        messages = directMsgs || [];
      }

      // Load spectator chat
      try {
        const { data: chatData } = await rpc('get_spectator_chat', { p_debate_id: debateId, p_limit: 100 });
        chatMessages = chatData || [];
      } catch(e) {
        chatMessages = [];
      }

      renderSpectateView(debate, messages);

      // Start polling if debate is active
      const isLive = debate.status === 'live' || debate.status === 'pending' || debate.status === 'round_break' || debate.status === 'voting';
      if (isLive) {
        startPolling();
        startChatPolling();
      }
    } catch (err) {
      console.error('[Spectate] Load error:', err);
      showError('Failed to load debate: ' + (err.message || 'Unknown error'));
    }
  }

  function showError(msg: string) {
    loading.style.display = 'none';
    app.innerHTML = '<div class="error-state">' + escHtml(msg) + '<br><a href="/" style="color:var(--gold);margin-top:12px;display:inline-block;">Back to Home</a></div>';
  }

  // ---- Render ----
  function renderSpectateView(d: any, messages: any[]) {
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
      const modLabel = d.moderator_type === 'ai' ? 'AI Moderator' : 'Human Moderator';
      html += '<div class="mod-bar fade-up">⚖️ Moderated by ' + escHtml(modLabel) + '</div>';
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

    // Message stream
    html += '<div class="messages fade-up" id="messages">';
    if (messages.length === 0) {
      html += '<div class="msg-empty">No messages yet. The debate is getting started...</div>';
    } else {
      html += renderMessages(messages, d);
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
      html += '<div class="spec-chat-login"><a href="/colosseum-login.html">Log in</a> to chat</div>';
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
    html += '<div class="cta-sub">Join The Colosseum and debate it yourself. Challenge anyone. Build your record.</div>';
    html += '<a href="/colosseum-plinko.html" class="cta-btn">ENTER THE ARENA</a>';
    html += '</div>';

    // Footer
    html += '<div class="footer fade-up">Live debate on <a href="/">The Colosseum</a> · <a href="/colosseum-terms.html">Terms</a></div>';

    app.innerHTML = html;

    wireVoteButtons(d);
    wireShareButtons(d);
    wireChatUI(d);

    if ((d.vote_count_a || 0) + (d.vote_count_b || 0) > 0) {
      updateVoteBar(d.vote_count_a || 0, d.vote_count_b || 0);
    }
  }

  // ---- Debate Messages ----
  function renderMessages(messages: any[], d: any) {
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
  function renderChatMessages(msgs: any[]) {
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
  function wireChatUI(d: any) {
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

    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
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
          const displayName = data?.display_name || (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.currentProfile?.display_name) || 'You';
          chatMessages.push({
            display_name: displayName,
            message: msg,
            created_at: new Date().toISOString(),
            user_id: (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.currentUser?.id) || null
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
          const { data: directMsgs } = await sb.from('debate_messages').select('*').eq('debate_id', debateId).order('round').order('created_at');
          allMessages = directMsgs || [];
        }

        if (allMessages.length > 0) {
          const messagesEl = document.getElementById('messages');
          if (messagesEl) {
            const currentCount = messagesEl.querySelectorAll('.msg:not(.msg-empty)').length;
            if (allMessages.length > currentCount) {
              messagesEl.innerHTML = renderMessages(allMessages, freshDebate);
              messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
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
        if (freshChat && freshChat.length !== chatMessages.length) {
          chatMessages = freshChat;
          refreshChatUI();
        }
      } catch (e) {
        // Silent fail on chat poll
      }
    }, 6000);
  }

  // ---- Voting ----
  function wireVoteButtons(d: any) {
    const btnA = document.getElementById('vote-a');
    const btnB = document.getElementById('vote-b');
    if (!btnA || !btnB) return;
    btnA.addEventListener('click', () => castVote('a', d));
    btnB.addEventListener('click', () => castVote('b', d));
  }

  async function castVote(side: string, d: any) {
    const btnA = document.getElementById('vote-a');
    const btnB = document.getElementById('vote-b');

    btnA.classList.add('voted');
    btnB.classList.add('voted');
    if (side === 'a') btnA.classList.add('selected');
    if (side === 'b') btnB.classList.add('selected');

    try {
      const { data, error } = await rpc('vote_arena_debate', {
        p_debate_id: debateId,
        p_vote: side,
      });
      if (error) console.warn('[Spectate] Vote error:', error.message);

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

      if (typeof ColosseumTokens !== 'undefined') {
        ColosseumTokens.claimVote(debateId);
      }
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
  function wireShareButtons(d: any) {
    const url = window.location.href;
    const specCount = Number(d.spectator_count) || 0;
    const proofText = specCount > 1 ? specCount + ' watching — ' : '';
    const text = '⚔️ ' + proofText + (d.topic || 'Live Debate') + ' — Watch on The Colosseum';

    document.getElementById('share-copy')?.addEventListener('click', () => {
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('share-copy');
        if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy Link'; }, 2000); }
      }).catch(() => {});
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
        navigator.clipboard.writeText(url).catch(() => {});
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
