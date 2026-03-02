// ============================================================
// COLOSSEUM ASYNC — Hot Takes, Predictions, Rivals, Challenges
// Items: 14.3.3, 14.8.1, 7.9.4
// Post → React → Challenge → Structure appears
//
// SESSION 17: Migrated all writes to .rpc() calls.
// SESSION 22: Wired to Supabase with fetchTakes().
// SESSION 23: Added predictions cards, rivals display,
//   tappable usernames → profile modal, fetchPredictions().
// ============================================================

window.ColosseumAsync = (() => {

  let hotTakes = [];
  let predictions = [];
  let currentFilter = 'all';

  // --- Placeholder Data ---
  const PLACEHOLDER_TAKES = {
    all: [
      { id: 't1', user_id: 'u1', user: 'SHARPMIND', elo: 1847, text: 'AI is going to make 50% of white-collar jobs obsolete by 2030. Not a question of if.', section: 'trending', reactions: 1247, challenges: 23, time: '2h', userReacted: false },
      { id: 't2', user_id: 'u2', user: 'BOLDCLAIM', elo: 1280, text: 'Patrick Mahomes is already the greatest QB ever. Stats don\'t lie.', section: 'sports', reactions: 531, challenges: 11, time: '45m', userReacted: false },
      { id: 't3', user_id: 'u3', user: 'SENATEWATCH', elo: 1340, text: 'Term limits would fix 80% of Congress overnight. Change my mind.', section: 'politics', reactions: 312, challenges: 4, time: '12m', userReacted: false },
      { id: 't4', user_id: 'u4', user: 'FILMTAKES', elo: 1190, text: 'Christopher Nolan peaked at The Dark Knight. Everything since is style over substance.', section: 'entertainment', reactions: 402, challenges: 8, time: '15m', userReacted: false },
      { id: 't5', user_id: 'u5', user: 'TECHBRO_NO', elo: 1590, text: 'Every generation thinks they\'re living through the apocalypse. AI doomerism is no different.', section: 'trending', reactions: 894, challenges: 17, time: '3h', userReacted: false },
      { id: 't6', user_id: 'u6', user: 'HOOPHEAD', elo: 1420, text: 'The NBA play-in tournament is the best thing the league has done in 20 years.', section: 'sports', reactions: 247, challenges: 6, time: '8m', userReacted: false },
    ],
    politics: [],
    sports: [],
    entertainment: [],
    trending: [],
  };

  const PLACEHOLDER_PREDICTIONS = [
    { debate_id: 'd1', topic: 'Should the Electoral College Be Abolished?', p1: 'ConstitutionFan', p2: 'DirectDemocrat', p1_elo: 1340, p2_elo: 1290, total: 847, pct_a: 38, pct_b: 62, user_pick: null, status: 'live' },
    { debate_id: 'd2', topic: 'MJ vs LeBron — Who\'s the Real GOAT?', p1: 'ChicagoBull', p2: 'AkronHammer', p1_elo: 1580, p2_elo: 1620, total: 2341, pct_a: 55, pct_b: 45, user_pick: null, status: 'live' },
    { debate_id: 'd3', topic: 'AI Will Replace 50% of Jobs by 2030', p1: 'TechRealist', p2: 'HumanFirst', p1_elo: 1490, p2_elo: 1310, total: 1205, pct_a: 67, pct_b: 33, user_pick: null, status: 'scheduled' },
  ];

  // Populate category filters from all
  PLACEHOLDER_TAKES.all.forEach(t => {
    if (PLACEHOLDER_TAKES[t.section]) {
      PLACEHOLDER_TAKES[t.section].push(t);
    }
  });

  function init() {
    hotTakes = [...PLACEHOLDER_TAKES.all];
    predictions = [...PLACEHOLDER_PREDICTIONS];
  }

  // --- Fetch takes from Supabase (SESSION 22) ---
  async function fetchTakes(section) {
    if (!ColosseumAuth?.supabase || ColosseumAuth.isPlaceholderMode) return;

    try {
      let query = ColosseumAuth.supabase
        .from('hot_takes')
        .select('id, content, section, created_at, user_id, profiles(username, display_name, elo_rating)')
        .order('created_at', { ascending: false })
        .limit(30);

      if (section && section !== 'all') {
        query = query.eq('section', section);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        hotTakes = data.map(t => ({
          id: t.id,
          user_id: t.user_id,
          user: (t.profiles?.username || 'ANON').toUpperCase(),
          elo: t.profiles?.elo_rating || 1200,
          text: t.content,
          section: t.section,
          reactions: 0,
          challenges: 0,
          time: _timeAgo(t.created_at),
          userReacted: false,
        }));

        // Load reactions for current user
        if (ColosseumAuth.currentUser?.id) {
          try {
            const { data: reacts } = await ColosseumAuth.supabase
              .from('hot_take_reactions')
              .select('hot_take_id')
              .eq('user_id', ColosseumAuth.currentUser.id)
              .in('hot_take_id', hotTakes.map(t => t.id));
            if (reacts) {
              const reactedIds = new Set(reacts.map(r => r.hot_take_id));
              hotTakes.forEach(t => { t.userReacted = reactedIds.has(t.id); });
            }
          } catch (e) { /* non-critical */ }
        }
      }
    } catch (e) {
      console.error('fetchTakes error:', e);
    }
  }

  // --- SESSION 23: Fetch Predictions from Supabase ---
  async function fetchPredictions() {
    if (!ColosseumAuth?.supabase || ColosseumAuth.isPlaceholderMode) return;

    try {
      const { data, error } = await ColosseumAuth.supabase.rpc('get_hot_predictions', { p_limit: 10 });
      if (error) throw error;

      if (data && data.length > 0) {
        predictions = data.map(d => ({
          debate_id: d.debate_id,
          topic: d.topic,
          p1: d.p1_username || d.p1_display_name || 'Side A',
          p2: d.p2_username || d.p2_display_name || 'Side B',
          p1_elo: d.p1_elo || 1200,
          p2_elo: d.p2_elo || 1200,
          total: d.prediction_count || 0,
          pct_a: d.prediction_count > 0 ? Math.round((d.picks_a / d.prediction_count) * 100) : 50,
          pct_b: d.prediction_count > 0 ? Math.round((d.picks_b / d.prediction_count) * 100) : 50,
          user_pick: null,
          status: d.status,
        }));
      }
    } catch (e) {
      console.error('fetchPredictions error:', e);
      // Fall back to placeholder
    }
  }

  // --- Load Hot Takes ---
  function loadHotTakes(category = 'all') {
    currentFilter = category;
    const container = document.getElementById('hot-takes-feed');
    if (!container) return;

    const takes = category === 'all' ? hotTakes : hotTakes.filter(t => t.section === category);

    if (takes.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px 16px;color:#a0a8b8;">
          <div style="font-size:36px;margin-bottom:8px;">🤫</div>
          <div style="font-size:14px;">No takes here yet. Be the first.</div>
        </div>`;
      return;
    }

    container.innerHTML = takes.map(t => _renderTake(t)).join('');
  }

  function _renderTake(t) {
    const userClickable = t.user_id && t.user_id !== ColosseumAuth?.currentUser?.id;
    const userAttr = userClickable ? `onclick="ColosseumAuth?.showUserProfile?.('${t.user_id}')" style="cursor:pointer;"` : '';

    return `
      <div class="hot-take-card" data-id="${t.id}" style="
        background:#132240;border:1px solid rgba(255,255,255,0.06);border-radius:12px;
        padding:14px;margin-bottom:10px;
      ">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <div ${userAttr} style="width:32px;height:32px;border-radius:50%;background:#1a2d4a;border:2px solid #d4a843;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#d4a843;${userClickable ? 'cursor:pointer;' : ''}">
            ${t.user[0]}
          </div>
          <div>
            <span ${userAttr} style="font-weight:700;font-size:13px;color:#f0f0f0;${userClickable ? 'cursor:pointer;' : ''}">${t.user}</span>
            <span style="font-size:11px;color:#6a7a90;margin-left:6px;">ELO ${t.elo}</span>
          </div>
          <div style="margin-left:auto;font-size:11px;color:#6a7a90;">${t.time}</div>
        </div>
        
        <div style="font-size:14px;line-height:1.5;color:#f0f0f0;margin-bottom:12px;">${t.text}</div>
        
        <div style="display:flex;align-items:center;gap:12px;">
          <button onclick="ColosseumAsync.react('${t.id}')" style="
            display:flex;align-items:center;gap:4px;background:${t.userReacted ? 'rgba(204,41,54,0.15)' : 'rgba(255,255,255,0.05)'};
            border:1px solid ${t.userReacted ? 'rgba(204,41,54,0.3)' : 'rgba(255,255,255,0.08)'};
            color:${t.userReacted ? '#cc2936' : '#a0a8b8'};
            padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;
          ">🔥 ${t.reactions}</button>
          
          <button onclick="ColosseumAsync.challenge('${t.id}')" style="
            display:flex;align-items:center;gap:4px;
            background:rgba(204,41,54,0.1);border:1px solid rgba(204,41,54,0.3);
            color:#cc2936;padding:6px 12px;border-radius:20px;
            font-size:12px;font-weight:700;cursor:pointer;
          ">⚔️ BET. (${t.challenges})</button>
          
          <button onclick="ColosseumShare?.shareTake?.('${t.id}','${encodeURIComponent(t.text)}')" style="
            display:flex;align-items:center;gap:4px;
            background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);
            color:#a0a8b8;padding:6px 12px;border-radius:20px;
            font-size:12px;cursor:pointer;
          ">↗ Share</button>
        </div>
      </div>`;
  }

  // --- SESSION 23: Render Prediction Cards ---
  function renderPredictions(container) {
    if (!container) return;
    if (!predictions.length) {
      container.innerHTML = `<div style="text-align:center;padding:20px;color:#6a7a90;font-size:13px;">No active predictions yet.</div>`;
      return;
    }

    container.innerHTML = `
      <div style="padding:0 0 8px;font-family:'Cinzel',serif;font-size:14px;letter-spacing:2px;color:#d4a843;">🔮 PREDICTIONS</div>
      ${predictions.map(p => _renderPredictionCard(p)).join('')}`;
  }

  function _renderPredictionCard(p) {
    const isLive = p.status === 'live' || p.status === 'in_progress';
    return `
      <div style="background:#132240;border:1px solid rgba(212,168,67,0.15);border-radius:12px;padding:14px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          ${isLive ? '<span style="display:flex;align-items:center;gap:4px;font-size:11px;color:#cc2936;font-weight:600;letter-spacing:1px;"><span style="width:6px;height:6px;background:#cc2936;border-radius:50%;animation:livePulse 1.5s ease-in-out infinite;"></span>LIVE</span>' : '<span style="font-size:11px;color:#d4a843;letter-spacing:1px;">UPCOMING</span>'}
          <span style="font-size:11px;color:#6a7a90;">${p.total} predictions</span>
        </div>
        
        <div style="font-family:'Cinzel',serif;font-size:14px;color:#f0f0f0;margin-bottom:12px;line-height:1.3;">${p.topic}</div>
        
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <button onclick="ColosseumAsync.placePrediction('${p.debate_id}','a')" style="
            flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:none;
            background:${p.user_pick === 'a' ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.04)'};
            border:1px solid ${p.user_pick === 'a' ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.08)'};
          ">
            <div style="font-weight:700;font-size:13px;color:#f0f0f0;">${p.p1}</div>
            <div style="font-size:11px;color:#6a7a90;">ELO ${p.p1_elo}</div>
          </button>
          <div style="display:flex;align-items:center;font-family:'Cinzel',serif;font-size:12px;color:#cc2936;letter-spacing:1px;">VS</div>
          <button onclick="ColosseumAsync.placePrediction('${p.debate_id}','b')" style="
            flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:none;
            background:${p.user_pick === 'b' ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.04)'};
            border:1px solid ${p.user_pick === 'b' ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.08)'};
          ">
            <div style="font-weight:700;font-size:13px;color:#f0f0f0;">${p.p2}</div>
            <div style="font-size:11px;color:#6a7a90;">ELO ${p.p2_elo}</div>
          </button>
        </div>
        
        <div style="position:relative;height:24px;background:rgba(255,255,255,0.04);border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
          <div style="position:absolute;left:0;top:0;height:100%;width:${p.pct_a}%;background:linear-gradient(90deg,rgba(212,168,67,0.3),rgba(212,168,67,0.15));border-radius:12px 0 0 12px;transition:width 0.5s ease;"></div>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font-size:11px;font-weight:700;">
            <span style="color:#d4a843;">${p.pct_a}%</span>
            <span style="color:#a0a8b8;">${p.pct_b}%</span>
          </div>
        </div>
      </div>`;
  }

  // --- SESSION 23: Place Prediction ---
  async function placePrediction(debateId, side) {
    const pred = predictions.find(p => p.debate_id === debateId);
    if (!pred) return;

    // Optimistic UI
    if (pred.user_pick === side) return; // Already picked this side
    const oldPick = pred.user_pick;
    pred.user_pick = side;

    // Recalc percentages optimistically
    if (!oldPick) {
      pred.total++;
      if (side === 'a') pred.pct_a = Math.round(((pred.total * pred.pct_a / 100 + 1) / pred.total) * 100);
      else pred.pct_b = Math.round(((pred.total * pred.pct_b / 100 + 1) / pred.total) * 100);
      pred.pct_a = Math.min(99, Math.max(1, pred.pct_a));
      pred.pct_b = 100 - pred.pct_a;
    }

    // Re-render predictions section
    const predContainer = document.getElementById('predictions-feed');
    if (predContainer) renderPredictions(predContainer);

    // Server call
    if (ColosseumAuth?.supabase && !ColosseumAuth.isPlaceholderMode) {
      try {
        const { data, error } = await ColosseumAuth.supabase.rpc('place_prediction', {
          p_debate_id: debateId,
          p_predicted_winner: side
        });

        if (error) {
          console.error('place_prediction error:', error);
          pred.user_pick = oldPick;
          if (predContainer) renderPredictions(predContainer);
        }
      } catch (e) {
        console.error('place_prediction exception:', e);
      }
    }

    // Toast
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#d4a843;color:#0a1628;padding:10px 20px;border-radius:8px;font-weight:700;z-index:9999;font-size:13px;';
    toast.textContent = `🔮 Predicted ${side === 'a' ? pred.p1 : pred.p2} wins!`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // --- SESSION 23: Render Rivals Section ---
  async function renderRivals(container) {
    if (!container) return;
    const rivals = await ColosseumAuth?.getMyRivals?.() || [];

    if (!rivals.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:20px;color:#6a7a90;">
          <div style="font-size:28px;margin-bottom:6px;">⚔️</div>
          <div style="font-size:13px;">No rivals yet. Tap a username to declare one.</div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div style="padding:0 0 8px;font-family:'Cinzel',serif;font-size:14px;letter-spacing:2px;color:#cc2936;">⚔️ HATED RIVALS</div>
      ${rivals.map(r => `
        <div style="background:#132240;border:1px solid rgba(204,41,54,0.2);border-radius:12px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;">
          <div onclick="ColosseumAuth?.showUserProfile?.('${r.rival_id}')" style="width:40px;height:40px;border-radius:50%;background:#1a2d4a;border:2px solid #cc2936;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#cc2936;cursor:pointer;">
            ${(r.rival_display_name || r.rival_username || '?')[0].toUpperCase()}
          </div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:14px;color:#f0f0f0;">${(r.rival_display_name || r.rival_username || 'Unknown').toUpperCase()}</div>
            <div style="font-size:11px;color:#6a7a90;">ELO ${r.rival_elo || 1200} · ${r.rival_wins || 0}W-${r.rival_losses || 0}L</div>
          </div>
          <div style="text-align:right;">
            ${r.status === 'pending'
              ? (r.direction === 'received'
                ? `<button onclick="ColosseumAuth?.respondRival?.('${r.id}',true).then(()=>ColosseumAsync.refreshRivals())" style="padding:6px 12px;background:#cc2936;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">ACCEPT</button>`
                : '<span style="font-size:11px;color:#d4a843;letter-spacing:1px;">PENDING</span>')
              : '<span style="font-size:11px;color:#cc2936;font-weight:700;letter-spacing:1px;">⚔️ ACTIVE</span>'}
          </div>
        </div>`).join('')}`;
  }

  async function refreshRivals() {
    const container = document.getElementById('rivals-feed');
    if (container) await renderRivals(container);
  }

  // --- React (SESSION 17: migrated to RPC toggle) ---
  async function react(takeId) {
    const take = hotTakes.find(t => t.id === takeId);
    if (!take) return;

    take.userReacted = !take.userReacted;
    take.reactions += take.userReacted ? 1 : -1;
    loadHotTakes(currentFilter);

    if (ColosseumAuth?.supabase && !ColosseumAuth.isPlaceholderMode) {
      try {
        const { data, error } = await ColosseumAuth.supabase.rpc('react_hot_take', {
          p_hot_take_id: takeId,
          p_reaction_type: 'fire'
        });

        if (error) {
          console.error('react_hot_take error:', error);
          take.userReacted = !take.userReacted;
          take.reactions += take.userReacted ? 1 : -1;
          loadHotTakes(currentFilter);
        } else if (data) {
          take.reactions = data.reaction_count;
          take.userReacted = data.reacted;
          loadHotTakes(currentFilter);
        }
      } catch (e) {
        console.error('react_hot_take exception:', e);
      }
    }
  }

  // --- Challenge ("BET.") ---
  function challenge(takeId) {
    const take = hotTakes.find(t => t.id === takeId);
    if (!take) return;
    _showChallengeModal(take);
  }

  function _showChallengeModal(take) {
    document.getElementById('challenge-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'challenge-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';
    modal.innerHTML = `
      <div style="background:linear-gradient(180deg,#132240 0%,#0a1628 100%);border-top-left-radius:20px;border-top-right-radius:20px;width:100%;max-width:480px;padding:24px;padding-bottom:max(24px,env(safe-area-inset-bottom));">
        <div style="width:40px;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin:0 auto 20px;"></div>
        <div style="font-family:'Cinzel',serif;font-size:22px;letter-spacing:2px;color:#cc2936;text-align:center;margin-bottom:4px;">⚔️ CHALLENGE</div>
        <div style="color:#a0a8b8;text-align:center;font-size:13px;margin-bottom:16px;">You disagree with ${take.user}?</div>
        
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px;margin-bottom:16px;">
          <div style="font-size:13px;color:#f0f0f0;line-height:1.4;">"${take.text}"</div>
          <div style="font-size:11px;color:#6a7a90;margin-top:6px;">— ${take.user} (ELO ${take.elo})</div>
        </div>
        
        <textarea id="challenge-response" placeholder="Your counter-argument..." style="
          width:100%;background:#1a2d4a;border:1px solid rgba(255,255,255,0.1);border-radius:10px;
          color:#f0f0f0;padding:12px;font-size:14px;resize:none;height:80px;
          font-family:'Barlow Condensed',sans-serif;margin-bottom:12px;box-sizing:border-box;
        "></textarea>
        
        <div style="display:flex;gap:8px;">
          <button onclick="document.getElementById('challenge-modal')?.remove()" style="
            flex:1;padding:12px;background:#1a2d4a;color:#a0a8b8;border:1px solid rgba(255,255,255,0.1);
            border-radius:10px;font-weight:700;cursor:pointer;font-size:14px;
          ">CANCEL</button>
          <button onclick="ColosseumAsync._submitChallenge('${take.id}')" style="
            flex:1;padding:12px;background:#cc2936;color:#fff;border:none;
            border-radius:10px;font-family:'Cinzel',serif;font-size:16px;
            letter-spacing:2px;cursor:pointer;
          ">⚔️ BET.</button>
        </div>
      </div>`;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }

  function _submitChallenge(takeId) {
    const textarea = document.getElementById('challenge-response');
    const text = textarea?.value?.trim();
    if (!text) {
      textarea.style.borderColor = '#cc2936';
      return;
    }

    const take = hotTakes.find(t => t.id === takeId);
    if (take) take.challenges++;

    document.getElementById('challenge-modal')?.remove();

    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#cc2936;color:#fff;padding:12px 24px;border-radius:8px;font-weight:700;z-index:9999;font-size:14px;';
    toast.textContent = '⚔️ Challenge sent!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);

    loadHotTakes(currentFilter);
  }

  // --- Post Composer ---
  function getComposerHTML() {
    return `
      <div style="background:#132240;border:1px solid rgba(212,168,67,0.15);border-radius:12px;padding:14px;margin-bottom:16px;">
        <textarea id="hot-take-input" placeholder="Drop a hot take..." style="
          width:100%;background:#1a2d4a;border:1px solid rgba(255,255,255,0.08);border-radius:10px;
          color:#f0f0f0;padding:12px;font-size:14px;resize:none;height:60px;
          font-family:'Barlow Condensed',sans-serif;margin-bottom:8px;box-sizing:border-box;
        " maxlength="280"></textarea>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div id="take-char-count" style="font-size:11px;color:#6a7a90;">0 / 280</div>
          <button onclick="ColosseumAsync.postTake()" style="
            background:#cc2936;color:#fff;border:none;border-radius:8px;
            padding:8px 20px;font-family:'Cinzel',serif;font-size:14px;
            letter-spacing:1px;cursor:pointer;
          ">POST</button>
        </div>
      </div>`;
  }

  // --- Post Take (SESSION 17: migrated to RPC) ---
  async function postTake() {
    const input = document.getElementById('hot-take-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const profile = ColosseumAuth?.currentProfile;
    const section = currentFilter === 'all' ? 'trending' : currentFilter;

    const newTake = {
      id: 't_' + Date.now(),
      user_id: ColosseumAuth?.currentUser?.id || null,
      user: (profile?.username || 'YOU').toUpperCase(),
      elo: profile?.elo_rating || 1200,
      text,
      section,
      reactions: 0,
      challenges: 0,
      time: 'now',
      userReacted: false,
    };

    hotTakes.unshift(newTake);
    input.value = '';
    loadHotTakes(currentFilter);

    if (ColosseumAuth?.supabase && !ColosseumAuth.isPlaceholderMode) {
      try {
        const { data, error } = await ColosseumAuth.supabase.rpc('create_hot_take', {
          p_content: text,
          p_section: section
        });

        if (error) {
          console.error('create_hot_take error:', error);
        } else if (data?.id) {
          newTake.id = data.id;
        }
      } catch (e) {
        console.error('create_hot_take exception:', e);
      }
    }
  }

  // --- Helpers ---
  function _timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h';
    const days = Math.floor(hrs / 24);
    return days + 'd';
  }

  // --- Init ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    loadHotTakes,
    fetchTakes,          // SESSION 22
    fetchPredictions,    // SESSION 23
    renderPredictions,   // SESSION 23
    placePrediction,     // SESSION 23
    renderRivals,        // SESSION 23
    refreshRivals,       // SESSION 23
    react,
    challenge,
    postTake,
    getComposerHTML,
    _submitChallenge,
    get predictions() { return predictions; },
  };

})();
